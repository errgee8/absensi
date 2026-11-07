import React, { useState, useEffect } from 'react';
import { Camera, LogOut, CheckCircle, Clock, ShieldCheck, ArrowLeft, Shirt, AlertCircle, Coffee, Play, Square } from 'lucide-react';
import { formatWitaTimeOnly, formatTimerSeconds } from '../../utils/time';

export default function KioskActionScreen({
  staff,
  activeShift,
  onTriggerCamera,
  onLogout
}) {
  const isCheckedIn = Boolean(activeShift);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  // LuckyCat break permission
  const isLuckyCat = staff?.venue === 'LuckyCat';
  const breakStatus = activeShift?.break_status || 'NONE'; // 'NONE' | 'ON_BREAK' | 'COMPLETED'
  const isOnBreak = breakStatus === 'ON_BREAK';
  const breakCount = activeShift?.break_count || 0;
  const breakAllowed = isLuckyCat && isCheckedIn && breakCount === 0 && !isOnBreak;

  // Max break end calculation
  const isShift2 = staff?.shift_start && staff.shift_start.startsWith('18');
  const maxBreakEndTime = isShift2 ? '01:00 WITA' : '16:00 WITA';

  // Live timer for active shift
  useEffect(() => {
    if (!activeShift?.checkin_time) return;

    const calc = () => {
      const start = new Date(activeShift.checkin_time).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsedSeconds(diff);

      if (isOnBreak && activeShift.break_start_time) {
        const breakStart = new Date(activeShift.break_start_time).getTime();
        const bDiff = Math.max(0, Math.floor((Date.now() - breakStart) / 1000));
        setBreakSeconds(bDiff);
      }
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [activeShift, isOnBreak]);

  return (
    <div className="max-w-md mx-auto">
      {/* Top Bar with Logout Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onLogout}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Batal / Keluar</span>
        </button>

        <span className="text-[11px] font-mono text-slate-400">
          {staff.venue} • {staff.id}
        </span>
      </div>

      {/* Main High-Contrast Action Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Glow */}
        <div
          className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isOnBreak
              ? 'bg-sky-500/15'
              : isCheckedIn
              ? 'bg-amber-500/10'
              : 'bg-emerald-500/15'
          }`}
        />

        {/* Header: Halo, [Nama]! Status */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                isOnBreak
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                  : isCheckedIn
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              Status: {isOnBreak ? 'Sedang Istirahat' : isCheckedIn ? 'Sudah Masuk' : 'Belum Masuk'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {staff.venue} • {staff.division}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Halo, {staff.name}!
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{staff.role}</p>
        </div>

        {/* Break in Progress Box */}
        {isOnBreak && (
          <div className="bg-sky-950/40 border border-sky-500/40 rounded-2xl p-4 mb-5 text-center">
            <span className="text-[10px] text-sky-400 uppercase font-bold tracking-wider block mb-1">
              Waktu Istirahat Berjalan (Maksimal 1 Jam)
            </span>
            <div className="text-4xl font-black font-mono text-sky-300">
              {formatTimerSeconds(breakSeconds)}
            </div>
            <p className="text-[11px] text-sky-200/80 mt-1.5">
              Batas akhir selesai istirahat: <strong>{maxBreakEndTime}</strong>
            </p>
          </div>
        )}

        {/* Active Shift Details Box if already checked in and not on break */}
        {isCheckedIn && !isOnBreak && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Masuk Pukul:</span>
              </span>
              <span className="font-mono font-bold text-white">
                {formatWitaTimeOnly(activeShift.checkin_time)}
              </span>
            </div>

            <div className="text-center py-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Durasi Bertugas
              </span>
              <span className="text-3xl font-black font-mono text-amber-400">
                {formatTimerSeconds(elapsedSeconds)}
              </span>
            </div>
          </div>
        )}

        {/* ACTIONS SECTION */}
        <div className="space-y-3">
          {isOnBreak ? (
            // BUTTON: END BREAK (SELESAI ISTIRAHAT)
            <div className="space-y-2">
              <button
                onClick={() => onTriggerCamera('break_end')}
                className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-sky-600/30 active:scale-[0.98] transition flex items-center justify-center space-x-2.5"
              >
                <Coffee className="w-5 h-5" />
                <span>AMBIL FOTO & SELESAI ISTIRAHAT</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Wajib foto selfie verifikasi kembali bertugas.
              </p>
            </div>
          ) : isCheckedIn ? (
            // CHECKED-IN STATE: Optional Break (LuckyCat) + Check-Out
            <div className="space-y-3">
              {/* LuckyCat Break Button (Only if 0 breaks taken and venue is LuckyCat) */}
              {breakAllowed && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Coffee className="w-4 h-4 text-sky-400" />
                      <span>Waktu Istirahat (1 Jam)</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Maks Selesai: {maxBreakEndTime}
                    </span>
                  </div>
                  <button
                    onClick={() => onTriggerCamera('break_start')}
                    className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-sm rounded-xl shadow-md shadow-sky-600/20 active:scale-[0.98] transition flex items-center justify-center space-x-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>AMBIL FOTO & MULAI ISTIRAHAT</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    Istirahat hanya boleh 1x per shift (maks 1 jam).
                  </p>
                </div>
              )}

              {/* Notice if break already used */}
              {isLuckyCat && breakCount >= 1 && (
                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Istirahat 1 jam sudah diambil untuk shift ini.</span>
                </div>
              )}

              {/* BIG CHECK-OUT BUTTON */}
              <button
                onClick={() => onTriggerCamera('checkout')}
                className="w-full py-5 px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-red-600/30 active:scale-[0.98] transition flex items-center justify-center space-x-3"
              >
                <Camera className="w-6 h-6 stroke-[2.5]" />
                <span className="tracking-wide">AMBIL FOTO & CHECK-OUT</span>
              </button>

              <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start space-x-2">
                <Shirt className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Pengingat Selesai Kerja:</strong> Pastikan seragam sudah dilepas dan operan shift selesai.
                </span>
              </div>
            </div>
          ) : (
            // NOT CHECKED IN YET: BIG GREEN CHECK-IN BUTTON
            <div className="space-y-3">
              <button
                onClick={() => onTriggerCamera('checkin')}
                className="w-full py-5 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition flex items-center justify-center space-x-3"
              >
                <Camera className="w-6 h-6 stroke-[2.5]" />
                <span className="tracking-wide">AMBIL FOTO & CHECK-IN</span>
              </button>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-200/90 flex items-start space-x-2">
                <Shirt className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Standar Grooming:</strong> Pastikan sudah rapi / grooming lengkap dan terhubung ke Wi-Fi outlet.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Shift details footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>Jadwal: {staff.shift_start || '13:00'} - {staff.shift_end || '22:00'}</span>
          <span className="text-emerald-400 font-medium">Toleransi Grace Period: 10 Menit</span>
        </div>
      </div>
    </div>
  );
}
