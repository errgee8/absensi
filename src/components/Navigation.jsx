import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Lock, LogOut, Eye, ShieldAlert } from 'lucide-react';
import { formatWitaTimeOnly } from '../utils/time';

export default function Navigation({
  currentView,
  setView,
  networkStatus,
  adminAuth,
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
    <header className="no-print sticky top-0 z-40 bg-[#141822]/95 backdrop-blur-md border-b border-slate-800 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Venue Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  STAFF PORTAL
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-500/30 rounded-full">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block font-medium">Lucky Cat &amp; JP Executive Karaoke</p>
            </div>
          </div>

          {/* Right Controls: Realtime Clock, Wi-Fi Badge & Secure Access */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* WITA Live Clock */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1b212d] rounded-xl border border-slate-700/80 text-xs font-mono font-bold text-blue-300 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
              <span>{timeStr || 'Memuat...'}</span>
            </div>

            {/* In Manager View: Show Switcher to Return to Kiosk or Lock */}
            {currentView === 'manager' ? (
              <div className="flex items-center space-x-2">
                {adminAuth?.role === 'VIEW_ONLY' ? (
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>View Only ({adminAuth?.staffName || 'Asst. Mgr'})</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold">
                    <span>👑 Manager Full</span>
                  </span>
                )}
                <button
                  onClick={() => setView('staff')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition active:scale-95"
                >
                  Kembali ke Staff Kiosk
                </button>
                <button
                  onClick={onAdminLogout}
                  className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition active:scale-95"
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
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-slate-300 hover:text-white bg-[#1b212d] hover:bg-[#232b3b] rounded-xl border border-slate-700/80 transition shadow-xs active:scale-95"
                title="Akses Khusus Manager & Assistant Manager (View Only)"
                aria-label="Akses Khusus Manager & Assistant Manager"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
                <span className="text-xs font-bold">Login Manager</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
