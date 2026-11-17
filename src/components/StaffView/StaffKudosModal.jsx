import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, Heart, Send, CheckCircle2, AlertCircle, X, Users, Sparkles, MessageSquare } from 'lucide-react';
import { sendStaffKudos, getStaffKudosStatus, getStaffList } from '../../utils/api';
import { formatWitaTimeOnly } from '../../utils/time';

const QUICK_REASONS = [
  'Kerja tim luar biasa solid 🤝',
  'Super ramah & care ke customer ✨',
  'Gercep & tanggap pas rush hour ⚡',
  'Teliti, bersih, & rapih banget 🎯',
  'Selalu tulus bantu rekan kerja 🌸',
  'Bikin suasana kerja jadi ceria 💖'
];

export default function StaffKudosModal({ staff, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [status, setStatus] = useState(null);
  const [colleagues, setColleagues] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [reason, setReason] = useState('');

  // Load kudos status and colleagues list
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [statusRes, staffListRes] = await Promise.all([
          getStaffKudosStatus(staff.id).catch(() => null),
          getStaffList('ALL').catch(() => [])
        ]);

        if (!isMounted) return;

        if (statusRes) {
          setStatus(statusRes);
        }

        // Filter out current logged in staff
        const others = (staffListRes || []).filter(
          (s) => String(s.id) !== String(staff.id) && String(s.uuid) !== String(staff.uuid)
        );
        setColleagues(others);
      } catch (err) {
        if (isMounted) setError(err.message || 'Gagal memuat data bintang apresiasi.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [staff.id, staff.uuid]);

  const handleSelectQuickReason = (tag) => {
    setReason((prev) => (prev ? `${prev} - ${tag}` : tag));
  };

  const handleSendKudos = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError('Silakan pilih rekan kerja yang ingin kamu beri apresiasi.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Tuliskan sepatah kata / alasan apresiasi minimal 3 karakter.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await sendStaffKudos({
        fromStaffId: staff.id,
        toStaffId: selectedStaffId,
        reason: reason.trim()
      });

      // Launch cheerful celebratory star confetti
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#ec4899', '#38bdf8']
        });
      } catch {}

      setSuccessMsg(res.message || 'Bintang Apresiasi berhasil dikirim!');
      setStatus((prev) => ({
        ...prev,
        canSend: false,
        sentThisWeek: res.kudos
      }));

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Gagal mengirimkan bintang apresiasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#151923] border border-white/15 rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 text-slate-100 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight flex items-center gap-1.5">
              <span>Bintang Apresiasi</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                Peer Kudos ⭐
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              1 bintang per minggu untuk mengapresiasi kerja keras rekanmu
            </p>
          </div>
        </div>

        {/* Total Stars Received Banner */}
        <div className="bg-gradient-to-r from-amber-950/50 via-[#211d17] to-purple-950/40 border border-amber-400/30 rounded-2xl p-2.5 mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <div>
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                Bintang Diterima Kamu
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {status?.receivedCount || 0} bintang apresiasi dari rekan kerja
              </div>
            </div>
          </div>
          <span className="text-base font-black text-amber-300 font-mono">
            ⭐ {status?.receivedCount || 0}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Memuat status Bintang Apresiasi...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 mb-3 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        {!loading && status && (
          <>
            {/* If Already Sent This Week */}
            {!status.canSend && (
              <div className="p-4 bg-slate-900/90 border border-white/10 rounded-2xl text-center space-y-2 mb-3">
                <div className="text-2xl">🎉</div>
                <h4 className="text-xs font-black text-amber-300">
                  Kamu Sudah Kirim Bintang Minggu Ini!
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Bintang telah kamu kirimkan ke{' '}
                  <strong className="text-white">{status.sentThisWeek?.to_staff_name || 'Rekan Tim'}</strong>
                  {status.sentThisWeek?.reason ? `: "${status.sentThisWeek.reason}"` : '.'}
                </p>
                <div className="pt-1.5 text-[10px] text-slate-400 font-mono">
                  Kuota bintang baru akan dibuka kembali pada hari <strong>Senin</strong> mendatang.
                </div>
              </div>
            )}

            {/* If Available to Send */}
            {status.canSend && (
              <form onSubmit={handleSendKudos} className="space-y-3">
                {/* Select Recipient */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pilih Rekan yang Ingin Diapresiasi:</span>
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-[#1e2433] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 transition"
                  >
                    <option value="">-- Pilih Rekan Kerja --</option>
                    {colleagues.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.venue} - {c.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Preset Tags */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    Pilihan Cepat Kata Apresiasi:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSelectQuickReason(tag)}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#1e2433] hover:bg-[#283145] text-slate-200 border border-white/10 transition active:scale-95 cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Note Input */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pesan Apresiasi / Alasan:</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Contoh: Makasih ya udah bantuin pas rush hour semalam, kerjanya gercep banget! ✨"
                    className="w-full bg-[#1e2433] border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none"
                  />
                  <div className="text-[9.5px] text-slate-500 text-right mt-0.5">
                    Log apresiasi dapat dipantau oleh Manager Operasional.
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !selectedStaffId || !reason.trim()}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg ${
                    submitting || !selectedStaffId || !reason.trim()
                      ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-amber-500/25 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Mengirimkan...' : 'Kirim Bintang Apresiasi ⭐'}</span>
                </button>
              </form>
            )}

            {/* Recent Received Stars List */}
            {status.recentReceived && status.recentReceived.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Bintang yang Kamu Terima:</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {status.recentReceived.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2 rounded-xl bg-slate-900/70 border border-white/5 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-bold text-amber-300">
                          Dari {rec.from_staff_name}
                        </span>
                        <span className="text-[9.5px] text-slate-500 font-mono">
                          {formatWitaTimeOnly(rec.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[10.5px] italic leading-tight">
                        "{rec.reason}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
