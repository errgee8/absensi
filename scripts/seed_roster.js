import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const jpStaff = [
  // Cashier
  { name: 'Ica', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Cashier', department: 'Cashier', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
  { name: 'Adis', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Cashier', department: 'Cashier', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
  // Server
  { name: 'Rojes', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
  { name: 'Alex', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
  { name: 'Dio', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
  { name: 'Made', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
  { name: 'Dein', venue: 'JP Karaoke', division: 'Server and Cashier', role: 'Server', department: 'Service', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
  // Cleaning Service
  { name: 'Yohan', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Emil', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', shift_start: '18:30', shift_end: '03:00', standard_hours: 8.5 },
  { name: 'Anang', venue: 'JP Karaoke', division: 'Cleaning Service', role: 'Cleaning Service', department: 'Housekeeping', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  // Storage
  { name: 'Aris', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Galang', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', shift_start: '13:00', shift_end: '22:00', standard_hours: 9.0 },
  { name: 'Febry', venue: 'JP Karaoke', division: 'Storage Staff', role: 'Storage Staff', department: 'Logistics', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 }
];

const lcStaff = [
  // Server
  { name: 'Roni', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Dika', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Haslam', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
  { name: 'Ferin', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
  { name: 'Oky', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Martin', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
  { name: 'Andre', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Fontana', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Server', department: 'Service', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
  // Cashier
  { name: 'Santi', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Cashier', department: 'Cashier', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Manda', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Cashier', department: 'Cashier', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
  { name: 'Widia', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Cashier', department: 'Cashier', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  // Bar
  { name: 'Gerry', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Mada', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
  { name: 'Raymond', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', shift_start: '10:00', shift_end: '19:00', standard_hours: 9.0 },
  { name: 'Jackson', venue: 'LuckyCat', division: 'Bar, Cashier, and Server', role: 'Bar Staff', department: 'Bar', shift_start: '18:30', shift_end: '03:30', standard_hours: 9.0 },
  // Kitchen
  { name: 'Anto', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', shift_start: '09:00', shift_end: '19:00', standard_hours: 10.0 },
  { name: 'Nurjanah', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', shift_start: '14:00', shift_end: '00:00', standard_hours: 10.0 },
  { name: 'Martha', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', shift_start: '18:00', shift_end: '03:00', standard_hours: 9.0 },
  { name: 'Edo', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', shift_start: '12:00', shift_end: '22:00', standard_hours: 10.0 },
  { name: 'Ulul', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', shift_start: '09:00', shift_end: '19:00', standard_hours: 10.0 },
  { name: 'Harun', venue: 'LuckyCat', division: 'Kitchen', role: 'Kitchen Staff', department: 'Kitchen', shift_start: '18:00', shift_end: '03:00', standard_hours: 9.0 }
];

// Generate unique, clean 4-digit PINs (excluding admin pins 8980, 8080)
const usedPins = new Set(['8980', '8080', '7988', '7070', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999']);
function getUniquePin() {
  while (true) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!usedPins.has(pin)) {
      usedPins.add(pin);
      return pin;
    }
  }
}

// Build roster
let jpCounter = 1;
let lcCounter = 1;
const allStaff = [];

for (const s of jpStaff) {
  const code = `JP-${s.role.substring(0, 3).toUpperCase()}-${String(jpCounter++).padStart(2, '0')}`;
  allStaff.push({
    ...s,
    id: code,
    legacy_code: code,
    pin: getUniquePin(),
    is_active: 1
  });
}

for (const s of lcStaff) {
  const code = `LC-${s.role.substring(0, 3).toUpperCase()}-${String(lcCounter++).padStart(2, '0')}`;
  allStaff.push({
    ...s,
    id: code,
    legacy_code: code,
    pin: getUniquePin(),
    is_active: 1
  });
}

async function runSeed() {
  console.log(`=== SEEDING FULL ROSTER (${allStaff.length} STAFF MEMBERS) ===`);

  // 1. Update SQLite
  const dbPath = path.join(rootDir, 'data', 'checkin.db');
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath);
    db.pragma('foreign_keys = OFF');
    db.prepare('DELETE FROM shifts').run();
    db.prepare('DELETE FROM staff').run();

    const insertStmt = db.prepare(`
      INSERT INTO staff (id, name, venue, division, role, department, pin, shift_start, shift_end, standard_hours, is_active)
      VALUES (@id, @name, @venue, @division, @role, @department, @pin, @shift_start, @shift_end, @standard_hours, @is_active)
    `);

    for (const staff of allStaff) {
      insertStmt.run(staff);
    }
    db.pragma('foreign_keys = ON');
    console.log(`✅ SQLite updated: ${allStaff.length} staff records inserted. All test shifts deleted.`);
  }

  // 2. Update Supabase Cloud
  const supabaseUrl = process.env.SUPABASE_URL || 'https://lmnxmaauxvhqlfxkxruq.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_BUF7h-NV1YNYauHAZSquJw_9vjaVr4e';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Clear test shifts and breaks in Supabase
  try {
    await supabase.from('break_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attendance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('staff').delete().neq('name', '___NON_EXISTENT___');

    // Insert staff into Supabase
    const { data, error } = await supabase.from('staff').insert(
      allStaff.map(s => ({
        legacy_code: s.id,
        name: s.name,
        pin: s.pin,
        role: s.role,
        venue: s.venue,
        division: s.division,
        department: s.department,
        shift_start: s.shift_start,
        shift_end: s.shift_end,
        standard_hours: s.standard_hours,
        is_active: true
      }))
    ).select();

    if (error) {
      console.error('Supabase seed error:', error);
    } else {
      console.log(`✅ Supabase Cloud updated: ${data.length} staff records live. Test shifts cleared.`);
    }
  } catch (err) {
    console.error('Supabase sync error:', err.message);
  }

  // 3. Generate clean formatted text report
  let txtContent = `================================================================================
JP KARAOKE & LUCKY CAT — OFFICIAL STAFF ROSTER & ASSIGNED SECRET PINS
Generated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA
CONFIDENTIAL — FOR MANAGEMENT USE ONLY
================================================================================\n\n`;

  txtContent += `--------------------------------------------------------------------------------\n`;
  txtContent += `1. JP KARAOKE (TOTAL: ${jpStaff.length} STAF)\n`;
  txtContent += `--------------------------------------------------------------------------------\n`;
  txtContent += `NO.  NAMA KARYAWAN       DIVISI / ROLE          SHIFT KERJA     PIN RAHASIA\n`;
  txtContent += `---  ------------------  ---------------------  --------------  -----------\n`;

  let jpIdx = 1;
  for (const s of allStaff.filter(x => x.venue === 'JP Karaoke')) {
    txtContent += `${String(jpIdx++).padEnd(5)}${s.name.padEnd(20)}${(s.division + ' / ' + s.role).padEnd(23)}${(s.shift_start + ' - ' + s.shift_end).padEnd(16)}[ ${s.pin} ]\n`;
  }

  txtContent += `\n--------------------------------------------------------------------------------\n`;
  txtContent += `2. LUCKY CAT (LC) (TOTAL: ${lcStaff.length} STAF)\n`;
  txtContent += `--------------------------------------------------------------------------------\n`;
  txtContent += `NO.  NAMA KARYAWAN       DIVISI / ROLE          SHIFT KERJA     PIN RAHASIA\n`;
  txtContent += `---  ------------------  ---------------------  --------------  -----------\n`;

  let lcIdx = 1;
  for (const s of allStaff.filter(x => x.venue === 'LuckyCat')) {
    txtContent += `${String(lcIdx++).padEnd(5)}${s.name.padEnd(20)}${(s.division + ' / ' + s.role).padEnd(23)}${(s.shift_start + ' - ' + s.shift_end).padEnd(16)}[ ${s.pin} ]\n`;
  }

  txtContent += `\n================================================================================\n`;
  txtContent += `PANDUAN OPERASIONAL STAF:\n`;
  txtContent += `1. Buka link: https://absensi-jplc.vercel.app\n`;
  txtContent += `2. Ketik 4 digit PIN masing-masing pada tombol angka.\n`;
  txtContent += `3. Tekan tombol [AMBIL FOTO & CHECK-IN] atau [AMBIL FOTO & CHECK-OUT].\n`;
  txtContent += `4. Ambil foto selfie -> sistem otomatis selesai dan keluar dalam 3 detik.\n`;
  txtContent += `================================================================================\n`;

  const txtPath = path.join(rootDir, 'DAFTAR_PIN_KARYAWAN.txt');
  fs.writeFileSync(txtPath, txtContent, 'utf8');
  console.log(`✅ Text file generated: ${txtPath}`);
  console.log('\n' + txtContent);
}

runSeed();
