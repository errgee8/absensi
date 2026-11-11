/**
 * Shift Schedule Intelligence & Break Policy Utilities
 * Timezone: WITA (Asia/Makassar, UTC+8)
 */

export function getWitaTimeString(date = new Date()) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const curH = parts.find((p) => p.type === 'hour')?.value || '00';
  const curM = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${curH}:${curM}`;
}

export const OPERATIONAL_DAY_CUTOFF_HOUR = 7;

export function getOperationalDateYMD(date = new Date(), cutoffHour = OPERATIONAL_DAY_CUTOFF_HOUR) {
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

export function getOperationalYesterdayYMD(date = new Date(), cutoffHour = OPERATIONAL_DAY_CUTOFF_HOUR) {
  const currentOp = getOperationalDateYMD(date, cutoffHour);
  const [y, m, d] = currentOp.split('-').map(Number);
  const prevDate = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
  const resY = prevDate.getUTCFullYear();
  const resM = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(prevDate.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

export function getWitaDateYMD(date = new Date()) {
  return getOperationalDateYMD(date);
}

export function toMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return 780;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function circularDiffMinutes(m1, m2) {
  let diff = Math.abs(m1 - m2);
  if (diff > 720) diff = 1440 - diff;
  return diff;
}

/**
 * Calculates the break cutoff time (strictly 2 hours before shift ends).
 * Example:
 *  - 22:00 -> cutoff 20:00
 *  - 03:00 -> cutoff 01:00
 *  - 19:00 -> cutoff 17:00
 *  - 03:30 -> cutoff 01:30
 */
export function getBreakCutoff(endTimeStr) {
  if (!endTimeStr || !endTimeStr.includes(':')) {
    return { cutoffMinutes: 1200, cutoffTimeStr: '20:00' };
  }
  const endMinutes = toMinutes(endTimeStr);
  const cutoffMinutes = (endMinutes - 120 + 1440) % 1440;
  const cutoffH = Math.floor(cutoffMinutes / 60);
  const cutoffM = cutoffMinutes % 60;
  return {
    cutoffMinutes,
    cutoffTimeStr: `${String(cutoffH).padStart(2, '0')}:${String(cutoffM).padStart(2, '0')}`
  };
}

/**
 * Checks whether staff is currently allowed to start a break.
 * Rules:
 *  1. If break window (breakStartWindow & breakEndWindow) is specified, current time must fall inside this window.
 *  2. Hard constraint: Break must be finished at least 2 hours before shift ends.
 */
export function isBreakAllowedNow(startTimeStr, endTimeStr, checkTime = new Date(), breakStartWindow = null, breakEndWindow = null) {
  if (!startTimeStr || !endTimeStr) return true;

  const curTimeStr = typeof checkTime === 'string' && checkTime.includes(':') && !checkTime.includes('T')
    ? checkTime
    : getWitaTimeString(checkTime);

  const curM = toMinutes(curTimeStr);

  // 1. Explicit Break Window (e.g. allowed break button shown from xx to xx)
  if (breakStartWindow && breakEndWindow) {
    const bStartM = toMinutes(breakStartWindow);
    const bEndM = toMinutes(breakEndWindow);
    if (bEndM >= bStartM) {
      if (curM < bStartM || curM > bEndM) return false;
    } else {
      // Overnight break window (e.g. 23:00 to 02:00)
      if (curM < bStartM && curM > bEndM) return false;
    }
  } else if (breakStartWindow) {
    const bStartM = toMinutes(breakStartWindow);
    if (curM < bStartM) return false;
  } else if (breakEndWindow) {
    const bEndM = toMinutes(breakEndWindow);
    if (curM > bEndM) return false;
  }

  // 2. 2-Hours Before Shift End Cutoff
  const startM = toMinutes(startTimeStr);
  const endM = toMinutes(endTimeStr);
  const { cutoffMinutes } = getBreakCutoff(endTimeStr);

  const isOvernight = endM < startM;
  if (!isOvernight) {
    // Normal daytime shift (e.g. 13:00 - 22:00, cutoff 20:00)
    return curM <= cutoffMinutes;
  } else {
    // Overnight shift (e.g. 18:30 - 03:00, cutoff 01:00, end 03:00)
    if (curM > cutoffMinutes && curM < endM) {
      return false;
    }
    return true;
  }
}

/**
 * Auto-detects shift schedule only within a strict 30-minute window
 * before and after the shift's scheduled start time.
 *
 * If outside ±30 mins, returns the closest schedule with autoDetected = false,
 * prompting the user to confirm/choose the correct shift.
 */
export function detectShiftSchedule(schedules, checkinTime = new Date()) {
  if (!schedules || schedules.length === 0) {
    return {
      name: 'Shift Standar',
      shift_number: 1,
      start_time: '13:00',
      end_time: '22:00',
      is_flexible_checkout: 0,
      allows_break: 1,
      max_break_end: '20:00',
      autoDetected: false
    };
  }

  // Management / Full Flexible shift detection
  const mgmtSched = schedules.find(s => s.division === 'Management' || (s.start_time === '00:00' && s.end_time === '23:59'));
  if (mgmtSched) {
    return {
      ...mgmtSched,
      autoDetected: true,
      diffMinutes: 0,
      max_break_end: null
    };
  }

  const curTimeStr = getWitaTimeString(checkinTime);
  const curM = toMinutes(curTimeStr);

  // 1. Strict ±30 minutes check
  for (const sched of schedules) {
    const sM = toMinutes(sched.start_time);
    const diff = circularDiffMinutes(curM, sM);
    if (diff <= 30) {
      const { cutoffTimeStr } = getBreakCutoff(sched.end_time);
      return {
        ...sched,
        autoDetected: true,
        diffMinutes: diff,
        max_break_end: cutoffTimeStr
      };
    }
  }

  // 2. Outside ±30 minutes window -> find closest schedule as default selection
  let best = schedules[0];
  let minDiff = 999999;
  for (const sched of schedules) {
    const sM = toMinutes(sched.start_time);
    const diff = circularDiffMinutes(curM, sM);
    if (diff < minDiff) {
      minDiff = diff;
      best = sched;
    }
  }

  const { cutoffTimeStr } = getBreakCutoff(best.end_time);
  return {
    ...best,
    autoDetected: false,
    diffMinutes: minDiff,
    max_break_end: cutoffTimeStr
  };
}

const MONTH_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Builds monthly point cycle info from a start year/month (cutoff cycle: 17th to 13th next month).
 */
export function buildPointCycle(startYear, startMonth) {
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 12) {
    endMonth = 1;
    endYear += 1;
  }
  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-17`;
  const cutoffDate = `${endYear}-${String(endMonth).padStart(2, '0')}-13`;
  const label = `17 ${MONTH_SHORT_ID[startMonth - 1]} ${startYear} – 13 ${MONTH_SHORT_ID[endMonth - 1]} ${endYear}`;
  return {
    cycleKey: startDate,
    startDate,
    cutoffDate,
    label
  };
}

export function getPointCycleFromKey(cycleKey) {
  if (!cycleKey || typeof cycleKey !== 'string') return getPointCycleInfo(new Date());
  const parts = cycleKey.split('-').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return getPointCycleInfo(new Date());
  }
  return buildPointCycle(parts[0], parts[1]);
}

/**
 * Returns the active monthly point accumulation cycle in WITA:
 * Resets on the 17th of each month and runs through the 13th of next month.
 */
export function getPointCycleInfo(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : (date || new Date());
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(validDate);

  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);

  let startYear = year;
  let startMonth = month;
  if (day < 17) {
    startMonth -= 1;
    if (startMonth < 1) {
      startMonth = 12;
      startYear -= 1;
    }
  }
  return buildPointCycle(startYear, startMonth);
}

export function getRecentPointCycles(count = 6, refDate = new Date()) {
  const current = getPointCycleInfo(refDate);
  const [startY, startM] = current.cycleKey.split('-').map(Number);
  const cycles = [];
  let y = startY;
  let m = startM;
  for (let i = 0; i < count; i++) {
    cycles.push(buildPointCycle(y, m));
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return cycles;
}
