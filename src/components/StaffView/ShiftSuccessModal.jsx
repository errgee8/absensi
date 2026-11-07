import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatWitaTimeOnly, formatDuration } from '../../utils/time';

export default function ShiftSuccessModal({ shift, type = 'checkin', onClose }) {
  useEffect(() => {
    // Fire festive celebratory confetti
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
  }, []);

  if (!shift) return null;

  const isCheckin = type === 'checkin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4 border border-emerald-500/30">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-extrabold text-white">
          {isCheckin ? 'Check-In Confirmed!' : 'Check-Out Completed!'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          {isCheckin
            ? 'Your shift has started. Have a safe and productive shift!'
            : 'Your shift has been logged and finalized. Enjoy your rest!'}
        </p>

        {/* Shift Details Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2.5 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Staff:</span>
            <span className="font-bold text-white">{shift.staff_name}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Time (WITA):</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatWitaTimeOnly(isCheckin ? shift.checkin_time : shift.checkout_time)}
            </span>
          </div>

          {!isCheckin && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Shift Duration:</span>
              <span className="font-bold text-white">
                {formatDuration(shift.duration_minutes)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Wi-Fi Status:</span>
            <span className={`font-semibold ${shift.checkin_wifi_pass ? 'text-emerald-400' : 'text-amber-400'}`}>
              {shift.checkin_wifi_pass ? 'Venue Network Verified' : 'Off-Network Flagged'}
            </span>
          </div>

          {shift.flags && shift.flags.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-amber-400 font-bold block mb-1">
                Audit Flags Logged:
              </span>
              <div className="flex flex-wrap gap-1">
                {shift.flags.map((flag, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  >
                    {flag.replace('FLAG_', '')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
        >
          Done & Return
        </button>
      </div>
    </div>
  );
}
