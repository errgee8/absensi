import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, Clock, ArrowLeft, Shirt, AlertCircle, Coffee, Play, Check, Sparkles } from 'lucide-react';
import { formatWitaTimeOnly, formatTimerSeconds } from '../../utils/time';

export default function KioskActionScreen({
  staff,
  activeShift,
  onTriggerCamera,
  onLogout,
  onBackToPortal,
  onOpenEarlyDeparture
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

  const isManagement = staff?.division === 'Management' || (selectedShift?.start_time === '00:00' && selectedShift?.end_time === '23:59');

  // Break policy rules
  const breakCutoffTime = staff?.breakCutoffTime || staff?.max_break_end || '20:00';
  const breakStartTime = staff?.break_start_time || null;
  const normVenue = (staff?.venue || '').replace(/\s+/g, '').toLowerCase();
  const shiftAllowsBreak = !isManagement && (staff?.allows_break !== 0 || normVenue === 'luckycat' || activeShift?.allows_break !== 0);
  const canTakeBreak = !isManagement && isCheckedIn && !isOnBreak && !hasTakenBreak && shiftAllowsBreak;

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
      {/* Top Bar with Navigation Buttons */}
      <div className="flex items-center justify-between mb-4">
        {onBackToPortal ? (
          <button
            onClick={onBackToPortal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-slate-300 text-xs font-black text-slate-900 hover:text-blue-700 hover:border-blue-500 shadow-sm transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Kembali ke Menu Utama</span>
          </button>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-slate-300 text-xs font-black text-slate-900 hover:text-slate-950 shadow-sm transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Batal / Keluar</span>
          </button>
        )}

        <span className="text-xs font-black text-slate-800 bg-slate-200 border border-slate-300 px-3 py-1 rounded-xl">
          {staff.venue} • {staff.division}
        </span>
      </div>

      {/* Main Crisp White Action Card - High Contrast */}
      <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-300/40 relative overflow-hidden">
        {/* Header: Halo, [Nama]! Status */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2 ${
                isOnBreak
                  ? 'bg-sky-100 text-sky-950 border-sky-400 animate-pulse'
                  : isCheckedIn
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                  : 'bg-amber-100 text-amber-950 border-amber-400'
              }`}
            >
              Status: {isOnBreak ? 'Sedang Istirahat' : isCheckedIn ? 'Sudah Masuk' : 'Belum Masuk'}
            </span>
            <span className="text-xs text-slate-800 font-extrabold">
              {staff.role}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Halo, {staff.name}!
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-blue-950 font-black bg-blue-100 border-2 border-blue-300 px-3 py-1 rounded-xl flex items-center space-x-1.5 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span>{isManagement ? 'Shift Fleksibel (Management)' : `${currentShiftName} (${shiftStart} - ${shiftEnd} WITA)`}</span>
            </span>
          </div>
        </div>

        {/* Break in Progress Box */}
        {isOnBreak && (
          <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-4 mb-5 text-center">
            <span className="text-xs text-sky-950 uppercase font-black tracking-wider block mb-1">
              Waktu Istirahat Berjalan (Maksimal 1 Jam)
            </span>
            <div className="text-4xl font-black font-mono text-sky-700 my-1">
              {formatTimerSeconds(breakSeconds)}
            </div>
            <p className="text-xs text-sky-950 font-bold mt-1">
              Batas istirahat harus selesai sebelum: <strong>{breakCutoffTime} WITA</strong> (2 jam sebelum shift usai)
            </p>
          </div>
        )}

        {/* Active Shift Details Box if already checked in and not on break */}
        {isCheckedIn && !isOnBreak && (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between text-xs text-slate-900 mb-2 font-black">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-slate-700 stroke-[2.2]" />
                <span>Masuk Pukul:</span>
              </span>
              <span className="font-mono font-black text-slate-950 text-sm">
                {formatWitaTimeOnly(activeShift.checkin_time)}
              </span>
            </div>

            <div className="text-center py-2.5 bg-white rounded-xl border border-slate-300 shadow-sm">
              <span className="text-[11px] text-slate-900 uppercase font-black tracking-wider block mb-0.5">
                Durasi Bertugas
              </span>
              <span className="text-3xl font-black font-mono text-blue-700">
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
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition flex items-center justify-center space-x-2.5"
              >
                <Coffee className="w-5 h-5 stroke-[2.5]" />
                <span>AMBIL FOTO & SELESAI ISTIRAHAT</span>
              </button>
              <p className="text-xs text-slate-700 text-center font-bold">
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
                    className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-base rounded-2xl shadow-lg shadow-blue-600/30 active:scale-[0.98] transition flex items-center justify-center space-x-2.5"
                  >
                    <Coffee className="w-5 h-5 stroke-[2.5]" />
                    <span>AMBIL FOTO & MULAI ISTIRAHAT</span>
                  </button>

                  {/* Button 2: Check Out */}
                  <button
                    onClick={() => onTriggerCamera('checkout')}
                    className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black text-base rounded-2xl shadow-lg shadow-rose-600/30 active:scale-[0.98] transition flex items-center justify-center space-x-2.5"
                  >
                    <Camera className="w-5 h-5 stroke-[2.5]" />
                    <span>AMBIL FOTO & CHECK-OUT</span>
                  </button>

                  <p className="text-xs text-slate-950 text-center font-black">
                    Istirahat hanya diperbolehkan 1x per shift selama maksimal 1 jam (60 menit).
                  </p>
                </div>
              ) : (
                /* ONLY 1 BUTTON: CHECKOUT (Either break already taken or not allowed) */
                <div className="space-y-3">
                  <button
                    onClick={() => onTriggerCamera('checkout')}
                    className="w-full py-5 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-rose-600/35 active:scale-[0.98] transition flex items-center justify-center space-x-3"
                  >
                    <Camera className="w-6 h-6 stroke-[2.5]" />
                    <span className="tracking-wide">AMBIL FOTO & CHECK-OUT</span>
                  </button>

                  {hasTakenBreak ? (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-xs text-emerald-950 font-black flex items-center justify-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 stroke-[2.5]" />
                      <span>Istirahat 1x (maksimal 1 jam) sudah selesai diambil untuk shift ini.</span>
                    </div>
                  ) : !shiftAllowsBreak ? (
                    <div className="p-3 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs text-slate-900 font-black flex items-center justify-center space-x-2">
                      <Coffee className="w-4 h-4 text-slate-700 shrink-0 stroke-[2.5]" />
                      <span>Shift ini diatur tanpa waktu istirahat (No Break Allowed).</span>
                    </div>
                  ) : null}

                  <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-950 font-bold flex items-start space-x-2.5">
                    <Shirt className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Pengingat Selesai Kerja:</strong> Pastikan seragam sudah dilepas dan operan shift selesai.
                    </span>
                  </div>
                </div>
              )}

              {/* Shortcut: Request Early Departure (Sakit Mendadak / Urusan Darurat On Duty) */}
              {onOpenEarlyDeparture && (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onOpenEarlyDeparture}
                    className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 rounded-2xl text-xs font-black text-purple-950 flex items-center justify-center space-x-2 transition shadow-sm active:scale-[0.99]"
                  >
                    <span className="text-base">🏃</span>
                    <span>Izin Pulang Lebih Awal (Sakit Mendadak / On Duty)</span>
                  </button>
                  <p className="text-[10px] text-slate-500 font-bold text-center mt-1">
                    Memerlukan persetujuan Management agar shift ditutup tanpa penalti early checkout.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* STATE 3: HAVEN'T CHECKED IN -> ONLY 1 BUTTON: CHECK IN */
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (isManagement) {
                    onTriggerCamera('checkin', selectedShift);
                  } else {
                    setConfirmModalOpen(true);
                  }
                }}
                className="w-full py-5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-600/35 active:scale-[0.98] transition flex items-center justify-center space-x-3"
              >
                <Camera className="w-6 h-6 stroke-[2.5]" />
                <span className="tracking-wide">AMBIL FOTO & CHECK-IN</span>
              </button>

              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-xs text-emerald-950 font-bold flex items-start space-x-2.5">
                <Shirt className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Standar Grooming:</strong> Pastikan sudah rapi / grooming lengkap sebelum mengambil foto check-in.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Shift details footer */}
        <div className="mt-6 pt-4 border-t-2 border-slate-200 text-xs text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-black">
          <span className="flex items-center space-x-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Jadwal: <strong className="text-slate-950 font-black">{isManagement ? 'Fleksibel Penuh (Management)' : `${currentShiftName} (${shiftStart} - ${shiftEnd})`}</strong></span>
          </span>
          <span className={isManagement ? "text-blue-700 font-black" : "text-emerald-700 font-black"}>
            {isManagement ? "Jam Kerja Fleksibel" : "Toleransi Grace Period: 10 Menit"}
          </span>
        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION MODAL: "Apakah anda masuk di jam sekian?"
         ========================================================================= */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center border-2 border-blue-300 mb-3">
              <Clock className="w-7 h-7 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-black text-slate-950">Konfirmasi Jadwal Shift</h3>

            <p className="text-xs sm:text-sm text-slate-800 mt-1 font-bold">
              Apakah Anda masuk di jam:
            </p>

            {/* Selected Shift Highlight Box */}
            <div className="my-3.5 p-4 bg-blue-50/60 rounded-2xl border-2 border-blue-400 text-center">
              <span className="text-xs uppercase font-black text-blue-700 tracking-wider block">
                {selectedShift?.name || 'Shift Standar'}
              </span>
              <span className="text-2xl font-black text-slate-950 font-mono block mt-1">
                {selectedShift?.start_time || '13:00'} - {selectedShift?.end_time || '22:00'} WITA
              </span>

              {selectedShift?.autoDetected ? (
                <span className="inline-block mt-2 text-[11px] font-black text-emerald-950 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                  ✓ Otomatis Terdeteksi (±30 Menit dari Jam Shift)
                </span>
              ) : (
                <span className="inline-block mt-2 text-[11px] font-black text-amber-950 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  ⚠️ Di Luar Toleransi 30 Menit (Pastikan Shift Sesuai)
                </span>
              )}
            </div>

            {/* Selector if multiple shifts exist in division */}
            {availableSchedules.length > 1 && (
              <div className="mb-4 text-left">
                <label className="text-xs text-slate-900 block mb-1.5 font-black">
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
                        className={`p-2.5 rounded-xl text-xs font-black border-2 transition text-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-[11px] opacity-90">{s.name}</span>
                        <span className="block font-mono text-xs mt-0.5">{s.start_time} - {s.end_time}</span>
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
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-600/30 active:scale-95 flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Ya, Benar (Lanjut Selfie)</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="w-full py-2.5 text-xs text-slate-700 hover:text-slate-950 transition font-black"
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
