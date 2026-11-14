import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, getSetting, setSetting, uploadsDir } from './db.js';
import { calculateDistanceMeters, isWithinGeofence } from './geofence.js';
import { getClientIp, validateClientNetwork } from './network.js';
import { evaluateCheckinFlags, evaluateCheckoutFlags, evaluateBreakFlags, auditOpenShifts, FLAG_TYPES } from './flags.js';
import { isSupabaseConfigured, uploadPhotoToSupabase, resolveAttendancePhotoUrls, cloudDb, supabase, findStaffInSupabase } from './supabase.js';
import { detectShiftSchedule, getBreakCutoff, isBreakAllowedNow, getWitaTimeString, getWitaDateYMD, getOperationalDateYMD, getOperationalYesterdayYMD, getPointCycleInfo, getPointCycleFromKey, getRecentPointCycles } from './shifts.js';
import { computeLeaderboard } from './leaderboard.js';
import { getVapidPublicKey, savePushSubscription, sendPushNotification } from './push.js';
import { createSystemSnapshot, listSystemBackups, restoreSystemSnapshot } from './backup.js';
import { verifyFaceMatch } from './faceBiometrics.js';

const router = express.Router();

// Real-Time Server-Sent Events (SSE) Client Pool & Supabase Realtime Broadcast
const sseClients = new Set();
let realtimeChannel = null;
if (isSupabaseConfigured && supabase) {
  try {
    realtimeChannel = supabase.channel('app-realtime');
    realtimeChannel.subscribe();
  } catch {}
}

export function broadcastEvent(eventType, data = {}) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }

  // Cross-instance Realtime Broadcast over Supabase (Zero Vercel provisioned memory cost)
  if (isSupabaseConfigured && supabase) {
    try {
      const channel = realtimeChannel || supabase.channel('app-realtime');
      channel.send({
        type: 'broadcast',
        event: eventType,
        payload: { ...data, timestamp: Date.now() }
      }).catch(() => {});
    } catch {}
  }
}

// SSE Connection Endpoint (Migrated to direct Supabase Realtime; closes immediately to avoid holding serverless functions open)
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'close'
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Live Sync active via Supabase Realtime' })}\n\n`);
  res.end();
});

// ==========================================
// PUSH NOTIFICATION ROUTES
// ==========================================

// 1. Get VAPID Public Key for client subscription
router.get('/push/vapid-key', async (req, res) => {
  try {
    const publicKey = await getVapidPublicKey();
    res.json({ publicKey });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat kunci notifikasi: ' + err.message });
  }
});

