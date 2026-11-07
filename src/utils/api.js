const API_BASE = '/api';

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
  return res.json();
}

export async function getStaffList(venue = 'ALL') {
  const query = venue && venue !== 'ALL' ? `?venue=${encodeURIComponent(venue)}` : '';
  const res = await fetch(`${API_BASE}/staff${query}`);
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

export function subscribeRealtimeEvents(onEvent) {
  const eventSource = new EventSource(`${API_BASE}/events`);

  eventSource.addEventListener('SHIFT_UPDATE', (e) => {
    try {
      onEvent('SHIFT_UPDATE', JSON.parse(e.data));
    } catch {}
  });

  eventSource.addEventListener('STAFF_UPDATE', (e) => {
    try {
      onEvent('STAFF_UPDATE', JSON.parse(e.data));
    } catch {}
  });

  eventSource.addEventListener('SCHEDULES_UPDATE', (e) => {
    try {
      onEvent('SCHEDULES_UPDATE', JSON.parse(e.data));
    } catch {}
  });

  return () => {
    eventSource.close();
  };
}
