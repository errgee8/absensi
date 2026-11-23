import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getPointCycleInfo } from './shifts.js';
import { getCanonicalSettingKey, APP_SETTINGS_KEYS } from './settingsKeys.js';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

function getOperationalDateYMD(date = new Date(), cutoffHour = 7) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);

  const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (hour < cutoffHour) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  }

  const resY = baseDate.getUTCFullYear();
  const resM = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(baseDate.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

function getWitaDateYMD(date = new Date()) {
  return getOperationalDateYMD(date);
}

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
  if (buffer.length < 500) {
    console.warn('Image buffer too small to be valid image:', buffer.length);
    return null;
  }
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

const SIGNED_URL_TTL_SECONDS = 3600;
const SIGNED_URL_CACHE_BUFFER_MS = 10 * 60 * 1000;
const signedPhotoCache = new Map();

// High-performance In-Memory Settings Cache (reduces Vercel latency and DB roundtrips)
const SETTING_CACHE_TTL_MS = 60 * 1000; // 60s TTL
const settingCache = new Map();

export function extractAttendancePhotoPath(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/attendance-photos\/([^?]+)/);
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function resolveAttendancePhotoUrls(
  items,
  fields = ['checkin_photo', 'break_start_photo', 'break_end_photo', 'checkout_photo', 'late_photo_url']
) {
  if (!isSupabaseConfigured || !supabase || !Array.isArray(items) || items.length === 0) {
    return items;
  }

  const now = Date.now();
  const pathToSigned = new Map();
  const uncachedPaths = new Set();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    for (const field of fields) {
      const storagePath = extractAttendancePhotoPath(item[field]);
      if (!storagePath) continue;

      const cached = signedPhotoCache.get(storagePath);
      if (cached && now + SIGNED_URL_CACHE_BUFFER_MS < cached.expiresAt) {
        pathToSigned.set(storagePath, cached.url);
      } else {
        uncachedPaths.add(storagePath);
      }
    }
  }

  const pathsList = [...uncachedPaths];
  if (signedPhotoCache.size > 2000) {
    signedPhotoCache.clear();
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < pathsList.length; i += BATCH_SIZE) {
    const batch = pathsList.slice(i, i + BATCH_SIZE);
    try {
      const { data, error } = await supabase.storage
        .from('attendance-photos')
        .createSignedUrls(batch, SIGNED_URL_TTL_SECONDS);

      if (!error && Array.isArray(data)) {
        const expiresAt = now + SIGNED_URL_TTL_SECONDS * 1000;
        for (let idx = 0; idx < data.length; idx++) {
          const entry = data[idx];
          const p = entry?.path || batch[idx];
          if (p && entry?.signedUrl && !entry.error) {
            signedPhotoCache.set(p, { url: entry.signedUrl, expiresAt });
            pathToSigned.set(p, entry.signedUrl);
          }
        }
      }
    } catch (e) {
      console.warn('Signed photo URL batch note:', e.message);
    }
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    for (const field of fields) {
      const storagePath = extractAttendancePhotoPath(item[field]);
      if (storagePath && pathToSigned.has(storagePath)) {
        item[field] = pathToSigned.get(storagePath);
      }
    }
  }

  return items;
}

/**
 * Auto-purge photos older than retentionDays (default 60 days) from Supabase Storage
 * Preserves all database logs, shift records, hours, and active profile/biometric photos.
 */
