/**
 * Shift Schedule Resolver & Division-Aware Shift Indicator
 * Automatically maps any attendance record to its exact shift (Shift 1, Shift 2, Shift 3, etc.)
 * based on venue, division, scheduled hours, or check-in timestamp in WITA.
 */

export const DEFAULT_SHIFT_SCHEDULES = [
  // JP Karaoke - Server and Cashier
  { venue: 'JP Karaoke', division: 'Server and Cashier', shift_number: 1, name: 'Shift 1', start_time: '13:00', end_time: '22:00' },
  { venue: 'JP Karaoke', division: 'Server and Cashier', shift_number: 2, name: 'Shift 2', start_time: '18:30', end_time: '03:00' },

  // JP Karaoke - Cleaning Service
  { venue: 'JP Karaoke', division: 'Cleaning Service', shift_number: 1, name: 'Shift 1', start_time: '10:00', end_time: '19:00' },
  { venue: 'JP Karaoke', division: 'Cleaning Service', shift_number: 2, name: 'Shift 2', start_time: '18:30', end_time: '03:00' },

  // JP Karaoke - Storage Staff
  { venue: 'JP Karaoke', division: 'Storage Staff', shift_number: 1, name: 'Shift 1 (Pagi)', start_time: '10:00', end_time: '19:00' },
  { venue: 'JP Karaoke', division: 'Storage Staff', shift_number: 2, name: 'Shift 2 (Middle)', start_time: '13:00', end_time: '22:00' },
  { venue: 'JP Karaoke', division: 'Storage Staff', shift_number: 3, name: 'Shift 3 (Malam)', start_time: '18:30', end_time: '03:30' },

  // JP Karaoke - Management
  { venue: 'JP Karaoke', division: 'Management', shift_number: 1, name: 'Fleksibel (Management)', start_time: '00:00', end_time: '23:59' },

  // LuckyCat - Bar, Cashier, and Server
  { venue: 'LuckyCat', division: 'Bar, Cashier, and Server', shift_number: 1, name: 'Shift 1', start_time: '10:00', end_time: '19:00' },
  { venue: 'LuckyCat', division: 'Bar, Cashier, and Server', shift_number: 2, name: 'Shift 2', start_time: '18:30', end_time: '03:30' },

  // LuckyCat - Kitchen
  { venue: 'LuckyCat', division: 'Kitchen', shift_number: 1, name: 'Shift 1', start_time: '09:00', end_time: '19:00' },
  { venue: 'LuckyCat', division: 'Kitchen', shift_number: 2, name: 'Shift 2', start_time: '18:00', end_time: '03:00' },
  { venue: 'LuckyCat', division: 'Kitchen', shift_number: 3, name: 'Middle 1', start_time: '12:00', end_time: '22:00' },
  { venue: 'LuckyCat', division: 'Kitchen', shift_number: 4, name: 'Middle 2', start_time: '14:00', end_time: '00:00' },

  // LuckyCat - Management
  { venue: 'LuckyCat', division: 'Management', shift_number: 1, name: 'Fleksibel (Management)', start_time: '00:00', end_time: '23:59' }
];

/**
 * Resolves full shift details for a given shift log.
 * @param {Object} shift - The shift or attendance record
 * @param {Array} schedules - Optional dynamic schedules from DB
 * @returns {Object} { shiftNumber, shiftName, badgeLabel, timeRange, colorScheme, badgeClass }
 */
