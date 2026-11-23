import React, { useState } from 'react';
import { X, Clock, CheckCircle, AlertTriangle, Camera, User, Calendar, MapPin, Eye, Check, ShieldCheck, Zap } from 'lucide-react';
import { formatWitaDateTime, formatWitaDateOnly, formatWitaTimeOnly } from '../../utils/time';
import { resolveShift } from '../../utils/shiftResolver';
import { reviewLateCheckin } from '../../utils/api';

export default function LateReviewModal({ shift, schedules = [], adminAuth, onClose, onShiftUpdated }) {
  if (!shift) return null;

  const shiftInfo = resolveShift(shift, schedules);
  const scheduledStart = shift.scheduled_start || shiftInfo.start_time || '10:00';
  const scheduledEnd = shift.scheduled_end || shiftInfo.end_time || '19:00';

  // Calculate Grace Period Time (+10 minutes)
  let graceTimeStr = '-';
  let diffMinutes = 0;
  let excessMinutes = 0;

  if (scheduledStart && scheduledStart.includes(':')) {
    const [schedH, schedM] = scheduledStart.split(':').map(Number);
    const graceTotal = schedH * 60 + schedM + 10;
    const gH = String(Math.floor(graceTotal / 60) % 24).padStart(2, '0');
    const gM = String(graceTotal % 60).padStart(2, '0');
    graceTimeStr = `${gH}:${gM}`;

    if (shift.checkin_time) {
      const d = new Date(shift.checkin_time);
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(d);
      const curH = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const curM = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const curTotal = curH * 60 + curM;
      const schedTotal = schedH * 60 + schedM;

      let diff = curTotal - schedTotal;
      if (diff < -720) diff += 1440;
      if (diff > 720) diff -= 1440;
      diffMinutes = Math.max(0, diff);
      excessMinutes = Math.max(0, diff - 10);
    }
  }

  const isApproved = shift.late_status === 'APPROVED' || shift.flags?.includes('FLAG_LATE_EXCUSED');
  const isPartial = shift.late_status === 'PARTIAL_APPROVED' || shift.flags?.includes('FLAG_LATE_PARTIAL');
  const isRejected = shift.late_status === 'REJECTED';
  const isPending = !isApproved && !isPartial && !isRejected;

  const [pin, setPin] = useState(adminAuth?.pin || (adminAuth?.role === 'MANAGER' ? '8980' : ''));
  const [managerNotes, setManagerNotes] = useState(shift.late_manager_note || '');
  const [reviewMode, setReviewMode] = useState(() => (
    isPartial ? 'PARTIAL' : (isApproved ? 'FULL' : (isRejected ? 'REJECT' : 'FULL'))
  ));
  const [toleratedMinutes, setToleratedMinutes] = useState(() => (
    shift.late_excused_minutes != null
      ? String(shift.late_excused_minutes)
      : String(diffMinutes > 20 ? 20 : (Math.round(diffMinutes / 2) || 10))
  ));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const parsedTolerated = Math.max(0, parseInt(toleratedMinutes, 10) || 0);
  const effectiveRemainingMinutes = Math.max(0, (diffMinutes || 0) - parsedTolerated);

  const handleDecision = async (actionType) => {
    const activePin = pin.trim() || adminAuth?.pin || '8980';
    if (!activePin) {
      setError('Masukkan PIN Manager / Assistant Manager untuk otorisasi review.');
      return;
    }

    if (actionType === 'PARTIAL') {
      if (parsedTolerated <= 0) {
        setError('Masukkan menit toleransi yang dimaafkan (> 0 menit).');
        return;
      }
      if (diffMinutes > 0 && parsedTolerated >= diffMinutes) {
        setError(`Menit toleransi (${parsedTolerated}m) sama atau melebihi total telat (${diffMinutes}m). Gunakan opsi "ACC Penuh" jika ingin memaafkan seluruhnya.`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await reviewLateCheckin(shift.id, {
        pin: activePin,
        action: actionType,
        managerNotes: managerNotes.trim(),
        toleratedMinutes: actionType === 'PARTIAL' ? parsedTolerated : (actionType === 'APPROVE' ? diffMinutes : 0),
        originalMinutes: diffMinutes || 0
      });

      let successMsg = 'Keputusan review berhasil disimpan!';
      if (actionType === 'APPROVE') {
        successMsg = 'Alasan keterlambatan berhasil di-ACC Penuh (Dimaafkan / Bebas Penalti)!';
      } else if (actionType === 'PARTIAL') {
        successMsg = `Alasan keterlambatan di-ACC Sebagian (Toleransi ${parsedTolerated}m, sisa ${effectiveRemainingMinutes}m tetap dihitung telat).`;
      } else {
        successMsg = 'Keterlambatan ditolak (Tetap dikenakan sanksi/penalti penuh).';
      }

      setSuccess(successMsg);

      if (onShiftUpdated) onShiftUpdated();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan keputusan review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#12161f] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 leading-tight">
                Review Keterlambatan Check-In
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                Verifikasi waktu seharusnya vs aktual &amp; tentukan ACC / Tolak
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1c2230] hover:bg-[#252d3d] text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Review Badge Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-[#1a202d]">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-black text-slate-100 text-sm">{shift.staff_name}</span>
                <span className="text-slate-400 text-xs font-bold ml-1.5 font-mono">[{shift.staff_id}]</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {shift.staff_division || shift.staff_role}
              </span>
            </div>
          </div>

          {/* Time Comparison Card: Scheduled vs Actual vs Late */}
          <div className="bg-[#1c2230] border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-black text-amber-300 block">
              Perbandingan Waktu Masuk Kerja
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Box 1: Scheduled Time (Waktu Seharusnya) */}
              <div className="bg-[#12161f] p-3 rounded-xl border border-slate-700/80 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  1. Waktu Seharusnya
                </span>
                <div className="font-mono text-base font-black text-blue-400">
                  {scheduledStart} <span className="text-xs font-bold text-slate-400">WITA</span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Jadwal: {shiftInfo.shiftName}
                </div>
                <div className="text-[10px] text-emerald-300 font-black mt-1 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 inline-block">
                  Batas Toleransi: {graceTimeStr} WITA
                </div>
              </div>

              {/* Box 2: Actual Check-In Time */}
              <div className="bg-[#12161f] p-3 rounded-xl border border-slate-700/80 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  2. Waktu Masuk Aktual
                </span>
                <div className="font-mono text-base font-black text-rose-400">
                  {shift.checkin_time ? formatWitaTimeOnly(shift.checkin_time) : '-'} <span className="text-xs font-bold text-slate-400">WITA</span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {shift.checkin_time ? formatWitaDateOnly(shift.checkin_time) : shift.date}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Shift #{shift.id}
                </div>
              </div>

              {/* Box 3: Late Duration */}
              <div className="bg-[#12161f] p-3 rounded-xl border border-slate-700/80 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  3. Total Keterlambatan
                </span>
                <div className="font-mono text-base font-black text-amber-300">
                  {diffMinutes > 0 ? `${diffMinutes} Menit` : 'Terlambat'}
                </div>
                <div className="text-[10px] text-rose-400 font-black mt-0.5">
                  +{excessMinutes} menit di luar toleransi
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Toleransi grace: 10 menit
                </div>
              </div>
            </div>
          </div>

          {/* Staff Reason & Evidence Photo */}
          <div className="bg-[#1a202d] border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-black text-slate-300 block">
              Klarifikasi &amp; Alasan Karyawan
            </span>

            <div className="bg-[#12161f] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Alasan Ditulis Karyawan:
              </span>
              <p className="text-xs font-bold text-slate-200 italic">
                "{shift.late_reason || 'Karyawan tidak menuliskan alasan keterlambatan.'}"
              </p>
            </div>

            {/* Photos: Proof and Checkin Selfie */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Foto Bukti Keterlambatan:
                </span>
                {shift.late_photo_url ? (
                  <button
                    type="button"
                    onClick={() => setZoomPhoto(shift.late_photo_url)}
                    className="relative group rounded-xl overflow-hidden border border-blue-500/40 hover:border-blue-500 transition block w-full aspect-video bg-slate-900 shadow-xs cursor-pointer"
                  >
                    <img
                      src={shift.late_photo_url}
                      alt="Foto Bukti"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-blue-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white font-black text-[10px] space-x-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Perbesar Bukti</span>
                    </div>
                  </button>
                ) : (
                  <div className="h-16 rounded-xl border border-dashed border-slate-700 bg-[#12161f] flex items-center justify-center text-slate-500 font-bold text-[10px] text-center px-2">
                    Tidak ada lampiran foto bukti
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Foto Selfie Masuk:
                </span>
                {shift.checkin_photo ? (
                  <button
                    type="button"
                    onClick={() => setZoomPhoto(shift.checkin_photo)}
                    className="relative group rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition block w-full aspect-video bg-slate-900 shadow-xs cursor-pointer"
                  >
                    <img
                      src={shift.checkin_photo}
                      alt="Selfie Check-In"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-blue-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white font-black text-[10px] space-x-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Perbesar Selfie</span>
                    </div>
                  </button>
                ) : (
                  <div className="h-16 rounded-xl border border-dashed border-slate-700 bg-[#12161f] flex items-center justify-center text-slate-500 font-bold text-[10px] text-center px-2">
                    Foto selfie tidak tersedia
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Previous Review Log (If Already Reviewed) */}
          {(shift.late_reviewed_by || isApproved || isPartial || isRejected) && (
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
              isApproved
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : isPartial
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              <div className="flex items-center space-x-1.5 font-black">
                {isApproved ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                    <span>STATUS: SUDAH DI-ACC PENUH (DIMAAFKAN / BEBAS PENALTI)</span>
                  </>
                ) : isPartial ? (
                  <>
                    <Zap className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                    <span>STATUS: SUDAH DI-ACC SEBAGIAN (TOLERANSI {shift.late_excused_minutes || 0}M &bull; SISA {shift.late_remaining_minutes || 0}M TETAP TELAT)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 stroke-[2.5]" />
                    <span>STATUS: DITOLAK (TETAP KENA PENALTI PENUH)</span>
                  </>
                )}
              </div>
              {shift.late_reviewed_by && (
                <div className="text-[11px] font-bold">
                  Direview oleh: <strong className="text-white">{shift.late_reviewed_by}</strong>
                  {shift.late_reviewed_at && ` pada ${formatWitaDateTime(shift.late_reviewed_at)}`}
                </div>
              )}
              {shift.late_manager_note && (
                <div className="text-[11px] font-bold text-slate-300">
                  Catatan Management: <span className="italic">"{shift.late_manager_note}"</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 font-medium pt-1">
                Anda dapat memperbarui keputusan review kapan saja di formulir bawah ini.
              </div>
            </div>
          )}

          {/* Review Decision Form */}
          <div className="bg-[#1a202d] border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-400 stroke-[2.5]" />
                <span className="font-black text-slate-100 text-xs">
                  Keputusan Review Management
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Pilih Opsi Review:</span>
            </div>

            {/* Mode Selector Tabs (3 Options) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#12161f] border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setReviewMode('FULL')}
                className={`py-2 px-1 text-center rounded-lg font-black text-[11px] transition cursor-pointer flex items-center justify-center space-x-1 ${
                  reviewMode === 'FULL'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>ACC Penuh</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewMode('PARTIAL')}
                className={`py-2 px-1 text-center rounded-lg font-black text-[11px] transition cursor-pointer flex items-center justify-center space-x-1 ${
                  reviewMode === 'PARTIAL'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>ACC Sebagian</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewMode('REJECT')}
                className={`py-2 px-1 text-center rounded-lg font-black text-[11px] transition cursor-pointer flex items-center justify-center space-x-1 ${
                  reviewMode === 'REJECT'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Tolak Telat</span>
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {/* Partial Tolerance Configuration Card */}
            {reviewMode === 'PARTIAL' && (
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-300 flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Konfigurasi Toleransi Parsial (Menit)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Total Keterlambatan: <strong className="text-white">{diffMinutes} Menit</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-300 uppercase block mb-1">
                      Menit Toleransi yang Dimaafkan:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, (diffMinutes || 60) - 1)}
                        value={toleratedMinutes}
                        onChange={(e) => setToleratedMinutes(e.target.value)}
                        placeholder="Contoh: 20"
                        className="w-full px-3 py-2 rounded-xl border border-amber-500/50 bg-[#12161f] text-amber-200 text-sm font-mono font-black focus:border-amber-400 focus:outline-none pr-14"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-amber-400/80 font-bold">Menit</span>
                    </div>
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">Pilihan Cepat:</span>
                  {[10, 15, 20, 30].filter(m => m < diffMinutes).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setToleratedMinutes(String(m))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        parsedTolerated === m
                          ? 'bg-amber-500 text-black border-amber-400 font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {m} Menit
                    </button>
                  ))}
                  {diffMinutes > 10 && (
                    <button
                      type="button"
                      onClick={() => setToleratedMinutes(String(Math.round(diffMinutes / 2)))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        parsedTolerated === Math.round(diffMinutes / 2)
                          ? 'bg-amber-500 text-black border-amber-400 font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      50% ({Math.round(diffMinutes / 2)}m)
                    </button>
                  )}
                </div>

                {/* Live Real-time Calculation Breakdown */}
                <div className="p-2.5 bg-[#12161f] border border-amber-500/20 rounded-xl grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Telat</span>
                    <span className="font-mono font-black text-rose-400">{diffMinutes} Menit</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-400 font-bold uppercase block">Dimaafkan (ACC)</span>
                    <span className="font-mono font-black text-emerald-300">-{parsedTolerated} Menit</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-300 font-bold uppercase block">Sisa Dihitung</span>
                    <span className="font-mono font-black text-amber-400">+{effectiveRemainingMinutes} Menit</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-300 italic font-medium leading-relaxed">
                  * Catatan: Sisa keterlambatan <strong>+{effectiveRemainingMinutes} menit</strong> akan tetap dihitung sebagai keterlambatan di rekap bulanan &amp; leaderboard, sedangkan <strong>{parsedTolerated} menit</strong> berhasil dimaafkan.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Catatan Keputusan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder={
                    reviewMode === 'PARTIAL'
                      ? 'Contoh: Toleransi 20m macet hujan, sisa 20m dihitung'
                      : reviewMode === 'FULL'
                      ? 'Contoh: Ban bocor terverifikasi valid'
                      : 'Contoh: Alasan tidak dapat diterima'
                  }
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#12161f] text-slate-100 placeholder:text-slate-500 text-xs font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  PIN Otorisasi Manager:
                </label>
                <input
                  type="password"
                  placeholder="PIN Manager"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#12161f] text-slate-100 placeholder:text-slate-500 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Action Button based on chosen mode */}
            <div className="pt-1">
              {reviewMode === 'FULL' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('APPROVE')}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan: ACC Penuh (100% Bebas Penalti)</span>
                </button>
              )}

              {reviewMode === 'PARTIAL' && (
                <button
                  type="button"
                  disabled={submitting || parsedTolerated <= 0}
                  onClick={() => handleDecision('PARTIAL')}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-black text-xs transition shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4 stroke-[2.5]" />
                  <span>Simpan: ACC Sebagian (Toleransi {parsedTolerated}m, Sisa {effectiveRemainingMinutes}m Telat)</span>
                </button>
              )}

              {reviewMode === 'REJECT' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('REJECT')}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                  <span>Simpan: Tolak Alasan (Tetap Kena Penalti Penuh)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#12161f] flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">
            Keputusan review langsung memperbarui peringkat Leaderboard &amp; laporan bulanan.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1c2230] hover:bg-[#252d3d] border border-slate-700 text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Proof Photo Zoom Overlay Modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-xl w-full p-4 overflow-hidden flex flex-col space-y-3">
            <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
              <span className="text-xs font-black">Perbesar Foto - {shift.staff_name}</span>
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center">
              <img
                src={zoomPhoto}
                alt="Foto Zoom"
                className="max-h-[65vh] w-auto rounded-xl object-contain shadow-lg"
              />
            </div>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black"
              >
                Tutup Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
