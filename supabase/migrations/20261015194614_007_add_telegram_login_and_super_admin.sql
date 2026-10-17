/*
# Add telegram_id to profiles + action_url to notifications + telegram_otp table

## Changes
- Add telegram_id text column to profiles (nullable)
- Add action_url text column to user_notifications (nullable, for "Get Number" action button)
- Add is_super_admin boolean column to profiles
- Create telegram_otp_codes table for Telegram OTP login
*/

-- Add telegram_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Add action_url to user_notifications
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS action_url text;

-- Telegram OTP codes table
CREATE TABLE IF NOT EXISTS telegram_otp_codes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id text NOT NULL,
  code text NOT NULL,
  email text,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE telegram_otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_otp" ON telegram_otp_codes;
CREATE POLICY "select_own_otp" ON telegram_otp_codes FOR SELECT
  TO authenticated USING (auth.uid() = (
    SELECT id FROM profiles WHERE telegram_id = telegram_otp_codes.telegram_id
  ));

DROP POLICY IF EXISTS "anon_insert_otp" ON telegram_otp_codes;
CREATE POLICY "anon_insert_otp" ON telegram_otp_codes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_otp" ON telegram_otp_codes;
CREATE POLICY "anon_update_otp" ON telegram_otp_codes FOR UPDATE
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_otp" ON telegram_otp_codes;
CREATE POLICY "anon_select_otp" ON telegram_otp_codes FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_otp_telegram_id ON telegram_otp_codes(telegram_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON telegram_otp_codes(expires_at);

-- Allow users to update their own telegram_id
DROP POLICY IF EXISTS "update_own_profile_telegram" ON profiles;
CREATE POLICY "update_own_profile_telegram" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Set the specified telegram ID as super admin
UPDATE profiles SET is_super_admin = true, is_admin = true
WHERE telegram_id = '7689218221';

-- If no super admin exists yet, mark all existing admins as super admin for safety
INSERT INTO profiles (id, is_admin, is_super_admin)
SELECT id, true, true FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE is_super_admin = true)
ON CONFLICT (id) DO UPDATE SET is_super_admin = true, is_admin = true;
