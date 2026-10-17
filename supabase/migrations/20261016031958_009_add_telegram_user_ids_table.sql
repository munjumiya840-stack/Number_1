/*
# Capture Telegram user IDs from /start bot interactions
*/
CREATE TABLE IF NOT EXISTS telegram_user_ids (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id text NOT NULL UNIQUE,
  username text,
  first_name text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  linked_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE telegram_user_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tg_id" ON telegram_user_ids FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_tg_id" ON telegram_user_ids FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_tg_id" ON telegram_user_ids FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_tg_id" ON telegram_user_ids FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tg_user_ids_telegram_id ON telegram_user_ids(telegram_id);
