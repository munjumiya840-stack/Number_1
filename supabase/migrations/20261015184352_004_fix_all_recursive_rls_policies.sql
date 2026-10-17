/*
# Fix recursive RLS policies on all admin tables

## Problem
All admin RLS policies use `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)`.
When this runs against the `profiles` table itself, it creates infinite RLS recursion.
Supabase silently returns empty results, so admins see no data and can't access the panel.

## Fix
Replace every recursive `EXISTS (SELECT 1 FROM profiles ...)` with `public.is_admin_user(auth.uid())`,
a SECURITY DEFINER function created in migration 003 that bypasses RLS.

## Tables affected (38 policies across 15 tables):
services, manual_services, manual_numbers, otp_success_logs, config, transactions,
audit_logs, categories, providers, reward_rules, reward_ledger, admin_roles, orders, admin_audit_log
*/

-- services
DROP POLICY IF EXISTS "admin_insert_services" ON services;
CREATE POLICY "admin_insert_services" ON services FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_services" ON services;
CREATE POLICY "admin_update_services" ON services FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_services" ON services;
CREATE POLICY "admin_delete_services" ON services FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- manual_services
DROP POLICY IF EXISTS "admin_insert_manual_services" ON manual_services;
CREATE POLICY "admin_insert_manual_services" ON manual_services FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_manual_services" ON manual_services;
CREATE POLICY "admin_update_manual_services" ON manual_services FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_manual_services" ON manual_services;
CREATE POLICY "admin_delete_manual_services" ON manual_services FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- manual_numbers
DROP POLICY IF EXISTS "admin_insert_manual_numbers" ON manual_numbers;
CREATE POLICY "admin_insert_manual_numbers" ON manual_numbers FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_manual_numbers" ON manual_numbers;
CREATE POLICY "admin_delete_manual_numbers" ON manual_numbers FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_manual_numbers" ON manual_numbers;
CREATE POLICY "admin_update_manual_numbers" ON manual_numbers FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- otp_success_logs
DROP POLICY IF EXISTS "admin_select_all_otp_logs" ON otp_success_logs;
CREATE POLICY "admin_select_all_otp_logs" ON otp_success_logs FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_otp_logs" ON otp_success_logs;
CREATE POLICY "admin_delete_otp_logs" ON otp_success_logs FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- config
DROP POLICY IF EXISTS "admin_update_config" ON config;
CREATE POLICY "admin_update_config" ON config FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_config" ON config;
CREATE POLICY "admin_insert_config" ON config FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- transactions
DROP POLICY IF EXISTS "admin_select_all_transactions" ON transactions;
CREATE POLICY "admin_select_all_transactions" ON transactions FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- audit_logs
DROP POLICY IF EXISTS "admin_read_audit_logs" ON audit_logs;
CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_audit_logs" ON audit_logs;
CREATE POLICY "admin_insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

-- categories
DROP POLICY IF EXISTS "admin_read_all_categories" ON categories;
CREATE POLICY "admin_read_all_categories" ON categories FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- providers
DROP POLICY IF EXISTS "admin_read_providers" ON providers;
CREATE POLICY "admin_read_providers" ON providers FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_providers" ON providers;
CREATE POLICY "admin_insert_providers" ON providers FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_providers" ON providers;
CREATE POLICY "admin_update_providers" ON providers FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_providers" ON providers;
CREATE POLICY "admin_delete_providers" ON providers FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- reward_rules
DROP POLICY IF EXISTS "admin_read_reward_rules" ON reward_rules;
CREATE POLICY "admin_read_reward_rules" ON reward_rules FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_reward_rules" ON reward_rules;
CREATE POLICY "admin_insert_reward_rules" ON reward_rules FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_reward_rules" ON reward_rules;
CREATE POLICY "admin_update_reward_rules" ON reward_rules FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_reward_rules" ON reward_rules;
CREATE POLICY "admin_delete_reward_rules" ON reward_rules FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- reward_ledger
DROP POLICY IF EXISTS "admin_read_all_rewards" ON reward_ledger;
CREATE POLICY "admin_read_all_rewards" ON reward_ledger FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_rewards" ON reward_ledger;
CREATE POLICY "admin_insert_rewards" ON reward_ledger FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_update_rewards" ON reward_ledger;
CREATE POLICY "admin_update_rewards" ON reward_ledger FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- admin_roles
DROP POLICY IF EXISTS "admin_read_admin_roles" ON admin_roles;
CREATE POLICY "admin_read_admin_roles" ON admin_roles FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "superadmin_insert_admin_roles" ON admin_roles;
CREATE POLICY "superadmin_insert_admin_roles" ON admin_roles FOR INSERT
  TO authenticated WITH CHECK (
    public.is_admin_user(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM admin_roles ar
        WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true
      )
      OR NOT EXISTS (SELECT 1 FROM admin_roles)
    )
  );

-- orders
DROP POLICY IF EXISTS "admin_read_all_orders" ON orders;
CREATE POLICY "admin_read_all_orders" ON orders FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_all_orders" ON orders;
CREATE POLICY "admin_update_all_orders" ON orders FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- admin_audit_log
DROP POLICY IF EXISTS "admin_read_audit_logs_v2" ON admin_audit_log;
CREATE POLICY "admin_read_audit_logs_v2" ON admin_audit_log FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_audit_logs_v2" ON admin_audit_log;
CREATE POLICY "admin_insert_audit_logs_v2" ON admin_audit_log FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
