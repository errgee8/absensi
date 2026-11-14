import React, { useState, useEffect } from 'react';
import { X, MapPin, ShieldAlert, CheckCircle, Calendar, Clock, User, Coffee, LogIn, LogOut, Camera, ShieldCheck, Check, AlertTriangle, MessageSquare, Lock, RefreshCw, Eye } from 'lucide-react';
import { formatWitaDateTime, formatDuration } from '../../utils/time';
import { reviewLateCheckin } from '../../utils/api';
import ZoomableImage from '../Common/ZoomableImage';

export default function PhotoDetailModal({ shift, type = 'in', onClose, onShiftUpdated, adminAuth }) {
  if (!shift) return null;

  const initialTab = type === 'break_start' || type === 'break_end' ? 'break' : (type || 'in');
  const [activeTab, setActiveTab] = useState(initialTab); // 'in' | 'break' | 'out'
  const [breakSubTab, setBreakSubTab] = useState(type === 'break_start' ? 'start' : (type === 'break_end' ? 'end' : (shift.break_end_photo ? 'end' : 'start')));
  const [imgError, setImgError] = useState(false);
  const [latePin, setLatePin] = useState(adminAuth?.pin || '');
  const [lateNotes, setLateNotes] = useState('');
  const [submittingLate, setSubmittingLate] = useState(false);
  const [lateReviewError, setLateReviewError] = useState(null);
  const [lateReviewSuccess, setLateReviewSuccess] = useState(null);
  const [viewProofPhoto, setViewProofPhoto] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [activeTab, breakSubTab]);

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
    if (breakSubTab === 'start') {
      photo = shift.break_start_photo || shift.break_end_photo;
      title = 'Verifikasi Foto Mulai Istirahat (Before)';
      time = shift.break_start_time || shift.break_end_time;
      statusBadge = 'Mulai Istirahat (Before)';
    } else {
      photo = shift.break_end_photo || shift.break_start_photo;
      title = 'Verifikasi Foto Selesai Istirahat (After)';
      time = shift.break_end_time || shift.break_start_time;
      statusBadge = `Selesai Istirahat (${shift.break_duration_minutes || 0}m)`;
    }
  } else if (isCheckout) {
    photo = shift.checkout_photo;
    title = 'Verifikasi Foto Check-Out Pulang';
    time = shift.checkout_time;
    statusBadge = 'Check-Out Pulang';
  }

  const lat = isCheckout ? shift.checkout_lat : shift.checkin_lat;
  const lng = isCheckout ? shift.checkout_lng : shift.checkin_lng;
  const dist = isCheckout ? shift.checkout_distance : shift.checkin_distance;
  const accuracy = isCheckout ? (shift.checkout_accuracy ?? shift.accuracy) : (shift.checkin_accuracy ?? shift.accuracy);

  const hasCheckin = Boolean(shift.checkin_photo);
  const hasBreakStart = Boolean(shift.break_start_photo);
  const hasBreakEnd = Boolean(shift.break_end_photo);
  const hasBreak = hasBreakStart || hasBreakEnd || Boolean(shift.break_start_time);
  const hasCheckout = Boolean(shift.checkout_photo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-slate-200">
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#12161f] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isBreak
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : isCheckin
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {statusBadge}
              </span>
              <span className="text-xs text-slate-400 font-mono font-bold">Shift #{shift.id}</span>
              <span className="text-xs text-blue-400 font-black">
                {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-100 mt-1 flex items-center space-x-2">
              <span>{shift.staff_name}</span>
              {shift.mood_emoji && (
                <span
                  className="inline-flex items-center justify-center text-sm px-1.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 shadow-xs"
                  title={`Mood hari ini: ${shift.mood_emoji}`}
                >
                  {shift.mood_emoji}
                </span>
              )}
              <span className="text-slate-400 font-bold">• {shift.staff_division || shift.staff_role}</span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1c2230] hover:bg-[#252d3d] text-slate-400 hover:text-white transition border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2.5 bg-[#12161f] border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('in')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'in'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-[#1c2230] text-slate-300 hover:bg-[#252d3d] border border-slate-700'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>1. Foto Masuk {hasCheckin ? '✓' : '(Kosong)'}</span>
          </button>

          {hasBreak && (
            <button
              type="button"
              onClick={() => setActiveTab('break')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'break'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'bg-[#1c2230] text-slate-300 hover:bg-[#252d3d] border border-slate-700'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>2. Foto Istirahat {hasBreakEnd || hasBreakStart ? '✓' : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('out')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'out'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-[#1c2230] text-slate-300 hover:bg-[#252d3d] border border-slate-700'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{hasBreak ? '3.' : '2.'} Foto Pulang {hasCheckout ? '✓' : '(Belum Ada)'}</span>
          </button>
        </div>

        {/* Break Sub-Tabs (Before vs After) */}
        {isBreak && (hasBreakStart || hasBreakEnd) && (
          <div className="px-4 py-2 bg-[#0e121a] border-b border-slate-800 flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Tampilan Istirahat:</span>
            {hasBreakStart && (
              <button
                type="button"
                onClick={() => setBreakSubTab('start')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  breakSubTab === 'start'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                Foto Mulai (Before) {hasBreakStart ? '✓' : ''}
              </button>
            )}
            {hasBreakEnd && (
              <button
                type="button"
                onClick={() => setBreakSubTab('end')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  breakSubTab === 'end'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                Foto Selesai (After) {hasBreakEnd ? '✓' : ''}
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Main Photo Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
            {photo && !imgError ? (
              <ZoomableImage
                src={photo}
                alt="Audit Biometric Selfie"
                maxHeight="max-h-[45vh]"
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

          {/* Biometric Face Recognition Verification Card */}
          <div className="bg-[#12161f] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span className="font-black text-slate-100 text-xs uppercase tracking-wide">
                  Audit Face Recognition (Biometrik Wajah)
                </span>
              </div>
              {shift.face_recog_status === 'MATCH' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ✓ LOLOS FACE RECOG ({shift.face_recog_similarity}%)
                </span>
              )}
              {shift.face_recog_status === 'MISMATCH' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  ⚠ WAJAH TIDAK COCOK ({shift.face_recog_similarity}%)
                </span>
              )}
              {shift.face_recog_status === 'NO_REFERENCE' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700">
                  Belum Ada Foto Profil Referensi
                </span>
              )}
              {!shift.face_recog_status && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700">
                  Tidak Ada Data Biometrik
                </span>
              )}
            </div>

            {/* Comparison Grid: Selfie Masuk vs Profile Photo */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-[#181d28] p-3 rounded-xl border border-slate-800 text-center space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  1. Foto Selfie Masuk
                </span>
                {shift.checkin_photo ? (
                  <img
                    src={shift.checkin_photo}
                    alt="Selfie Masuk"
                    className="w-20 h-20 mx-auto rounded-xl object-cover border border-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                    -
                  </div>
                )}
                <span className="text-[10px] font-mono text-emerald-400 block font-bold">
                  {formatWitaDateTime(shift.checkin_time)}
                </span>
              </div>

              <div className="bg-[#181d28] p-3 rounded-xl border border-slate-800 text-center space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  2. Foto Profil Resmi Staff
                </span>
                {shift.staff_profile_photo_url ? (
                  <img
                    src={shift.staff_profile_photo_url}
                    alt="Foto Profil Staff"
                    className="w-20 h-20 mx-auto rounded-xl object-cover border border-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold p-2 text-center">
                    Belum Upload Foto Asli
                  </div>
                )}
                <span className="text-[10px] font-bold text-slate-400 block">
                  {shift.staff_profile_photo_url ? 'Foto Galeri Terverifikasi' : 'Himbau Staff Upload'}
                </span>
              </div>
            </div>

            {/* Verification Narrative */}
            <div className="text-[11px] leading-relaxed bg-[#181d28] p-3 rounded-xl border border-slate-800">
              {shift.face_recog_status === 'MATCH' && (
                <p className="text-emerald-300 font-medium">
                  <strong>Status Cocok:</strong> Vektor biometrik wajah selfie masuk memiliki tingkat kemiripan <strong>{shift.face_recog_similarity}%</strong> dengan foto profil resmi karyawan. Terverifikasi identitas asli dan bukan titip absen.
                </p>
              )}
              {shift.face_recog_status === 'MISMATCH' && (
                <p className="text-rose-300 font-medium">
                  <strong>Peringatan Titip Absen:</strong> Tingkat kemiripan biometrik hanya <strong>{shift.face_recog_similarity}%</strong> (di bawah batas minimum 70%). Sistem mendeteksi kemungkinan wajah orang lain yang mengambil selfie untuk karyawan ini.
                </p>
              )}
              {shift.face_recog_status === 'NO_REFERENCE' && (
                <p className="text-slate-400">
                  Staff belum mengunggah foto profil asli di aplikasi. Begitu staff memperbarui foto profil dari galeri HP, sistem face recognition akan otomatis aktif dan memverifikasi setiap absensi masuk.
                </p>
              )}
              {!shift.face_recog_status && (
                <p className="text-slate-400">
                  Data absensi ini dibuat sebelum modul face recognition aktif.
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#12161f] p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">
                Waktu Rekam
              </span>
              <span className="font-mono font-black text-slate-100 text-sm">
                {time ? formatWitaDateTime(time) : 'Belum tercatat'}
              </span>
            </div>

            <div className="bg-[#12161f] p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">
                Validasi Geofence GPS
              </span>
              <div className="flex items-center space-x-2">
                <span className={`font-black ${dist != null && dist <= 150 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {dist != null && dist <= 150 ? 'DALAM GEOFENCE (VALID)' : (dist != null ? 'DI LUAR GEOFENCE' : 'GPS AKTIF')}
                </span>
                <span className="text-slate-400 font-mono text-[11px] font-bold">[{dist != null ? `${dist} meter` : 'N/A'}]</span>
              </div>
            </div>

            <div className="bg-[#12161f] p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">
                Koordinat GPS Live
              </span>
              <span className="font-mono text-slate-200 font-bold">
                {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'N/A'}
              </span>
            </div>

            <div className="bg-[#12161f] p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">
                Jarak &amp; Akurasi GPS
              </span>
              <div className="space-y-0.5">
                <div className={`font-black ${dist > 150 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {dist != null ? `${dist} meter dari venue` : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Radius toleransi akurasi: <strong className={accuracy && accuracy > 300 ? 'text-amber-400' : 'text-slate-200'}>±{accuracy != null ? `${accuracy}m` : '10m'}</strong>
                  {accuracy && accuracy > 300 && (
                    <span className="ml-1 text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                      Perkiraan BTS
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Break Details if break was taken */}
          {(shift.break_duration_minutes != null || (shift.break_start_time && shift.break_end_time)) && (
            <div className="bg-[#12161f] border border-sky-500/30 rounded-2xl p-4 text-xs space-y-2">
              <span className="text-sky-300 font-black block">
                Log Istirahat 1 Jam ({shift.staff_venue || shift.venue || 'LuckyCat'}):
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-200 font-mono text-xs font-bold">
                <div>Mulai: {formatWitaDateTime(shift.break_start_time)}</div>
                <div>Selesai: {formatWitaDateTime(shift.break_end_time)}</div>
                <div>
                  Durasi: <strong className="text-sky-300 font-black">{
                    (shift.break_start_time && shift.break_end_time)
                      ? Math.max(0, Math.round((new Date(shift.break_end_time).getTime() - new Date(shift.break_start_time).getTime()) / (1000 * 60)))
                      : (shift.break_duration_minutes || 0)
                  } menit</strong>
                </div>
                <div>Batas Maksimal: 60 menit</div>
              </div>

              {/* Side-by-side break photos */}
              {(shift.break_start_photo || shift.break_end_photo) && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Foto Mulai (Before)</span>
                    {shift.break_start_photo ? (
                      <img src={shift.break_start_photo} alt="Break Start" className="w-16 h-16 mx-auto rounded-lg object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-500">-</span>
                    )}
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Foto Selesai (After)</span>
                    {shift.break_end_photo ? (
                      <img src={shift.break_end_photo} alt="Break End" className="w-16 h-16 mx-auto rounded-lg object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-500">-</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Late Check-In Justification & Management Review Section */}
          {(shift.late_reason || shift.late_status || shift.late_photo_url || shift.flags?.some(f => String(f).includes('Late'))) && (
            <div className="bg-[#12161f] border border-amber-500/30 rounded-2xl p-4 text-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2 font-black text-amber-300">
                  <Clock className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                  <span>Klarifikasi Keterlambatan Masuk</span>
                </div>
                {shift.late_status === 'APPROVED' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                    <span>DI-ACC / DIMAAFKAN</span>
                  </span>
                ) : shift.late_status === 'REJECTED' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400 stroke-[2.5]" />
                    <span>DITOLAK (KENA PENALTI)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400 animate-pulse">
                    MENUNGGU REVIEW MANAGEMENT
                  </span>
                )}
              </div>

              {/* Alasan & Bukti Foto */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                    Alasan dari Karyawan:
                  </span>
                  <p className="text-xs font-bold text-slate-200 italic">
                    "{shift.late_reason || 'Karyawan tidak menuliskan alasan keterlambatan.'}"
                  </p>
                </div>

                {shift.late_photo_url ? (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span className="text-[11px] font-bold text-slate-300">Lampiran Foto Bukti Keterlambatan:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewProofPhoto(true)}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 text-[10px] font-black transition flex items-center space-x-1 cursor-pointer"
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

              {/* Management Review Form */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Aksi Review (Khusus Operational Manager / Assistant Manager):
                </span>

                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Masukkan PIN Manager / Assistant Manager"
                    value={latePin}
                    onChange={(e) => setLatePin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Catatan manager (opsional, misal: 'Ban bocor terbukti valid')"
                    value={lateNotes}
                    onChange={(e) => setLateNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />

                  {lateReviewError && (
                    <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-[11px] font-bold">
                      {lateReviewError}
                    </div>
                  )}

                  {lateReviewSuccess && (
                    <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-[11px] font-bold">
                      {lateReviewSuccess}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      disabled={submittingLate}
                      onClick={() => handleReviewLate('APPROVE')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ACC / Maafkan Telat</span>
                    </button>
                    <button
                      type="button"
                      disabled={submittingLate}
                      onClick={() => handleReviewLate('REJECT')}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak Alasan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#12161f] border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-bold">
            Status: <span className="text-slate-200">{shift.status}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Proof Photo Fullscreen Modal */}
      {viewProofPhoto && shift.late_photo_url && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-white">Foto Bukti Keterlambatan</span>
              <button
                type="button"
                onClick={() => setViewProofPhoto(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={shift.late_photo_url}
              alt="Bukti Keterlambatan"
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