export function resolveShift(shift, schedules = []) {
  if (!shift) {
    return {
      shiftNumber: 1,
      shiftName: 'Shift 1',
      badgeLabel: 'Shift 1',
      timeRange: '-',
      colorScheme: 'blue',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300'
    };
  }

  const division = (shift.staff_division || shift.division || shift.staff_role || '').trim();
  const venue = (shift.staff_venue || shift.venue || '').trim();
  const isMgmt = division.toLowerCase().includes('manage') ||
    (shift.scheduled_start === '00:00' && shift.scheduled_end === '23:59');

  if (isMgmt) {
    return {
      shiftNumber: null,
      shiftName: 'Fleksibel (Management)',
      badgeLabel: 'Fleksibel (Mgmt)',
      timeRange: 'Fleksibel',
      colorScheme: 'purple',
      badgeClass: 'bg-purple-100 text-purple-950 border-purple-300'
    };
  }

  // 1. Explicit shift number/name if already stored
  const rawShiftNumber = shift.shift_number != null ? Number(shift.shift_number) : null;
  const rawShiftName = shift.shift_name;

  // Use dynamic schedules from DB if available, otherwise defaults
  const pool = Array.isArray(schedules) && schedules.length > 0 ? schedules : DEFAULT_SHIFT_SCHEDULES;

  const normVenue = venue.replace(/\s+/g, '').toLowerCase();
  const venuePool = pool.filter((s) => {
    const sv = (s.venue || '').replace(/\s+/g, '').toLowerCase();
    return sv === normVenue ||
      (normVenue.includes('jp') && sv.includes('jp')) ||
      (normVenue.includes('lucky') && sv.includes('lucky'));
  });

  const divisionPool = venuePool.filter((s) => {
    return (s.division || '').toLowerCase() === division.toLowerCase();
  });

  const activePool = divisionPool.length > 0 ? divisionPool : (venuePool.length > 0 ? venuePool : pool);

  let matchedSchedule = null;

  // Try matching by scheduled_start
  if (shift.scheduled_start) {
    matchedSchedule = activePool.find((s) => s.start_time === shift.scheduled_start);
  }

  // Fallback: match by checkin_time in WITA
  if (!matchedSchedule && shift.checkin_time) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(new Date(shift.checkin_time));
      const h = Number(parts.find((p) => p.type === 'hour')?.value || 0);
      const m = Number(parts.find((p) => p.type === 'minute')?.value || 0);
      const checkinMinutes = h * 60 + m;

      let minDiff = Infinity;
      for (const s of activePool) {
        if (!s.start_time || !s.start_time.includes(':')) continue;
        const [sh, sm] = s.start_time.split(':').map(Number);
        const schedMin = sh * 60 + sm;
        let diff = Math.abs(checkinMinutes - schedMin);
        if (diff > 720) diff = 1440 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          matchedSchedule = s;
        }
      }
    } catch {}
  }

  const shiftNum = rawShiftNumber || matchedSchedule?.shift_number || 1;
  const shiftName = rawShiftName || matchedSchedule?.name || `Shift ${shiftNum}`;
  const startTime = shift.scheduled_start || matchedSchedule?.start_time || '-';
  const endTime = shift.scheduled_end || matchedSchedule?.end_time || '-';
  const timeRange = startTime !== '-' && endTime !== '-' ? `${startTime} - ${endTime}` : '-';

  // Format badge label nicely
  let badgeLabel = `Shift ${shiftNum}`;
  if (shiftName && !shiftName.toLowerCase().startsWith('shift')) {
    badgeLabel = `${shiftName} (S${shiftNum})`;
  } else if (shiftName) {
    badgeLabel = shiftName;
  }

  const colorMap = {
    1: { scheme: 'blue', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
    2: { scheme: 'indigo', badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
    3: { scheme: 'amber', badgeClass: 'bg-amber-100 text-amber-950 border-amber-300' },
    4: { scheme: 'teal', badgeClass: 'bg-teal-100 text-teal-950 border-teal-300' }
  };

  const selectedColor = colorMap[shiftNum] || {
    scheme: 'slate',
    badgeClass: 'bg-slate-100 text-slate-900 border-slate-300'
  };

  return {
    shiftNumber: shiftNum,
    shiftName,
    badgeLabel,
    timeRange,
    colorScheme: selectedColor.scheme,
    badgeClass: selectedColor.badgeClass
  };
}
