-- =============================================================================
-- GymApp Complete Database Migrations
-- Run these in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Run them IN ORDER — each section depends on the previous.
-- =============================================================================

-- ─── 1. ADD MEMBER ROLE SUPPORT TO PROFILES ──────────────────────────────────
-- The 'profiles' table needs a member_id column so member logins can be linked
-- to their member record.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES members(id) ON DELETE SET NULL;

-- Update the role check constraint to allow 'member'
-- (Only run if your profiles table has a role CHECK constraint)
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin', 'gym_owner', 'trainer', 'member'));
EXCEPTION WHEN others THEN
  NULL; -- constraint may not exist, that's fine
END $$;

-- ─── 2. ADD SESSION TIME TO CLIENT PROFILES ──────────────────────────────────
-- Trainers can tag clients as morning / evening / both
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS session_time text DEFAULT 'morning'
  CHECK (session_time IN ('morning', 'evening', 'both'));

-- ─── 3. NOTIFICATIONS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid        REFERENCES gyms(id) ON DELETE CASCADE,
  member_id   uuid,
  title       text        NOT NULL,
  body        text        NOT NULL,
  type        text        DEFAULT 'general',
  is_read     boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_gym_id_idx ON notifications(gym_id);
CREATE INDEX IF NOT EXISTS notifications_member_id_idx ON notifications(member_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (true);

-- ─── 4. QUERIES TABLE (support tickets) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS queries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid        REFERENCES gyms(id) ON DELETE CASCADE,
  sender_name  text        NOT NULL,
  sender_role  text        NOT NULL,
  message      text        NOT NULL,
  recipient    text        DEFAULT 'Admin',
  status       text        DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS queries_gym_id_idx ON queries(gym_id);
CREATE INDEX IF NOT EXISTS queries_status_idx ON queries(status);
CREATE INDEX IF NOT EXISTS queries_created_at_idx ON queries(created_at DESC);

ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "queries_select" ON queries;
DROP POLICY IF EXISTS "queries_insert" ON queries;
DROP POLICY IF EXISTS "queries_update" ON queries;

CREATE POLICY "queries_select" ON queries FOR SELECT USING (true);
CREATE POLICY "queries_insert" ON queries FOR INSERT WITH CHECK (true);
CREATE POLICY "queries_update" ON queries FOR UPDATE USING (true);

-- ─── 5. EXTEND WHATSAPP_LOGS FOR BROADCAST ───────────────────────────────────
-- Add columns so broadcast messages carry sender context and recipient type
ALTER TABLE whatsapp_logs
  ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS sender_name    text,
  ADD COLUMN IF NOT EXISTS trainer_id     uuid;

-- ─── 6. CREATE MEMBER LOGIN HELPER FUNCTION ──────────────────────────────────
-- Call this from your admin panel to create a member login account.
-- Usage: SELECT create_member_account('member-uuid', 'email@example.com', 'password123');
CREATE OR REPLACE FUNCTION create_member_account(
  p_member_id   uuid,
  p_email       text,
  p_password    text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_member  record;
BEGIN
  -- Get the member details
  SELECT * INTO v_member FROM members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Member not found');
  END IF;

  -- Create auth user
  v_user_id := (
    SELECT id FROM auth.users WHERE email = p_email LIMIT 1
  );

  IF v_user_id IS NULL THEN
    -- Insert into auth.users (Supabase admin API required for full flow)
    -- This stub returns the structure; actual creation via supabase.auth.admin.createUser
    RETURN json_build_object(
      'success', false,
      'error', 'Use supabase.auth.admin.createUser() from your server to create the auth user, then call this function to link the profile'
    );
  END IF;

  -- Create or update the profile linking member_id
  INSERT INTO profiles (id, name, email, role, gym_id, member_id)
  VALUES (
    v_user_id,
    v_member.name,
    p_email,
    'member',
    v_member.gym_id,
    p_member_id
  )
  ON CONFLICT (id) DO UPDATE
    SET role = 'member', member_id = p_member_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- ─── 7. VERIFY EVERYTHING ────────────────────────────────────────────────────
SELECT
  'notifications' AS tbl, COUNT(*) FROM notifications
UNION ALL SELECT
  'queries', COUNT(*) FROM queries
UNION ALL SELECT
  'profiles with member_id', COUNT(*) FROM profiles WHERE member_id IS NOT NULL
UNION ALL SELECT
  'client_profiles with session_time', COUNT(*) FROM client_profiles WHERE session_time IS NOT NULL;