export async function autoPurgeOldAttendancePhotos(retentionDays = 60, force = false) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, reason: 'Supabase not configured' };
  }

  try {
    const todayYmd = new Date().toISOString().substring(0, 10);
    if (!force) {
      const lastPurge = await cloudDb.getSetting('last_photo_purge_date');
      if (lastPurge === todayYmd) {
        return { success: true, skipped: true, message: 'Auto-purge already executed today' };
      }
    }

    const cutoffMs = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const cutoffDate = new Date(cutoffMs);

    // 1. Collect protected paths (active profile & biometric photos)
    const protectedPaths = new Set();
    try {
      const { data: staffList } = await supabase.from('staff').select('avatar');
      for (const s of staffList || []) {
        if (s.avatar) {
          const p = extractAttendancePhotoPath(s.avatar);
          if (p) protectedPaths.add(p);
        }
      }
      const profiles = (await cloudDb.getSetting('staff_profiles')) || {};
      for (const k of Object.keys(profiles)) {
        if (profiles[k]?.photo_url) {
          const p = extractAttendancePhotoPath(profiles[k].photo_url);
          if (p) protectedPaths.add(p);
        }
      }
      const biometrics = (await cloudDb.getSetting('staff_biometrics')) || {};
      for (const k of Object.keys(biometrics)) {
        if (biometrics[k]?.photo_url) {
          const p = extractAttendancePhotoPath(biometrics[k].photo_url);
          if (p) protectedPaths.add(p);
        }
      }
    } catch (e) {
      console.warn('Protected photos scan note:', e.message);
    }

    // 2. Scan Supabase Storage uploads directory
    let totalPurged = 0;
    let page = 0;
    const PAGE_SIZE = 100;
    let hasMore = true;

    while (hasMore && page < 5) {
      page++;
      const { data: files, error: listError } = await supabase.storage
        .from('attendance-photos')
        .list('uploads', {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (listError || !Array.isArray(files) || files.length === 0) {
        hasMore = false;
        break;
      }

      if (files.length < PAGE_SIZE) {
        hasMore = false;
      }

      const toDelete = [];
      for (const file of files) {
        if (!file.name || file.name === '.emptyFolderPlaceholder') continue;
        const filePath = `uploads/${file.name}`;

        // Never delete active profile or biometric photos
        if (
          protectedPaths.has(filePath) ||
          file.name.startsWith('profile_') ||
          file.name.startsWith('biometric_')
        ) {
          continue;
        }

        // Determine creation time from Supabase metadata or filename timestamp
        let fileTimestamp = file.created_at ? new Date(file.created_at).getTime() : 0;
        if (!fileTimestamp || isNaN(fileTimestamp)) {
          const match = file.name.match(/_(\d{12,14})_/);
          if (match && match[1]) {
            fileTimestamp = Number(match[1]);
          }
        }

        if (fileTimestamp && fileTimestamp < cutoffMs) {
          toDelete.push(filePath);
        }
      }

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.storage
          .from('attendance-photos')
          .remove(toDelete);

        if (delErr) {
          console.warn('Supabase storage remove batch error:', delErr.message);
        } else {
          totalPurged += toDelete.length;
        }
      }
    }

    // Record last run date
    await cloudDb.saveSetting('last_photo_purge_date', todayYmd, 'Tanggal eksekusi auto-purge foto > 60 hari');
    console.log(`[Auto-Purge] Berhasil membersihkan ${totalPurged} foto (> ${retentionDays} hari) dari Supabase Storage. Log database tetap utuh.`);

    return {
      success: true,
      purgedCount: totalPurged,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays
    };
  } catch (err) {
    console.warn('autoPurgeOldAttendancePhotos error:', err.message);
    return { success: false, error: err.message };
  }
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
  async recordCheckin({ staffId, userLat, userLng, accuracy, distance, photoUrl, clientIp, wifiPass, flags, scheduledStart, scheduledEnd, shiftNumber, shiftName, lateReason, latePhotoUrl, moodEmoji, faceRecogStatus, faceRecogSimilarity, faceRecogDistance }) {
    if (!supabase) return null;
    const staff = await findStaffInSupabase(staffId);
    if (!staff) throw new Error('Staff record not found: ' + staffId);

    const checkinTime = new Date().toISOString();
    const shiftDate = getWitaDateYMD(checkinTime);
    const isLate = (flags || []).some(f => String(f).includes('Late') || String(f).includes('LATE'));
    const notesJson = JSON.stringify({
      scheduled_start: scheduledStart || staff.shift_start || '13:00',
      scheduled_end: scheduledEnd || staff.shift_end || '22:00',
      shift_number: shiftNumber != null ? Number(shiftNumber) : null,
      shift_name: shiftName || null,
      mood_emoji: moodEmoji || null,
      late_reason: lateReason || null,
      late_photo_url: latePhotoUrl || null,
      late_status: isLate ? (lateReason ? 'PENDING_REVIEW' : null) : null,
      late_reviewed_by: null,
      late_reviewed_at: null,
      late_manager_note: null,
      face_recog_status: faceRecogStatus || null,
      face_recog_similarity: faceRecogSimilarity != null ? faceRecogSimilarity : null,
      face_recog_distance: faceRecogDistance != null ? faceRecogDistance : null
    });

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert({
        staff_id: staff.id,
        shift_date: shiftDate,
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

    // Fetch the break record to calculate accurate duration strictly from actual break_start
    let calculatedDuration = durationMinutes;
    let targetBreakId = null;
    try {
      const { data: brk } = await supabase
        .from('break_logs')
        .select('*')
        .eq('attendance_id', targetLogId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (brk) {
        targetBreakId = brk.id;
        if (brk.break_start) {
          const startMs = new Date(brk.break_start).getTime();
          const endMs = new Date(endTime).getTime();
          calculatedDuration = Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));
        }
      }
    } catch (e) {
      console.warn('Error fetching break record for duration calculation:', e.message);
    }

    const excess = Math.max(0, (calculatedDuration || 0) - 60);

    const updateQuery = targetBreakId
      ? supabase.from('break_logs').update({
          break_end: endTime,
          break_end_photo_url: photoUrl,
          duration_minutes: calculatedDuration,
          excess_minutes: excess,
          status: 'COMPLETED'
        }).eq('id', targetBreakId)
      : supabase.from('break_logs').update({
          break_end: endTime,
          break_end_photo_url: photoUrl,
          duration_minutes: calculatedDuration,
          excess_minutes: excess,
          status: 'COMPLETED'
        }).eq('attendance_id', targetLogId);

    const { data, error } = await updateQuery.select().maybeSingle();

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

  // 6b. Auto-close shifts that missed checkout past 07:00 WITA cutoff
  async autoCloseCutoffShifts(staffUuid = null) {
    if (!supabase) return [];
    try {
      const now = new Date();
      const currentOpDate = getOperationalDateYMD(now);
      const nowIso = now.toISOString();

      let query = supabase
        .from('attendance_logs')
        .select('id, staff_id, shift_date, check_in_time, status, flags, notes')
        .neq('status', 'COMPLETED');

      if (staffUuid) {
        query = query.eq('staff_id', staffUuid);
      }

      const { data: openLogs, error } = await query;
      if (error) throw error;
      if (!openLogs || openLogs.length === 0) return [];

      const closedIds = [];
      for (const log of openLogs) {
        const checkinTime = log.check_in_time ? new Date(log.check_in_time) : new Date(log.created_at);
        const elapsedHours = (now.getTime() - checkinTime.getTime()) / (1000 * 3600);

        // Condition: Past cutoff if shift_date < currentOpDate AND elapsed >= 8 hours, OR elapsed >= 14 hours
        const isPastCutoff = (log.shift_date && log.shift_date < currentOpDate && elapsedHours >= 8) || (elapsedHours >= 14);

        if (isPastCutoff) {
          let flags = Array.isArray(log.flags)
            ? [...log.flags]
            : (typeof log.flags === 'string' ? JSON.parse(log.flags || '[]') : []);

          if (!flags.includes('FLAG_MISSING_CHECKOUT')) {
            flags.push('FLAG_MISSING_CHECKOUT');
          }

          let parsedNotes = {};
          try {
            if (typeof log.notes === 'string' && log.notes.startsWith('{')) {
              parsedNotes = JSON.parse(log.notes);
            } else if (log.notes) {
              parsedNotes = { legacy_note: log.notes };
            }
          } catch {}
          parsedNotes.auto_closed_reason = 'CUTOFF_07_MISSED_CHECKOUT';
          parsedNotes.auto_closed_note = 'Lupa Check-Out Pulang (Sesi otomatis diakhiri pada cut off 07:00 WITA)';
          parsedNotes.auto_closed_at = nowIso;

          // Default duration to standard shift length (e.g. 8 hours)
          const duration = Math.min(Math.round(elapsedHours * 60), 8 * 60);

          await supabase
            .from('attendance_logs')
            .update({
              status: 'COMPLETED',
              duration_minutes: duration,
              flags,
              notes: JSON.stringify(parsedNotes),
              updated_at: nowIso
            })
            .eq('id', log.id);

          // Close any open break_logs associated with this shift
          try {
            await supabase
              .from('break_logs')
              .update({
                status: 'COMPLETED',
                break_end: new Date(checkinTime.getTime() + 60 * 60 * 1000).toISOString()
              })
              .eq('attendance_id', log.id)
              .eq('status', 'ON_BREAK');
          } catch {}

          closedIds.push(log.id);
        }
      }

      if (closedIds.length > 0) {
        console.log(`[AutoCutoff] Closed ${closedIds.length} open shift(s) past 07:00 WITA cutoff:`, closedIds);
      }
      return closedIds;
    } catch (e) {
      console.warn('Error in cloudDb.autoCloseCutoffShifts:', e.message);
      return [];
    }
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

    const currentMonthKey = new Date().toISOString().substring(0, 7);

    const [
      { data, error },
      profilesMap,
      moodsMap,
      pointsList,
      monthLogsRes,
      allDayAdjustments,
      leavesList
    ] = await Promise.all([
      query,
      this.getStaffProfilesMap().catch(() => ({})),
      this.getStaffMoodsMap().catch(() => ({})),
      this.getStaffPoints().catch(() => ([])),
      supabase
        .from('attendance_logs')
        .select('staff_id, shift_date, flags, notes, status')
        .gte('shift_date', `${currentMonthKey}-01`),
      this.getStaffDayAdjustments(currentMonthKey).catch(() => ([])),
      this.getLeaveRequests().catch(() => ([]))
    ]);
    if (error) throw error;

    const monthlyStatsMap = {};
    for (const row of (monthLogsRes?.data || [])) {
      const sId = String(row.staff_id || '');
      const rDate = row.shift_date || '';
      if (rDate && rDate.startsWith(currentMonthKey)) {
        if (!monthlyStatsMap[sId]) {
          monthlyStatsMap[sId] = { dates: new Set(), lateCount: 0 };
        }
        monthlyStatsMap[sId].dates.add(rDate);

        let parsedNotes = {};
        if (typeof row.notes === 'string' && row.notes.startsWith('{')) {
          try { parsedNotes = JSON.parse(row.notes); } catch {}
        }
        const isLateExcused = parsedNotes.late_status === 'APPROVED' || parsedNotes.late_status === 'CLEARED_BY_MANAGER';

        const fl = Array.isArray(row.flags) ? row.flags : (typeof row.flags === 'string' ? JSON.parse(row.flags || '[]') : []);
        const hasUnexcusedLateFlag = fl.some(f => String(f).toLowerCase().includes('late') && !String(f).includes('EXCUSED'));

        if (!isLateExcused && hasUnexcusedLateFlag) {
          monthlyStatsMap[sId].lateCount++;
        }
      }
    }

    const dayAdjMap = {};
    for (const adj of (allDayAdjustments || [])) {
      const sId = String(adj.staff_id || '');
      dayAdjMap[sId] = (dayAdjMap[sId] || 0) + (Number(adj.adjustment_days) || 0);
    }

    const currentPointCycle = getPointCycleInfo(new Date());
    const pointsMap = {};
    for (const pt of (pointsList || [])) {
      if (pt.status !== 'REVOKED') {
        const ptCycle = pt.created_at ? getPointCycleInfo(pt.created_at) : currentPointCycle;
        // Only count running points in the current active cycle (resets on the 13th of each month)
        if (ptCycle.cycleKey === currentPointCycle.cycleKey) {
          const pts = Math.abs(Number(pt.points) || 0);
          const isPlus = pt.point_type === 'PLUS' || pt.type === 'PLUS';
          const delta = isPlus ? pts : -pts;
          const sId = String(pt.staff_id || pt.staffId || pt.staff_uuid || '');
          if (sId) {
            pointsMap[sId] = (pointsMap[sId] || 0) + delta;
          }
          if (pt.staff_uuid && String(pt.staff_uuid) !== sId) {
            const uId = String(pt.staff_uuid);
            pointsMap[uId] = (pointsMap[uId] || 0) + delta;
          }
        }
      }
    }

    const leaveDaysMap = {};
    const leaveCountMap = {};
    for (const lv of (leavesList || [])) {
      const sDate = lv.start_date || '';
      const eDate = lv.end_date || sDate;
      if (sDate.startsWith(currentMonthKey) || eDate.startsWith(currentMonthKey)) {
        const days = Number(lv.approved_days || lv.requested_days || 1) || 1;
        const sId = String(lv.staff_id || lv.staff_uuid || '');
        if (sId) {
          leaveDaysMap[sId] = (leaveDaysMap[sId] || 0) + days;
          leaveCountMap[sId] = (leaveCountMap[sId] || 0) + 1;
        }
        if (lv.staff_name) {
          leaveDaysMap[lv.staff_name] = (leaveDaysMap[lv.staff_name] || 0) + days;
          leaveCountMap[lv.staff_name] = (leaveCountMap[lv.staff_name] || 0) + 1;
        }
      }
    }

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

      const shiftDateYmd = row.shift_date || (row.check_in_time ? getWitaDateYMD(row.check_in_time) : '');
      const staffCode = st.legacy_code || st.id || row.staff_id;
      const staffUuid = st.id || row.staff_id;
      const profileEntry = profilesMap?.[staffUuid] || profilesMap?.[staffCode] || null;
      const moodEntry = moodsMap?.[staffUuid] || moodsMap?.[staffCode] || null;
      const resolvedMoodEmoji =
        parsedNotes.mood_emoji ||
        (moodEntry && moodEntry.date_ymd === shiftDateYmd ? moodEntry.emoji : null) ||
        null;

      const actualDays = monthlyStatsMap[staffUuid]?.dates?.size || monthlyStatsMap[staffCode]?.dates?.size || 0;
      const manualDays = dayAdjMap[staffUuid] || dayAdjMap[staffCode] || 0;
      const monthlyDays = Math.max(0, actualDays + manualDays);
      const monthlyLate = monthlyStatsMap[staffUuid]?.lateCount || monthlyStatsMap[staffCode]?.lateCount || 0;
      const activePts = pointsMap[staffUuid] ?? pointsMap[staffCode] ?? 0;
      const monthlyLeaveDays = leaveDaysMap[staffUuid] || leaveDaysMap[staffCode] || leaveDaysMap[st.name] || 0;
      const monthlyLeaveCount = leaveCountMap[staffUuid] || leaveCountMap[staffCode] || leaveCountMap[st.name] || 0;

      return {
        id: row.id,
        supabase_id: row.id,
        staff_id: staffCode,
        staff_uuid: staffUuid,
        staff_name: st.name || 'Staff',
        staff_profile_photo_url: profileEntry?.photo_url || null,
        mood_emoji: resolvedMoodEmoji,
        monthly_work_days: monthlyDays,
        monthly_late_count: monthlyLate,
        monthly_leave_days: monthlyLeaveDays,
        monthly_leave_count: monthlyLeaveCount,
        active_points_total: activePts,
        early_checkout_authorized: Boolean(
          parsedNotes.early_checkout_authorized ||
          parsedFlags.includes('FLAG_EARLY_CHECKOUT_AUTHORIZED')
        ),
        staff_venue: st.venue || 'JP Karaoke',
        staff_division: st.division || st.role || 'Server and Cashier',
        staff_role: st.role || 'Staff',
        staff_department: st.department || 'Operations',
        standard_hours: st.standard_hours || 8.5,
        date: shiftDateYmd,
        scheduled_start: parsedNotes.scheduled_start || st.shift_start || '13:00',
        scheduled_end: parsedNotes.scheduled_end || st.shift_end || '22:00',
        shift_number: parsedNotes.shift_number != null ? Number(parsedNotes.shift_number) : null,
        shift_name: parsedNotes.shift_name || null,
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
        break_duration_minutes: (brk?.break_start && brk?.break_end)
          ? Math.max(0, Math.round((new Date(brk.break_end).getTime() - new Date(brk.break_start).getTime()) / (1000 * 60)))
          : (brk?.duration_minutes || null),
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
        late_reason: parsedNotes.late_reason || null,
        late_photo_url: parsedNotes.late_photo_url || null,
        late_status: parsedNotes.late_status || null,
        late_reviewed_by: parsedNotes.late_reviewed_by || null,
        late_reviewed_at: parsedNotes.late_reviewed_at || null,
        late_manager_note: parsedNotes.late_manager_note || null,
        face_recog_status: parsedNotes.face_recog_status || null,
        face_recog_similarity: parsedNotes.face_recog_similarity != null ? Number(parsedNotes.face_recog_similarity) : null,
        face_recog_distance: parsedNotes.face_recog_distance != null ? Number(parsedNotes.face_recog_distance) : null,
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

    await resolveAttendancePhotoUrls(formatted, [
      'checkin_photo',
      'break_start_photo',
      'break_end_photo',
      'checkout_photo',
      'late_photo_url',
      'staff_profile_photo_url'
    ]);

    return formatted;
  },

  // 8. Get KPI Stats from Cloud
  async getStats() {
    if (!supabase) return null;
    const todayStr = getOperationalDateYMD(new Date());

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
    let outsideGeofenceCount = 0;

    for (const s of list) {
      const flags = Array.isArray(s.flags) ? s.flags : (typeof s.flags === 'string' ? JSON.parse(s.flags || '[]') : []);
      totalFlags += flags.length;
      if (flags.includes('FLAG_OUTSIDE_GEOFENCE')) {
        outsideGeofenceCount++;
      }
    }

    const gpsComplianceRate = list.length > 0 ? Math.round(((list.length - outsideGeofenceCount) / list.length) * 100) : 100;

    return {
      todayDate: todayStr,
      totalToday: list.length,
      activeShifts: activeCount,
      onBreakShifts: onBreakCount,
      completedShifts: completedCount,
      flaggedAnomalies: totalFlags,
      gpsComplianceRate,
      wifiComplianceRate: gpsComplianceRate
    };
  },

  async wipeLeaderboardData({ scope = 'all', targetMonth = null } = {}) {
    if (!supabase) return { attendanceDeleted: 0, toiletDeleted: 0 };

    let attendanceDeleted = 0;
    let toiletDeleted = 0;
    let leavesDeleted = 0;
    let pointsDeleted = 0;

    // 1. Wipe Attendance & Break Logs (Supabase Cloud)
    if (scope === 'attendance' || scope === 'all' || scope === 'master_reset') {
      try {
        const todayYmd = new Date().toISOString().slice(0, 10);
        // Delete child break logs first (< today)
        let breakQuery = supabase.from('break_logs').delete();
        if (targetMonth && /^\d{4}-\d{2}$/.test(targetMonth)) {
          breakQuery = breakQuery.gte('created_at', `${targetMonth}-01T00:00:00Z`).lte('created_at', `${targetMonth}-31T23:59:59Z`);
        } else {
          breakQuery = breakQuery.lt('created_at', `${todayYmd}T00:00:00Z`);
        }
        await breakQuery;

        // Delete parent attendance logs (< today, preserving today's active ongoing shifts)
        let attQuery = supabase.from('attendance_logs').delete();
        if (targetMonth && /^\d{4}-\d{2}$/.test(targetMonth)) {
          attQuery = attQuery.gte('shift_date', `${targetMonth}-01`).lte('shift_date', `${targetMonth}-31`);
        } else {
          attQuery = attQuery.lt('shift_date', todayYmd);
        }
        const { error: attErr } = await attQuery;
        if (attErr) throw attErr;
        attendanceDeleted = 1;
      } catch (err) {
        console.error('Error wiping attendance logs from Supabase:', err);
        throw err;
      }
    }

    // 2. Wipe Toilet Inspections if scope is 'toilet' or 'all' or 'master_reset'
    if (scope === 'toilet' || scope === 'all' || scope === 'master_reset') {
      try {
        const TOILET_SUPABASE_URL = 'https://nrrhkylpgitezjocgune.supabase.co';
        const TOILET_SUPABASE_ANON_KEY = 'sb_publishable_GRzOFx-NzqaaBPCl3Oqr2A_1f8xpUNj';
        const toiletClient = createClient(TOILET_SUPABASE_URL, TOILET_SUPABASE_ANON_KEY, {
          auth: { persistSession: false }
        });

        let toiletQuery = toiletClient.from('inspections').delete();
        if (targetMonth && /^\d{4}-\d{2}$/.test(targetMonth)) {
          toiletQuery = toiletQuery.gte('created_at', `${targetMonth}-01T00:00:00Z`).lte('created_at', `${targetMonth}-31T23:59:59Z`);
        } else {
          toiletQuery = toiletQuery.not('id', 'is', null);
        }
        const { error: tErr } = await toiletQuery;
        if (tErr) {
          console.warn('Toilet inspection wipe note:', tErr.message);
        } else {
          toiletDeleted = 1;
        }

        // Reset last_inspected status on restroom_locations
        try {
          await toiletClient
            .from('restroom_locations')
            .update({ last_inspected_at: null, last_inspected_by: null, last_status: null })
            .not('id', 'is', null);
        } catch (locErr) {
          console.warn('Toilet locations status reset note:', locErr.message);
        }
      } catch (err) {
        console.warn('Error wiping toilet inspections:', err.message);
      }
    }

    // 3. Clear daily mood emojis only (Points and Leave Requests are safely PRESERVED per Master Reset specification)
    if (scope === 'all' || scope === 'master_reset') {
      try {
        await this.saveSetting('staff_moods', {}, 'Daily Staff Mood Emojis');
      } catch (err) {
        console.warn('Failed to wipe staff_moods in Supabase:', err.message);
      }
    }

    return {
      success: true,
      scope,
      attendanceDeleted,
      toiletDeleted,
      leavesDeleted,
      pointsDeleted
    };
  },

  async reviewLateCheckin({ shiftId, action, managerNotes, reviewerName }) {
    if (!supabase) return null;
    const { data: log, error: fetchErr } = await supabase
      .from('attendance_logs')
      .select('id, flags, notes')
      .eq('id', shiftId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!log) throw new Error('Shift record not found: ' + shiftId);

    let parsedNotes = {};
    try {
      if (typeof log.notes === 'string') parsedNotes = JSON.parse(log.notes);
      else if (log.notes) parsedNotes = log.notes;
    } catch {}

    let parsedFlags = Array.isArray(log.flags)
      ? [...log.flags]
      : (typeof log.flags === 'string' ? JSON.parse(log.flags || '[]') : []);

    const now = new Date().toISOString();
    parsedNotes.late_status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    parsedNotes.late_reviewed_by = reviewerName || 'Management';
    parsedNotes.late_reviewed_at = now;
    parsedNotes.late_manager_note = managerNotes || null;

    if (action === 'APPROVE') {
      parsedFlags = parsedFlags.map(f => {
        if (String(f).includes('Late') || String(f).includes('LATE')) {
          return 'FLAG_LATE_EXCUSED';
        }
        return f;
      });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('attendance_logs')
      .update({
        notes: JSON.stringify(parsedNotes),
        flags: parsedFlags,
        updated_at: now
      })
      .eq('id', shiftId)
      .select()
      .maybeSingle();

    if (updateErr) throw updateErr;
    return updated;
  },

  async deleteShift(shiftId) {
    if (!supabase) return null;
    const { error } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('id', shiftId);
    if (error) throw error;
    return true;
  },

  async clearShiftLateness({ shiftId, reviewerName, reason }) {
    if (!supabase) return null;
    const { data: log, error: fetchErr } = await supabase
      .from('attendance_logs')
      .select('id, flags, notes')
      .eq('id', shiftId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!log) throw new Error('Shift record not found: ' + shiftId);

    let parsedNotes = {};
    try {
      if (typeof log.notes === 'string') parsedNotes = JSON.parse(log.notes);
      else if (log.notes) parsedNotes = log.notes;
    } catch {}

    let parsedFlags = Array.isArray(log.flags)
      ? [...log.flags]
      : (typeof log.flags === 'string' ? JSON.parse(log.flags || '[]') : []);

    // Filter out all late-related flags
    parsedFlags = parsedFlags.filter(f => !String(f).toLowerCase().includes('late'));
    const now = new Date().toISOString();
    parsedNotes.late_status = 'CLEARED_BY_MANAGER';
    parsedNotes.late_reason = null;
    parsedNotes.late_manager_note = reason || 'Keterlambatan dihapus/dibatalkan oleh Manajer';
    parsedNotes.late_reviewed_by = reviewerName || 'Management';
    parsedNotes.late_reviewed_at = now;

    const { data: updated, error: updateErr } = await supabase
      .from('attendance_logs')
      .update({
        notes: JSON.stringify(parsedNotes),
        flags: parsedFlags,
        updated_at: now
      })
      .eq('id', shiftId)
      .select()
      .maybeSingle();

    if (updateErr) throw updateErr;
    return updated;
  },

  async authorizeEarlyCheckout({ shiftId, reviewerName, reason }) {
    if (!supabase) return null;
    const { data: log, error: fetchErr } = await supabase
      .from('attendance_logs')
      .select('id, staff_id, flags, notes')
      .eq('id', shiftId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!log) throw new Error('Shift record not found: ' + shiftId);

    let parsedNotes = {};
    try {
      if (typeof log.notes === 'string') parsedNotes = JSON.parse(log.notes);
      else if (log.notes) parsedNotes = log.notes;
    } catch {}

    let parsedFlags = Array.isArray(log.flags)
      ? [...log.flags]
      : (typeof log.flags === 'string' ? JSON.parse(log.flags || '[]') : []);

    if (!parsedFlags.includes('FLAG_EARLY_CHECKOUT_AUTHORIZED')) {
      parsedFlags.push('FLAG_EARLY_CHECKOUT_AUTHORIZED');
    }

    const now = new Date().toISOString();
    parsedNotes.early_checkout_authorized = true;
    parsedNotes.early_checkout_authorized_by = reviewerName || 'Manajer';
    parsedNotes.early_checkout_authorized_at = now;
    parsedNotes.early_checkout_reason = reason || 'Diizinkan pulang lebih awal oleh Manajer';

    const { data: updated, error: updateErr } = await supabase
      .from('attendance_logs')
      .update({
        notes: JSON.stringify(parsedNotes),
        flags: parsedFlags,
        updated_at: now
      })
      .eq('id', shiftId)
      .select()
      .maybeSingle();

    if (updateErr) throw updateErr;

    // Log to staff audit trail
    try {
      await this.logStaffAudit({
        staffId: log.staff_id,
        action: 'EARLY_CHECKOUT_AUTHORIZED',
        description: 'Manajer memberikan otorisasi buka kunci pulang (checkout) lebih awal untuk shift ini.',
        reason: reason || 'Diizinkan pulang lebih awal oleh Manajer',
        actor: reviewerName || 'Manajer'
      });
    } catch (e) {
      console.warn('Audit log for early checkout note:', e.message);
    }

    return updated;
  },

  async getLeaveRequests({ staffId, status, type, year } = {}) {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'leave_requests')
        .maybeSingle();

      if (error) throw error;
      let list = Array.isArray(data?.value) ? data.value : [];

      if (staffId && staffId !== 'ALL') {
        list = list.filter(r => String(r.staff_id) === String(staffId));
      }
      if (status && status !== 'ALL') {
        list = list.filter(r => r.status === status);
      }
      if (type && type !== 'ALL') {
        list = list.filter(r => r.type === type);
      }
      if (year) {
        list = list.filter(r => Number(r.year) === Number(year));
      }

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      await resolveAttendancePhotoUrls(list, ['photo_url', 'document_url']);
      return list;
    } catch (e) {
      console.warn('Failed to fetch leave requests:', e.message);
      return [];
    }
  },

  async saveLeaveRequest(newRequest) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'leave_requests')
      .maybeSingle();

    const list = Array.isArray(data?.value) ? data.value : [];
    const updatedList = [newRequest, ...list];

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'leave_requests',
        value: updatedList,
        description: 'Staff Leave and Permission Requests',
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return newRequest;
  },

  async reviewLeaveRequest(id, { action, approvedDays, approvedStartDate, approvedEndDate, managerNotes, reviewerName }) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'leave_requests')
      .maybeSingle();

    const list = Array.isArray(data?.value) ? data.value : [];
    const index = list.findIndex(r => String(r.id) === String(id));
    if (index === -1) throw new Error('Pengajuan tidak ditemukan: ' + id);

    const now = new Date().toISOString();
    const item = { ...list[index] };

    if (action === 'APPROVE') {
      item.status = 'APPROVED';
      item.approved_days = item.requested_days;
      item.approved_start_date = item.start_date;
      item.approved_end_date = item.end_date;
    } else if (action === 'ADJUST') {
      item.status = 'ADJUSTED';
      item.approved_days = approvedDays != null ? Number(approvedDays) : item.requested_days;
      item.approved_start_date = approvedStartDate || item.start_date;
      item.approved_end_date = approvedEndDate || item.end_date;
    } else if (action === 'REJECT') {
      item.status = 'REJECTED';
    }

    item.manager_notes = managerNotes || null;
    item.reviewed_by = reviewerName || 'Management';
    item.reviewed_at = now;
    item.updated_at = now;

    list[index] = item;

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'leave_requests',
        value: list,
        description: 'Staff Leave and Permission Requests',
        updated_at: now
      });

    if (error) throw error;
    return item;
  },

  async deleteLeaveRequest(id) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'leave_requests')
      .maybeSingle();

    const list = Array.isArray(data?.value) ? data.value : [];
    const deletedItem = list.find(r => String(r.id) === String(id));
    const filtered = list.filter(r => String(r.id) !== String(id));

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'leave_requests',
        value: filtered,
        description: 'Staff Leave and Permission Requests',
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return deletedItem;
  },

  async getStaffLeaveBalance(staffId, year = new Date().getFullYear()) {
    const list = await this.getLeaveRequests({ staffId, type: 'CUTI', year });
    const approvedRequests = list.filter(r => r.status === 'APPROVED' || r.status === 'ADJUSTED');
    const usedDays = approvedRequests.reduce((sum, r) => sum + (r.approved_days || r.requested_days || 0), 0);
    const maxQuota = 12;
    const remainingDays = Math.max(0, maxQuota - usedDays);

    return {
      staffId,
      year: Number(year),
      maxQuota,
      usedDays,
      remainingDays
    };
  },

  // 12. Management Announcements & Read Receipts
  async getAnnouncements() {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'management_announcements')
        .maybeSingle();
      return Array.isArray(data?.value) ? data.value : [];
    } catch (e) {
      console.warn('Failed to fetch announcements from Supabase:', e.message);
      return [];
    }
  },

  async saveAnnouncement(announcement) {
    if (!supabase) return announcement;
    const list = await this.getAnnouncements();
    const existingIdx = list.findIndex(a => a.id === announcement.id);
    let updatedList;
    if (existingIdx >= 0) {
      updatedList = [...list];
      updatedList[existingIdx] = { ...updatedList[existingIdx], ...announcement, updated_at: new Date().toISOString() };
    } else {
      updatedList = [announcement, ...list];
    }

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'management_announcements',
        value: updatedList,
        description: 'Official Management Announcements',
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    return announcement;
  },

  async getAnnouncementReads() {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'management_announcement_reads')
        .maybeSingle();
      return Array.isArray(data?.value) ? data.value : [];
    } catch (e) {
      console.warn('Failed to fetch announcement reads from Supabase:', e.message);
      return [];
    }
  },

  async recordAnnouncementRead({ announcementId, staffId, staffName, staffVenue, staffDivision }) {
    if (!supabase) return null;
    const reads = await this.getAnnouncementReads();
    const cleanAnnId = String(announcementId || '').trim();
    const cleanStaffId = String(staffId || '').trim();
    const cleanName = String(staffName || '').trim();

    const existing = reads.find(r =>
      String(r.announcement_id) === cleanAnnId &&
      (
        (cleanStaffId && String(r.staff_id || '').toLowerCase() === cleanStaffId.toLowerCase()) ||
        (cleanName && String(r.staff_name || '').toLowerCase() === cleanName.toLowerCase())
      )
    );
    if (existing) return existing;

    const newRecord = {
      id: `read_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      announcement_id: cleanAnnId,
      staff_id: cleanStaffId || 'staff',
      staff_name: cleanName || 'Staff',
      staff_venue: staffVenue || 'JP Karaoke',
      staff_division: staffDivision || 'Staff',
      read_at: new Date().toISOString()
    };

    const updatedList = [newRecord, ...reads];
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'management_announcement_reads',
        value: updatedList,
        description: 'Staff Read Receipts for Management Announcements',
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    return newRecord;
  },

  async getSetting(key) {
    if (!supabase) return null;
    const canonicalKey = getCanonicalSettingKey(key);
    const now = Date.now();
    const cached = settingCache.get(canonicalKey) || settingCache.get(key);
    if (cached && now < cached.expiresAt) {
      return cached.value;
    }
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', canonicalKey)
        .maybeSingle();

      if (!error && data?.value !== undefined && data?.value !== null) {
        const val = data.value;
        settingCache.set(canonicalKey, { value: val, expiresAt: now + SETTING_CACHE_TTL_MS });
        settingCache.set(key, { value: val, expiresAt: now + SETTING_CACHE_TTL_MS });
        return val;
      }

      // If alias was used and returned null, fallback to literal key
      if (canonicalKey !== key) {
        const { data: origData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', key)
          .maybeSingle();
        if (origData?.value !== undefined && origData?.value !== null) {
          settingCache.set(key, { value: origData.value, expiresAt: now + SETTING_CACHE_TTL_MS });
          return origData.value;
        }
      }

      settingCache.set(key, { value: null, expiresAt: now + SETTING_CACHE_TTL_MS });
      return null;
    } catch (e) {
      return null;
    }
  },

  async saveSetting(key, value, description = '') {
    if (!supabase) return null;
    const canonicalKey = getCanonicalSettingKey(key);
    settingCache.set(key, { value, expiresAt: Date.now() + SETTING_CACHE_TTL_MS });
    settingCache.set(canonicalKey, { value, expiresAt: Date.now() + SETTING_CACHE_TTL_MS });

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: canonicalKey,
          value,
          description: description || `Setting for ${canonicalKey}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      if (error) throw error;

      // Dual-write legacy aliases to guarantee backward compatibility
      if (canonicalKey === 'staff_themes_map' || key === 'staff_themes') {
        await supabase.from('app_settings').upsert({
          key: 'staff_themes',
          value,
          description: 'Staff Dashboard Theme Preferences',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }).catch(() => {});
      } else if (canonicalKey === 'staff_bios_map' || key === 'staff_bios') {
        await supabase.from('app_settings').upsert({
          key: 'staff_bios',
          value,
          description: 'Staff Bio Descriptions',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }).catch(() => {});
      }

      return value;
    } catch (e) {
      console.warn(`Failed to save setting ${key} to Supabase:`, e.message);
      return null;
    }
  },

  // 13. Staff Violation Points System (17th -> 13th monthly cutoff cycle)
  async getStaffPoints() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'staff_points')
        .maybeSingle();
      if (error) throw error;
      const list = Array.isArray(data?.value) ? data.value : [];
      let fixed = false;
      const repaired = list.map(item => {
        const isWhistleblower = (item.reason && item.reason.includes('[Apresiasi Whistleblower]')) ||
                                (item.cycle_label && item.cycle_label.includes('Apresiasi'));
        if (isWhistleblower && (item.point_type !== 'PLUS' || item.type !== 'PLUS')) {
          fixed = true;
          return {
            ...item,
            point_type: 'PLUS',
            type: 'PLUS',
            points: Math.abs(Number(item.points) || 0)
          };
        }
        return item;
      });
      if (fixed) {
        supabase.from('app_settings').upsert({
          key: 'staff_points',
          value: repaired,
          description: 'Staff Violation Points Log & Acknowledgments',
          updated_at: new Date().toISOString()
        }).then(() => console.log('Successfully repaired whistleblower reward points to PLUS!')).catch(() => {});
      }
      return [...repaired].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (e) {
      console.warn('Failed to fetch staff points from Supabase:', e.message);
      return [];
    }
  },

  async createStaffPoints(pointRecords) {
    const records = Array.isArray(pointRecords) ? pointRecords : [pointRecords];
    if (!supabase || records.length === 0) return records;
    const list = await this.getStaffPoints();
    const updatedList = [...records, ...list];
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'staff_points',
        value: updatedList,
        description: 'Staff Violation Points Log & Acknowledgments',
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    settingCache.set('staff_points', { value: updatedList, expiresAt: Date.now() + SETTING_CACHE_TTL_MS });
    return records;
  },

  async createStaffPoint(pointRecord) {
    await this.createStaffPoints([pointRecord]);
    return pointRecord;
  },

  async acknowledgeStaffPoint(pointId, { staffId, staffUuid, staffName, agreedPledge }) {
    if (!supabase) return null;
    const list = await this.getStaffPoints();
    const index = list.findIndex((p) => String(p.id) === String(pointId));
    if (index === -1) return null;

    const item = { ...list[index] };
    // Verify staff ownership if IDs are provided
    const ids = new Set([staffId, staffUuid].filter(Boolean).map(String));
    const itemIds = [item.staff_id, item.staff_uuid].filter(Boolean).map(String);
    if (ids.size > 0 && itemIds.length > 0 && !itemIds.some((id) => ids.has(id))) {
      throw new Error('Poin ini bukan milik akun staff tersebut.');
    }

    const now = new Date().toISOString();
    item.status = 'ACKNOWLEDGED';
    item.agreed_pledge = agreedPledge;
    item.acknowledged_at = item.acknowledged_at || now;
    item.acknowledged_by = item.acknowledged_by || staffName || item.staff_name;
    item.updated_at = now;

    list[index] = item;

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'staff_points',
        value: list,
        description: 'Staff Violation Points Log & Acknowledgments',
        updated_at: now
      });
    if (error) throw error;
    settingCache.set('staff_points', { value: list, expiresAt: Date.now() + SETTING_CACHE_TTL_MS });
    return item;
  },

  async deleteStaffPoint(pointId) {
    if (!supabase) return false;
    const list = await this.getStaffPoints();
    const deletedItem = list.find((p) => String(p.id) === String(pointId));
    const filtered = list.filter((p) => String(p.id) !== String(pointId));
    if (filtered.length === list.length) return false;
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'staff_points',
        value: filtered,
        description: 'Staff Violation Points Log & Acknowledgments',
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    settingCache.set('staff_points', { value: filtered, expiresAt: Date.now() + SETTING_CACHE_TTL_MS });
    return deletedItem || true;
  },

  // 14. Custom Staff Profile Photos (Gallery photo only) & Daily Emoji Mood
  async getStaffProfilesMap() {
    if (!supabase) return {};
    try {
      const val = await this.getSetting('staff_profiles');
      return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
    } catch {
      return {};
    }
  },

  async getStaffBiometricsMap(bypassCache = false) {
    if (!supabase) return {};
    try {
      if (!bypassCache) {
        const val = await this.getSetting('staff_biometrics');
        if (val && typeof val === 'object' && !Array.isArray(val)) return val;
      }
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'staff_biometrics')
        .maybeSingle();
      const val = data?.value;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        settingCache.set('staff_biometrics', { value: val, expiresAt: Date.now() + 10000 });
        return val;
      }
      return {};
    } catch {
      return {};
    }
  },

  async saveStaffBiometricPhoto({ staffId, staffUuid, legacyCode, photoUrl, livenessVerified = true }) {
    if (!supabase || !photoUrl) return null;
    let current = {};
    let curProf = {};

    try {
      const [bioRes, profRes] = await Promise.allSettled([
        supabase.from('app_settings').select('value').eq('key', 'staff_biometrics').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'staff_profiles').maybeSingle()
      ]);
      if (bioRes.status === 'fulfilled' && bioRes.value?.data?.value && typeof bioRes.value.data.value === 'object' && !Array.isArray(bioRes.value.data.value)) {
        current = bioRes.value.data.value;
      }
      if (profRes.status === 'fulfilled' && profRes.value?.data?.value && typeof profRes.value.data.value === 'object' && !Array.isArray(profRes.value.data.value)) {
        curProf = profRes.value.data.value;
      }
    } catch {}

    const now = new Date().toISOString();
    const record = { photo_url: photoUrl, liveness_verified: livenessVerified, updated_at: now };
    const next = { ...current };
    const nextProf = { ...curProf };

    const keysToBind = new Set([
      staffUuid,
      staffId,
      legacyCode,
      staffUuid ? String(staffUuid).toUpperCase() : null,
      staffId ? String(staffId).toUpperCase() : null,
      legacyCode ? String(legacyCode).toUpperCase() : null
    ].filter(Boolean).map(String));

    for (const k of keysToBind) {
      next[k] = record;
      nextProf[k] = record;
    }

    try {
      await Promise.allSettled([
        this.saveSetting('staff_biometrics', next, 'Official Staff Biometric Face Reference'),
        this.saveSetting('staff_profiles', nextProf, 'Custom Staff Profile Photos')
      ]);
    } catch (e) {
      console.warn('saveStaffBiometricPhoto parallel save note:', e.message);
    }

    return record;
  },

  async syncStaffToSqlite(localDb) {
    if (!supabase || !localDb) return false;
    try {
      const { data: supaStaff, error } = await supabase
        .from('staff')
        .select('*');
      if (error || !Array.isArray(supaStaff) || supaStaff.length === 0) return false;

      const stmt = localDb.prepare(`
        INSERT OR REPLACE INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active, uuid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of supaStaff) {
        stmt.run(
          s.legacy_code || s.id,
          s.name,
          s.venue,
          s.division,
          s.role,
          s.department || s.division,
          s.pin,
          s.shift_start || '13:00',
          s.shift_end || '22:00',
          s.standard_hours || 8.5,
          s.is_active ? 1 : 0,
          s.id
        );
      }
      // Keep toilet database in sync automatically
      this.syncStaffToToiletDb(localDb).catch((e) => console.warn('Background toilet staff sync note:', e.message));
      return true;
    } catch (e) {
      console.warn('syncStaffToSqlite note:', e.message);
      return false;
    }
  },

  async saveStaffProfilePhoto({ staffId, staffUuid, photoUrl }) {
    if (!supabase || !photoUrl) return null;
    const current = await this.getStaffProfilesMap();
    const now = new Date().toISOString();
    const record = { photo_url: photoUrl, updated_at: now };
    const next = { ...current };
    if (staffUuid) next[String(staffUuid)] = record;
    if (staffId) next[String(staffId)] = record;
    await this.saveSetting('staff_profiles', next, 'Custom Staff Profile Photos');
    return record;
  },

  async getStaffMoodsMap() {
    if (!supabase) return {};
    try {
      const val = await this.getSetting('staff_moods');
      return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
    } catch {
      return {};
    }
  },

  async saveStaffMood({ staffId, staffUuid, emoji, dateYmd }) {
    if (!supabase || !emoji) return null;
    const current = await this.getStaffMoodsMap();
    const now = new Date().toISOString();
    const record = { emoji, date_ymd: dateYmd, updated_at: now };
    const next = { ...current };
    if (staffUuid) next[String(staffUuid)] = record;
    if (staffId) next[String(staffId)] = record;
    await this.saveSetting('staff_moods', next, 'Daily Staff Mood Emojis');

    // Sync today's active shift notes if already checked in today
    if (staffUuid && dateYmd) {
      try {
        const { data: openLog } = await supabase
          .from('attendance_logs')
          .select('id, notes')
          .eq('staff_id', staffUuid)
          .eq('shift_date', dateYmd)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openLog) {
          let parsedNotes = {};
          try {
            if (typeof openLog.notes === 'string' && openLog.notes.startsWith('{')) {
              parsedNotes = JSON.parse(openLog.notes);
            }
          } catch {}
          parsedNotes.mood_emoji = emoji;
          await supabase
            .from('attendance_logs')
            .update({ notes: JSON.stringify(parsedNotes), updated_at: now })
            .eq('id', openLog.id);
        }
      } catch (e) {
        console.warn('Mood sync to attendance_logs note:', e.message);
      }
    }

    return record;
  },

  async getStaffThemesMap() {
    if (!supabase) return {};
    try {
      const val = (await this.getSetting('staff_themes_map')) || (await this.getSetting('staff_themes'));
      return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
    } catch {
      return {};
    }
  },

  async saveStaffTheme({ staffId, staffUuid, staffName, themeId }) {
    if (!supabase || !themeId) return null;
    const current = await this.getStaffThemesMap();
    const next = { ...current };
    if (staffId) next[String(staffId)] = themeId;
    if (staffUuid) next[String(staffUuid)] = themeId;
    if (staffName) next[String(staffName).toLowerCase()] = themeId;
    await this.saveSetting('staff_themes_map', next, 'Staff Dashboard Theme Preferences');
    await this.saveSetting('staff_themes', next, 'Staff Dashboard Theme Preferences');
    return next;
  },

  async getStaffMonthlyStats(staffUuid, yearMonthStr) {
    if (!supabase || !staffUuid || !yearMonthStr) return null;
    try {
      const [yrStr, moStr] = String(yearMonthStr).split('-');
      const lastDay = new Date(Date.UTC(Number(yrStr), Number(moStr), 0)).getUTCDate();
      const startDate = `${yearMonthStr}-01`;
      const endDate = `${yearMonthStr}-${String(lastDay).padStart(2, '0')}`;
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select('shift_date, status, flags, notes')
        .eq('staff_id', staffUuid)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate);
      if (error) throw error;

      const workDates = new Set();
      let lateCount = 0;

      for (const row of logs || []) {
        if (row.shift_date) workDates.add(row.shift_date);

        let flags = [];
        if (Array.isArray(row.flags)) {
          flags = row.flags;
        } else if (typeof row.flags === 'string') {
          try { flags = JSON.parse(row.flags || '[]'); } catch {}
        }

        let parsedNotes = {};
        if (typeof row.notes === 'string' && row.notes.startsWith('{')) {
          try { parsedNotes = JSON.parse(row.notes); } catch {}
        }

        const isLate = flags.some((f) => String(f).toLowerCase().includes('late'));
        if (isLate && parsedNotes.late_status !== 'EXCUSED') {
          lateCount += 1;
        }
      }

      return {
        workDays: workDates.size,
        lateCount,
        monthKey: yearMonthStr
      };
    } catch (e) {
      console.warn('Monthly stats Supabase fetch note:', e.message);
      return null;
    }
  },

  // 17. Sync Staff Roster to Toilet Inspection Database
  async syncStaffToToiletDb(localDb = null) {
    try {
      const TOILET_SUPABASE_URL = 'https://nrrhkylpgitezjocgune.supabase.co';
      const TOILET_SUPABASE_ANON_KEY = 'sb_publishable_GRzOFx-NzqaaBPCl3Oqr2A_1f8xpUNj';
      const toiletClient = createClient(TOILET_SUPABASE_URL, TOILET_SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });

      let mainStaff = [];
      if (supabase) {
        const { data, error: mainErr } = await supabase
          .from('staff')
          .select('*')
          .order('name', { ascending: true });
        if (!mainErr && data && data.length > 0) {
          mainStaff = data;
        }
      }

      if (mainStaff.length === 0 && localDb) {
        try {
          mainStaff = localDb.prepare('SELECT * FROM staff ORDER BY name ASC').all();
        } catch {}
      }

      if (mainStaff.length === 0) return false;

      const { data: toiletStaff } = await toiletClient
        .from('staff_members')
        .select('*');

      const existingByName = new Map();
      for (const ts of (toiletStaff || [])) {
        existingByName.set(ts.name.trim().toLowerCase(), ts);
      }

      const upserts = [];
      for (const ms of mainStaff) {
        const key = ms.name.trim().toLowerCase();
        const existing = existingByName.get(key);
        const id = existing ? existing.id : `staff-${ms.legacy_code || ms.id}`;
        const roleStr = `${ms.venue || ''} - ${ms.role || ms.division || 'Server'}`.trim();
        upserts.push({
          id,
          name: ms.name.trim(),
          pin: ms.pin || '1234',
          role: roleStr,
          is_active: ms.is_active !== false && ms.is_active !== 0
        });
      }

      await toiletClient.from('staff_members').upsert(upserts, { onConflict: 'id' });
      return true;
    } catch (err) {
      console.warn('Auto toilet staff sync error:', err.message);
      return false;
    }
  },

  // 18. Manual Working Day Adjustments (Manager Override)
  async getStaffDayAdjustments(targetMonthStr = null) {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'staff_day_adjustments')
        .maybeSingle();

      const list = Array.isArray(data?.value) ? data.value : [];
      if (!targetMonthStr) return list;
      return list.filter(item => {
        if (!item.created_at) return true;
        return item.created_at.startsWith(targetMonthStr);
      });
    } catch (e) {
      console.warn('Failed to fetch staff_day_adjustments:', e.message);
      return [];
    }
  },

  async saveStaffDayAdjustment(adjustment) {
    if (!supabase) return null;
    const now = new Date().toISOString();
    const newAdj = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      staff_id: adjustment.staffId,
      staff_name: adjustment.staffName,
      adjustment_days: Number(adjustment.adjustmentDays) || 0,
      reason: adjustment.reason || 'Koreksi Hari Kerja oleh Manajer',
      author_name: adjustment.authorName || 'Operational Manager',
      created_at: now
    };

    const currentList = await this.getStaffDayAdjustments();
    const updatedList = [newAdj, ...currentList];

    await this.saveSetting('staff_day_adjustments', updatedList, 'Manual Staff Working Day Adjustments');
    return newAdj;
  },

  async deleteStaffDayAdjustment(id) {
    if (!supabase) return null;
    const currentList = await this.getStaffDayAdjustments();
    const itemToDelete = currentList.find(a => String(a.id) === String(id));
    const updatedList = currentList.filter(a => String(a.id) !== String(id));
    await this.saveSetting('staff_day_adjustments', updatedList, 'Manual Staff Working Day Adjustments');
    return itemToDelete;
  },

  // 19. Staff Audit Trail (Transparent Log for Staff Dashboard)
  async getStaffAuditLogs(staffId = null) {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'staff_audit_logs')
        .maybeSingle();

      const list = Array.isArray(data?.value) ? data.value : [];
      if (!staffId) return list;
      return list.filter(l => String(l.staff_id) === String(staffId));
    } catch (e) {
      console.warn('Failed to fetch staff_audit_logs:', e.message);
      return [];
    }
  },

  async recordStaffAuditLog({ staffId, staffName, actionType, description, authorName }) {
    if (!supabase) return null;
    const now = new Date().toISOString();
    const logItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      staff_id: staffId,
      staff_name: staffName,
      action_type: actionType, // 'POINT_REMOVED' | 'LEAVE_REMOVED' | 'DAY_ADJUSTED' | 'MANUAL_CORRECTION'
      description: description || '',
      author_name: authorName || 'Operational Manager',
      created_at: now
    };

    const currentLogs = await this.getStaffAuditLogs();
    const updatedLogs = [logItem, ...currentLogs.slice(0, 499)]; // Keep latest 500 logs
    await this.saveSetting('staff_audit_logs', updatedLogs, 'Staff Action Audit Logs by Management');
    return logItem;
  },

  // 20. Point Deletion History & Audit Logs
  async getPointDeletionLogs() {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'point_deletion_logs')
        .maybeSingle();

      const list = Array.isArray(data?.value) ? data.value : [];
      if (list.length === 0) {
        const seedLogs = [
          {
            id: 'pdel-init-haslam',
            point_id: 'pt_1794996192325_0_6tvh',
            staff_id: 'LC-SER-03',
            staff_name: 'Haslam',
            staff_venue: 'LuckyCat',
            points: 1,
            point_type: 'VIOLATION',
            category: 'Kedisiplinan Operasional',
            reason: 'Menggunakan HT untuk bercanda',
            awarded_by: 'Operational Manager',
            awarded_at: '2026-11-18T09:15:00.000Z',
            deleted_by: 'Operational Manager',
            deletion_reason: 'Dihapus oleh Manajer (Pembersihan status & koreksi jenis poin)',
            created_at: '2026-11-18T09:30:00.000Z'
          },
          {
            id: 'pdel-init-alex',
            point_id: 'pt_1794994967089_0_fih1',
            staff_id: 'JP-SER-04',
            staff_name: 'Alex',
            staff_venue: 'JP Karaoke',
            points: 1,
            point_type: 'VIOLATION',
            category: 'Kedisiplinan Operasional',
            reason: 'Live tiktok di jam kerja',
            awarded_by: 'Operational Manager',
            awarded_at: '2026-11-18T09:10:00.000Z',
            deleted_by: 'Operational Manager',
            deletion_reason: 'Dihapus oleh Manajer (Pembersihan status & koreksi jenis poin)',
            created_at: '2026-11-18T09:30:00.000Z'
          }
        ];
        try {
          await this.saveSetting('point_deletion_logs', seedLogs, 'Log Riwayat Penghapusan Poin oleh Manajer');
        } catch {}
        return seedLogs;
      }
      return list;
    } catch (e) {
      console.warn('Failed to fetch point_deletion_logs from Supabase:', e.message);
      return [];
    }
  },

  async recordPointDeletionLog(logItem) {
    if (!supabase) return logItem;
    try {
      const currentLogs = await this.getPointDeletionLogs();
      const updatedLogs = [logItem, ...currentLogs.filter(l => l.id !== logItem.id).slice(0, 499)];
      await this.saveSetting('point_deletion_logs', updatedLogs, 'Log Riwayat Penghapusan Poin oleh Manajer');
      return logItem;
    } catch (e) {
      console.warn('Failed to record point_deletion_log in Supabase:', e.message);
      return logItem;
    }
  }
};
