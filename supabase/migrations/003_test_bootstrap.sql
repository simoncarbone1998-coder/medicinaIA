-- 003_test_bootstrap.sql
-- TEMPORARY testing migration. Safe to delete once you have a real admin UI.
--
-- This runs as the database owner (not an end user), so auth.uid() is NULL and
-- the profiles privilege-escalation guard intentionally allows these changes.
-- Re-running is harmless (the UPDATEs are idempotent).

-- (a) Make my account an admin.
update public.profiles
set role = 'admin'
where email = 'simoncarbone1998@gmail.com';

-- (b) Approve a test doctor.
-- TODO: After registering a test doctor in the app, replace
-- 'DOCTOR_EMAIL_HERE@example.com' with that doctor's email, uncomment the two
-- lines below, then run `npx supabase db push` again.
-- update public.profiles
-- set doctor_status = 'approved'
-- where email = 'DOCTOR_EMAIL_HERE@example.com';
