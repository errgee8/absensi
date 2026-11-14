import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Trophy,
  Megaphone,
  LogIn,
  Coffee,
  Lock,
  FileText,
  QrCode,
  AlertTriangle,
  Camera,
  Pencil,
  ChevronDown,
  X,
  Eye,
  Upload,
  Clock,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import {
  getAppNow,
  formatWitaTimeOnly,
  formatTimerSeconds,
  computeCheckoutLockState
} from '../../utils/time';
import {
  updateStaffProfilePhoto,
  updateStaffMood
} from '../../utils/api';
import DevicePermissionModal from './DevicePermissionModal';

const MOOD_EMOJIS = ['😊', '🔥', '😐', '😴', '😮‍💨', '😢', '😡', '💔'];

function cropImageToSquareBase64(file, targetSize = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File yang dipilih bukan gambar valid.'));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = Math.max(0, (img.width - size) / 2);
        const sy = Math.max(0, (img.height - size) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser tidak mendukung pemrosesan gambar.'));
          return;
        }

        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function getInitials(name) {
  const parts = String(name || 'S').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function KioskPortalScreen({
  staff,
  activeShift,
  hasApprovedEarlyLeaveToday = false,
  onSelectAttendance,
  onSelectToilet,
  onOpenLeaderboard,
  onOpenStaffLeaveModal,
  onOpenMonitoring,
  onTriggerCamera,
  onLogout,
  leaveUpdateCount = 0,
  announcements = [],
  unreadAnnouncementsCount = 0,
  onOpenAnnouncements,
  pointTotal = 0,
  pendingPointsCount = 0,
  onOpenPointHistory,
  onOpenPendingPoints,
  onOpenAttendanceHistory,
  onProfilePhotoUpdated,
  onMoodUpdated,
  onOpenFaceRegistration
}) {
  const [now, setNow] = useState(() => getAppNow());
  const [moodDropdownOpen, setMoodDropdownOpen] = useState(false);
  const [savingMood, setSavingMood] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [selectedShiftChoice, setSelectedShiftChoice] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const moodContainerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(getAppNow());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moodContainerRef.current && !moodContainerRef.current.contains(e.target)) {
        setMoodDropdownOpen(false);
      }
    };
    if (moodDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [moodDropdownOpen]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const roleStr = String(staff?.role || '');
  const isManagementRole =
    roleStr === 'Operational Manager' ||
    roleStr === 'Assistant Manager' ||
    roleStr === 'Manager' ||
    roleStr === 'OM' ||
    roleStr === 'AM' ||
    staff?.division === 'Management';

  const availableSchedules = Array.isArray(staff?.availableSchedules) && staff.availableSchedules.length > 0
    ? staff.availableSchedules
    : (staff?.detectedShift
        ? [staff.detectedShift]
        : (staff?.shift_start && staff?.shift_end
            ? [{
                id: 'default',
                name: 'Shift Kerja',
                start_time: staff.shift_start,
                end_time: staff.shift_end
              }]
            : []));

  const detectedShift = staff?.detectedShift || (availableSchedules.length > 0 ? availableSchedules[0] : null);
  const shiftStartLabel = activeShift?.scheduled_start || detectedShift?.start_time || staff?.shift_start || '--:--';
  const shiftEndLabel = activeShift?.scheduled_end || detectedShift?.end_time || staff?.shift_end || '--:--';

  const isMgmtShift =
    staff?.division === 'Management' ||
    (shiftStartLabel === '00:00' && shiftEndLabel === '23:59');

  const breakStatus = activeShift?.break_status || 'NONE';
  const isOnBreak = Boolean(
    activeShift && (breakStatus === 'ON_BREAK' || (activeShift.break_start_at && !activeShift.break_end_at))
  );
  const hasTakenBreak = Boolean(
    activeShift && ((activeShift.break_count >= 1) || breakStatus === 'COMPLETED')
  );
  const isOnDuty = Boolean(activeShift && !activeShift.checkout_time && !activeShift.actual_checkout_at && !isOnBreak);

  const breakStartedRaw = activeShift?.break_start_time || activeShift?.break_start_at;
  const breakElapsedSec = isOnBreak && breakStartedRaw
    ? Math.max(0, Math.floor((now.getTime() - new Date(breakStartedRaw).getTime()) / 1000))
    : 0;

  const normVenue = (staff?.venue || '').replace(/\s+/g, '').toLowerCase();
  const shiftAllowsBreak = !isMgmtShift && (staff?.allows_break !== 0 || normVenue === 'luckycat' || activeShift?.allows_break !== 0);
  const canClickBreak = Boolean(activeShift) && (isOnBreak || (!hasTakenBreak && shiftAllowsBreak && !isMgmtShift));

  const checkoutLock = computeCheckoutLockState({
    activeShift,
    staff,
    now,
    isManagement: isManagementRole || isMgmtShift,
    hasApprovedEarlyLeave: hasApprovedEarlyLeaveToday
  });

  const lateCount = staff?.monthlyStats?.lateCount ?? 0;
  const workDays = staff?.monthlyStats?.workDays ?? 0;
  const currentMood = staff?.mood_emoji || null;

  const handleSelectMood = async (emoji) => {
    setMoodDropdownOpen(false);
    if (!staff?.id || savingMood) return;
    setSavingMood(true);
    try {
      await updateStaffMood(staff.id, emoji);
      if (onMoodUpdated) onMoodUpdated(emoji);
    } catch (err) {
      setToastMessage(err?.message || 'Gagal menyimpan mood hari ini.');
    } finally {
      setSavingMood(false);
    }
  };

  const handleOpenPhotoModal = () => {
    setPhotoPreview(staff?.profile_photo_url || null);
    setPhotoError('');
    setPhotoModalOpen(true);
  };

  const handleGalleryFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    try {
      const base64 = await cropImageToSquareBase64(file, 480);
      setPhotoPreview(base64);
    } catch (err) {
      setPhotoError(err?.message || 'Gagal memproses foto dari galeri.');
    }
  };

  const handleSaveProfilePhoto = async () => {
    if (!photoPreview || !photoPreview.startsWith('data:image/')) {
      setPhotoError('Silakan pilih foto wajah dari galeri terlebih dahulu.');
      return;
    }
    setSavingPhoto(true);
    setPhotoError('');
    try {
      const res = await updateStaffProfilePhoto(staff.id, photoPreview);
      if (onProfilePhotoUpdated) {
        onProfilePhotoUpdated(res.profile_photo_url || photoPreview);
      }
      setPhotoModalOpen(false);
      setToastMessage('Foto profil berhasil diperbarui.');
    } catch (err) {
      setPhotoError(err?.message || 'Gagal menyimpan foto profil.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleClickCheckIn = () => {
    if (activeShift) {
      setToastMessage('Kamu sudah absen masuk untuk shift ini.');
      return;
    }
    // Jika belum pernah face recog, wajib lakukan face recog terlebih dahulu
    if (!staff?.profile_photo_url) {
      if (onOpenFaceRegistration) {
        onOpenFaceRegistration();
        return;
      }
    }
    if (isMgmtShift) {
      onTriggerCamera('checkin', detectedShift || {
        name: 'Shift Management',
        start_time: staff?.shift_start || '00:00',
        end_time: staff?.shift_end || '23:59'
      });
      return;
    }
    if (availableSchedules.length > 0) {
      setSelectedShiftChoice(detectedShift || availableSchedules[0]);
      setShiftModalOpen(true);
    } else if (onSelectAttendance) {
      onSelectAttendance();
    } else {
      onTriggerCamera('checkin', null);
    }
  };

  const handleConfirmCheckInShift = () => {
    const chosen = selectedShiftChoice || availableSchedules[0] || null;
    setShiftModalOpen(false);
    onTriggerCamera('checkin', chosen);
  };

  const handleClickBreak = () => {
    if (!activeShift) {
      setToastMessage('Absen masuk dulu sebelum mengambil istirahat.');
      return;
    }
    if (isOnBreak) {
      onTriggerCamera('break_end');
      return;
    }
    if (hasTakenBreak) {
      setToastMessage('Istirahat 1x per shift sudah selesai diambil.');
      return;
    }
    if (!shiftAllowsBreak || isMgmtShift) {
      setToastMessage('Shift ini tidak memiliki kuota istirahat.');
      return;
    }
    onTriggerCamera('break_start');
  };

  const handleClickCheckOut = () => {
    if (!activeShift) {
      setToastMessage('Kamu belum absen masuk.');
      return;
    }
    if (checkoutLock.locked) {
      setToastMessage(
        `${checkoutLock.reason} Gunakan menu Pengajuan → Izin Pulang Awal jika darurat.`
      );
      return;
    }
    onTriggerCamera('checkout');
  };

  const handleClickPointsCard = () => {
    if (pendingPointsCount > 0 && onOpenPendingPoints) {
      onOpenPendingPoints();
    } else if (onOpenPointHistory) {
      onOpenPointHistory();
    }
  };

  const latestAnnouncementTitle =
    announcements?.[0]?.title || 'Lihat info operasional & jadwal terbaru';

  return (
    <div className="min-h-screen bg-[#111318] text-slate-100 pb-8 px-3.5 pt-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-3">
        {/* Toast feedback banner */}
        {toastMessage && (
          <div className="bg-[#1f2634] border border-amber-500/40 text-amber-100 text-xs font-medium px-3.5 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. UNIFIED PROFILE CARD */}
        <section className="bg-[#191d26] border border-white/[0.08] rounded-3xl p-4 shadow-xl">
          {/* Top row: Avatar + Identity + Status/Logout */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Real Profile Photo Avatar */}
              <button
                type="button"
                onClick={handleOpenPhotoModal}
                className="relative group shrink-0 focus:outline-none cursor-pointer"
                title="Ganti Foto Profil"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#232938] border border-white/15 overflow-hidden flex items-center justify-center shadow-inner">
                  {staff?.profile_photo_url ? (
                    <img
                      src={staff.profile_photo_url}
                      alt={staff?.name || 'Foto Profil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-extrabold tracking-tight text-slate-200">
                      {getInitials(staff?.name)}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center border-2 border-[#191d26] shadow">
                  <Pencil className="w-3 h-3" />
                </span>
              </button>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-extrabold text-white truncate leading-tight">
                  {staff?.name || 'Staff'}
                </h1>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                  {staff?.role || 'Staff'} • {shiftStartLabel} - {shiftEndLabel}
                </p>

                {/* Ganti Foto + My Mood Today row */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={handleOpenPhotoModal}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-[#232938] hover:bg-[#2c3345] border border-white/10 rounded-full px-2.5 py-1 transition cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-indigo-400" />
                    <span>Ganti Foto</span>
                  </button>

                  {/* my mood today : [emoji] */}
                  <div className="relative" ref={moodContainerRef}>
                    <button
                      type="button"
                      onClick={() => setMoodDropdownOpen((prev) => !prev)}
                      disabled={savingMood}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 bg-[#232938] hover:bg-[#2c3345] border border-white/10 rounded-full px-2.5 py-1 transition cursor-pointer"
                    >
                      <span className="text-slate-400">my mood today :</span>
                      {currentMood ? (
                        <span className="text-sm leading-none">{currentMood}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal italic px-1">pilih</span>
                      )}
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {moodDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 z-40 bg-[#1e2431] border border-white/15 rounded-2xl p-2 shadow-2xl grid grid-cols-4 gap-1.5 w-44">
                        {MOOD_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleSelectMood(emoji)}
                            className={`h-9 rounded-xl text-lg flex items-center justify-center transition cursor-pointer ${
                              currentMood === emoji
                                ? 'bg-indigo-500/30 border border-indigo-400/60 scale-105'
                                : 'bg-[#262d3d] hover:bg-[#313a4e] border border-transparent'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right top controls: Status pill + Clock + Keluar */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isOnBreak
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                      : isOnDuty
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                      : 'bg-slate-700/40 text-slate-300 border-white/10'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnBreak
                        ? 'bg-amber-400 animate-pulse'
                        : isOnDuty
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  {isOnBreak ? 'Istirahat' : isOnDuty ? 'On Duty' : 'Off Duty'}
                </span>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#242a38] hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-white/10 text-[11px] font-semibold transition cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Keluar</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatWitaTimeOnly(now)} WITA</span>
              </div>
            </div>
          </div>

          {/* 3 Direct Read Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              type="button"
              onClick={handleClickPointsCard}
              className="bg-[#131720] hover:bg-[#161b26] border border-white/[0.07] rounded-2xl p-2.5 text-left transition cursor-pointer"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Poin
              </div>
              <div className={`text-xl font-black mt-0.5 leading-none ${
                pointTotal > 0 ? 'text-emerald-400' : pointTotal < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {pointTotal > 0 ? `+${pointTotal}` : pointTotal}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                Periode berjalan
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenAttendanceHistory?.('LATE')}
              className="bg-[#131720] hover:bg-[#161b26] border border-white/[0.07] rounded-2xl p-2.5 text-left transition cursor-pointer group"
              title="Ketuk untuk melihat riwayat telat (tanggal, jam, alasan & status ACC)"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-amber-300 transition">
                Telat Bln Ini
              </div>
              <div className="text-xl font-black text-white mt-0.5 leading-none">
                {lateCount}x
              </div>
              <div className="text-[10px] text-amber-400/80 mt-1 truncate font-medium">
                Cek Riwayat →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenAttendanceHistory?.('ABSENT')}
              className="bg-[#131720] hover:bg-[#161b26] border border-white/[0.07] rounded-2xl p-2.5 text-left transition cursor-pointer group"
              title="Ketuk untuk melihat riwayat hari kerja & tidak masuk (alpa/izin)"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-blue-300 transition">
                Hari Kerja
              </div>
              <div className="text-xl font-black text-white mt-0.5 leading-none">
                {workDays}
              </div>
              <div className="text-[10px] text-blue-400/80 mt-1 truncate font-medium">
                Cek Riwayat →
              </div>
            </button>
          </div>

          {/* Highlighted New Point Notification Strip */}
          {pendingPointsCount > 0 && (
            <button
              type="button"
              onClick={onOpenPendingPoints}
              className="w-full mt-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/45 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-rose-200 truncate">
                    {pendingPointsCount} Pemberitahuan Poin Baru
                  </div>
                  <div className="text-[11px] text-rose-300/80 truncate">
                    Ketuk untuk baca detail & konfirmasi
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[11px] font-bold shrink-0">
                Cek →
              </span>
            </button>
          )}
        </section>

        {/* Mandatory Face Biometrics Registration Alert (If staff hasn't registered yet) */}
        {!staff?.profile_photo_url && (
          <div className="bg-gradient-to-r from-indigo-950/80 via-[#1e2238] to-purple-950/80 border border-indigo-400/40 rounded-3xl p-4 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-white">Daftarkan Wajah Biometrik Anda</h3>
                <p className="text-[11px] text-indigo-200 truncate mt-0.5">Wajib 1x sebelum melakukan absensi masuk</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenFaceRegistration}
              className="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black shadow-lg shadow-indigo-500/25 shrink-0 transition cursor-pointer active:scale-95"
            >
              Daftar →
            </button>
          </div>
        )}

        {/* Tombol Cek & Munculkan Izin Lokasi/Kamera HP (Solusi untuk Anto dkk) */}
        <button
          type="button"
          onClick={() => setPermModalOpen(true)}
          className="w-full bg-[#181d26] hover:bg-[#1e2430] border border-blue-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-left transition shadow-md cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>Izin Lokasi &amp; Kamera HP</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  Klik Di Sini
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                Munculkan notifikasi izin di HP Anda jika lokasi/kamera belum aktif
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-400 shrink-0">
            Cek Izin →
          </span>
        </button>

        {/* 2. LEADERBOARD (Full-width) */}
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full bg-[#1b202b] hover:bg-[#222836] active:scale-[0.99] border border-indigo-400/25 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 text-left shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-white">Leaderboard</div>
              <div className="text-xs text-slate-400 truncate">
                Klasemen disiplin & performa tim
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-bold shrink-0">
            Lihat →
          </span>
        </button>

        {/* 3. PENGUMUMAN (Full-width, highlighted amber when unread) */}
        <button
          type="button"
          onClick={onOpenAnnouncements}
          className={`w-full rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 text-left shadow-lg active:scale-[0.99] transition cursor-pointer border ${
            unreadAnnouncementsCount > 0
              ? 'bg-amber-500/15 hover:bg-amber-500/20 border-amber-400/50'
              : 'bg-[#1b202b] hover:bg-[#222836] border-white/10'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                unreadAnnouncementsCount > 0
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-[#252c3b] text-amber-300 border-white/10'
              }`}
            >
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">Pengumuman</span>
                {unreadAnnouncementsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    {unreadAnnouncementsCount} Baru
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate mt-0.5">
                {latestAnnouncementTitle}
              </div>
            </div>
          </div>
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
              unreadAnnouncementsCount > 0
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-[#252c3b] text-slate-200 border-white/10'
            }`}
          >
            Buka →
          </span>
        </button>

        {/* 3b. RIWAYAT TELAT & TIDAK MASUK (Full-width) */}
        <button
          type="button"
          onClick={() => onOpenAttendanceHistory?.('LATE')}
          className="w-full bg-[#1b202b] hover:bg-[#222836] active:scale-[0.99] border border-blue-400/25 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 text-left shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-white">Riwayat Telat &amp; Tidak Masuk</div>
              <div className="text-xs text-slate-400 truncate mt-0.5">
                Cek tanggal, jam masuk vs jadwal, &amp; status izin/alpa
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold shrink-0">
            Lihat →
          </span>
        </button>

        {/* 4. ABSENSI (Left) & PENGAJUAN (Right) 2-Column Bento Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Left: Absensi (3 separate buttons) */}
          <div className="bg-[#191d26] border border-white/[0.08] rounded-3xl p-3.5 shadow-lg flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Absensi Shift
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {activeShift ? 'Aktif' : 'Siap'}
              </span>
            </div>

            <div className="space-y-2">
              {/* Absen Masuk */}
              <button
                type="button"
                onClick={handleClickCheckIn}
                disabled={Boolean(activeShift)}
                className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-xs font-extrabold transition ${
                  activeShift
                    ? 'bg-[#141820] text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-[0.98] cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>{activeShift ? 'Sudah Absen Masuk' : 'Absen Masuk'}</span>
                </span>
                {!activeShift && <span>Foto →</span>}
              </button>

              {/* Ambil Istirahat / Selesai Break */}
              <button
                type="button"
                onClick={handleClickBreak}
                disabled={!canClickBreak}
                className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-xs font-extrabold transition border ${
                  !canClickBreak
                    ? 'bg-[#141820] text-slate-500 border-white/5 cursor-not-allowed'
                    : isOnBreak
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-md cursor-pointer'
                    : 'bg-[#222836] hover:bg-[#2a3142] text-slate-100 border-white/10 cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  <span>
                    {isOnBreak
                      ? 'Selesai Break'
                      : hasTakenBreak
                      ? 'Break Selesai'
                      : 'Ambil Istirahat'}
                  </span>
                </span>
                <span className="font-mono text-[11px]">
                  {isOnBreak
                    ? formatTimerSeconds(breakElapsedSec)
                    : canClickBreak
                    ? 'Foto →'
                    : '—'}
                </span>
              </button>

              {/* Absen Pulang (Smart Lock H-30m) */}
              <button
                type="button"
                onClick={handleClickCheckOut}
                className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-xs font-extrabold transition border ${
                  !activeShift
                    ? 'bg-[#141820] text-slate-600 border-white/5 cursor-not-allowed'
                    : checkoutLock.locked
                    ? 'bg-[#171b24] text-slate-400 border-white/10 cursor-not-allowed'
                    : 'bg-rose-500 hover:bg-rose-400 text-white border-rose-400/50 shadow-md shadow-rose-500/20 active:scale-[0.98] cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {checkoutLock.locked || !activeShift ? (
                    <Lock className="w-4 h-4 shrink-0 text-slate-400" />
                  ) : (
                    <LogOut className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">Absen Pulang</span>
                </span>
                <span className="text-[11px] shrink-0">
                  {!activeShift
                    ? '—'
                    : checkoutLock.locked
                    ? checkoutLock.unlockTimeStr
                      ? `Buka ${checkoutLock.unlockTimeStr}`
                      : 'Terkunci'
                    : 'Foto →'}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Pengajuan (Izin, Cuti, Sakit, dll) */}
          <button
            type="button"
            onClick={onOpenStaffLeaveModal}
            className="bg-[#1b202b] hover:bg-[#222836] active:scale-[0.99] border border-white/10 rounded-3xl p-4 flex flex-col justify-between text-left shadow-lg transition cursor-pointer min-h-[156px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              {leaveUpdateCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 text-[10px] font-black">
                  {leaveUpdateCount} Update
                </span>
              )}
            </div>

            <div className="mt-4">
              <div className="text-sm font-extrabold text-white">Pengajuan</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Izin, Cuti, Sakit, Pulang Awal
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end w-full">
              <span className="px-3 py-1 rounded-xl bg-[#252c3b] text-slate-200 border border-white/10 text-xs font-bold">
                Buat / Cek →
              </span>
            </div>
          </button>
        </div>

        {/* 5. SCAN QR TOILET & POIN (Bottom 2 Columns) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onSelectToilet}
            className="bg-[#1b202b] hover:bg-[#222836] active:scale-[0.98] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between text-left shadow-lg transition cursor-pointer min-h-[118px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#252c3b] text-slate-200 text-[11px] font-bold">
                Scan →
              </span>
            </div>
            <div className="mt-3">
              <div className="text-sm font-extrabold text-white">Scan QR Toilet</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Verifikasi cek kebersihan
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleClickPointsCard}
            className={`active:scale-[0.98] rounded-2xl p-3.5 flex flex-col justify-between text-left shadow-lg transition cursor-pointer min-h-[118px] border ${
              pendingPointsCount > 0
                ? 'bg-rose-500/15 hover:bg-rose-500/20 border-rose-400/50'
                : 'bg-[#1b202b] hover:bg-[#222836] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  pendingPointsCount > 0
                    ? 'bg-rose-500 text-white border-rose-300'
                    : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  pendingPointsCount > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#252c3b] text-slate-200'
                }`}
              >
                {pendingPointsCount > 0 ? `${pendingPointsCount} Baru` : 'Cek →'}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-sm font-extrabold text-white">
                Poin ({pointTotal > 0 ? `+${pointTotal}` : pointTotal})
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Riwayat & pelanggaran
              </div>
            </div>
          </button>
        </div>

        {/* 6. MANAGEMENT QUICK MONITORING BUTTON (Only if OM/AM) */}
        {isManagementRole && onOpenMonitoring && (
          <button
            type="button"
            onClick={onOpenMonitoring}
            className="w-full bg-[#191d26] hover:bg-[#222836] border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Pantau Laporan & Live Dashboard</span>
            </span>
            <span className="text-slate-400">Buka →</span>
          </button>
        )}
      </div>

      {/* SHIFT CONFIRMATION MODAL (for Check-In) */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#191d26] border border-white/15 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Konfirmasi Shift Masuk</h3>
              <button
                type="button"
                onClick={() => setShiftModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {availableSchedules.map((sch) => {
                const isSelected =
                  selectedShiftChoice?.start_time === sch.start_time &&
                  selectedShiftChoice?.end_time === sch.end_time;
                return (
                  <button
                    key={sch.id || `${sch.name || sch.shift_name}-${sch.start_time}-${sch.end_time}`}
                    type="button"
                    onClick={() => setSelectedShiftChoice(sch)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-[#131720] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{sch.name || sch.shift_name || 'Shift Kerja'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {sch.start_time} - {sch.end_time} WITA
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShiftModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#232938] text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckInShift}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                Lanjut Kamera →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL PHOTO PROFILE MODAL (Gallery Upload Only, NO Emoji Presets) */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#191d26] border border-white/15 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Ganti Foto Profil</h3>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 rounded-3xl bg-[#131720] border-2 border-dashed border-white/20 overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview Foto Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-slate-400">
                    {getInitials(staff?.name)}
                  </span>
                )}
              </div>

              <div className="w-full bg-amber-500/10 border border-amber-400/35 rounded-2xl p-3 text-center">
                <p className="text-xs font-bold text-amber-200 leading-relaxed">
                  pastikan memakai foto asli, bukan gambar, dan bukan object lain
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#232938] hover:bg-[#2c3345] border border-white/15 text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Pilih Foto Wajah dari Galeri</span>
              </button>

              {photoError && (
                <p className="text-xs text-rose-400 font-semibold text-center">{photoError}</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#232938] text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProfilePhoto}
                disabled={savingPhoto || !photoPreview || !photoPreview.startsWith('data:image/')}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-45 text-white text-xs font-extrabold transition cursor-pointer"
              >
                {savingPhoto ? 'Menyimpan...' : 'Simpan Foto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Permission Helper Modal */}
      <DevicePermissionModal
        isOpen={permModalOpen}
        onClose={() => setPermModalOpen(false)}
      />
    </div>
  );
}
