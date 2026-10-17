/*
# Atomic OTP earnings credit + Telegram auto-login support

1. New Functions
- `credit_otp_earnings(p_user_id uuid, p_otp_id text, p_number_id text, p_amount numeric, p_service text)`
  Atomically credits a user's wallet balance the moment an OTP is received.
  Uses a UNIQUE-constraint insert on otp_charge_log(otp_id) as the dedup gate:
  - If the OTP ID was already credited, the insert conflicts, the function
    returns false, and the balance is NOT touched (prevents double crediting).
  - If the insert succeeds (first time seeing this OTP), the user's balance
    and total_earnings are increased by p_amount in the same transaction.
  Returns true when a credit was applied, false when it was a duplicate.

2. New Table
- `telegram_sessions` — stores issued session records for Telegram Mini App
  logins (audit + revocation support).
  - `id` (bigserial PK)
  - `user_id` (uuid, references auth.users, cascade delete)
  - `telegram_id` (text, not null)
  - `created_at` (timestamptz, default now)

3. Security
- RLS enabled on `telegram_sessions`.
- Policy: authenticated users can select their own session rows only.
- `credit_otp_earnings` is SECURITY DEFINER so the edge function (service
  role) can call it; EXECUTE granted to service_role only.
- Indexes on user_numbers(user_id) already exist from migration 012.

4. Notes
- Balance changes made by this function are transactional: either both the
  charge-log row and the balance increase happen, or neither does.
*/

CREATE OR REPLACE FUNCTION credit_otp_earnings(
  p_user_id uuid,
  p_otp_id text,
  p_number_id text,
  p_amount numeric,
  p_service text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_id bigint;
BEGIN
  -- Atomic dedup: only proceeds if this otp_id has never been credited
  INSERT INTO otp_charge_log (otp_id, user_id, number_id, amount, service, is_earnings)
  VALUES (p_otp_id, p_user_id, p_number_id, p_amount, p_service, true)
  ON CONFLICT (otp_id) DO NOTHING
  RETURNING id INTO inserted_id;

  IF inserted_id IS NULL THEN
    -- Duplicate OTP: already credited, do nothing
    RETURN false;
  END IF;

  -- Same-transaction balance credit
  UPDATE profiles
  SET balance = COALESCE(balance, 0) + p_amount,
      total_earnings = COALESCE(total_earnings, 0) + p_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION credit_otp_earnings FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION credit_otp_earnings TO service_role;

CREATE TABLE IF NOT EXISTS telegram_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_telegram_sessions" ON telegram_sessions;
CREATE POLICY "select_own_telegram_sessions" ON telegram_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_sessions_user_id ON telegram_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_sessions_telegram_id ON telegram_sessions(telegram_id);
