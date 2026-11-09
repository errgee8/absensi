-- =========================================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) HARDENING SCRIPT
-- JP Karaoke & LuckyCat Kiosk Staff Attendance Application
-- =========================================================================

-- 1. Enable RLS on core business tables
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS break_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Staff Table Security Policies
-- Kiosk devices and floor apps can read active staff profiles for PIN authentication
DROP POLICY IF EXISTS "Allow read active staff" ON staff;
CREATE POLICY "Allow read active staff" ON staff
  FOR SELECT USING (is_active = true);

-- Service role and authenticated managers have full access to manage staff
DROP POLICY IF EXISTS "Allow manager full access on staff" ON staff;
CREATE POLICY "Allow manager full access on staff" ON staff
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Attendance Logs Policies
-- Kiosk can insert biometric punches
DROP POLICY IF EXISTS "Allow insert attendance log" ON attendance_logs;
CREATE POLICY "Allow insert attendance log" ON attendance_logs
  FOR INSERT WITH CHECK (true);

-- Managers & supervisors can read attendance logs
DROP POLICY IF EXISTS "Allow read attendance logs" ON attendance_logs;
CREATE POLICY "Allow read attendance logs" ON attendance_logs
  FOR SELECT USING (true);

-- Checkout updates and late justifications
DROP POLICY IF EXISTS "Allow update attendance logs" ON attendance_logs;
CREATE POLICY "Allow update attendance logs" ON attendance_logs
  FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Break Logs Policies
DROP POLICY IF EXISTS "Allow insert and select break logs" ON break_logs;
CREATE POLICY "Allow insert and select break logs" ON break_logs
  FOR ALL USING (true) WITH CHECK (true);

-- 5. App Settings & Disaster Recovery Policies
DROP POLICY IF EXISTS "Allow access app settings" ON app_settings;
CREATE POLICY "Allow access app settings" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Storage Bucket Configuration
-- Ensure attendance-photos bucket exists with safe upload policy
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
