import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import { verifyAdminPin } from '../../utils/api';

export default function AdminPinModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError(null);

    try {
      const authData = await verifyAdminPin(pin);
      setPin('');
      onSuccess(authData);
    } catch (err) {
      setError('PIN Manager / Assistant Manager salah. Akses ditolak.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-xs w-full overflow-hidden shadow-2xl p-5 text-slate-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-sm">
              <Lock className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">Akses Manajer / Pengawas</h3>
              <p className="text-[10px] text-slate-400 font-bold">Full Access &amp; View Only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-200 font-black block mb-1">
              Masukkan PIN Anda
            </label>
            <p className="text-[11px] text-slate-400 font-bold mb-2">
              Ketik PIN Manajer Utama atau PIN Assistant Manager Anda (misal: Sherly) untuk membuka laporan absensi &amp; toilet.
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2.5 text-center text-2xl font-mono tracking-widest text-white font-black focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1c2230] hover:bg-[#252d3d] border border-slate-700 text-slate-300 rounded-xl text-xs font-black transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !pin}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Memeriksa...' : 'Buka Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
