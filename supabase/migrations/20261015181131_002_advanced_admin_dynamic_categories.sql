/*
# GLOBAL NUMBER — Advanced Admin, Dynamic Categories, Providers, Rewards

This migration adds the foundational schema for dynamic category management,
provider panel integration, OTP reward configuration, reward ledger, admin
roles/permissions, orders, and enhanced audit logging.

## New Tables
1. categories — Dynamic service categories (replaces hardcoded SERVICES)
2. providers — Number provider panel configurations
3. reward_rules — Configurable OTP reward rules with precedence
4. reward_ledger — Immutable record of every OTP reward credited
5. admin_roles — Role-based admin permissions
6. orders — Number purchase/assignment orders
7. admin_audit_log — Enhanced audit trail for admin actions

## Modified Tables
- profiles — Added total_earnings numeric column for cumulative OTP rewards

## Security
- RLS enabled on all new tables
- Owner-scoped policies on reward_ledger and orders (users see their own)
- Admin-scoped policies on categories, providers, reward_rules, admin_roles, admin_audit_log
- Public read on active categories for dynamic frontend rendering
*/

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  display_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  logo_asset text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order integer NOT NULL DEFAULT 0,
  provider_mapping jsonb DEFAULT '[]'::jsonb,
  country_availability jsonb DEFAULT '[]'::jsonb,
  cost_config jsonb DEFAULT '{}'::jsonb,
  reward_per_otp numeric(18,2) NOT NULL DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_categories" ON categories;
CREATE POLICY "public_read_active_categories" ON categories FOR SELECT
  TO anon, authenticated USING (status = 'active');

DROP POLICY IF EXISTS "admin_read_all_categories" ON categories;
CREATE POLICY "admin_read_all_categories" ON categories FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ============================================================
-- PROVIDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS providers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  display_name text NOT NULL,
  internal_id text NOT NULL UNIQUE,
  api_base_url text,
  api_key_encrypted text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  priority integer NOT NULL DEFAULT 0,
  service_mappings jsonb DEFAULT '{}'::jsonb,
  country_mappings jsonb DEFAULT '{}'::jsonb,
  connection_status text DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')),
  last_tested_at timestamptz,
  last_latency_ms integer,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_providers" ON providers;
CREATE POLICY "admin_read_providers" ON providers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_insert_providers" ON providers;
CREATE POLICY "admin_insert_providers" ON providers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_providers" ON providers;
CREATE POLICY "admin_update_providers" ON providers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_providers" ON providers;
CREATE POLICY "admin_delete_providers" ON providers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ============================================================
-- REWARD RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reward_rules (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('global', 'category', 'service', 'country', 'provider')),
  scope_ref text,
  amount numeric(18,2) NOT NULL DEFAULT 0.0,
  is_active boolean NOT NULL DEFAULT true,
  precedence integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_reward_rules" ON reward_rules;
CREATE POLICY "admin_read_reward_rules" ON reward_rules FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_insert_reward_rules" ON reward_rules;
CREATE POLICY "admin_insert_reward_rules" ON reward_rules FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_reward_rules" ON reward_rules;
CREATE POLICY "admin_update_reward_rules" ON reward_rules FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_reward_rules" ON reward_rules;
CREATE POLICY "admin_delete_reward_rules" ON reward_rules FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ============================================================
-- REWARD LEDGER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reward_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL,
  rule_id bigint REFERENCES reward_rules(id),
  rule_scope text,
  rule_scope_ref text,
  category_id bigint REFERENCES categories(id),
  category_name text,
  country text,
  order_ref text,
  event_ref text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'reversed', 'adjusted')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rewards" ON reward_ledger;
CREATE POLICY "select_own_rewards" ON reward_ledger FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_read_all_rewards" ON reward_ledger;
CREATE POLICY "admin_read_all_rewards" ON reward_ledger FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_insert_rewards" ON reward_ledger;
CREATE POLICY "admin_insert_rewards" ON reward_ledger FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "admin_update_rewards" ON reward_ledger;
CREATE POLICY "admin_update_rewards" ON reward_ledger FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_reward_ledger_user ON reward_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_ledger_event ON reward_ledger(event_ref);
CREATE INDEX IF NOT EXISTS idx_reward_ledger_category ON reward_ledger(category_id);

-- ============================================================
-- ADMIN ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'super_admin', 'category_manager', 'provider_manager',
    'order_manager', 'finance_manager', 'support_admin', 'read_only_analyst'
  )),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_admin_roles" ON admin_roles;
CREATE POLICY "admin_read_admin_roles" ON admin_roles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "superadmin_insert_admin_roles" ON admin_roles;
CREATE POLICY "superadmin_insert_admin_roles" ON admin_roles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      JOIN profiles p ON p.id = auth.uid()
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true
        AND p.is_admin = true
    )
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
      AND NOT EXISTS (SELECT 1 FROM admin_roles)
    )
  );

DROP POLICY IF EXISTS "superadmin_update_admin_roles" ON admin_roles;
CREATE POLICY "superadmin_update_admin_roles" ON admin_roles FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true
    )
  );

DROP POLICY IF EXISTS "superadmin_delete_admin_roles" ON admin_roles;
CREATE POLICY "superadmin_delete_admin_roles" ON admin_roles FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id bigint REFERENCES categories(id),
  category_name text,
  provider_id bigint REFERENCES providers(id),
  provider_name text,
  phone_number text,
  country text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled', 'expired')),
  cost numeric(18,2) NOT NULL DEFAULT 0.0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_read_all_orders" ON orders;
CREATE POLICY "admin_read_all_orders" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_all_orders" ON orders;
CREATE POLICY "admin_update_all_orders" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category_id);

-- ============================================================
-- ADMIN AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_logs_v2" ON admin_audit_log;
CREATE POLICY "admin_read_audit_logs_v2" ON admin_audit_log FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "admin_insert_audit_logs_v2" ON admin_audit_log;
CREATE POLICY "admin_insert_audit_logs_v2" ON admin_audit_log FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);

-- ============================================================
-- MODIFY PROFILES TABLE — add total_earnings
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_earnings numeric(18,2) NOT NULL DEFAULT 0.0;
  END IF;
END $$;

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO categories (display_name, slug, description, logo_url, status, sort_order, reward_per_otp)
VALUES
  ('Facebook', 'facebook', 'Receive OTP codes for Facebook accounts, pages, and Messenger verification.', NULL, 'active', 1, 0.00),
  ('WhatsApp', 'whatsapp', 'Get WhatsApp verification codes instantly for any country.', NULL, 'active', 2, 0.00),
  ('Instagram', 'instagram', 'Instagram OTP verification for account creation and login.', NULL, 'active', 3, 0.00),
  ('New FB', 'new-fb', 'Fresh Facebook number ranges for new account registration.', NULL, 'active', 4, 0.00)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO reward_rules (scope, scope_ref, amount, is_active, precedence)
VALUES ('global', NULL, 0.00, true, 0)
ON CONFLICT DO NOTHING;

INSERT INTO admin_roles (user_id, role, permissions, is_active)
SELECT '772bc9bb-5314-4759-b2b2-8adc6dd4497f', 'super_admin', '{"all": true}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE user_id = '772bc9bb-5314-4759-b2b2-8adc6dd4497f');
