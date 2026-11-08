import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, getSetting, setSetting, uploadsDir } from './db.js';
import { calculateDistanceMeters, isWithinGeofence } from './geofence.js';
import { getClientIp, validateClientNetwork } from './network.js';
import { evaluateCheckinFlags, evaluateCheckoutFlags, evaluateBreakFlags, auditOpenShifts, FLAG_TYPES } from './flags.js';
import { isSupabaseConfigured, uploadPhotoToSupabase, cloudDb, supabase } from './supabase.js';
import { detectShiftSchedule, getBreakCutoff, isBreakAllowedNow, getWitaTimeString } from './shifts.js';

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

// 1. Admin PIN Verification Endpoint (PIN: 8080)
router.post('/admin/verify', (req, res) => {
  const { pin } = req.body;
  const adminPin = getSetting('admin_pin') || '8080';

  if (!pin || pin.trim() !== adminPin.trim()) {
    return res.status(401).json({ error: 'Invalid Manager PIN' });
  }

  res.json({
    success: true,
    message: 'Manager authenticated successfully',
    token: 'admin-authorized-session-token'
  });
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
  let query = 'SELECT id, name, venue, division, role, department, shift_start, shift_end, standard_hours, is_active FROM staff WHERE is_active = 1';
  const params = [];

  if (venue && venue !== 'ALL') {
    query += ' AND venue = ?';
    params.push(venue);
  }

  query += ' ORDER BY venue ASC, division ASC, name ASC';
  let staff = db.prepare(query).all(...params);

  // Fallback to Supabase if SQLite has no records (e.g. serverless cold start)
  if ((!staff || staff.length === 0) && isSupabaseConfigured) {
    try {
      let supaQuery = supabase
        .from('staff')
        .select('id, legacy_code, name, venue, division, role, department, shift_start, shift_end, standard_hours, is_active')
        .eq('is_active', true);
      if (venue && venue !== 'ALL') {
        supaQuery = supaQuery.ilike('venue', `%${venue.replace('JP Karaoke', 'JP')}%`);
      }
      const { data } = await supaQuery.order('venue', { ascending: true }).order('name', { ascending: true });
      if (data && data.length > 0) {
        staff = data.map(s => ({ ...s, id: s.legacy_code || s.id }));
      }
    } catch (e) {
      console.warn('Supabase staff fallback note:', e.message);
    }
  }

  res.json(staff);
});

// 5. Manager Admin Staff Roster
router.get('/staff/admin', async (req, res) => {
  let staff = db.prepare(`
    SELECT 
      st.*,
      (SELECT MAX(s.checkin_time) FROM shifts s WHERE s.staff_id = st.id) as last_shift_time
    FROM staff st 
    ORDER BY st.venue ASC, st.is_active DESC, st.name ASC
  `).all();

  // Fallback to Supabase if SQLite has no records (e.g. serverless cold start)
  if ((!staff || staff.length === 0) && isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .order('venue', { ascending: true })
        .order('is_active', { ascending: false })
        .order('name', { ascending: true });
      if (data && data.length > 0) {
        staff = data.map(s => ({ ...s, id: s.legacy_code || s.id }));
      }
    } catch (e) {
      console.warn('Supabase admin staff fallback note:', e.message);
    }
  }

  res.json(staff);
});

