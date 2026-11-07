import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'checkin.db'));
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

ensureColumn('shifts', 'break_status', "TEXT DEFAULT 'NONE'");
ensureColumn('shifts', 'break_start_time', 'TEXT');
ensureColumn('shifts', 'break_start_photo', 'TEXT');
ensureColumn('shifts', 'break_end_time', 'TEXT');
ensureColumn('shifts', 'break_end_photo', 'TEXT');
ensureColumn('shifts', 'break_duration_minutes', 'INTEGER');
ensureColumn('shifts', 'break_count', 'INTEGER DEFAULT 0');

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
    venue_lat: -8.6885,
    venue_lng: 115.1558,
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
export const initShiftSchedules = () => {
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
    { venue: 'LuckyCat', division: 'Kitchen', shift_number: 4, name: 'Middle 2', start_time: '14:00', end_time: '00:00', is_flexible_checkout: 0, allows_break: 1, max_break_end: '20:00' }
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

// Seed exact staff roster specified by the user (JP staff + LuckyCat Kitchen staff)
export const seedExactStaffRoster = () => {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('DELETE FROM staff');
  db.exec('PRAGMA foreign_keys = ON');

  const allStaff = [
    // --- JP Karaoke Staff ---
    // Server (Division: Server and Cashier)
    { id: 'JP-SRV-01', name: 'Alex', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '1010', shift_start: '13:00', shift_end: '22:00', standard_hours: 9 },
    { id: 'JP-SRV-02', name: 'Dio', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '2020', shift_start: '13:00', shift_end: '22:00', standard_hours: 9 },
    { id: 'JP-SRV-03', name: 'Rojes', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '3030', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
    { id: 'JP-SRV-04', name: 'Dein', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '4040', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
    { id: 'JP-SRV-05', name: 'Made', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', pin: '5050', shift_start: '13:00', shift_end: '22:00', standard_hours: 9 },

    // Cashier (Division: Server and Cashier)
    { id: 'JP-CSH-01', name: 'Adis', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Cashier', department: 'Cashier', pin: '1212', shift_start: '13:00', shift_end: '22:00', standard_hours: 9 },
    { id: 'JP-CSH-02', name: 'Ica', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Cashier', department: 'Cashier', pin: '3880', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },

    // Cleaning service (Division: Cleaning Service)
    { id: 'JP-CLN-01', name: 'Yohan', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', pin: '2442', shift_start: '10:00', shift_end: '19:00', standard_hours: 9 },
    { id: 'JP-CLN-02', name: 'Emil', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', pin: '1991', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },

    // Storage (Division: Storage Staff - Updated timing: Pagi 10-19, Middle 13-22, Malam 18:30-03:30)
    { id: 'JP-STR-01', name: 'Aris', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', pin: '9889', shift_start: '10:00', shift_end: '19:00', standard_hours: 9 },
    { id: 'JP-STR-02', name: 'Galang', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', pin: '2001', shift_start: '13:00', shift_end: '22:00', standard_hours: 9 },
    { id: 'JP-STR-03', name: 'Febry', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', pin: '2889', shift_start: '18:30', shift_end: '03:30', standard_hours: 9 },

    // --- LuckyCat (LC) Kitchen Staff (with randomized PINs) ---
    { id: 'LC-KIT-01', name: 'Anto Suranto', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '4192', shift_start: '09:00', shift_end: '19:00', standard_hours: 10 },
    { id: 'LC-KIT-02', name: 'Martha Andi Wijaya', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '6381', shift_start: '18:00', shift_end: '03:00', standard_hours: 9 },
    { id: 'LC-KIT-03', name: 'Achmad Fazrin Febialdo (Edo)', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '2574', shift_start: '12:00', shift_end: '22:00', standard_hours: 10 },
    { id: 'LC-KIT-04', name: 'Nurjanah', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '8136', shift_start: '14:00', shift_end: '00:00', standard_hours: 10 },
    { id: 'LC-KIT-05', name: 'Ulul Albab', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '3920', shift_start: '09:00', shift_end: '19:00', standard_hours: 10 },
    { id: 'LC-KIT-06', name: 'Harun Ar Rasyid', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', pin: '7405', shift_start: '18:00', shift_end: '03:00', standard_hours: 9 }
  ];

  const stmt = db.prepare(`
    INSERT INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active)
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
