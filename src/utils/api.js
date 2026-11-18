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
      const [annData, readsData] = await Promise.all([
        fetchSettingFromSupabase('management_announcements'),
        (params.staffId || params.staffName) ? fetchSettingFromSupabase('management_announcement_reads') : Promise.resolve([])
      ]);

      if (Array.isArray(annData)) {
        let list = annData;
        const nowTs = Date.now();

        // 1. Filter by active status and expiration
        if (params.activeOnly !== false && params.activeOnly !== 'false') {
          list = list.filter((a) => {
            if (a.is_active === false || a.is_active === 0) return false;
            if (a.expires_at) {
              const expTs = new Date(a.expires_at).getTime();
              if (!isNaN(expTs) && nowTs > expTs) return false;
            }
            return true;
          });
        }

        // 2. Filter by target venue
        if (params.venue && params.venue !== 'ALL') {
          const vLow = params.venue.toLowerCase();
          list = list.filter((a) => {
            if (!a.target_venue || a.target_venue === 'ALL') return true;
            const tLow = a.target_venue.toLowerCase();
            if (tLow === vLow) return true;
            if (vLow.includes('jp') && tLow.includes('jp')) return true;
            if (vLow.includes('lucky') && tLow.includes('lucky')) return true;
            return false;
          });
        }

        const reads = Array.isArray(readsData) ? readsData : [];
        const staffIdStr = params.staffId ? String(params.staffId).trim().toLowerCase() : '';
        const staffUuidStr = params.staffUuid ? String(params.staffUuid).trim().toLowerCase() : '';
        const staffLegacyCodeStr = params.staffLegacyCode ? String(params.staffLegacyCode).trim().toLowerCase() : '';
        const staffNameStr = params.staffName ? String(params.staffName).trim().toLowerCase() : '';

        // 3. Enrich with isRead, totalReads, images
        const enriched = list.map((a) => {
          const staffRead = (staffIdStr || staffUuidStr || staffLegacyCodeStr || staffNameStr)
            ? reads.find((r) => {
                if (String(r.announcement_id) !== String(a.id)) return false;
                const rStaffId = String(r.staff_id || '').trim().toLowerCase();
                const rStaffUuid = String(r.staff_uuid || '').trim().toLowerCase();
                const rStaffName = String(r.staff_name || '').trim().toLowerCase();
                return (
                  (staffIdStr && rStaffId === staffIdStr) ||
                  (staffUuidStr && rStaffId === staffUuidStr) ||
                  (staffLegacyCodeStr && rStaffId === staffLegacyCodeStr) ||
                  (staffIdStr && rStaffUuid === staffIdStr) ||
                  (staffUuidStr && rStaffUuid === staffUuidStr) ||
                  (staffNameStr && rStaffName === staffNameStr)
                );
              })
            : null;
          const totalReads = reads.filter((r) => String(r.announcement_id) === String(a.id)).length;
          let parsedImages = [];
          if (Array.isArray(a.images)) {
            parsedImages = a.images;
          } else if (typeof a.images === 'string') {
            try {
              parsedImages = JSON.parse(a.images || '[]');
            } catch {
              parsedImages = [];
            }
          }
          return {
            ...a,
            images: parsedImages,
            isRead: Boolean(staffRead),
            readAt: staffRead ? staffRead.read_at : null,
            totalReads
          };
        });

        return enriched;
      }
    } catch (e) {
      console.warn('Direct Supabase fetch for announcements failed, falling back to API:', e);
    }
  }

  const q = new URLSearchParams();
  if (params.staffId) q.append('staffId', params.staffId);
  if (params.staffUuid) q.append('staffUuid', params.staffUuid);
  if (params.staffLegacyCode) q.append('staffLegacyCode', params.staffLegacyCode);
  if (params.staffName) q.append('staffName', params.staffName);
  if (params.venue) q.append('venue', params.venue);
  if (params.activeOnly !== undefined) q.append('activeOnly', params.activeOnly);

  const res = await fetch(`${API_BASE}/announcements?${q.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat pengumuman');
  return Array.isArray(data) ? data : (data.announcements || []);
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

export async function resendAnnouncementPush(id, pin) {
  const res = await fetch(`${API_BASE}/announcements/${encodeURIComponent(id)}/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: String(pin || '').trim() })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim ulang notifikasi push');
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
      .on('broadcast', { event: 'CHAT_MESSAGE_NEW' }, handlePayload('CHAT_MESSAGE_NEW'))
      .on('broadcast', { event: 'CHAT_PRESENCE_UPDATE' }, handlePayload('CHAT_PRESENCE_UPDATE'))
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

