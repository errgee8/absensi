import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Camera,
  CheckCircle2,
  X,
  Calendar,
  AlertCircle,
  History,
  Send,
  Timer
} from 'lucide-react';
import SelfieCamera from './SelfieCamera';
import {
  getStaffOvertimeLogs,
  startLiveOvertime,
  endLiveOvertime,
  submitRetroactiveOvertime
} from '../../utils/api';
import { formatWitaDateTime, getWitaDateYMD, formatTimerSeconds } from '../../utils/time';
import { showToast } from '../Common/Toast';

function formatMinutesLabel(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h} jam ${rem} mnt`;
  if (h > 0) return `${h} jam`;
  return `${rem} mnt`;
}

function getYesterdayYmd(todayYmd) {
  const [y, m, d] = (todayYmd || getWitaDateYMD()).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export default function StaffOvertimeModal({
  isOpen,
  onClose,
  staff,
  onOvertimeUpdated
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayWitaYmd, setTodayWitaYmd] = useState(() => getWitaDateYMD());
  const [activeOvertime, setActiveOvertime] = useState(null);
  const [logs, setLogs] = useState([]);
  const [viewTab, setViewTab] = useState('FORM'); // 'FORM' | 'HISTORY'
  const [mode, setMode] = useState('LIVE'); // 'LIVE' | 'RETROACTIVE'

  // Live Start / End state
  const [liveReason, setLiveReason] = useState('');
  const [livePhoto, setLivePhoto] = useState(null);
  const [endNotes, setEndNotes] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);

  // Retroactive state (past dates, no mandatory photo)
  const [retroDate, setRetroDate] = useState(() => getYesterdayYmd(getWitaDateYMD()));
  const [retroStart, setRetroStart] = useState('19:00');
  const [retroEnd, setRetroEnd] = useState('21:00');
  const [retroReason, setRetroReason] = useState('');

  const loadOvertime = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const res = await getStaffOvertimeLogs({
        staffId: staff.id,
        staffUuid: staff.uuid || '',
        legacyCode: staff.legacy_code || ''
      });
      const srvToday = res?.todayWitaYmd || getWitaDateYMD();
      setTodayWitaYmd(srvToday);
      setRetroDate((prev) => (prev && prev < srvToday ? prev : getYesterdayYmd(srvToday)));
      setActiveOvertime(res?.activeOvertime || null);
      setLogs(Array.isArray(res?.logs) ? res.logs : []);
      if (onOvertimeUpdated) onOvertimeUpdated(res?.activeOvertime || null);
    } catch (err) {
      showToast(err.message || 'Gagal memuat data lembur', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLivePhoto(null);
      setEndNotes('');
      loadOvertime();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeOvertime?.start_time) return;
    const calc = () => {
      const startMs = new Date(activeOvertime.start_time).getTime();
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [isOpen, activeOvertime]);

  const maxRetroDate = useMemo(() => getYesterdayYmd(todayWitaYmd), [todayWitaYmd]);

  const retroDurationPreview = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(retroStart) || !/^\d{2}:\d{2}$/.test(retroEnd)) return 0;
    const [sH, sM] = retroStart.split(':').map(Number);
    const [eH, eM] = retroEnd.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff <= 0) diff += 24 * 60;
    return diff;
  }, [retroStart, retroEnd]);

  if (!isOpen) return null;

  const handleStartLive = async (e) => {
    e.preventDefault();
    if (!liveReason.trim()) {
      showToast('Isi alasan / tugas lembur terlebih dahulu.', 'error');
      return;
    }
    if (!livePhoto) {
      showToast('Foto datang lembur wajib diambil!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await startLiveOvertime({
        staffId: staff.id,
        staffUuid: staff.uuid || '',
        legacyCode: staff.legacy_code || '',
        reason: liveReason.trim(),
        photoBase64: livePhoto
      });
      showToast('Lembur dimulai! Jangan lupa ambil Foto Pulang saat selesai lembur.', 'success');
      setLivePhoto(null);
      setLiveReason('');
      setActiveOvertime(res.activeOvertime || res.overtime || null);
      if (Array.isArray(res.logs)) setLogs(res.logs);
      if (onOvertimeUpdated) onOvertimeUpdated(res.activeOvertime || res.overtime || null);
      onClose?.();
    } catch (err) {
      showToast(err.message || 'Gagal memulai lembur', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndLive = async (e) => {
    e.preventDefault();
    if (!livePhoto) {
      showToast('Foto pulang lembur wajib diambil!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await endLiveOvertime({
        overtimeId: activeOvertime?.id,
        staffId: staff.id,
        staffUuid: staff.uuid || '',
        legacyCode: staff.legacy_code || '',
        photoBase64: livePhoto,
        notes: endNotes.trim()
      });
      showToast('Lembur selesai & terkirim ke Dashboard Manager untuk persetujuan!', 'success');
      setLivePhoto(null);
      setEndNotes('');
      setActiveOvertime(null);
      if (Array.isArray(res.logs)) setLogs(res.logs);
      if (onOvertimeUpdated) onOvertimeUpdated(null);
      setViewTab('HISTORY');
    } catch (err) {
      showToast(err.message || 'Gagal menyelesaikan lembur', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRetro = async (e) => {
    e.preventDefault();
    if (!retroDate || retroDate >= todayWitaYmd) {
      showToast('Untuk tanggal hari ini, wajib menggunakan mode Lembur Hari Ini (dengan foto datang & pulang).', 'error');
      return;
    }
    if (!retroReason.trim()) {
      showToast('Alasan / keterangan lembur wajib diisi.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitRetroactiveOvertime({
        staffId: staff.id,
        staffUuid: staff.uuid || '',
        legacyCode: staff.legacy_code || '',
        overtimeDate: retroDate,
        startTime: retroStart,
        endTime: retroEnd,
        reason: retroReason.trim()
      });
      showToast('Pengajuan lembur susulan berhasil dikirim ke Manager!', 'success');
      setRetroReason('');
      if (Array.isArray(res.logs)) setLogs(res.logs);
      setViewTab('HISTORY');
    } catch (err) {
      showToast(err.message || 'Gagal mengirim pengajuan lembur susulan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b24] border border-violet-500/35 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-950/90 via-[#1b1f33] to-[#161b24] border-b border-violet-500/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-400/40 text-violet-300 flex items-center justify-center shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white truncate">Pengajuan &amp; Absen Lembur</h3>
              <p className="text-[11px] text-violet-300 font-bold truncate">
                {staff?.name} • {staff?.venue}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="px-4 pt-3 flex gap-2 border-b border-slate-800 pb-3 bg-[#131720]">
          <button
            type="button"
            onClick={() => setViewTab('FORM')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              viewTab === 'FORM'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-[#1a202c] text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{activeOvertime ? 'Selesaikan Lembur' : 'Ajukan Lembur'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('HISTORY')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              viewTab === 'HISTORY'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-[#1a202c] text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Lembur ({logs.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Memuat data lembur...</div>
          ) : viewTab === 'HISTORY' ? (
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  Belum ada riwayat pengajuan lembur.
                </div>
              ) : (
                logs.map((item) => {
                  const statusBadge =
                    item.status === 'APPROVED'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : item.status === 'PARTIAL'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : item.status === 'REJECTED'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : item.status === 'IN_PROGRESS'
                      ? 'bg-violet-500/20 text-violet-200 border-violet-400/40 animate-pulse'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/30';

                  const statusLabel =
                    item.status === 'APPROVED'
                      ? '✓ ACC Penuh'
                      : item.status === 'PARTIAL'
                      ? `⚡ ACC Partial (${formatMinutesLabel(item.approved_minutes)})`
                      : item.status === 'REJECTED'
                      ? '✕ Ditolak'
                      : item.status === 'IN_PROGRESS'
                      ? '● Sedang Lembur'
                      : '⏳ Menunggu Manager';

                  return (
                    <div key={item.id} className="bg-[#12161f] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-white">
                            {item.overtime_date} • {item.start_time_hm} - {item.end_time_hm || 'Berjalan'} WITA
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {item.mode === 'RETROACTIVE' ? '📝 Susulan (Tanpa Foto)' : '📸 Live (Foto Datang & Pulang)'}
                            {item.requested_minutes > 0 ? ` • Pengajuan: ${formatMinutesLabel(item.requested_minutes)}` : ''}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 bg-[#161b24] p-2.5 rounded-xl border border-slate-800/80">
                        {item.reason}
                      </p>
                      {item.manager_note && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5">
                          <span className="font-black">Catatan Manager:</span> {item.manager_note}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : activeOvertime ? (
            /* ACTIVE LIVE OVERTIME -> END WITH MANDATORY CHECKOUT PHOTO */
            <form onSubmit={handleEndLive} className="space-y-4">
              <div className="bg-violet-950/40 border border-violet-500/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                    Sedang Lembur (Hari Ini)
                  </span>
                  <span className="font-mono text-sm font-black text-white bg-violet-600/40 px-2.5 py-0.5 rounded-lg border border-violet-400/30">
                    {formatTimerSeconds(elapsedSec)}
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  Mulai: <strong className="text-white">{activeOvertime.start_time_hm} WITA</strong> ({activeOvertime.overtime_date})
                </div>
                <div className="text-xs text-slate-300">
                  Tugas: <strong className="text-slate-100">{activeOvertime.reason}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-white">
                  Ambil Foto Pulang Lembur (Wajib) *
                </label>
                <SelfieCamera
                  staffName={staff?.name}
                  status="Pulang Lembur"
                  capturedPhoto={livePhoto}
                  setCapturedPhoto={setLivePhoto}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Catatan Tambahan Saat Pulang (Opsional)
                </label>
                <input
                  type="text"
                  value={endNotes}
                  onChange={(e) => setEndNotes(e.target.value)}
                  placeholder="Contoh: Semua stock sudah beres"
                  className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !livePhoto}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Mengirim...' : 'Selesai Lembur & Kirim ke Manager'}</span>
              </button>
            </form>
          ) : (
            /* NO ACTIVE OVERTIME -> CHOOSE LIVE (TODAY) OR RETROACTIVE (PAST DATE) */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('LIVE');
                    setLivePhoto(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    mode === 'LIVE'
                      ? 'bg-violet-600/20 border-violet-400 text-white'
                      : 'bg-[#12161f] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-violet-400" />
                    <span>Lembur Hari Ini</span>
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    Wajib Foto Datang &amp; Pulang
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('RETROACTIVE');
                    setLivePhoto(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    mode === 'RETROACTIVE'
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : 'bg-[#12161f] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hari Terlewat</span>
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    Susulan (Tanpa Wajib Foto)
                  </div>
                </button>
              </div>

              {mode === 'LIVE' ? (
                <form onSubmit={handleStartLive} className="space-y-3.5">
                  <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl text-[11px] text-violet-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span>
                      Pengajuan lembur hari ini (<strong>{todayWitaYmd}</strong>) wajib mengambil <strong>Foto Datang</strong> sekarang, lalu <strong>Foto Pulang</strong> saat selesai lembur.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Alasan / Pekerjaan Lembur *
                    </label>
                    <textarea
                      rows={2}
                      value={liveReason}
                      onChange={(e) => setLiveReason(e.target.value)}
                      placeholder="Contoh: Event ramai / closing bar / stock opname..."
                      className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Foto Datang Lembur (Wajib) *
                    </label>
                    <SelfieCamera
                      staffName={staff?.name}
                      status="Datang Lembur"
                      capturedPhoto={livePhoto}
                      setCapturedPhoto={setLivePhoto}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !livePhoto || !liveReason.trim()}
                    className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{submitting ? 'Memulai...' : 'Mulai Lembur Sekarang'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmitRetro} className="space-y-3.5">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Khusus lembur di <strong>hari yang sudah terlewat</strong> (sebelum {todayWitaYmd}). Tidak wajib foto, namun wajib mengisi tanggal dan jam mulai–selesai.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tanggal Lembur (Hari Terlewat) *
                    </label>
                    <input
                      type="date"
                      value={retroDate}
                      max={maxRetroDate}
                      onChange={(e) => setRetroDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Dari Jam (WITA) *
                      </label>
                      <input
                        type="time"
                        value={retroStart}
                        onChange={(e) => setRetroStart(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Sampai Jam (WITA) *
                      </label>
                      <input
                        type="time"
                        value={retroEnd}
                        onChange={(e) => setRetroEnd(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="px-3 py-2 bg-[#12161f] border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                    <span>Estimasi Durasi Lembur:</span>
                    <strong className="text-amber-300 font-mono">
                      {formatMinutesLabel(retroDurationPreview)} ({retroDurationPreview} menit)
                    </strong>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Alasan / Pekerjaan Lembur *
                    </label>
                    <textarea
                      rows={3}
                      value={retroReason}
                      onChange={(e) => setRetroReason(e.target.value)}
                      placeholder="Jelaskan pekerjaan lembur yang dilakukan pada tanggal tersebut..."
                      required
                      className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !retroReason.trim()}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Mengirim...' : 'Kirim Pengajuan Lembur Susulan'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
