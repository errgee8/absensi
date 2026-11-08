/**
 * Auto-detects which shift schedule matches a staff member's check-in event.
 * Eliminates hardcoded shift-binding so staff (e.g. Ica) can work Shift 1 or Shift 2 seamlessly.
 */
export function detectShiftSchedule(schedules, checkinTime = new Date()) {
  if (!schedules || schedules.length === 0) {
    return {
      name: 'Shift Standar',
      shift_number: 1,
      start_time: '13:00',
      end_time: '22:00',
      is_flexible_checkout: 0,
      allows_break: 0,
      max_break_end: null
    };
  }

  if (schedules.length === 1) {
    return schedules[0];
  }

  // Extract WITA (UTC+8) time components
  const d = new Date(checkinTime);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const curH = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const curM = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const curTotalM = curH * 60 + curM;

  const toMinutes = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return 780;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const circularDiff = (m1, m2) => {
    let diff = Math.abs(m1 - m2);
    if (diff > 720) diff = 1440 - diff;
    return diff;
  };

  let bestMatch = schedules[0];
  let minDiff = 999999;

  for (const sched of schedules) {
    const schedStartM = toMinutes(sched.start_time);
    const diff = circularDiff(curTotalM, schedStartM);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = sched;
    }
  }

  return bestMatch;
}