// 2. Subscribe staff device to push notifications
router.post('/push/subscribe', async (req, res) => {
  const { staffId, subscription, userAgent } = req.body;
  if (!staffId || !subscription) {
    return res.status(400).json({ error: 'staffId dan subscription wajib disertakan.' });
  }
  try {
    const result = await savePushSubscription({ staffId, subscription, userAgent });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Send test push notification
router.post('/push/test', async (req, res) => {
  const { staffId } = req.body;
  try {
    const result = await sendPushNotification({
      staffIds: staffId ? [String(staffId)] : 'ALL',
      title: '🔔 Notifikasi JP & LuckyCat Aktif!',
      body: 'Push notification berhasil terpasang di HP Anda persis seperti pesan WhatsApp.',
      url: '/',
      tag: 'test-notification'
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SYSTEM HEALTH & DISASTER RECOVERY ROUTES
// ==========================================

// 1. Health Check Endpoint
router.get('/health', async (req, res) => {
  const isSupaAlive = isSupabaseConfigured && Boolean(supabase);
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supabase: isSupaAlive,
    uptime: process.uptime(),
    venueName: getSetting('venue_name') || 'JP Karaoke & LuckyCat Outlets'
  });
});

// 2. List Disaster Recovery Backups
router.get('/admin/backups', async (req, res) => {
  try {
    const backups = await listSystemBackups();
    res.json({ success: true, backups });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Create Backup Snapshot (Manager Pin Required)
router.post('/admin/backups/snapshot', async (req, res) => {
  const { pin, createdBy } = req.body || {};
  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'Akses ditolak: PIN Manager salah.' });
  }
  try {
    const snapshot = await createSystemSnapshot(createdBy || auth.reviewerName);
    res.json(snapshot);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Restore Backup Snapshot (Manager Pin Required)
router.post('/admin/backups/restore', async (req, res) => {
  const { pin, backupId } = req.body || {};
  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'Akses ditolak: PIN Manager salah.' });
  }
  try {
    const result = await restoreSystemSnapshot(backupId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Emergency Bypass / Fault Switch Check-in (Kamera / Hardware Rusak)
router.post('/admin/emergency-bypass', async (req, res) => {
  const { pin, staffId, actionType, reason, reviewerName } = req.body || {};
  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'Akses ditolak: PIN Manager salah.' });
  }

  try {
    let staff = null;
    if (isSupabaseConfigured) {
      staff = await findStaffInSupabase(staffId);
    }
    if (!staff) {
      staff = db.prepare('SELECT * FROM staff WHERE id = ? OR name LIKE ?').get(staffId, `%${staffId}%`);
    }
    if (!staff) return res.status(404).json({ error: 'Staf tidak ditemukan.' });

    const now = new Date();
    const bypassFlags = ['FLAG_MANUAL_ADMIN_OVERRIDE'];
    const notes = {
      is_manual_override: true,
      override_reason: reason || 'Kamera/Hardware staf bermasalah',
      authorized_by: reviewerName || auth.reviewerName,
      authorized_at: now.toISOString()
    };

    if (actionType === 'checkout') {
      db.prepare(`
        UPDATE shifts
        SET checkout_time = ?, status = 'COMPLETED', flags = ?, notes = ?, updated_at = ?
        WHERE staff_id = ? AND status != 'COMPLETED'
      `).run(now.toISOString(), JSON.stringify(bypassFlags), JSON.stringify(notes), now.toISOString(), staff.id);

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('attendance_logs')
          .update({
            checkout_time: now.toISOString(),
            status: 'COMPLETED',
            flags: bypassFlags,
            notes: JSON.stringify(notes),
            updated_at: now.toISOString()
          })
          .eq('staff_id', staff.uuid || staff.id)
          .neq('status', 'COMPLETED');
      }
    } else {
      const dateStr = getOperationalDateYMD(now.toISOString());
      db.prepare(`
        INSERT INTO shifts (staff_id, date, checkin_time, checkin_lat, checkin_lng, status, flags, notes, created_at)
        VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?)
      `).run(
        staff.id,
        dateStr,
        now.toISOString(),
        getSetting('venue_lat') || -8.780981,
        getSetting('venue_lng') || 115.176863,
        JSON.stringify(bypassFlags),
        JSON.stringify(notes),
        now.toISOString()
      );

      if (isSupabaseConfigured && supabase) {
        await supabase.from('attendance_logs').insert([{
          staff_id: staff.uuid || staff.id,
          date: dateStr,
          checkin_time: now.toISOString(),
          checkin_lat: getSetting('venue_lat') || -8.780981,
          checkin_lng: getSetting('venue_lng') || 115.176863,
          status: 'IN_PROGRESS',
          flags: bypassFlags,
          notes: JSON.stringify(notes)
        }]);
      }
    }

    broadcastEvent('SHIFT_UPDATE', { action: 'BYPASS_PUNCH', staffId: staff.id });

    return res.json({
      success: true,
      message: `Otorisasi darurat (${actionType}) untuk ${staff.name} berhasil dicatat.`,
      staff: staff.name
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memproses bypass: ' + err.message });
  }
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
  if (typeof dataUrl === 'string' && (dataUrl.startsWith('http://') || dataUrl.startsWith('https://'))) {
    return dataUrl;
  }
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

// Helper: Record Admin Login Audit Trail
async function recordAdminLogin({ role, staffName, req }) {
  try {
    const now = new Date().toISOString();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userAgent = req?.headers ? (req.headers['user-agent'] || '') : '';
    const ip = req?.ip || req?.socket?.remoteAddress || '';

    // 1. Local SQLite
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS admin_login_logs (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          staff_name TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          login_at TEXT DEFAULT (datetime('now'))
        );
      `);
      db.prepare(`
        INSERT INTO admin_login_logs (id, role, staff_name, ip_address, user_agent, login_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, role, staffName, ip, userAgent, now);
    } catch (eSql) {
      console.warn('SQLite admin login log note:', eSql.message);
    }

    // 2. Cloud Supabase app_settings sync (keep last 100 entries)
    if (isSupabaseConfigured) {
      try {
        const existingLogs = (await cloudDb.getSetting('admin_login_logs')) || [];
        const updatedLogs = [
          { id, role, staff_name: staffName, ip_address: ip, user_agent: userAgent, login_at: now },
          ...existingLogs
        ].slice(0, 100);
        await cloudDb.saveSetting('admin_login_logs', updatedLogs, 'Log riwayat login Manager & Assistant Manager');
      } catch (eSupa) {
        console.warn('Supabase admin login log note:', eSupa.message);
      }
    }
  } catch (err) {
    console.warn('recordAdminLogin warning:', err.message);
  }
}

// 1. Admin PIN Verification Endpoint (Full Manager PIN: 8980 | Assistant Manager / View Only PIN: 7070 or Management Staff PIN)
router.post('/admin/verify', async (req, res) => {
  const { pin } = req.body;
  if (!pin || !pin.trim()) {
    return res.status(400).json({ error: 'PIN wajib diisi.' });
  }

  const cleanPin = pin.trim();
  let adminPin = process.env.ADMIN_PIN || getSetting('admin_pin') || '8980';
  if (isSupabaseConfigured) {
    try {
      const { data: supaPin } = await supabase.from('app_settings').select('value').eq('key', 'admin_pin').maybeSingle();
      if (supaPin?.value) {
        adminPin = typeof supaPin.value === 'string' ? supaPin.value.replace(/"/g, '') : String(supaPin.value);
      }
    } catch {}
  }
  const supervisorPin = getSetting('supervisor_pin') || '7070';

  // 1. Full Manager Check (PIN 8980)
  if (cleanPin === adminPin.trim()) {
    recordAdminLogin({ role: 'OPERATIONAL_MANAGER', staffName: 'Operational Manager', req });
    return res.json({
      success: true,
      role: 'MANAGER',
      canEdit: true,
      staffName: 'Operational Manager',
      message: 'Operational Manager Full Access authenticated successfully',
      token: 'admin-authorized-session-token'
    });
  }

  // 2. Supervisor View-Only PIN (PIN 7070)
  if (cleanPin === supervisorPin.trim()) {
    recordAdminLogin({ role: 'ASSISTANT_MANAGER', staffName: 'Assistant Manager', req });
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
          recordAdminLogin({ role: 'ASSISTANT_MANAGER', staffName: mgmtStaff.name, req });
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
      recordAdminLogin({ role: 'ASSISTANT_MANAGER', staffName: localMgmt.name, req });
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

// ==========================================
// AUDIT LOGS & LIVE PRESENCE
// ==========================================

// Get Manager & Assistant Manager Login Audit Logs (Strictly Operational Manager access)
router.get('/admin/login-logs', async (req, res) => {
  try {
    let logs = [];
    if (isSupabaseConfigured) {
      try {
        const supaLogs = await cloudDb.getSetting('admin_login_logs');
        if (Array.isArray(supaLogs) && supaLogs.length > 0) {
          logs = supaLogs;
        }
      } catch {}
    }
    if (logs.length === 0) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS admin_login_logs (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL,
            staff_name TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            login_at TEXT DEFAULT (datetime('now'))
          );
        `);
        logs = db.prepare('SELECT * FROM admin_login_logs ORDER BY login_at DESC LIMIT 100').all();
      } catch {}
    }
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat log login: ' + err.message });
  }
});

// Presence In-Memory & Cloud Cache
const presenceMap = new Map();

router.post('/presence/heartbeat', async (req, res) => {
  try {
    const { id, name, role, venue, type } = req.body || {};
    if (!id || !name) {
      return res.status(400).json({ error: 'Data kehadiran tidak lengkap (id dan name wajib).' });
    }

    const now = Date.now();
    const nowIso = new Date().toISOString();
    const entry = {
      id: String(id),
      name: String(name),
      role: role || 'Staff',
      venue: venue || 'JP Karaoke',
      type: type || 'STAFF', // 'STAFF' | 'ASSISTANT_MANAGER' | 'MANAGER'
      lastSeen: now,
      lastSeenIso: nowIso
    };

    presenceMap.set(String(id), entry);

    // Also persist to SQLite
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS staff_presence (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT,
          venue TEXT,
          last_seen TEXT NOT NULL,
          last_seen_ms INTEGER NOT NULL
        );
      `);
      db.prepare(`
        INSERT INTO staff_presence (id, type, name, role, venue, last_seen, last_seen_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          role = excluded.role,
          venue = excluded.venue,
          last_seen = excluded.last_seen,
          last_seen_ms = excluded.last_seen_ms
      `).run(entry.id, entry.type, entry.name, entry.role, entry.venue, entry.lastSeenIso, entry.lastSeen);
    } catch {}

    return res.json({ success: true, timestamp: nowIso });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Get Live Presence (All staff + Assistant Manager)
router.get('/presence', async (req, res) => {
  try {
    const now = Date.now();
    const thresholdMs = 90 * 1000; // 90 seconds = online

    // Restore from SQLite if memory is empty
    if (presenceMap.size === 0) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS staff_presence (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT,
            venue TEXT,
            last_seen TEXT NOT NULL,
            last_seen_ms INTEGER NOT NULL
          );
        `);
        const rows = db.prepare('SELECT * FROM staff_presence').all();
        for (const r of rows) {
          presenceMap.set(String(r.id), {
            id: String(r.id),
            name: r.name,
            role: r.role,
            venue: r.venue,
            type: r.type,
            lastSeen: r.last_seen_ms,
            lastSeenIso: r.last_seen
          });
        }
      } catch {}
    }

    // Load active staff roster to ensure everyone has a presence slot
    let allStaff = [];
    if (isSupabaseConfigured) {
      try {
        allStaff = (await cloudDb.getStaff('ALL')) || [];
      } catch {}
    }
    if (allStaff.length === 0) {
      allStaff = db.prepare('SELECT id, name, role, venue, is_active FROM staff WHERE is_active = 1').all();
    }

    const presenceList = [];

    // 1. Map staff members
    for (const st of allStaff) {
      const p = presenceMap.get(String(st.id));
      const isOnline = p ? (now - p.lastSeen < thresholdMs) : false;
      presenceList.push({
        id: String(st.id),
        name: st.name,
        role: st.role,
        venue: st.venue,
        type: 'STAFF',
        isOnline,
        lastSeenIso: p?.lastSeenIso || null
      });
    }

    // 2. Map Assistant Manager & Management accounts
    for (const [key, p] of presenceMap.entries()) {
      if (p.type === 'ASSISTANT_MANAGER' || p.type === 'MANAGER') {
        const isOnline = now - p.lastSeen < thresholdMs;
        presenceList.push({
          id: p.id,
          name: p.name,
          role: p.role,
          venue: p.venue,
          type: p.type,
          isOnline,
          lastSeenIso: p.lastSeenIso
        });
      }
    }

    return res.json({
      success: true,
      presence: presenceList,
      onlineCount: presenceList.filter(p => p.isOnline).length,
      totalCount: presenceList.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat status presence: ' + err.message });
  }
});

// Official Synchronized Application Time Endpoint (Prevents Phone Time Manipulation)
router.get('/server-time', (req, res) => {
  const now = new Date();
  res.json({
    serverTime: now.toISOString(),
    timestamp: now.getTime(),
    timezone: 'Asia/Makassar'
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
    allowedSubnets,
    serverTime: new Date().toISOString()
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

  // Auto-close any forgotten previous-day shifts that passed 07:00 WITA cutoff
  if (isSupabaseConfigured) {
    try {
      await cloudDb.autoCloseCutoffShifts(staff.uuid || staff.id);
    } catch {}
  }
  try {
    const curOpDate = getOperationalDateYMD(new Date());
    db.prepare(`
      UPDATE shifts 
      SET status = 'COMPLETED', updated_at = datetime('now')
      WHERE staff_id = ? AND status != 'COMPLETED' AND date < ?
    `).run(staff.id, curOpDate);
  } catch {}

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
        let supaBreak = null;
        try {
          const { data: bLog } = await supabase
            .from('break_logs')
            .select('*')
            .eq('attendance_id', supaShift.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          supaBreak = bLog;
        } catch {}

        let parsedNotes = {};
        try { parsedNotes = JSON.parse(supaShift.notes || '{}'); } catch {}

        const isOnBreak = supaShift.status === 'ON_BREAK' || supaBreak?.status === 'ON_BREAK';
        const hasCompletedBreak = supaBreak?.status === 'COMPLETED' || Boolean(supaBreak?.break_end);

        activeShift = {
          ...supaShift,
          checkin_time: supaShift.check_in_time,
          checkin_photo: supaShift.check_in_photo_url,
          flags: supaShift.flags || [],
          break_status: isOnBreak ? 'ON_BREAK' : (hasCompletedBreak ? 'COMPLETED' : 'NONE'),
          break_count: hasCompletedBreak ? 1 : 0,
          break_start_time: supaBreak?.break_start || supaShift.break_start_time || null,
          scheduled_start: supaShift.scheduled_start || parsedNotes.scheduled_start || staff.shift_start || '13:00',
          scheduled_end: supaShift.scheduled_end || parsedNotes.scheduled_end || staff.shift_end || '22:00'
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

  if (activeShift) {
    const shiftEnd = activeShift.scheduled_end || staff.shift_end || '22:00';
    const shiftStart = activeShift.scheduled_start || staff.shift_start || '13:00';
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
    const isLuckyCat = (normVenue || '').toLowerCase().includes('luckycat');
    const isManagement = staff.division === 'Management' || (staff.role && staff.role.toLowerCase().includes('manager'));
    const shiftAllowsBreak = !isManagement && (Boolean(detectedShift?.allows_break) || isLuckyCat || staff.allows_break === 1 || staff.allows_break === true);

    const breakCount = activeShift.break_count || 0;
    const isCompletedBreak = activeShift.break_status === 'COMPLETED';
    const isOnBreak = activeShift.break_status === 'ON_BREAK';

    // Break is strictly allowed once per shift: staff is checked in, shift/venue permits breaks, not yet taken, and not currently on break
    breakAllowed = shiftAllowsBreak && !isOnBreak && breakCount === 0 && !isCompletedBreak;
  } else {
    // 30-minute auto-detect candidate
    detectedShift = detectShiftSchedule(schedules, new Date());
  }

  const isLuckyCatVenue = (normVenue || '').toLowerCase().includes('luckycat');
  const staffAllowsBreak = (detectedShift?.allows_break !== 0 && detectedShift?.allows_break !== false) || isLuckyCatVenue || staff.allows_break === 1;

  if (activeShift) {
    await resolveAttendancePhotoUrls([activeShift]);
  }

  // Monthly calendar stats (Strictly current calendar month, 1st -> last day, NOT point cycle)
  const nowWitaParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());
  const witaYear = nowWitaParts.find((p) => p.type === 'year')?.value || '2026';
  const witaMonth = nowWitaParts.find((p) => p.type === 'month')?.value || '01';
  const currentYearMonth = `${witaYear}-${witaMonth}`;
  const currentOpDate = getOperationalDateYMD(new Date());

  let monthlyStats = null;
  if (isSupabaseConfigured && (staff.uuid || staff.id)) {
    monthlyStats = await cloudDb.getStaffMonthlyStats(staff.uuid || staff.id, currentYearMonth);
  }
  if (!monthlyStats) {
    try {
      const sqlLogs = db.prepare(`
        SELECT date, flags, notes
        FROM shifts
        WHERE staff_id = ? AND date >= ? AND date <= ?
      `).all(staff.id, `${currentYearMonth}-01`, `${currentYearMonth}-31`);
      const workDates = new Set();
      let lateCount = 0;
      for (const row of sqlLogs) {
        if (row.date) workDates.add(row.date);
        let rowFlags = [];
        try { rowFlags = JSON.parse(row.flags || '[]'); } catch {}
        let rowNotes = {};
        try {
          if (typeof row.notes === 'string' && row.notes.startsWith('{')) rowNotes = JSON.parse(row.notes);
        } catch {}
        const isLate = rowFlags.some((f) => String(f).toLowerCase().includes('late'));
        if (isLate && rowNotes.late_status !== 'EXCUSED') {
          lateCount += 1;
        }
      }
      monthlyStats = { workDays: workDates.size, lateCount, monthKey: currentYearMonth };
    } catch {
      monthlyStats = { workDays: 0, lateCount: 0, monthKey: currentYearMonth };
    }
  }

  // Resolve Custom Profile Photo, Official Biometric Reference & Today's Mood Emoji
  let profilesMap = getSetting('staff_profiles') || {};
  let biometricsMap = getSetting('staff_biometrics') || {};
  let moodsMap = getSetting('staff_moods') || {};
  if (isSupabaseConfigured) {
    try {
      const [pMap, bMap, mMap] = await Promise.all([
        cloudDb.getStaffProfilesMap(),
        cloudDb.getStaffBiometricsMap(),
        cloudDb.getStaffMoodsMap()
      ]);
      if (pMap && Object.keys(pMap).length > 0) profilesMap = pMap;
      if (bMap && Object.keys(bMap).length > 0) biometricsMap = bMap;
      if (mMap && Object.keys(mMap).length > 0) moodsMap = mMap;
    } catch {}
  }

  const profileEntry = profilesMap?.[staff.uuid] || profilesMap?.[staff.id] || null;
  const biometricEntry = biometricsMap?.[staff.uuid] || biometricsMap?.[staff.id] || null;
  const moodEntry = moodsMap?.[staff.uuid] || moodsMap?.[staff.id] || null;
  const staffPayload = {
    id: staff.id,
    uuid: staff.uuid || null,
    name: staff.name,
    venue: staff.venue,
    division: staff.division,
    role: staff.role,
    department: staff.department,
    shift_start: detectedShift?.start_time || staff.shift_start || '13:00',
    shift_end: detectedShift?.end_time || staff.shift_end || '22:00',
    standard_hours: staff.standard_hours,
    allows_break: staffAllowsBreak ? 1 : 0,
    break_start_time: breakStartTime,
    max_break_end: detectedShift?.max_break_end || breakCutoffTime,
    breakAllowed,
    breakCutoffTime,
    isWithin2HoursOfEnd: false,
    detectedShift: detectedShift || null,
    availableSchedules: schedules,
    profile_photo_url: profileEntry?.photo_url || null,
    face_biometrics_registered: Boolean(biometricEntry?.photo_url),
    biometric_photo_url: biometricEntry?.photo_url || null,
    mood_emoji: moodEntry && moodEntry.date_ymd === currentOpDate ? moodEntry.emoji : null,
    monthlyStats
  };

  if (staffPayload.profile_photo_url) {
    await resolveAttendancePhotoUrls([staffPayload], ['profile_photo_url']);
  }
  if (staffPayload.biometric_photo_url) {
    await resolveAttendancePhotoUrls([staffPayload], ['biometric_photo_url']);
  }

  res.json({
    success: true,
    staff: staffPayload,
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

const ALLOWED_MOOD_EMOJIS = ['😊', '🔥', '😐', '😴', '😮‍💨', '😢', '😡', '💔'];

// 9c. Staff Custom Profile Photo (Real gallery photo only, no emoji avatars)
router.post('/staff/:id/profile-photo', async (req, res) => {
  const { id } = req.params;
  const { photoBase64 } = req.body || {};

  if (!photoBase64 || typeof photoBase64 !== 'string' || !photoBase64.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Pastikan memilih file foto asli dari galeri HP Anda.' });
  }

  try {
    let staff = null;
    if (isSupabaseConfigured) {
      const supa = await findStaffInSupabase(id);
      if (supa) {
        staff = { ...supa, id: supa.legacy_code || supa.id, uuid: supa.id };
      }
    }
    if (!staff) {
      staff = db.prepare('SELECT * FROM staff WHERE id = ? OR uuid = ?').get(id, id);
    }
    if (!staff) {
      return res.status(404).json({ error: 'Staff tidak ditemukan.' });
    }

    const photoUrl = await savePhoto(photoBase64, `profile_${staff.id}`);
    if (!photoUrl) {
      return res.status(400).json({ error: 'Gagal memproses file foto profil.' });
    }

    const record = { photo_url: photoUrl, updated_at: new Date().toISOString() };
    const localMap = getSetting('staff_profiles') || {};
    const nextLocalMap = { ...localMap };
    if (staff.uuid) nextLocalMap[String(staff.uuid)] = record;
    if (staff.id) nextLocalMap[String(staff.id)] = record;
    setSetting('staff_profiles', nextLocalMap);

    if (isSupabaseConfigured) {
      await cloudDb.saveStaffProfilePhoto({
        staffId: staff.id,
        staffUuid: staff.uuid,
        photoUrl
      });
    }

    const resolvedObj = { profile_photo_url: photoUrl };
    await resolveAttendancePhotoUrls([resolvedObj], ['profile_photo_url']);

    broadcastEvent('STAFF_UPDATE', { action: 'PROFILE_PHOTO_UPDATED', staffId: staff.id });
    return res.json({
      success: true,
      message: 'Foto profil berhasil diperbarui.',
      profile_photo_url: resolvedObj.profile_photo_url
    });
  } catch (err) {
    console.error('Error saving profile photo:', err);
    return res.status(500).json({ error: 'Gagal menyimpan foto profil: ' + err.message });
  }
});

// 9e. Register Official Staff Biometric Face Reference (Liveness verified & separated from profile photo)
router.post('/staff/:id/biometrics', async (req, res) => {
  const { id } = req.params;
  const { photoBase64, livenessVerified } = req.body || {};

  if (!photoBase64) {
    return res.status(400).json({ error: 'Foto biometrik wajah wajib diambil.' });
  }

  let staff = null;
  if (isSupabaseConfigured) {
    const supaStaff = await findStaffInSupabase(id);
    if (supaStaff) staff = { ...supaStaff, id: supaStaff.legacy_code || supaStaff.id, uuid: supaStaff.id };
  }
  if (!staff) {
    staff = db.prepare('SELECT * FROM staff WHERE id = ? OR uuid = ?').get(id, id);
  }
  if (!staff) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });

  try {
    const photoUrl = await savePhoto(photoBase64, `biometric_${staff.id}`);
    if (!photoUrl) {
      return res.status(400).json({ error: 'Gagal memproses file foto biometrik.' });
    }

    const record = { photo_url: photoUrl, liveness_verified: Boolean(livenessVerified), updated_at: new Date().toISOString() };
    const localMap = getSetting('staff_biometrics') || {};
    const nextLocalMap = { ...localMap };
    if (staff.uuid) nextLocalMap[String(staff.uuid)] = record;
    if (staff.id) nextLocalMap[String(staff.id)] = record;
    setSetting('staff_biometrics', nextLocalMap);

    if (isSupabaseConfigured) {
      await cloudDb.saveStaffBiometricPhoto({
        staffId: staff.id,
        staffUuid: staff.uuid,
        photoUrl,
        livenessVerified: Boolean(livenessVerified)
      });
    }

    const resolvedObj = { biometric_photo_url: photoUrl };
    await resolveAttendancePhotoUrls([resolvedObj], ['biometric_photo_url']);

    broadcastEvent('STAFF_UPDATE', { action: 'BIOMETRICS_REGISTERED', staffId: staff.id });
    return res.json({
      success: true,
      message: 'Biometrik wajah berhasil didaftarkan.',
      biometric_photo_url: resolvedObj.biometric_photo_url
    });
  } catch (err) {
    console.error('Error registering biometrics:', err);
    return res.status(500).json({ error: 'Gagal mendaftarkan biometrik: ' + err.message });
  }
});

// 9d. Staff Daily Mood Emoji ("my mood today :" - emoji only)
router.post('/staff/:id/mood', async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body || {};

  if (!emoji || !ALLOWED_MOOD_EMOJIS.includes(String(emoji).trim())) {
    return res.status(400).json({ error: 'Pilih emoji mood yang valid.' });
  }

  const cleanEmoji = String(emoji).trim();
  const dateYmd = getOperationalDateYMD(new Date());

  try {
    let staff = null;
    if (isSupabaseConfigured) {
      const supa = await findStaffInSupabase(id);
      if (supa) {
        staff = { ...supa, id: supa.legacy_code || supa.id, uuid: supa.id };
      }
    }
    if (!staff) {
      staff = db.prepare('SELECT * FROM staff WHERE id = ? OR uuid = ?').get(id, id);
    }
    if (!staff) {
      return res.status(404).json({ error: 'Staff tidak ditemukan.' });
    }

    const record = { emoji: cleanEmoji, date_ymd: dateYmd, updated_at: new Date().toISOString() };
    const localMap = getSetting('staff_moods') || {};
    const nextLocalMap = { ...localMap };
    if (staff.uuid) nextLocalMap[String(staff.uuid)] = record;
    if (staff.id) nextLocalMap[String(staff.id)] = record;
    setSetting('staff_moods', nextLocalMap);

    // Sync to today's SQLite shift notes if already checked in
    try {
      const activeSqlShift = db.prepare('SELECT id, notes FROM shifts WHERE staff_id = ? AND date = ? ORDER BY id DESC LIMIT 1').get(staff.id, dateYmd);
      if (activeSqlShift) {
        let parsedNotes = {};
        try {
          if (typeof activeSqlShift.notes === 'string' && activeSqlShift.notes.startsWith('{')) {
            parsedNotes = JSON.parse(activeSqlShift.notes);
          }
        } catch {}
        parsedNotes.mood_emoji = cleanEmoji;
        db.prepare('UPDATE shifts SET notes = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(parsedNotes), activeSqlShift.id);
      }
    } catch {}

    if (isSupabaseConfigured) {
      await cloudDb.saveStaffMood({
        staffId: staff.id,
        staffUuid: staff.uuid,
        emoji: cleanEmoji,
        dateYmd
      });
    }

    broadcastEvent('SHIFT_UPDATE', { action: 'MOOD_UPDATED', staffId: staff.id, emoji: cleanEmoji });
    return res.json({
      success: true,
      mood_emoji: cleanEmoji,
      date_ymd: dateYmd
    });
  } catch (err) {
    console.error('Error saving staff mood:', err);
    return res.status(500).json({ error: 'Gagal menyimpan mood hari ini: ' + err.message });
  }
});

// 10. Staff Check-In
router.post('/checkin', async (req, res) => {
  const { staffId, pin, lat, lng, accuracy, photoBase64, timestamp, confirmedShift, lateReason, latePhotoBase64 } = req.body;

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

  // Auto-close any forgotten previous-day shifts that passed 07:00 WITA cutoff
  if (isSupabaseConfigured) {
    try {
      await cloudDb.autoCloseCutoffShifts(staff.uuid || staff.id);
    } catch {}
  }
  try {
    const curOpDate = getOperationalDateYMD(new Date());
    db.prepare(`
      UPDATE shifts 
      SET status = 'COMPLETED', updated_at = datetime('now')
      WHERE staff_id = ? AND status != 'COMPLETED' AND date < ?
    `).run(staff.id, curOpDate);
  } catch {}

  const existingActive = db.prepare("SELECT id FROM shifts WHERE staff_id = ? AND status != 'COMPLETED'").get(staff.id);
  if (existingActive) {
    return res.status(400).json({ error: 'Anda sudah memiliki shift yang sedang aktif. Silakan lakukan Check-Out terlebih dahulu.' });
  }

  // Network info (Informational only - Wi-Fi lock disabled as requested)
  const clientIp = getClientIp(req);
  const wifiValidation = { isMatch: true, matchedSubnet: 'ALL_NETWORKS' };

  // Geofence Check & Input Sanitization
  const venueLat = getSetting('venue_lat');
  const venueLng = getSetting('venue_lng');
  const geofenceRadius = getSetting('geofence_radius') || 150;
  let userLat = lat != null ? parseFloat(lat) : null;
  let userLng = lng != null ? parseFloat(lng) : null;
  // Sanitize coordinates against out-of-range spoofing
  if (isNaN(userLat) || userLat < -90 || userLat > 90) userLat = null;
  if (isNaN(userLng) || userLng < -180 || userLng > 180) userLng = null;
  const distance = calculateDistanceMeters(userLat, userLng, venueLat, venueLng);

  const photoUrl = await savePhoto(photoBase64, `in_${staff.id}`);
  const now = new Date();
  // Enforce server-authoritative timestamp if client timestamp drifts by > 5 minutes
  let checkinTime = now.toISOString();
  if (timestamp) {
    const clientTs = new Date(timestamp).getTime();
    if (!isNaN(clientTs) && Math.abs(now.getTime() - clientTs) <= 5 * 60 * 1000) {
      checkinTime = timestamp;
    }
  }
  const dateStr = getOperationalDateYMD(checkinTime);

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
    accuracy: accuracy != null ? parseFloat(accuracy) : null,
    wifiPass: wifiValidation.isMatch,
    geofenceRadius,
    scheduledStart,
    checkinTime,
    division: staff.division
  });

  // Upload optional late proof photo if provided
  let latePhotoUrl = null;
  if (latePhotoBase64) {
    try {
      latePhotoUrl = await uploadPhotoToSupabase(latePhotoBase64, 'late_proof');
    } catch (e) {
      console.warn('Late proof photo upload note:', e.message);
    }
  }

  // Resolve today's mood emoji if staff already selected it before check-in
  let checkinMoodEmoji = req.body.moodEmoji && ALLOWED_MOOD_EMOJIS.includes(String(req.body.moodEmoji).trim())
    ? String(req.body.moodEmoji).trim()
    : null;
  if (!checkinMoodEmoji) {
    try {
      let moodsMap = getSetting('staff_moods') || {};
      if (isSupabaseConfigured) {
        const cloudMoods = await cloudDb.getStaffMoodsMap();
        if (cloudMoods && Object.keys(cloudMoods).length > 0) moodsMap = cloudMoods;
      }
      const mEntry = moodsMap?.[staff.uuid] || moodsMap?.[staff.id] || null;
      if (mEntry && (mEntry.date_ymd === dateStr || mEntry.emoji)) {
        checkinMoodEmoji = mEntry.emoji;
      }
    } catch {}
  }
  // Mood is optional: null if staff hasn't selected a mood

  // Biometric Face Recognition Verification against registered Official Staff Biometrics (Separated from Profile Photos)
  let refBiometricPhoto = null;
  try {
    let biometricsMap = getSetting('staff_biometrics') || {};
    if (isSupabaseConfigured) {
      const cloudBiometrics = await cloudDb.getStaffBiometricsMap();
      if (cloudBiometrics && Object.keys(cloudBiometrics).length > 0) biometricsMap = cloudBiometrics;
    }
    const bEntry = biometricsMap?.[staff.uuid] || biometricsMap?.[staff.id] || null;
    if (bEntry?.photo_url) {
      const resolvedTarget = [{ photo_url: bEntry.photo_url }];
      await resolveAttendancePhotoUrls(resolvedTarget, ['photo_url']);
      refBiometricPhoto = resolvedTarget[0].photo_url;
    }
  } catch (err) {
    console.warn('Error resolving staff biometric photo for face match:', err.message);
  }

  let faceRecogResult = { verified: null, status: 'NO_REFERENCE', similarity: null, distance: null };
  if (refBiometricPhoto && photoBase64) {
    try {
      faceRecogResult = await verifyFaceMatch(photoBase64, refBiometricPhoto);
      if (faceRecogResult.status === 'MISMATCH') {
        flags.push(FLAG_TYPES.FACE_MISMATCH);
      }
    } catch (err) {
      console.warn('Face recognition error during checkin:', err.message);
      faceRecogResult = { verified: null, status: 'ERROR', similarity: null, distance: null, message: err.message };
    }
  }

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
        shiftName,
        lateReason,
        latePhotoUrl,
        moodEmoji: checkinMoodEmoji,
        faceRecogStatus: faceRecogResult.status,
        faceRecogSimilarity: faceRecogResult.similarity,
        faceRecogDistance: faceRecogResult.distance
      });
    } catch (e) {
      console.warn('Supabase Checkin Cloud Sync Note:', e.message);
    }
  }

  const isLate = (flags || []).some(f => String(f).includes('Late') || String(f).includes('LATE'));
  const shiftNotesJson = JSON.stringify({
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    shift_number: shiftNumber,
    shift_name: shiftName,
    mood_emoji: checkinMoodEmoji || null,
    late_reason: lateReason || null,
    late_photo_url: latePhotoUrl || null,
    late_status: isLate ? (lateReason ? 'PENDING_REVIEW' : null) : null,
    face_recog_status: faceRecogResult.status,
    face_recog_similarity: faceRecogResult.similarity,
    face_recog_distance: faceRecogResult.distance
  });

  const result = db.prepare(`
    INSERT INTO shifts (
      staff_id, date, scheduled_start, scheduled_end,
      checkin_time, checkin_lat, checkin_lng, checkin_accuracy,
      checkin_distance, checkin_photo, checkin_ip, checkin_wifi_pass,
      status, flags, supabase_id, notes
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      'IN_PROGRESS', ?, ?, ?
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
    supaShift?.id || null,
    shiftNotesJson
  );

  const newShift = db.prepare(`
    SELECT s.*, st.name as staff_name, st.venue, st.division, st.role, st.department
    FROM shifts s
    JOIN staff st ON s.staff_id = st.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);
  if (newShift) newShift.flags = flags;

  const shiftResponse = newShift || supaShift;
  if (shiftResponse) await resolveAttendancePhotoUrls([shiftResponse]);

  broadcastEvent('SHIFT_UPDATE', { action: 'CHECKIN', shift: shiftResponse });

  let responseMessage = 'Absensi Masuk Berhasil Dicatat!';
  if (faceRecogResult.status === 'MISMATCH') {
    responseMessage = 'Absensi Masuk Tercatat (Catatan: Wajah Tidak Cocok & Dilaporkan ke Manajer)';
  }

  res.json({
    success: true,
    message: responseMessage,
    shift: shiftResponse,
    flags,
    faceRecog: faceRecogResult
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

  // STRICT RULE: Break is only allowed 1 time per shift (max 1 hour duration enforced)
  if (shift.break_count >= 1 || shift.break_start_time || shift.break_status === 'COMPLETED' || shift.break_status === 'ON_BREAK') {
    return res.status(400).json({ error: 'Istirahat hanya diperbolehkan 1 kali per shift dan sudah pernah diambil.' });
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

  if (updatedShift) await resolveAttendancePhotoUrls([updatedShift]);

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

        // Query active break record to get true break_start time!
        let supaBreakStart = null;
        try {
          const { data: activeBrk } = await supabase
            .from('break_logs')
            .select('break_start')
            .eq('attendance_id', cloudShift.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (activeBrk?.break_start) supaBreakStart = activeBrk.break_start;
        } catch {}

        shift = {
          id: cloudShift.id,
          supabase_id: cloudShift.id,
          staff_id: staff?.id || staffId,
          status: cloudShift.status,
          break_status: 'ON_BREAK',
          break_start_time: supaBreakStart || cloudShift.break_start_time || null,
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
        let supaBreakStart = null;
        try {
          const { data: activeBrk } = await supabase
            .from('break_logs')
            .select('break_start')
            .eq('attendance_id', data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (activeBrk?.break_start) supaBreakStart = activeBrk.break_start;
        } catch {}

        shift = {
          id: data.id,
          supabase_id: data.id,
          staff_id: staff.id,
          status: data.status,
          break_status: 'ON_BREAK',
          break_start_time: supaBreakStart || data.break_start_time || null,
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

  if (updatedShift) await resolveAttendancePhotoUrls([updatedShift]);

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

  // Geofence Check & Input Sanitization
  const venueLat = getSetting('venue_lat');
  const venueLng = getSetting('venue_lng');
  const geofenceRadius = getSetting('geofence_radius') || 150;
  let userLat = lat != null ? parseFloat(lat) : null;
  let userLng = lng != null ? parseFloat(lng) : null;
  // Sanitize coordinates against out-of-range spoofing
  if (isNaN(userLat) || userLat < -90 || userLat > 90) userLat = null;
  if (isNaN(userLng) || userLng < -180 || userLng > 180) userLng = null;
  const distance = calculateDistanceMeters(userLat, userLng, venueLat, venueLng);

  // Time & Duration with Server-Authoritative Drift Protection (5m tolerance)
  const now = new Date();
  let checkoutTime = now.toISOString();
  if (timestamp) {
    const clientTs = new Date(timestamp).getTime();
    if (!isNaN(clientTs) && Math.abs(now.getTime() - clientTs) <= 5 * 60 * 1000) {
      checkoutTime = timestamp;
    }
  }
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
    accuracy: accuracy != null ? parseFloat(accuracy) : null,
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

  if (updatedShift) await resolveAttendancePhotoUrls([updatedShift]);

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
  await auditOpenShifts();

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

  const localProfiles = getSetting('staff_profiles') || {};
  const localMoods = getSetting('staff_moods') || {};

  let processed = rows.map(r => {
    let parsedNotes = {};
    try {
      if (typeof r.notes === 'string' && r.notes.startsWith('{')) parsedNotes = JSON.parse(r.notes);
    } catch {}
    const moodEntry = localMoods?.[r.staff_id] || null;
    const resolvedMood = parsedNotes.mood_emoji || (moodEntry && moodEntry.date_ymd === r.date ? moodEntry.emoji : null) || null;
    const profEntry = localProfiles?.[r.staff_id] || null;
    return {
      ...r,
      flags: JSON.parse(r.flags || '[]'),
      mood_emoji: resolvedMood,
      staff_profile_photo_url: profEntry?.photo_url || null,
      face_recog_status: parsedNotes.face_recog_status || null,
      face_recog_similarity: parsedNotes.face_recog_similarity != null ? Number(parsedNotes.face_recog_similarity) : null,
      face_recog_distance: parsedNotes.face_recog_distance != null ? Number(parsedNotes.face_recog_distance) : null,
      late_reason: parsedNotes.late_reason || null,
      late_photo_url: parsedNotes.late_photo_url || null,
      late_status: parsedNotes.late_status || null,
      late_reviewed_by: parsedNotes.late_reviewed_by || null,
      late_reviewed_at: parsedNotes.late_reviewed_at || null,
      late_manager_note: parsedNotes.late_manager_note || null
    };
  });

  if (flagFilter === 'FLAGS_ONLY') {
    processed = processed.filter(r => r.flags.length > 0);
  } else if (flagFilter === 'NORMAL_ONLY') {
    processed = processed.filter(r => r.flags.length === 0);
  }

  await resolveAttendancePhotoUrls(processed, [
    'checkin_photo',
    'break_start_photo',
    'break_end_photo',
    'checkout_photo',
    'late_photo_url',
    'staff_profile_photo_url'
  ]);

  res.json(processed);
});

// 15. Manager KPI Stats
router.get('/stats', async (req, res) => {
  await auditOpenShifts();

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

  const todayStr = getOperationalDateYMD(new Date());

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
  let outsideGeofenceCount = 0;

  for (const s of todayShifts) {
    const flags = JSON.parse(s.flags || '[]');
    totalFlags += flags.length;
    if (flags.includes('FLAG_OUTSIDE_GEOFENCE')) {
      outsideGeofenceCount++;
    }
  }

  const gpsComplianceRate = todayShifts.length > 0 ? Math.round(((todayShifts.length - outsideGeofenceCount) / todayShifts.length) * 100) : 100;

  res.json({
    todayDate: todayStr,
    totalToday: todayShifts.length,
    activeShifts: activeCount,
    onBreakShifts: onBreakCount,
    completedShifts: completedCount,
    flaggedAnomalies: totalFlags,
    gpsComplianceRate,
    wifiComplianceRate: gpsComplianceRate,
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
    timezone: getSetting('timezone'),
    notify_announcements: getSetting('notify_announcements') ?? 1,
    notify_leave_decisions: getSetting('notify_leave_decisions') ?? 1,
    notify_points: getSetting('notify_points') ?? 1
  });
});

router.put('/settings', async (req, res) => {
  const {
    venue_name,
    venue_lat,
    venue_lng,
    geofence_radius,
    allowed_subnets,
    enforce_wifi,
    notify_announcements,
    notify_leave_decisions,
    notify_points
  } = req.body;

  if (venue_name !== undefined) setSetting('venue_name', venue_name);
  if (venue_lat !== undefined) setSetting('venue_lat', parseFloat(venue_lat));
  if (venue_lng !== undefined) setSetting('venue_lng', parseFloat(venue_lng));
  if (geofence_radius !== undefined) setSetting('geofence_radius', parseInt(geofence_radius, 10));
  if (allowed_subnets !== undefined) setSetting('allowed_subnets', allowed_subnets);
  if (enforce_wifi !== undefined) setSetting('enforce_wifi', enforce_wifi ? 1 : 0);
  if (notify_announcements !== undefined) setSetting('notify_announcements', notify_announcements ? 1 : 0);
  if (notify_leave_decisions !== undefined) setSetting('notify_leave_decisions', notify_leave_decisions ? 1 : 0);
  if (notify_points !== undefined) setSetting('notify_points', notify_points ? 1 : 0);

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
      if (notify_announcements !== undefined) upsertItems.push({ key: 'notify_announcements', value: notify_announcements ? 1 : 0 });
      if (notify_leave_decisions !== undefined) upsertItems.push({ key: 'notify_leave_decisions', value: notify_leave_decisions ? 1 : 0 });
      if (notify_points !== undefined) upsertItems.push({ key: 'notify_points', value: notify_points ? 1 : 0 });

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

// Manager-Only Leaderboard & Trial Data Management Endpoint
router.post('/admin/wipe-leaderboard', async (req, res) => {
  const { pin, mode = 'reset_only', scope = 'all', targetMonth = null } = req.body || {};

  const cleanPin = (pin || '').trim();
  let adminPin = (process.env.ADMIN_PIN || getSetting('admin_pin') || '8980').trim();
  if (isSupabaseConfigured) {
    try {
      const { data: supaPin } = await supabase.from('app_settings').select('value').eq('key', 'admin_pin').maybeSingle();
      if (supaPin?.value) {
        adminPin = typeof supaPin.value === 'string' ? supaPin.value.replace(/"/g, '') : String(supaPin.value);
      }
    } catch {}
  }

  // Strictly check Manager PIN (8980)
  if (!cleanPin || cleanPin !== adminPin) {
    return res.status(403).json({
      success: false,
      error: 'Akses ditolak: PIN Manager tidak valid. Hanya Full Manager yang dapat mengelola reset/wipe leaderboard.'
    });
  }

  try {
    // Mode 1: Reset Leaderboard Saja (Tanpa menghapus data riwayat trial)
    if (mode === 'reset_only') {
      const resetAt = new Date().toISOString();
      setSetting('leaderboard_reset_at', resetAt);
      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_settings').upsert({
            key: 'leaderboard_reset_at',
            value: resetAt,
            updated_at: resetAt
          });
        } catch (e) {
          console.warn('Failed to save leaderboard_reset_at to Supabase:', e.message);
        }
      }

      broadcastEvent('LEADERBOARD_UPDATE');

      return res.json({
        success: true,
        mode: 'reset_only',
        resetAt,
        message: 'Leaderboard berhasil di-reset ke nol! Riwayat absensi & inspeksi trial tetap aman dan tersimpan utuh di sistem audit.'
      });
    }

    // Mode 2: Undo Reset Leaderboard (Kembalikan hitungan bulan penuh)
    if (mode === 'undo_reset') {
      setSetting('leaderboard_reset_at', null);
      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_settings').delete().eq('key', 'leaderboard_reset_at');
        } catch (e) {
          console.warn('Failed to delete leaderboard_reset_at in Supabase:', e.message);
        }
      }

      broadcastEvent('LEADERBOARD_UPDATE');

      return res.json({
        success: true,
        mode: 'undo_reset',
        message: 'Reset leaderboard dibatalkan. Leaderboard kembali menghitung akumulasi dari awal bulan penuh.'
      });
    }

    // Mode 3: Wipe Permanen Data Trial
    if (mode === 'wipe_records') {
      // Clear reset timestamp since records are wiped
      setSetting('leaderboard_reset_at', null);
      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_settings').delete().eq('key', 'leaderboard_reset_at');
        } catch (e) {}
      }

      // 1. Wipe SQLite tables if scope includes attendance
      if (scope === 'attendance' || scope === 'all') {
        try {
          if (db) {
            db.prepare('DELETE FROM shifts').run();
            try {
              db.prepare('DELETE FROM breaks').run();
            } catch (e) {}
          }
        } catch (sqliteErr) {
          console.warn('SQLite shifts wipe note:', sqliteErr.message);
        }
      }

      // 2. Wipe Supabase Cloud tables
      let result = { success: true };
      if (isSupabaseConfigured) {
        result = await cloudDb.wipeLeaderboardData({ scope, targetMonth });
      }

      // 3. Broadcast real-time update events
      broadcastEvent('SHIFT_UPDATE');
      broadcastEvent('LEADERBOARD_UPDATE');

      return res.json({
        success: true,
        mode: 'wipe_records',
        message: 'Data riwayat trial berhasil dihapus permanen. Leaderboard telah di-reset dan dimulai bersih dari nol.',
        scope,
        result
      });
    }

    return res.status(400).json({ error: 'Mode tidak valid. Pilih reset_only, undo_reset, atau wipe_records.' });
  } catch (err) {
    console.error('Failed to process leaderboard wipe/reset:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal melakukan aksi: ' + err.message
    });
  }
});

// Helper: Verify Management (Manager & Assistant Manager) Authorization
const verifyManagementAuth = async (pin) => {
  if (!pin) return { authorized: false };
  const cleanPin = pin.trim();
  let adminPin = (process.env.ADMIN_PIN || getSetting('admin_pin') || '8980').trim();
  if (isSupabaseConfigured) {
    try {
      const { data: supaPin } = await supabase.from('app_settings').select('value').eq('key', 'admin_pin').maybeSingle();
      if (supaPin?.value) {
        adminPin = typeof supaPin.value === 'string' ? supaPin.value.replace(/"/g, '') : String(supaPin.value);
      }
    } catch {}
  }
  const supervisorPin = (getSetting('supervisor_pin') || '7070').trim();

  // 1. Full Manager (PIN 8980)
  if (cleanPin === adminPin) {
    return { authorized: true, role: 'MANAGER', reviewerName: 'Operational Manager' };
  }

  // 2. Assistant Manager Default PIN (PIN 7070)
  if (cleanPin === supervisorPin) {
    return { authorized: true, role: 'ASSISTANT_MANAGER', reviewerName: 'Assistant Manager' };
  }

  // 3. Management staff member PIN check in Supabase
  if (isSupabaseConfigured) {
    try {
      const { data: supaStaffList } = await supabase
        .from('staff')
        .select('name, role, division, is_active')
        .eq('pin', cleanPin);

      if (supaStaffList && supaStaffList.length > 0) {
        for (const st of supaStaffList) {
          if (!st.is_active) continue;
          const div = (st.division || '').trim().toLowerCase();
          const role = (st.role || '').trim().toLowerCase();
          if (
            div === 'management' ||
            role.includes('manager') ||
            role.includes('asst') ||
            role.includes('asisten') ||
            role.includes('supervisor') ||
            role.includes('spv')
          ) {
            return { authorized: true, role: 'ASSISTANT_MANAGER', reviewerName: `Assistant Manager (${st.name})` };
          }
        }
      }
    } catch (e) {}
  }

  // 4. Management staff member PIN check in SQLite
  try {
    const localStaff = db.prepare('SELECT * FROM staff WHERE pin = ? AND is_active = 1').all(cleanPin);
    for (const st of localStaff) {
      const div = (st.division || '').trim().toLowerCase();
      const role = (st.role || '').trim().toLowerCase();
      if (
        div === 'management' ||
        role.includes('manager') ||
        role.includes('asst') ||
        role.includes('asisten') ||
        role.includes('supervisor') ||
        role.includes('spv')
      ) {
        return { authorized: true, role: 'ASSISTANT_MANAGER', reviewerName: `Assistant Manager (${st.name})` };
      }
    }
  } catch (e) {}

  return { authorized: false };
};

// 1. Review Late Check-in Anomaly (Manager & Assistant Manager)
router.post('/shifts/:id/review-late', async (req, res) => {
  const { id } = req.params;
  const { pin, action, managerNotes } = req.body || {};

  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'Akses ditolak: Hanya Manager / Assistant Manager yang dapat me-review alasan keterlambatan.' });
  }

  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Aksi review tidak valid (wajib APPROVE atau REJECT).' });
  }

  try {
    let updatedShift = null;
    if (isSupabaseConfigured) {
      updatedShift = await cloudDb.reviewLateCheckin({
        shiftId: id,
        action,
        managerNotes,
        reviewerName: auth.reviewerName
      });
    }

    // Also update SQLite shifts table
    try {
      const shiftRow = db.prepare('SELECT * FROM shifts WHERE id = ? OR supabase_id = ?').get(id, id);
      if (shiftRow) {
        let parsedNotes = {};
        try { parsedNotes = JSON.parse(shiftRow.notes || '{}'); } catch {}
        parsedNotes.late_status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        parsedNotes.late_reviewed_by = auth.reviewerName;
        parsedNotes.late_reviewed_at = new Date().toISOString();
        parsedNotes.late_manager_note = managerNotes || null;

        let parsedFlags = JSON.parse(shiftRow.flags || '[]');
        if (action === 'APPROVE') {
          parsedFlags = parsedFlags.map(f => String(f).includes('Late') || String(f).includes('LATE') ? 'FLAG_LATE_EXCUSED' : f);
        }

        db.prepare('UPDATE shifts SET notes = ?, flags = ?, updated_at = datetime("now") WHERE id = ?').run(
          JSON.stringify(parsedNotes),
          JSON.stringify(parsedFlags),
          shiftRow.id
        );
      }
    } catch (e) {
      console.warn('SQLite review late note:', e.message);
    }

    broadcastEvent('SHIFT_UPDATE');
    broadcastEvent('LEADERBOARD_UPDATE');

    return res.json({
      success: true,
      message: action === 'APPROVE' ? 'Alasan terlambat berhasil di-ACC (Dimaafkan).' : 'Alasan terlambat ditolak (Penalti tetap berlaku).',
      shift: updatedShift
    });
  } catch (err) {
    console.error('Error reviewing late shift:', err);
    return res.status(500).json({ error: 'Gagal me-review keterlambatan: ' + err.message });
  }
});

// 2. Get Staff Leave Quota Balance
router.get('/leave-balance/:staffId', async (req, res) => {
  const { staffId } = req.params;
  const year = req.query.year || new Date().getFullYear();

  try {
    let balance;
    if (isSupabaseConfigured) {
      balance = await cloudDb.getStaffLeaveBalance(staffId, year);
    } else {
      const rows = db.prepare(`
        SELECT COALESCE(SUM(COALESCE(approved_days, requested_days, 0)), 0) as used
        FROM leave_requests 
        WHERE staff_id = ? AND type = 'CUTI' AND status IN ('APPROVED', 'ADJUSTED') AND year = ?
      `).get(staffId, Number(year));

      const used = rows?.used || 0;
      balance = {
        staffId,
        year: Number(year),
        maxQuota: 12,
        usedDays: used,
        remainingDays: Math.max(0, 12 - used)
      };
    }

    return res.json(balance);
  } catch (err) {
    console.error('Error getting leave balance:', err);
    return res.status(500).json({ error: 'Gagal memuat kuota cuti: ' + err.message });
  }
});

// 3. List Leave & Permission Requests
router.get('/leave-requests', async (req, res) => {
  const { staffId, status, type, year } = req.query;

  try {
    let list = [];
    if (isSupabaseConfigured) {
      list = await cloudDb.getLeaveRequests({ staffId, status, type, year });
    } else {
      let q = 'SELECT * FROM leave_requests WHERE 1=1';
      const params = [];
      if (staffId && staffId !== 'ALL') {
        q += ' AND staff_id = ?';
        params.push(staffId);
      }
      if (status && status !== 'ALL') {
        q += ' AND status = ?';
        params.push(status);
      }
      if (type && type !== 'ALL') {
        q += ' AND type = ?';
        params.push(type);
      }
      if (year) {
        q += ' AND year = ?';
        params.push(Number(year));
      }
      q += ' ORDER BY created_at DESC';
      list = db.prepare(q).all(...params);
    }

    return res.json(list);
  } catch (err) {
    console.error('Error getting leave requests:', err);
    return res.status(500).json({ error: 'Gagal memuat data pengajuan cuti/izin: ' + err.message });
  }
});

// 4. Create Leave or Permission Request (Staff)
router.post('/leave-requests', async (req, res) => {
  const {
    staffId,
    pin,
    type,
    category,
    startDate,
    endDate,
    requestedDays,
    reason,
    photoBase64,
    documentBase64,
    departureTime,
    activeShiftId
  } = req.body || {};

  if (!staffId) return res.status(400).json({ error: 'ID Staf wajib dicantumkan.' });
  if (!startDate || !endDate) return res.status(400).json({ error: 'Tanggal mulai dan selesai cuti/izin wajib diisi.' });
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'Alasan permohonan cuti/izin wajib diisi.' });

  // Verify staff
  let staff = null;
  if (isSupabaseConfigured) {
    const supa = await findStaffInSupabase(staffId);
    if (supa) staff = supa;
  }
  if (!staff) {
    staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  }
  if (!staff) return res.status(404).json({ error: 'Data staf tidak ditemukan.' });

  // Verify staff PIN
  if (pin && staff.pin && staff.pin.trim() !== pin.trim()) {
    return res.status(401).json({ error: 'PIN Rahasia salah. Pengajuan tidak sah.' });
  }

  const currentYear = new Date().getFullYear();
  const todayWitaStr = getOperationalDateYMD(new Date());

  // Rule checks for CUTI
  if (type === 'CUTI') {
    // 1. Minimal 14 hari sebelumnya (H-14 rule)
    const todayD = new Date(`${todayWitaStr}T00:00:00Z`);
    const startD = new Date(`${startDate}T00:00:00Z`);
    const diffTime = startD.getTime() - todayD.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 14) {
      return res.status(400).json({
        error: `Pengajuan cuti wajib diajukan minimal 2 minggu (14 hari) sebelumnya. Anda mengajukan H-${diffDays}.`
      });
    }

    // 2. Kuota 12 hari/tahun
    let balance;
    if (isSupabaseConfigured) {
      balance = await cloudDb.getStaffLeaveBalance(staff.legacy_code || staff.id, currentYear);
    } else {
      const rows = db.prepare(`
        SELECT COALESCE(SUM(COALESCE(approved_days, requested_days, 0)), 0) as used
        FROM leave_requests 
        WHERE staff_id = ? AND type = 'CUTI' AND status IN ('APPROVED', 'ADJUSTED') AND year = ?
      `).get(staff.id, currentYear);
      const used = rows?.used || 0;
      balance = { maxQuota: 12, usedDays: used, remainingDays: Math.max(0, 12 - used) };
    }

    const daysCount = requestedDays || 1;
    if (daysCount > balance.remainingDays) {
      return res.status(400).json({
        error: `Jatah cuti tidak mencukupi. Anda mengajukan ${daysCount} hari, tetapi sisa kuota tahun ${currentYear} hanya ${balance.remainingDays} hari.`
      });
    }

    // 3. Wajib foto selfie
    if (!photoBase64) {
      return res.status(400).json({ error: 'Foto selfie biometrik wajib diambil untuk pengajuan cuti.' });
    }
  }

  // Rule checks for IZIN (Sakit / Izin Darurat / Izin Pulang di Tengah Shift)
  if (type === 'IZIN') {
    // Selfie wajib untuk verifikasi pemohon
    if (!photoBase64) {
      return res.status(400).json({ error: 'Foto selfie biometrik pemohon wajib diambil untuk verifikasi permohonan izin.' });
    }
    // Dokumen surat dokter / bukti bersifat opsional
  }

  try {
    let photoUrl = null;
    if (photoBase64) {
      photoUrl = await uploadPhotoToSupabase(photoBase64, 'leave_selfie');
    }

    let documentUrl = null;
    if (documentBase64) {
      documentUrl = await uploadPhotoToSupabase(documentBase64, 'leave_doc');
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRequest = {
      id: reqId,
      staff_id: staff.legacy_code || staff.id,
      staff_name: staff.name,
      staff_role: staff.role || 'Staff',
      staff_venue: staff.venue || 'JP Karaoke',
      staff_division: staff.division || 'Server and Cashier',
      type: type || 'CUTI',
      category: category || (type === 'CUTI' ? 'CUTI_TAHUNAN' : 'SAKIT'),
      start_date: startDate,
      end_date: endDate,
      requested_days: requestedDays ? Number(requestedDays) : 1,
      departure_time: departureTime || null,
      active_shift_id: activeShiftId || null,
      approved_days: null,
      approved_start_date: null,
      approved_end_date: null,
      reason: reason.trim(),
      photo_url: photoUrl,
      document_url: documentUrl,
      status: 'PENDING',
      manager_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      year: currentYear,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      await cloudDb.saveLeaveRequest(newRequest);
    }

    // Also insert to SQLite
    try {
      db.prepare(`
        INSERT INTO leave_requests (
          id, staff_id, staff_name, staff_role, staff_venue, staff_division,
          type, category, start_date, end_date, requested_days, departure_time, active_shift_id,
          reason, photo_url, document_url, status, year, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 'PENDING', ?, ?, ?
        )
      `).run(
        newRequest.id,
        newRequest.staff_id,
        newRequest.staff_name,
        newRequest.staff_role,
        newRequest.staff_venue,
        newRequest.staff_division,
        newRequest.type,
        newRequest.category,
        newRequest.start_date,
        newRequest.end_date,
        newRequest.requested_days,
        newRequest.departure_time,
        newRequest.active_shift_id,
        newRequest.reason,
        newRequest.photo_url,
        newRequest.document_url,
        newRequest.year,
        newRequest.created_at,
        newRequest.updated_at
      );
    } catch (e) {
      console.warn('SQLite leave_requests insert note:', e.message);
    }

    await resolveAttendancePhotoUrls([newRequest], ['photo_url', 'document_url']);

    broadcastEvent('LEAVE_UPDATE', { action: 'CREATED', request: newRequest });

    return res.json({
      success: true,
      message: type === 'CUTI'
        ? 'Pengajuan cuti berhasil dikirim ke management.'
        : (category === 'IZIN_PULANG_AWAL'
            ? 'Permohonan izin pulang awal berhasil dikirim ke management.'
            : (category === 'IZIN_BIASA'
                ? 'Permohonan izin biasa / dispensasi berhasil dikirim ke management.'
                : 'Permohonan izin berhasil dikirim ke management.')),
      request: newRequest
    });
  } catch (err) {
    console.error('Error creating leave request:', err);
    return res.status(500).json({ error: 'Gagal mengirim pengajuan: ' + err.message });
  }
});

// 5. Review Leave or Permission Request (Manager & Assistant Manager)
router.post('/leave-requests/:id/review', async (req, res) => {
  const { id } = req.params;
  const { pin, action, approvedDays, approvedStartDate, approvedEndDate, managerNotes } = req.body || {};

  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'Akses ditolak: Hanya Manager / Assistant Manager yang dapat me-review pengajuan cuti & izin.' });
  }

  if (!action || !['APPROVE', 'ADJUST', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Aksi review tidak valid (APPROVE, ADJUST, atau REJECT).' });
  }

  try {
    let updated = null;
    if (isSupabaseConfigured) {
      updated = await cloudDb.reviewLeaveRequest(id, {
        action,
        approvedDays,
        approvedStartDate,
        approvedEndDate,
        managerNotes,
        reviewerName: auth.reviewerName
      });
    }

    // Also update SQLite
    const now = new Date().toISOString();
    let status = 'APPROVED';
    if (action === 'ADJUST') status = 'ADJUSTED';
    if (action === 'REJECT') status = 'REJECTED';

    try {
      db.prepare(`
        UPDATE leave_requests
        SET status = ?, approved_days = ?, approved_start_date = ?, approved_end_date = ?,
            manager_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        status,
        action === 'APPROVE' ? null : (approvedDays || null),
        action === 'ADJUST' ? (approvedStartDate || null) : null,
        action === 'ADJUST' ? (approvedEndDate || null) : null,
        managerNotes || null,
        auth.reviewerName,
        now,
        now,
        id
      );
    } catch (e) {
      console.warn('SQLite leave review sync note:', e.message);
    }

    // SPECIAL HANDLING: If Early Departure Request (IZIN_PULANG_AWAL) is APPROVED
    // Automatically close open shift or waive penalty on already checked-out shift!
    if (action === 'APPROVE' && updated?.category === 'IZIN_PULANG_AWAL') {
      try {
        const staffId = updated.staff_id;
        const activeShiftId = updated.active_shift_id;

        // 1. Cloud Supabase shift update
        if (isSupabaseConfigured) {
          let query = supabase.from('attendance_logs').select('*');
          if (activeShiftId) {
            query = query.eq('id', activeShiftId);
          } else {
            query = query.eq('staff_id', staffId).order('created_at', { ascending: false }).limit(1);
          }
          const { data: supaShift } = await query.maybeSingle();

          if (supaShift) {
            let flags = Array.isArray(supaShift.flags) ? supaShift.flags : (typeof supaShift.flags === 'string' ? JSON.parse(supaShift.flags || '[]') : []);
            // Remove any early checkout penalty flag and replace with early checkout approved flag
            flags = flags.filter(f => !String(f).includes('EARLY_CHECKOUT'));
            flags.push('FLAG_EARLY_CHECKOUT_APPROVED');

            let notes = {};
            try {
              if (typeof supaShift.notes === 'string') notes = JSON.parse(supaShift.notes);
              else if (supaShift.notes) notes = supaShift.notes;
            } catch {}
            notes.early_checkout_status = 'APPROVED';
            notes.early_checkout_reviewed_by = auth.reviewerName;
            notes.early_checkout_reason = updated.reason;

            const updatePayload = {
              flags,
              notes: JSON.stringify(notes)
            };
            // If shift is still open, close it right now!
            if (supaShift.status !== 'COMPLETED') {
              updatePayload.check_out_time = now;
              updatePayload.status = 'COMPLETED';
            }

            await supabase.from('attendance_logs').update(updatePayload).eq('id', supaShift.id);
            broadcastEvent('SHIFT_UPDATE', { id: supaShift.id, action: 'EARLY_CHECKOUT_APPROVED' });
          }
        }

        // 2. Local SQLite shift update
        try {
          let localShift = null;
          if (activeShiftId) {
            localShift = db.prepare('SELECT * FROM shifts WHERE id = ? OR supabase_id = ?').get(activeShiftId, activeShiftId);
          }
          if (!localShift) {
            localShift = db.prepare('SELECT * FROM shifts WHERE staff_id = ? ORDER BY id DESC LIMIT 1').get(staffId);
          }

          if (localShift) {
            let localFlags = JSON.parse(localShift.flags || '[]');
            localFlags = localFlags.filter(f => !String(f).includes('EARLY_CHECKOUT'));
            localFlags.push('FLAG_EARLY_CHECKOUT_APPROVED');

            let localNotes = {};
            try {
              localNotes = JSON.parse(localShift.notes || '{}');
            } catch {}
            localNotes.early_checkout_status = 'APPROVED';
            localNotes.early_checkout_reviewed_by = auth.reviewerName;
            localNotes.early_checkout_reason = updated.reason;

            const checkOutTime = localShift.checkout_time || now;
            const status = 'COMPLETED';

            db.prepare(`
              UPDATE shifts
              SET checkout_time = ?, status = ?, flags = ?, notes = ?, updated_at = ?
              WHERE id = ?
            `).run(
              checkOutTime,
              status,
              JSON.stringify(localFlags),
              JSON.stringify(localNotes),
              now,
              localShift.id
            );
          }
        } catch (e) {
          console.warn('SQLite local shift update for early departure note:', e.message);
        }
      } catch (errEarly) {
        console.warn('Note while approving early checkout shift:', errEarly.message);
      }
    }

    broadcastEvent('LEAVE_UPDATE', { action: 'REVIEWED', request: updated });

    try {
      const isApprove = action === 'APPROVE';
      const isAdjust = action === 'ADJUST';
      const statusTitle = isApprove ? '✅ Izin Anda Disetujui' : isAdjust ? '🟡 Izin Disetujui Sebagian' : '❌ Izin Belum Disetujui';
      const typeLabel = updated?.type === 'SAKIT' ? 'Izin Sakit' : updated?.type === 'CUTI_TAHUNAN' ? 'Cuti Tahunan' : 'Izin Tidak Masuk';
      const statusBody = isApprove
        ? `Pengajuan ${typeLabel} Anda telah DISETUJUI oleh Management.`
        : isAdjust
        ? `Pengajuan ${typeLabel} Anda disesuaikan menjadi ${approvedDays} hari. Catatan: "${managerNotes || '-'}"`
        : `Pengajuan ${typeLabel} Anda belum disetujui. Catatan: "${managerNotes || '-'}"`;

      const notifyLeaveEnabled = getSetting('notify_leave_decisions') !== 0 && getSetting('notify_leave_decisions') !== 'false';
      if (updated?.staff_id && notifyLeaveEnabled) {
        sendPushNotification({
          staffIds: [String(updated.staff_id)],
          title: statusTitle,
          body: statusBody,
          url: '/',
          tag: `leave_review_${id}`
        }).catch(errPush => console.warn('Push error:', errPush.message));
      }
    } catch (e) {
      console.warn('Push dispatch error for leave review:', e.message);
    }

    return res.json({
      success: true,
      message: action === 'APPROVE'
        ? (updated?.category === 'IZIN_PULANG_AWAL' ? 'Izin pulang awal disetujui. Shift otomatis ditutup & penalti ditiadakan.' : 'Pengajuan berhasil disetujui (ACC Penuh).')
        : (action === 'ADJUST' ? 'Pengajuan berhasil disesuaikan (ACC Sebagian).' : 'Pengajuan ditolak.'),
      request: updated
    });
  } catch (err) {
    console.error('Error reviewing leave request:', err);
    return res.status(500).json({ error: 'Gagal me-review pengajuan: ' + err.message });
  }
});

// ==========================================
// 6. MANAGEMENT ANNOUNCEMENTS (OPERATIONAL MANAGER ONLY EDIT)
// ==========================================

// Get Announcements (Staff & Manager)
router.get('/announcements', async (req, res) => {
  const { staffId, venue, activeOnly } = req.query;

  try {
    let announcements = [];
    let reads = [];

    if (isSupabaseConfigured) {
      [announcements, reads] = await Promise.all([
        cloudDb.getAnnouncements(),
        cloudDb.getAnnouncementReads()
      ]);
    } else {
      announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
      reads = db.prepare('SELECT * FROM announcement_reads').all();
    }

    // Filter by active status and expiration
    if (activeOnly === 'true' || activeOnly === true || activeOnly === undefined) {
      const nowTs = new Date().getTime();
      announcements = announcements.filter(a => {
        if (a.is_active === false || a.is_active === 0) return false;
        if (a.expires_at) {
          const expTs = new Date(a.expires_at).getTime();
          if (!isNaN(expTs) && nowTs > expTs) return false;
        }
        return true;
      });
    }

    // Filter by target venue (case-insensitive & supports JP/LuckyCat partial matching)
    if (venue && venue !== 'ALL') {
      const vLow = venue.toLowerCase();
      announcements = announcements.filter(a => {
        if (!a.target_venue || a.target_venue === 'ALL') return true;
        const tLow = a.target_venue.toLowerCase();
        if (tLow === vLow) return true;
        if (vLow.includes('jp') && tLow.includes('jp')) return true;
        if (vLow.includes('lucky') && tLow.includes('lucky')) return true;
        return false;
      });
    }

    // If staffId is provided, attach reader info
    const enriched = announcements.map(a => {
      const staffRead = staffId ? reads.find(r => String(r.announcement_id) === String(a.id) && String(r.staff_id) === String(staffId)) : null;
      const totalReads = reads.filter(r => String(r.announcement_id) === String(a.id)).length;
      let parsedImages = [];
      if (Array.isArray(a.images)) {
        parsedImages = a.images;
      } else if (typeof a.images === 'string') {
        try { parsedImages = JSON.parse(a.images || '[]'); } catch { parsedImages = []; }
      }
      return {
        ...a,
        images: parsedImages,
        isRead: Boolean(staffRead),
        readAt: staffRead ? staffRead.read_at : null,
        totalReads
      };
    });

    return res.json(enriched);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    return res.status(500).json({ error: 'Gagal memuat pengumuman: ' + err.message });
  }
});

// Create Announcement (Strictly Operational Manager - PIN 8980)
router.post('/announcements', async (req, res) => {
  const { pin, title, content, urgency, targetVenue, expiresAt, images } = req.body || {};

  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized || (auth.role !== 'FULL_ADMIN' && auth.role !== 'MANAGER')) {
    return res.status(403).json({ error: 'Akses ditolak: Hanya Operational Manager (PIN 8980) yang berwenang membuat pengumuman resmi.' });
  }

  if (!title || !title.trim()) return res.status(400).json({ error: 'Judul pengumuman wajib diisi.' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Isi pengumuman wajib diisi.' });

  const now = new Date().toISOString();
  const announcementId = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Process flyer / promo images
  let savedImages = [];
  if (Array.isArray(images) && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (typeof img === 'string') {
        if (img.startsWith('data:image')) {
          const url = await savePhoto(img, `ann_${announcementId}_${i}`);
          savedImages.push(url || img);
        } else {
          savedImages.push(img);
        }
      }
    }
  }

  const newAnnouncement = {
    id: announcementId,
    title: title.trim(),
    content: content.trim(),
    urgency: urgency || 'NORMAL', // 'NORMAL' | 'URGENT'
    target_venue: targetVenue || 'ALL', // 'ALL' | 'JP Karaoke' | 'LuckyCat'
    author_name: auth.reviewerName || 'Operational Manager',
    expires_at: expiresAt || null,
    images: savedImages,
    is_active: 1,
    created_at: now,
    updated_at: now
  };

  try {
    if (isSupabaseConfigured) {
      await cloudDb.saveAnnouncement(newAnnouncement);
    }

    try {
      db.prepare(`
        INSERT INTO announcements (id, title, content, urgency, target_venue, author_name, expires_at, images, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        newAnnouncement.id,
        newAnnouncement.title,
        newAnnouncement.content,
        newAnnouncement.urgency,
        newAnnouncement.target_venue,
        newAnnouncement.author_name,
        newAnnouncement.expires_at,
        JSON.stringify(savedImages),
        now,
        now
      );
    } catch (e) {
      console.warn('SQLite announcement insert note:', e.message);
    }

    broadcastEvent('ANNOUNCEMENT_UPDATE', { action: 'CREATED', announcement: newAnnouncement });

    // Send Web Push notification to all staff (if enabled in settings)
    const notifyAnnouncementsEnabled = getSetting('notify_announcements') !== 0 && getSetting('notify_announcements') !== 'false';
    if (notifyAnnouncementsEnabled) {
      try {
        const urgencyTag = newAnnouncement.urgency === 'URGENT' ? '🚨 [URGENT] ' : '📢 ';
        sendPushNotification({
          staffIds: 'ALL',
          title: `${urgencyTag}Pengumuman Management: ${newAnnouncement.title}`,
          body: newAnnouncement.content.slice(0, 120) + (newAnnouncement.content.length > 120 ? '...' : ''),
          url: '/',
          tag: `announcement_${newAnnouncement.id}`
        }).catch(errPush => console.warn('Push error:', errPush.message));
      } catch (e) {
        console.warn('Push dispatch error for announcement:', e.message);
      }
    }

    return res.json({
      success: true,
      message: 'Pengumuman resmi berhasil diterbitkan.',
      announcement: newAnnouncement
    });
  } catch (err) {
    console.error('Error creating announcement:', err);
    return res.status(500).json({ error: 'Gagal menerbitkan pengumuman: ' + err.message });
  }
});

// Update Announcement (Operational Manager Only)
router.put('/announcements/:id', async (req, res) => {
  const { id } = req.params;
  const { pin, title, content, urgency, targetVenue, expiresAt, isActive, images } = req.body || {};

  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized || (auth.role !== 'FULL_ADMIN' && auth.role !== 'MANAGER')) {
    return res.status(403).json({ error: 'Akses ditolak: Hanya Operational Manager (PIN 8980) yang berwenang mengubah pengumuman.' });
  }

  const now = new Date().toISOString();

  try {
    let existing = null;
    if (isSupabaseConfigured) {
      const list = await cloudDb.getAnnouncements();
      existing = list.find(a => String(a.id) === String(id));
    }
    if (!existing) {
      existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    }
    if (!existing) return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });

    let savedImages = existing.images || [];
    if (images !== undefined && Array.isArray(images)) {
      savedImages = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (typeof img === 'string') {
          if (img.startsWith('data:image')) {
            const url = await savePhoto(img, `ann_${id}_${i}`);
            savedImages.push(url || img);
          } else {
            savedImages.push(img);
          }
        }
      }
    }

    const updated = {
      ...existing,
      title: title !== undefined ? title.trim() : existing.title,
      content: content !== undefined ? content.trim() : existing.content,
      urgency: urgency !== undefined ? urgency : existing.urgency,
      target_venue: targetVenue !== undefined ? targetVenue : existing.target_venue,
      expires_at: expiresAt !== undefined ? (expiresAt || null) : existing.expires_at,
      is_active: isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
      images: savedImages,
      updated_at: now
    };

    if (isSupabaseConfigured) {
      await cloudDb.saveAnnouncement(updated);
    }

    try {
      db.prepare(`
        UPDATE announcements
        SET title = ?, content = ?, urgency = ?, target_venue = ?, is_active = ?, images = ?, updated_at = ?
        WHERE id = ?
      `).run(
        updated.title,
        updated.content,
        updated.urgency,
        updated.target_venue,
        updated.is_active ? 1 : 0,
        JSON.stringify(savedImages),
        now,
        id
      );
    } catch (e) {
      console.warn('SQLite announcement update note:', e.message);
    }

    broadcastEvent('ANNOUNCEMENT_UPDATE', { action: 'UPDATED', announcement: updated });

    return res.json({
      success: true,
      message: 'Pengumuman berhasil diperbarui.',
      announcement: updated
    });
  } catch (err) {
    console.error('Error updating announcement:', err);
    return res.status(500).json({ error: 'Gagal memperbarui pengumuman: ' + err.message });
  }
});

// Staff Acknowledge / "Saya Mengerti"
router.post('/announcements/:id/acknowledge', async (req, res) => {
  const { id } = req.params;
  const { staffId, staffName, venue, division } = req.body || {};

  if (!staffId) return res.status(400).json({ error: 'ID Staf wajib dicantumkan.' });

  try {
    let receipt = null;
    if (isSupabaseConfigured) {
      receipt = await cloudDb.recordAnnouncementRead({
        announcementId: id,
        staffId,
        staffName: staffName || 'Staff',
        staffVenue: venue || 'JP Karaoke',
        staffDivision: division || 'Staff'
      });
    }

    const now = new Date().toISOString();
    try {
      const readId = `read_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT OR IGNORE INTO announcement_reads (id, announcement_id, staff_id, staff_name, staff_venue, staff_division, read_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        receipt?.id || readId,
        id,
        staffId,
        staffName || 'Staff',
        venue || 'JP Karaoke',
        division || 'Staff',
        now
      );
    } catch (e) {
      console.warn('SQLite announcement_reads note:', e.message);
    }

    broadcastEvent('ANNOUNCEMENT_READ', { announcementId: id, staffId, staffName });

    return res.json({
      success: true,
      message: 'Terima kasih, konfirmasi telah tercatat.',
      receipt
    });
  } catch (err) {
    console.error('Error acknowledging announcement:', err);
    return res.status(500).json({ error: 'Gagal mencatat konfirmasi: ' + err.message });
  }
});

// Read Receipts Report (Manager & Assistant Manager)
router.get('/announcements/:id/readers', async (req, res) => {
  const { id } = req.params;

  try {
    let reads = [];
    let staffList = [];

    if (isSupabaseConfigured) {
      [reads, staffList] = await Promise.all([
        cloudDb.getAnnouncementReads(),
        cloudDb.getStaff('ALL')
      ]);
    } else {
      reads = db.prepare('SELECT * FROM announcement_reads WHERE announcement_id = ?').all(id);
      staffList = db.prepare('SELECT * FROM staff WHERE is_active = 1').all();
    }

    // Filter reads for this announcement
    const thisReads = reads.filter(r => String(r.announcement_id) === String(id));
    const readStaffIds = new Set(thisReads.map(r => String(r.staff_id)));

    // Active operational staff pool (exclude Management)
    const activeStaff = staffList.filter(s => s.is_active && s.division !== 'Management');

    const readers = thisReads.map(r => ({
      staff_id: r.staff_id,
      staff_name: r.staff_name,
      staff_venue: r.staff_venue,
      staff_division: r.staff_division,
      read_at: r.read_at
    })).sort((a, b) => new Date(b.read_at) - new Date(a.read_at));

    const unread = activeStaff
      .filter(s => !readStaffIds.has(String(s.id)) && !readStaffIds.has(String(s.legacy_code)))
      .map(s => ({
        staff_id: s.id,
        staff_name: s.name,
        staff_venue: s.venue,
        staff_division: s.division
      }))
      .sort((a, b) => a.staff_name.localeCompare(b.staff_name));

    const totalCount = activeStaff.length;
    const readCount = readers.length;
    const percentage = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

    return res.json({
      announcement_id: id,
      total_active_staff: totalCount,
      read_count: readCount,
      percentage,
      readers,
      unread
    });
  } catch (err) {
    console.error('Error fetching announcement readers:', err);
    return res.status(500).json({ error: 'Gagal memuat laporan pembaca: ' + err.message });
  }
});

// ==========================================
// STAFF VIOLATION POINTS SYSTEM (OM & AM)
// Monthly cutoff cycle: 17th -> 13th next month
// ==========================================

const POINT_PLEDGE_TEXT = 'Dengan menyetujui ini saya berjanji akan memperbaiki kesalahan saya dan tidak mengulangi lagi';

function doesPointMatchStaff(point, staffId, staffUuid) {
  const targets = new Set([staffId, staffUuid].filter(Boolean).map(String));
  if (targets.size === 0) return false;
  return (
    (point.staff_id && targets.has(String(point.staff_id))) ||
    (point.staff_uuid && targets.has(String(point.staff_uuid)))
  );
}

router.get('/points', async (req, res) => {
  try {
    const { staffId, staffUuid, cycleKey = 'CURRENT', status = 'ALL' } = req.query;
    const currentCycle = getPointCycleInfo(new Date());
    const targetCycleKey = !cycleKey || cycleKey === 'CURRENT' ? currentCycle.cycleKey : cycleKey;

    let allPoints = [];
    let staffList = [];

    if (isSupabaseConfigured) {
      [allPoints, staffList] = await Promise.all([
        cloudDb.getStaffPoints(),
        cloudDb.getStaff('ALL').catch(() => [])
      ]);
    } else {
      allPoints = db.prepare('SELECT * FROM staff_points ORDER BY created_at DESC').all();
      staffList = db.prepare('SELECT * FROM staff WHERE is_active = 1').all();
    }

    const normalized = (allPoints || []).map((p) => {
      const cInfo = p.cycle_key ? getPointCycleFromKey(p.cycle_key) : getPointCycleInfo(p.created_at);
      return {
        ...p,
        points: Number(p.points || 0),
        cycle_key: cInfo.cycleKey,
        cycle_label: p.cycle_label || cInfo.label,
        status: p.acknowledged_at || p.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'PENDING'
      };
    });

    // Build available cycles dropdown list
    const recentCycles = getRecentPointCycles(6, new Date());
    const cycleMap = new Map(recentCycles.map((c) => [c.cycleKey, c]));
    for (const p of normalized) {
      if (p.cycle_key && !cycleMap.has(p.cycle_key)) {
        cycleMap.set(p.cycle_key, getPointCycleFromKey(p.cycle_key));
      }
    }
    const availableCycles = Array.from(cycleMap.values()).sort((a, b) => b.cycleKey.localeCompare(a.cycleKey));

    // Staff-scoped metrics (used by Staff Portal & notifications)
    const staffScopedPoints = (staffId || staffUuid)
      ? normalized.filter((p) => doesPointMatchStaff(p, staffId, staffUuid))
      : normalized;

    const pendingForStaff = (staffId || staffUuid)
      ? staffScopedPoints.filter((p) => p.status !== 'ACKNOWLEDGED')
      : [];

    const currentCycleTotalForStaff = (staffId || staffUuid)
      ? staffScopedPoints
          .filter((p) => p.cycle_key === currentCycle.cycleKey)
          .reduce((sum, p) => sum + Number(p.points || 0), 0)
      : 0;

    // Cycle filter
    let cycleFiltered = staffScopedPoints;
    if (targetCycleKey !== 'ALL') {
      cycleFiltered = staffScopedPoints.filter((p) => p.cycle_key === targetCycleKey);
    }

    // Status filter
    let pointsFiltered = cycleFiltered;
    if (status && status !== 'ALL') {
      pointsFiltered = cycleFiltered.filter((p) => p.status === status);
    }

    // Build per-staff summary across selected cycle (for Manager & AM cut-off calculation)
    const summaryMap = new Map();
    for (const st of staffList || []) {
      const stKey = String(st.id || st.legacy_code || st.uuid);
      summaryMap.set(stKey, {
        staff_id: st.id || st.legacy_code || st.uuid,
        staff_uuid: st.uuid || st.id,
        staff_name: st.name,
        staff_venue: st.venue || 'JP Karaoke',
        staff_division: st.division || st.role || 'Staff',
        staff_role: st.role || 'Staff',
        total_points: 0,
        violation_count: 0,
        pending_count: 0,
        acknowledged_count: 0,
        last_point_at: null
      });
    }

    // Match points into summary map (using cycleFiltered without status filter so totals match cutoff)
    const allCyclePoints = targetCycleKey === 'ALL'
      ? normalized
      : normalized.filter((p) => p.cycle_key === targetCycleKey);

    for (const p of allCyclePoints) {
      let matchedKey = null;
      for (const [k, row] of summaryMap.entries()) {
        if (doesPointMatchStaff(p, row.staff_id, row.staff_uuid)) {
          matchedKey = k;
          break;
        }
      }
      if (!matchedKey) {
        matchedKey = String(p.staff_id || p.staff_uuid);
        summaryMap.set(matchedKey, {
          staff_id: p.staff_id,
          staff_uuid: p.staff_uuid || p.staff_id,
          staff_name: p.staff_name || 'Staff',
          staff_venue: p.staff_venue || '-',
          staff_division: p.staff_division || '-',
          staff_role: p.staff_role || 'Staff',
          total_points: 0,
          violation_count: 0,
          pending_count: 0,
          acknowledged_count: 0,
          last_point_at: null
        });
      }
      const entry = summaryMap.get(matchedKey);
      entry.total_points = Math.round((entry.total_points + Number(p.points || 0)) * 100) / 100;
      entry.violation_count += 1;
      if (p.status === 'ACKNOWLEDGED') {
        entry.acknowledged_count += 1;
      } else {
        entry.pending_count += 1;
      }
      if (!entry.last_point_at || new Date(p.created_at) > new Date(entry.last_point_at)) {
        entry.last_point_at = p.created_at;
      }
    }

    const isStaffScoped = Boolean(staffId || staffUuid);

    let staffTotals = [];
    if (!isStaffScoped) {
      staffTotals = Array.from(summaryMap.values()).sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.violation_count !== a.violation_count) return b.violation_count - a.violation_count;
        return (a.staff_name || '').localeCompare(b.staff_name || '');
      });
    }

    await resolveAttendancePhotoUrls(pointsFiltered, ['proof_photo_url']);
    await resolveAttendancePhotoUrls(pendingForStaff, ['proof_photo_url']);

    return res.json({
      currentCycle,
      selectedCycle: targetCycleKey === 'ALL' ? null : getPointCycleFromKey(targetCycleKey),
      availableCycles,
      points: pointsFiltered,
      pendingForStaff,
      currentCycleTotalForStaff: Math.round(currentCycleTotalForStaff * 100) / 100,
      staffTotals
    });
  } catch (err) {
    console.error('Error fetching points:', err);
    return res.status(500).json({ error: 'Gagal memuat data poin: ' + err.message });
  }
});

router.post('/points', async (req, res) => {
  const { pin, staffId, staffIds, points, reason, proofPhotoBase64, proofPhoto } = req.body || {};

  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized) {
    return res.status(403).json({
      error: 'Akses ditolak: Hanya Operational Manager atau Assistant Manager yang dapat memberikan poin.'
    });
  }

  const targetStaffIds = [...new Set([
    ...(Array.isArray(staffIds) ? staffIds : []),
    ...(staffId ? [staffId] : [])
  ].filter(Boolean).map(String))];

  if (targetStaffIds.length === 0) {
    return res.status(400).json({ error: 'Silakan pilih minimal 1 staff terlebih dahulu.' });
  }

  const numericPoints = Number(points);
  if (!Number.isFinite(numericPoints) || numericPoints === 0) {
    return res.status(400).json({ error: 'Jumlah poin harus berupa angka yang valid (tidak boleh 0).' });
  }

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'Alasan pemberian poin wajib diisi.' });
  }

  // Handle optional violation proof photo
  let savedProofPhotoUrl = null;
  const rawPhoto = proofPhotoBase64 || proofPhoto;
  if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.startsWith('data:image/')) {
    try {
      savedProofPhotoUrl = await savePhoto(rawPhoto, `point_proof_${Date.now()}`);
    } catch (err) {
      console.warn('Failed to save point proof photo:', err.message);
    }
  }

  // Resolve each target staff individually so every record stays private & isolated per person
  const resolvedStaffList = [];
  for (const targetId of targetStaffIds) {
    let staff = null;
    if (isSupabaseConfigured) {
      const supa = await findStaffInSupabase(targetId);
      if (supa) {
        staff = { ...supa, id: supa.legacy_code || supa.id, uuid: supa.id };
      }
    }
    if (!staff) {
      staff = db.prepare('SELECT * FROM staff WHERE id = ? OR uuid = ?').get(targetId, targetId);
    }
    if (!staff) {
      return res.status(404).json({ error: `Data staff (${targetId}) tidak ditemukan.` });
    }
    resolvedStaffList.push(staff);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const cycle = getPointCycleInfo(now);
  const witaDate = getWitaDateYMD(now);
  const roundedPoints = Number.isInteger(numericPoints)
    ? numericPoints
    : Math.round(numericPoints * 100) / 100;
  const cleanReason = String(reason).trim();

  const createdRecords = resolvedStaffList.map((staff, idx) => ({
    id: `pt_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    staff_id: String(staff.id),
    staff_uuid: String(staff.uuid || staff.id),
    staff_name: staff.name,
    staff_role: staff.role || 'Staff',
    staff_venue: staff.venue || 'JP Karaoke',
    staff_division: staff.division || 'Staff',
    points: roundedPoints,
    reason: cleanReason,
    proof_photo_url: savedProofPhotoUrl || null,
    cycle_key: cycle.cycleKey,
    cycle_label: cycle.label,
    wita_date: witaDate,
    given_by: auth.reviewerName,
    given_by_role: auth.role === 'MANAGER' ? 'OPERATIONAL_MANAGER' : 'ASSISTANT_MANAGER',
    status: 'PENDING',
    agreed_pledge: null,
    acknowledged_at: null,
    acknowledged_by: null,
    created_at: nowIso,
    updated_at: nowIso
  }));

  try {
    if (isSupabaseConfigured) {
      await cloudDb.createStaffPoints(createdRecords);
    }

    const insertStmt = db.prepare(`
      INSERT INTO staff_points (
        id, staff_id, staff_uuid, staff_name, staff_role, staff_venue, staff_division,
        points, reason, proof_photo_url, cycle_key, cycle_label, wita_date, given_by, given_by_role,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `);

    for (const pointRecord of createdRecords) {
      try {
        insertStmt.run(
          pointRecord.id,
          pointRecord.staff_id,
          pointRecord.staff_uuid,
          pointRecord.staff_name,
          pointRecord.staff_role,
          pointRecord.staff_venue,
          pointRecord.staff_division,
          pointRecord.points,
          pointRecord.reason,
          pointRecord.proof_photo_url || null,
          pointRecord.cycle_key,
          pointRecord.cycle_label,
          pointRecord.wita_date,
          pointRecord.given_by,
          pointRecord.given_by_role,
          nowIso,
          nowIso
        );
      } catch (e) {
        console.warn('SQLite staff_points insert note:', e.message);
      }
    }

    const notifyPointsEnabled = getSetting('notify_points') !== 0 && getSetting('notify_points') !== 'false';
    for (const pointRecord of createdRecords) {
      broadcastEvent('POINT_UPDATE', { action: 'CREATED', point: pointRecord });
      if (notifyPointsEnabled) {
        sendPushNotification({
          staffIds: [pointRecord.staff_id, pointRecord.staff_uuid].filter(Boolean),
          title: '⚠️ Pemberitahuan Poin Pelanggaran',
          body: `Anda terkena pelanggaran atas alasan "${pointRecord.reason}" dan dibebankan poin sebesar ${pointRecord.points} Poin.`,
          url: '/',
          tag: `point_${pointRecord.id}`
        }).catch((errPush) => console.warn('Push point notification note:', errPush.message));
      }
    }

    const summaryMsg = createdRecords.length === 1
      ? `Poin sebesar ${roundedPoints} Poin berhasil diberikan kepada ${createdRecords[0].staff_name}.`
      : `Poin sebesar ${roundedPoints} Poin berhasil diberikan kepada ${createdRecords.length} staff terpilih secara terpisah.`;

    return res.json({
      success: true,
      count: createdRecords.length,
      message: summaryMsg,
      point: createdRecords[0],
      points: createdRecords
    });
  } catch (err) {
    console.error('Error creating staff point:', err);
    return res.status(500).json({ error: 'Gagal menyimpan poin pelanggaran: ' + err.message });
  }
});

router.post('/points/:id/acknowledge', async (req, res) => {
  const { id } = req.params;
  const { staffId, staffUuid, staffName, agreedTerms } = req.body || {};

  if (agreedTerms !== true) {
    return res.status(400).json({
      error: 'Anda wajib mencentang pernyataan janji perbaikan terlebih dahulu sebelum menekan "Saya Mengerti".'
    });
  }

  try {
    let updated = null;
    if (isSupabaseConfigured) {
      updated = await cloudDb.acknowledgeStaffPoint(id, {
        staffId,
        staffUuid,
        staffName,
        agreedPledge: POINT_PLEDGE_TEXT
      });
    }

    const nowIso = new Date().toISOString();
    try {
      db.prepare(`
        UPDATE staff_points
        SET status = 'ACKNOWLEDGED',
            agreed_pledge = ?,
            acknowledged_at = COALESCE(acknowledged_at, ?),
            acknowledged_by = COALESCE(acknowledged_by, ?),
            updated_at = ?
        WHERE id = ?
      `).run(POINT_PLEDGE_TEXT, nowIso, staffName || 'Staff', nowIso, id);

      if (!updated) {
        updated = db.prepare('SELECT * FROM staff_points WHERE id = ?').get(id);
      }
    } catch (e) {
      console.warn('SQLite staff_points acknowledge note:', e.message);
    }

    if (!updated) {
      return res.status(404).json({ error: 'Catatan poin tidak ditemukan.' });
    }

    broadcastEvent('POINT_UPDATE', { action: 'ACKNOWLEDGED', point: updated });

    return res.json({
      success: true,
      message: 'Terima kasih, persetujuan dan janji perbaikan Anda telah tercatat.',
      point: updated
    });
  } catch (err) {
    console.error('Error acknowledging staff point:', err);
    return res.status(500).json({ error: 'Gagal menyimpan konfirmasi: ' + err.message });
  }
});

router.delete('/points/:id', async (req, res) => {
  const { id } = req.params;
  const pin = req.body?.pin || req.query?.pin || req.headers['x-admin-pin'] || req.headers['x-manager-pin'];

  const auth = await verifyManagementAuth(pin);
  if (!auth.authorized || (auth.role !== 'MANAGER' && auth.role !== 'FULL_ADMIN')) {
    return res.status(403).json({
      error: 'Akses ditolak: Hanya Operational Manager yang berwenang menghapus catatan poin.'
    });
  }

  try {
    let deleted = false;
    if (isSupabaseConfigured) {
      deleted = await cloudDb.deleteStaffPoint(id);
    }
    try {
      const info = db.prepare('DELETE FROM staff_points WHERE id = ?').run(id);
      if (info.changes > 0) deleted = true;
    } catch {}

    if (!deleted) {
      return res.status(404).json({ error: 'Catatan poin tidak ditemukan.' });
    }

    broadcastEvent('POINT_UPDATE', { action: 'DELETED', id });
    return res.json({ success: true, message: 'Catatan poin berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting staff point:', err);
    return res.status(500).json({ error: 'Gagal menghapus catatan poin: ' + err.message });
  }
});

export default router;
