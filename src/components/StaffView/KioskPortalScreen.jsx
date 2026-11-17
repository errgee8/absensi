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
  ShieldAlert,
  BookOpen,
  Sparkles,
  Smile,
  Crown,
  Palette
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
import StaffThemeModal, { getStaffTheme, saveStaffTheme } from './StaffThemeModal';
import StaffKudosModal from './StaffKudosModal';
import { getStreakTier } from '../../utils/streakFrames';

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
  onOpenFaceRegistration,
  onOpenStaffReportModal,
  onOpenStaffQuizModal
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

  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [kudosModalOpen, setKudosModalOpen] = useState(false);
  const [staffTheme, setStaffTheme] = useState(() => getStaffTheme(staff?.id));

  const currentStreak = staff?.streak || activeShift?.streak || 0;
  const streakTier = getStreakTier(currentStreak);

  useEffect(() => {
    if (staff?.id) {
      setStaffTheme(getStaffTheme(staff.id));
    }
  }, [staff?.id]);

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

  const hasRegisteredBiometrics = Boolean(
    staff?.face_biometrics_registered ||
    staff?.biometric_photo_url ||
    staff?.profile_photo_url ||
    (staff?.id && typeof window !== 'undefined' && window.localStorage?.getItem(`staff_face_registered_${staff.id}`) === 'true') ||
    (staff?.uuid && typeof window !== 'undefined' && window.localStorage?.getItem(`staff_face_registered_${staff.uuid}`) === 'true') ||
    (staff?.name && typeof window !== 'undefined' && window.localStorage?.getItem(`staff_face_registered_${staff.name.toLowerCase()}`) === 'true')
  );

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
    // Jika belum pernah mendaftarkan wajah biometrik sama sekali, wajibkan registrasi 1x
    if (!hasRegisteredBiometrics) {
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
    <div className={`min-h-screen ${staffTheme?.wrapperBg || 'bg-[#111318]'} text-slate-100 pb-10 px-3 pt-3 sm:px-6 transition-all duration-500 relative overflow-hidden`}>
      {/* Dynamic ambient background glow */}
      {staffTheme?.ambientGlow && (
        <>
          <div
            className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[580px] h-[480px] rounded-full blur-[140px] opacity-35 transition-all duration-700"
            style={{ backgroundColor: staffTheme.ambientGlow }}
          />
          <div
            className="pointer-events-none absolute top-1/3 -right-24 w-[320px] h-[320px] rounded-full blur-[120px] opacity-25 transition-all duration-700"
            style={{ backgroundColor: staffTheme.ambientGlow }}
          />
        </>
      )}

      <div className="max-w-md mx-auto space-y-3 relative z-10">
        {/* Toast feedback banner */}
        {toastMessage && (
          <div className="bg-[#1f2634] border border-amber-500/40 text-amber-100 text-xs font-medium px-3.5 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 animate-fade-in">
            <span className="leading-snug">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white shrink-0 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================
            1. UNIFIED PROFILE & IDENTITY CARD (Mobile Optimized)
           ========================================================= */}
        <section className={`${staffTheme?.cardBg || 'bg-[#181d26]'} ${staffTheme?.cardBorder || 'border-white/[0.08]'} border rounded-3xl p-3.5 sm:p-4 shadow-xl space-y-3 transition-colors duration-300`}>
          {/* Top Bar: Venue & Clock on Left | Duty Status & Logout on Right */}
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`px-2.5 py-0.5 rounded-full ${staffTheme?.accentBadge || 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'} font-extrabold text-[10px] tracking-wide shrink-0 transition-colors duration-300`}>
                {staff?.venue || 'LuckyCat'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatWitaTimeOnly(now)} WITA</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
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
                <span>{isOnBreak ? 'Istirahat' : isOnDuty ? 'On Duty' : 'Off Duty'}</span>
              </span>

              <button
                type="button"
                onClick={onLogout}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold transition cursor-pointer border shadow-sm ${
                  staffTheme?.pillBorder || 'bg-[#232938] hover:bg-rose-500/20 text-slate-300 border-white/10'
                }`}
                title="Keluar dari akun staff"
              >
                <LogOut className="w-3 h-3" />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {/* Profile Details: Avatar + Name + Role + Actions */}
          <div className="flex items-center gap-3">
            {/* Real Profile Photo Avatar with Streak-Unlocked Frame */}
            <button
              type="button"
              onClick={handleOpenPhotoModal}
              className="relative group shrink-0 focus:outline-none cursor-pointer"
              title={`Bingkai Avatar: ${streakTier.name} (${currentStreak} Hari Streak)`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-[#232938] overflow-hidden flex items-center justify-center shadow-inner transition-all duration-300 ${streakTier.ringClasses} ${staffTheme?.avatarRing || ''}`}>
                {staff?.profile_photo_url ? (
                  <img
                    src={staff.profile_photo_url}
                    alt={staff?.name || 'Foto Profil'}
                    className="w-full h-full object-cover rounded-[13px]"
                  />
                ) : (
                  <span className="text-base font-black tracking-tight text-slate-200">
                    {getInitials(staff?.name)}
                  </span>
                )}
              </div>
              {streakTier.badge && (
                <span
                  className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center shadow-lg z-10 ${streakTier.badgeClasses}`}
                  title={`${streakTier.name} (${currentStreak} Hari Streak)`}
                >
                  {streakTier.badge}
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center border-2 border-[#181d26] shadow">
                <Pencil className="w-2.5 h-2.5" />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                  {staff?.name || 'Staff'}
                </h1>
                {/* Streak Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-sm ${streakTier.pillBg}`}
                  title={`Streak On-Time: ${currentStreak} hari berturut-turut (${streakTier.name})`}
                >
                  <span>🔥</span>
                  <span>{currentStreak} Hari Streak</span>
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span>{staff?.role || 'Staff'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {shiftStartLabel} - {shiftEndLabel}
                </span>
              </div>

              {/* Action Pills Row: Ganti Foto, Update Wajah, Mood, Bintang Apresiasi, Theme */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={handleOpenPhotoModal}
                  className={`inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 transition cursor-pointer shadow-sm active:scale-95 border ${
                    staffTheme?.pillBorder || 'bg-[#232938] hover:bg-[#2c3345] border-white/10 text-slate-300'
                  }`}
                >
                  <Camera className="w-3 h-3 text-indigo-400" />
                  <span>Foto</span>
                </button>

                {hasRegisteredBiometrics && (
                  <button
                    type="button"
                    onClick={onOpenFaceRegistration}
                    className={`inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 transition cursor-pointer shadow-sm active:scale-95 border ${
                      staffTheme?.pillBorder || 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-300'
                    }`}
                    title="Perbarui master biometrik wajah Anda"
                  >
                    <Smile className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Wajah</span>
                  </button>
                )}

                {/* Mood Dropdown */}
                <div className="relative" ref={moodContainerRef}>
                  <button
                    type="button"
                    onClick={() => setMoodDropdownOpen((prev) => !prev)}
                    disabled={savingMood}
                    className={`inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 transition cursor-pointer shadow-sm border ${
                      staffTheme?.pillBorder || 'bg-[#232938] hover:bg-[#2c3345] border-white/10 text-slate-200'
                    }`}
                  >
                    <span className="opacity-75">Mood:</span>
                    {currentMood ? (
                      <span className="text-xs leading-none">{currentMood}</span>
                    ) : (
                      <span className="text-[9.5px] text-slate-400 italic">pilih</span>
                    )}
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>

                  {moodDropdownOpen && (
                    <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-40 bg-[#1e2431] border border-white/15 rounded-2xl p-2 shadow-2xl grid grid-cols-4 gap-1.5 w-44">
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

                {/* Peer Kudos Star Button */}
                <button
                  type="button"
                  onClick={() => setKudosModalOpen(true)}
                  className={`inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2.5 py-0.5 transition cursor-pointer active:scale-95 border shadow-sm bg-gradient-to-r from-amber-500/20 to-yellow-500/15 hover:from-amber-500/30 hover:to-yellow-500/25 border-amber-400/40 text-amber-200`}
                  title="Kirim 1 Bintang Apresiasi (Kudos) ke rekan kerja minggu ini"
                >
                  <span>⭐</span>
                  <span className="font-extrabold">Apresiasi</span>
                </button>

                {/* Theme Customization Button */}
                <button
                  type="button"
                  onClick={() => setThemeModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold rounded-full px-2.5 py-0.5 transition cursor-pointer active:scale-95 border shadow-sm ${
                    staffTheme?.pillBorder || 'border-indigo-400/40 text-indigo-200 bg-indigo-950/60'
                  }`}
                  title="Kustomisasi Tema & Nuansa Dashboard"
                >
                  <span className="text-[9.5px] opacity-75 font-bold">Theme :</span>
                  <span>{staffTheme?.icon || '🎨'}</span>
                  <span className="font-black">{staffTheme?.shortName || staffTheme?.name || 'Custom'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handleClickPointsCard}
              className={`${staffTheme?.metricBg || 'bg-[#12151d] hover:bg-[#161a24] border border-white/[0.07]'} rounded-2xl p-2 text-left transition cursor-pointer active:scale-95`}
            >
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Total Poin
              </div>
              <div className={`text-lg font-black mt-0.5 leading-none ${
                pointTotal > 0 ? 'text-emerald-400' : pointTotal < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {pointTotal > 0 ? `+${pointTotal}` : pointTotal}
              </div>
              <div className="text-[9.5px] text-slate-500 mt-1 truncate">
                Lihat riwayat →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenAttendanceHistory?.('LATE')}
              className={`${staffTheme?.metricBg || 'bg-[#12151d] hover:bg-[#161a24] border border-white/[0.07]'} rounded-2xl p-2 text-left transition cursor-pointer active:scale-95 group`}
              title="Ketuk untuk melihat riwayat keterlambatan"
            >
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-300 transition truncate">
                Telat Bln Ini
              </div>
              <div className="text-lg font-black text-white mt-0.5 leading-none">
                {lateCount}x
              </div>
              <div className="text-[9.5px] text-amber-400/90 mt-1 truncate font-medium">
                Cek telat →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenAttendanceHistory?.('ABSENT')}
              className={`${staffTheme?.metricBg || 'bg-[#12151d] hover:bg-[#161a24] border border-white/[0.07]'} rounded-2xl p-2 text-left transition cursor-pointer active:scale-95 group`}
              title="Ketuk untuk melihat riwayat hari kerja & izin/alpa"
            >
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-300 transition truncate">
                Hari Kerja
              </div>
              <div className="text-lg font-black text-white mt-0.5 leading-none">
                {workDays}
              </div>
              <div className="text-[9.5px] text-blue-400/90 mt-1 truncate font-medium">
                Cek hari →
              </div>
            </button>
          </div>

          {/* Highlighted New Point Notification Strip */}
          {pendingPointsCount > 0 && (
            <button
              type="button"
              onClick={onOpenPendingPoints}
              className="w-full mt-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/45 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-black text-rose-200 truncate">
                    {pendingPointsCount} Poin Baru Perlu Dikonfirmasi
                  </div>
                  <div className="text-[10px] text-rose-300/80 truncate">
                    Ketuk untuk membaca detail sanksi/apresiasi
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shrink-0">
                Konfirmasi →
              </span>
            </button>
          )}
        </section>

        {/* =========================================================
            2. HERO ABSENSI SHIFT (Top Priority - Immediately Accessible)
           ========================================================= */}
        <section className={`${staffTheme?.cardBg || 'bg-[#181d26]'} ${staffTheme?.cardBorder || 'border-white/[0.08]'} border rounded-3xl p-3.5 sm:p-4 shadow-xl space-y-2.5 transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Absensi Shift Hari Ini</span>
            </span>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              {activeShift ? 'Shift Aktif Berjalan' : 'Siap Bertugas'}
            </span>
          </div>

          <div className="space-y-2">
            {/* Absen Masuk */}
            <button
              type="button"
              onClick={handleClickCheckIn}
              disabled={Boolean(activeShift)}
              className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-black transition ${
                activeShift
                  ? 'bg-black/30 text-slate-500 border border-white/5 cursor-not-allowed'
                  : `${staffTheme?.primaryBtn || 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25'} active:scale-[0.98] cursor-pointer`
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="text-sm">
                  {activeShift ? '✓ Sudah Absen Masuk' : 'Absen Masuk Sekarang'}
                </span>
              </span>
              {!activeShift && (
                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 shadow-sm ${
                  staffTheme?.primaryBtnBadge || 'bg-slate-950/20 text-slate-950'
                }`}>
                  Foto Selfie →
                </span>
              )}
            </button>

            {/* Ambil Istirahat / Selesai Break */}
            <button
              type="button"
              onClick={handleClickBreak}
              disabled={!canClickBreak}
              className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-black transition border ${
                !canClickBreak
                  ? 'bg-black/25 text-slate-600 border-white/5 cursor-not-allowed'
                  : isOnBreak
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/25 cursor-pointer animate-pulse'
                  : `${staffTheme?.secondaryBtn || 'bg-[#222836] hover:bg-[#2b3345] text-slate-100 border-white/10'} cursor-pointer active:scale-[0.98]`
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Coffee className="w-4 h-4 shrink-0" />
                <span className="text-sm">
                  {isOnBreak
                    ? 'Selesai Istirahat (Break)'
                    : hasTakenBreak
                    ? 'Istirahat Selesai (1x/shift)'
                    : 'Ambil Istirahat'}
                </span>
              </span>
              <span className="font-mono text-xs font-extrabold shrink-0">
                {isOnBreak
                  ? `${formatTimerSeconds(breakElapsedSec)} →`
                  : canClickBreak
                  ? 'Kuis & Foto →'
                  : '—'}
              </span>
            </button>

            {/* Absen Pulang (Smart Lock H-30m) */}
            <button
              type="button"
              onClick={handleClickCheckOut}
              className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-black transition border ${
                !activeShift
                  ? 'bg-[#12151d] text-slate-600 border-white/5 cursor-not-allowed'
                  : checkoutLock.locked
                  ? 'bg-[#151821] text-slate-400 border-white/10 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-400 text-white border-rose-400/50 shadow-lg shadow-rose-500/25 active:scale-[0.98] cursor-pointer'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {checkoutLock.locked || !activeShift ? (
                  <Lock className="w-4 h-4 shrink-0 text-slate-500" />
                ) : (
                  <LogOut className="w-4 h-4 shrink-0" />
                )}
                <span className="text-sm truncate">Absen Pulang (Check-Out)</span>
              </span>
              <span className="text-xs shrink-0 font-bold">
                {!activeShift
                  ? '—'
                  : checkoutLock.locked
                  ? checkoutLock.unlockTimeStr
                    ? `Buka ${checkoutLock.unlockTimeStr}`
                    : 'Terkunci'
                  : 'Foto Selfie →'}
              </span>
            </button>
          </div>
        </section>

        {/* Notice Peringatan Wajah Kurang Sesuai */}
        {activeShift && ((activeShift.flags || []).includes('FLAG_FACE_MISMATCH') || activeShift.face_recog_status === 'MISMATCH') && (
          <div className="bg-amber-950/70 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between gap-2.5 animate-fade-in shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 text-left">
                <h4 className="text-[11.5px] font-bold text-amber-300 leading-tight">Wajah Selfie Kurang Sesuai</h4>
                <p className="text-[10px] text-amber-200/80 leading-tight mt-0.5">
                  Kemiripan rendah. Perbarui foto master di tempat terang.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenFaceRegistration}
              className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[10.5px] font-bold shrink-0 transition cursor-pointer"
            >
              Update
            </button>
          </div>
        )}

        {/* Mandatory Face Biometrics Registration Alert (Hanya jika belum daftar sama sekali) */}
        {!hasRegisteredBiometrics && (
          <div className="bg-gradient-to-r from-indigo-950/80 via-[#1e2238] to-purple-950/80 border border-indigo-400/40 rounded-3xl p-3.5 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-white">Daftarkan Wajah Biometrik Anda</h3>
                <p className="text-[10.5px] text-indigo-200 truncate mt-0.5">Wajib 1x sebelum melakukan absensi masuk</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenFaceRegistration}
              className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black shadow-lg shadow-indigo-500/25 shrink-0 transition cursor-pointer active:scale-95"
            >
              Daftar →
            </button>
          </div>
        )}

        {/* =========================================================
            3. LAYANAN & FITUR UTAMA (2x2 Balanced Bento Grid)
           ========================================================= */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* A. LAPOR INTEGRITAS */}
          <button
            type="button"
            onClick={onOpenStaffReportModal}
            className="bg-gradient-to-br from-rose-950/80 via-[#21161a] to-[#171318] hover:bg-rose-900/30 border border-rose-500/40 rounded-2xl p-3 flex flex-col justify-between text-left shadow-lg transition active:scale-[0.98] cursor-pointer min-h-[110px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-900/50">
                <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 font-extrabold text-[9.5px] border border-rose-400/30">
                +Point
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-black text-white">🚨 LAPOR Integritas</div>
              <div className="text-[10.5px] text-rose-200/80 mt-0.5 line-clamp-1">
                Peraturan &amp; SOP (Anonim)
              </div>
            </div>
          </button>

          {/* B. KUIS MINGGUAN (LuckyCat Only) / ALTERNATIVE FOR JP */}
          {String(staff?.venue || '').toLowerCase().includes('lucky') ? (
            <button
              type="button"
              onClick={onOpenStaffQuizModal}
              className="bg-gradient-to-br from-amber-950/70 via-[#221c15] to-[#171615] hover:bg-amber-900/30 border border-amber-500/40 rounded-2xl p-3 flex flex-col justify-between text-left shadow-lg transition active:scale-[0.98] cursor-pointer min-h-[110px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[9.5px] border border-amber-400/30">
                  Wajib 1x
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-xs font-black text-white">📝 Kuis Mingguan</div>
                <div className="text-[10.5px] text-amber-200/80 mt-0.5 line-clamp-1">
                  10 Soal • Syarat Break
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="relative overflow-hidden bg-gradient-to-br from-[#2c220f] via-[#211a0d] to-[#141824] hover:from-[#3a2d14] hover:to-[#1a2233] border-2 border-amber-400/60 hover:border-amber-400 rounded-2xl p-3 flex flex-col justify-between text-left shadow-xl shadow-amber-950/50 transition-all duration-200 active:scale-[0.98] cursor-pointer min-h-[110px] group"
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-400/15 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between w-full relative z-10">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <Crown className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/25 to-yellow-400/20 text-amber-300 font-black text-[9.5px] border border-amber-400/40 shadow-sm flex items-center gap-1">
                  <span>👑</span> TOP RANK
                </span>
              </div>
              <div className="mt-2.5 relative z-10">
                <div className="text-xs font-black text-amber-100 flex items-center gap-1">
                  Leaderboard <span className="text-amber-400">★</span>
                </div>
                <div className="text-[10.5px] text-amber-200/80 mt-0.5 line-clamp-1 font-medium">
                  Klasemen Juara Tim
                </div>
              </div>
            </button>
          )}

          {/* C. PENGAJUAN (Izin, Cuti, Sakit, Pulang Awal) */}
          <button
            type="button"
            onClick={onOpenStaffLeaveModal}
            className={`${staffTheme?.bentoCard || 'bg-[#181d26] hover:bg-[#202734] border border-sky-400/30'} rounded-2xl p-3 flex flex-col justify-between text-left shadow-lg transition active:scale-[0.98] cursor-pointer min-h-[110px]`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${staffTheme?.bentoIconBg || 'bg-sky-500/20 text-sky-300 border border-sky-400/30'}`}>
                <FileText className="w-4 h-4" />
              </div>
              {leaveUpdateCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 font-black text-[9.5px]">
                  {leaveUpdateCount} Update
                </span>
              ) : (
                <span className={`text-[10.5px] font-bold ${staffTheme?.accentLink || 'text-sky-400'}`}>Buat →</span>
              )}
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-black text-white">Pengajuan</div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">
                Izin, Sakit, Cuti, Pulang Awal
              </div>
            </div>
          </button>

          {/* D. SCAN QR TOILET */}
          <button
            type="button"
            onClick={onSelectToilet}
            className={`${staffTheme?.bentoCard || 'bg-[#181d26] hover:bg-[#202734] border border-teal-400/30'} rounded-2xl p-3 flex flex-col justify-between text-left shadow-lg transition active:scale-[0.98] cursor-pointer min-h-[110px]`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${staffTheme?.bentoIconBg || 'bg-teal-500/20 text-teal-300 border border-teal-400/30'}`}>
                <QrCode className="w-4 h-4" />
              </div>
              <span className={`text-[10.5px] font-bold ${staffTheme?.accentLink || 'text-teal-400'}`}>Scan →</span>
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-black text-white">Cek Restroom</div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">
                Scan checklist kebersihan
              </div>
            </div>
          </button>
        </div>

        {/* =========================================================
            4. PENGUMUMAN & LEADERBOARD (Full Width Compact Cards)
           ========================================================= */}
        <div className="space-y-2 pt-1">
          {/* Pengumuman Operasional */}
          <button
            type="button"
            onClick={onOpenAnnouncements}
            className={`w-full rounded-2xl p-3 flex items-center justify-between gap-2.5 text-left shadow-lg active:scale-[0.99] transition cursor-pointer border ${
              unreadAnnouncementsCount > 0
                ? 'bg-amber-500/15 hover:bg-amber-500/20 border-amber-400/50'
                : `${staffTheme?.cardBg || 'bg-[#181d26]'} hover:brightness-110 ${staffTheme?.cardBorder || 'border-white/10'}`
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  unreadAnnouncementsCount > 0
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : `${staffTheme?.bentoIconBg || 'bg-[#222836] text-amber-300 border-white/10'}`
                }`}
              >
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">Pengumuman</span>
                  {unreadAnnouncementsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                      {unreadAnnouncementsCount} Baru
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {latestAnnouncementTitle}
                </div>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold shrink-0 border ${
                unreadAnnouncementsCount > 0
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : `${staffTheme?.pillBorder || 'bg-[#222836] text-slate-200 border-white/10'}`
              }`}
            >
              Baca →
            </span>
          </button>

          {/* Leaderboard Tim (Tampil jika staf LuckyCat, posisi tetap, desain dibuat menonjol dengan Crown) */}
          {String(staff?.venue || '').toLowerCase().includes('lucky') && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="relative overflow-hidden w-full bg-gradient-to-r from-[#2c220f] via-[#211a0d] to-[#141824] hover:from-[#3a2d14] hover:to-[#1a2233] active:scale-[0.99] border-2 border-amber-400/60 hover:border-amber-400 rounded-2xl p-3 flex items-center justify-between gap-2.5 text-left shadow-xl shadow-amber-950/40 transition-all duration-200 cursor-pointer group"
            >
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <Crown className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-amber-100 flex items-center gap-1.5">
                    <span>Leaderboard &amp; Peringkat Juara</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[9px] font-black border border-amber-400/40">
                      👑 TOP
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-200/80 truncate mt-0.5 font-medium">
                    Klasemen kedisiplinan &amp; perolehan poin tim
                  </div>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] shadow-md shadow-amber-500/25 shrink-0 flex items-center gap-1">
                <span>Cek Juara</span>
                <span>→</span>
              </span>
            </button>
          )}

          {/* Live Monitoring Dashboard (Only if OM/AM Management Role) */}
          {isManagementRole && onOpenMonitoring && (
            <button
              type="button"
              onClick={onOpenMonitoring}
              className="w-full bg-[#181d26] hover:bg-[#202734] border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-slate-200 transition cursor-pointer shadow-md"
            >
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Pantau Laporan &amp; Live Dashboard Manajer</span>
              </span>
              <span className="text-emerald-400 font-bold text-xs">Buka →</span>
            </button>
          )}

          {/* Bantuan Akses Izin HP (Discreet Troubleshooting Helper) */}
          <button
            type="button"
            onClick={() => setPermModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-[#141821] hover:bg-[#1a202c] border border-white/5 text-slate-400 hover:text-slate-200 text-[10.5px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Kamera atau GPS bermasalah? <strong>Cek Izin Perangkat HP</strong></span>
          </button>
        </div>
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

      {/* Staff Theme Customization Modal */}
      <StaffThemeModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        staff={staff}
        currentThemeId={staffTheme?.id}
        onSelectTheme={(theme) => {
          setStaffTheme(theme);
          setToastMessage(`Tema ${theme.name} diterapkan! ${theme.icon}`);
        }}
      />

      {/* Staff Peer Kudos (Bintang Apresiasi) Modal */}
      {kudosModalOpen && (
        <StaffKudosModal
          staff={staff}
          onClose={() => setKudosModalOpen(false)}
          onSuccess={() => {
            setToastMessage('Bintang Apresiasi berhasil dikirimkan! ⭐');
          }}
        />
      )}
    </div>
  );
}
