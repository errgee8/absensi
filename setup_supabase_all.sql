-- ==============================================================================
-- 1-CLICK COMPLETE SETUP FOR SUPABASE (DISABLE RLS + STORAGE + ALL SEED DATA)
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. DISABLE ROW LEVEL SECURITY (Allows backend & kiosk full direct sync)
ALTER TABLE IF EXISTS public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.break_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings DISABLE ROW LEVEL SECURITY;

-- 2. CREATE PUBLIC STORAGE BUCKET FOR PHOTOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "Public Select Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Photos" ON storage.objects;

CREATE POLICY "Public Select Photos" ON storage.objects
FOR SELECT USING (bucket_id = 'attendance-photos');

CREATE POLICY "Public Insert Photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'attendance-photos');

CREATE POLICY "Public Update Photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'attendance-photos');

-- 3. INSERT APP SETTINGS
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('admin_pin', '"8080"', 'Manager Dashboard access PIN'),
  ('venue_name', '"JP Karaoke & LuckyCat Kiosk"', 'System Venue Display Name'),
  ('venue_lat', '-8.670458', 'Venue GPS Latitude'),
  ('venue_lng', '115.212629', 'Venue GPS Longitude'),
  ('geofence_radius', '200', 'Geofence allowed radius in meters'),
  ('allowed_subnets', '["192.168.1.0/24", "192.168.0.0/24", "10.0.0.0/24", "172.16.0.0/24", "127.0.0.1/32"]', 'Allowed Wi-Fi IP ranges'),
  ('enforce_wifi', '0', '0 = flag only, 1 = strict block')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4. INSERT SHIFT SCHEDULES
DELETE FROM public.shift_schedules;
INSERT INTO public.shift_schedules (venue, division, shift_number, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end, grace_period_minutes)
VALUES
  -- JP Karaoke Schedules (No break)
  ('JP Karaoke', 'Server and Cashier', 1, 'Shift 1', '13:00', '22:00', false, false, NULL, 10),
  ('JP Karaoke', 'Server and Cashier', 2, 'Shift 2', '18:30', '03:00', true, false, NULL, 10),
  ('JP Karaoke', 'Cleaning Service', 1, 'Shift 1', '10:00', '19:00', false, false, NULL, 10),
  ('JP Karaoke', 'Cleaning Service', 2, 'Shift 2', '18:30', '03:00', true, false, NULL, 10),
  ('JP Karaoke', 'Storage Staff', 1, 'Shift 1 (Pagi)', '10:00', '19:00', false, false, NULL, 10),
  ('JP Karaoke', 'Storage Staff', 2, 'Shift 2 (Middle)', '13:00', '22:00', false, false, NULL, 10),
  ('JP Karaoke', 'Storage Staff', 3, 'Shift 3 (Malam)', '18:30', '03:30', true, false, NULL, 10),

  -- Lucky Cat Schedules (1-hour break allowed)
  ('Lucky Cat', 'Bar, Cashier, and Server', 1, 'Shift 1', '10:00', '19:00', false, true, '16:00', 10),
  ('Lucky Cat', 'Bar, Cashier, and Server', 2, 'Shift 2', '18:30', '03:30', false, true, '01:00', 10),
  ('Lucky Cat', 'Kitchen', 1, 'Shift 1', '09:00', '19:00', false, true, '16:00', 10),
  ('Lucky Cat', 'Kitchen', 2, 'Shift 2', '18:00', '03:00', true, true, '01:00', 10),
  ('Lucky Cat', 'Kitchen', 3, 'Middle 1', '12:00', '22:00', false, true, '18:00', 10),
  ('Lucky Cat', 'Kitchen', 4, 'Middle 2', '14:00', '00:00', false, true, '20:00', 10);

-- 5. INSERT ALL 18 STAFF MEMBERS WITH EXACT PINS
DELETE FROM public.staff;
INSERT INTO public.staff (legacy_code, name, pin, role, venue, division, department, shift_start, shift_end, standard_hours, is_active)
VALUES
  -- JP Server
  ('JP-SRV-01', 'Alex', '1010', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '13:00', '22:00', 9.0, true),
  ('JP-SRV-02', 'Dio', '2020', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '13:00', '22:00', 9.0, true),
  ('JP-SRV-03', 'Rojes', '3030', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '18:30', '03:00', 8.5, true),
  ('JP-SRV-04', 'Dein', '4040', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '18:30', '03:00', 8.5, true),
  ('JP-SRV-05', 'Made', '5050', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '13:00', '22:00', 9.0, true),
  -- JP Cashier
  ('JP-CSH-01', 'Adis', '1212', 'Cashier', 'JP Karaoke', 'Server and Cashier', 'Cashier', '13:00', '22:00', 9.0, true),
  ('JP-CSH-02', 'Ica', '3880', 'Cashier', 'JP Karaoke', 'Server and Cashier', 'Cashier', '18:30', '03:00', 8.5, true),
  -- JP Cleaning Service
  ('JP-CLN-01', 'Yohan', '2442', 'Cleaning Service', 'JP Karaoke', 'Cleaning Service', 'Housekeeping', '10:00', '19:00', 9.0, true),
  ('JP-CLN-02', 'Emil', '1991', 'Cleaning Service', 'JP Karaoke', 'Cleaning Service', 'Housekeeping', '18:30', '03:00', 8.5, true),
  -- JP Storage
  ('JP-STR-01', 'Aris', '9889', 'Storage Staff', 'JP Karaoke', 'Storage Staff', 'Logistics', '10:00', '19:00', 9.0, true),
  ('JP-STR-02', 'Galang', '2001', 'Storage Staff', 'JP Karaoke', 'Storage Staff', 'Logistics', '13:00', '22:00', 9.0, true),
  ('JP-STR-03', 'Febry', '2889', 'Storage Staff', 'JP Karaoke', 'Storage Staff', 'Logistics', '18:30', '03:30', 9.0, true),

  -- Lucky Cat Kitchen
  ('LC-KIT-01', 'Anto Suranto', '4192', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '09:00', '19:00', 10.0, true),
  ('LC-KIT-02', 'Martha Andi Wijaya', '6381', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '18:00', '03:00', 9.0, true),
  ('LC-KIT-03', 'Achmad Fazrin Febialdo (Edo)', '2574', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '12:00', '22:00', 10.0, true),
  ('LC-KIT-04', 'Nurjanah', '8136', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '14:00', '00:00', 10.0, true),
  ('LC-KIT-05', 'Ulul Albab', '3920', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '09:00', '19:00', 10.0, true),
  ('LC-KIT-06', 'Harun Ar Rasyid', '7405', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '18:00', '03:00', 9.0, true);
