import React from 'react';
import { Lock, Delete, AlertCircle, Loader2, Trophy } from 'lucide-react';

export default function KioskLoginScreen({
  pin,
  setPin,
  onLogin,
  onOpenAdminAuth,
  onOpenLeaderboard,
  loading,
  error
}) {
  // Numpad click
  const handleNumClick = (val) => {
    if (loading) return;
    if (pin.length < 6) {
      const nextPin = pin + val;
      setPin(nextPin);
      // Auto submit if 4 digits
      if (nextPin.length === 4) {
        onLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
  };

  return (
    <div className="max-w-md mx-auto pt-3 pb-8">
      {/* Header Banner - High Contrast White & Blue Layout */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-3 border-2 border-blue-400">
          <Lock className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Staff Portal by Ryan Gerrit
        </h2>
        <p className="text-sm sm:text-base text-blue-700 font-extrabold mt-1">
          for : Lucky Cat and JPE Karaoke
        </p>
        <p className="text-xs text-slate-900 font-extrabold mt-1">
          One Gate System: Absensi Kerja &amp; Checklist QR Toilet
        </p>
      </div>

      {/* Luxurious Real-time Leaderboard Teaser Banner */}
      {onOpenLeaderboard && (
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full mb-4 p-3.5 rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-2 border-amber-300 transition-all active:scale-[0.98] flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-900 block leading-tight">
                🏆 Papan Peringkat Prestasi
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-950 leading-tight block">
                Leaderboard Staf Terajin (Bonus Bulanan) →
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black shrink-0 hidden sm:inline shadow-sm">
            Live Top 5
          </span>
        </button>
      )}

      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-300/40 space-y-6">
        {/* PIN Prompt & Visual Indicator Dots */}
        <div className="text-center space-y-3">
          <label className="text-xs font-black text-slate-950 uppercase tracking-wider block">
            Masukkan PIN Staf (4 Digit)
          </label>

          {/* 4 PIN Dots */}
          <div className="flex justify-center items-center space-x-3.5 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                    isFilled
                      ? 'bg-blue-600 border-blue-700 scale-125 shadow-md shadow-blue-600/50'
                      : 'bg-slate-100 border-slate-400'
                  }`}
                />
              );
            })}
          </div>

          <div className="h-4">
            <span className="text-xs text-slate-900 font-mono font-black tracking-widest">
              {pin ? '●'.repeat(pin.length) : 'Ketik 4 digit PIN Anda di tombol bawah'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 text-rose-900 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-extrabold">{error}</span>
          </div>
        )}

        {/* Numpad 3x4 Grid - High Contrast White Keys with Slate-950 Numbers */}
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => handleNumClick(String(num))}
              className="h-16 rounded-2xl bg-white border-2 border-slate-300 text-2xl font-black text-slate-950 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 active:bg-blue-600 active:text-white active:scale-95 transition flex items-center justify-center shadow-sm focus:outline-none"
            >
              {num}
            </button>
          ))}

          {/* Reset / Clear Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleClear}
            className="h-16 rounded-2xl bg-slate-100 border-2 border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center text-xs font-black uppercase tracking-wider"
          >
            Hapus
          </button>

          {/* Number 0 */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleNumClick('0')}
            className="h-16 rounded-2xl bg-white border-2 border-slate-300 text-2xl font-black text-slate-950 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 active:bg-blue-600 active:text-white active:scale-95 transition flex items-center justify-center shadow-sm focus:outline-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-slate-100 border-2 border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center"
            title="Hapus Satu Angka"
          >
            <Delete className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Action Button - Royal Blue */}
        <button
          type="button"
          disabled={loading || pin.length < 4}
          onClick={() => onLogin(pin)}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg ${
            pin.length >= 4 && !loading
              ? 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.98]'
              : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Memeriksa PIN Staf...</span>
            </>
          ) : (
            <span>MASUK KE STAFF PORTAL</span>
          )}
        </button>

        {/* Shortcut to Manager / Assistant Manager View Only */}
        {onOpenAdminAuth && (
          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenAdminAuth}
              className="text-xs font-black text-blue-700 hover:text-blue-900 flex items-center justify-center space-x-1.5 mx-auto py-1 px-3 rounded-xl hover:bg-blue-50 transition"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Login Khusus Manajer / Assistant Manager (View Only) →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
