-- Track which user allocated which Nexa number (for data isolation)
CREATE TABLE IF NOT EXISTS user_numbers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nexa_number_id TEXT NOT NULL,
  msisdn TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  prefix TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_numbers" ON user_numbers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_numbers" ON user_numbers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_numbers_user_id ON user_numbers(user_id);
CREATE INDEX idx_user_numbers_nexa_id ON user_numbers(nexa_number_id);

-- Add earnings column to otp_charge_log (negative charge = credit to user)
ALTER TABLE otp_charge_log ADD COLUMN IF NOT EXISTS is_earnings BOOLEAN NOT NULL DEFAULT false;

-- Config for session longevity and payment method images
INSERT INTO config (key, value) VALUES
  ('session_expiry_hours', '168'),
  ('withdrawal_bkash_image', ''),
  ('withdrawal_nagad_image', ''),
  ('withdrawal_rocket_image', ''),
  ('withdrawal_binance_image', '')
ON CONFLICT (key) DO NOTHING;
