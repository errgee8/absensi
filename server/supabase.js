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

const LEGACY_ALIAS_MAP = {
  'JP-CSH-01': 'JP-CAS-01', // Ica
  'JP-CSH-02': 'JP-CAS-02', // Adis
  'JP-SRV-01': 'JP-SER-03', // Rojes
  'JP-SRV-02': 'JP-SER-04', // Alex
  'JP-SRV-03': 'JP-SER-05', // Dio
  'JP-SRV-04': 'JP-SER-06', // Made
  'JP-SRV-05': 'JP-SER-07', // Dein
  'JP-CLN-01': 'JP-CLE-08', // Yohan
  'JP-CLN-02': 'JP-CLE-09', // Emil
  'JP-CLN-03': 'JP-CLE-10', // Anang
  'JP-STR-01': 'JP-STO-11', // Aris
  'JP-STR-02': 'JP-STO-12', // Galang
  'JP-STR-03': 'JP-STO-13', // Febry
  'LC-SRV-01': 'LC-SER-01', // Roni
  'LC-SRV-02': 'LC-SER-02', // Dika
  'LC-SRV-03': 'LC-SER-03', // Haslam
  'LC-SRV-04': 'LC-SER-04', // Ferin
  'LC-SRV-05': 'LC-SER-05', // Oky
  'LC-SRV-06': 'LC-SER-06', // Martin
  'LC-SRV-07': 'LC-SER-07', // Andre
  'LC-SRV-08': 'LC-SER-08', // Fontana
  'LC-CSH-01': 'LC-CAS-09', // Santi
  'LC-CSH-02': 'LC-CAS-10', // Manda
  'LC-CSH-03': 'LC-CAS-11', // Widia
  'LC-BAR-01': 'LC-BAR-12', // Gerry
  'LC-BAR-02': 'LC-BAR-13', // Mada
  'LC-BAR-03': 'LC-BAR-14', // Raymond
  'LC-BAR-04': 'LC-BAR-15', // Jackson
  'LC-KIT-01': 'LC-KIT-16', // Anto
  'LC-KIT-02': 'LC-KIT-17', // Nurjanah
  'LC-KIT-03': 'LC-KIT-18', // Martha
  'LC-KIT-04': 'LC-KIT-19', // Edo
  'LC-KIT-05': 'LC-KIT-20', // Ulul
  'LC-KIT-06': 'LC-KIT-21'  // Harun
};

/**
 * Safely find a staff member in Supabase without triggering 22P02 UUID syntax error
 */
