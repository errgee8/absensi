import React from 'react';
import { Camera, Sparkles, QrCode, LogOut, CheckCircle, Clock, Building2, User, Coffee, ArrowRight, ShieldCheck } from 'lucide-react';

export default function KioskPortalScreen({
  staff,
  activeShift,
  onSelectAttendance,
  onSelectToilet,
  onLogout
}) {
  const isCheckedIn = Boolean(activeShift);
  const isOnBreak = activeShift?.break_status === 'ON_BREAK';

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in py-2">
      {/* Staff Identity Header Card - High Contrast */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-600/30">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-slate-950 tracking-tight">{staff.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-300">
                {staff.role}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-bold flex items-center space-x-1.5 mt-0.5">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{staff.venue} • {staff.division}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition flex items-center space-x-1.5 shadow-sm"
          title="Keluar / Ganti Akun"
        >
          <LogOut className="w-4 h-4 stroke-[2.2]" />
          <span className="text-xs font-black hidden sm:inline">Keluar</span>
        </button>
      </div>

      {/* Attendance Status Banner - High Contrast Background & Borders */}
      <div className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-sm ${
        isOnBreak
          ? 'bg-sky-50 border-sky-300 text-sky-950'
          : isCheckedIn
          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
          : 'bg-amber-50 border-amber-300 text-amber-950'
      }`}>
        <div className="flex items-center space-x-3">
          {isOnBreak ? (
            <Coffee className="w-6 h-6 text-sky-700 animate-pulse shrink-0" />
          ) : isCheckedIn ? (
            <CheckCircle className="w-6 h-6 text-emerald-700 shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-amber-700 shrink-0" />
          )}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider block text-slate-950">
              Status Kehadiran Hari Ini:
            </span>
            <span className="text-sm sm:text-base font-black">
              {isOnBreak
                ? 'Sedang Waktu Istirahat'
                : isCheckedIn
                ? `Sudah Check-In Masuk (${activeShift?.scheduled_start || staff.shift_start || ''} - ${activeShift?.scheduled_end || staff.shift_end || ''})`
                : 'Belum Check-In Masuk'}
            </span>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase shadow-sm ${
          isOnBreak
            ? 'bg-sky-700 text-white'
            : isCheckedIn
            ? 'bg-emerald-700 text-white'
            : 'bg-amber-600 text-white'
        }`}>
          {isOnBreak ? 'Istirahat' : isCheckedIn ? 'On Duty' : 'Off Duty'}
        </span>
      </div>

      {/* Two Big Action Portal Cards - Clear Borders, High Contrast Text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Absensi & Waktu Kerja */}
        <button
          type="button"
          onClick={onSelectAttendance}
          className="bg-white rounded-3xl p-5 border-2 border-slate-300 hover:border-blue-600 shadow-md hover:shadow-xl transition-all text-left flex flex-col justify-between group touch-press"
        >
          <div>
            <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center mb-4 shadow-md shadow-emerald-600/30 group-hover:scale-105 transition">
              <Camera className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-slate-950 group-hover:text-blue-700 transition">
              1. Absensi Kerja
            </h3>
            <p className="text-xs text-slate-700 font-semibold mt-1.5 leading-relaxed">
              {isOnBreak
                ? 'Tekan tombol ini untuk menyelesaikan waktu istirahat dan kembali bertugas.'
                : isCheckedIn
                ? 'Ambil waktu istirahat atau lakukan check-out saat jam pulang shift.'
                : 'Ambil foto selfie langsung untuk Check-In masuk dinas hari ini.'}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs font-black text-blue-700">
            <span>Buka Menu Absensi</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition stroke-[2.5]" />
          </div>
        </button>

        {/* Card 2: Scan QR Checklist Toilet */}
        <button
          type="button"
          onClick={onSelectToilet}
          className="bg-white rounded-3xl p-5 border-2 border-slate-300 hover:border-indigo-600 shadow-md hover:shadow-xl transition-all text-left flex flex-col justify-between group touch-press"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center mb-4 shadow-md shadow-indigo-600/30 group-hover:scale-105 transition">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-slate-950 group-hover:text-indigo-700 transition">
              2. Scan QR Toilet
            </h3>
            <p className="text-xs text-slate-700 font-semibold mt-1.5 leading-relaxed">
              Pembersihan toilet JP &amp; LC. Arahkan kamera ke stiker QR di toilet untuk mengisi checklist berkala.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs font-black text-indigo-700">
            <span>Scan Stiker Toilet</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition stroke-[2.5]" />
          </div>
        </button>
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-950 font-black">
          Staff Portal • Lucky Cat &amp; JPE Karaoke by Ryan Gerrit
        </p>
      </div>
    </div>
  );
}
