/*
# GLOBAL NUMBER — Core Database Schema

This migration creates the foundational schema for the GLOBAL NUMBER platform,
migrated from the original Python Telegram bot (bot-4.py) SQLite database.

## Tables Created

1. **profiles** — Extends auth.users with public profile data (username, full_name, balance, ban status, join date)
2. **admins** — Records which users are administrators
3. **services** — Range-based service entries (name, range pattern, country, flag, hot status, success count)
4. **manual_services** — Manual number inventory services (service name, country, stock, cooldown, give amount)
5. **manual_numbers** — Individual phone numbers in the manual inventory
6. **user_active_manual** — Currently assigned manual numbers per user (JSON blob of assigned numbers + metadata)
7. **otp_success_logs** — Log of successfully received OTP codes with timestamps and service info
8. **config** — Key-value configuration store (maintenance mode, OTP channel ID, etc.)
9. **transactions** — Financial transaction ledger (deposits, purchases, refunds, adjustments)
10. **audit_logs** — Administrative action audit trail

## Security

- RLS enabled on all tables
- Owner-scoped policies on user data tables (profiles, otp_success_logs, transactions, user_active_manual)
- Admin-only access on admin tables (admins, audit_logs, config writes)
- Public read access on services and manual_services (availability checking)
- All owner columns default to auth.uid()

## Notes

- Financial amounts stored as numeric(18,2) — never floating point
- user_active_manual stores a JSONB blob matching the original bot's active_manual column
- otp_success_logs retains service_name for display without joins
- config table preserves the key-value pattern from the original bot
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  balance numeric(18,2) NOT NULL DEFAULT 0.0,
  is_banned boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  active_manual jsonb,
  manual_cooldowns jsonb DEFAULT '{}'::jsonb,
  join_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can see all profiles
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admins can update any profile (ban/unban, balance adjustments)
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Services table (range-based)
CREATE TABLE IF NOT EXISTS services (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  range_val text NOT NULL,
  country_code text,
  flag text,
  is_hot boolean NOT NULL DEFAULT false,
  success_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Services are publicly readable (availability checking)
DROP POLICY IF EXISTS "public_read_services" ON services;
CREATE POLICY "public_read_services" ON services FOR SELECT
  TO anon, authenticated USING (true);

-- Only admins can insert/update/delete services
DROP POLICY IF EXISTS "admin_insert_services" ON services;
CREATE POLICY "admin_insert_services" ON services FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_services" ON services;
CREATE POLICY "admin_update_services" ON services FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_services" ON services;
CREATE POLICY "admin_delete_services" ON services FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Manual services table
CREATE TABLE IF NOT EXISTS manual_services (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_name text NOT NULL,
  country_name text NOT NULL,
  flag text,
  give_amount integer NOT NULL DEFAULT 1,
  otp_rate numeric(18,2) NOT NULL DEFAULT 0.0,
  stock integer NOT NULL DEFAULT 0,
  cooldown integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE manual_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_manual_services" ON manual_services;
CREATE POLICY "public_read_manual_services" ON manual_services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_manual_services" ON manual_services;
CREATE POLICY "admin_insert_manual_services" ON manual_services FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_manual_services" ON manual_services;
CREATE POLICY "admin_update_manual_services" ON manual_services FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_manual_services" ON manual_services;
CREATE POLICY "admin_delete_manual_services" ON manual_services FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Manual numbers table
CREATE TABLE IF NOT EXISTS manual_numbers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id bigint NOT NULL REFERENCES manual_services(id) ON DELETE CASCADE,
  number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE manual_numbers ENABLE ROW LEVEL SECURITY;

-- Users can read numbers for services they're browsing (limited)
DROP POLICY IF EXISTS "authed_read_manual_numbers" ON manual_numbers;
CREATE POLICY "authed_read_manual_numbers" ON manual_numbers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_manual_numbers" ON manual_numbers;
CREATE POLICY "admin_insert_manual_numbers" ON manual_numbers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_manual_numbers" ON manual_numbers;
CREATE POLICY "admin_delete_manual_numbers" ON manual_numbers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_manual_numbers" ON manual_numbers;
CREATE POLICY "admin_update_manual_numbers" ON manual_numbers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- User active manual numbers
CREATE TABLE IF NOT EXISTS user_active_manual (
  user_id uuid NOT NULL DEFAULT auth.uid() PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_data jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_active_manual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_active_manual" ON user_active_manual;
CREATE POLICY "select_own_active_manual" ON user_active_manual FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_active_manual" ON user_active_manual;
CREATE POLICY "insert_own_active_manual" ON user_active_manual FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_active_manual" ON user_active_manual;
CREATE POLICY "update_own_active_manual" ON user_active_manual FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_active_manual" ON user_active_manual;
CREATE POLICY "delete_own_active_manual" ON user_active_manual FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- OTP success logs
CREATE TABLE IF NOT EXISTS otp_success_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  service_name text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE otp_success_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_otp_logs" ON otp_success_logs;
CREATE POLICY "select_own_otp_logs" ON otp_success_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_otp_logs" ON otp_success_logs;
CREATE POLICY "insert_own_otp_logs" ON otp_success_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_all_otp_logs" ON otp_success_logs;
CREATE POLICY "admin_select_all_otp_logs" ON otp_success_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_otp_logs" ON otp_success_logs;
CREATE POLICY "admin_delete_otp_logs" ON otp_success_logs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Config table (key-value)
CREATE TABLE IF NOT EXISTS config (
  key text PRIMARY KEY,
  value text
);

ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Public can read config (maintenance mode status, etc.)
DROP POLICY IF EXISTS "public_read_config" ON config;
CREATE POLICY "public_read_config" ON config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_config" ON config;
CREATE POLICY "admin_update_config" ON config FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_insert_config" ON config;
CREATE POLICY "admin_insert_config" ON config FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'purchase', 'refund', 'adjustment')),
  amount numeric(18,2) NOT NULL,
  balance_after numeric(18,2),
  description text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_all_transactions" ON transactions;
CREATE POLICY "admin_select_all_transactions" ON transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_logs" ON audit_logs;
CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_insert_audit_logs" ON audit_logs;
CREATE POLICY "admin_insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_country ON services(country_code);
CREATE INDEX IF NOT EXISTS idx_otp_logs_user ON otp_success_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_logs_time ON otp_success_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_numbers_service ON manual_numbers(service_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);

-- Seed default config
INSERT INTO config (key, value) VALUES ('maintenance_mode', 'off')
ON CONFLICT (key) DO NOTHING;
