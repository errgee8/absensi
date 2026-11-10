import React, { useState } from 'react';
import { X, Clock, CheckCircle, AlertTriangle, Camera, User, Calendar, MapPin, Eye, Check, ShieldCheck } from 'lucide-react';
import { formatWitaDateTime, formatWitaDateOnly, formatWitaTimeOnly } from '../../utils/time';
import { resolveShift } from '../../utils/shiftResolver';
import { reviewLateCheckin } from '../../utils/api';

export default function LateReviewModal({ shift, schedules = [], adminAuth, onClose, onShiftUpdated }) {
  if (!shift) return null;

  const [pin, setPin] = useState(adminAuth?.pin || (adminAuth?.role === 'MANAGER' ? '8080' : ''));
  const [managerNotes, setManagerNotes] = useState(shift.late_manager_note || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);

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
  const isRejected = shift.late_status === 'REJECTED';
  const isPending = !isApproved && !isRejected;

  const handleDecision = async (action) => {
    const activePin = pin.trim() || adminAuth?.pin || '8080';
    if (!activePin) {
      setError('Masukkan PIN Manager / Assistant Manager untuk otorisasi review.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await reviewLateCheckin(shift.id, {
        pin: activePin,
        action,
        managerNotes: managerNotes.trim()
      });

      setSuccess(
        action === 'APPROVE'
          ? 'Alasan keterlambatan berhasil di-ACC (Dimaafkan / Bebas Penalti)!'
          : 'Keterlambatan ditolak (Tetap dikenakan sanksi/penalti).'
      );

      if (onShiftUpdated) onShiftUpdated();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan keputusan review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 shadow-xs">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 leading-tight">
                Review Keterlambatan Check-In
              </h3>
              <p className="text-xs text-slate-700 font-bold">
                Verifikasi waktu seharusnya vs aktual &amp; tentukan ACC / Tolak
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition border border-slate-300"
            title="Tutup"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Review Badge Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl border-2 bg-slate-50">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-black text-slate-950 text-sm">{shift.staff_name}</span>
                <span className="text-slate-700 text-xs font-bold ml-1.5 font-mono">[{shift.staff_id}]</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                {shift.staff_division || shift.staff_role}
              </span>
            </div>
          </div>

          {/* Time Comparison Card: Scheduled vs Actual vs Late */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-black text-amber-900 block">
              Perbandingan Waktu Masuk Kerja
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Box 1: Scheduled Time (Waktu Seharusnya) */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  1. Waktu Seharusnya
                </span>
                <div className="font-mono text-base font-black text-blue-900">
                  {scheduledStart} <span className="text-xs font-bold text-slate-600">WITA</span>
                </div>
                <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                  Jadwal: {shiftInfo.shiftName}
                </div>
                <div className="text-[10px] text-emerald-700 font-black mt-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                  Batas Toleransi: {graceTimeStr} WITA
                </div>
              </div>

              {/* Box 2: Actual Check-In Time */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  2. Waktu Masuk Aktual
                </span>
                <div className="font-mono text-base font-black text-rose-700">
                  {shift.checkin_time ? formatWitaTimeOnly(shift.checkin_time) : '-'} <span className="text-xs font-bold text-slate-600">WITA</span>
                </div>
                <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                  {shift.checkin_time ? formatWitaDateOnly(shift.checkin_time) : shift.date}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Shift #{shift.id}
                </div>
              </div>

              {/* Box 3: Late Duration */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  3. Total Keterlambatan
                </span>
                <div className="font-mono text-base font-black text-amber-950">
                  {diffMinutes > 0 ? `${diffMinutes} Menit` : 'Terlambat'}
                </div>
                <div className="text-[10px] text-rose-700 font-black mt-0.5">
                  +{excessMinutes} menit di luar toleransi
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Toleransi grace: 10 menit
                </div>
              </div>
            </div>
          </div>

          {/* Staff Reason & Evidence Photo */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-black text-slate-700 block">
              Klarifikasi &amp; Alasan Karyawan
            </span>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                Alasan Ditulis Karyawan:
              </span>
              <p className="text-xs font-bold text-slate-900 italic">
                "{shift.late_reason || 'Karyawan tidak menuliskan alasan keterlambatan.'}"
              </p>
            </div>

            {/* Photos: Proof and Checkin Selfie */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                  Foto Bukti Keterlambatan:
                </span>
                {shift.late_photo_url ? (
                  <button
                    type="button"
                    onClick={() => setZoomPhoto(shift.late_photo_url)}
                    className="relative group rounded-xl overflow-hidden border-2 border-blue-300 hover:border-blue-600 transition block w-full aspect-video bg-slate-900 shadow-xs"
                  >
                    <img
                      src={shift.late_photo_url}
                      alt="Foto Bukti"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white font-black text-[10px] space-x-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Perbesar Bukti</span>
                    </div>
                  </button>
                ) : (
                  <div className="h-16 rounded-xl border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px] text-center px-2">
                    Tidak ada lampiran foto bukti
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                  Foto Selfie Masuk:
                </span>
                {shift.checkin_photo ? (
                  <button
                    type="button"
                    onClick={() => setZoomPhoto(shift.checkin_photo)}
                    className="relative group rounded-xl overflow-hidden border-2 border-slate-300 hover:border-blue-600 transition block w-full aspect-video bg-slate-900 shadow-xs"
                  >
                    <img
                      src={shift.checkin_photo}
                      alt="Selfie Check-In"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white font-black text-[10px] space-x-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Perbesar Selfie</span>
                    </div>
                  </button>
                ) : (
                  <div className="h-16 rounded-xl border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px] text-center px-2">
                    Foto selfie tidak tersedia
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Previous Review Log (If Already Reviewed) */}
          {(shift.late_reviewed_by || isApproved || isRejected) && (
            <div className={`p-3.5 rounded-2xl border-2 text-xs space-y-1 ${
              isApproved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center space-x-1.5 font-black">
                {isApproved ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                    <span>STATUS: SUDAH DI-ACC (DIMAAFKAN / BEBAS PENALTI)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-700 stroke-[2.5]" />
                    <span>STATUS: DITOLAK (TETAP KENA PENALTI)</span>
                  </>
                )}
              </div>
              {shift.late_reviewed_by && (
                <div className="text-[11px] font-bold">
                  Direview oleh: <strong className="text-slate-950">{shift.late_reviewed_by}</strong>
                  {shift.late_reviewed_at && ` pada ${formatWitaDateTime(shift.late_reviewed_at)}`}
                </div>
              )}
              {shift.late_manager_note && (
                <div className="text-[11px] font-bold text-slate-800">
                  Catatan Management: <span className="italic">"{shift.late_manager_note}"</span>
                </div>
              )}
              <div className="text-[10px] text-slate-600 font-medium pt-1">
                Anda dapat mengubah keputusan sewaktu-waktu di form bawah ini.
              </div>
            </div>
          )}

          {/* Review Decision Form (1-Click ACC / Tolak) */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 stroke-[2.5]" />
              <span className="font-black text-slate-950 text-xs">
                Keputusan Management (1 Tombol ACC / Tolak)
              </span>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                  Catatan Keputusan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ban bocor terverifikasi valid"
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                  PIN Otorisasi Manager:
                </label>
                <input
                  type="password"
                  placeholder="PIN Manager"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 1-Click Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDecision('APPROVE')}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs transition shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>ACC Telat (Hapus Penalti)</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDecision('REJECT')}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs transition shadow-md shadow-rose-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>Tolak (Tetap Kena Penalti)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold">
            Keputusan review langsung memperbarui peringkat Leaderboard &amp; laporan bulanan.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black transition"
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