// 6. Kiosk PIN Verification (PIN Only or StaffId + PIN)
router.post('/staff/verify-pin', async (req, res) => {
  const { staffId, pin } = req.body;

  if (!pin || !pin.trim()) {
    return res.status(400).json({ error: 'PIN wajib diisi.' });
  }

  const cleanPin = pin.trim();
  let staff;

  if (staffId) {
    staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  } else {
    // Direct lookup by PIN across active staff
    staff = db.prepare('SELECT * FROM staff WHERE pin = ? AND is_active = 1').get(cleanPin);
  }

  // Fallback to Supabase Cloud if not found in SQLite
  if (!staff && isSupabaseConfigured) {
    try {
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
    } catch (e) {
      console.warn('Supabase pin query error:', e.message);
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
    let assignedId = req.body.id;
    if (!assignedId) {
      const maxRow = db.prepare("SELECT id FROM staff WHERE id LIKE 'STF-%' ORDER BY id DESC LIMIT 1").get();
      let nextNum = 1;
      if (maxRow && maxRow.id) {
        const match = maxRow.id.match(/\d+/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }
      assignedId = `STF-${String(nextNum).padStart(3, '0')}`;
    }

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

    db.prepare(`
      INSERT INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active)
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

    // Sync to Supabase Cloud
    if (isSupabaseConfigured) {
      try {
        await supabase.from('staff').insert({
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
        });
      } catch (e) {
        console.warn('Supabase staff insert note:', e.message);
      }
    }

    broadcastEvent('STAFF_UPDATE', { action: 'CREATED', staffId: assignedId });
    res.json({ success: true, message: 'Staff member provisioned successfully', id: assignedId, pin: assignedPin });
  } catch (err) {
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

  const result = db.prepare('UPDATE staff SET pin = ? WHERE id = ?').run(pin.trim(), id);

  if (isSupabaseConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await supabase.from('staff').update({ pin: pin.trim() }).eq('id', id);
      } else {
        await supabase.from('staff').update({ pin: pin.trim() }).eq('legacy_code', id);
      }
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
  const result = db.prepare('UPDATE staff SET is_active = ? WHERE id = ?').run(statusVal, id);

  if (isSupabaseConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await supabase.from('staff').update({ is_active: statusVal === 1 }).eq('id', id);
      } else {
        await supabase.from('staff').update({ is_active: statusVal === 1 }).eq('legacy_code', id);
      }
    } catch (e) {
      console.warn('Supabase status update note:', e.message);
    }
  }

  broadcastEvent('STAFF_UPDATE', { action: 'STATUS_TOGGLED', staffId: id, is_active: statusVal });
  res.json({ success: true, message: `Staff status changed to ${statusVal ? 'Active' : 'Suspended'}.` });
});

// 10. Staff Check-In
router.post('/checkin', async (req, res) => {
  const { staffId, pin, lat, lng, accuracy, photoBase64, timestamp, confirmedShift } = req.body;

  if (!staffId) return res.status(400).json({ error: 'Karyawan wajib dipilih.' });
  if (!photoBase64) return res.status(400).json({ error: 'Foto selfie langsung wajib diambil.' });

  const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  if (!staff) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
  if (!staff.is_active) return res.status(403).json({ error: 'Akun dinonaktifkan. Hubungi Manajer / HR.' });
  if (pin && staff.pin && staff.pin !== pin.trim()) return res.status(401).json({ error: 'PIN Rahasia salah.' });

  const existingActive = db.prepare("SELECT id FROM shifts WHERE staff_id = ? AND status != 'COMPLETED'").get(staffId);
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

  const photoUrl = await savePhoto(photoBase64, `in_${staffId}`);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const checkinTime = timestamp || now.toISOString();

  // Shift schedule determination (from staff confirmation dialog or 30-min window detection)
  let scheduledStart = confirmedShift?.start_time;
  let scheduledEnd = confirmedShift?.end_time;

  if (!scheduledStart) {
    const schedules = db.prepare(`
      SELECT * FROM shift_schedules 
      WHERE venue = ? AND division = ?
      ORDER BY shift_number ASC
    `).all(staff.venue, staff.division);

    const matchedSchedule = detectShiftSchedule(schedules, checkinTime);
    scheduledStart = matchedSchedule ? matchedSchedule.start_time : (staff.shift_start || '13:00');
    scheduledEnd = matchedSchedule ? matchedSchedule.end_time : (staff.shift_end || '22:00');
  }

  const flags = evaluateCheckinFlags({
    clientIp,
    lat: userLat,
    lng: userLng,
    distance,
    wifiPass: wifiValidation.isMatch,
    geofenceRadius,
    scheduledStart,
    checkinTime
  });

  const result = db.prepare(`
    INSERT INTO shifts (
      staff_id, date, scheduled_start, scheduled_end,
      checkin_time, checkin_lat, checkin_lng, checkin_accuracy,
      checkin_distance, checkin_photo, checkin_ip, checkin_wifi_pass,
      status, flags
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      'IN_PROGRESS', ?
    )
  `).run(
    staffId,
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
    JSON.stringify(flags)
  );

  // Sync to Supabase Cloud if connected
  if (isSupabaseConfigured) {
    try {
      await cloudDb.recordCheckin({
        staffId,
        userLat,
        userLng,
        accuracy,
        distance,
        photoUrl,
        clientIp,
        wifiPass: wifiValidation.isMatch,
        flags
      });
    } catch (e) {
      console.warn('Supabase Checkin Cloud Sync Note:', e.message);
    }
  }

  const newShift = db.prepare(`
    SELECT s.*, st.name as staff_name, st.venue, st.division, st.role, st.department
    FROM shifts s
    JOIN staff st ON s.staff_id = st.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);
  newShift.flags = flags;

  broadcastEvent('SHIFT_UPDATE', { action: 'CHECKIN', shift: newShift });

  res.json({
    success: true,
    message: 'Absensi Masuk Berhasil Dicatat!',
    shift: newShift,
    flags
  });
});

// 11. Staff Start Break
router.post('/break/start', async (req, res) => {
  const { shiftId, staffId, pin, photoBase64, timestamp, lat, lng } = req.body;

  const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  if (!staff) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });

  let shift;
  if (shiftId) {
    shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId);
  } else {
    shift = db.prepare("SELECT * FROM shifts WHERE staff_id = ? AND status != 'COMPLETED' ORDER BY id DESC LIMIT 1").get(staffId);
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

  const photoUrl = await savePhoto(photoBase64, `break_start_${staffId}`);
  const startTime = timestamp || new Date().toISOString();

  db.prepare(`
    UPDATE shifts SET
      break_status = 'ON_BREAK',
      break_start_time = ?,
      break_start_photo = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(startTime, photoUrl, shift.id);

  if (isSupabaseConfigured) {
    try {
      await cloudDb.recordBreakStart({ attendanceId: shift.id, staffId, photoUrl });
    } catch (e) {
      console.warn('Supabase Break Start Cloud Sync Note:', e.message);
    }
  }

  const updatedShift = db.prepare('SELECT s.*, st.name as staff_name, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shift.id);
  updatedShift.flags = JSON.parse(updatedShift.flags || '[]');

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

  let shift;
  if (shiftId) {
    shift = db.prepare('SELECT s.*, st.venue, st.division, st.shift_start FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shiftId);
  } else {
    shift = db.prepare("SELECT s.*, st.venue, st.division, st.shift_start FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.staff_id = ? AND s.status != 'COMPLETED' ORDER BY s.id DESC LIMIT 1").get(staffId);
  }

  if (!shift) return res.status(404).json({ error: 'Shift aktif tidak ditemukan.' });
  if (shift.break_status !== 'ON_BREAK' || !shift.break_start_time) {
    return res.status(400).json({ error: 'Anda belum memulai waktu istirahat.' });
  }
  if (!photoBase64) return res.status(400).json({ error: 'Foto selfie selesai istirahat wajib diambil.' });

  const photoUrl = await savePhoto(photoBase64, `break_end_${shift.staff_id}`);
  const endTime = timestamp || new Date().toISOString();
  const startTime = new Date(shift.break_start_time).getTime();
  const durationMinutes = Math.max(0, Math.round((new Date(endTime).getTime() - startTime) / (1000 * 60)));

  // Determine max break end for this auto-detected shift
  const schedule = db.prepare(`
    SELECT max_break_end FROM shift_schedules 
    WHERE venue = ? AND division = ? AND start_time = ?
    LIMIT 1
  `).get(shift.venue, shift.division, shift.scheduled_start);

  const maxBreakEnd = schedule?.max_break_end || (shift.scheduled_start?.startsWith('18') ? '01:00' : '16:00');

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

  if (isSupabaseConfigured) {
    try {
      await cloudDb.recordBreakEnd({ attendanceId: shift.id, photoUrl, durationMinutes });
    } catch (e) {
      console.warn('Supabase Break End Cloud Sync Note:', e.message);
    }
  }

  const updatedShift = db.prepare('SELECT s.*, st.name as staff_name, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shift.id);
  updatedShift.flags = updatedFlags;

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

  let shift;
  if (shiftId) {
    shift = db.prepare('SELECT s.*, st.standard_hours, st.pin, st.is_active, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.id = ?').get(shiftId);
  } else if (staffId) {
    shift = db.prepare("SELECT s.*, st.standard_hours, st.pin, st.is_active, st.venue, st.division FROM shifts s JOIN staff st ON s.staff_id = st.id WHERE s.staff_id = ? AND s.status != 'COMPLETED' ORDER BY s.id DESC LIMIT 1").get(staffId);
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

  // Check if shift is flexible checkout
  const schedule = db.prepare(`
    SELECT is_flexible_checkout FROM shift_schedules 
    WHERE venue = ? AND division = ? AND start_time = ?
    LIMIT 1
  `).get(shift.venue, shift.division, shift.scheduled_start);

  const isFlexible = schedule?.is_flexible_checkout || (shift.scheduled_end === '03:00' ? 1 : 0);

  const finalFlags = evaluateCheckoutFlags({
    checkinTime: shift.checkin_time,
    checkoutTime,
    scheduledHours: shift.standard_hours,
    isFlexibleCheckout: isFlexible,
    clientIp,
    lat: userLat,
    lng: userLng,
    distance,
    wifiPass: wifiValidation.isMatch,
    geofenceRadius,
    existingFlags
  });

  const photoUrl = await savePhoto(photoBase64, `out_${shift.staff_id}`);

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

  if (isSupabaseConfigured) {
    try {
      await cloudDb.recordCheckout({
        attendanceId: shift.id,
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

  const updatedShift = db.prepare(`
    SELECT s.*, st.name as staff_name, st.venue, st.division, st.role, st.department
    FROM shifts s
    JOIN staff st ON s.staff_id = st.id
    WHERE s.id = ?
  `).get(shift.id);
  updatedShift.flags = finalFlags;

  broadcastEvent('SHIFT_UPDATE', { action: 'CHECKOUT', shift: updatedShift });

  res.json({
    success: true,
    message: 'Absensi Keluar Berhasil Dicatat! Shift selesai.',
    shift: updatedShift,
    flags: finalFlags
  });
});

// 14. Manager Shifts List with Advanced Filters
router.get('/shifts', (req, res) => {
  auditOpenShifts();

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
router.get('/stats', (req, res) => {
  auditOpenShifts();

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

export default router;
