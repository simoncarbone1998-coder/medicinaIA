-- 002_create_marketplace_schema.sql
-- Telemedicine marketplace foundation (Contigo).
--
-- Tables: profiles (users + roles), availability_slots, appointments,
-- prescriptions + prescription_items, doctor_earnings.
--
-- Hard rules (see CLAUDE.md): RLS is enabled on EVERY table, and no user can
-- read another user's data. Admins can read across users. Health/personal data
-- never leaks between accounts.
--
-- Booking, agenda, video and admin UI are built in later steps; this migration
-- only lays down schema, RLS and the triggers those steps will rely on.

-- ===========================================================================
-- profiles
-- One row per auth user. Created automatically on signup (handle_new_user),
-- then filled in by the app right after signup with role + the rest.
-- ===========================================================================
create table if not exists public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  full_name                text,
  email                    text,
  role                     text check (role in ('patient', 'doctor', 'admin')),
  phone                    text,
  city                     text,
  birth_date               date,
  avatar_url               text,
  delivery_address         text,
  -- Doctor-only fields:
  specialty                text,
  medical_license          text,
  undergraduate_university text,
  doctor_status            text check (doctor_status in ('pending', 'approved', 'rejected')),
  onboarding_completed     boolean not null default false,
  created_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin?
--
-- SECURITY DEFINER so it bypasses RLS on profiles. This is what lets an admin
-- policy read the caller's role WITHOUT the policy recursing into itself
-- (a plain "exists (select from profiles ...)" inside a profiles policy would
-- otherwise loop forever). Defined after profiles so its SQL body validates.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

-- Read: your own profile; admins read everyone.
create policy "Profiles: read own (admins read all)"
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

