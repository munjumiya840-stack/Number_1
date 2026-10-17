CREATE TABLE IF NOT EXISTS otp_charge_log (
  id BIGSERIAL PRIMARY KEY,
  otp_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number_id TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  service TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE otp_charge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_charges" ON otp_charge_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_otp_charge_log_otp_id ON otp_charge_log(otp_id);
CREATE INDEX idx_otp_charge_log_user_id ON otp_charge_log(user_id);
