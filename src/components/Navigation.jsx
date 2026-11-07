import React, { useState, useEffect } from 'react';
import { ShieldCheck, Wifi, WifiOff, Clock, Lock, LogOut } from 'lucide-react';
import { formatWitaTimeOnly } from '../utils/time';

export default function Navigation({
  currentView,
  setView,
  networkStatus,
  onOpenAdminAuth,
  onAdminLogout
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
    <header className="no-print sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Venue Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  JP KARAOKE & LUCKYCAT
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  PWA Active
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Staff Attendance & Shift Intelligence</p>
            </div>
          </div>

          {/* Right Controls: Realtime Clock, Wi-Fi Badge & Secure Access */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* WITA Live Clock */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs font-mono text-emerald-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeStr || 'Loading...'}</span>
            </div>

            {/* Wi-Fi Gatekeeper Pill */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                networkStatus?.isMatch
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
              }`}
              title={`Client IP: ${networkStatus?.clientIp || 'Unknown'}`}
            >
              {networkStatus?.isMatch ? (
                <>
                  <Wifi className="w-3.5 h-3.5 animate-pulse" />
                  <span className="hidden sm:inline">Outlet Wi-Fi</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Off-Network</span>
                </>
              )}
            </div>

            {/* In Manager View: Show Switcher to Return to Kiosk or Lock */}
            {currentView === 'manager' ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('staff')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                >
                  Return to Kiosk
                </button>
                <button
                  onClick={onAdminLogout}
                  className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50 transition"
                  title="Lock & Exit Manager Dashboard"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* In Staff View: DO NOT display accessible manager button! Only a discreet lock trigger for manager */
              <button
                type="button"
                onClick={onOpenAdminAuth}
                className="p-2 text-slate-500 hover:text-slate-300 rounded-lg transition opacity-60 hover:opacity-100"
                title="Manager Access"
                aria-label="Manager Access"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
