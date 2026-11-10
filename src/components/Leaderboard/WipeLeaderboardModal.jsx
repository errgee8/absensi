import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2, Lock, Sparkles, RefreshCw, RotateCcw } from 'lucide-react';
import { wipeLeaderboardData } from '../../utils/api';

export default function WipeLeaderboardModal({ isOpen, onClose, onSuccess, currentResetAt }) {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState('reset_only'); // 'reset_only' | 'wipe_records'
  const [scope, setScope] = useState('all'); // 'all' | 'attendance' | 'toilet'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e, customMode) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pin.trim()) {
      setError('Silakan masukkan PIN Manager (8980) untuk konfirmasi otorisasi.');
      return;
    }

    const actionPlan = customMode || mode;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await wipeLeaderboardData({
        pin: pin.trim(),
        mode: actionPlan,
        scope: actionPlan === 'wipe_records' ? scope : 'all'
      });
      setSuccessMsg(res.message);
      setPin('');
      setTimeout(() => {
        if (onSuccess) onSuccess(res);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Gagal memproses permintaan. Pastikan PIN Manager benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <RotateCcw className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Pengaturan Reset / Wipe Leaderboard</h3>
              <p className="text-[11px] text-blue-100 font-bold">Khusus Otoritas Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Active Reset Status Indicator (if already active) */}
          {currentResetAt && (
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-amber-950">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Leaderboard aktif di-reset sejak: <strong className="font-mono">{new Date(currentResetAt).toLocaleString('id-ID')}</strong></span>
              </div>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'undo_reset')}
                disabled={loading || !pin.trim()}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg text-[10px] font-black transition disabled:opacity-50 shrink-0 border border-amber-400"
                title="Batalkan cutoff dan kembalikan hitungan bulan penuh"
              >
                Batalkan Reset
              </button>
            </div>
          )}

          {/* Success Message Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-xs text-emerald-950 font-black flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-950 font-black flex items-center space-x-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </div>
          )}

          {/* Choose Mode (Reset Leaderboard Only vs Wipe Data) */}
          <div>
            <label className="block text-xs font-black text-slate-950 mb-2">
              Pilih Tindakan yang Diinginkan:
            </label>
            <div className="space-y-2.5">
              
              {/* Option 1: Reset Leaderboard Only (Recommended) */}
              <label
                className={`flex items-start space-x-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  mode === 'reset_only'
                    ? 'bg-blue-50 border-blue-600 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="leaderboardMode"
                  value="reset_only"
                  checked={mode === 'reset_only'}
                  onChange={() => setMode('reset_only')}
                  className="mt-1 accent-blue-600"
                />
                <div className="text-xs">
                  <div className="font-black text-slate-950 flex items-center space-x-1.5">
                    <span>✨ Reset Leaderboard Saja (Mulai dari Nol)</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-200 text-blue-900 font-black">Rekomendasi</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-bold mt-0.5 leading-relaxed">
                    Poin &amp; peringkat leaderboard dimulai kembali dari nol terhitung mulai saat ini.
                  </p>
                  <p className="text-[10px] text-emerald-700 font-black mt-1">
                    ✓ Riwayat kerja, foto absensi, dan jam shift staf <u>TETAP AMAN</u> tersimpan di audit manager.
                  </p>
                </div>
              </label>

              {/* Option 2: Wipe Permanent Trial Records */}
              <label
                className={`flex items-start space-x-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  mode === 'wipe_records'
                    ? 'bg-rose-50 border-rose-500 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="leaderboardMode"
                  value="wipe_records"
                  checked={mode === 'wipe_records'}
                  onChange={() => setMode('wipe_records')}
                  className="mt-1 accent-rose-600"
                />
                <div className="text-xs">
                  <div className="font-black text-rose-950 flex items-center space-x-1.5">
                    <span>🗑️ Wipe Bersih Semua Data Trial (Hapus Permanen)</span>
                  </div>
                  <p className="text-[11px] text-rose-800 font-bold mt-0.5 leading-relaxed">
                    Menghapus seluruh baris log riwayat absensi atau inspeksi selama masa percobaan secara permanen dari database.
                  </p>
                </div>
              </label>

            </div>
          </div>

          {/* Sub-scope if Wipe Permanent is selected */}
          {mode === 'wipe_records' && (
            <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-2 animate-fade-in">
              <label className="block text-[11px] font-black text-slate-800">
                Pilih Cakupan Data yang Dihapus Permanen:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`p-2 rounded-xl text-left border-2 font-bold transition text-[11px] ${
                    scope === 'all'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Semua (Absensi &amp; Toilet)
                </button>
                <button
                  type="button"
                  onClick={() => setScope('attendance')}
                  className={`p-2 rounded-xl text-left border-2 font-bold transition text-[11px] ${
                    scope === 'attendance'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Absensi Saja
                </button>
                <button
                  type="button"
                  onClick={() => setScope('toilet')}
                  className={`p-2 rounded-xl text-left border-2 font-bold transition text-[11px] ${
                    scope === 'toilet'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Inspeksi Toilet Saja
                </button>
              </div>
            </div>
          )}

          {/* PIN Verification Input */}
          <div>
            <label className="block text-xs font-black text-slate-950 mb-1">
              Masukkan PIN Otorisasi Manager:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN Manager (8980)..."
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white transition tracking-widest"
                autoFocus
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Fitur ini hanya dapat dieksekusi oleh Full Manager.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !pin.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 ${
                mode === 'reset_only'
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/30'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : mode === 'reset_only' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Reset Leaderboard Sekarang</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Wipe Permanen Sekarang</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
