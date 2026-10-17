/*
# Add user notifications table for broadcasts

## New table
- user_notifications — stores broadcast notifications visible to each user

## RLS
- Users can read/update only their own notifications
- Admins can insert notifications for any user (broadcasts)
*/

CREATE TABLE IF NOT EXISTS user_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  icon text DEFAULT 'bell',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON user_notifications;
CREATE POLICY "select_own_notifications" ON user_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON user_notifications;
CREATE POLICY "update_own_notifications" ON user_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON user_notifications;
CREATE POLICY "delete_own_notifications" ON user_notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Admins can insert notifications for any user (broadcasts)
DROP POLICY IF EXISTS "admin_insert_notifications" ON user_notifications;
CREATE POLICY "admin_insert_notifications" ON user_notifications FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));

-- Admins can read all notifications
DROP POLICY IF EXISTS "admin_read_all_notifications" ON user_notifications;
CREATE POLICY "admin_read_all_notifications" ON user_notifications FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON user_notifications(user_id) WHERE is_read = false;
