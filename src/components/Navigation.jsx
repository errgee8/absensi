import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Lock, LogOut } from 'lucide-react';
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
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Venue Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">
                  STAFF PORTAL
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block font-medium">Lucky Cat &amp; JP Executive Karaoke</p>
            </div>
          </div>

          {/* Right Controls: Realtime Clock, Wi-Fi Badge & Secure Access */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* WITA Live Clock */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-200 text-xs font-mono font-bold text-blue-700 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{timeStr || 'Loading...'} WITA</span>
            </div>

            {/* In Manager View: Show Switcher to Return to Kiosk or Lock */}
            {currentView === 'manager' ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('staff')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition"
                >
                  Kembali ke Staff Kiosk
                </button>
                <button
                  onClick={onAdminLogout}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                  title="Kunci & Keluar Dashboard Manager"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* In Staff View: Discreet lock trigger for manager */
              <button
                type="button"
                onClick={onOpenAdminAuth}
                className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition"
                title="Akses Khusus Manager"
                aria-label="Akses Khusus Manager"
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
