import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, CheckCircle2, Lock, Sparkles, RefreshCw, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import { wipeLeaderboardData } from '../../utils/api';

export default function WipeLeaderboardModal({ isOpen, onClose, onSuccess, currentResetAt }) {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState('wipe_records'); // Default to 'wipe_records' for master reset
  const [scope, setScope] = useState('all'); // 'all' | 'attendance' | 'toilet'
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e, customMode) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pin.trim()) {
      setError('Silakan masukkan PIN Manager (8980) untuk otorisasi.');
      return;
    }

    const actionPlan = customMode || mode;

    if (actionPlan === 'wipe_records' && !confirmChecked && !customMode) {
      setError('Harap centang kotak persetujuan konfirmasi sebelum mengeksekusi Master Reset.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await wipeLeaderboardData({
        pin: pin.trim(),
        mode: actionPlan,
        scope: actionPlan === 'wipe_records' ? scope : 'all'
      });
      setSuccessMsg(res.message || 'Master Reset berhasil dieksekusi! Seluruh data operasional telah kembali ke 0.');
      setPin('');
      setTimeout(() => {
        if (onSuccess) onSuccess(res);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Gagal memproses permintaan. Pastikan PIN Manager benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-700 via-rose-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-amber-300 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Master Reset &amp; Pembersihan Data</h3>
              <p className="text-[11px] text-rose-200 font-bold">Launch Resmi Operasional (Start from Zero)</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          
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
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-xs text-emerald-950 font-black flex items-center space-x-2 animate-fade-in shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
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

          {/* Choose Mode */}
          <div>
            <label className="block text-xs font-black text-slate-950 mb-2">
              Pilih Tindakan Reset:
            </label>
            <div className="space-y-2.5">
              
              {/* Option 1: Master Reset (Start Clean for Launch) */}
              <label
                className={`flex items-start space-x-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  mode === 'wipe_records'
                    ? 'bg-rose-50/80 border-rose-500 shadow-sm'
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
                <div className="text-xs w-full">
                  <div className="font-black text-rose-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[13px]">
                      ⚡ MASTER RESET: Mulai Fresh dari Nol
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-200 text-rose-900 font-black uppercase tracking-wider">
                      Launch Resmi
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-900 font-bold mt-1 leading-relaxed">
                    Membersihkan seluruh data ujicoba (trial) agar seluruh staf memulai pencatatan poin, absensi, keterlambatan, dan izin secara resmi dari 0.
                  </p>
                </div>
              </label>

              {/* Option 2: Reset Leaderboard Saja */}
              <label
                className={`flex items-start space-x-3 p-3 rounded-2xl border-2 cursor-pointer transition ${
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
                    <span>✨ Reset Leaderboard Saja</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-bold mt-0.5 leading-relaxed">
                    Hanya mereset skor ranking leaderboard ke 0 terhitung mulai saat ini. Riwayat absensi dan audit tetap ada.
                  </p>
                </div>
              </label>

            </div>
          </div>

          {/* Master Reset Details & Guarantees (Shown when mode === 'wipe_records') */}
          {mode === 'wipe_records' && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                
                {/* Dihapus / Reset ke 0 */}
                <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-red-700 font-black text-[11px]">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DI-RESET KE 0 (DIHAPUS)</span>
                  </div>
                  <ul className="text-[10px] text-red-900 space-y-1 font-bold pl-1">
                    <li>• Poin Sanksi &amp; Poin Plus (0 Poin)</li>
                    <li>• Riwayat Absensi &amp; Hari Kerja (0 Hari)</li>
                    <li>• Total Keterlambatan (0x Telat)</li>
                    <li>• Riwayat Cuti, Izin &amp; Sakit (0 Hari)</li>
                    <li>• Checklist Inspeksi Toilet QR (0 Log)</li>
                  </ul>
                </div>

                {/* Tetap Aman 100% */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-black text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>TETAP AMAN (TIDAK HILANG)</span>
                  </div>
                  <ul className="text-[10px] text-emerald-900 space-y-1 font-bold pl-1">
                    <li>✓ Daftar Nama Seluruh Staf</li>
                    <li>✓ PIN Login 4-Digit Staf</li>
                    <li>✓ Foto Profil Staf</li>
                    <li>✓ Pendaftaran Biometrik Wajah</li>
                    <li>✓ Role &amp; Venue Cabang (LuckyCat &amp; JP)</li>
                  </ul>
                </div>

              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start space-x-2.5 p-3 bg-amber-50/80 border-2 border-amber-300 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
                <span className="text-[11px] font-black text-amber-950 leading-tight">
                  Saya mengonfirmasi Master Reset ini untuk membersihkan semua data trial dan memulai operasional resmi dari 0.
                </span>
              </label>
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
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-red-600 focus:bg-white transition tracking-widest"
                autoFocus
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Hanya Full Manager (PIN: 8980) yang berwenang mengeksekusi reset.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !pin.trim() || (mode === 'wipe_records' && !confirmChecked)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'reset_only'
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/30'
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-600/30'
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
                  <Zap className="w-3.5 h-3.5 stroke-[2.5] text-amber-300" />
                  <span>⚡ Eksekusi Master Reset Sekarang</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
