import fs from 'fs';
import path from 'path';
import { db, getSetting, setSetting } from './db.js';
import { isSupabaseConfigured, supabase, cloudDb } from './supabase.js';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch {}

/**
 * Creates a full system snapshot across Supabase and SQLite
 * @param {string} createdBy - Name of the manager or 'SYSTEM_CRON'
 */
export async function createSystemSnapshot(createdBy = 'General Manager') {
  const timestamp = new Date().toISOString();
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  let staffList = [];
  let attendanceList = [];
  let breakList = [];
  let settingsList = [];

  // 1. Fetch from Supabase Cloud if available
  if (isSupabaseConfigured && supabase) {
    try {
      const [sRes, aRes, bRes, setRes] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('attendance_logs').select('*'),
        supabase.from('break_logs').select('*'),
        supabase.from('app_settings').select('*')
      ]);

      staffList = sRes.data || [];
      attendanceList = aRes.data || [];
      breakList = bRes.data || [];
      settingsList = (setRes.data || []).filter(item => item.key !== 'system_backups');
    } catch (e) {
      console.warn('Supabase fetch error during snapshot:', e.message);
    }
  }

  // Fallback to SQLite if empty
  if (staffList.length === 0) {
    try { staffList = db.prepare('SELECT * FROM staff').all(); } catch {}
  }
  if (attendanceList.length === 0) {
    try { attendanceList = db.prepare('SELECT * FROM shifts').all(); } catch {}
  }

  const counts = {
    staff: staffList.length,
    attendance_logs: attendanceList.length,
    break_logs: breakList.length,
    app_settings: settingsList.length
  };

  const snapshot = {
    id: backupId,
    created_at: timestamp,
    created_by: createdBy,
    counts,
    data: {
      staff: staffList,
      attendance_logs: attendanceList,
      break_logs: breakList,
      app_settings: settingsList
    }
  };

  // 2. Save metadata & backup in Supabase app_settings with 30-day retention
  if (isSupabaseConfigured && supabase) {
    try {
      const existing = (await cloudDb.getSetting('system_backups')) || [];
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      // Filter out backups older than 30 days
      const activeBackups = existing.filter(b => {
        const bTs = new Date(b.created_at).getTime();
        return !isNaN(bTs) && bTs >= thirtyDaysAgo;
      });

      // Keep light metadata in list
      const metaRecord = {
        id: backupId,
        created_at: timestamp,
        created_by: createdBy,
        counts
      };

      activeBackups.unshift(metaRecord);
      await cloudDb.saveSetting('system_backups', activeBackups.slice(0, 30), 'System Disaster Recovery Snapshots');

      // Save raw data to dedicated key for this backupId
      await cloudDb.saveSetting(`backup_data_${backupId}`, snapshot, `Full Snapshot ${backupId}`);
    } catch (e) {
      console.warn('Failed to save snapshot to Supabase:', e.message);
    }
  }

  // 3. Save to local disk if directory is writable
  try {
    const filePath = path.join(BACKUP_DIR, `${backupId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch {}

  return {
    success: true,
    backup_id: backupId,
    created_at: timestamp,
    created_by: createdBy,
    counts
  };
}

/**
 * List all available system backup snapshots
 */
export async function listSystemBackups() {
  let list = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const supaList = await cloudDb.getSetting('system_backups');
      if (Array.isArray(supaList)) {
        list = supaList;
      }
    } catch {}
  }

  if (list.length === 0) {
    try {
      if (fs.existsSync(BACKUP_DIR)) {
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
          try {
            const raw = fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8');
            const parsed = JSON.parse(raw);
            list.push({
              id: parsed.id,
              created_at: parsed.created_at,
              created_by: parsed.created_by,
              counts: parsed.counts
            });
          } catch {}
        }
      }
    } catch {}
  }

  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return list;
}

/**
 * Restores system state from a specific backup snapshot
 * @param {string} backupId
 */
export async function restoreSystemSnapshot(backupId) {
  if (!backupId) throw new Error('ID Backup wajib disertakan.');

  let snapshot = null;

  // 1. Check Supabase dedicated key
  if (isSupabaseConfigured && supabase) {
    try {
      snapshot = await cloudDb.getSetting(`backup_data_${backupId}`);
    } catch {}
  }

  // 2. Check local disk fallback
  if (!snapshot) {
    try {
      const filePath = path.join(BACKUP_DIR, `${backupId}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        snapshot = JSON.parse(raw);
      }
    } catch {}
  }

  if (!snapshot || !snapshot.data) {
    throw new Error(`Data backup dengan ID "${backupId}" tidak ditemukan atau korup.`);
  }

  const { staff, attendance_logs, app_settings } = snapshot.data;
  let restoredCounts = { staff: 0, attendance_logs: 0, app_settings: 0 };

  // 3. Restore to Supabase Cloud
  if (isSupabaseConfigured && supabase) {
    if (Array.isArray(staff) && staff.length > 0) {
      const { error } = await supabase.from('staff').upsert(staff);
      if (!error) restoredCounts.staff = staff.length;
    }

    if (Array.isArray(attendance_logs) && attendance_logs.length > 0) {
      const { error } = await supabase.from('attendance_logs').upsert(attendance_logs);
      if (!error) restoredCounts.attendance_logs = attendance_logs.length;
    }

    if (Array.isArray(app_settings) && app_settings.length > 0) {
      const { error } = await supabase.from('app_settings').upsert(app_settings);
      if (!error) restoredCounts.app_settings = app_settings.length;
    }
  }

  // 4. Also update local SQLite
  try {
    if (Array.isArray(staff)) {
      const insertStaff = db.prepare(`
        INSERT OR REPLACE INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of staff) {
        insertStaff.run(
          s.legacy_code || s.id,
          s.name,
          s.venue,
          s.division,
          s.role,
          s.department || s.division,
          s.pin,
          s.shift_start || '13:00',
          s.shift_end || '22:00',
          s.standard_hours || 8.0,
          s.is_active ? 1 : 0
        );
      }
    }
  } catch (e) {
    console.warn('SQLite restore note:', e.message);
  }

  return {
    success: true,
    message: `Sistem berhasil dipulihkan dari backup ${backupId}.`,
    restoredCounts,
    snapshotTimestamp: snapshot.created_at
  };
}
