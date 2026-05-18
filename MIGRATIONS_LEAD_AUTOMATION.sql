-- =============================================================================
-- GymApp Lead Automation Migrations
-- Run in Supabase SQL Editor IN ORDER
-- =============================================================================

-- ─── 1. UPDATE LEADS PIPELINE STAGES ─────────────────────────────────────────
-- Drop old status constraint and add new AI pipeline stages
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'new',
    'ai_chatting',
    'interested',
    'handoff',
    'visit_scheduled',
    'visited',
    'converted',
    'lost'
  ));

-- Migrate any existing leads to new stage names
UPDATE leads SET status = 'new'       WHERE status = 'enquiry';
UPDATE leads SET status = 'visited'   WHERE status = 'trial_booked';
UPDATE leads SET status = 'converted' WHERE status = 'member';
UPDATE leads SET status = 'lost'      WHERE status = 'churned';

-- ─── 2. LEAD CONVERSATIONS TABLE ─────────────────────────────────────────────
-- Stores every AI <-> lead message exchange per lead
CREATE TABLE IF NOT EXISTS lead_conversations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  gym_id      uuid        REFERENCES gyms(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('ai', 'lead')),
  message     text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_conversations_lead_id_idx ON lead_conversations(lead_id);
CREATE INDEX IF NOT EXISTS lead_conversations_gym_id_idx ON lead_conversations(gym_id);
CREATE INDEX IF NOT EXISTS lead_conversations_created_at_idx ON lead_conversations(created_at ASC);

ALTER TABLE lead_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_conversations_all" ON lead_conversations;
CREATE POLICY "lead_conversations_all" ON lead_conversations FOR ALL USING (true);

-- ─── 3. GYM KNOWLEDGE BASE TABLE ─────────────────────────────────────────────
-- Per-gym info the AI uses to answer lead & member queries
CREATE TABLE IF NOT EXISTS gym_knowledge_base (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              uuid        NOT NULL UNIQUE REFERENCES gyms(id) ON DELETE CASCADE,

  -- Basic info
  gym_name            text,
  tagline             text,
  description         text,
  location_address    text,
  location_maps_url   text,
  phone               text,
  email               text,
  website_url         text,

  -- Timings
  weekday_open        text,   -- e.g. "6:00 AM"
  weekday_close       text,   -- e.g. "10:00 PM"
  weekend_open        text,
  weekend_close       text,
  is_open_sundays     boolean DEFAULT true,

  -- Membership plans (stored as JSON array of {name, duration, price, description})
  membership_plans    jsonb   DEFAULT '[]',

  -- Facilities (array of strings)
  facilities          jsonb   DEFAULT '[]',

  -- Current offers / discounts
  current_offers      text,

  -- Trainer info (brief summary)
  trainer_info        text,

  -- Instagram ID (for instagram DM automation)
  instagram_id        text,

  -- Any extra context for AI
  additional_info     text,

  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_knowledge_base_gym_id_idx ON gym_knowledge_base(gym_id);

ALTER TABLE gym_knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gym_knowledge_base_all" ON gym_knowledge_base;
CREATE POLICY "gym_knowledge_base_all" ON gym_knowledge_base FOR ALL USING (true);

-- ─── 4. GYM AUTOMATION CONFIG TABLE ──────────────────────────────────────────
-- Per-gym automation module toggles and timing settings
CREATE TABLE IF NOT EXISTS gym_automation_config (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                      uuid        NOT NULL UNIQUE REFERENCES gyms(id) ON DELETE CASCADE,

  -- Module toggles
  whatsapp_automation_enabled boolean DEFAULT true,
  instagram_automation_enabled boolean DEFAULT false,
  lead_pipeline_enabled       boolean DEFAULT true,
  member_query_enabled        boolean DEFAULT true,
  expiry_reminders_enabled    boolean DEFAULT true,
  diet_messages_enabled       boolean DEFAULT false,
  subscription_reminders_enabled boolean DEFAULT true,

  -- Timing config (24hr format strings e.g. "07:00")
  expiry_reminder_time        text    DEFAULT '07:00',
  diet_message_time           text    DEFAULT '07:00',
  subscription_reminder_time  text    DEFAULT '09:00',

  -- Expiry reminder days before (how many days before to remind)
  expiry_reminder_days_before integer DEFAULT 1,

  -- AI handoff triggers (keywords that cause AI to hand off to owner)
  handoff_keywords            jsonb   DEFAULT '["price", "pricing", "fees", "want to join", "visit", "come", "talk to someone", "owner", "manager"]',

  updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_automation_config_gym_id_idx ON gym_automation_config(gym_id);

ALTER TABLE gym_automation_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gym_automation_config_all" ON gym_automation_config;
CREATE POLICY "gym_automation_config_all" ON gym_automation_config FOR ALL USING (true);

-- ─── 5. VERIFY ───────────────────────────────────────────────────────────────
SELECT 'lead_conversations' AS tbl, COUNT(*) FROM lead_conversations
UNION ALL SELECT 'gym_knowledge_base', COUNT(*) FROM gym_knowledge_base
UNION ALL SELECT 'gym_automation_config', COUNT(*) FROM gym_automation_config;
