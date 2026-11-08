import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Lock, LogOut, Eye, ShieldAlert, Trophy } from 'lucide-react';
import { formatWitaTimeOnly } from '../utils/time';

export default function Navigation({
  currentView,
  setView,
  networkStatus,
  adminAuth,
  onOpenAdminAuth,
  onAdminLogout,
  onOpenLeaderboard
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(formatWitaTimeOnly(new Date().toISOString()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Venue Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-950">
                  STAFF PORTAL
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300 rounded-full">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-800 hidden sm:block font-bold">Lucky Cat &amp; JP Executive Karaoke</p>
            </div>
          </div>

          {/* Right Controls: Realtime Clock, Wi-Fi Badge & Secure Access */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* WITA Live Clock */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-100 rounded-xl border-2 border-blue-300 text-xs font-mono font-black text-blue-950 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
              <span>{timeStr || 'Memuat...'}</span>
            </div>

            {/* Realtime Monthly Leaderboard Trigger */}
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 rounded-xl font-black text-xs shadow-md shadow-amber-500/25 border-2 border-amber-300 transition active:scale-95 shrink-0"
                title="Buka Leaderboard Staf Terajin (Bonus Bulanan)"
              >
                <Trophy className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                <span className="hidden md:inline">Leaderboard</span>
              </button>
            )}

            {/* In Manager View: Show Switcher to Return to Kiosk or Lock */}
            {currentView === 'manager' ? (
              <div className="flex items-center space-x-2">
                {adminAuth?.role === 'VIEW_ONLY' ? (
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 border border-blue-300 text-xs font-black">
                    <Eye className="w-3.5 h-3.5 text-blue-700" />
                    <span>View Only ({adminAuth?.staffName || 'Asst. Mgr'})</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 text-xs font-black">
                    <span>👑 Manager Full</span>
                  </span>
                )}
                <button
                  onClick={() => setView('staff')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black text-white shadow-sm transition"
                >
                  Kembali ke Staff Kiosk
                </button>
                <button
                  onClick={onAdminLogout}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 transition"
                  title="Kunci & Keluar Dashboard Manager"
                >
                  <LogOut className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              /* In Staff View: Visible lock trigger for manager and assistant manager */
              <button
                type="button"
                onClick={onOpenAdminAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-800 hover:text-blue-700 bg-white hover:bg-slate-100 rounded-xl border-2 border-slate-300 transition shadow-sm"
                title="Akses Khusus Manager & Assistant Manager (View Only)"
                aria-label="Akses Khusus Manager & Assistant Manager"
              >
                <Lock className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                <span className="text-xs font-black">Login Manager</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
