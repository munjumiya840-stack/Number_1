/*
# Fix profiles RLS recursion and add missing INSERT policy

## Problem
1. The `admin_select_all_profiles` and `admin_update_all_profiles` policies on `profiles` 
   query `profiles` itself inside the policy (`SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true`).
   This creates a recursive RLS evaluation — Supabase blocks recursion by returning no rows,
   which means the admin check always fails and admins can't read/update profiles.
2. There is no INSERT policy on `profiles`, so when `fetchProfile` in the auth context
   tries to auto-create a profile for a new user, RLS silently blocks it.

## Changes
1. Drop the recursive admin policies on `profiles`.
2. Replace with non-recursive admin policies using `auth.jwt() ->> 'role'` from `raw_app_meta_data`
   is not reliable; instead use the `admin_roles` table which has its own non-recursive
   SELECT policy for admins. But `admin_roles` also checks `profiles.is_admin`...
   The cleanest fix: use a SECURITY DEFINER function `is_admin_user()` that bypasses RLS
   to check admin status, and use it in all admin policies.
3. Add INSERT policy so new users get a profile on first login.

## Security
- `is_admin_user()` is SECURITY DEFINER, runs with elevated privileges, only reads — safe.
- All policies still enforce ownership for regular users.
*/

-- Create a SECURITY DEFINER function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = uid),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

-- Fix profiles SELECT policies (drop recursive ones, replace with non-recursive)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;

CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));

-- Fix profiles UPDATE policies
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Add missing INSERT policy for profiles (allows users to create their own profile)
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Add DELETE policy for admin (was likely missing)
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (public.is_admin_user(auth.uid()));
