/**
 * Time utility for WITA (Indonesia Central Time / Asia/Makassar / UTC+8)
 */

export function formatWitaDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  
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
  if (!isoString) return '-';
  const date = new Date(isoString);
  
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date) + ' WITA';
}

export function formatWitaDateOnly(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
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