-- Update: your own profile only. (Privileged fields are further guarded by the
-- trigger below so a patient can't promote themselves to doctor/admin.)
create policy "Profiles: update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Guard against self-privilege-escalation. RLS lets a user edit their own row,
-- but we must not let them flip themselves to admin or self-approve as a doctor.
-- Service-role / direct DB access (auth.uid() is null) and real admins are
-- exempt, so the bootstrap/approval SQL still works.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;  -- service role / admin: no restriction
  end if;

  -- role: allow the one-time assignment at signup (NULL -> patient/doctor),
  -- never allow self-assigning admin, never allow changing an existing role.
  if new.role is distinct from old.role then
    if old.role is not null then
      raise exception 'No puedes cambiar tu rol.';
    end if;
    if new.role = 'admin' then
      raise exception 'Rol no permitido.';
    end if;
  end if;

  -- doctor_status: a doctor cannot approve/reject themselves. The app only ever
  -- sets 'pending' at signup; approval happens out-of-band (admin / SQL).
  if new.doctor_status is distinct from old.doctor_status then
    if new.doctor_status in ('approved', 'rejected') then
      raise exception 'No puedes cambiar el estado de verificacion.';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- On new auth user, create their profile row (id + email). The app fills in the
-- role and remaining fields immediately after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that signed up before this migration (the old
-- simple-auth accounts). Runs as the migration role, so RLS does not apply.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ===========================================================================
-- availability_slots
-- A doctor's bookable time slots. Doctors own them; patients browse open ones.
-- ===========================================================================
create table if not exists public.availability_slots (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.profiles (id) on delete cascade,
  date       date not null,
  start_time time not null,
  end_time   time not null,
  is_booked  boolean not null default false,
  specialty  text,
  created_at timestamptz not null default now()
);

create index if not exists availability_slots_doctor_id_idx
  on public.availability_slots (doctor_id);
create index if not exists availability_slots_open_idx
  on public.availability_slots (date) where is_booked = false;

alter table public.availability_slots enable row level security;

-- Doctors fully manage (read/insert/update/delete) their own slots.
create policy "Slots: doctors manage own"
  on public.availability_slots
  for all
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- Any authenticated user (patients) can read slots that are still open.
create policy "Slots: read open when authenticated"
  on public.availability_slots
  for select
  using (is_booked = false and auth.uid() is not null);

-- ===========================================================================
-- appointments
-- A confirmed booking between a patient and a doctor for a given slot.
-- (Insert/cancel policies arrive with the booking step; reads only for now.)
-- ===========================================================================
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles (id) on delete cascade,
  doctor_id       uuid not null references public.profiles (id) on delete cascade,
  slot_id         uuid references public.availability_slots (id),
  status          text not null default 'confirmed'
                    check (status in ('confirmed', 'cancelled')),
  reason          text,
  summary         text,
  completed       boolean not null default false,
  completed_at    timestamptz,
  daily_room_name text,
  daily_room_url  text,
  reminder_sent   boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists appointments_patient_id_idx on public.appointments (patient_id);
create index if not exists appointments_doctor_id_idx  on public.appointments (doctor_id);

alter table public.appointments enable row level security;

-- Patients read their own; doctors read the ones where they are the doctor;
-- admins read all.
create policy "Appointments: read own (patient or doctor), admins all"
  on public.appointments
  for select
  using (
    auth.uid() = patient_id
    or auth.uid() = doctor_id
    or public.is_admin()
  );

-- When an appointment is created, mark its slot as booked. SECURITY DEFINER so
-- it can update the slot even though the booking patient has no write access to
-- availability_slots.
create or replace function public.mark_slot_booked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.slot_id is not null then
    update public.availability_slots
    set is_booked = true
    where id = new.slot_id;
  end if;
  return new;
end;
$$;

create trigger appointments_mark_slot_booked
  after insert on public.appointments
  for each row execute function public.mark_slot_booked();

-- When an appointment is cancelled, free its slot again.
create or replace function public.mark_slot_unbooked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled'
     and new.slot_id is not null then
    update public.availability_slots
    set is_booked = false
    where id = new.slot_id;
  end if;
  return new;
end;
$$;

create trigger appointments_mark_slot_unbooked
  after update on public.appointments
  for each row execute function public.mark_slot_unbooked();

-- ===========================================================================
-- prescriptions + prescription_items
-- ===========================================================================
create table if not exists public.prescriptions (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid references public.appointments (id) on delete cascade,
  patient_id       uuid not null references public.profiles (id) on delete cascade,
  doctor_id        uuid not null references public.profiles (id) on delete cascade,
  status           text check (status in ('pendiente', 'en_camino')),
  delivery_address text,
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists prescriptions_patient_id_idx on public.prescriptions (patient_id);
create index if not exists prescriptions_doctor_id_idx  on public.prescriptions (doctor_id);

alter table public.prescriptions enable row level security;

create policy "Prescriptions: read own (patient or doctor), admins all"
  on public.prescriptions
  for select
  using (
    auth.uid() = patient_id
    or auth.uid() = doctor_id
    or public.is_admin()
  );

create table if not exists public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  medicine_name   text,
  dose            text,
  instructions    text,
  created_at      timestamptz not null default now()
);

create index if not exists prescription_items_prescription_id_idx
  on public.prescription_items (prescription_id);

alter table public.prescription_items enable row level security;

-- Items inherit access from their parent prescription: you can read an item iff
-- you can read its prescription (the subquery is itself filtered by the
-- prescriptions RLS policy above).
create policy "Prescription items: follow parent prescription"
  on public.prescription_items
  for select
  using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id
        and (
          p.patient_id = auth.uid()
          or p.doctor_id = auth.uid()
          or public.is_admin()
        )
    )
  );

-- ===========================================================================
-- doctor_earnings
-- ===========================================================================
create table if not exists public.doctor_earnings (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete cascade,
  amount         numeric,
  created_at     timestamptz not null default now()
);

create index if not exists doctor_earnings_doctor_id_idx on public.doctor_earnings (doctor_id);

alter table public.doctor_earnings enable row level security;

create policy "Earnings: doctors read own, admins all"
  on public.doctor_earnings
  for select
  using (auth.uid() = doctor_id or public.is_admin());
