import React, { useState } from 'react';
import { X, Quote, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { updateStaffBio } from '../../utils/api';

export default function StaffBioModal({ isOpen, staff, currentBio = '', onClose, onSuccess }) {
  const [bio, setBio] = useState(currentBio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const countWords = (text) => {
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  };

  const wordCount = countWords(bio);
  const isOverLimit = wordCount > 150;

  const handleSave = async (e) => {
    e.preventDefault();
    if (isOverLimit) {
      setError(`Bio melebihi batas maksimal 150 kata (saat ini: ${wordCount} kata).`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await updateStaffBio(staff.id, bio.trim());
      if (onSuccess) onSuccess(res.bio !== undefined ? res.bio : bio.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan bio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#151923] border border-white/15 rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 text-slate-100 shadow-2xl relative my-auto space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Quote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              Bio Profil Singkat
            </h3>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              Tuliskan kata motivasi, prinsip kerja, atau perkenalan singkatmu (maks 150 kata).
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div className="relative">
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Selalu berusaha memberikan pelayanan terbaik dengan senyuman hangat 😊 Berkolaborasi ramah dan solid bersama tim!"
              className={`w-full bg-[#1e2433] border rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none ${
                isOverLimit
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-white/15 focus:border-indigo-400'
              }`}
            />
            {/* Word Counter */}
            <div className="flex items-center justify-between text-[10px] mt-1 px-1">
              <span className="text-slate-500">Maksimal 150 kata</span>
              <span
                className={`font-mono font-bold ${
                  isOverLimit ? 'text-rose-400' : wordCount > 130 ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {wordCount} / 150 kata
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#1e2433] hover:bg-[#283145] text-slate-300 border border-white/10 transition active:scale-95 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || isOverLimit}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg ${
                loading || isOverLimit
                  ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 active:scale-95 cursor-pointer'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Bio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
