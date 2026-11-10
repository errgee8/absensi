import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Radio,
  Clock,
  Bell,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Smartphone,
  Eye,
  Activity,
  UserCheck,
  Building2,
  Save,
  Sliders,
  Check
} from 'lucide-react';
import { getAdminLoginLogs, getLivePresence, getSettings, updateSettings } from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';
import { showToast } from '../Common/Toast';

export default function MonitoringAuditTab({ adminAuth }) {
  const [logs, setLogs] = useState([]);
  const [presenceList, setPresenceList] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [presenceSearch, setPresenceSearch] = useState('');
  const [presenceVenueFilter, setPresenceVenueFilter] = useState('ALL');

  // Notification Settings State
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);
  const [notifyLeaveDecisions, setNotifyLeaveDecisions] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [logsRes, presenceRes, settingsRes] = await Promise.all([
        getAdminLoginLogs().catch(() => ({ logs: [] })),
        getLivePresence().catch(() => ({ presence: [], onlineCount: 0 })),
        getSettings().catch(() => ({}))
      ]);

      setLogs(logsRes.logs || []);
      setPresenceList(presenceRes.presence || []);
      setOnlineCount(presenceRes.onlineCount || 0);

      if (settingsRes) {
        setNotifyAnnouncements(settingsRes.notify_announcements !== 0 && settingsRes.notify_announcements !== 'false');
        setNotifyLeaveDecisions(settingsRes.notify_leave_decisions !== 0 && settingsRes.notify_leave_decisions !== 'false');
      }
    } catch (err) {
      console.warn('Monitoring tab data load note:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 20 seconds while manager is viewing this monitoring tab
    const interval = setInterval(() => {
      loadData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSaveNotificationSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings({
        notify_announcements: notifyAnnouncements ? 1 : 0,
        notify_leave_decisions: notifyLeaveDecisions ? 1 : 0
      });
      showToast('Pengaturan notifikasi berhasil disimpan.', 'success');
    } catch (err) {
      showToast('Gagal menyimpan pengaturan: ' + err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Assistant Manager latest login
  const asstMgrLogs = logs.filter(
    (l) => l.role === 'ASSISTANT_MANAGER' || (l.staff_name && l.staff_name.toLowerCase().includes('assistant'))
  );
  const latestAsstMgrLog = asstMgrLogs[0] || null;

  // Operational Manager latest login
  const opMgrLogs = logs.filter(
    (l) => l.role === 'OPERATIONAL_MANAGER' || l.role === 'MANAGER' || (l.staff_name && l.staff_name.toLowerCase().includes('operational'))
  );
  const latestOpMgrLog = opMgrLogs[0] || null;

  // Count Assistant Manager logins today (WITA)
  const todayYMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
  const asstMgrLoginsToday = asstMgrLogs.filter((l) => {
    if (!l.login_at) return false;
    const logDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date(l.login_at));
    return logDate === todayYMD;
  }).length;

  // Filtered Presence List
  const filteredPresence = presenceList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(presenceSearch.toLowerCase()) ||
      item.role.toLowerCase().includes(presenceSearch.toLowerCase()) ||
      (item.venue && item.venue.toLowerCase().includes(presenceSearch.toLowerCase()));

    const matchesVenue =
      presenceVenueFilter === 'ALL'
        ? true
        : presenceVenueFilter === 'ONLINE'
        ? item.isOnline
        : item.venue === presenceVenueFilter;

    return matchesSearch && matchesVenue;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* Header Bar */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                Monitoring &amp; Audit Akses
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-900 border border-indigo-300">
                Khusus Operational Manager
              </span>
            </div>
            <p className="text-xs text-slate-600 font-bold mt-0.5">
              Pantau keaktifan Assistant Manager, status Live Presence staf, dan kontrol aturan notifikasi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(false)}
          disabled={refreshing}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-800 text-xs font-black transition flex items-center space-x-2 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 stroke-[2.5] ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
        </button>
      </div>

      {/* SECTION 1: PEMANTAUAN LOG LOGIN MANAGER & ASSISTANT MANAGER */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">
                Log Keaktifan Manager &amp; Assistant Manager
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                Memantau kedisiplinan dan frekuensi pemeriksaan dashboard oleh pengawas
              </p>
            </div>
          </div>
        </div>

        {/* 2-Card Summary: Operational Manager vs Assistant Manager */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Assistant Manager */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border-2 border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Assistant Manager (Sherly)</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-xs">
                {asstMgrLoginsToday}x Login Hari Ini
              </span>
            </div>

            <div className="pt-1">
              <div className="text-[11px] text-slate-600 font-bold">Terakhir Membuka Aplikasi:</div>
              <div className="font-mono text-sm font-black text-slate-950 mt-0.5">
                {latestAsstMgrLog ? formatWitaDateTime(latestAsstMgrLog.login_at) : 'Belum tercatat riwayat login'}
              </div>
              {latestAsstMgrLog && (
                <div className="text-[10px] text-slate-500 font-bold mt-1 truncate">
                  Akun: {latestAsstMgrLog.staff_name || 'Assistant Manager'} • IP: {latestAsstMgrLog.ip_address || 'Lokal/Jaringan'}
                </div>
              )}
            </div>
          </div>

          {/* Card Operational Manager */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/50 border-2 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-950 uppercase tracking-wide flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Operational Manager (Anda)</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                Full Authorization
              </span>
            </div>

            <div className="pt-1">
              <div className="text-[11px] text-slate-600 font-bold">Terakhir Login / Aktif:</div>
              <div className="font-mono text-sm font-black text-slate-950 mt-0.5">
                {latestOpMgrLog ? formatWitaDateTime(latestOpMgrLog.login_at) : 'Sesi aktif saat ini'}
              </div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">
                PIN 8980 • Otoritas Penuh Seluruh Outlet &amp; Sistem
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Riwayat Sesi Login Terakhir */}
        <div className="pt-2">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide block mb-2">
            Riwayat 10 Sesi Login Terakhir:
          </span>
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black">
                  <tr>
                    <th className="py-2.5 px-3.5">Waktu Login (WITA)</th>
                    <th className="py-2.5 px-3.5">Akun / Pengawas</th>
                    <th className="py-2.5 px-3.5">Peran (Role)</th>
                    <th className="py-2.5 px-3.5">Alamat IP / Jaringan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        Belum ada rekaman sesi login.
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 10).map((log, idx) => {
                      const isAsst = log.role === 'ASSISTANT_MANAGER' || (log.staff_name && log.staff_name.toLowerCase().includes('assistant'));
                      return (
                        <tr key={log.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-900">
                            {formatWitaDateTime(log.login_at)}
                          </td>
                          <td className="py-2.5 px-3.5 font-black text-slate-950">
                            {log.staff_name}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              isAsst
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}>
                              {isAsst ? 'Assistant Manager' : 'Operational Manager'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">
                            {log.ip_address || 'Internal Network'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: STATUS LIVE PRESENCE (ONLINE / OFFLINE) */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Radio className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-slate-950">
                  Status Live Presence (Online / Offline)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>{onlineCount} Online Sekarang</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold">
                Memantau staf &amp; Assistant Manager yang sedang membuka aplikasi saat ini (Hanya terlihat di akun Anda)
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={presenceSearch}
                onChange={(e) => setPresenceSearch(e.target.value)}
                placeholder="Cari nama / peran..."
                className="pl-8 pr-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 w-36 sm:w-44"
              />
            </div>

            <select
              value={presenceVenueFilter}
              onChange={(e) => setPresenceVenueFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua ({presenceList.length})</option>
              <option value="ONLINE">Hanya Online ({onlineCount})</option>
              <option value="JP Karaoke">JP Karaoke</option>
              <option value="LuckyCat">LuckyCat</option>
            </select>
          </div>
        </div>

        {/* Presence Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredPresence.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold">
              Tidak ada staf atau pengawas yang cocok dengan filter.
            </div>
          ) : (
            filteredPresence.map((person) => {
              const isAsst = person.type === 'ASSISTANT_MANAGER';
              return (
                <div
                  key={`${person.type}_${person.id}`}
                  className={`p-3.5 rounded-2xl border-2 transition shadow-2xs flex items-center justify-between ${
                    person.isOnline
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
                        isAsst ? 'bg-indigo-600' : 'bg-blue-600'
                      }`}>
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`w-3 h-3 rounded-full absolute -top-1 -right-1 border-2 border-white ${
                        person.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`} />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-950 truncate">{person.name}</h4>
                      <p className="text-[10px] text-slate-600 font-bold truncate">
                        {person.role} • {person.venue || 'Outlet'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {person.isOnline ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-200 text-emerald-950 border border-emerald-400">
                        Online
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold block">
                        Offline
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 3: PENGATURAN NOTIFIKASI SISTEM */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Bell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">
              Pengaturan Aturan Notifikasi (Push Notifications)
            </h3>
            <p className="text-[11px] text-slate-500 font-bold">
              Tentukan jenis notifikasi push apa saja yang berhak dikirimkan ke HP seluruh staf
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* Toggle 1: Notifikasi Pengumuman */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-950 block">
                Notifikasi Pengumuman Resmi &amp; Urgent
              </span>
              <p className="text-[11px] text-slate-600 font-bold">
                Kirim push notification instan ke HP seluruh staf saat Operational Manager menerbitkan pengumuman baru.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotifyAnnouncements((prev) => !prev)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                notifyAnnouncements ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  notifyAnnouncements ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Notifikasi Keputusan Izin/Cuti */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-950 block">
                Notifikasi Persetujuan Izin, Sakit, &amp; Cuti
              </span>
              <p className="text-[11px] text-slate-600 font-bold">
                Kirim pemberitahuan instan ke HP staf saat pengajuan izin mereka telah disetujui (ACC) atau ditolak.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotifyLeaveDecisions((prev) => !prev)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                notifyLeaveDecisions ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  notifyLeaveDecisions ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveNotificationSettings}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs shadow-md shadow-blue-600/30 transition flex items-center space-x-2"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Pengaturan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Simpan Pengaturan Notifikasi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
