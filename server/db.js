import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const dataDir = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = isServerless ? path.join('/tmp', 'uploads') : path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'checkin.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS shift_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue TEXT NOT NULL,
    division TEXT NOT NULL,
    shift_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_flexible_checkout INTEGER DEFAULT 0,
    allows_break INTEGER DEFAULT 0,
    max_break_end TEXT,
    break_start_time TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    venue TEXT DEFAULT 'JP Karaoke',
    division TEXT DEFAULT 'Server and Cashier',
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    pin TEXT DEFAULT '1234',
    avatar TEXT,
    shift_id INTEGER,
    shift_start TEXT DEFAULT '13:00',
    shift_end TEXT DEFAULT '22:00',
    standard_hours REAL DEFAULT 8.0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL,
    date TEXT NOT NULL,
    scheduled_start TEXT,
    scheduled_end TEXT,
    checkin_time TEXT NOT NULL,
    checkin_lat REAL,
    checkin_lng REAL,
    checkin_accuracy REAL,
    checkin_distance REAL,
    checkin_photo TEXT,
    checkin_ip TEXT,
    checkin_wifi_pass INTEGER DEFAULT 1,
    break_status TEXT DEFAULT 'NONE',
    break_start_time TEXT,
    break_start_photo TEXT,
    break_end_time TEXT,
    break_end_photo TEXT,
    break_duration_minutes INTEGER,
    break_count INTEGER DEFAULT 0,
    checkout_time TEXT,
    checkout_lat REAL,
    checkout_lng REAL,
    checkout_accuracy REAL,
    checkout_distance REAL,
    checkout_photo TEXT,
    checkout_ip TEXT,
    checkout_wifi_pass INTEGER,
    duration_minutes INTEGER,
    status TEXT DEFAULT 'IN_PROGRESS',
    flags TEXT DEFAULT '[]',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    urgency TEXT DEFAULT 'NORMAL',
    target_venue TEXT DEFAULT 'ALL',
    author_name TEXT DEFAULT 'General Manager',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcement_reads (
    id TEXT PRIMARY KEY,
    announcement_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_venue TEXT,
    staff_division TEXT,
    read_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(announcement_id) REFERENCES announcements(id)
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_role TEXT,
    staff_venue TEXT,
    staff_division TEXT,
    type TEXT NOT NULL,
    category TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    requested_days INTEGER DEFAULT 1,
    approved_days INTEGER,
    approved_start_date TEXT,
    approved_end_date TEXT,
    reason TEXT NOT NULL,
    photo_url TEXT,
    document_url TEXT,
    status TEXT DEFAULT 'PENDING',
    manager_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    year INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    urgency TEXT DEFAULT 'NORMAL',
    target_venue TEXT DEFAULT 'ALL',
    author_name TEXT DEFAULT 'General Manager',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcement_reads (
    id TEXT PRIMARY KEY,
    announcement_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_venue TEXT,
    staff_division TEXT,
    read_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(announcement_id) REFERENCES announcements(id)
  );
`);

// Safe column migrations
const ensureColumn = (tableName, columnName, definition) => {
  const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = info.some((col) => col.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

ensureColumn('staff', 'venue', "TEXT DEFAULT 'JP Karaoke'");
ensureColumn('staff', 'division', "TEXT DEFAULT 'Server and Cashier'");
ensureColumn('staff', 'shift_id', 'INTEGER');
ensureColumn('staff', 'uuid', 'TEXT');

ensureColumn('shifts', 'supabase_id', 'TEXT');
ensureColumn('shifts', 'break_status', "TEXT DEFAULT 'NONE'");
ensureColumn('shifts', 'break_start_time', 'TEXT');
ensureColumn('shifts', 'break_start_photo', 'TEXT');
ensureColumn('shifts', 'break_end_time', 'TEXT');
ensureColumn('shifts', 'break_end_photo', 'TEXT');
ensureColumn('shifts', 'break_duration_minutes', 'INTEGER');
ensureColumn('shifts', 'break_count', 'INTEGER DEFAULT 0');
ensureColumn('leave_requests', 'document_url', 'TEXT');
ensureColumn('leave_requests', 'departure_time', 'TEXT');
ensureColumn('leave_requests', 'active_shift_id', 'TEXT');
ensureColumn('announcements', 'expires_at', 'TEXT');

// Settings Helper
export const getSetting = (key) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
};

export const setSetting = (key, value) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
};

const initSettings = () => {
  const defaults = {
    venue_name: 'JP Karaoke & LuckyCat Outlets',
    admin_pin: '8080',
    venue_lat: -8.780981,
    venue_lng: 115.176863,
    geofence_radius: 150,
    allowed_subnets: [
      '192.168.1.0/24',
      '192.168.0.0/24',
      '10.0.0.0/8',
      '172.16.0.0/12',
      '127.0.0.1/32',
      '::1/128',
      '::ffff:127.0.0.1/128'
    ],
    enforce_wifi: 0,
    timezone: 'Asia/Makassar',
    grace_period_minutes: 10
  };

  for (const [key, val] of Object.entries(defaults)) {
    if (getSetting(key) === null) {
      setSetting(key, val);
    }
  }
};

// Seed Shift Schedules (Exact Timings per prompt specifications)
export const initShiftSchedules = (force = false) => {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM shift_schedules').get()?.count || 0;
  if (existingCount >= 10 && !force) {
    return;
  }
  db.exec('DELETE FROM shift_schedules');

  const schedules = [
    // --- JP Karaoke (No breaks allowed) ---
    // 1. Server and Cashier
    { venue: 'JP Karaoke', division: 'Server and Cashier', shift_number: 1, name: 'Shift 1', start_time: '13:00', end_time: '22:00', is_flexible_checkout: 0, allows_break: 0, max_break_end: null },
    { venue: 'JP Karaoke', division: 'Server and Cashier', shift_number: 2, name: 'Shift 2', start_time: '18:30', end_time: '03:00', is_flexible_checkout: 1, allows_break: 0, max_break_end: null },

    // 2. Cleaning Service
    { venue: 'JP Karaoke', division: 'Cleaning Service', shift_number: 1, name: 'Shift 1', start_time: '10:00', end_time: '19:00', is_flexible_checkout: 0, allows_break: 0, max_break_end: null },
    { venue: 'JP Karaoke', division: 'Cleaning Service', shift_number: 2, name: 'Shift 2', start_time: '18:30', end_time: '03:00', is_flexible_checkout: 1, allows_break: 0, max_break_end: null },

    // 3. Storage Staff (Updated per user request: Shift 1 Pagi 10:00-19:00, Shift 2 Middle 13:00-22:00, Shift 3 Malam 18:30-03:30)
    { venue: 'JP Karaoke', division: 'Storage Staff', shift_number: 1, name: 'Shift 1 (Pagi)', start_time: '10:00', end_time: '19:00', is_flexible_checkout: 0, allows_break: 0, max_break_end: null },
    { venue: 'JP Karaoke', division: 'Storage Staff', shift_number: 2, name: 'Shift 2 (Middle)', start_time: '13:00', end_time: '22:00', is_flexible_checkout: 0, allows_break: 0, max_break_end: null },
    { venue: 'JP Karaoke', division: 'Storage Staff', shift_number: 3, name: 'Shift 3 (Malam)', start_time: '18:30', end_time: '03:30', is_flexible_checkout: 1, allows_break: 0, max_break_end: null },

    // 4. Management (Full Flexible - JP Karaoke)
    { venue: 'JP Karaoke', division: 'Management', shift_number: 1, name: 'Fleksibel (Management)', start_time: '00:00', end_time: '23:59', is_flexible_checkout: 1, allows_break: 0, max_break_end: null },

    // --- LuckyCat (Allows 1 hr break, max break end 16:00 for Shift 1, 01:00 for Shift 2) ---
    // 1. Bar, Cashier, and Server
    { venue: 'LuckyCat', division: 'Bar, Cashier, and Server', shift_number: 1, name: 'Shift 1', start_time: '10:00', end_time: '19:00', is_flexible_checkout: 0, allows_break: 1, max_break_end: '16:00' },
    { venue: 'LuckyCat', division: 'Bar, Cashier, and Server', shift_number: 2, name: 'Shift 2', start_time: '18:30', end_time: '03:30', is_flexible_checkout: 0, allows_break: 1, max_break_end: '01:00' },

    // 2. Kitchen (LuckyCat Kitchen Shifts per prompt)
    // Shift 1: 09:00 - 19:00
    { venue: 'LuckyCat', division: 'Kitchen', shift_number: 1, name: 'Shift 1', start_time: '09:00', end_time: '19:00', is_flexible_checkout: 0, allows_break: 1, max_break_end: '16:00' },
    // Shift 2: 18:00 - 03:00
    { venue: 'LuckyCat', division: 'Kitchen', shift_number: 2, name: 'Shift 2', start_time: '18:00', end_time: '03:00', is_flexible_checkout: 1, allows_break: 1, max_break_end: '01:00' },
    // Middle 1: 12:00 - 22:00
    { venue: 'LuckyCat', division: 'Kitchen', shift_number: 3, name: 'Middle 1', start_time: '12:00', end_time: '22:00', is_flexible_checkout: 0, allows_break: 1, max_break_end: '18:00' },
    // Middle 2: 14:00 - 00:00
    { venue: 'LuckyCat', division: 'Kitchen', shift_number: 4, name: 'Middle 2', start_time: '14:00', end_time: '00:00', is_flexible_checkout: 0, allows_break: 1, max_break_end: '20:00' },

    // 3. Management (Full Flexible - LuckyCat)
    { venue: 'LuckyCat', division: 'Management', shift_number: 1, name: 'Fleksibel (Management)', start_time: '00:00', end_time: '23:59', is_flexible_checkout: 1, allows_break: 0, max_break_end: null }
  ];

  const insert = db.prepare(`
    INSERT INTO shift_schedules (venue, division, shift_number, name, start_time, end_time, is_flexible_checkout, allows_break, max_break_end)
    VALUES (@venue, @division, @shift_number, @name, @start_time, @end_time, @is_flexible_checkout, @allows_break, @max_break_end)
  `);

  const insertMany = db.transaction((list) => {
    for (const item of list) insert.run(item);
  });

  insertMany(schedules);
};

// Seed exact staff roster specified by the user (JP staff + LuckyCat staff - 34 total)
export const seedExactStaffRoster = (force = false) => {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM staff').get()?.count || 0;
  if (existingCount >= 34 && !force) {
    return;
  }

  if (force || existingCount === 0) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM staff');
    db.exec('PRAGMA foreign_keys = ON');
  }

  const allStaff = [
    // --- JP Karaoke Staff (14 staff) ---
    { id: 'JP-CAS-01', name: 'Ica', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Cashier', department: 'Cashier', pin: '6443', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
    { id: 'JP-CAS-02', name: 'Adis', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Cashier', department: 'Cashier', pin: '3447', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
    { id: 'JP-SER-03', name: 'Rojes', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '4108', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
    { id: 'JP-SER-04', name: 'Alex', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '5144', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
    { id: 'JP-SER-05', name: 'Dio', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '8069', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
    { id: 'JP-SER-06', name: 'Made', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '2937', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
    { id: 'JP-SER-07', name: 'Dein', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '3763', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
    { id: 'JP-SER-8978737', name: 'Hendy', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Server and Cashier', pin: '2687', shift_start: '13:00', shift_end: '22:00', standard_hours: 8.5 },
    { id: 'JP-CLE-08', name: 'Yohan', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', pin: '9267', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'JP-CLE-09', name: 'Emil', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', pin: '2005', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
    { id: 'JP-CLE-10', name: 'Anang', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', pin: '2666', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'JP-STO-11', name: 'Aris', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', pin: '9315', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'JP-STO-12', name: 'Galang', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', pin: '5449', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
    { id: 'JP-STO-13', name: 'Febry', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', pin: '4471', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },

    // --- LuckyCat (LC) Staff (21 staff) ---
    { id: 'LC-SER-01', name: 'Roni', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '1212', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-SER-02', name: 'Dika', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '2011', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-SER-03', name: 'Haslam', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '3858', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
    { id: 'LC-SER-04', name: 'Ferin', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '4567', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
    { id: 'LC-SER-05', name: 'Oky', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '2740', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-SER-06', name: 'Martin', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '7967', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
    { id: 'LC-SER-07', name: 'Andre', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '2589', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-SER-08', name: 'Fontana', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', pin: '3451', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
    { id: 'LC-CAS-09', name: 'Santi', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Cashier', department: 'Cashier', pin: '8869', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-CAS-10', name: 'Manda', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Cashier', department: 'Cashier', pin: '4485', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
    { id: 'LC-CAS-11', name: 'Widia', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Cashier', department: 'Cashier', pin: '7514', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-BAR-12', name: 'Gerry', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', pin: '3714', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-BAR-13', name: 'Mada', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', pin: '7297', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
    { id: 'LC-BAR-14', name: 'Raymond', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', pin: '5484', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
    { id: 'LC-BAR-15', name: 'Jackson', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', pin: '6834', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
    { id: 'LC-KIT-16', name: 'Anto', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '7205', shift_start: '09:00', shift_end: '19:00', standard_hours: 10.0 },
    { id: 'LC-KIT-17', name: 'Nurjanah', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '4290', shift_start: '14:00', shift_end: '00:00', standard_hours: 10.0 },
    { id: 'LC-KIT-18', name: 'Martha', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '7672', shift_start: '18:00', shift_end: '03:00', standard_hours: 9.0 },
    { id: 'LC-KIT-19', name: 'Edo', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '4421', shift_start: '12:00', shift_end: '22:00', standard_hours: 10.0 },
    { id: 'LC-KIT-20', name: 'Ulul', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '9466', shift_start: '09:00', shift_end: '19:00', standard_hours: 10.0 },
    { id: 'LC-KIT-21', name: 'Harun', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '8867', shift_start: '18:00', shift_end: '03:00', standard_hours: 9.0 }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const s of allStaff) {
    stmt.run(s.id, s.name, s.venue, s.division, s.role, s.department, s.pin, s.shift_start, s.shift_end, s.standard_hours);
  }
};

initSettings();
initShiftSchedules();
seedExactStaffRoster();

export { db, uploadsDir };
