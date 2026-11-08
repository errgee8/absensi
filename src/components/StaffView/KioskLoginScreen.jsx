import React from 'react';
import { Lock, Delete, RotateCcw, AlertCircle, Loader2, Sparkles, Building2 } from 'lucide-react';

export default function KioskLoginScreen({
  pin,
  setPin,
  onLogin,
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
    <div className="max-w-md mx-auto pt-4 pb-8">
      {/* Header Banner - White & Blue Clean Layout */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-3 border border-blue-400/40">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Staff Portal by Ryan Gerrit
        </h2>
        <p className="text-xs sm:text-sm text-blue-600 font-bold mt-1">
          for : Lucky Cat and JPE Karaoke
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          One Gate System: Absensi Kerja &amp; Checklist QR Toilet
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 space-y-6">
        {/* PIN Prompt & Visual Indicator Dots */}
        <div className="text-center space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
                      ? 'bg-blue-600 border-blue-600 scale-125 shadow-md shadow-blue-500/40'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                />
              );
            })}
          </div>

          <div className="h-4">
            <span className="text-[11px] text-slate-500 font-mono tracking-widest">
              {pin ? '●'.repeat(pin.length) : 'Ketik 4 digit PIN Anda di tombol bawah'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-700 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Numpad 3x4 Grid - Crisp White Keys with Blue Hover */}
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => handleNumClick(String(num))}
              className="h-16 rounded-2xl bg-slate-50 border border-slate-200 text-2xl font-black text-slate-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:bg-blue-600 active:text-white active:scale-95 transition flex items-center justify-center shadow-sm focus:outline-none"
            >
              {num}
            </button>
          ))}

          {/* Reset / Clear Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleClear}
            className="h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center text-xs font-bold uppercase tracking-wider"
          >
            Hapus
          </button>

          {/* Number 0 */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleNumClick('0')}
            className="h-16 rounded-2xl bg-slate-50 border border-slate-200 text-2xl font-black text-slate-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:bg-blue-600 active:text-white active:scale-95 transition flex items-center justify-center shadow-sm focus:outline-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center"
            title="Hapus Satu Angka"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Action Button - Royal Blue */}
        <button
          type="button"
          disabled={loading || pin.length < 4}
          onClick={() => onLogin(pin)}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg ${
            pin.length >= 4 && !loading
              ? 'bg-blue-600 text-white shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
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
      </div>
    </div>
  );
}
