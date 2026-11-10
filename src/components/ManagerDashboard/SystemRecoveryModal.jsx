import React, { useState, useEffect } from 'react';
import {
  Shield,
  X,
  Database,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Server,
  Zap,
  Activity,
  UserCheck,
  Loader2,
  HardDrive
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatWitaDateTime } from '../../utils/time';

export default function SystemRecoveryModal({ isOpen, onClose, adminAuth, venueSettings }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('RECOVERY'); // 'RECOVERY' | 'FAULT_SWITCH' | 'HEALTH'
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Health ping state
  const [healthStatus, setHealthStatus] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [pinging, setPinging] = useState(false);

  // Emergency Bypass Form State
  const [bypassStaffId, setStaffId] = useState('');
  const [bypassType, setBypassType] = useState('checkin');
  const [bypassReason, setBypassReason] = useState('Kamera HP staf rusak fisik');
  const [submittingBypass, setSubmittingBypass] = useState(false);

  // Load backups on open
  const loadBackups = async () => {
    setLoadingBackups(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/backups');
      const data = await res.json();
      setBackups(Array.isArray(data.backups) ? data.backups : []);
    } catch (e) {
      console.warn('Failed to load backups:', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Ping health endpoint
  const checkHealth = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const end = performance.now();
      const data = await res.json();
      setHealthStatus(data);
      setLatencyMs(Math.round(end - start));
    } catch (e) {
      setHealthStatus({ status: 'offline', error: e.message });
      setLatencyMs(null);
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    loadBackups();
    checkHealth();
  }, []);

  const handleCreateSnapshot = async () => {
    setCreatingBackup(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/backups/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: adminAuth?.pin || '8980',
          createdBy: adminAuth?.reviewerName || 'Operational Manager'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat snapshot backup.');

      setActionMessage(`Snapshot sistem baru (${data.backup_id}) berhasil dicadangkan ke cloud storage.`);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      await loadBackups();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreSnapshot = async (id) => {
    if (!window.confirm(`PERINGATAN: Apakah Anda yakin ingin memulihkan sistem dari snapshot ${id}? Data tabel akan disinkronkan ke kondisi tanggal snapshot ini.`)) {
      return;
    }

    setRestoringId(id);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/backups/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupId: id,
          pin: adminAuth?.pin || '8980'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulihkan dari snapshot.');

      setActionMessage(data.message || 'Sistem berhasil dipulihkan!');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 } });
      await loadBackups();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleEmergencyBypassSubmit = async (e) => {
    e.preventDefault();
    if (!bypassStaffId.trim()) {
      setActionError('Pilih atau masukkan ID / Nama Staff.');
      return;
    }

    setSubmittingBypass(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/emergency-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: adminAuth?.pin || '8980',
          staffId: bypassStaffId.trim(),
          actionType: bypassType,
          reason: bypassReason,
          reviewerName: adminAuth?.reviewerName || 'Operational Manager'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjalankan otorisasi darurat.');

      setActionMessage(`Sukses! Otorisasi darurat (${bypassType.toUpperCase()}) untuk staf ${bypassStaffId} berhasil dicatat dengan flag manual.`);
      confetti({ particleCount: 40, spread: 50 });
      setStaffId('');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmittingBypass(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <Shield className="w-5 h-5 text-blue-400 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  Sistem Ketahanan &amp; Pemulihan
                </span>
                <span className="text-[10px] bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                  Active Guard
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5 text-white">
                Disaster Recovery &amp; Fault Switch
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center space-x-2 text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab('RECOVERY')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              activeTab === 'RECOVERY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recover Button &amp; Backup ({backups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FAULT_SWITCH')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              activeTab === 'FAULT_SWITCH'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fault Switch &amp; Bypass</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('HEALTH');
              checkHealth();
            }}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              activeTab === 'HEALTH'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Koneksi Server</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-bold text-slate-800 flex-1">
          {actionMessage && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-2xl flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="leading-tight">{actionMessage}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-2xl flex items-center space-x-2 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="leading-tight">{actionError}</span>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 1: RECOVER BUTTON & AUTOMATED BACKUP SNAPSHOTS */}
          {/* ================================================= */}
          {activeTab === 'RECOVERY' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-blue-950">
                    Cadangan Sistem Seketika (Snapshot Backup)
                  </h4>
                  <p className="text-[11px] text-blue-800 font-medium mt-0.5">
                    Mencadangkan seluruh tabel karyawan, riwayat absensi, log istirahat, dan pengaturan ke cloud dengan siklus retensi 30 hari.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={creatingBackup}
                  onClick={handleCreateSnapshot}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 shrink-0"
                >
                  {creatingBackup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <HardDrive className="w-4 h-4" />
                  )}
                  <span>Buat Backup Snapshot Sekarang</span>
                </button>
              </div>

              {/* Backups List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                  <span>Daftar Snapshot Pemulihan Bencana ({backups.length}):</span>
                  <button
                    type="button"
                    onClick={loadBackups}
                    className="hover:text-blue-600 flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingBackups ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <span>Memuat riwayat backup...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-500">
                    Belum ada snapshot backup manual. Klik tombol biru di atas untuk membuat snapshot pertama.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {backups.map((b) => (
                      <div
                        key={b.id}
                        className="bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-black text-slate-900">{b.id}</span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              oleh {b.created_by || 'GM'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium">
                            {formatWitaDateTime(b.created_at)}
                          </div>
                          <div className="text-[10px] text-slate-700 font-bold flex items-center space-x-2">
                            <span>{b.counts?.staff || 0} Staf</span>
                            <span>•</span>
                            <span>{b.counts?.attendance_logs || 0} Log Absen</span>
                            <span>•</span>
                            <span>{b.counts?.app_settings || 0} Konfigurasi</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={restoringId === b.id}
                          onClick={() => handleRestoreSnapshot(b.id)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 shrink-0"
                          title="Klik untuk memulihkan seluruh data sistem ke snapshot ini"
                        >
                          {restoringId === b.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                          <span>Pulihkan (Recover)</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 2: FAULT SWITCH & HARDWARE BYPASS FORM        */}
          {/* ================================================= */}
          {activeTab === 'FAULT_SWITCH' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-xs text-amber-950 space-y-1">
                <div className="flex items-center space-x-2 font-black text-amber-900">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Saklar Darurat Hardware &amp; Kamera (Emergency Bypass)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90 font-medium">
                  Gunakan form ini jika ada staf yang kameranya rusak fisik atau GPS ponselnya bermasalah permanen di lapangan. Otorisasi ini akan mencatat kehadiran resmi dengan audit flag khusus <strong>FLAG_MANUAL_ADMIN_OVERRIDE</strong>.
                </p>
              </div>

              <form onSubmit={handleEmergencyBypassSubmit} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 block mb-1">
                      Nama atau ID Staf:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Hendy atau JP-SER-8978737"
                      value={bypassStaffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 block mb-1">
                      Jenis Tindakan Darurat:
                    </label>
                    <select
                      value={bypassType}
                      onChange={(e) => setBypassType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:border-blue-500 focus:outline-none bg-white"
                    >
                      <option value="checkin">Otorisasi Check-In Masuk</option>
                      <option value="checkout">Otorisasi Check-Out Pulang</option>
                      <option value="break_start">Otorisasi Mulai Istirahat</option>
                      <option value="break_end">Otorisasi Selesai Istirahat</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600 block mb-1">
                    Alasan Otorisasi Darurat (Audit Trail):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Layar HP staf pecah / Kamera error"
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingBypass}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                  >
                    {submittingBypass ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>Jalankan Otorisasi Manual Darurat</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 3: SERVER CONNECTION & UPTIME MONITOR         */}
          {/* ================================================= */}
          {activeTab === 'HEALTH' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase">Status Server Cloud:</span>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-black text-slate-900">
                      {healthStatus?.status === 'healthy' ? 'Normal & Terhubung' : 'Memeriksa...'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono pt-1">
                    Latensi: {latencyMs ? `${latencyMs} ms` : 'N/A'}
                  </div>
                </div>

                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase">Supabase Cloud DB:</span>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-black text-slate-900">
                      {healthStatus?.supabase ? 'Connected (Synced)' : 'Local SQLite Fallback'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono pt-1">
                    Uptime: {healthStatus?.uptime ? `${Math.round(healthStatus.uptime)} detik` : 'Active'}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center space-x-2 font-black text-emerald-900">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Keandalan Offline PWA (IndexedDB Queue Aktif)</span>
                </div>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed font-medium">
                  Aplikasi telah dilengkapi dengan antrean memori lokal IndexedDB. Jika router Wi-Fi outlet putus mendadak saat staf menekan tombol absen, foto selfie dan koordinat GPS disimpan aman secara lokal dan otomatis dikirimkan ke server begitu sinyal pulih.
                </p>
                <button
                  type="button"
                  disabled={pinging}
                  onClick={checkHealth}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
                  <span>Ping Ulang Server</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md transition"
          >
            Tutup Panel
          </button>
        </div>
      </div>
    </div>
  );
}
