/**
 * APP_SETTINGS_KEYS (Server-side)
 * Single Source of Truth (SSOT) for all keys stored in Supabase `app_settings` table.
 */

export const APP_SETTINGS_KEYS = {
  // Announcements & Read Receipts
  MANAGEMENT_ANNOUNCEMENTS: 'management_announcements',
  MANAGEMENT_ANNOUNCEMENT_READS: 'management_announcement_reads',

  // Points & Violation System
  STAFF_POINTS: 'staff_points',
  POINT_DELETION_LOGS: 'point_deletion_logs',

  // Gamification & Streaks
  STAFF_STREAKS: 'staff_streaks',
  LEADERBOARD_RESET_AT: 'leaderboard_reset_at',
  STAFF_KUDOS_LOGS: 'staff_kudos_logs',

  // Staff Identity, Customization & Biometrics
  STAFF_PROFILES: 'staff_profiles',
  STAFF_THEMES: 'staff_themes',
  STAFF_THEMES_MAP: 'staff_themes_map',
  STAFF_BIOS: 'staff_bios',
  STAFF_BIOS_MAP: 'staff_bios_map',
  STAFF_MOODS: 'staff_moods',
  STAFF_BIOMETRICS: 'staff_biometrics',

  // Operational Modules
  LEAVE_REQUESTS: 'leave_requests',
  STAFF_QUIZ_COMPLETIONS: 'staff_quiz_completions',
  STAFF_WHISTLEBLOWER_REPORTS: 'staff_whistleblower_reports',
  STAFF_DAY_ADJUSTMENTS: 'staff_day_adjustments',
  STAFF_AUDIT_LOGS: 'staff_audit_logs',
  STAFF_DIRECT_MESSAGES: 'staff_direct_messages',
  STAFF_OVERTIME_LOGS: 'staff_overtime_logs',

  // System Security, Geofence & Network
  VENUE_NAME: 'venue_name',
  VENUE_LAT: 'venue_lat',
  VENUE_LNG: 'venue_lng',
  GEOFENCE_RADIUS: 'geofence_radius',
  ALLOWED_SUBNETS: 'allowed_subnets',
  ENFORCE_WIFI: 'enforce_wifi',
  ADMIN_PIN: 'admin_pin',
  ADMIN_LOGIN_LOGS: 'admin_login_logs',
  SHIFT_BREAK_WINDOWS: 'shift_break_windows',

  // Push Notifications & Backups
  PUSH_SUBSCRIPTIONS: 'push_subscriptions',
  VAPID_KEYS: 'vapid_keys',
  SYSTEM_BACKUPS: 'system_backups',
  LAST_PHOTO_PURGE_DATE: 'last_photo_purge_date'
};

export function getCanonicalSettingKey(key) {
  const ALIAS_MAP = {
    announcements: APP_SETTINGS_KEYS.MANAGEMENT_ANNOUNCEMENTS,
    announcement_reads: APP_SETTINGS_KEYS.MANAGEMENT_ANNOUNCEMENT_READS,
    staff_bios: APP_SETTINGS_KEYS.STAFF_BIOS_MAP,
    staff_themes: APP_SETTINGS_KEYS.STAFF_THEMES_MAP
  };
  return ALIAS_MAP[key] || key;
}
