import React, { useState, useEffect } from 'react';
import { Lock, Delete, AlertCircle, Loader2, Trophy, Clock } from 'lucide-react';

export default function KioskLoginScreen({
  pin,
  setPin,
  onLogin,
  onOpenAdminAuth,
  onOpenLeaderboard,
  loading,
  error
}) {
  const [liveTime, setLiveTime] = useState(() => new Date());

  // Real-time live WITA clock ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(liveTime);

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(liveTime);

  // Keyboard navigation for physical numpad / keyboard typing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loading) return;
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          const nextPin = pin + e.key;
          setPin(nextPin);
          if (nextPin.length === 4) {
            onLogin(nextPin);
          }
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setPin('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading, onLogin, setPin]);

  // Numpad click
  const handleNumClick = (val) => {
    if (loading) return;
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      // Auto submit immediately on 4 digits
      if (nextPin.length === 4) {
        onLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
  };

  return (
    <div className="max-w-md mx-auto pt-3 pb-8">
      {/* Header Banner - Elegant Dark Theme */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/25 mb-3 border border-blue-400/30">
          <Lock className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Staff Portal
        </h2>
        <p className="text-sm sm:text-base text-blue-400 font-semibold mt-0.5">
          Lucky Cat &amp; JP Executive Karaoke
        </p>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Sistem Terintegrasi: Absensi Digital &amp; Checklist Toilet
        </p>
      </div>

      {/* Live WITA Digital Clock Banner */}
      <div className="mb-4 flex items-center justify-center">
        <div className="inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-[#141822] text-white shadow-md border border-slate-800">
          <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-emerald-400">
            {timeStr} <span className="text-xs font-semibold text-slate-400">WITA</span>
          </span>
          <span className="text-[11px] font-medium text-slate-400 border-l border-slate-700/80 pl-2.5 hidden sm:inline">
            {dateStr}
          </span>
        </div>
      </div>

      {/* Luxurious Real-time Leaderboard Teaser Banner */}
      {onOpenLeaderboard && (
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full mb-4 p-3.5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/25 text-amber-200 border border-amber-400/30 transition-all active:scale-[0.98] flex items-center justify-between group shadow-lg shadow-black/20"
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-[#10141d] text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30 shadow-inner">
              <Trophy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300/90 block leading-tight">
                🏆 Papan Peringkat Prestasi
              </span>
              <span className="text-xs sm:text-sm font-bold text-white leading-tight block">
                Leaderboard Staf Terajin (Bonus Bulanan) →
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#10141d] text-amber-300 text-[10px] font-bold shrink-0 hidden sm:inline border border-amber-400/30">
            Live Top 5
          </span>
        </button>
      )}

      <div className="bg-[#161b24] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40 space-y-6">
        {/* PIN Prompt & Visual Indicator Dots */}
        <div className="text-center space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Masukkan PIN Staf (4 Digit)
          </label>

          {/* 4 PIN Dots */}
          <div className="flex justify-center items-center space-x-3.5 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                    isFilled
                      ? 'bg-blue-500 border-blue-400 scale-125 shadow-md shadow-blue-500/50'
                      : 'bg-[#0f131a] border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          <div className="h-4">
            <span className="text-xs text-slate-400 font-mono font-medium tracking-widest">
              {pin ? '●'.repeat(pin.length) : 'Ketik 4 digit PIN Anda di tombol bawah'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-3 text-rose-200 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Numpad 3x4 Grid - Dark Grey Keys with Crisp Numbers */}
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => handleNumClick(String(num))}
              className="h-16 rounded-2xl bg-[#1e2533] border border-slate-700/70 text-2xl font-bold text-white hover:bg-blue-600 hover:border-blue-500 active:bg-blue-700 active:scale-95 transition flex items-center justify-center shadow-xs focus:outline-none"
            >
              {num}
            </button>
          ))}

          {/* Reset / Clear Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleClear}
            className="h-16 rounded-2xl bg-[#12161f] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition flex items-center justify-center text-xs font-bold uppercase tracking-wider"
          >
            Hapus
          </button>

          {/* Number 0 */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleNumClick('0')}
            className="h-16 rounded-2xl bg-[#1e2533] border border-slate-700/70 text-2xl font-bold text-white hover:bg-blue-600 hover:border-blue-500 active:bg-blue-700 active:scale-95 transition flex items-center justify-center shadow-xs focus:outline-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-[#12161f] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition flex items-center justify-center"
            title="Hapus Satu Angka"
          >
            <Delete className="w-6 h-6 stroke-[2]" />
          </button>
        </div>

        {/* Auto-verifying Loading Indicator */}
        {loading && (
          <div className="py-3.5 px-4 rounded-2xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center space-x-2 animate-pulse shadow-md shadow-blue-600/30">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Memverifikasi PIN Staf...</span>
          </div>
        )}
      </div>
    </div>
  );
}
