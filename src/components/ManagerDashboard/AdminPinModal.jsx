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
      await verifyAdminPin(pin);
      setPin('');
      onSuccess();
    } catch (err) {
      setError('PIN Manager salah. Akses ditolak.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xs w-full overflow-hidden shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Akses Khusus Manager</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-600 font-semibold block mb-1">
              Masukkan PIN Admin (8080)
            </label>
            <input
              type="password"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !pin}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Memeriksa...' : 'Buka Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
