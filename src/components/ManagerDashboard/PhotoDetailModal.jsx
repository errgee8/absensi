import React from 'react';
import { X, MapPin, Wifi, ShieldAlert, CheckCircle, Calendar, Clock, User, Coffee } from 'lucide-react';
import { formatWitaDateTime, formatDuration } from '../../utils/time';

export default function PhotoDetailModal({ shift, type = 'in', onClose }) {
  if (!shift) return null;

  const isCheckin = type === 'in';
  const isBreak = type === 'break';
  const isCheckout = type === 'out';

  let photo = shift.checkin_photo;
  let title = 'Pre-Shift Check-In Verification';
  let time = shift.checkin_time;
  let statusBadge = 'Check-In';

  if (isBreak) {
    photo = shift.break_end_photo || shift.break_start_photo;
    title = 'Staff 1-Hour Break Verification';
    time = shift.break_end_time || shift.break_start_time;
    statusBadge = `Break (${shift.break_duration_minutes || 0}m)`;
  } else if (isCheckout) {
    photo = shift.checkout_photo || shift.checkin_photo;
    title = 'Post-Shift Check-Out Verification';
    time = shift.checkout_time || shift.checkin_time;
    statusBadge = 'Check-Out';
  }

  const lat = isCheckout ? shift.checkout_lat : shift.checkin_lat;
  const lng = isCheckout ? shift.checkout_lng : shift.checkin_lng;
  const dist = isCheckout ? shift.checkout_distance : shift.checkin_distance;
  const ip = isCheckout ? shift.checkout_ip : shift.checkin_ip;
  const wifiPass = isCheckout ? shift.checkout_wifi_pass : shift.checkin_wifi_pass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isBreak
                    ? 'bg-sky-500/20 text-sky-400'
                    : isCheckin
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}
              >
                {statusBadge}
              </span>
              <span className="text-xs text-slate-400 font-mono">Shift #{shift.id}</span>
              <span className="text-xs text-cyan-400 font-bold">
                {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {shift.staff_name} • <span className="text-slate-400">{shift.staff_division || shift.staff_role}</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Watermarked Photo Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
            {photo ? (
              <img
                src={photo}
                alt="Audit Biometric Selfie"
                className="w-full h-auto max-h-96 object-contain mx-auto"
              />
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                No photo capture recorded for this event.
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Timestamp (WITA)
              </span>
              <span className="font-mono font-semibold text-emerald-400 text-sm">
                {formatWitaDateTime(time)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Outlet Wi-Fi Subnet Match
              </span>
              <div className="flex items-center space-x-2">
                <span className={`font-bold ${wifiPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {wifiPass ? 'VERIFIED (PASS)' : 'FAILED (OFF-NETWORK)'}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">[{ip || 'N/A'}]</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Live GPS Pin
              </span>
              <span className="font-mono text-slate-200">
                {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Venue Distance
              </span>
              <span className={`font-bold ${dist > 150 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {dist != null ? `${dist} meters from venue geofence` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Break Details if break was taken */}
          {shift.break_duration_minutes != null && (
            <div className="bg-sky-950/30 border border-sky-500/30 rounded-2xl p-4 text-xs space-y-1">
              <span className="text-sky-300 font-bold block mb-1">
                LuckyCat 1-Hour Break Log:
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                <div>Start: {formatWitaDateTime(shift.break_start_time)}</div>
                <div>End: {formatWitaDateTime(shift.break_end_time)}</div>
                <div>Duration: <strong>{shift.break_duration_minutes} minutes</strong></div>
                <div>Limit: Max 60 minutes</div>
              </div>
            </div>
          )}

          {/* Anomaly Flags Alert Box */}
          {shift.flags && shift.flags.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs mb-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Automated Operational Flags Triggered</span>
              </div>
              <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-1">
                {shift.flags.map((flag, idx) => (
                  <li key={idx} className="font-mono text-[11px]">
                    <strong>{flag}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
