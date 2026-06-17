-- 004_booking_agenda_admin_policies.sql
-- Policies + constraints for: patient booking, doctor agenda, admin approval.
--
-- Step 1 (migration 002) only created SELECT policies for appointments. Booking
-- and the agenda need patients to create appointments and both sides to update
-- them (cancel / complete). The admin needs to update doctor_status. And both
-- sides need to read the *counterpart's* profile and the slot tied to a shared
-- appointment (without ever opening up the whole profiles/slots tables).
--
-- RLS stays enabled everywhere and no user can read another user's data beyond
-- the appointment they share. Admins remain the only cross-cutting reader.

-- ---------------------------------------------------------------------------
-- appointments: patients create; participants update.
-- ---------------------------------------------------------------------------

-- A patient can create an appointment for themselves. doctor_id/slot_id are set
-- by the booking flow; the slot-booked trigger flips the slot to booked.
create policy "Appointments: patient creates own"
  on public.appointments
  for insert
  with check (auth.uid() = patient_id);

-- Either participant can update their own appointment (patient cancels; doctor
-- cancels / completes / writes the summary). with check keeps the row theirs.
create policy "Appointments: participants update own"
  on public.appointments
  for update
  using (auth.uid() = patient_id or auth.uid() = doctor_id)
  with check (auth.uid() = patient_id or auth.uid() = doctor_id);

-- Prevent double-booking: at most one active (confirmed) appointment per slot.
-- A cancelled appointment is excluded, so a freed slot can be rebooked. The
-- booking flow relies on the resulting unique-violation to re-pick a slot.
create unique index if not exists appointments_one_active_per_slot
  on public.appointments (slot_id)
  where status = 'confirmed';

-- ---------------------------------------------------------------------------
-- profiles: admin can update (approve/reject doctors); participants can read
-- each other within a shared appointment.
-- ---------------------------------------------------------------------------

-- Admins update any profile (used to approve/reject doctors). The existing
-- privilege-escalation trigger already lets admins change doctor_status.
create policy "Profiles: admins update all"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- You can read the profile of someone you share an appointment with: a patient
-- sees their doctor's name/specialty; a doctor sees their patient's name, phone
-- and birth_date. Nothing else about other users is exposed. The appointments
-- subquery is itself filtered by the appointments SELECT policy, so it only
-- matches appointments the caller participates in.
create policy "Profiles: read appointment counterpart"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.appointments a
      where (a.patient_id = auth.uid() and a.doctor_id = public.profiles.id)
         or (a.doctor_id = auth.uid() and a.patient_id = public.profiles.id)
    )
  );

-- ---------------------------------------------------------------------------
-- availability_slots: read the (now booked) slot tied to a shared appointment,
-- and prevent a doctor from creating duplicate slots.
-- ---------------------------------------------------------------------------

-- The patient needs the date/time of their booked slot, but the "read open
-- slots" policy hides booked ones. Allow reading a slot referenced by an
-- appointment the caller participates in (covers the doctor too).
create policy "Slots: read those in my appointments"
  on public.availability_slots
  for select
  using (
    exists (
      select 1 from public.appointments a
      where a.slot_id = public.availability_slots.id
        and (a.patient_id = auth.uid() or a.doctor_id = auth.uid())
    )
  );

-- One slot per doctor per date+start_time (lets the agenda upsert/ignore dups).
create unique index if not exists availability_slots_unique_per_doctor
  on public.availability_slots (doctor_id, date, start_time);
