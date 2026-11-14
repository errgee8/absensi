import { syncServerTime } from './time';
import { supabase, isSupabaseClientConfigured, fetchSettingFromSupabase } from './supabaseClient';

const API_BASE = '/api';

export async function getServerTime() {
  try {
    const res = await fetch(`${API_BASE}/server-time`);
    if (res.ok) {
      const data = await res.json();
      if (data?.serverTime) {
        syncServerTime(data.serverTime);
      }
      return data;
    }
  } catch (e) {
    console.warn('Failed to sync server time:', e);
  }
  return null;
}

export async function verifyAdminPin(pin) {
  const res = await fetch(`${API_BASE}/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid Admin PIN');
  return data;
}

export async function getNetworkStatus() {
  const res = await fetch(`${API_BASE}/network-status`);
  if (!res.ok) throw new Error('Failed to check network status');
  const data = await res.json();
  if (data?.serverTime) {
    syncServerTime(data.serverTime);
  }
  return data;
}

export async function getStaffList(venue = 'ALL') {
  const query = venue && venue !== 'ALL' ? `?venue=${encodeURIComponent(venue)}` : '';
  const res = await fetch(`${API_BASE}/staff${query}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat daftar karyawan');
  return res.json();
}

export async function getAdminStaffList() {
  const res = await fetch(`${API_BASE}/staff/admin`);
  if (!res.ok) throw new Error('Failed to load admin staff roster');
  return res.json();
}

export async function getShiftSchedules() {
  const res = await fetch(`${API_BASE}/schedules`);
  if (!res.ok) throw new Error('Failed to load shift schedules');
  return res.json();
}

export async function updateShiftSchedule(id, payload) {
  const res = await fetch(`${API_BASE}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update schedule');
  return data;
}

export async function createShiftSchedule(payload) {
  const res = await fetch(`${API_BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create schedule');
  return data;
}

export async function deleteShiftSchedule(id) {
  const res = await fetch(`${API_BASE}/schedules/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete schedule');
  return data;
}

export async function verifyStaffPin({ staffId, pin }) {
  const res = await fetch(`${API_BASE}/staff/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId, pin })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Verifikasi PIN gagal');
  return data;
}

export async function createStaff(staffData) {
  const res = await fetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create staff');
  return data;
}

export async function resetStaffPin(staffId, newPin) {
  const res = await fetch(`${API_BASE}/staff/${staffId}/pin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: newPin })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reset PIN');
  return data;
}

export async function toggleStaffStatus(staffId, isActive) {
  const res = await fetch(`${API_BASE}/staff/${staffId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to toggle status');
  return data;
}

export async function deleteStaff(staffId) {
  const res = await fetch(`${API_BASE}/staff/${staffId}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete staff');
  return data;
}

export async function getActiveShift(staffId) {
  const res = await fetch(`${API_BASE}/shifts/active/${staffId}`);
  if (!res.ok) throw new Error('Gagal memeriksa shift aktif');
  return res.json();
}

export async function checkIn(payload) {
  const res = await fetch(`${API_BASE}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Check-in gagal');
  return data;
}

export async function checkOut(payload) {
  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Check-out gagal');
  return data;
}

export async function startBreak(payload) {
  const res = await fetch(`${API_BASE}/break/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memulai istirahat');
  return data;
}

export async function endBreak(payload) {
  const res = await fetch(`${API_BASE}/break/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengakhiri istirahat');
  return data;
}

export async function getShifts(params = {}) {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.venue && params.venue !== 'ALL') query.append('venue', params.venue);
  if (params.department && params.department !== 'ALL') query.append('department', params.department);
  if (params.flagFilter && params.flagFilter !== 'ALL') query.append('flagFilter', params.flagFilter);
  if (params.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/shifts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch shifts');
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

export async function getSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update settings');
  return data;
}

export async function seedDemoData(reset = false) {
  const res = await fetch(`${API_BASE}/seed-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to seed demo data');
  return data;
}

export async function wipeLeaderboardData({ pin, mode = 'reset_only', scope = 'all', targetMonth = null }) {
  const res = await fetch(`${API_BASE}/admin/wipe-leaderboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, mode, scope, targetMonth })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memproses reset/wipe leaderboard');
  return data;
}

export async function getLeaveRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.staffId) query.append('staffId', params.staffId);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.type && params.type !== 'ALL') query.append('type', params.type);
  if (params.year) query.append('year', params.year);

  const res = await fetch(`${API_BASE}/leave-requests?${query.toString()}`);
  if (!res.ok) throw new Error('Gagal memuat pengajuan cuti/izin');
  return res.json();
}

export async function getStaffLeaveBalance(staffId, year) {
  const q = year ? `?year=${year}` : '';
  const res = await fetch(`${API_BASE}/leave-balance/${encodeURIComponent(staffId)}${q}`);
  if (!res.ok) throw new Error('Gagal memuat sisa kuota cuti');
  return res.json();
}

export async function submitLeaveRequest(payload) {
  const res = await fetch(`${API_BASE}/leave-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim pengajuan cuti/izin');
  return data;
}

export async function reviewLeaveRequest(id, payload) {
  const res = await fetch(`${API_BASE}/leave-requests/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal me-review pengajuan');
  return data;
}

export async function reviewLateCheckin(shiftId, payload) {
  const res = await fetch(`${API_BASE}/shifts/${encodeURIComponent(shiftId)}/review-late`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal me-review keterlambatan');
  return data;
}

// Announcements API
export async function getAnnouncements(params = {}) {
  // Direct client read from Supabase to bypass serverless execution
  if (isSupabaseClientConfigured) {
    try {
      const data = await fetchSettingFromSupabase('management_announcements');
      if (Array.isArray(data)) {
        let list = data;
        if (params.activeOnly !== false && params.activeOnly !== 'false') {
          list = list.filter((a) => a.is_active !== false);
        }
        if (params.venue && params.venue !== 'ALL') {
          list = list.filter((a) => !a.target_venue || a.target_venue === 'ALL' || a.target_venue === params.venue);
        }
        return { success: true, announcements: list };
      }
    } catch {}
  }

  const q = new URLSearchParams();
  if (params.staffId) q.append('staffId', params.staffId);
  if (params.venue) q.append('venue', params.venue);
  if (params.activeOnly !== undefined) q.append('activeOnly', params.activeOnly);

  const res = await fetch(`${API_BASE}/announcements?${q.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat pengumuman');
  return data;
}

export async function createAnnouncement(payload) {
  const res = await fetch(`${API_BASE}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menerbitkan pengumuman');
  return data;
}

export async function updateAnnouncement(id, payload) {
  const res = await fetch(`${API_BASE}/announcements/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memperbarui pengumuman');
  return data;
}

export async function acknowledgeAnnouncement(id, payload) {
  const res = await fetch(`${API_BASE}/announcements/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mencatat konfirmasi');
  return data;
}

export async function getAnnouncementReaders(id) {
  const res = await fetch(`${API_BASE}/announcements/${encodeURIComponent(id)}/readers`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat daftar pembaca');
  return data;
}

export function subscribeRealtimeEvents(onEvent) {
  // Use direct Supabase Realtime WebSocket (Zero Vercel serverless function invocation)
  if (isSupabaseClientConfigured && supabase) {
    const channel = supabase.channel('app-realtime');

    const handlePayload = (eventType) => ({ payload }) => {
      try {
        onEvent(eventType, payload);
      } catch {}
    };

    channel
      .on('broadcast', { event: 'SHIFT_UPDATE' }, handlePayload('SHIFT_UPDATE'))
      .on('broadcast', { event: 'LEAVE_UPDATE' }, handlePayload('LEAVE_UPDATE'))
      .on('broadcast', { event: 'STAFF_UPDATE' }, handlePayload('STAFF_UPDATE'))
      .on('broadcast', { event: 'SCHEDULES_UPDATE' }, handlePayload('SCHEDULES_UPDATE'))
      .on('broadcast', { event: 'ANNOUNCEMENT_UPDATE' }, handlePayload('ANNOUNCEMENT_UPDATE'))
      .on('broadcast', { event: 'ANNOUNCEMENT_READ' }, handlePayload('ANNOUNCEMENT_READ'))
      .on('broadcast', { event: 'POINT_UPDATE' }, handlePayload('POINT_UPDATE'))
      .on('broadcast', { event: 'SETTINGS_UPDATE' }, handlePayload('SETTINGS_UPDATE'))
      .on('broadcast', { event: 'LEADERBOARD_UPDATE' }, handlePayload('LEADERBOARD_UPDATE'))
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }

  return () => {};
}

export async function getAdminLoginLogs() {
  const res = await fetch(`${API_BASE}/admin/login-logs`);
  if (!res.ok) throw new Error('Failed to load login logs');
  return res.json();
}

let globalPresenceChannel = null;

export async function sendPresenceHeartbeat(data) {
  // Direct client tracking via Supabase Realtime Presence (Zero Vercel serverless execution)
  if (isSupabaseClientConfigured && supabase) {
    try {
      if (!globalPresenceChannel) {
        globalPresenceChannel = supabase.channel('online-presence');
        await globalPresenceChannel.subscribe();
      }
      await globalPresenceChannel.track({
        ...data,
        lastSeenIso: new Date().toISOString()
      });
      return { success: true, via: 'supabase_presence' };
    } catch {}
  }

  // Silent fallback only if Supabase client not present
  try {
    const res = await fetch(`${API_BASE}/presence/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) return { success: false };
    return res.json();
  } catch {
    return { success: false };
  }
}

export async function getLivePresence() {
  const res = await fetch(`${API_BASE}/presence`);
  if (!res.ok) throw new Error('Failed to load live presence');
  return res.json();
}

// Violation Points System API
export async function getPoints(params = {}) {
  // Direct client read from Supabase to bypass serverless execution
  if (isSupabaseClientConfigured && !params.staffUuid && !params.cycleKey) {
    try {
      const data = await fetchSettingFromSupabase('staff_points');
      if (Array.isArray(data)) {
        let points = data;
        if (params.staffId) {
          points = points.filter((p) => String(p.staff_id) === String(params.staffId));
        }
        if (params.status && params.status !== 'ALL') {
          points = points.filter((p) => p.status === params.status);
        }
        return { success: true, points };
      }
    } catch {}
  }

  const q = new URLSearchParams();
  if (params.staffId) q.append('staffId', params.staffId);
  if (params.staffUuid) q.append('staffUuid', params.staffUuid);
  if (params.cycleKey) q.append('cycleKey', params.cycleKey);
  if (params.status) q.append('status', params.status);

  const res = await fetch(`${API_BASE}/points?${q.toString()}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat data poin');
  return data;
}

export async function createStaffPoint(payload) {
  const res = await fetch(`${API_BASE}/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memberikan poin');
  return data;
}

export async function acknowledgeStaffPoint(id, payload) {
  const res = await fetch(`${API_BASE}/points/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyetujui pemberitahuan poin');
  return data;
}

export async function deleteStaffPoint(id, pin) {
  const res = await fetch(`${API_BASE}/points/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': String(pin || '').trim()
    },
    body: JSON.stringify({ pin: String(pin || '').trim() })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus catatan poin');
  return data;
}

// Custom Staff Profile Photo (Gallery photo only) & Daily Emoji Mood
export async function updateStaffProfilePhoto(staffId, photoBase64) {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/profile-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoBase64 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyimpan foto profil');
  return data;
}

export async function updateStaffMood(staffId, emoji) {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/mood`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyimpan mood hari ini');
  return data;
}
