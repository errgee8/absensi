import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, QrCode, LogOut, CheckCircle, Clock, Building2, User, Coffee, ArrowRight, ShieldCheck, Star, Eye, Trophy, Palmtree, Megaphone, AlertCircle, Award } from 'lucide-react';

export default function KioskPortalScreen({
  staff,
  activeShift,
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
  pointCycleLabel = '',
  pendingPointsCount = 0,
  onOpenPointHistory
}) {
  const isCheckedIn = Boolean(activeShift);
  const breakStatus = activeShift?.break_status || 'NONE';
  const isOnBreak = breakStatus === 'ON_BREAK';
  const hasTakenBreak = (activeShift?.break_count >= 1) || (breakStatus === 'COMPLETED');
  const isManagement = staff?.division === 'Management' || (staff?.role && staff?.role.toLowerCase().includes('manager'));
  const normVenue = (staff?.venue || '').replace(/\s+/g, '').toLowerCase();
  const shiftAllowsBreak = !isManagement && (staff?.allows_break !== 0 || normVenue === 'luckycat' || activeShift?.allows_break !== 0);
  const canTakeBreak = isCheckedIn && !isOnBreak && !hasTakenBreak && shiftAllowsBreak;

  const [breakSeconds, setBreakSeconds] = useState(0);
  const [liveTime, setLiveTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(liveTime);

  useEffect(() => {
    if (!isOnBreak || !activeShift?.break_start_time) return;
    const calc = () => {
      const start = new Date(activeShift.break_start_time).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setBreakSeconds(diff);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [isOnBreak, activeShift?.break_start_time]);

  const formatTimerSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in py-2">
      {/* Staff Identity Header Card - Dark Theme */}
      <div className="bg-[#161b24] rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-600/30">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{staff.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-950/80 text-blue-300 border border-blue-500/30">
                {staff.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center space-x-1.5 mt-0.5">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{staff.venue} • {staff.division}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live WITA Clock Pill */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0f131a] text-emerald-400 font-mono text-xs font-bold shadow-inner border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span>{timeStr} <span className="text-[10px] text-slate-400">WITA</span></span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 rounded-2xl bg-[#1c2230] hover:bg-[#252d3f] text-slate-300 hover:text-white border border-slate-700/80 transition flex items-center space-x-1.5 shadow-xs active:scale-95"
            title="Keluar / Ganti Akun"
          >
            <LogOut className="w-4 h-4 stroke-[2]" />
            <span className="text-xs font-bold hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Attendance Status Banner - Elegant Dark Tint */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-md ${
        isOnBreak
          ? 'bg-sky-950/50 border-sky-500/40 text-sky-200'
          : isCheckedIn
          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
          : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
      }`}>
        <div className="flex items-center space-x-3">
          {isOnBreak ? (
            <Coffee className="w-6 h-6 text-sky-400 animate-pulse shrink-0" />
          ) : isCheckedIn ? (
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-amber-400 shrink-0" />
          )}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-400">
              Status Kehadiran Hari Ini:
            </span>
            <span className="text-sm sm:text-base font-bold text-white">
              {isOnBreak
                ? 'Sedang Waktu Istirahat'
                : isCheckedIn
                ? `Sudah Check-In Masuk (${activeShift?.scheduled_start || staff.shift_start || ''} - ${activeShift?.scheduled_end || staff.shift_end || ''})`
                : 'Belum Check-In Masuk'}
            </span>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase shadow-xs ${
          isOnBreak
            ? 'bg-sky-600 text-white'
            : isCheckedIn
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-600 text-white'
        }`}>
          {isOnBreak ? 'Istirahat' : isCheckedIn ? 'On Duty' : 'Off Duty'}
        </span>
      </div>

      {/* Staff Monthly Point Accumulation Card (Reset tgl 17 -> tgl 13) */}
      <div
        onClick={onOpenPointHistory}
        className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer shadow-md ${
          pendingPointsCount > 0
            ? 'bg-rose-950/35 border-rose-500/50 ring-1 ring-rose-500/30'
            : pointTotal > 0
            ? 'bg-[#1a1620] border-amber-500/35 hover:border-amber-400/50'
            : 'bg-[#161b24] border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            pointTotal > 0
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
          }`}>
            <Award className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Akumulasi Poin Bulan Ini
              </span>
              {pendingPointsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white animate-pulse">
                  {pendingPointsCount} Perlu Persetujuan
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
              <span className={`text-lg font-mono font-bold ${
                pointTotal > 0 ? 'text-rose-300' : 'text-emerald-300'
              }`}>
                {pointTotal} Poin
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                {pointCycleLabel ? `Periode ${pointCycleLabel}` : 'Reset tgl 17 s/d tgl 13'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="px-3 py-1.5 rounded-xl bg-[#1c2230] hover:bg-[#252d3f] border border-slate-700 text-xs font-bold text-slate-200 shrink-0 cursor-pointer"
        >
          Riwayat →
        </button>
      </div>

      {/* Management Announcements Banner */}
      {announcements && announcements.length > 0 && (
        <div
          onClick={onOpenAnnouncements}
          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-md hover:shadow-lg flex items-center justify-between gap-3 ${
            unreadAnnouncementsCount > 0
              ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/20 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-[#161b24] border-slate-800'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white ${
                unreadAnnouncementsCount > 0
                  ? 'bg-gradient-to-br from-rose-600 to-amber-600 shadow-md shadow-rose-600/30'
                  : 'bg-slate-800'
              }`}
            >
              <Megaphone className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Pengumuman Management
                </span>
                {unreadAnnouncementsCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
                    {unreadAnnouncementsCount} Belum Disetujui
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Semua Disetujui ✓
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-black text-slate-950 truncate mt-0.5">
                {announcements.length === 1
                  ? announcements[0]?.title
                  : `${announcements.length} Pengumuman Resmi Tersedia`}
              </h4>
              {announcements.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {announcements.map((a, i) => (
                    <span
                      key={a.id}
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                        a.isRead
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : a.urgency === 'URGENT'
                          ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {a.urgency === 'URGENT' ? '🚨 ' : '📢 '}
                      {a.title} {a.isRead ? '✓' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shrink-0 shadow-sm"
          >
            Buka ({announcements.length})
          </button>
        </div>
      )}

      {/* ACTIVE BREAK BANNER: Glow, Live Timer, and Instant End Break Action */}
      {isOnBreak && (
        <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 rounded-3xl p-5 sm:p-6 border-3 border-sky-400 shadow-xl shadow-sky-500/15 relative overflow-hidden animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-600/30 animate-pulse">
                <Coffee className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-950">
                    Sedang Waktu Istirahat
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-200 text-sky-900 border border-sky-300">
                    Maks 1 Jam
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-sky-700">
                    {formatTimerSeconds(breakSeconds)}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    / 60:00 Menit
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-bold mt-1">
                  {breakSeconds > 3600 ? (
                    <span className="text-rose-600 font-black">
                      ⚠️ Waktu istirahat telah melebihi batas 1 jam! Segera ambil foto selesai.
                    </span>
                  ) : (
                    <span>Sisa waktu: ~{Math.max(0, 60 - Math.floor(breakSeconds / 60))} menit lagi.</span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onTriggerCamera && onTriggerCamera('break_end')}
              className="w-full sm:w-auto px-5 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center space-x-2.5 shrink-0"
            >
              <Coffee className="w-5 h-5 stroke-[2.5]" />
              <span>AMBIL FOTO &amp; SELESAI ISTIRAHAT</span>
            </button>
          </div>
        </div>
      )}

      {/* BREAK ELIGIBILITY CARD: Prominent 1-Click Take Break Action */}
      {canTakeBreak && (
        <div className="bg-[#1a202d] rounded-3xl p-5 sm:p-6 border border-amber-500/40 shadow-xl shadow-black/25 relative overflow-hidden animate-fade-in text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-600/30">
                <Coffee className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Tombol Istirahat Kerja
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    Tersedia (1 Jam)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  Istirahat hanya diperbolehkan <strong>1x per shift</strong> selama maksimal <strong>1 jam (60 menit)</strong>.
                </p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  Wajib ambil foto selfie saat mulai istirahat &amp; saat selesai istirahat.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onTriggerCamera && onTriggerCamera('break_start')}
              className="w-full sm:w-auto px-5 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-600/30 active:scale-95 transition flex items-center justify-center space-x-2.5 shrink-0"
            >
              <Coffee className="w-5 h-5 stroke-[2.2]" />
              <span>AMBIL FOTO &amp; MULAI ISTIRAHAT</span>
            </button>
          </div>
        </div>
      )}

      {/* Break Completed Info Pill */}
      {hasTakenBreak && isCheckedIn && !isOnBreak && (
        <div className="bg-[#14201c] border border-emerald-500/40 rounded-2xl px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm text-emerald-200 font-bold">
              Istirahat 1x (maksimal 1 jam) sudah selesai digunakan pada shift ini.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/30">
            Selesai ✓
          </span>
        </div>
      )}

      {/* Action Options Prompt */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Pilih Aktivitas Anda:
        </span>
        <span className="text-[11px] font-bold text-blue-300 bg-blue-950/70 px-3 py-1 rounded-full border border-blue-500/30 flex items-center space-x-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span>Absensi adalah Menu Utama</span>
        </span>
      </div>

      {/* Action Portal Cards: Card 1 (Absensi) is Made Highly Prominent & Dominant */}
      <div className="space-y-4">
        {/* CARD 1: PRIMARY ACTION - ABSENSI KERJA (Check-In / Break / Pulang) */}
        <button
          type="button"
          onClick={onSelectAttendance}
          className="w-full relative bg-[#161b24] hover:bg-[#1a202c] rounded-3xl p-6 sm:p-7 border-2 border-blue-500/70 shadow-xl shadow-black/30 hover:border-blue-400 transition-all text-left flex flex-col justify-between group touch-press overflow-hidden"
        >
          {/* Top colored accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400" />

          <div>
            {/* High Priority Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-600 text-white shadow-md shadow-blue-600/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>1. UTAMA: WAJIB DI AWAL &amp; AKHIR SHIFT</span>
              </span>
              <span className="text-xs font-bold text-blue-400 animate-pulse hidden sm:inline">
                Pencet Di Sini Untuk Absen →
              </span>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/35 group-hover:scale-105 transition">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-blue-300 transition tracking-tight">
                    Absensi Kerja
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    {isOnBreak ? 'Selesai Istirahat' : isCheckedIn ? 'Pulang / Istirahat' : 'Check-In Masuk'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 leading-relaxed">
                  {isOnBreak
                    ? 'Tekan tombol ini untuk foto selfie selesai istirahat dan kembali dinas.'
                    : isCheckedIn
                    ? 'Tekan tombol ini untuk mengambil istirahat (bila ada) atau ambil foto check-out saat pulang kerja.'
                    : 'Untuk staf yang baru tiba di outlet: Ambil foto selfie langsung untuk Check-In masuk dinas hari ini.'}
                </p>
              </div>
            </div>
          </div>

          {/* Prominent Large Solid CTA Button */}
          <div className="mt-5 w-full py-4 px-6 rounded-2xl bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-lg shadow-blue-600/30 transition">
            <Camera className="w-5 h-5 stroke-[2.2]" />
            <span>
              {isOnBreak
                ? 'BUKA MENU SELESAI ISTIRAHAT'
                : isCheckedIn
                ? 'BUKA MENU PULANG / ISTIRAHAT'
                : 'BUKA MENU CHECK-IN MASUK'}
            </span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition stroke-[2.2]" />
          </div>
        </button>

        {/* CARD 2: SECONDARY ACTION - SCAN QR CHECKLIST TOILET */}
        <button
          type="button"
          onClick={onSelectToilet}
          className="w-full bg-[#161b24] hover:bg-[#1a202c] rounded-3xl p-5 border border-slate-800 hover:border-slate-700 shadow-md transition-all text-left flex flex-col justify-between group touch-press"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                <span>2. Opsi Tambahan (Bila Sedang Bertugas)</span>
              </span>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition">
                <QrCode className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                  Scan QR Checklist Toilet
                </h3>
                <p className="text-xs text-slate-400 font-normal mt-0.5 leading-relaxed">
                  Khusus saat membersihkan toilet JP &amp; LC. Arahkan kamera HP ke stiker QR di toilet untuk mengisi form kebersihan berkala.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-blue-400">
            <span>Scan Stiker Toilet</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition stroke-[2]" />
          </div>
        </button>

        {/* CARD: IZIN & CUTI SAYA (TERKUNCI PER STAF) */}
        {onOpenStaffLeaveModal && (
          <button
            type="button"
            onClick={onOpenStaffLeaveModal}
            className="w-full bg-[#161b24] hover:bg-[#1a202c] rounded-3xl p-5 border border-slate-800 hover:border-emerald-500/40 shadow-md transition-all text-left flex flex-col justify-between group touch-press"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30 shadow-xs">
                    <Palmtree className="w-3 h-3 text-emerald-400" />
                    <span>3. Pengajuan Izin &amp; Cuti</span>
                  </span>
                  {leaveUpdateCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse shadow-xs">
                      {leaveUpdateCount} Update Baru!
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">
                  Kelola Cuti &amp; Izin Saya →
                </span>
              </div>

              <div className="flex items-start space-x-3.5 mt-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30 group-hover:scale-105 transition">
                  <Palmtree className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition">
                    Pengajuan Cuti &amp; Izin ({staff.name})
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-1 leading-relaxed">
                    Ajukan cuti tahunan (H-14), izin biasa, atau izin sakit/darurat, serta pantau status persetujuan dari management.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span>Buka Riwayat &amp; Formulir Pengajuan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition stroke-[2]" />
            </div>
          </button>
        )}

        {/* CARD 4: LEADERBOARD STAF TERAJIN (KANDIDAT BONUS BULANAN) */}
        {onOpenLeaderboard && (
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="w-full bg-[#161b24] hover:bg-[#1a202c] rounded-3xl p-5 border border-slate-800 hover:border-amber-500/40 shadow-md transition-all text-left flex flex-col justify-between group touch-press"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/30 shadow-xs">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>4. Prestasi &amp; Bonus Bulanan</span>
                </span>
                <span className="text-[11px] font-bold text-amber-400 animate-pulse">
                  Lihat Peringkat Staf →
                </span>
              </div>

              <div className="flex items-start space-x-3.5 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 group-hover:scale-105 transition">
                  <Trophy className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition">
                    Leaderboard Staf Terajin (Top 5)
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-1 leading-relaxed">
                    Pantau posisi peringkat kehadiran absensi tepat waktu dan checklist toilet harian untuk penentuan bonus bulanan.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
              <span>Buka Leaderboard Real-Time</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition stroke-[2]" />
            </div>
          </button>
        )}

        {/* CARD 3: KHUSUS ASSISTANT MANAGER / MANAGEMENT - PANTAU LAPORAN (VIEW ONLY) */}
        {isManagement && (
          <button
            type="button"
            onClick={onOpenMonitoring}
            className="w-full bg-[#161b24] hover:bg-[#1a202c] rounded-3xl p-5 border border-slate-800 hover:border-indigo-500/40 shadow-md transition-all text-left flex flex-col justify-between group touch-press"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-500/30 shadow-xs">
                  <Eye className="w-3.5 h-3.5" />
                  <span>3. Akses Khusus: {staff.name} ({staff.role})</span>
                </span>
                <span className="text-[11px] font-bold text-indigo-400">
                  Buka Monitoring →
                </span>
              </div>

              <div className="flex items-start space-x-3.5 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30 group-hover:scale-105 transition">
                  <Eye className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition">
                    Buka Dashboard View Only (Laporan Absensi &amp; Toilet)
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-1 leading-relaxed">
                    Masuk langsung ke laporan riwayat absen anak-anak, foto selfie kehadiran, dan checklist kebersihan toilet tanpa perlu memasukkan PIN lagi.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
              <span>Buka Laporan Monitoring Sekarang</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition stroke-[2]" />
            </div>
          </button>
        )}
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-500 font-medium">
          Staff Portal • Lucky Cat &amp; JPE Karaoke
        </p>
      </div>
    </div>
  );
}
