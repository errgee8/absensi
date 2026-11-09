import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2, Lock, Sparkles, RefreshCw } from 'lucide-react';
import { wipeLeaderboardData } from '../../utils/api';

export default function WipeLeaderboardModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [scope, setScope] = useState('all'); // 'all' | 'attendance' | 'toilet'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleWipe = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Silakan masukkan PIN Manager (8080) untuk konfirmasi.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await wipeLeaderboardData({ pin: pin.trim(), scope });
      setSuccessMsg(res.message || 'Data trial berhasil dibersihkan! Leaderboard telah di-reset ke nol.');
      setPin('');
      setTimeout(() => {
        if (onSuccess) onSuccess(res);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Gagal melakukan wipe data. Pastikan PIN Manager benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white border-2 border-rose-300 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up text-slate-900">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Trash2 className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Wipe Data Leaderboard</h3>
              <p className="text-[11px] text-rose-100 font-bold">Khusus Otoritas Manager (Trial Reset)</p>
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
        <form onSubmit={handleWipe} className="p-5 space-y-4">
          
          {/* Warning Banner */}
          <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start space-x-2.5 text-xs text-rose-950 font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black text-rose-900">Perhatian Masa Uji Coba (Trial):</p>
              <p className="text-[11px] text-rose-800 leading-relaxed font-bold">
                Tindakan ini akan <strong>mengosongkan seluruh riwayat kerja &amp; inspeksi</strong> yang tersimpan selama masa trial, sehingga peringkat leaderboard kembali bersih dari angka nol.
              </p>
              <p className="text-[10px] text-slate-600 font-black">
                ✓ Roster nama staf, PIN, outlet, dan pengaturan shift <u>TIDAK</u> akan terhapus.
              </p>
            </div>
          </div>

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

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-black text-slate-900 mb-1.5">
              Pilih Data yang Ingin Di-wipe:
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center space-x-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition ${
                  scope === 'all'
                    ? 'bg-rose-50 border-rose-500 text-rose-950 font-black shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 font-bold hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="wipeScope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="accent-rose-600"
                />
                <div className="text-xs">
                  <div>Semua Data Trial (Absensi &amp; Inspeksi Toilet)</div>
                  <div className="text-[10px] text-slate-500 font-bold">Mengosongkan leaderboard absensi dan toilet sekaligus</div>
                </div>
              </label>

              <label
                className={`flex items-center space-x-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition ${
                  scope === 'attendance'
                    ? 'bg-rose-50 border-rose-500 text-rose-950 font-black shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 font-bold hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="wipeScope"
                  value="attendance"
                  checked={scope === 'attendance'}
                  onChange={() => setScope('attendance')}
                  className="accent-rose-600"
                />
                <div className="text-xs">
                  <div>Riwayat Absensi &amp; Istirahat Saja</div>
                  <div className="text-[10px] text-slate-500 font-bold">Hanya mereset kolom 1 (Kedisiplinan Absensi)</div>
                </div>
              </label>

              <label
                className={`flex items-center space-x-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition ${
                  scope === 'toilet'
                    ? 'bg-rose-50 border-rose-500 text-rose-950 font-black shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 font-bold hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="wipeScope"
                  value="toilet"
                  checked={scope === 'toilet'}
                  onChange={() => setScope('toilet')}
                  className="accent-rose-600"
                />
                <div className="text-xs">
                  <div>Riwayat Inspeksi Toilet Saja</div>
                  <div className="text-[10px] text-slate-500 font-bold">Hanya mereset kolom 2 (Inspeksi Toilet QR)</div>
                </div>
              </label>
            </div>
          </div>

          {/* PIN Manager Verification Input */}
          <div>
            <label className="block text-xs font-black text-slate-900 mb-1">
              Verifikasi PIN Manager:
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
                placeholder="Masukkan PIN Manager..."
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-rose-600 focus:bg-white transition tracking-widest"
                autoFocus
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Otorisasi diperlukan untuk mencegah staf atau pihak lain menghapus data.
            </p>
          </div>

          {/* Actions */}
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
              className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md shadow-rose-600/30 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sedang Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Ya, Wipe Data Sekarang</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
