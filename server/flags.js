import { isWithinGeofence } from './geofence.js';
import { validateClientNetwork } from './network.js';
import { getSetting, db } from './db.js';

export const FLAG_TYPES = {
  MISSING_CHECKOUT: 'FLAG_MISSING_CHECKOUT',
  MISSING_CHECKIN: 'FLAG_MISSING_CHECKIN',
  EARLY_CHECKOUT: 'FLAG_EARLY_CHECKOUT',
  LATE_CHECKIN: 'FLAG: Late Check-In (>10m Grace)',
  NETWORK_MISMATCH: 'FLAG_NETWORK_MISMATCH',
  UNVERIFIED_NETWORK: 'FLAG: Unverified Network',
  OFF_NETWORK: 'FLAG_OFF_NETWORK',
  OUTSIDE_GEOFENCE: 'FLAG_OUTSIDE_GEOFENCE',
  BREAK_EXCEEDED: 'FLAG: Break Exceeded 1 Hour',
  LATE_BREAK: 'FLAG: Break Past Allowed Window'
};

const GRACE_PERIOD_MINUTES = 10;

/**
 * Evaluates flags for a check-in event including 10-minute grace period
 */
export function evaluateCheckinFlags({ clientIp, lat, lng, distance, wifiPass, geofenceRadius, scheduledStart, checkinTime }) {
  const flags = [];

  if (!wifiPass) {
    flags.push(FLAG_TYPES.UNVERIFIED_NETWORK);
    flags.push(FLAG_TYPES.OFF_NETWORK);
    flags.push(FLAG_TYPES.NETWORK_MISMATCH);
  }

  if (distance !== null && distance > geofenceRadius) {
    flags.push(FLAG_TYPES.OUTSIDE_GEOFENCE);
    if (!flags.includes(FLAG_TYPES.NETWORK_MISMATCH)) {
      flags.push(FLAG_TYPES.NETWORK_MISMATCH);
    }
  }

  // 10-Minute Grace Period check for shift check-in
  if (scheduledStart && checkinTime && scheduledStart.includes(':')) {
    try {
      const checkinDate = new Date(checkinTime);
      const [schedH, schedM] = scheduledStart.split(':').map(Number);

      // Create scheduled time for the same day
      const schedDate = new Date(checkinDate);
      schedDate.setHours(schedH, schedM, 0, 0);

      const diffMinutes = Math.round((checkinDate.getTime() - schedDate.getTime()) / (1000 * 60));

      // If check-in is later than scheduled start + 10 minutes grace period
      if (diffMinutes > GRACE_PERIOD_MINUTES) {
        flags.push(FLAG_TYPES.LATE_CHECKIN);
      }
    } catch (err) {
      console.warn('Late checkin calculation error:', err);
    }
  }

  return Array.from(new Set(flags));
}

/**
 * Evaluates flags for an end break event
 */
export function evaluateBreakFlags({ durationMinutes, maxBreakEnd, breakEndTime, existingFlags = [] }) {
  const flags = new Set(existingFlags);

  // Break allowed max 60 minutes + 5m grace
  if (durationMinutes > 60) {
    flags.add(FLAG_TYPES.BREAK_EXCEEDED);
  }

  // Check if break finished past the allowed max end time
  if (maxBreakEnd && breakEndTime) {
    const breakDate = new Date(breakEndTime);
    const [maxH, maxM] = maxBreakEnd.split(':').map(Number);
    const breakH = breakDate.getHours();
    const breakM = breakDate.getMinutes();

    if (maxH === 1 && maxM === 0) {
      // 01:00 max break end for shift 2: if between 01:11 and 12:00 (with 10 min grace)
      if (breakH > 1 && breakH < 12) {
        flags.add(FLAG_TYPES.LATE_BREAK);
      } else if (breakH === 1 && breakM > GRACE_PERIOD_MINUTES) {
        flags.add(FLAG_TYPES.LATE_BREAK);
      }
    } else if (maxH === 16 && maxM === 0) {
      // 16:00 max break end for shift 1: if after 16:10 (with 10 min grace)
      if (breakH > 16 || (breakH === 16 && breakM > GRACE_PERIOD_MINUTES)) {
        flags.add(FLAG_TYPES.LATE_BREAK);
      }
    }
  }

  return Array.from(flags);
}

/**
 * Evaluates flags for a checkout event
 */
export function evaluateCheckoutFlags({
  checkinTime,
  checkoutTime,
  scheduledHours,
  isFlexibleCheckout = 0,
  clientIp,
  lat,
  lng,
  distance,
  wifiPass,
  geofenceRadius,
  existingFlags = []
}) {
  const flags = new Set(existingFlags);

  if (!wifiPass) {
    flags.add(FLAG_TYPES.UNVERIFIED_NETWORK);
    flags.add(FLAG_TYPES.OFF_NETWORK);
    flags.add(FLAG_TYPES.NETWORK_MISMATCH);
  }

  if (distance !== null && distance > geofenceRadius) {
    flags.add(FLAG_TYPES.OUTSIDE_GEOFENCE);
    flags.add(FLAG_TYPES.NETWORK_MISMATCH);
  }

  // Only check early checkout if NOT a flexible checkout shift
  if (!isFlexibleCheckout) {
    const start = new Date(checkinTime).getTime();
    const end = new Date(checkoutTime).getTime();
    const diffHours = (end - start) / (1000 * 60 * 60);

    const targetHours = scheduledHours || 8.0;
    // 10-minute grace period (10 / 60 = 0.1667 hours)
    const graceHours = GRACE_PERIOD_MINUTES / 60;
    if (diffHours < (targetHours - graceHours)) {
      flags.add(FLAG_TYPES.EARLY_CHECKOUT);
    }
  }

  return Array.from(flags);
}

/**
 * Routine audit to detect open shifts exceeding 12 hours without checkout
 */
export function auditOpenShifts() {
  const now = new Date();
  const openShifts = db.prepare(`SELECT * FROM shifts WHERE status != 'COMPLETED'`).all();

  const updateStmt = db.prepare(`
    UPDATE shifts 
    SET flags = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  for (const shift of openShifts) {
    const checkinDate = new Date(shift.checkin_time);
    const elapsedHours = (now.getTime() - checkinDate.getTime()) / (1000 * 60 * 60);

    let flags = [];
    try {
      flags = JSON.parse(shift.flags || '[]');
    } catch {
      flags = [];
    }

    if (elapsedHours > 12 && !flags.includes(FLAG_TYPES.MISSING_CHECKOUT)) {
      flags.push(FLAG_TYPES.MISSING_CHECKOUT);
      updateStmt.run(JSON.stringify(flags), shift.id);
    }
  }
}
