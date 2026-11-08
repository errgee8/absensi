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
      {/* Staff Identity Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900">{staff.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {staff.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>{staff.venue} • {staff.division}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center space-x-1"
          title="Keluar / Ganti Akun"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">Keluar</span>
        </button>
      </div>

      {/* Attendance Status Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        isOnBreak
          ? 'bg-sky-50 border-sky-200 text-sky-900'
          : isCheckedIn
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center space-x-2.5">
          {isOnBreak ? (
            <Coffee className="w-5 h-5 text-sky-600 animate-pulse" />
          ) : isCheckedIn ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600" />
          )}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wide block">
              Status Kehadiran Hari Ini:
            </span>
            <span className="text-sm font-black">
              {isOnBreak
                ? 'Sedang Waktu Istirahat'
                : isCheckedIn
                ? `Sudah Check-In Masuk (${activeShift?.scheduled_start || staff.shift_start || ''} - ${activeShift?.scheduled_end || staff.shift_end || ''})`
                : 'Belum Check-In Masuk'}
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
          isOnBreak
            ? 'bg-sky-600 text-white'
            : isCheckedIn
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-500 text-white'
        }`}>
          {isOnBreak ? 'Istirahat' : isCheckedIn ? 'On Duty' : 'Off Duty'}
        </span>
      </div>

      {/* Two Big Action Portal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Absensi & Waktu Kerja */}
        <button
          type="button"
          onClick={onSelectAttendance}
          className="bg-white rounded-3xl p-5 border-2 border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all text-left flex flex-col justify-between group touch-press"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-4 shadow-md shadow-emerald-500/20 group-hover:scale-110 transition">
              <Camera className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition">
              1. Absensi Kerja
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {isOnBreak
                ? 'Tekan tombol ini untuk menyelesaikan waktu istirahat dan kembali bertugas.'
                : isCheckedIn
                ? 'Ambil waktu istirahat atau lakukan check-out saat jam pulang shift.'
                : 'Ambil foto selfie langsung untuk Check-In masuk dinas hari ini.'}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
            <span>Buka Menu Absensi</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </button>

        {/* Card 2: Scan QR Checklist Toilet */}
        <button
          type="button"
          onClick={onSelectToilet}
          className="bg-white rounded-3xl p-5 border-2 border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all text-left flex flex-col justify-between group touch-press"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center mb-4 shadow-md shadow-indigo-500/20 group-hover:scale-110 transition">
              <QrCode className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition">
              2. Scan QR Toilet
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pembersihan toilet JP &amp; LC. Arahkan kamera ke stiker QR di toilet untuk mengisi checklist berkala.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
            <span>Scan Stiker Toilet</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </button>
      </div>

      <div className="text-center pt-2">
        <p className="text-[11px] text-slate-400">
          Staff Portal • Lucky Cat &amp; JPE Karaoke by Ryan Gerrit
        </p>
      </div>
    </div>
  );
}
