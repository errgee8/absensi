import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

if (isSupabaseConfigured) {
  console.log('✅ Supabase Cloud connected successfully:', supabaseUrl);
} else {
  console.log('ℹ️ Supabase credentials not found in .env. Running on local SQLite database.');
}

/**
 * Uploads a base64 encoded photo to Supabase Storage bucket 'attendance-photos'
 * @param {string} base64Data 
 * @param {string} filenamePrefix 
 * @returns {Promise<string>} Public HTTPS URL of the uploaded image
 */
export async function uploadPhotoToSupabase(base64Data, filenamePrefix = 'selfie') {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  if (!base64Data || !base64Data.startsWith('data:image')) {
    return null;
  }

  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = `uploads/${filename}`;

  const { data, error } = await supabase.storage
    .from('attendance-photos')
    .upload(filePath, buffer, {
      contentType: `image/${matches[1]}`,
      upsert: true
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    return null;
  }

  const { data: publicData } = supabase.storage
    .from('attendance-photos')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}

/**
 * Supabase Cloud Database Helpers
 */
export const cloudDb = {
  // 1. Get staff list
  async getStaff(venue) {
    if (!supabase) return null;
    let query = supabase.from('staff').select('*').eq('is_active', true);
    if (venue && venue !== 'ALL') {
      query = query.ilike('venue', `%${venue.replace('JP Karaoke', 'JP')}%`);
    }
    const { data, error } = await query.order('venue', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;
    return data.map(s => ({
      ...s,
      // Map id to legacy_code if present for backward compatibility
      id: s.legacy_code || s.id,
      uuid: s.id
    }));
  },

  // 2. Verify staff PIN & get active attendance
  async verifyStaffPin(staffIdOrCode, pin) {
    if (!supabase) return null;
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .or(`id.eq.${staffIdOrCode},legacy_code.eq.${staffIdOrCode}`)
      .single();

    if (error || !staff) return null;
    if (staff.pin !== pin.trim()) return { match: false, staff };

    // Fetch active attendance log
    const { data: activeLog } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('staff_id', staff.id)
      .neq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      match: true,
      staff: {
        ...staff,
        id: staff.legacy_code || staff.id,
        uuid: staff.id
      },
      activeShift: activeLog
    };
  },

  // 3. Record Check-In in attendance_logs
  async recordCheckin({ staffId, userLat, userLng, accuracy, distance, photoUrl, clientIp, wifiPass, flags }) {
    if (!supabase) return null;
    // Resolve UUID
    const { data: staff } = await supabase
      .from('staff')
      .select('id, venue, division, role, department, shift_start, shift_end')
      .or(`id.eq.${staffId},legacy_code.eq.${staffId}`)
      .single();

    if (!staff) throw new Error('Staff record not found');

    const checkinTime = new Date().toISOString();
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert({
        staff_id: staff.id,
        shift_date: checkinTime.split('T')[0],
        check_in_time: checkinTime,
        check_in_photo_url: photoUrl,
        check_in_lat: userLat,
        check_in_lng: userLng,
        check_in_accuracy: accuracy,
        check_in_distance: distance,
        check_in_ip: clientIp,
        check_in_wifi_pass: wifiPass,
        check_in_network_status: wifiPass ? 'PASS' : 'FLAG_CELLULAR',
        status: 'ON_DUTY',
        flags: flags || []
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, staff_name: staff.name, venue: staff.venue };
  },

  // 4. Record Break Start
  async recordBreakStart({ attendanceId, staffId, photoUrl }) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('break_logs')
      .insert({
        attendance_id: attendanceId,
        staff_id: staffId,
        break_start: new Date().toISOString(),
        break_start_photo_url: photoUrl,
        status: 'ON_BREAK',
        verification_method: 'SELFIE_KIOSK'
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('attendance_logs')
      .update({ status: 'ON_BREAK' })
      .eq('id', attendanceId);

    return data;
  },

  // 5. Record Break End
  async recordBreakEnd({ attendanceId, photoUrl, durationMinutes }) {
    if (!supabase) return null;
    const endTime = new Date().toISOString();
    const excess = Math.max(0, durationMinutes - 60);

    const { data, error } = await supabase
      .from('break_logs')
      .update({
        break_end: endTime,
        break_end_photo_url: photoUrl,
        duration_minutes: durationMinutes,
        excess_minutes: excess,
        status: 'COMPLETED'
      })
      .eq('attendance_id', attendanceId)
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('attendance_logs')
      .update({ status: 'ON_DUTY' })
      .eq('id', attendanceId);

    return data;
  },

  // 6. Record Check-Out
  async recordCheckout({ attendanceId, userLat, userLng, accuracy, distance, photoUrl, clientIp, wifiPass, durationMinutes, flags, notes }) {
    if (!supabase) return null;
    const checkoutTime = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({
        check_out_time: checkoutTime,
        check_out_photo_url: photoUrl,
        check_out_lat: userLat,
        check_out_lng: userLng,
        check_out_accuracy: accuracy,
        check_out_distance: distance,
        check_out_ip: clientIp,
        check_out_wifi_pass: wifiPass,
        check_out_network_status: wifiPass ? 'PASS' : 'FLAG_CELLULAR',
        duration_minutes: durationMinutes,
        status: 'COMPLETED',
        flags: flags || [],
        notes: notes || null
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
