import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, getSetting, setSetting, uploadsDir } from './db.js';
import { calculateDistanceMeters, isWithinGeofence } from './geofence.js';
import { getClientIp, validateClientNetwork } from './network.js';
import { evaluateCheckinFlags, evaluateCheckoutFlags, evaluateBreakFlags, auditOpenShifts, FLAG_TYPES } from './flags.js';
import { isSupabaseConfigured, uploadPhotoToSupabase, cloudDb, supabase, findStaffInSupabase } from './supabase.js';
import { detectShiftSchedule, getBreakCutoff, isBreakAllowedNow, getWitaTimeString, getWitaDateYMD } from './shifts.js';
import { computeLeaderboard } from './leaderboard.js';

const router = express.Router();

// Real-Time Server-Sent Events (SSE) Client Pool
const sseClients = new Set();

export function broadcastEvent(eventType, data = {}) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// SSE Connection Endpoint
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Live Sync Active' })}\n\n`);
  sseClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Helper to save base64 photo to disk
function saveBase64Photo(dataUrl, prefix = 'photo') {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return null;
  }
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  if (buffer.length < 500) {
    console.warn('Local photo buffer too small to be valid image:', buffer.length);
    return null;
  }
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/${filename}`;
}

// Unified photo saver: uploads directly to Supabase Storage if configured, or falls back to local disk
async function savePhoto(dataUrl, prefix = 'photo') {
  if (isSupabaseConfigured) {
    try {
      const cloudUrl = await uploadPhotoToSupabase(dataUrl, prefix);
      if (cloudUrl) return cloudUrl;
    } catch (err) {
      console.warn('Supabase storage upload fallback to local disk:', err.message);
    }
  }
  return saveBase64Photo(dataUrl, prefix);
}

// 1. Admin PIN Verification Endpoint (Full Manager PIN: 8080 | Assistant Manager / View Only PIN: 7070 or Management Staff PIN)
router.post('/admin/verify', async (req, res) => {
  const { pin } = req.body;
  if (!pin || !pin.trim()) {
    return res.status(400).json({ error: 'PIN wajib diisi.' });
  }

  const cleanPin = pin.trim();
  const adminPin = getSetting('admin_pin') || '8080';
  const supervisorPin = getSetting('supervisor_pin') || '7070';

  // 1. Full Manager Check (PIN 8080)
  if (cleanPin === adminPin.trim()) {
    return res.json({
      success: true,
      role: 'MANAGER',
      canEdit: true,
      message: 'Manager Full Access authenticated successfully',
      token: 'admin-authorized-session-token'
    });
  }

  // 2. Supervisor View-Only PIN (PIN 7070)
  if (cleanPin === supervisorPin.trim()) {
    return res.json({
      success: true,
      role: 'VIEW_ONLY',
      canEdit: false,
      staffName: 'Assistant Manager',
      message: 'Assistant Manager (View Only) authenticated successfully',
      token: 'viewonly-authorized-session-token'
    });
  }

  // Helper to determine if a staff member qualifies for View-Only Manager access
  const isManagementStaff = (staff) => {
    if (!staff) return false;
    const div = (staff.division || '').trim().toLowerCase();
    const role = (staff.role || '').trim().toLowerCase();
    return (
      div === 'management' ||
      role.includes('manager') ||
      role.includes('asst') ||
      role.includes('asisten') ||
      role.includes('supervisor') ||
      role.includes('spv') ||
      role.includes('pengawas')
    );
  };

  // 3. Check if PIN belongs to any Management / Assistant Manager staff in Supabase Cloud
  if (isSupabaseConfigured) {
    try {
      const { data: supaStaffList, error: supaErr } = await supabase
        .from('staff')
        .select('name, role, division, is_active')
        .eq('pin', cleanPin);

      if (!supaErr && supaStaffList && supaStaffList.length > 0) {
        const mgmtStaff = supaStaffList.find((s) => s.is_active && isManagementStaff(s));
        if (mgmtStaff) {
          return res.json({
            success: true,
            role: 'VIEW_ONLY',
            canEdit: false,
            staffName: mgmtStaff.name,
            message: `${mgmtStaff.name} (Assistant Manager View Only) authenticated successfully`,
            token: 'viewonly-authorized-session-token'
          });
        }
      }
    } catch (e) {
      console.warn('Supabase mgmt admin check note:', e.message);
    }
  }

  // 4. Check SQLite fallback for Management staff
  try {
    const localStaffList = db.prepare(`
      SELECT name, role, division, is_active FROM staff WHERE pin = ? AND is_active = 1
    `).all(cleanPin);

    const localMgmt = localStaffList.find((s) => isManagementStaff(s));
    if (localMgmt) {
      return res.json({
        success: true,
        role: 'VIEW_ONLY',
        canEdit: false,
        staffName: localMgmt.name,
        message: `${localMgmt.name} (Assistant Manager View Only) authenticated successfully`,
        token: 'viewonly-authorized-session-token'
      });
    }
  } catch (e) {
    console.warn('SQLite local mgmt check note:', e.message);
  }

  return res.status(401).json({ error: 'PIN Manager / Assistant Manager salah. Akses ditolak.' });
});

// 2. Network Status Check
router.get('/network-status', (req, res) => {
  const clientIp = getClientIp(req);
  const allowedSubnets = getSetting('allowed_subnets') || [];
  const enforceWifi = getSetting('enforce_wifi') || 0;
  const validation = validateClientNetwork(clientIp, allowedSubnets);

  res.json({
    clientIp,
    isMatch: validation.isMatch,
    matchedSubnet: validation.matchedSubnet,
    enforceWifi: Boolean(enforceWifi),
    venueName: getSetting('venue_name'),
    allowedSubnets
  });
});

// 3. Shift Schedules Management (Timing Editor)
router.get('/schedules', async (req, res) => {
  let schedules = db.prepare('SELECT * FROM shift_schedules ORDER BY venue ASC, division ASC, shift_number ASC').all();
  let breakWindows = {};

  if (isSupabaseConfigured) {
    try {
      const [{ data: cloudSchedules, error: schedErr }, { data: bwRow }] = await Promise.all([
        supabase
          .from('shift_schedules')
          .select('*')
          .order('venue', { ascending: true })
          .order('division', { ascending: true })
          .order('shift_number', { ascending: true }),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'shift_break_windows')
          .maybeSingle()
      ]);

      if (bwRow && bwRow.value && typeof bwRow.value === 'object') {
        breakWindows = bwRow.value;
      }

      if (!schedErr && cloudSchedules && cloudSchedules.length > 0) {
        schedules = cloudSchedules.map((s) => {
          const normVenue = s.venue ? (s.venue.replace(/\s+/g, '').toLowerCase() === 'luckycat' ? 'LuckyCat' : s.venue) : 'LuckyCat';
          const bw = breakWindows[String(s.id)] || {};
          return {
            ...s,
            venue: normVenue,
            is_flexible_checkout: s.is_flexible_checkout ? 1 : 0,
            allows_break: s.allows_break ? 1 : 0,
            break_start_time: bw.break_start_time || s.break_start_time || null,
            max_break_end: bw.max_break_end || s.max_break_end || null
          };
        });

        for (const s of schedules) {
          db.prepare(`
            INSERT OR REPLACE INTO shift_schedules (id, venue, division, shift_number, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end, break_start_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            s.id,
            s.venue,
            s.division,
            s.shift_number,
            s.name,
            s.start_time,
            s.end_time,
            s.is_flexible_checkout ? 1 : 0,
            s.allows_break ? 1 : 0,
            s.max_break_end || null,
            s.break_start_time || null
          );
        }
      }
    } catch (e) {
      console.warn('Supabase fetch schedules note:', e.message);
    }
  }

  // Ensure normalized venue
  schedules = schedules.map((s) => ({
    ...s,
    venue: s.venue && s.venue.replace(/\s+/g, '').toLowerCase() === 'luckycat' ? 'LuckyCat' : s.venue
  }));

  res.json(schedules);
});

