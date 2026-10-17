/*
# Add DELETE policy on config table for admins

## Problem
The config table has INSERT and UPDATE policies for admins but no DELETE policy.
The "Clear Bot API key" feature in admin settings needs to delete the `bot_api_key` row.

## Changes
- Add `admin_delete_config` DELETE policy using `is_admin_user()`.
*/

DROP POLICY IF EXISTS "admin_delete_config" ON config;
CREATE POLICY "admin_delete_config" ON config FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));
