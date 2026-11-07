-- ==============================================================================
-- STAFF ATTENDANCE PWA - SUPABASE (POSTGRESQL) PRODUCTION MIGRATION SCRIPT
-- Venues: JP Karaoke & Lucky Cat
-- Completely Free Tier Compatible (PostgreSQL Database + Storage)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE: staff
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_code VARCHAR(30) UNIQUE, -- e.g. 'JP-SRV-01', 'LC-KIT-01'
    name TEXT NOT NULL,
    pin VARCHAR(6) NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff',
    venue TEXT NOT NULL DEFAULT 'Lucky Cat', -- 'Lucky Cat' / 'JP Karaoke'
    division TEXT NOT NULL DEFAULT 'General',
    department TEXT NOT NULL DEFAULT 'General',
    shift_start VARCHAR(10) DEFAULT '13:00',
    shift_end VARCHAR(10) DEFAULT '22:00',
    standard_hours NUMERIC(4, 2) DEFAULT 8.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLE: attendance_logs (shifts)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Check-In details
    check_in_time TIMESTAMPTZ,
    check_in_photo_url TEXT,
    check_in_lat NUMERIC(10, 7),
    check_in_lng NUMERIC(10, 7),
    check_in_accuracy NUMERIC(8, 2),
    check_in_distance NUMERIC(8, 2),
    check_in_network_status VARCHAR(30) DEFAULT 'PASS', -- 'PASS', 'FLAG_CELLULAR', 'FLAG_UNKNOWN_WIFI', 'OFF_NETWORK'
    check_in_ip VARCHAR(50),
    check_in_wifi_pass BOOLEAN DEFAULT true,
    
    -- Check-Out details
    check_out_time TIMESTAMPTZ,
    check_out_photo_url TEXT,
    check_out_lat NUMERIC(10, 7),
    check_out_lng NUMERIC(10, 7),
    check_out_accuracy NUMERIC(8, 2),
    check_out_distance NUMERIC(8, 2),
    check_out_network_status VARCHAR(30),
    check_out_ip VARCHAR(50),
    check_out_wifi_pass BOOLEAN,
    duration_minutes INTEGER DEFAULT 0,
    
    -- Operational state & flags
    status VARCHAR(30) NOT NULL DEFAULT 'ON_DUTY', -- 'ON_DUTY', 'ON_BREAK', 'COMPLETED', 'AUTO_EXPIRED'
    flags TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g. ARRAY['LATE_IN', 'EARLY_OUT', 'OFF_NETWORK', 'NO_CHECKOUT']
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABLE: break_logs
CREATE TABLE IF NOT EXISTS public.break_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.attendance_logs(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    break_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    break_end TIMESTAMPTZ,
    break_start_photo_url TEXT,
    break_end_photo_url TEXT,
    allowed_minutes INTEGER NOT NULL DEFAULT 60,
    excess_minutes INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    verification_method VARCHAR(30) DEFAULT 'SELFIE_KIOSK', -- 'SELFIE_KIOSK', 'WALL_QR', 'BUDDY_PHONE', 'MANAGER_OVERRIDE'
    status VARCHAR(20) NOT NULL DEFAULT 'ON_BREAK', -- 'ON_BREAK', 'COMPLETED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABLE: shift_schedules (Admin timing editor)
CREATE TABLE IF NOT EXISTS public.shift_schedules (
    id SERIAL PRIMARY KEY,
    venue TEXT NOT NULL,
    division TEXT NOT NULL,
    shift_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    is_flexible_checkout BOOLEAN NOT NULL DEFAULT false,
    allows_break BOOLEAN NOT NULL DEFAULT false,
    max_break_end VARCHAR(10),
    grace_period_minutes INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABLE: app_settings (Geo-coordinates, subnets, PINs)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_staff_venue ON public.staff(venue);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON public.staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_pin ON public.staff(pin);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift_date ON public.attendance_logs(shift_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_break_attendance_id ON public.break_logs(attendance_id);

-- 8. STORAGE BUCKET CONFIGURATION FOR SELFIE PHOTOS
-- Create the public bucket 'attendance-photos' if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Security Policies (Allow Public Read & Authorized Inserts)
DO $$
BEGIN
    -- Public Read policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access to Attendance Photos' AND tablename = 'objects') THEN
        CREATE POLICY "Public Access to Attendance Photos"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'attendance-photos');
    END IF;

    -- Allow Insert policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Upload of Attendance Photos' AND tablename = 'objects') THEN
        CREATE POLICY "Allow Upload of Attendance Photos"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'attendance-photos');
    END IF;
END $$;

-- 9. SEED DATA: APP SETTINGS (Admin PIN 8080, GPS geofence, network)
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('admin_pin', '"8080"', 'Manager Dashboard access PIN'),
  ('venue_name', '"JP Karaoke & LuckyCat Kiosk"', 'System Venue Display Name'),
  ('venue_lat', '-8.670458', 'Venue GPS Latitude (Denpasar/Kuta)'),
  ('venue_lng', '115.212629', 'Venue GPS Longitude (Denpasar/Kuta)'),
  ('geofence_radius', '200', 'Geofence allowed radius in meters'),
  ('allowed_subnets', '["192.168.1.0/24", "192.168.0.0/24", "10.0.0.0/24", "172.16.0.0/24", "127.0.0.1/32"]', 'Allowed Wi-Fi IP ranges'),
  ('enforce_wifi', '0', 'Set 1 to strictly block off-network check-in, 0 to flag only')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 10. SEED DATA: SHIFT SCHEDULES
INSERT INTO public.shift_schedules (venue, division, shift_number, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end, grace_period_minutes)
VALUES
  -- JP Karaoke Schedules (Strictly NO break)
  ('JP Karaoke', 'Server and Cashier', 1, 'Shift 1', '13:00', '22:00', false, false, NULL, 10),
  ('JP Karaoke', 'Server and Cashier', 2, 'Shift 2', '18:30', '03:00', true, false, NULL, 10),
  ('JP Karaoke', 'Cleaning Service', 1, 'Shift 1', '10:00', '19:00', false, false, NULL, 10),
  ('JP Karaoke', 'Cleaning Service', 2, 'Shift 2', '18:30', '03:00', true, false, NULL, 10),
  ('JP Karaoke', 'Storage Staff', 1, 'Shift 1 (Pagi)', '10:00', '19:00', false, false, NULL, 10),
  ('JP Karaoke', 'Storage Staff', 2, 'Shift 2 (Middle)', '13:00', '22:00', false, false, NULL, 10),
  ('JP Karaoke', 'Storage Staff', 3, 'Shift 3 (Malam)', '18:30', '03:30', true, false, NULL, 10),

  -- Lucky Cat Schedules (1-hour break allowed, strictly once)
  ('Lucky Cat', 'Bar, Cashier, and Server', 1, 'Shift 1', '10:00', '19:00', false, true, '16:00', 10),
  ('Lucky Cat', 'Bar, Cashier, and Server', 2, 'Shift 2', '18:30', '03:30', false, true, '01:00', 10),
  ('Lucky Cat', 'Kitchen', 1, 'Shift 1', '09:00', '19:00', false, true, '16:00', 10),
  ('Lucky Cat', 'Kitchen', 2, 'Shift 2', '18:00', '03:00', true, true, '01:00', 10),
  ('Lucky Cat', 'Kitchen', 3, 'Middle 1', '12:00', '22:00', false, true, '18:00', 10),
  ('Lucky Cat', 'Kitchen', 4, 'Middle 2', '14:00', '00:00', false, true, '20:00', 10)
ON CONFLICT DO NOTHING;

-- 11. SEED DATA: STAFF ROSTER WITH PINS
-- JP Karaoke Staff
INSERT INTO public.staff (legacy_code, name, pin, role, venue, division, department, shift_start, shift_end, standard_hours, is_active)
VALUES
  -- Server
  ('JP-SRV-01', 'Alex', '1010', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '13:00', '22:00', 9.0, true),
  ('JP-SRV-02', 'Dio', '2020', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '13:00', '22:00', 9.0, true),
  ('JP-SRV-03', 'Rojes', '3030', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '18:30', '03:00', 8.5, true),
  ('JP-SRV-04', 'Dein', '4040', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '18:30', '03:00', 8.5, true),
  ('JP-SRV-05', 'Made', '5050', 'Server', 'JP Karaoke', 'Server and Cashier', 'Service', '13:00', '22:00', 9.0, true),
  -- Cashier
  ('JP-CSH-01', 'Adis', '1212', 'Cashier', 'JP Karaoke', 'Server and Cashier', 'Cashier', '13:00', '22:00', 9.0, true),
  ('JP-CSH-02', 'Ica', '3880', 'Cashier', 'JP Karaoke', 'Server and Cashier', 'Cashier', '18:30', '03:00', 8.5, true),
  -- Cleaning Service
  ('JP-CLN-01', 'Yohan', '2442', 'Cleaning Service', 'JP Karaoke', 'Cleaning Service', 'Housekeeping', '10:00', '19:00', 9.0, true),
  ('JP-CLN-02', 'Emil', '1991', 'Cleaning Service', 'JP Karaoke', 'Cleaning Service', 'Housekeeping', '18:30', '03:00', 8.5, true),
  -- Storage Staff
  ('JP-STR-01', 'Aris', '9889', 'Storage Staff', 'JP Karaoke', 'Storage Staff', 'Logistics', '10:00', '19:00', 9.0, true),
  ('JP-STR-02', 'Galang', '2001', 'Storage Staff', 'JP Karaoke', 'Storage Staff', 'Logistics', '13:00', '22:00', 9.0, true),
  ('JP-STR-03', 'Febry', '2889', 'Storage Staff', 'JP Karaoke', 'Storage Staff', 'Logistics', '18:30', '03:30', 9.0, true),

  -- Lucky Cat Kitchen Staff
  ('LC-KIT-01', 'Anto Suranto', '4192', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '09:00', '19:00', 10.0, true),
  ('LC-KIT-02', 'Martha Andi Wijaya', '6381', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '18:00', '03:00', 9.0, true),
  ('LC-KIT-03', 'Achmad Fazrin Febialdo (Edo)', '2574', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '12:00', '22:00', 10.0, true),
  ('LC-KIT-04', 'Nurjanah', '8136', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '14:00', '00:00', 10.0, true),
  ('LC-KIT-05', 'Ulul Albab', '3920', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '09:00', '19:00', 10.0, true),
  ('LC-KIT-06', 'Harun Ar Rasyid', '7405', 'Kitchen Staff', 'Lucky Cat', 'Kitchen', 'Kitchen', '18:00', '03:00', 9.0, true)
ON CONFLICT (legacy_code) DO NOTHING;