router.post('/schedules', async (req, res) => {
  const { venue, division, shift_number, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end, break_start_time } = req.body;

  if (!division || !start_time || !end_time) {
    return res.status(400).json({ error: 'Division, start time, and end time are required' });
  }

  const normVenue = venue && venue.replace(/\s+/g, '').toLowerCase() === 'luckycat' ? 'LuckyCat' : (venue || 'LuckyCat');
  const shiftName = name || `Shift ${shift_number || 1}`;
  const shiftNum = parseInt(shift_number, 10) || 1;

  try {
    let cloudId = null;

    if (isSupabaseConfigured) {
      try {
        const { data: inserted, error: insErr } = await supabase.from('shift_schedules').insert({
          venue: normVenue,
          division: division.trim(),
          shift_number: shiftNum,
          name: shiftName.trim(),
          start_time: start_time.trim(),
          end_time: end_time.trim(),
          is_flexible_checkout: Boolean(is_flexible_checkout),
          allows_break: Boolean(allows_break),
          max_break_end: max_break_end ? max_break_end.trim().substring(0, 10) : null
        }).select().single();

        if (!insErr && inserted) {
          cloudId = inserted.id;
        }
      } catch (e) {
        console.warn('Supabase insert schedule note:', e.message);
      }
    }

    const info = db.prepare(`
      INSERT INTO shift_schedules (id, venue, division, shift_number, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end, break_start_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cloudId,
      normVenue,
      division.trim(),
      shiftNum,
      shiftName.trim(),
      start_time.trim(),
      end_time.trim(),
      is_flexible_checkout ? 1 : 0,
      allows_break ? 1 : 0,
      max_break_end ? max_break_end.trim() : null,
      break_start_time ? break_start_time.trim() : null
    );

    const assignedId = cloudId || info.lastInsertRowid;

    if (isSupabaseConfigured) {
      try {
        const { data: bwRow } = await supabase.from('app_settings').select('value').eq('key', 'shift_break_windows').maybeSingle();
        const currentBw = (bwRow && bwRow.value && typeof bwRow.value === 'object') ? bwRow.value : {};
        currentBw[String(assignedId)] = {
          allows_break: allows_break ? 1 : 0,
          break_start_time: break_start_time ? break_start_time.trim() : null,
          max_break_end: max_break_end ? max_break_end.trim() : null
        };
        await supabase.from('app_settings').upsert({
          key: 'shift_break_windows',
          value: currentBw,
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }

    broadcastEvent('SCHEDULES_UPDATE', { action: 'CREATED', id: assignedId });
    res.json({ success: true, message: 'Shift schedule created successfully', id: assignedId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/schedules/:id', async (req, res) => {
  const { id } = req.params;
  const { venue, division, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end, break_start_time } = req.body;

  try {
    db.prepare(`
      UPDATE shift_schedules SET
        venue = COALESCE(?, venue),
        division = COALESCE(?, division),
        name = COALESCE(?, name),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        is_flexible_checkout = COALESCE(?, is_flexible_checkout),
        allows_break = COALESCE(?, allows_break),
        max_break_end = COALESCE(?, max_break_end),
        break_start_time = COALESCE(?, break_start_time),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(venue, division, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end, break_start_time, id);

    if (isSupabaseConfigured) {
      try {
        const updatePayload = { updated_at: new Date().toISOString() };
        if (venue !== undefined) updatePayload.venue = venue.replace(/\s+/g, '').toLowerCase() === 'luckycat' ? 'LuckyCat' : venue;
        if (division !== undefined) updatePayload.division = division;
        if (name !== undefined) updatePayload.name = name;
        if (start_time !== undefined) updatePayload.start_time = start_time;
        if (end_time !== undefined) updatePayload.end_time = end_time;
        if (is_flexible_checkout !== undefined) updatePayload.is_flexible_checkout = Boolean(is_flexible_checkout);
        if (allows_break !== undefined) updatePayload.allows_break = Boolean(allows_break);
        if (max_break_end !== undefined) updatePayload.max_break_end = max_break_end ? max_break_end.substring(0, 10) : null;

        await supabase.from('shift_schedules').update(updatePayload).eq('id', id);

        const { data: bwRow } = await supabase.from('app_settings').select('value').eq('key', 'shift_break_windows').maybeSingle();
        const currentBw = (bwRow && bwRow.value && typeof bwRow.value === 'object') ? bwRow.value : {};
        currentBw[String(id)] = {
          allows_break: allows_break ? 1 : 0,
          break_start_time: break_start_time || currentBw[String(id)]?.break_start_time || null,
          max_break_end: max_break_end || currentBw[String(id)]?.max_break_end || null
        };
        await supabase.from('app_settings').upsert({
          key: 'shift_break_windows',
          value: currentBw,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Supabase schedule update error:', e.message);
      }
    }

    broadcastEvent('SCHEDULES_UPDATE', { id });
    res.json({ success: true, message: 'Shift schedule timing updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/schedules/:id', async (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM shift_schedules WHERE id = ?').run(id);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('shift_schedules').delete().eq('id', id);
        const { data: bwRow } = await supabase.from('app_settings').select('value').eq('key', 'shift_break_windows').maybeSingle();
        if (bwRow && bwRow.value && bwRow.value[String(id)]) {
          delete bwRow.value[String(id)];
          await supabase.from('app_settings').upsert({
            key: 'shift_break_windows',
            value: bwRow.value,
            updated_at: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('Supabase delete schedule note:', e.message);
      }
    }

    broadcastEvent('SCHEDULES_UPDATE', { action: 'DELETED', id });
    res.json({ success: true, message: 'Shift schedule deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Staff Endpoints (Public Roster for Kiosk)
router.get('/staff', async (req, res) => {
  const { venue } = req.query;

  // Authoritative Cloud Source if Supabase is configured
  if (isSupabaseConfigured) {
    try {
      let supaQuery = supabase
        .from('staff')
        .select('id, legacy_code, name, venue, division, role, department, shift_start, shift_end, standard_hours, is_active')
        .eq('is_active', true);

      if (venue && venue !== 'ALL') {
        supaQuery = supaQuery.ilike('venue', `%${venue.replace('JP Karaoke', 'JP')}%`);
      }

      const { data, error } = await supaQuery.order('venue', { ascending: true }).order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        return res.json(data.map(s => ({
          ...s,
          id: s.legacy_code || s.id,
          uuid: s.id,
          is_active: 1
        })));
      }
    } catch (e) {
      console.warn('Supabase staff query error, falling back to SQLite:', e.message);
    }
  }

  // SQLite fallback
  let query = 'SELECT id, name, venue, division, role, department, shift_start, shift_end, standard_hours, is_active FROM staff WHERE is_active = 1';
  const params = [];

  if (venue && venue !== 'ALL') {
    query += ' AND venue = ?';
    params.push(venue);
  }

  query += ' ORDER BY venue ASC, division ASC, name ASC';
  const staff = db.prepare(query).all(...params);
  res.json(staff);
});

// 5. Manager Admin Staff Roster
router.get('/staff/admin', async (req, res) => {
  // Authoritative Cloud Source if Supabase is configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('venue', { ascending: true })
        .order('is_active', { ascending: false })
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        // Upsert all into local SQLite so that foreign keys or local queries also know about all staff
        for (const s of data) {
          const staffId = s.legacy_code || s.id;
          try {
            db.prepare(`
              INSERT OR REPLACE INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              staffId,
              s.name,
              s.venue,
              s.division,
              s.role,
              s.department || s.division,
              s.pin,
              s.shift_start || '10:00',
              s.shift_end || '19:00',
              s.standard_hours || 9,
              s.is_active ? 1 : 0
            );
          } catch (e) {
            // ignore sqlite sync error
          }
        }

        // Return staff with last_shift_time
        const formatted = data.map(s => {
          const staffId = s.legacy_code || s.id;
          let lastShiftTime = null;
          try {
            const row = db.prepare('SELECT MAX(checkin_time) as last_shift_time FROM shifts WHERE staff_id = ?').get(staffId);
            lastShiftTime = row?.last_shift_time || null;
          } catch {}
          return {
            ...s,
            id: staffId,
            uuid: s.id,
            is_active: s.is_active ? 1 : 0,
            last_shift_time: lastShiftTime
          };
        });

        return res.json(formatted);
      }
    } catch (e) {
      console.warn('Supabase admin staff query error, falling back to SQLite:', e.message);
    }
  }

  // SQLite fallback
  const staff = db.prepare(`
    SELECT 
      st.*,
      (SELECT MAX(s.checkin_time) FROM shifts s WHERE s.staff_id = st.id) as last_shift_time
    FROM staff st 
    ORDER BY st.venue ASC, st.is_active DESC, st.name ASC
  `).all();

  res.json(staff);
});

// 6. Kiosk PIN Verification (PIN Only or StaffId + PIN)
router.post('/staff/verify-pin', async (req, res) => {
  const { staffId, pin } = req.body;

  if (!pin || !pin.trim()) {
    return res.status(400).json({ error: 'PIN wajib diisi.' });
  }

  const cleanPin = pin.trim();
  let staff = null;

  // 1. Primary: Lookup in Supabase Cloud
  if (isSupabaseConfigured) {
    try {
      if (staffId) {
        const supa = await findStaffInSupabase(staffId);
        if (supa) {
          staff = { ...supa, id: supa.legacy_code || supa.id, uuid: supa.id };
        }
      } else {
        const { data: supaStaff } = await supabase
          .from('staff')
          .select('*')
          .eq('pin', cleanPin)
          .eq('is_active', true)
          .maybeSingle();

        if (supaStaff) {
          staff = {
            ...supaStaff,
            id: supaStaff.legacy_code || supaStaff.id,
            uuid: supaStaff.id
          };
        }
      }

      if (staff) {
        // Upsert to SQLite to ensure local cache consistency
        try {
          db.prepare(`
            INSERT OR REPLACE INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active, uuid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            staff.id,
            staff.name,
            staff.venue,
            staff.division,
            staff.role,
            staff.department || staff.division,
            staff.pin,
            staff.shift_start || '13:00',
            staff.shift_end || '22:00',
            staff.standard_hours || 8.5,
            staff.is_active ? 1 : 0,
            staff.uuid
          );
        } catch {}
      }
    } catch (e) {
      console.warn('Supabase pin query error:', e.message);
    }
  }

  // 2. Fallback to SQLite
  if (!staff) {
    if (staffId) {
      staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
    } else {
      staff = db.prepare('SELECT * FROM staff WHERE pin = ? AND is_active = 1').get(cleanPin);
    }
  }

  if (!staff) {
    return res.status(401).json({ error: 'PIN tidak terdaftar. Pastikan 4 digit PIN Anda benar.' });
  }

  if (!staff.is_active) {
    return res.status(403).json({
      error: 'Akun Anda dinonaktifkan oleh Manajer. Hubungi HR / Manajer Operasional.'
    });
  }

  if (staff.pin !== cleanPin) {
    return res.status(401).json({ error: 'PIN salah. Silakan coba lagi.' });
  }

  // Get active shift
  let activeShift = db.prepare(`
    SELECT s.*, st.name as staff_name, st.venue, st.division, st.role, st.department, st.standard_hours
    FROM shifts s
    JOIN staff st ON s.staff_id = st.id
    WHERE s.staff_id = ? AND s.status != 'COMPLETED'
    ORDER BY s.id DESC
    LIMIT 1
  `).get(staff.id);

  if (activeShift) {
    activeShift.flags = JSON.parse(activeShift.flags || '[]');
  } else if (isSupabaseConfigured) {
    try {
      const { data: supaShift } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('staff_id', staff.uuid || staff.id)
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (supaShift) {
        activeShift = {
          ...supaShift,
          checkin_time: supaShift.check_in_time,
          checkin_photo: supaShift.check_in_photo_url,
          flags: supaShift.flags || []
        };
      }
    } catch (e) {}
  }

  // Fetch schedules for staff member's venue & division (normalize venue name)
  const normVenue = staff.venue && staff.venue.replace(/\s+/g, '').toLowerCase() === 'luckycat' ? 'LuckyCat' : staff.venue;
  const schedules = db.prepare(`
    SELECT * FROM shift_schedules 
    WHERE REPLACE(LOWER(venue), ' ', '') = REPLACE(LOWER(?), ' ', '') AND division = ?
    ORDER BY shift_number ASC
  `).all(normVenue, staff.division);

  let detectedShift = null;
  let breakAllowed = false;
  let breakCutoffTime = '20:00';
  let breakStartTime = null;
  let isWithin2HoursOfEnd = false;

  if (activeShift && activeShift.scheduled_start) {
    const shiftEnd = activeShift.scheduled_end || '22:00';
    const shiftStart = activeShift.scheduled_start || '13:00';
    const cutoff = getBreakCutoff(shiftEnd);
    breakCutoffTime = cutoff.cutoffTimeStr;

    detectedShift = schedules.find((s) => s.start_time === activeShift.scheduled_start) || {
      name: 'Shift Aktif',
      shift_number: 1,
      start_time: shiftStart,
      end_time: shiftEnd,
      max_break_end: cutoff.cutoffTimeStr,
      allows_break: 1
    };

    breakStartTime = detectedShift?.break_start_time || null;
    const breakEndTime = detectedShift?.max_break_end || cutoff.cutoffTimeStr;
    const shiftAllowsBreak = Boolean(detectedShift?.allows_break);

    const timeAllowed = isBreakAllowedNow(shiftStart, shiftEnd, new Date(), breakStartTime, breakEndTime);
    isWithin2HoursOfEnd = !timeAllowed;
    const breakCount = activeShift.break_count || 0;
    const isCompletedBreak = activeShift.break_status === 'COMPLETED';
    const isOnBreak = activeShift.break_status === 'ON_BREAK';

    // Break is allowed only if shift allows break, break not yet taken, and time is inside allowed break window
    breakAllowed = shiftAllowsBreak && !isOnBreak && breakCount === 0 && !isCompletedBreak && timeAllowed;
  } else {
    // 30-minute auto-detect candidate
    detectedShift = detectShiftSchedule(schedules, new Date());
  }

  res.json({
    success: true,
    staff: {
      id: staff.id,
      name: staff.name,
      venue: staff.venue,
      division: staff.division,
      role: staff.role,
      department: staff.department,
      shift_start: detectedShift?.start_time || staff.shift_start || '13:00',
      shift_end: detectedShift?.end_time || staff.shift_end || '22:00',
      standard_hours: staff.standard_hours,
      allows_break: detectedShift?.allows_break ?? 1,
      break_start_time: breakStartTime,
      max_break_end: detectedShift?.max_break_end || breakCutoffTime,
      breakAllowed,
      breakCutoffTime,
      isWithin2HoursOfEnd,
      detectedShift: detectedShift || null,
      availableSchedules: schedules
    },
    activeShift: activeShift || null
  });
});

// 7. Manager Admin: Add New Staff Member
router.post('/staff', async (req, res) => {
  const { name, venue, division, role, department, pin, is_active, shift_start, shift_end, standard_hours } = req.body;
  if (!name || (!role && !division)) {
    return res.status(400).json({ error: 'Name and Division/Role are required' });
  }

  try {
    const assignedVenue = venue || 'JP Karaoke';
    const assignedDivision = division || 'Server and Cashier';
    const assignedRole = (role || assignedDivision).trim();

    // Auto-inherit shift template from division if not explicitly provided
    let sStart = shift_start;
    let sEnd = shift_end;
    let sHours = standard_hours;

    if (!sStart || !sEnd) {
      const template = db.prepare('SELECT start_time, end_time FROM shift_schedules WHERE venue = ? AND division = ? ORDER BY shift_number ASC LIMIT 1').get(assignedVenue, assignedDivision);
      if (template) {
        sStart = template.start_time;
        sEnd = template.end_time;
      } else {
        sStart = assignedVenue === 'LuckyCat' ? '10:00' : '13:00';
        sEnd = assignedVenue === 'LuckyCat' ? '19:00' : '22:00';
      }
    }
    if (!sHours) {
      sHours = 9.0;
    }

    const assignedPin = pin ? pin.trim() : Math.floor(1000 + Math.random() * 9000).toString();
    const activeStatus = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    // Generate unique collision-free ID for legacy_code
    let assignedId = req.body.id;
    if (!assignedId) {
      const prefix = (assignedVenue === 'LuckyCat' ? 'LC' : 'JP') + '-' + (assignedRole.slice(0, 3).toUpperCase());
      const randNum = Math.floor(100 + Math.random() * 900);
      assignedId = `${prefix}-${Date.now().toString().slice(-4)}${randNum}`;
    }

    // Insert to Supabase Cloud as authoritative store
    let supaRecord = null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('staff').insert({
        legacy_code: assignedId,
        name: name.trim(),
        venue: assignedVenue,
        division: assignedDivision,
        role: assignedRole,
        department: department || assignedDivision,
        pin: assignedPin,
        shift_start: sStart,
        shift_end: sEnd,
        standard_hours: parseFloat(sHours),
        is_active: activeStatus === 1
      }).select().single();

      if (error) {
        console.error('Supabase staff insert error:', error);
        throw new Error(`Gagal menyimpan ke database cloud: ${error.message}`);
      }
      supaRecord = data;
    }

    // Also cache/insert in local SQLite
    db.prepare(`
      INSERT OR REPLACE INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assignedId,
      name.trim(),
      assignedVenue,
      assignedDivision,
      assignedRole,
      department || assignedDivision,
      assignedPin,
      sStart,
      sEnd,
      parseFloat(sHours),
      activeStatus
    );

    broadcastEvent('STAFF_UPDATE', { action: 'CREATED', staffId: assignedId });
    res.json({
      success: true,
      message: 'Staff member provisioned successfully',
      id: assignedId,
      uuid: supaRecord?.id || assignedId,
      pin: assignedPin
    });
  } catch (err) {
    console.error('Error adding staff:', err);
    res.status(400).json({ error: err.message });
  }
});

// 8. Manager Admin: Reset Staff PIN
router.put('/staff/:id/pin', async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  if (!pin || pin.trim().length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits.' });
  }

  db.prepare('UPDATE staff SET pin = ? WHERE id = ?').run(pin.trim(), id);

  if (isSupabaseConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('staff').update({ pin: pin.trim(), updated_at: new Date().toISOString() });
      query = isUuid ? query.eq('id', id) : query.eq('legacy_code', id);
      const { error } = await query;
      if (error) throw error;
    } catch (e) {
      console.warn('Supabase pin update note:', e.message);
    }
  }

  broadcastEvent('STAFF_UPDATE', { action: 'PIN_RESET', staffId: id });
  res.json({ success: true, message: 'PIN updated successfully.' });
});

// 9. Manager Admin: Toggle Staff Active/Suspended Status
router.put('/staff/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const statusVal = is_active ? 1 : 0;
  db.prepare('UPDATE staff SET is_active = ? WHERE id = ?').run(statusVal, id);

  if (isSupabaseConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('staff').update({ is_active: statusVal === 1, updated_at: new Date().toISOString() });
      query = isUuid ? query.eq('id', id) : query.eq('legacy_code', id);
      const { error } = await query;
      if (error) throw error;
    } catch (e) {
      console.warn('Supabase status update note:', e.message);
    }
  }

  broadcastEvent('STAFF_UPDATE', { action: 'STATUS_TOGGLED', staffId: id, is_active: statusVal });
  res.json({ success: true, message: `Staff status changed to ${statusVal ? 'Active' : 'Suspended'}.` });
});

// 9b. Manager Admin: Delete Staff Member
router.delete('/staff/:id', async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('staff').delete();
      query = isUuid ? query.eq('id', id) : query.eq('legacy_code', id);
      const { error } = await query;
      if (error) throw error;
    } catch (e) {
      console.warn('Supabase staff delete note:', e.message);
    }
  }

  db.prepare('DELETE FROM staff WHERE id = ?').run(id);

  broadcastEvent('STAFF_UPDATE', { action: 'DELETED', staffId: id });
  res.json({ success: true, message: 'Karyawan berhasil dihapus dari sistem.' });
});

// 10. Staff Check-In
router.post('/checkin', async (req, res) => {
  const { staffId, pin, lat, lng, accuracy, photoBase64, timestamp, confirmedShift } = req.body;

  if (!staffId) return res.status(400).json({ error: 'Karyawan wajib dipilih.' });
  if (!photoBase64) return res.status(400).json({ error: 'Foto selfie langsung wajib diambil.' });

  let staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  if (!staff && isSupabaseConfigured) {
    const supaStaff = await findStaffInSupabase(staffId);
    if (supaStaff) {
      staff = {
        ...supaStaff,
        id: supaStaff.legacy_code || supaStaff.id,
        uuid: supaStaff.id
      };
      try {
        db.prepare(`
          INSERT OR REPLACE INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active, uuid)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          staff.id,
          staff.name,
          staff.venue,
          staff.division,
          staff.role,
          staff.department || staff.division,
          staff.pin,
          staff.shift_start || '13:00',
          staff.shift_end || '22:00',
          staff.standard_hours || 8.5,
          staff.is_active ? 1 : 0,
          staff.uuid
        );
      } catch {}
    }
  }

  if (!staff) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
  if (!staff.is_active) return res.status(403).json({ error: 'Akun dinonaktifkan. Hubungi Manajer / HR.' });
  if (pin && staff.pin && staff.pin !== pin.trim()) return res.status(401).json({ error: 'PIN Rahasia salah.' });

  const existingActive = db.prepare("SELECT id FROM shifts WHERE staff_id = ? AND status != 'COMPLETED'").get(staff.id);
  if (existingActive) {
    return res.status(400).json({ error: 'Anda sudah memiliki shift yang sedang aktif. Silakan lakukan Check-Out terlebih dahulu.' });
  }

  // Network info (Informational only - Wi-Fi lock disabled as requested)
  const clientIp = getClientIp(req);
  const wifiValidation = { isMatch: true, matchedSubnet: 'ALL_NETWORKS' };

  // Geofence Check
  const venueLat = getSetting('venue_lat');
  const venueLng = getSetting('venue_lng');
  const geofenceRadius = getSetting('geofence_radius') || 150;
  const userLat = lat != null ? parseFloat(lat) : null;
  const userLng = lng != null ? parseFloat(lng) : null;
  const distance = calculateDistanceMeters(userLat, userLng, venueLat, venueLng);

  const photoUrl = await savePhoto(photoBase64, `in_${staff.id}`);
  const now = new Date();
  const dateStr = getWitaDateYMD(now);
  const checkinTime = timestamp || now.toISOString();

  // Shift schedule determination (from staff confirmation dialog or 30-min window detection)
  let scheduledStart = confirmedShift?.start_time;
  let scheduledEnd = confirmedShift?.end_time;
  let shiftNumber = confirmedShift?.shift_number;
  let shiftName = confirmedShift?.name;

  if (!scheduledStart) {
    const schedules = db.prepare(`
      SELECT * FROM shift_schedules 
      WHERE venue = ? AND division = ?
      ORDER BY shift_number ASC
    `).all(staff.venue, staff.division);

    const matchedSchedule = detectShiftSchedule(schedules, checkinTime);
    scheduledStart = matchedSchedule ? matchedSchedule.start_time : (staff.shift_start || '13:00');
    scheduledEnd = matchedSchedule ? matchedSchedule.end_time : (staff.shift_end || '22:00');
    shiftNumber = matchedSchedule?.shift_number || 1;
    shiftName = matchedSchedule?.name || `Shift ${shiftNumber}`;
  } else if (!shiftNumber) {
    try {
      const matched = db.prepare('SELECT shift_number, name FROM shift_schedules WHERE venue = ? AND division = ? AND start_time = ? LIMIT 1').get(staff.venue, staff.division, scheduledStart);
      if (matched) {
        shiftNumber = matched.shift_number;
        shiftName = matched.name;
      }
    } catch {}
  }

  const flags = evaluateCheckinFlags({
    clientIp,
    lat: userLat,
    lng: userLng,
    distance,
    wifiPass: wifiValidation.isMatch,
    geofenceRadius,
    scheduledStart,
    checkinTime,
    division: staff.division
  });

  // Sync to Supabase Cloud if connected
  let supaShift = null;
  if (isSupabaseConfigured) {
    try {
      supaShift = await cloudDb.recordCheckin({
        staffId: staff.uuid || staff.id || staffId,
        userLat,
        userLng,
        accuracy,
        distance,
        photoUrl,
        clientIp,
        wifiPass: wifiValidation.isMatch,
        flags,
        scheduledStart,
        scheduledEnd,
        shiftNumber,
        shiftName
      });
    } catch (e) {
      console.warn('Supabase Checkin Cloud Sync Note:', e.message);
    }
  }

  const result = db.prepare(`
    INSERT INTO shifts (
      staff_id, date, scheduled_start, scheduled_end,
      checkin_time, checkin_lat, checkin_lng, checkin_accuracy,
      checkin_distance, checkin_photo, checkin_ip, checkin_wifi_pass,
      status, flags, supabase_id
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      'IN_PROGRESS', ?, ?
    )
  `).run(
    staff.id,
    dateStr,
    scheduledStart,
    scheduledEnd,
    checkinTime,
    userLat,
    userLng,
    accuracy || null,
    distance,
    photoUrl,
    clientIp,
    wifiValidation.isMatch ? 1 : 0,
    JSON.stringify(flags),
    supaShift?.id || null
  );

  const newShift = db.prepare(`
    SELECT s.*, st.name as staff_name, st.venue, st.division, st.role, st.department
    FROM shifts s
    JOIN staff st ON s.staff_id = st.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);
  if (newShift) newShift.flags = flags;

  broadcastEvent('SHIFT_UPDATE', { action: 'CHECKIN', shift: newShift || supaShift });

  res.json({
    success: true,
    message: 'Absensi Masuk Berhasil Dicatat!',
    shift: newShift || supaShift,
    flags
  });
});

// 11. Staff Start Break
router.post('/break/start', async (req, res) => {
  const { shiftId, staffId, pin, photoBase64, timestamp, lat, lng } = req.body;

  let staff = null;
  if (isSupabaseConfigured) {
    const supaStaff = await findStaffInSupabase(staffId);
    if (supaStaff) {
      staff = { ...supaStaff, id: supaStaff.legacy_code || supaStaff.id, uuid: supaStaff.id };
    }
  }
  if (!staff) {
    staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  }

  if (!staff) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });

  let shift = null;
  const isShiftUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(shiftId || ''));

  if (isShiftUuid && isSupabaseConfigured) {
    try {
      const { data: cloudShift } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('id', shiftId)
        .maybeSingle();

      if (cloudShift) {
        let parsedNotes = {};
        try { parsedNotes = JSON.parse(cloudShift.notes || '{}'); } catch {}
        shift = {
          id: cloudShift.id,
          supabase_id: cloudShift.id,
          staff_id: staff.id,
          status: cloudShift.status,
          break_status: cloudShift.status === 'ON_BREAK' ? 'ON_BREAK' : 'NONE',
          flags: JSON.stringify(cloudShift.flags || []),
          checkin_time: cloudShift.check_in_time,
          scheduled_start: parsedNotes.scheduled_start || staff.shift_start || '13:00',
          scheduled_end: parsedNotes.scheduled_end || staff.shift_end || '22:00'
        };
      }
    } catch (e) {}
  }

  if (!shift && shiftId && !isShiftUuid) {
    try { shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId); } catch {}
  }
  if (!shift) {
    try { shift = db.prepare("SELECT * FROM shifts WHERE staff_id = ? AND status != 'COMPLETED' ORDER BY id DESC LIMIT 1").get(staff.id); } catch {}
  }

  // Cloud fallback if shift is missing in this serverless container
  if (!shift && isSupabaseConfigured && staff?.uuid) {
    try {
      const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('staff_id', staff.uuid)
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        let parsedNotes = {};
        try { parsedNotes = JSON.parse(data.notes || '{}'); } catch {}
        shift = {
          id: data.id,
          supabase_id: data.id,
          staff_id: staff.id,
          status: data.status,
          break_status: data.status === 'ON_BREAK' ? 'ON_BREAK' : 'NONE',
          flags: JSON.stringify(data.flags || []),
          checkin_time: data.check_in_time,
          scheduled_start: parsedNotes.scheduled_start || staff.shift_start || '13:00',
          scheduled_end: parsedNotes.scheduled_end || staff.shift_end || '22:00'
        };
      }
    } catch (e) {}
  }

  if (!shift) return res.status(404).json({ error: 'Shift aktif tidak ditemukan.' });

  // STRICT RULE 1: Break only allowed once per shift
  if (shift.break_count >= 1 || shift.break_start_time || shift.break_status === 'COMPLETED' || shift.break_status === 'ON_BREAK') {
    return res.status(400).json({ error: 'Istirahat hanya diperbolehkan 1 kali per shift dan sudah pernah diambil.' });
  }

  // STRICT RULE 2: Break must be finished 2 hours before shift ends
  const shiftStart = shift.scheduled_start || '13:00';
  const shiftEnd = shift.scheduled_end || '22:00';
  const breakAllowed = isBreakAllowedNow(shiftStart, shiftEnd, timestamp || new Date());
  if (!breakAllowed) {
    const { cutoffTimeStr } = getBreakCutoff(shiftEnd);
    return res.status(400).json({
      error: `Waktu istirahat tidak diperbolehkan kurang dari 2 jam sebelum shift berakhir (Batas maksimal istirahat: Pukul ${cutoffTimeStr} WITA).`
    });
  }

  if (!photoBase64) return res.status(400).json({ error: 'Foto selfie mulai istirahat wajib diambil.' });

  const photoUrl = await savePhoto(photoBase64, `break_start_${staff.id}`);
  const startTime = timestamp || new Date().toISOString();

  try {
    db.prepare(`
      UPDATE shifts SET
        break_status = 'ON_BREAK',
        break_start_time = ?,
        break_start_photo = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(startTime, photoUrl, shift.id);
  } catch {}

  if (isSupabaseConfigured) {
    try {
      await cloudDb.recordBreakStart({
        attendanceId: shift.supabase_id || shift.id,
        staffId: staff.uuid || staff.id,
        photoUrl
      });
    } catch (e) {
      console.warn('Supabase Break Start Cloud Sync Note:', e.message);
    }
  }

  let updatedShift = null;
  try {
    updatedShift = db.prepare('SELECT s.*, st.name as staff_name, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shift.id);
  } catch {}

  if (updatedShift) {
    updatedShift.flags = JSON.parse(updatedShift.flags || '[]');
  } else {
    updatedShift = {
      ...shift,
      break_status: 'ON_BREAK',
      break_start_time: startTime,
      break_start_photo: photoUrl,
      staff_name: staff.name,
      staff_venue: staff.venue,
      staff_division: staff.division
    };
  }

  broadcastEvent('SHIFT_UPDATE', { action: 'BREAK_START', shift: updatedShift });

  res.json({
    success: true,
    message: 'Waktu Istirahat Dimulai! Maksimal 1 jam.',
    shift: updatedShift
  });
});

// 12. Staff End Break (LuckyCat Only)
router.post('/break/end', async (req, res) => {
  const { shiftId, staffId, pin, photoBase64, timestamp, lat, lng } = req.body;

  let staff = null;
  if (isSupabaseConfigured) {
    const supaStaff = await findStaffInSupabase(staffId);
    if (supaStaff) {
      staff = { ...supaStaff, id: supaStaff.legacy_code || supaStaff.id, uuid: supaStaff.id };
    }
  }
  if (!staff) {
    staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  }

  let shift = null;
  const isShiftUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(shiftId || ''));

  if (isShiftUuid && isSupabaseConfigured) {
    try {
      const { data: cloudShift } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('id', shiftId)
        .maybeSingle();

      if (cloudShift) {
        let parsedNotes = {};
        try { parsedNotes = JSON.parse(cloudShift.notes || '{}'); } catch {}
        shift = {
          id: cloudShift.id,
          supabase_id: cloudShift.id,
          staff_id: staff?.id || staffId,
          status: cloudShift.status,
          break_status: 'ON_BREAK',
          break_start_time: cloudShift.created_at,
          flags: JSON.stringify(cloudShift.flags || []),
          venue: staff?.venue || 'JP Karaoke',
          division: staff?.division || 'Server and Cashier'
        };
      }
    } catch (e) {}
  }

  if (!shift && shiftId && !isShiftUuid) {
    try { shift = db.prepare('SELECT s.*, st.venue, st.division, st.shift_start FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shiftId); } catch {}
  }
  if (!shift && staff) {
    try { shift = db.prepare("SELECT s.*, st.venue, st.division, st.shift_start FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.staff_id = ? AND s.status != 'COMPLETED' ORDER BY s.id DESC LIMIT 1").get(staff.id); } catch {}
  }

  // Cloud fallback if shift is missing in SQLite
  if (!shift && isSupabaseConfigured && staff?.uuid) {
    try {
      const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('staff_id', staff.uuid)
        .eq('status', 'ON_BREAK')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        shift = {
          id: data.id,
          supabase_id: data.id,
          staff_id: staff.id,
          status: data.status,
          break_status: 'ON_BREAK',
          break_start_time: data.created_at,
          flags: JSON.stringify(data.flags || []),
          venue: staff.venue,
          division: staff.division
        };
      }
    } catch (e) {}
  }

  if (!shift) return res.status(404).json({ error: 'Shift aktif tidak ditemukan.' });
  if (shift.break_status !== 'ON_BREAK') {
    return res.status(400).json({ error: 'Anda belum memulai waktu istirahat.' });
  }
  if (!photoBase64) return res.status(400).json({ error: 'Foto selfie selesai istirahat wajib diambil.' });

  const photoUrl = await savePhoto(photoBase64, `break_end_${shift.staff_id}`);
  const endTime = timestamp || new Date().toISOString();
  const startTime = shift.break_start_time ? new Date(shift.break_start_time).getTime() : Date.now();
  const durationMinutes = Math.max(0, Math.round((new Date(endTime).getTime() - startTime) / (1000 * 60)));

  // Determine max break end
  let maxBreakEnd = '16:00';
  try {
    const schedule = db.prepare(`
      SELECT max_break_end FROM shift_schedules 
      WHERE venue = ? AND division = ? AND start_time = ?
      LIMIT 1
    `).get(shift.venue, shift.division, shift.scheduled_start);
    maxBreakEnd = schedule?.max_break_end || (shift.scheduled_start?.startsWith('18') ? '01:00' : '16:00');
  } catch {}

  let flags = [];
  try {
    flags = JSON.parse(shift.flags || '[]');
  } catch {
    flags = [];
  }

  const updatedFlags = evaluateBreakFlags({
    durationMinutes,
    maxBreakEnd,
    breakEndTime: endTime,
    existingFlags: flags
  });

  try {
    db.prepare(`
      UPDATE shifts SET
        break_status = 'COMPLETED',
        break_end_time = ?,
        break_end_photo = ?,
        break_duration_minutes = ?,
        break_count = 1,
        flags = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(endTime, photoUrl, durationMinutes, JSON.stringify(updatedFlags), shift.id);
  } catch {}

  if (isSupabaseConfigured) {
    try {
      await cloudDb.recordBreakEnd({
        attendanceId: shift.supabase_id || shift.id,
        staffId: staff?.uuid || staff?.id,
        photoUrl,
        durationMinutes
      });
    } catch (e) {
      console.warn('Supabase Break End Cloud Sync Note:', e.message);
    }
  }

  let updatedShift = null;
  try {
    updatedShift = db.prepare('SELECT s.*, st.name as staff_name, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shift.id);
  } catch {}

  if (updatedShift) {
    updatedShift.flags = updatedFlags;
  } else {
    updatedShift = {
      ...shift,
      break_status: 'COMPLETED',
      break_end_time: endTime,
      break_end_photo: photoUrl,
      break_duration_minutes: durationMinutes,
      flags: updatedFlags
    };
  }

  broadcastEvent('SHIFT_UPDATE', { action: 'BREAK_END', shift: updatedShift });

  res.json({
    success: true,
    message: `Istirahat Selesai! Durasi: ${durationMinutes} menit. Selamat kembali bertugas!`,
    shift: updatedShift,
    durationMinutes
  });
});

// 13. Staff Check-Out
router.post('/checkout', async (req, res) => {
  const { shiftId, staffId, pin, lat, lng, accuracy, photoBase64, timestamp, notes } = req.body;

  let staff = null;
  if (isSupabaseConfigured) {
    const supaStaff = await findStaffInSupabase(staffId);
    if (supaStaff) {
      staff = { ...supaStaff, id: supaStaff.legacy_code || supaStaff.id, uuid: supaStaff.id };
    }
  }
  if (!staff) {
    staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  }

  let shift = null;

  // 1. Direct Supabase Cloud lookup by shiftId if it's a UUID
  const isShiftUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(shiftId || ''));
  if (isShiftUuid && isSupabaseConfigured) {
    try {
      const { data: cloudShift } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('id', shiftId)
        .maybeSingle();

      if (cloudShift) {
        let parsedNotes = {};
        try { parsedNotes = JSON.parse(cloudShift.notes || '{}'); } catch {}
        shift = {
          id: cloudShift.id,
          supabase_id: cloudShift.id,
          staff_id: staff?.id || staffId,
          checkin_time: cloudShift.check_in_time,
          status: cloudShift.status,
          flags: JSON.stringify(cloudShift.flags || []),
          scheduled_start: parsedNotes.scheduled_start || staff?.shift_start || '13:00',
          scheduled_end: parsedNotes.scheduled_end || staff?.shift_end || '22:00',
          standard_hours: staff?.standard_hours || 8.5,
          venue: staff?.venue || 'JP Karaoke',
          division: staff?.division || 'Server and Cashier',
          pin: staff?.pin
        };
      }
    } catch (e) {
      console.warn('Supabase checkout shiftId lookup note:', e.message);
    }
  }

  // 2. Local SQLite lookup if not found yet
  if (!shift && shiftId && !isShiftUuid) {
    try {
      shift = db.prepare('SELECT s.*, st.standard_hours, st.pin, st.is_active, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shiftId);
    } catch {}
  }

  if (!shift && staff) {
    try {
      shift = db.prepare("SELECT s.*, st.standard_hours, st.pin, st.is_active, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.staff_id = ? AND s.status != 'COMPLETED' ORDER BY s.id DESC LIMIT 1").get(staff.id);
    } catch {}
  }

  // 3. Fallback to Supabase Cloud active shift by staff UUID
  if (!shift && isSupabaseConfigured && staff?.uuid) {
    try {
      const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('staff_id', staff.uuid)
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        let parsedNotes = {};
        try { parsedNotes = JSON.parse(data.notes || '{}'); } catch {}
        shift = {
          id: data.id,
          supabase_id: data.id,
          staff_id: staff.id,
          checkin_time: data.check_in_time,
          status: data.status,
          flags: JSON.stringify(data.flags || []),
          scheduled_start: parsedNotes.scheduled_start || staff.shift_start || '13:00',
          scheduled_end: parsedNotes.scheduled_end || staff.shift_end || '22:00',
          standard_hours: staff.standard_hours || 8.5,
          venue: staff.venue,
          division: staff.division,
          pin: staff.pin
        };
      }
    } catch (e) {
      console.warn('Supabase checkout staff.uuid fallback note:', e.message);
    }
  }

  if (!shift) return res.status(404).json({ error: 'Tidak ditemukan shift aktif untuk Check-Out.' });
  if (pin && shift.pin && shift.pin !== pin.trim()) return res.status(401).json({ error: 'PIN Rahasia salah.' });
  if (!photoBase64) return res.status(400).json({ error: 'Foto selfie keluar wajib diambil.' });

  // Network info (Informational only - Wi-Fi lock disabled as requested)
  const clientIp = getClientIp(req);
  const wifiValidation = { isMatch: true, matchedSubnet: 'ALL_NETWORKS' };

  // Geofence Check
  const venueLat = getSetting('venue_lat');
  const venueLng = getSetting('venue_lng');
  const geofenceRadius = getSetting('geofence_radius') || 150;
  const userLat = lat != null ? parseFloat(lat) : null;
  const userLng = lng != null ? parseFloat(lng) : null;
  const distance = calculateDistanceMeters(userLat, userLng, venueLat, venueLng);

  // Time & Duration
  const checkoutTime = timestamp || new Date().toISOString();
  const startTime = new Date(shift.checkin_time).getTime();
  const endTime = new Date(checkoutTime).getTime();
  const durationMinutes = Math.max(0, Math.round((endTime - startTime) / (1000 * 60)));

  let existingFlags = [];
  try {
    existingFlags = JSON.parse(shift.flags || '[]');
  } catch {
    existingFlags = [];
  }

  let isFlexible = shift.division === 'Management' ? 1 : 0;
  let scheduledStart = shift.scheduled_start;
  let scheduledEnd = shift.scheduled_end;

  try {
    const schedule = db.prepare(`
      SELECT is_flexible_checkout, start_time, end_time FROM shift_schedules 
      WHERE venue = ? AND division = ? AND start_time = ?
      LIMIT 1
    `).get(shift.venue, shift.division, shift.scheduled_start);
    if (schedule) {
      isFlexible = schedule.is_flexible_checkout ? 1 : 0;
      if (schedule.end_time) scheduledEnd = schedule.end_time;
    }
  } catch {}

  if (isSupabaseConfigured) {
    try {
      const { data: supaSched } = await supabase
        .from('shift_schedules')
        .select('is_flexible_checkout, end_time, start_time')
        .eq('venue', shift.venue)
        .eq('division', shift.division)
        .eq('start_time', scheduledStart)
        .maybeSingle();
      if (supaSched) {
        isFlexible = supaSched.is_flexible_checkout ? 1 : 0;
        if (supaSched.end_time) scheduledEnd = supaSched.end_time;
      }
    } catch {}
  }

  if (scheduledEnd === '03:00' || scheduledEnd === '03:30' || shift.division === 'Management') {
    isFlexible = 1;
  }

  const finalFlags = evaluateCheckoutFlags({
    checkinTime: shift.checkin_time,
    checkoutTime,
    scheduledStart,
    scheduledEnd,
    scheduledHours: shift.standard_hours || 8.5,
    isFlexibleCheckout: isFlexible,
    clientIp,
    lat: userLat,
    lng: userLng,
    distance,
    wifiPass: wifiValidation.isMatch,
    geofenceRadius,
    existingFlags,
    division: shift.division
  });

  const photoUrl = await savePhoto(photoBase64, `out_${shift.staff_id}`);

  try {
    db.prepare(`
      UPDATE shifts SET
        checkout_time = ?,
        checkout_lat = ?,
        checkout_lng = ?,
        checkout_accuracy = ?,
        checkout_distance = ?,
        checkout_photo = ?,
        checkout_ip = ?,
        checkout_wifi_pass = ?,
        duration_minutes = ?,
        status = 'COMPLETED',
        flags = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      checkoutTime,
      userLat,
      userLng,
      accuracy || null,
      distance,
      photoUrl,
      clientIp,
      wifiValidation.isMatch ? 1 : 0,
      durationMinutes,
      JSON.stringify(finalFlags),
      notes || null,
      shift.id
    );
  } catch {}

  if (isSupabaseConfigured) {
    try {
      await cloudDb.recordCheckout({
        attendanceId: shift.supabase_id || shift.id,
        staffId: staff?.uuid || staff?.id,
        userLat,
        userLng,
        accuracy,
        distance,
        photoUrl,
        clientIp,
        wifiPass: wifiValidation.isMatch,
        durationMinutes,
        flags: finalFlags,
        notes
      });
    } catch (e) {
      console.warn('Supabase Checkout Cloud Sync Note:', e.message);
    }
  }

  let updatedShift = null;
  try {
    updatedShift = db.prepare(`
      SELECT s.*, st.name as staff_name, st.venue, st.division, st.role, st.department
      FROM shifts s
      JOIN staff st ON s.staff_id = st.id
      WHERE s.id = ?
    `).get(shift.id);
  } catch {}

  if (updatedShift) {
    updatedShift.flags = finalFlags;
  } else {
    updatedShift = {
      ...shift,
      checkout_time: checkoutTime,
      checkout_photo: photoUrl,
      duration_minutes: durationMinutes,
      status: 'COMPLETED',
      flags: finalFlags
    };
  }

  broadcastEvent('SHIFT_UPDATE', { action: 'CHECKOUT', shift: updatedShift });

  res.json({
    success: true,
    message: 'Absensi Keluar Berhasil Dicatat! Shift selesai.',
    shift: updatedShift,
    flags: finalFlags
  });
});

// 14. Manager Shifts List with Advanced Filters
router.get('/shifts', async (req, res) => {
  auditOpenShifts();

  // Primary: Supabase Cloud (authoritative & persistent across serverless containers)
  if (isSupabaseConfigured) {
    try {
      const cloudShifts = await cloudDb.getShifts(req.query);
      if (cloudShifts !== null) {
        return res.json(cloudShifts);
      }
    } catch (e) {
      console.warn('Supabase cloud shifts fetch note, falling back to SQLite:', e.message);
    }
  }

  const { startDate, endDate, venue, department, flagFilter, search } = req.query;

  let query = `
    SELECT 
      s.*, 
      st.name as staff_name, 
      st.venue as staff_venue,
      st.division as staff_division,
      st.role as staff_role, 
      st.department as staff_department,
      st.standard_hours
    FROM shifts s
    JOIN staff st ON s.staff_id = st.id
    WHERE 1=1
  `;
  const params = [];

  if (startDate) {
    query += ` AND s.date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND s.date <= ?`;
    params.push(endDate);
  }
  if (venue && venue !== 'ALL') {
    query += ` AND st.venue = ?`;
    params.push(venue);
  }
  if (department && department !== 'ALL') {
    query += ` AND (st.department = ? OR st.division = ?)`;
    params.push(department, department);
  }
  if (search) {
    query += ` AND (st.name LIKE ? OR s.staff_id LIKE ? OR st.role LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY s.id DESC`;

  const rows = db.prepare(query).all(...params);

  let processed = rows.map(r => ({
    ...r,
    flags: JSON.parse(r.flags || '[]')
  }));

  if (flagFilter === 'FLAGS_ONLY') {
    processed = processed.filter(r => r.flags.length > 0);
  } else if (flagFilter === 'NORMAL_ONLY') {
    processed = processed.filter(r => r.flags.length === 0);
  }

  res.json(processed);
});

// 15. Manager KPI Stats
router.get('/stats', async (req, res) => {
  auditOpenShifts();

  // Primary: Supabase Cloud (authoritative & persistent across serverless containers)
  if (isSupabaseConfigured) {
    try {
      const cloudStats = await cloudDb.getStats();
      if (cloudStats !== null) {
        return res.json({
          ...cloudStats,
          venueName: getSetting('venue_name')
        });
      }
    } catch (e) {
      console.warn('Supabase cloud stats fetch note, falling back to SQLite:', e.message);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const todayShifts = db.prepare(`
    SELECT s.*, st.venue, st.department 
    FROM shifts s 
    JOIN staff st ON s.staff_id = st.id 
    WHERE s.date = ?
  `).all(todayStr);

  const activeCount = todayShifts.filter(s => s.status !== 'COMPLETED').length;
  const onBreakCount = todayShifts.filter(s => s.break_status === 'ON_BREAK').length;
  const completedCount = todayShifts.filter(s => s.status === 'COMPLETED').length;

  let totalFlags = 0;
  let wifiMatchPasses = 0;
  let totalEvents = 0;

  for (const s of todayShifts) {
    const flags = JSON.parse(s.flags || '[]');
    totalFlags += flags.length;

    if (s.checkin_wifi_pass != null) {
      totalEvents++;
      if (s.checkin_wifi_pass === 1) wifiMatchPasses++;
    }
    if (s.checkout_wifi_pass != null) {
      totalEvents++;
      if (s.checkout_wifi_pass === 1) wifiMatchPasses++;
    }
  }

  const wifiComplianceRate = totalEvents > 0 ? Math.round((wifiMatchPasses / totalEvents) * 100) : 100;

  res.json({
    todayDate: todayStr,
    totalToday: todayShifts.length,
    activeShifts: activeCount,
    onBreakShifts: onBreakCount,
    completedShifts: completedCount,
    flaggedAnomalies: totalFlags,
    wifiComplianceRate,
    venueName: getSetting('venue_name')
  });
});

// 16. Venue Settings GET / PUT
router.get('/settings', async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const { data: cloudSettings, error } = await supabase.from('app_settings').select('*');
      if (!error && cloudSettings && cloudSettings.length > 0) {
        for (const item of cloudSettings) {
          setSetting(item.key, item.value);
        }
      }
    } catch (e) {
      console.warn('Supabase settings fetch note:', e.message);
    }
  }

  res.json({
    venue_name: getSetting('venue_name'),
    venue_lat: getSetting('venue_lat'),
    venue_lng: getSetting('venue_lng'),
    geofence_radius: getSetting('geofence_radius'),
    allowed_subnets: getSetting('allowed_subnets'),
    enforce_wifi: getSetting('enforce_wifi'),
    timezone: getSetting('timezone')
  });
});

router.put('/settings', async (req, res) => {
  const { venue_name, venue_lat, venue_lng, geofence_radius, allowed_subnets, enforce_wifi } = req.body;

  if (venue_name !== undefined) setSetting('venue_name', venue_name);
  if (venue_lat !== undefined) setSetting('venue_lat', parseFloat(venue_lat));
  if (venue_lng !== undefined) setSetting('venue_lng', parseFloat(venue_lng));
  if (geofence_radius !== undefined) setSetting('geofence_radius', parseInt(geofence_radius, 10));
  if (allowed_subnets !== undefined) setSetting('allowed_subnets', allowed_subnets);
  if (enforce_wifi !== undefined) setSetting('enforce_wifi', enforce_wifi ? 1 : 0);

  // Sync directly to Supabase Cloud app_settings
  if (isSupabaseConfigured) {
    try {
      const upsertItems = [];
      if (venue_name !== undefined) upsertItems.push({ key: 'venue_name', value: venue_name });
      if (venue_lat !== undefined) upsertItems.push({ key: 'venue_lat', value: parseFloat(venue_lat) });
      if (venue_lng !== undefined) upsertItems.push({ key: 'venue_lng', value: parseFloat(venue_lng) });
      if (geofence_radius !== undefined) upsertItems.push({ key: 'geofence_radius', value: parseInt(geofence_radius, 10) });
      if (allowed_subnets !== undefined) upsertItems.push({ key: 'allowed_subnets', value: allowed_subnets });
      if (enforce_wifi !== undefined) upsertItems.push({ key: 'enforce_wifi', value: enforce_wifi ? 1 : 0 });

      for (const item of upsertItems) {
        await supabase.from('app_settings').upsert({
          key: item.key,
          value: item.value,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Supabase cloud settings save note:', err.message);
    }
  }

  broadcastEvent('SETTINGS_UPDATE', { message: 'Settings modified' });
  res.json({ success: true, message: 'Venue settings updated' });
});

// Real-Time Monthly Staff Leaderboard (Attendance & Restroom Inspection)
router.get('/leaderboard', async (req, res) => {
  try {
    const { month } = req.query;
    const data = await computeLeaderboard(month);
    res.json(data);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Gagal memuat data leaderboard: ' + err.message });
  }
});

export default router;