export async function deleteStaffPoint(id, pin, reason = 'Dihapus oleh Manajer') {
  const res = await fetch(`${API_BASE}/points/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': String(pin || '').trim()
    },
    body: JSON.stringify({
      pin: String(pin || '').trim(),
      reason: String(reason || 'Dihapus oleh Manajer').trim()
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus catatan poin');
  return data;
}

export async function getPointDeletionLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${API_BASE}/points/deletion-logs${qs}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat log penghapusan poin');
  return data;
}

// Custom Staff Profile Photo (Gallery photo only) & Daily Emoji Mood
export async function registerStaffBiometrics(staffId, { photoBase64, livenessVerified = true }) {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/biometrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoBase64, livenessVerified })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan biometrik wajah');
  return data;
}

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

export async function updateStaffBio(staffId, bio) {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/bio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bio })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyimpan bio profil');
  return data;
}

export async function getStaffPublicProfile(staffId, visitorStaffId = '') {
  const query = visitorStaffId ? `?visitorStaffId=${encodeURIComponent(visitorStaffId)}` : '';
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/public-profile${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat profil staf');
  return data;
}

// 9f. Staff Personal Attendance History (Lates, Absences & Leaves)
export async function getStaffAttendanceHistory(staffId, monthKey) {
  const query = monthKey ? `?monthKey=${encodeURIComponent(monthKey)}` : '';
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/attendance-history${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat riwayat kehadiran');
  return data;
}

// 9g. Delete Leave Request from History (Manager Only)
export async function deleteLeaveRequest(id, pin, reason) {
  const res = await fetch(`${API_BASE}/leave-requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': String(pin || '').trim()
    },
    body: JSON.stringify({ pin: String(pin || '').trim(), reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus riwayat izin/cuti');
  return data;
}

// 9h. Staff Working Day Adjustments (Manager Override)
export async function getStaffDayAdjustments(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const res = await fetch(`${API_BASE}/admin/staff-day-adjustments${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat data penyesuaian hari kerja');
  return data;
}

export async function saveStaffDayAdjustment({ pin, staffId, staffName, adjustmentDays, reason }) {
  const res = await fetch(`${API_BASE}/admin/staff-day-adjustments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, staffId, staffName, adjustmentDays, reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyimpan penyesuaian hari kerja');
  return data;
}

// 9i. Staff Audit Trail
export async function getStaffAuditTrail(staffId) {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/audit-trail`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat riwayat audit staf');
  return data;
}

// 9j. Clear Shift Lateness (Manager Only)
export async function clearShiftLateness(shiftId, pin, reason) {
  const res = await fetch(`${API_BASE}/shifts/${encodeURIComponent(shiftId)}/clear-late`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': String(pin || '').trim()
    },
    body: JSON.stringify({ pin: String(pin || '').trim(), reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus status keterlambatan');
  return data;
}

// 9k. Delete Shift Record (Manager Only)
export async function deleteShift(shiftId, pin, reason) {
  const res = await fetch(`${API_BASE}/shifts/${encodeURIComponent(shiftId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': String(pin || '').trim()
    },
    body: JSON.stringify({ pin: String(pin || '').trim(), reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus riwayat shift');
  return data;
}

// 9l. Authorize Early Check-Out (Manager Override to Unlock Staff Checkout)
export async function authorizeEarlyCheckout(shiftId, pin, reason) {
  const res = await fetch(`${API_BASE}/shifts/${encodeURIComponent(shiftId)}/authorize-early-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': String(pin || '').trim()
    },
    body: JSON.stringify({ pin: String(pin || '').trim(), reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memberikan otorisasi check-out awal');
  return data;
}

// 10. Whistleblower & Staff Reports (LAPOR)
export async function submitStaffReport({ staffId, venue, category, title, description, photoBase64, isAnonymous }) {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId, venue, category, title, description, photoBase64, isAnonymous })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim laporan');
  return data;
}

export async function getStaffReports(pin) {
  const res = await fetch(`${API_BASE}/reports?pin=${encodeURIComponent(String(pin || '').trim())}`, {
    headers: {
      'x-manager-pin': String(pin || '').trim()
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat laporan staf');
  return data;
}

export async function rewardStaffReport(reportId, pinOrOptions, pointsArg, reasonArg, managerNameArg) {
  let pin, points, reason, managerName;
  if (typeof pinOrOptions === 'object' && pinOrOptions !== null) {
    pin = pinOrOptions.pin || pinOrOptions.managerPin || '8980';
    points = pinOrOptions.points;
    reason = pinOrOptions.reason || pinOrOptions.note;
    managerName = pinOrOptions.managerName;
  } else {
    pin = pinOrOptions;
    points = pointsArg;
    reason = reasonArg;
    managerName = managerNameArg;
  }

  const effectivePin = String(pin || '8980').trim();
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/reward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': effectivePin
    },
    body: JSON.stringify({
      pin: effectivePin,
      managerPin: effectivePin,
      points,
      reason,
      managerName
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memberikan poin apresiasi');
  return data;
}

export async function updateStaffReportStatus(reportId, pinOrOptions, statusArg, managerNoteArg) {
  let pin, status, managerNote;
  if (typeof pinOrOptions === 'object' && pinOrOptions !== null) {
    pin = pinOrOptions.pin || pinOrOptions.managerPin || '8980';
    status = pinOrOptions.status;
    managerNote = pinOrOptions.managerNote || pinOrOptions.note;
  } else {
    pin = pinOrOptions;
    status = statusArg;
    managerNote = managerNoteArg;
  }

  const effectivePin = String(pin || '8980').trim();
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-manager-pin': effectivePin
    },
    body: JSON.stringify({
      pin: effectivePin,
      managerPin: effectivePin,
      status,
      managerNote
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status laporan');
  return data;
}

export async function getMyStaffReports(staffId) {
  const res = await fetch(`${API_BASE}/reports/my-reports?staffId=${encodeURIComponent(staffId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat status laporan');
  return data;
}

// 11. Product Knowledge Weekly Quiz
export async function getWeeklyQuiz(staffId, venue = 'LuckyCat') {
  const res = await fetch(`${API_BASE}/quiz/weekly?staffId=${encodeURIComponent(staffId)}&venue=${encodeURIComponent(venue)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat kuis mingguan');
  return data;
}

export async function submitWeeklyQuiz({ staffId, weekKey, answers, durationSeconds, venue }) {
  const res = await fetch(`${API_BASE}/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId, weekKey, answers, durationSeconds, venue })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim jawaban kuis');
  return data;
}

export async function getQuizLeaderboard(weekKey) {
  const query = weekKey ? `?weekKey=${encodeURIComponent(weekKey)}` : '';
  const res = await fetch(`${API_BASE}/quiz/leaderboard${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat leaderboard kuis');
  return data;
}

// 12. Peer Kudos (Bintang Apresiasi)
export async function sendStaffKudos({ fromStaffId, toStaffId, reason, isAnonymous = false }) {
  const res = await fetch(`${API_BASE}/staff/kudos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromStaffId, toStaffId, reason, isAnonymous })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim Bintang Apresiasi');
  return data;
}

export async function getStaffKudosStatus(staffId) {
  const res = await fetch(`${API_BASE}/staff/kudos/status?staffId=${encodeURIComponent(staffId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat status Bintang Apresiasi');
  return data;
}

export async function getAdminKudosLogs() {
  const res = await fetch(`${API_BASE}/admin/kudos`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat riwayat Bintang Apresiasi');
  return data;
}

// 13. Staff Theme Remote Sync
export async function saveStaffThemeRemote(staffId, themeId) {
  try {
    const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId })
    });
    return res.json();
  } catch (err) {
    console.warn('Failed to sync theme to remote:', err);
  }
}

// 14. Lounge Room Chat (mIRC Style)
export async function getLoungeChatMessages() {
  const res = await fetch(`${API_BASE}/lounge/chat/messages`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat pesan lounge');
  return data;
}

export async function sendLoungeChatMessage(payload) {
  const res = await fetch(`${API_BASE}/lounge/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim pesan');
  return data;
}

export async function sendChatPresenceHeartbeat(payload) {
  const res = await fetch(`${API_BASE}/lounge/chat/presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function leaveChatPresence(staffId) {
  try {
    await fetch(`${API_BASE}/lounge/chat/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId })
    });
  } catch {}
}

export async function muteLoungeChatStaff({ staffId, staffName, managerPin, managerName, isManager }) {
  const res = await fetch(`${API_BASE}/lounge/chat/mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId, staffName, managerPin, managerName, isManager })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal membisukan staf');
  return data;
}

