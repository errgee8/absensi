/**
 * Time utility for WITA (Indonesia Central Time / Asia/Makassar / UTC+8)
 * Includes Anti-Tampering Server Time Synchronization
 */

let serverTimeOffsetMs = 0;
let hasSyncedServerTime = false;

/**
 * Synchronize application time with the official server timestamp.
 * Even if the employee tampers with their device/phone clock forward or backward,
 * the application continues using the exact synchronized server time.
 */
export function syncServerTime(serverIsoOrTimestamp) {
  if (!serverIsoOrTimestamp) return;
  const serverMs = typeof serverIsoOrTimestamp === 'number'
    ? serverIsoOrTimestamp
    : new Date(serverIsoOrTimestamp).getTime();
  if (!isNaN(serverMs)) {
    serverTimeOffsetMs = serverMs - Date.now();
    hasSyncedServerTime = true;
  }
}

export function getServerTimeOffsetMs() {
  return serverTimeOffsetMs;
}

export function isServerTimeSynced() {
  return hasSyncedServerTime;
}

/**
 * Returns the current application time (device time corrected by server offset).
 */
export function getAppNow() {
  return new Date(Date.now() + serverTimeOffsetMs);
}

export function formatWitaDateTime(isoString) {
  const date = isoString ? new Date(isoString) : getAppNow();
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date) + ' WITA';
}

export function formatWitaTimeOnly(isoString) {
  const date = isoString ? new Date(isoString) : getAppNow();
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date) + ' WITA';
}

/**
 * Operational Business Day Cutoff Hour in WITA (07:00 AM).
 * Venue operates from 08:00 AM to 05:00 AM next morning.
 * After 07:00 AM, a brand new operational business day begins,
 * archiving yesterday's operational shifts.
 */
export const OPERATIONAL_DAY_CUTOFF_HOUR = 7;

/**
 * Returns the Operational Business Date in YYYY-MM-DD format (WITA Asia/Makassar).
 * - Shifts between 07:00 AM today and 06:59 AM tomorrow belong to today's operational day.
 * - Clock times from 00:00 to 06:59 AM WITA belong to previous calendar day's operational day.
 */
export function getOperationalDateYMD(date = getAppNow(), cutoffHour = OPERATIONAL_DAY_CUTOFF_HOUR) {
  if (!date) date = getAppNow();
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

/**
 * Returns Yesterday's Operational Business Date in YYYY-MM-DD format.
 */
export function getOperationalYesterdayYMD(date = new Date(), cutoffHour = OPERATIONAL_DAY_CUTOFF_HOUR) {
  const currentOp = getOperationalDateYMD(date, cutoffHour);
  const [y, m, d] = currentOp.split('-').map(Number);
  const prevDate = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
  const resY = prevDate.getUTCFullYear();
  const resM = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(prevDate.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

export function formatWitaDateOnly(isoString) {
  if (!isoString) return '-';
  if (typeof isoString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    const [y, m, d] = isoString.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';
  
  // Use operational business date so overnight shifts reflect their operational cycle
  const opDate = getOperationalDateYMD(date);
  const [y, m, d] = opDate.split('-');
  return `${d}/${m}/${y}`;
}

export function getWitaDateYMD(date = new Date()) {
  return getOperationalDateYMD(date);
}

export function formatWitaDateFull(isoString) {
  if (!isoString) return '-';
  let date;
  if (typeof isoString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    const [y, m, d] = isoString.split('-').map(Number);
    date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  } else {
    date = new Date(isoString);
  }
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes)) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatTimerSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

const MONTH_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

export function getPointCycleInfo(date = getAppNow()) {
  const d = typeof date === 'string' ? new Date(date) : (date || getAppNow());
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
