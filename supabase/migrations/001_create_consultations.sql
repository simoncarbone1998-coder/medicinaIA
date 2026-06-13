-- 001_create_consultations.sql
-- Core record for the AI primary-care flow: one row per patient consultation.
-- Lifecycle: intake -> pending_review -> certified (by a licensed doctor).
--
-- RLS scope for this migration: PATIENTS ONLY. Each patient can read and write
-- only their own consultations. Doctor review/certification access is added in a
-- later migration (role-based policies) when the doctor dashboard is built.

create table if not exists public.consultations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,

  -- Clinical content of the consult.
  chief_complaint text,                                   -- motivo de consulta
  transcript      jsonb not null default '[]'::jsonb,     -- chat messages [{role, content, ...}]
  ai_assessment   text,                                   -- preliminary AI assessment (NOT final)
  is_emergency    boolean not null default false,         -- red-flag escalation triggered

  -- Certification workflow.
  status          text not null default 'intake'
                    check (status in ('intake', 'pending_review', 'certified')),
  doctor_notes    text,                                   -- reviewing doctor's edits/notes
  certified_by    uuid references auth.users (id),        -- doctor who certified
  certified_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Fetch a patient's consultations quickly.
create index if not exists consultations_user_id_idx on public.consultations (user_id);

-- Keep updated_at fresh on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger consultations_set_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

-- Row Level Security: required on every table (health data).
alter table public.consultations enable row level security;

-- Patients can only see their own consultations.
create policy "Patients can view own consultations"
  on public.consultations
  for select
  using (auth.uid() = user_id);

-- Patients can only create consultations owned by themselves.
create policy "Patients can insert own consultations"
  on public.consultations
  for insert
  with check (auth.uid() = user_id);

-- Patients can only update their own consultations.
create policy "Patients can update own consultations"
  on public.consultations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Patients can only delete their own consultations.
create policy "Patients can delete own consultations"
  on public.consultations
  for delete
  using (auth.uid() = user_id);
