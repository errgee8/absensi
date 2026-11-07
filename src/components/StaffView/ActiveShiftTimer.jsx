import React, { useState, useEffect } from 'react';
import { Clock, Play, LogOut, CheckCircle, ShieldCheck, MapPin } from 'lucide-react';
import { formatWitaTimeOnly, formatTimerSeconds, formatWitaDateTime } from '../../utils/time';

export default function ActiveShiftTimer({ activeShift, onInitiateCheckout }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeShift?.checkin_time) return;

    const calculateElapsed = () => {
      const startTime = new Date(activeShift.checkin_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  if (!activeShift) return null;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 mb-6 shadow-xl relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Shift In Progress
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Shift ID #{activeShift.id}
        </span>
      </div>

      {/* Staff profile summary */}
      <div className="flex items-center space-x-3.5 mb-5">
        {activeShift.checkin_photo ? (
          <img
            src={activeShift.checkin_photo}
            alt={activeShift.staff_name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold text-lg flex items-center justify-center border border-emerald-500/30 shrink-0">
            {activeShift.staff_name?.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="text-lg font-extrabold text-white leading-tight">
            {activeShift.staff_name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeShift.role} • <span className="text-emerald-400">{activeShift.department}</span>
          </p>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Checked in at {formatWitaTimeOnly(activeShift.checkin_time)}</span>
          </div>
        </div>
      </div>

      {/* Live Running Counter Box */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center mb-5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Active Shift Elapsed Duration
        </span>
        <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
          {formatTimerSeconds(elapsedSeconds)}
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-center space-x-2">
          <span>Target Standard: {activeShift.standard_hours || 8} hours</span>
          <span>•</span>
          <span className="text-emerald-400">Active Tracking</span>
        </div>
      </div>

      {/* Checkin location & network metadata */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-5">
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-slate-400 block">Check-in Distance</span>
            <span className="font-semibold text-slate-200">
              {activeShift.checkin_distance != null ? `${activeShift.checkin_distance}m from pin` : 'Verified'}
            </span>
          </div>
        </div>
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-slate-400 block">Wi-Fi Gatekeeper</span>
            <span className={`font-semibold ${activeShift.checkin_wifi_pass ? 'text-emerald-400' : 'text-amber-400'}`}>
              {activeShift.checkin_wifi_pass ? 'Pass (Subnet OK)' : 'Off-Network'}
            </span>
          </div>
        </div>
      </div>

      {/* Checkout Action Button */}
      <button
        onClick={onInitiateCheckout}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center space-x-2 transition active:scale-[0.98]"
      >
        <LogOut className="w-4 h-4" />
        <span>Proceed to Post-Shift Check-Out</span>
      </button>
    </div>
  );
}
