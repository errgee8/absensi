import React from 'react';
import { Lock, Delete, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';

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
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/20 mb-3 border border-emerald-400/30">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Absensi Karyawan</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          JP Karaoke &amp; Lucky Cat
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        {/* PIN Prompt & Visual Indicator Dots */}
        <div className="text-center space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Masukkan PIN Absensi (4 Digit)
          </label>

          {/* 4 PIN Dots */}
          <div className="flex justify-center items-center space-x-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                    isFilled
                      ? 'bg-emerald-400 border-emerald-400 scale-125 shadow-lg shadow-emerald-500/50'
                      : 'bg-slate-950 border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          <div className="h-4">
            <span className="text-[11px] text-slate-400 font-mono tracking-widest">
              {pin ? '●'.repeat(pin.length) : 'Ketik PIN Anda pada tombol di bawah'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-rose-300 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Numpad 3x4 Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => handleNumClick(String(num))}
              className="h-16 rounded-2xl bg-slate-950 border border-slate-800 text-2xl font-bold text-white hover:bg-slate-800 active:bg-emerald-600 active:scale-95 transition flex items-center justify-center shadow focus:outline-none"
            >
              {num}
            </button>
          ))}

          {/* Reset / Clear Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleClear}
            className="h-16 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-xs font-bold uppercase tracking-wider"
          >
            Hapus
          </button>

          {/* Number 0 */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleNumClick('0')}
            className="h-16 rounded-2xl bg-slate-950 border border-slate-800 text-2xl font-bold text-white hover:bg-slate-800 active:bg-emerald-600 active:scale-95 transition flex items-center justify-center shadow focus:outline-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={loading || pin.length < 4}
          onClick={() => onLogin(pin)}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-xl ${
            pin.length >= 4 && !loading
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98]'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
              <span>Memeriksa PIN...</span>
            </>
          ) : (
            <span>MASUK ABSENSI</span>
          )}
        </button>
      </div>
    </div>
  );
}