export async function findStaffInSupabase(identifier) {
  if (!supabase || !identifier) return null;
  let str = String(identifier).trim();
  if (LEGACY_ALIAS_MAP[str]) {
    str = LEGACY_ALIAS_MAP[str];
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  let query = supabase.from('staff').select('*');
  if (isUuid) {
    query = query.eq('id', str);
  } else {
    query = query.eq('legacy_code', str);
  }

  const { data, error } = await query.maybeSingle();
  if (!error && data) return data;

  // Fallback 1: match by exact name
  const { data: byName } = await supabase.from('staff').select('*').ilike('name', str).maybeSingle();
  if (byName) return byName;

  // Fallback 2: match by PIN
  if (/^\d{4,6}$/.test(str)) {
    const { data: byPin } = await supabase.from('staff').select('*').eq('pin', str).maybeSingle();
    if (byPin) return byPin;
  }

  return null;
}

/**
 * Supabase Cloud Database Helpers (Source of Truth)
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
    return (data || []).map(s => ({
      ...s,
      id: s.legacy_code || s.id,
      uuid: s.id
    }));
  },

  // 2. Verify staff PIN & get active attendance
  async verifyStaffPin(staffIdOrCode, pin) {
    if (!supabase) return null;
    const cleanPin = pin ? pin.trim() : '';
    let staff = null;

    if (staffIdOrCode) {
      staff = await findStaffInSupabase(staffIdOrCode);
    } else if (cleanPin) {
      const { data } = await supabase.from('staff').select('*').eq('pin', cleanPin).eq('is_active', true).maybeSingle();
      staff = data;
    }

    if (!staff) return null;
    if (staff.pin !== cleanPin) return { match: false, staff };

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
  async recordCheckin({ staffId, userLat, userLng, accuracy, distance, photoUrl, clientIp, wifiPass, flags, scheduledStart, scheduledEnd }) {
    if (!supabase) return null;
    const staff = await findStaffInSupabase(staffId);
    if (!staff) throw new Error('Staff record not found: ' + staffId);

    const checkinTime = new Date().toISOString();
    const notesJson = JSON.stringify({
      scheduled_start: scheduledStart || staff.shift_start || '13:00',
      scheduled_end: scheduledEnd || staff.shift_end || '22:00'
    });

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert({
        staff_id: staff.id,
        shift_date: checkinTime.split('T')[0],
        check_in_time: checkinTime,
        check_in_photo_url: photoUrl,
        check_in_lat: userLat,
        check_in_lng: userLng,
        check_in_accuracy: accuracy || null,
        check_in_distance: distance,
        check_in_ip: clientIp,
        check_in_wifi_pass: Boolean(wifiPass),
        check_in_network_status: wifiPass ? 'PASS' : 'FLAG_CELLULAR',
        status: 'ON_DUTY',
        flags: flags || [],
        notes: notesJson
      })
      .select('*, staff:staff_id(*), break_logs(*)')
      .single();

    if (error) throw error;
    return {
      ...data,
      staff_name: staff.name,
      staff_id: staff.legacy_code || staff.id,
      venue: staff.venue,
      division: staff.division
    };
  },

  // 4. Record Break Start
  async recordBreakStart({ attendanceId, staffId, photoUrl }) {
    if (!supabase) return null;
    let targetLogId = attendanceId;
    let staffUuid = null;

    if (staffId) {
      const staff = await findStaffInSupabase(staffId);
      if (staff) staffUuid = staff.id;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(attendanceId || ''));
    if (!isUuid && staffUuid) {
      const { data: activeLog } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('staff_id', staffUuid)
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeLog) targetLogId = activeLog.id;
    }

    if (!targetLogId || !staffUuid) {
      console.warn('recordBreakStart: unable to identify active log or staff UUID');
      return null;
    }

    const { data, error } = await supabase
      .from('break_logs')
      .insert({
        attendance_id: targetLogId,
        staff_id: staffUuid,
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
      .update({ status: 'ON_BREAK', updated_at: new Date().toISOString() })
      .eq('id', targetLogId);

    return data;
  },

  // 5. Record Break End
  async recordBreakEnd({ attendanceId, staffId, photoUrl, durationMinutes }) {
    if (!supabase) return null;
    let targetLogId = attendanceId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(attendanceId || ''));
    if (!isUuid && staffId) {
      const staff = await findStaffInSupabase(staffId);
      if (staff) {
        const { data: activeLog } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('staff_id', staff.id)
          .eq('status', 'ON_BREAK')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeLog) targetLogId = activeLog.id;
      }
    }

    if (!targetLogId) return null;
    const endTime = new Date().toISOString();
    const excess = Math.max(0, (durationMinutes || 0) - 60);

    const { data, error } = await supabase
      .from('break_logs')
      .update({
        break_end: endTime,
        break_end_photo_url: photoUrl,
        duration_minutes: durationMinutes,
        excess_minutes: excess,
        status: 'COMPLETED'
      })
      .eq('attendance_id', targetLogId)
      .select()
      .maybeSingle();

    if (error) throw error;

    await supabase
      .from('attendance_logs')
      .update({ status: 'ON_DUTY', updated_at: endTime })
      .eq('id', targetLogId);

    return data;
  },

  // 6. Record Check-Out
  async recordCheckout({ attendanceId, staffId, userLat, userLng, accuracy, distance, photoUrl, clientIp, wifiPass, durationMinutes, flags, notes }) {
    if (!supabase) return null;
    const checkoutTime = new Date().toISOString();

    let targetLogId = attendanceId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(attendanceId || ''));
    if (!isUuid && staffId) {
      const staff = await findStaffInSupabase(staffId);
      if (staff) {
        const { data: activeLog } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('staff_id', staff.id)
          .neq('status', 'COMPLETED')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeLog) targetLogId = activeLog.id;
      }
    }

    if (!targetLogId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(targetLogId))) {
      console.warn('Supabase checkout: valid attendanceId not found');
      return null;
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({
        check_out_time: checkoutTime,
        check_out_photo_url: photoUrl,
        check_out_lat: userLat,
        check_out_lng: userLng,
        check_out_accuracy: accuracy || null,
        check_out_distance: distance,
        check_out_ip: clientIp,
        check_out_wifi_pass: Boolean(wifiPass),
        check_out_network_status: wifiPass ? 'PASS' : 'FLAG_CELLULAR',
        duration_minutes: durationMinutes,
        status: 'COMPLETED',
        flags: flags || [],
        notes: notes || null,
        updated_at: checkoutTime
      })
      .eq('id', targetLogId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // 7. Get Shifts from Cloud with complete filter support
  async getShifts({ startDate, endDate, venue, department, flagFilter, search } = {}) {
    if (!supabase) return null;

    let query = supabase
      .from('attendance_logs')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          venue,
          division,
          role,
          department,
          standard_hours,
          legacy_code,
          shift_start,
          shift_end
        ),
        break_logs (
          id,
          break_start,
          break_start_photo_url,
          break_end,
          break_end_photo_url,
          duration_minutes,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('shift_date', startDate);
    }
    if (endDate) {
      query = query.lte('shift_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    let formatted = (data || []).map(row => {
      const st = row.staff || {};
      const brk = (row.break_logs && row.break_logs.length > 0) ? row.break_logs[row.break_logs.length - 1] : null;

      let parsedNotes = {};
      if (typeof row.notes === 'string' && row.notes.startsWith('{')) {
        try { parsedNotes = JSON.parse(row.notes); } catch {}
      }

      let parsedFlags = [];
      if (Array.isArray(row.flags)) {
        parsedFlags = row.flags;
      } else if (typeof row.flags === 'string') {
        try { parsedFlags = JSON.parse(row.flags || '[]'); } catch { parsedFlags = []; }
      }

      const breakStatus = row.status === 'ON_BREAK'
        ? 'ON_BREAK'
        : (row.break_logs && row.break_logs.length > 0 ? 'COMPLETED' : 'NONE');

      return {
        id: row.id,
        supabase_id: row.id,
        staff_id: st.legacy_code || st.id || row.staff_id,
        staff_name: st.name || 'Staff',
        staff_venue: st.venue || 'JP Karaoke',
        staff_division: st.division || st.role || 'Server and Cashier',
        staff_role: st.role || 'Staff',
        staff_department: st.department || 'Operations',
        standard_hours: st.standard_hours || 8.5,
        date: row.shift_date || (row.check_in_time ? row.check_in_time.split('T')[0] : ''),
        scheduled_start: parsedNotes.scheduled_start || st.shift_start || '13:00',
        scheduled_end: parsedNotes.scheduled_end || st.shift_end || '22:00',
        checkin_time: row.check_in_time,
        checkin_lat: row.check_in_lat,
        checkin_lng: row.check_in_lng,
        checkin_accuracy: row.check_in_accuracy,
        checkin_distance: row.check_in_distance,
        checkin_photo: row.check_in_photo_url,
        checkin_ip: row.check_in_ip,
        checkin_wifi_pass: row.check_in_wifi_pass ? 1 : 0,
        break_status: breakStatus,
        break_start_time: brk?.break_start || null,
        break_start_photo: brk?.break_start_photo_url || null,
        break_end_time: brk?.break_end || null,
        break_end_photo: brk?.break_end_photo_url || null,
        break_duration_minutes: brk?.duration_minutes || null,
        break_count: row.break_logs ? row.break_logs.length : 0,
        checkout_time: row.check_out_time,
        checkout_lat: row.check_out_lat,
        checkout_lng: row.check_out_lng,
        checkout_accuracy: row.check_out_accuracy,
        checkout_distance: row.check_out_distance,
        checkout_photo: row.check_out_photo_url,
        checkout_ip: row.check_out_ip,
        checkout_wifi_pass: row.check_out_wifi_pass ? 1 : 0,
        duration_minutes: row.duration_minutes,
        status: row.status === 'COMPLETED' ? 'COMPLETED' : (row.status === 'ON_BREAK' ? 'ON_BREAK' : 'IN_PROGRESS'),
        flags: parsedFlags,
        notes: typeof row.notes === 'string' && !row.notes.startsWith('{') ? row.notes : null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    if (venue && venue !== 'ALL') {
      formatted = formatted.filter(r => r.staff_venue === venue);
    }
    if (department && department !== 'ALL') {
      formatted = formatted.filter(r => r.staff_division === department || r.staff_department === department);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter(r =>
        (r.staff_name && r.staff_name.toLowerCase().includes(q)) ||
        (r.staff_id && String(r.staff_id).toLowerCase().includes(q)) ||
        (r.staff_role && r.staff_role.toLowerCase().includes(q))
      );
    }
    if (flagFilter === 'FLAGS_ONLY') {
      formatted = formatted.filter(r => r.flags.length > 0);
    } else if (flagFilter === 'NORMAL_ONLY') {
      formatted = formatted.filter(r => r.flags.length === 0);
    }

    return formatted;
  },

  // 8. Get KPI Stats from Cloud
  async getStats() {
    if (!supabase) return null;
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: todayLogs, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        shift_date,
        status,
        flags,
        check_in_wifi_pass,
        check_out_wifi_pass
      `)
      .eq('shift_date', todayStr);

    if (error) throw error;

    const list = todayLogs || [];
    const activeCount = list.filter(s => s.status !== 'COMPLETED').length;
    const onBreakCount = list.filter(s => s.status === 'ON_BREAK').length;
    const completedCount = list.filter(s => s.status === 'COMPLETED').length;

    let totalFlags = 0;
    let wifiMatchPasses = 0;
    let totalEvents = 0;

    for (const s of list) {
      const flags = Array.isArray(s.flags) ? s.flags : (typeof s.flags === 'string' ? JSON.parse(s.flags || '[]') : []);
      totalFlags += flags.length;

      if (s.check_in_wifi_pass != null) {
        totalEvents++;
        if (s.check_in_wifi_pass) wifiMatchPasses++;
      }
      if (s.check_out_wifi_pass != null) {
        totalEvents++;
        if (s.check_out_wifi_pass) wifiMatchPasses++;
      }
    }

    const wifiComplianceRate = totalEvents > 0 ? Math.round((wifiMatchPasses / totalEvents) * 100) : 100;

    return {
      todayDate: todayStr,
      totalToday: list.length,
      activeShifts: activeCount,
      onBreakShifts: onBreakCount,
      completedShifts: completedCount,
      flaggedAnomalies: totalFlags,
      wifiComplianceRate
    };
  }
};
