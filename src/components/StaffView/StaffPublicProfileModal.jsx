import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Flame,
  Calendar,
  Trophy,
  Sparkles,
  Crown,
  Quote,
  Building2,
  Smile,
  ShieldCheck,
  Palette,
  AlertCircle
} from 'lucide-react';
import { getStaffPublicProfile } from '../../utils/api';
import { getStreakTier, isVipStaff } from '../../utils/streakFrames';
import { VIP_THEME, STAFF_THEMES } from './StaffThemeModal';

const profileClientCache = new Map();

export default function StaffPublicProfileModal({
  isOpen,
  staffId,
  visitorStaff = null,
  isManager = false,
  onClose,
  onGiveStar = null
}) {
  const [loading, setLoading] = useState(() => !profileClientCache.has(staffId));
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(() => profileClientCache.get(staffId) || null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!isOpen || !staffId) return;
    let isMounted = true;
    setImgError(false);

    // Instant cache check
    if (profileClientCache.has(staffId)) {
      setProfile(profileClientCache.get(staffId));
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function fetchProfile() {
      try {
        setError(null);
        const res = await getStaffPublicProfile(staffId, visitorStaff?.id || '');
        if (!isMounted) return;
        if (res?.profile) {
          setProfile(res.profile);
          profileClientCache.set(staffId, res.profile);
          if (res.profile.id) profileClientCache.set(res.profile.id, res.profile);
          if (res.profile.uuid) profileClientCache.set(res.profile.uuid, res.profile);
        }
      } catch (err) {
        if (!isMounted) return;
        if (!profile) setError(err.message || 'Gagal memuat profil staf.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen, staffId, visitorStaff?.id]);

  if (!isOpen) return null;

  const isVip = isVipStaff(profile) || Boolean(profile?.is_vip);
  const currentStreak = isVip ? 888 : (profile?.streak || 0);
  const streakTier = getStreakTier(currentStreak, isVip);
  const isSelf = visitorStaff && (String(visitorStaff.id) === String(profile?.id) || String(visitorStaff.uuid) === String(profile?.uuid));

  // Ambil tema yang dipilih oleh staf yang sedang dikunjungi (Default: Stealth Titanium 'midnight')
  const defaultTheme = STAFF_THEMES.find((t) => t.id === 'midnight') || STAFF_THEMES[0];
  const visitedTheme =
    (isVip ? VIP_THEME : null) ||
    [VIP_THEME, ...STAFF_THEMES].find((t) => t.id === profile?.theme_id) ||
    defaultTheme;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className={`${visitedTheme.cardBg || 'bg-[#121620]'} ${visitedTheme.cardBorder || 'border-white/15'} border rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 text-slate-100 shadow-2xl relative my-auto space-y-4 transition-all duration-300`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Memuat profil rekan kerja...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && profile && (
          <>
            {/* 1. Header Profile Banner */}
            <div className="relative pt-2 text-center space-y-2.5">
              {/* Framed Avatar */}
              <div className="relative inline-block mx-auto">
                {(isVip || streakTier.hasCrown) && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
                    <Crown className={`w-6 h-6 ${streakTier.crownColor || 'text-yellow-300 fill-amber-300 drop-shadow-[0_0_10px_rgba(234,179,8,1)]'}`} />
                  </div>
                )}
                <div
                  className={`w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center shadow-xl transition-all ${streakTier.ringClasses} ${visitedTheme.avatarRing || ''}`}
                >
                  {profile.profile_photo_url && !imgError ? (
                    <img
                      src={profile.profile_photo_url}
                      alt={profile.name}
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <span className="text-xl font-black text-slate-300">
                      {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'ST'}
                    </span>
                  )}
                </div>

                {streakTier.badge && (
                  <span
                    className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full text-xs flex items-center justify-center shadow-lg z-10 ${streakTier.badgeClasses}`}
                    title={`${streakTier.name} (${currentStreak} Hari Streak)`}
                  >
                    {streakTier.badge}
                  </span>
                )}
              </div>

              {/* Name & Badges */}
              <div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <h3 className={`text-base sm:text-lg font-black leading-tight ${streakTier.nameGold ? streakTier.nameClass : 'text-white'}`}>
                    {profile.name}
                  </h3>
                  {isVip ? (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.7)] border-2 border-yellow-200 tracking-wider animate-pulse"
                      title="👑 Executive VIP Owner"
                    >
                      <Crown className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                      <span>VIP</span>
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black border shadow-xs ${streakTier.pillBg}`}
                    >
                      <span>{streakTier.badge || '🔥'}</span>
                      <span>{currentStreak}d Streak</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                  <span>{profile.role || 'Staff'}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-indigo-400" />
                    <span>{profile.venue || 'Outlet'}</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  {/* Badge Tema Personal yang Digunakan Staff Ini */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9.5px] font-extrabold ${visitedTheme.pillBorder || 'border-white/10 bg-slate-800'}`}>
                    <span>{visitedTheme.icon || '🎨'}</span>
                    <span>{visitedTheme.shortName || visitedTheme.name}</span>
                  </span>
                </div>

                {/* Mood Hari Ini (Jika Diset) */}
                {profile.mood_emoji && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-white/10 text-xs shadow-xs">
                    <Smile className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-slate-400 font-bold">Mood Hari Ini:</span>
                    <span className="text-sm leading-none">{profile.mood_emoji}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Bio Singkat Staff */}
            <div className={`p-3 rounded-2xl border transition-all ${visitedTheme.bentoCard || 'bg-[#181d28] border-white/10'}`}>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Quote className="w-3 h-3 text-amber-400" />
                <span>Bio Profil:</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed italic whitespace-pre-wrap">
                {profile.bio && profile.bio.trim()
                  ? `"${profile.bio.trim()}"`
                  : 'Rekan kerja ini belum menambahkan bio singkat.'}
              </p>
            </div>

            {/* 3. Key Positive Metrics Bento (Privasi Terjaga: Poin & Telat Disembunyikan) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Total Hari Kerja (Sejak Awal Launching) */}
              <div className={`${visitedTheme.metricBg || 'bg-[#161a24]'} border rounded-2xl p-2.5 space-y-1 transition-all`}>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Total Hari Kerja</span>
                </div>
                <div className="text-lg font-black text-white font-mono leading-none">
                  {profile.work_days} <span className="text-xs text-slate-400 font-normal">hari</span>
                </div>
                <div className="text-[9.5px] text-blue-400/90 font-medium truncate">
                  Sejak peluncuran aplikasi
                </div>
              </div>

              {/* On-Time Streak */}
              <div className={`${visitedTheme.metricBg || 'bg-[#161a24]'} border rounded-2xl p-2.5 space-y-1 transition-all`}>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>On-Time Streak</span>
                </div>
                <div className="text-lg font-black text-amber-300 font-mono leading-none">
                  {currentStreak} <span className="text-xs text-slate-400 font-normal">hari</span>
                </div>
                <div className="text-[9.5px] text-amber-400/90 font-medium truncate">
                  {streakTier.name}
                </div>
              </div>

              {/* Bintang Apresiasi Diterima */}
              <div className={`${visitedTheme.metricBg || 'bg-[#161a24]'} border rounded-2xl p-2.5 space-y-1 transition-all`}>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Bintang Apresiasi</span>
                </div>
                <div className="text-lg font-black text-yellow-300 font-mono leading-none">
                  ⭐ {profile.kudos_count || 0}
                </div>
                <div className="text-[9.5px] text-yellow-400/90 font-medium truncate">
                  Diberi rekan kerja
                </div>
              </div>

              {/* Peringkat Leaderboard */}
              <div className={`${visitedTheme.metricBg || 'bg-[#161a24]'} border rounded-2xl p-2.5 space-y-1 transition-all`}>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Peringkat Bulan Ini</span>
                </div>
                <div className="text-lg font-black text-emerald-300 font-mono leading-none">
                  {profile.leaderboard_rank ? `#${profile.leaderboard_rank}` : '—'}
                </div>
                <div className="text-[9.5px] text-emerald-400/90 font-medium truncate">
                  {profile.leaderboard_rank ? `Peringkat #${profile.leaderboard_rank}` : 'Top Kontributor'}
                </div>
              </div>
            </div>

            {/* 4. Action Button / Status Footer */}
            <div className="pt-1">
              {isManager ? (
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-center flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Mode Tinjau Profil Karyawan (Manajemen)</span>
                </div>
              ) : isSelf ? (
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-center text-xs font-bold text-indigo-300">
                  <span>Ini adalah dashboard profil Anda</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onGiveStar) onGiveStar(profile);
                  }}
                  className={`w-full py-2.5 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg ${
                    visitedTheme.primaryBtn ||
                    'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current shrink-0" />
                  <span>Beri Bintang Apresiasi ke {profile.name.split(' ')[0]} ⭐</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
