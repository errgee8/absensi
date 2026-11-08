import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, Clock, ArrowLeft, Shirt, AlertCircle, Coffee, Play, Check } from 'lucide-react';
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

  // Shift selection & confirmation state
  const availableSchedules = staff?.availableSchedules || [];
  const detectedShift = staff?.detectedShift || (availableSchedules.length > 0 ? availableSchedules[0] : null);
  const [selectedShift, setSelectedShift] = useState(detectedShift);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (staff?.detectedShift) {
      setSelectedShift(staff.detectedShift);
    }
  }, [staff]);

  // Break states
  const breakStatus = activeShift?.break_status || 'NONE'; // 'NONE' | 'ON_BREAK' | 'COMPLETED'
  const isOnBreak = breakStatus === 'ON_BREAK';
  const hasTakenBreak = (activeShift?.break_count >= 1) || (breakStatus === 'COMPLETED');

  // Active shift timings
  const shiftStart = activeShift?.scheduled_start || selectedShift?.start_time || '13:00';
  const shiftEnd = activeShift?.scheduled_end || selectedShift?.end_time || '22:00';
  const currentShiftName = activeShift?.scheduled_start
    ? (availableSchedules.find((s) => s.start_time === activeShift.scheduled_start)?.name || 'Shift Aktif')
    : (selectedShift?.name || 'Shift 1');

  // 2 hours before shift end rule
  const breakCutoffTime = staff?.breakCutoffTime || '20:00';
  const isWithin2HoursOfEnd = staff?.isWithin2HoursOfEnd ?? false;
  const canTakeBreak = isCheckedIn && !isOnBreak && !hasTakenBreak && !isWithin2HoursOfEnd;

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
        {/* Ambient Glow */}
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
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-slate-400 font-medium">{staff.role}</span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded-lg flex items-center space-x-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>{currentShiftName} ({shiftStart} - {shiftEnd})</span>
            </span>
          </div>
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
              Batas istirahat harus selesai sebelum: <strong>{breakCutoffTime} WITA</strong> (2 jam sebelum shift usai)
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

        {/* =========================================================================
            ACTIONS SECTION: EXACT 4-STATE WORKFLOW
           ========================================================================= */}
        <div className="space-y-3">
          {/* STATE 1: ON BREAK -> ONLY 1 BUTTON: FINISH BREAK */}
          {isOnBreak ? (
            <div className="space-y-2">
              <button
                onClick={() => onTriggerCamera('break_end')}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition flex items-center justify-center space-x-2.5"
              >
                <Coffee className="w-5 h-5" />
                <span>AMBIL FOTO & SELESAI ISTIRAHAT</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Wajib foto selfie untuk verifikasi selesai istirahat dan kembali bertugas.
              </p>
            </div>
          ) : isCheckedIn ? (
            /* STATE 2: CHECKED-IN -> 2 BUTTONS (TAKE BREAK & CHECKOUT) OR 1 BUTTON (CHECKOUT ONLY) */
            <div className="space-y-3">
              {canTakeBreak ? (
                /* 2 BUTTONS: TAKE BREAK AND CHECK-OUT */
                <div className="space-y-3">
                  {/* Button 1: Take Break */}
                  <button
                    onClick={() => onTriggerCamera('break_start')}
                    className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-lg shadow-sky-600/25 active:scale-[0.98] transition flex items-center justify-center space-x-2.5"
                  >
                    <Coffee className="w-5 h-5" />
                    <span>AMBIL FOTO & MULAI ISTIRAHAT</span>
                  </button>

                  {/* Button 2: Check Out */}
                  <button
                    onClick={() => onTriggerCamera('checkout')}
                    className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-base rounded-2xl shadow-lg shadow-red-600/25 active:scale-[0.98] transition flex items-center justify-center space-x-2.5"
                  >
                    <Camera className="w-5 h-5 stroke-[2.5]" />
                    <span>AMBIL FOTO & CHECK-OUT</span>
                  </button>

                  <p className="text-[11px] text-slate-400 text-center">
                    Istirahat 1x per shift (maks 1 jam). Batas istirahat berakhir pukul <strong>{breakCutoffTime} WITA</strong> (2 jam sebelum shift selesai).
                  </p>
                </div>
              ) : (
                /* ONLY 1 BUTTON: CHECKOUT (Either break already taken, or within 2 hours of shift end) */
                <div className="space-y-3">
                  <button
                    onClick={() => onTriggerCamera('checkout')}
                    className="w-full py-5 px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-red-600/30 active:scale-[0.98] transition flex items-center justify-center space-x-3"
                  >
                    <Camera className="w-6 h-6 stroke-[2.5]" />
                    <span className="tracking-wide">AMBIL FOTO & CHECK-OUT</span>
                  </button>

                  {hasTakenBreak ? (
                    <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-emerald-400 flex items-center justify-center space-x-2">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Istirahat 1x sudah diambil untuk shift ini.</span>
                    </div>
                  ) : isWithin2HoursOfEnd ? (
                    <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center justify-center space-x-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Waktu istirahat telah berakhir (kurang dari 2 jam sebelum shift selesai).</span>
                    </div>
                  ) : null}

                  <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start space-x-2">
                    <Shirt className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Pengingat Selesai Kerja:</strong> Pastikan seragam sudah dilepas dan operan shift selesai.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STATE 3: HAVEN'T CHECKED IN -> ONLY 1 BUTTON: CHECK IN */
            <div className="space-y-3">
              <button
                onClick={() => setConfirmModalOpen(true)}
                className="w-full py-5 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition flex items-center justify-center space-x-3"
              >
                <Camera className="w-6 h-6 stroke-[2.5]" />
                <span className="tracking-wide">AMBIL FOTO & CHECK-IN</span>
              </button>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-200/90 flex items-start space-x-2">
                <Shirt className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Standar Grooming:</strong> Pastikan sudah rapi / grooming lengkap sebelum mengambil foto check-in.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Shift details footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="flex items-center space-x-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Jadwal: <strong>{currentShiftName} ({shiftStart} - {shiftEnd})</strong></span>
          </span>
          <span className="text-emerald-400 font-medium">Toleransi Grace Period: 10 Menit</span>
        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION MODAL: "Apakah anda masuk di jam sekian?"
         ========================================================================= */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-14 h-14 rounded-full bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/30 mb-3">
              <Clock className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white">Konfirmasi Jadwal Shift</h3>

            <p className="text-sm text-slate-300 mt-2 font-medium">
              Apakah Anda masuk di jam:
            </p>

            {/* Selected Shift Highlight Box */}
            <div className="my-3.5 p-4 bg-slate-950 rounded-2xl border-2 border-cyan-500/40 text-center">
              <span className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider block">
                {selectedShift?.name || 'Shift Standar'}
              </span>
              <span className="text-2xl font-black text-white font-mono block mt-1">
                {selectedShift?.start_time || '13:00'} - {selectedShift?.end_time || '22:00'} WITA
              </span>

              {selectedShift?.autoDetected ? (
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  ✓ Otomatis Terdeteksi (±30 Menit dari Jam Shift)
                </span>
              ) : (
                <span className="inline-block mt-2 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  ⚠️ Di Luar Toleransi 30 Menit (Pastikan Shift Sesuai)
                </span>
              )}
            </div>

            {/* Selector if multiple shifts exist in division */}
            {availableSchedules.length > 1 && (
              <div className="mb-4 text-left">
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  Bukan shift ini? Pilih shift Anda:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSchedules.map((s, idx) => {
                    const isSelected = selectedShift?.start_time === s.start_time;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedShift(s)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="block text-[10px] text-slate-400">{s.name}</span>
                        <span className="block font-mono text-[11px] mt-0.5">{s.start_time} - {s.end_time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirmation Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmModalOpen(false);
                  onTriggerCamera('checkin', selectedShift);
                }}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Ya, Benar (Lanjut Selfie)</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
