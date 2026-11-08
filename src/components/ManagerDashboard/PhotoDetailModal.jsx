import React, { useState } from 'react';
import { X, MapPin, Wifi, ShieldAlert, CheckCircle, Calendar, Clock, User, Coffee, LogIn, LogOut, Camera } from 'lucide-react';
import { formatWitaDateTime, formatDuration } from '../../utils/time';

export default function PhotoDetailModal({ shift, type = 'in', onClose }) {
  if (!shift) return null;

  const [activeTab, setActiveTab] = useState(type || 'in'); // 'in' | 'break' | 'out'

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
    photo = shift.break_end_photo || shift.break_start_photo;
    title = 'Verifikasi Foto Selesai Istirahat';
    time = shift.break_end_time || shift.break_start_time;
    statusBadge = `Istirahat (${shift.break_duration_minutes || 0}m)`;
  } else if (isCheckout) {
    photo = shift.checkout_photo; // Strictly checkout photo, never false fallback to checkin!
    title = 'Verifikasi Foto Check-Out Pulang';
    time = shift.checkout_time;
    statusBadge = 'Check-Out Pulang';
  }

  const lat = isCheckout ? shift.checkout_lat : shift.checkin_lat;
  const lng = isCheckout ? shift.checkout_lng : shift.checkin_lng;
  const dist = isCheckout ? shift.checkout_distance : shift.checkin_distance;
  const ip = isCheckout ? shift.checkout_ip : shift.checkin_ip;
  const wifiPass = isCheckout ? shift.checkout_wifi_pass : shift.checkin_wifi_pass;

  const hasCheckin = Boolean(shift.checkin_photo);
  const hasBreak = Boolean(shift.break_end_photo || shift.break_start_photo);
  const hasCheckout = Boolean(shift.checkout_photo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isBreak
                    ? 'bg-sky-100 text-sky-950 border-sky-300'
                    : isCheckin
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-indigo-100 text-indigo-950 border-indigo-300'
                }`}
              >
                {statusBadge}
              </span>
              <span className="text-xs text-slate-700 font-mono font-bold">Shift #{shift.id}</span>
              <span className="text-xs text-blue-900 font-black">
                {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-950 mt-1">
              {shift.staff_name} • <span className="text-slate-700 font-bold">{shift.staff_division || shift.staff_role}</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition border border-slate-300"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Switcher: Foto Masuk vs Foto Istirahat vs Foto Pulang */}
        <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('in')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'in'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>1. Foto Masuk {hasCheckin ? '✓' : '(Kosong)'}</span>
          </button>

          {(hasBreak || shift.break_start_time) && (
            <button
              type="button"
              onClick={() => setActiveTab('break')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition ${
                activeTab === 'break'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>2. Foto Istirahat {hasBreak ? '✓' : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('out')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'out'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{hasBreak ? '3.' : '2.'} Foto Pulang (Check-Out) {hasCheckout ? '✓' : '(Belum Ada)'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Watermarked Photo Preview */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-950 shadow-inner">
            {photo ? (
              <img
                src={photo}
                alt="Audit Biometric Selfie"
                className="w-full h-auto max-h-96 object-contain mx-auto"
              />
            ) : (
              <div className="p-12 text-center text-slate-300 text-xs font-bold space-y-2">
                <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-black text-white">
                  {isCheckout ? 'Belum Ada Foto Check-Out Pulang' : isBreak ? 'Belum Ada Foto Istirahat' : 'Tidak Ada Foto Masuk'}
                </p>
                <p className="text-slate-400 text-xs">
                  {isCheckout
                    ? 'Karyawan masih aktif bertugas (On Duty) atau belum mengunggah foto selfie saat pulang.'
                    : 'Tidak ada rekaman foto tersimpan untuk aktivitas ini.'}
                </p>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Waktu Rekam (WITA)
              </span>
              <span className="font-mono font-black text-slate-950 text-sm">
                {time ? formatWitaDateTime(time) : 'Belum tercatat'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Koneksi Wi-Fi Outlet
              </span>
              <div className="flex items-center space-x-2">
                <span className={`font-black ${wifiPass ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {wifiPass ? 'TERVERIFIKASI (PASS)' : (ip ? 'OFF-NETWORK' : 'N/A')}
                </span>
                <span className="text-slate-700 font-mono text-[11px] font-bold">[{ip || 'N/A'}]</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Koordinat GPS Live
              </span>
              <span className="font-mono text-slate-950 font-bold">
                {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
              <span className="text-[10px] text-slate-700 uppercase font-black block mb-1">
                Jarak dari Geofence Outlet
              </span>
              <span className={`font-black ${dist > 150 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {dist != null ? `${dist} meter dari titik outlet` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Break Details if break was taken */}
          {shift.break_duration_minutes != null && (
            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-4 text-xs space-y-1 text-sky-950">
              <span className="text-sky-950 font-black block mb-1">
                Log Istirahat 1 Jam LuckyCat:
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-900 font-mono text-xs font-bold">
                <div>Mulai: {formatWitaDateTime(shift.break_start_time)}</div>
                <div>Selesai: {formatWitaDateTime(shift.break_end_time)}</div>
                <div>Durasi: <strong className="text-slate-950 font-black">{shift.break_duration_minutes} menit</strong></div>
                <div>Batas Maksimal: 60 menit</div>
              </div>
            </div>
          )}

          {/* Anomaly Flags Alert Box */}
          {shift.flags && shift.flags.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-xs text-amber-950">
              <div className="flex items-center space-x-2 text-amber-950 font-black text-xs mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                <span>Anomali Operasional Terdeteksi</span>
              </div>
              <ul className="text-xs text-amber-950 list-disc list-inside space-y-1 font-bold">
                {shift.flags.map((flag, idx) => (
                  <li key={idx} className="font-mono text-xs">
                    <strong>{flag}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-2 border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 transition"
          >
            Tutup Pemeriksaan
          </button>
        </div>
      </div>
    </div>
  );
}
