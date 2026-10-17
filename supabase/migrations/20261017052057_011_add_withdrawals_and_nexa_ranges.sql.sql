-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL DEFAULT 'bkash',
  account_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_withdrawals" ON withdrawal_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_withdrawals" ON withdrawal_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can see all and update
CREATE POLICY "admin_select_withdrawals" ON withdrawal_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_update_withdrawals" ON withdrawal_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);

-- Nexa range filters table (admin-managed whitelist)
CREATE TABLE IF NOT EXISTS nexa_ranges (
  id BIGSERIAL PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_sid TEXT NOT NULL DEFAULT '',
  range_prefix TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE nexa_ranges ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read visible ranges
CREATE POLICY "read_visible_nexa_ranges" ON nexa_ranges FOR SELECT
  TO authenticated USING (is_visible = true);

-- Admins can read all and do CRUD
CREATE POLICY "admin_all_nexa_ranges" ON nexa_ranges FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE INDEX idx_nexa_ranges_visible ON nexa_ranges(is_visible);

-- Withdrawal config rows
INSERT INTO config (key, value) VALUES
  ('withdrawal_min_amount', '1.00'),
  ('withdrawal_status', 'open'),
  ('withdrawal_bkash_number', ''),
  ('withdrawal_nagad_number', ''),
  ('withdrawal_rocket_number', ''),
  ('withdrawal_binance_id', '')
ON CONFLICT (key) DO NOTHING;
