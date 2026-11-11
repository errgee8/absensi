import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Clock, Calendar, Award, ShieldCheck } from 'lucide-react';
import { getPoints } from '../../utils/api';
import { formatWitaDateTime, getPointCycleInfo } from '../../utils/time';

export default function StaffPointHistoryModal({
  isOpen,
  onClose,
  staff,
  onOpenNoticeModal
}) {
  const [loading, setLoading] = useState(true);
  const [selectedCycleKey, setSelectedCycleKey] = useState('CURRENT');
  const [data, setData] = useState(null);

  const loadHistory = async (cycleKey = selectedCycleKey) => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const res = await getPoints({
        staffId: staff.id,
        staffUuid: staff.uuid || '',
        cycleKey
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load staff point history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && staff?.id) {
      loadHistory(selectedCycleKey);
    }
  }, [isOpen, staff?.id, selectedCycleKey]);

  if (!isOpen || !staff) return null;

  const currentCycle = data?.currentCycle || getPointCycleInfo();
  const points = data?.points || [];
  const totalInSelectedCycle = points.reduce((sum, p) => sum + Number(p.points || 0), 0);
  const currentTotal = data?.currentCycleTotalForStaff ?? 0;
  const pendingCount = (data?.pendingForStaff || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-200 animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#12161f] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Akumulasi Poin Pelanggaran</h3>
              <p className="text-xs text-slate-400 font-medium">{staff.name} • {staff.venue}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary & Filter */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-4 rounded-2xl border ${
              currentTotal > 0
                ? 'bg-rose-950/35 border-rose-500/40'
                : 'bg-emerald-950/30 border-emerald-500/30'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Poin Periode Aktif
              </span>
              <div className={`text-2xl font-mono font-bold mt-1 ${
                currentTotal > 0 ? 'text-rose-300' : 'text-emerald-300'
              }`}>
                {currentTotal} Poin
              </div>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
                {currentCycle.label}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#12161f] border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Siklus Cut-Off Bulanan
                </span>
                <p className="text-xs text-slate-300 font-semibold mt-1">
                  Reset otomatis setiap <strong>tanggal 17</strong> (hitung s/d tanggal 13 bulan berikutnya).
                </p>
              </div>
              {pendingCount > 0 && onOpenNoticeModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNoticeModal();
                  }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Konfirmasi {pendingCount} Poin Belum Disetujui →
                </button>
              )}
            </div>
          </div>

          {/* Cycle Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Filter Periode:</span>
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={selectedCycleKey}
                onChange={(e) => setSelectedCycleKey(e.target.value)}
                className="bg-[#12161f] border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {(data?.availableCycles || [currentCycle]).map((c) => (
                  <option key={c.cycleKey} value={c.cycleKey === currentCycle.cycleKey ? 'CURRENT' : c.cycleKey}>
                    {c.label}{c.cycleKey === currentCycle.cycleKey ? ' (Aktif)' : ''}
                  </option>
                ))}
                <option value="ALL">Semua Riwayat</option>
              </select>
              <span className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-xs font-mono font-bold text-slate-200">
                Total: {totalInSelectedCycle} Poin
              </span>
            </div>
          </div>

          {/* History List */}
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Memuat riwayat poin...</div>
          ) : points.length === 0 ? (
            <div className="py-10 px-4 rounded-2xl bg-[#12161f] border border-slate-800 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-emerald-300">Bersih! Tidak Ada Poin Pelanggaran</p>
              <p className="text-xs text-slate-400">Pertahankan kedisiplinan dan performa kerja Anda.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {points.map((pt) => {
                const isAck = pt.status === 'ACKNOWLEDGED';
                return (
                  <div
                    key={pt.id}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      isAck
                        ? 'bg-[#12161f] border-slate-800'
                        : 'bg-rose-950/25 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30">
                            +{pt.points} Poin
                          </span>
                          {isAck ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sudah Disetujui</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Menunggu "Saya Mengerti"</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-white leading-snug pt-0.5">
                          {pt.reason}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>Oleh: <strong className="text-slate-300">{pt.given_by}</strong></span>
                      <span className="font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatWitaDateTime(pt.created_at)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
