import React, { useState, useEffect } from 'react';
import { X, MapPin, ShieldAlert, CheckCircle, Calendar, Clock, User, Coffee, LogIn, LogOut, Camera, ShieldCheck, Check, AlertTriangle, MessageSquare, Lock, RefreshCw, Eye } from 'lucide-react';
import { formatWitaDateTime, formatDuration } from '../../utils/time';
import { reviewLateCheckin } from '../../utils/api';
import ZoomableImage from '../Common/ZoomableImage';

export default function PhotoDetailModal({ shift, type = 'in', onClose, onShiftUpdated, adminAuth }) {
  if (!shift) return null;

  const [activeTab, setActiveTab] = useState(type || 'in'); // 'in' | 'break' | 'out'
  const [imgError, setImgError] = useState(false);
  const [latePin, setLatePin] = useState(adminAuth?.pin || '');
  const [lateNotes, setLateNotes] = useState('');
  const [submittingLate, setSubmittingLate] = useState(false);
  const [lateReviewError, setLateReviewError] = useState(null);
  const [lateReviewSuccess, setLateReviewSuccess] = useState(null);
  const [viewProofPhoto, setViewProofPhoto] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [activeTab]);

  const handleReviewLate = async (action) => {
    if (!latePin.trim()) {
      setLateReviewError('Masukkan PIN Manager / Assistant Manager untuk otorisasi.');
      return;
    }

    setSubmittingLate(true);
    setLateReviewError(null);
    setLateReviewSuccess(null);

    try {
      await reviewLateCheckin(shift.id, {
        pin: latePin.trim(),
        action,
        managerNotes: lateNotes.trim()
      });
      setLateReviewSuccess(action === 'APPROVE' ? 'Alasan telat berhasil di-ACC (Dimaafkan)!' : 'Alasan telat ditolak.');
      if (onShiftUpdated) onShiftUpdated();
    } catch (err) {
      setLateReviewError(err.message || 'Gagal me-review keterlambatan.');
    } finally {
      setSubmittingLate(false);
    }
  };

  useEffect(() => {
    setImgError(false);
  }, [activeTab]);

  const isCheckin = activeTab === 'in';
  const isBreak = activeTab === 'break';
  const isCheckout = activeTab === 'out';

  let photo = null;
  let title = 'Verifikasi Foto Check-In Masuk';
  let time = null;
  let statusBadge = 'Check-In Masuk';

  if (isCheckin) {
    photo = shift.checkin_photo;
    title = 'Verifikasi Foto Check-In Masuk';
    time = shift.checkin_time;
    statusBadge = 'Check-In Masuk';
  } else if (isBreak) {
    photo = shift.break_end_photo || shift.break_start_photo;
    title = 'Verifikasi Foto Selesai Istirahat';
    time = shift.break_end_time || shift.break_start_time;
    statusBadge = `Istirahat (${shift.break_duration_minutes || 0}m)`;
  } else if (isCheckout) {
    photo = shift.checkout_photo; // Strictly checkout photo, never false fallback to checkin!
    title = 'Verifikasi Foto Check-Out Pulang';
    time = shift.checkout_time;
    statusBadge = 'Check-Out Pulang';
  }

  const lat = isCheckout ? shift.checkout_lat : shift.checkin_lat;
  const lng = isCheckout ? shift.checkout_lng : shift.checkin_lng;
  const dist = isCheckout ? shift.checkout_distance : shift.checkin_distance;
  const ip = isCheckout ? shift.checkout_ip : shift.checkin_ip;
  const accuracy = isCheckout ? (shift.checkout_accuracy ?? shift.accuracy) : (shift.checkin_accuracy ?? shift.accuracy);

  const hasCheckin = Boolean(shift.checkin_photo);
  const hasBreak = Boolean(shift.break_end_photo || shift.break_start_photo);
  const hasCheckout = Boolean(shift.checkout_photo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isBreak
                    ? 'bg-sky-100 text-sky-950 border-sky-300'
                    : isCheckin
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-indigo-100 text-indigo-950 border-indigo-300'
                }`}
              >
                {statusBadge}
              </span>
              <span className="text-xs text-slate-700 font-mono font-bold">Shift #{shift.id}</span>
              <span className="text-xs text-blue-900 font-black">
                {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-950 mt-1">
              {shift.staff_name} • <span className="text-slate-700 font-bold">{shift.staff_division || shift.staff_role}</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition border border-slate-300"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Switcher: Foto Masuk vs Foto Istirahat vs Foto Pulang */}
        <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('in')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'in'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>1. Foto Masuk {hasCheckin ? '✓' : '(Kosong)'}</span>
          </button>

          {(hasBreak || shift.break_start_time) && (
            <button
              type="button"
              onClick={() => setActiveTab('break')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition ${
                activeTab === 'break'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>2. Foto Istirahat {hasBreak ? '✓' : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('out')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'out'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{hasBreak ? '3.' : '2.'} Foto Pulang (Check-Out) {hasCheckout ? '✓' : '(Belum Ada)'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Watermarked Photo Preview with Zoom & Pan */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-950 shadow-inner">
            {photo && !imgError ? (
              <ZoomableImage
                src={photo}
                alt="Audit Biometric Selfie"
                maxHeight="max-h-[50vh]"
              />
            ) : (
              <div className="p-12 text-center text-slate-300 text-xs font-bold space-y-2">
                <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-black text-white">
                  {imgError
                    ? 'Foto Tidak Dapat Dimuat'
                    : isCheckout
                    ? 'Belum Ada Foto Check-Out Pulang'
                    : isBreak
                    ? 'Belum Ada Foto Istirahat'
                    : 'Tidak Ada Foto Masuk'}
                </p>
                <p className="text-slate-400 text-xs">
                  {imgError
                    ? 'File foto selfie tidak ditemukan di penyimpanan server atau rusak.'
                    : isCheckout
                    ? 'Karyawan masih aktif bertugas (On Duty) atau belum mengunggah foto selfie saat pulang.'
                    : 'Tidak ada rekaman foto tersimpan untuk aktivitas ini.'}
                </p>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Waktu Rekam
              </span>
              <span className="font-mono font-black text-slate-950 text-sm">
                {time ? formatWitaDateTime(time) : 'Belum tercatat'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Validasi Geofence GPS
              </span>
              <div className="flex items-center space-x-2">
                <span className={`font-black ${dist != null && dist <= 150 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {dist != null && dist <= 150 ? 'DALAM GEOFENCE (VALID)' : (dist != null ? 'DI LUAR GEOFENCE' : 'GPS AKTIF')}
                </span>
                <span className="text-slate-700 font-mono text-[11px] font-bold">[{dist != null ? `${dist}m` : 'N/A'}]</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Koordinat GPS Live
              </span>
              <span className="font-mono text-slate-950 font-bold">
                {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Jarak & Akurasi GPS
              </span>
              <div className="space-y-0.5">
                <div className={`font-black ${dist > 150 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {dist != null ? `${dist}m dari outlet` : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-600 font-medium">
                  Radius toleransi akurasi: <strong className={accuracy && accuracy > 300 ? 'text-amber-800' : 'text-slate-900'}>±{accuracy != null ? `${accuracy}m` : '10m'}</strong>
                  {accuracy && accuracy > 300 && (
                    <span className="ml-1 text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                      Perkiraan BTS
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Indikasi Akurasi Rendah (Cellular BTS) Warning Notice */}
          {accuracy && accuracy >= 300 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-xs text-amber-950 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-black block">Indikasi Sinyal BTS Seluler (Akurasi Rendah: ±{accuracy}m)</span>
                <span className="text-[11px] text-amber-900 leading-tight block mt-0.5">
                  HP karyawan melaporkan ketelitian ±{accuracy}m. Koordinat ini berasal dari menara operator seluler terdekat, bukan satelit GPS langsung. Staf disarankan mengaktifkan opsi <strong>"Lokasi Tepat (Precise Location)"</strong> di izin Chrome ponselnya.
                </span>
              </div>
            </div>
          )}

          {/* Break Details if break was taken */}
          {shift.break_duration_minutes != null && (
            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-4 text-xs space-y-1 text-sky-950">
              <span className="text-sky-950 font-black block mb-1">
                Log Istirahat 1 Jam LuckyCat:
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-900 font-mono text-xs font-bold">
                <div>Mulai: {formatWitaDateTime(shift.break_start_time)}</div>
                <div>Selesai: {formatWitaDateTime(shift.break_end_time)}</div>
                <div>Durasi: <strong className="text-slate-950 font-black">{shift.break_duration_minutes} menit</strong></div>
                <div>Batas Maksimal: 60 menit</div>
              </div>
            </div>
          )}

          {/* Late Check-In Justification & Management Review Section */}
          {(shift.late_reason || shift.late_status || shift.late_photo_url || shift.flags?.some(f => String(f).includes('Late'))) && (
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 text-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2 font-black text-amber-950">
                  <Clock className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                  <span>Klarifikasi Keterlambatan Masuk</span>
                </div>
                {shift.late_status === 'APPROVED' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-emerald-700 stroke-[2.5]" />
                    <span>DI-ACC / DIMAAFKAN</span>
                  </span>
                ) : shift.late_status === 'REJECTED' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-rose-700 stroke-[2.5]" />
                    <span>DITOLAK (KENA PENALTI)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-400 animate-pulse">
                    MENUNGGU REVIEW MANAGEMENT
                  </span>
                )}
              </div>

              {/* Alasan & Bukti Foto */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">
                    Alasan dari Karyawan:
                  </span>
                  <p className="text-xs font-bold text-slate-900 italic">
                    "{shift.late_reason || 'Karyawan tidak menuliskan alasan keterlambatan.'}"
                  </p>
                </div>

                {shift.late_photo_url ? (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span className="text-[11px] font-bold text-slate-800">Lampiran Foto Bukti Keterlambatan:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewProofPhoto(true)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[10px] font-black transition flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Lihat Foto Bukti</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-bold italic pt-1">
                    (Karyawan tidak menyertakan foto bukti pendukung)
                  </div>
                )}
              </div>

              {/* Log Reviewer jika sudah pernah di-review */}
              {shift.late_reviewed_by && (
                <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-700 border border-slate-200 space-y-0.5">
                  <div>
                    <span className="font-bold">Direview oleh:</span> <strong className="text-slate-950 font-black">{shift.late_reviewed_by}</strong> pada {formatWitaDateTime(shift.late_reviewed_at)}
                  </div>
                  {shift.late_manager_note && (
                    <div>
                      <span className="font-bold">Catatan Management:</span> <span className="italic text-slate-900 font-bold">"{shift.late_manager_note}"</span>
                    </div>
                  )}
                </div>
              )}

              {/* Review Form (Accessible by General Manager or Assistant Manager) */}
              <div className="bg-white/80 p-3 rounded-xl border border-amber-300 space-y-2.5">
                <span className="text-[11px] font-black text-slate-900 block">
                  Keputusan Review Keterlambatan:
                </span>

                {lateReviewError && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                    {lateReviewError}
                  </div>
                )}
                {lateReviewSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                    {lateReviewSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 block mb-0.5">
                      PIN Manager / Asst. Manager:
                    </label>
                    <input
                      type="password"
                      placeholder="PIN Otorisasi"
                      value={latePin}
                      onChange={(e) => setLatePin(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-600 block mb-0.5">
                      Catatan Keputusan (Opsional):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Ban bocor terverifikasi"
                      value={lateNotes}
                      onChange={(e) => setLateNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={submittingLate}
                    onClick={() => handleReviewLate('APPROVE')}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs transition shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>ACC Telat (Hapus Penalti)</span>
                  </button>
                  <button
                    type="button"
                    disabled={submittingLate}
                    onClick={() => handleReviewLate('REJECT')}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs transition shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Tolak (Tetap Kena Penalti)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Anomaly Flags Alert Box */}
          {shift.flags && shift.flags.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-xs text-amber-950">
              <div className="flex items-center space-x-2 text-amber-950 font-black text-xs mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                <span>Anomali Operasional Terdeteksi</span>
              </div>
              <ul className="text-xs text-amber-950 list-disc list-inside space-y-1 font-bold">
                {shift.flags.map((flag, idx) => (
                  <li key={idx} className="font-mono text-xs">
                    <strong>{flag}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-2 border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 transition"
          >
            Tutup Pemeriksaan
          </button>
        </div>
      </div>

      {/* Proof Photo Zoom Modal */}
      {viewProofPhoto && shift.late_photo_url && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-xl w-full p-4 overflow-hidden flex flex-col space-y-3">
            <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
              <span className="text-xs font-black">Foto Bukti Keterlambatan - {shift.staff_name}</span>
              <button
                type="button"
                onClick={() => setViewProofPhoto(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center">
              <ZoomableImage
                src={shift.late_photo_url}
                alt="Foto Bukti Telat"
                maxHeight="max-h-[65vh]"
              />
            </div>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setViewProofPhoto(false)}
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
