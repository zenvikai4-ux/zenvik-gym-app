-- =============================================================================
-- GymApp — Round 2 Fix Migrations
-- Run in Supabase SQL Editor AFTER MIGRATIONS.sql and
-- MIGRATIONS_LEAD_AUTOMATION.sql have already been applied.
-- Safe to re-run — every statement is idempotent.
-- =============================================================================

-- ─── 1. GYM SUBSCRIPTIONS TABLE ──────────────────────────────────────────────
-- Used by Billing (invoice generation auto-creates/updates a subscription
-- record) and by the cron server's owner subscription-reminder job.
-- Was referenced extensively in lib/hooks.ts but never created — this was
-- silently breaking subscription reminders and the billing screen's
-- subscription tracking.
CREATE TABLE IF NOT EXISTS gym_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid        NOT NULL UNIQUE REFERENCES gyms(id) ON DELETE CASCADE,
  plan        text,
  amount      numeric     DEFAULT 0,
  status      text        DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date  date,
  end_date    date,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_subscriptions_gym_id_idx ON gym_subscriptions(gym_id);
CREATE INDEX IF NOT EXISTS gym_subscriptions_end_date_idx ON gym_subscriptions(end_date);

ALTER TABLE gym_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gym_subscriptions_all" ON gym_subscriptions;
CREATE POLICY "gym_subscriptions_all" ON gym_subscriptions FOR ALL USING (true);

-- ─── 2. CONFIRM_USER_EMAIL RPC ───────────────────────────────────────────────
-- Called from the app whenever a gym owner / trainer / member auth user is
-- created via supabase.auth.signUp(), so they can log in immediately without
-- needing to click an email confirmation link. Was called in 5 places in the
-- app but never defined — every "owner can log in immediately" flow,
-- including gym creation, was relying on a missing function.
CREATE OR REPLACE FUNCTION confirm_user_email(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = user_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at        = COALESCE(confirmed_at, now())
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- Allow the function to be called from the client (it's SECURITY DEFINER so
-- it runs with elevated privileges regardless of caller's RLS).
GRANT EXECUTE ON FUNCTION confirm_user_email(text) TO authenticated, anon;

-- ─── 3. SET_USER_PASSWORD RPC ────────────────────────────────────────────────
-- Used by the bulk-import "Set Login Credentials" modal to set/replace a
-- password for an existing auth user by email. Was called from the app but
-- never defined anywhere — the modal's Save button did nothing.
CREATE OR REPLACE FUNCTION set_user_password(user_email text, new_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF new_password IS NULL OR length(new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = user_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at        = COALESCE(confirmed_at, now()),
      updated_at          = now()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION set_user_password(text, text) TO authenticated, anon;

-- Required for crypt()/gen_salt() above — Supabase projects normally already
-- have this, but IF NOT EXISTS makes this safe either way.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 3b. UPDATE_USER_EMAIL RPC ───────────────────────────────────────────────
-- Used when an admin replaces a bulk-imported trainer's placeholder system
-- email (e.g. trainer_173...@gymapp.local) with their real email. Changes
-- the auth.users record so the trainer can actually log in with the new
-- email afterward — without this, only profiles.email would change and the
-- trainer's real login email would never work.
CREATE OR REPLACE FUNCTION update_user_email(old_email text, new_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = old_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email AND id != v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Email already in use');
  END IF;

  UPDATE auth.users
  SET email = new_email,
      email_confirmed_at = now(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_email(text, text) TO authenticated, anon;

-- ─── 4. LEAD_CONVERSATIONS — ALLOW 'owner' ROLE ──────────────────────────────
-- The app inserts role: 'owner' when a gym owner manually replies to a lead
-- in the handoff+ stages, but the original constraint only allowed
-- ('ai', 'lead'). Every owner reply was failing this constraint, which
-- silently broke the 2-hour AI-silence rule and showed a confusing error
-- to the owner even though the WhatsApp message itself had already sent.
-- Drops whatever the existing role CHECK constraint is named (handles both
-- the default auto-generated name and any custom name) before re-adding it
-- with 'owner' included.
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'lead_conversations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE lead_conversations DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE lead_conversations
  ADD CONSTRAINT lead_conversations_role_check
  CHECK (role IN ('ai', 'lead', 'owner'));

-- ─── 5. DIET_PLANS — ENSURE gym_id COLUMN EXISTS ─────────────────────────────
-- The app's useUpsertDietPlan hook inserts a gym_id value on new diet plans
-- (needed to call the gym server's /diet/assigned trigger). Adding the
-- column defensively in case it predates these migrations and is missing —
-- this is a no-op if it already exists.
ALTER TABLE diet_plans
  ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES gyms(id) ON DELETE CASCADE;

-- Backfill gym_id for any existing rows missing it, via client_profiles → members
UPDATE diet_plans dp
SET gym_id = m.gym_id
FROM client_profiles cp
JOIN members m ON m.id = cp.member_id
WHERE dp.client_profile_id = cp.id
  AND dp.gym_id IS NULL;

CREATE INDEX IF NOT EXISTS diet_plans_gym_id_idx ON diet_plans(gym_id);

-- ─── 6. VERIFY ────────────────────────────────────────────────────────────────
SELECT 'gym_subscriptions' AS tbl, COUNT(*) FROM gym_subscriptions
UNION ALL SELECT 'diet_plans_with_gym_id', COUNT(*) FROM diet_plans WHERE gym_id IS NOT NULL
UNION ALL SELECT 'lead_conversations_owner_rows', COUNT(*) FROM lead_conversations WHERE role = 'owner';
