import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, UserCheck, X } from 'lucide-react';
import { formatWitaDateTime } from '../../utils/time';
import { showToast } from '../Common/Toast';

const PLEDGE_TEXT = 'dengan menyetujui ini saya berjanji akan memperbaiki kesalahan saya dan tidak mengulangi lagi';

export default function StaffPointNoticeModal({
  isOpen = true,
  onClose,
  pendingPoints = [],
  staff,
  onAcknowledge
}) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentPoint = pendingPoints[0] || null;

  useEffect(() => {
    setChecked(false);
  }, [currentPoint?.id, isOpen]);

  if (!isOpen || !currentPoint) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!checked || submitting) return;

    setSubmitting(true);
    try {
      await onAcknowledge(currentPoint.id);
      setChecked(false);
      showToast('Konfirmasi persetujuan poin telah dicatat.', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal mencatat konfirmasi poin.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#161b24] border border-rose-500/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl shadow-rose-950/50 animate-scale-up text-slate-200 flex flex-col max-h-[92vh]">
        {/* Notification Header */}
        <div className="p-5 bg-gradient-to-r from-rose-950 via-red-900/90 to-[#161b24] border-b border-rose-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                  Pemberitahuan Pelanggaran
                </span>
                {pendingPoints.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    1 dari {pendingPoints.length}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                Pencatatan Poin Staff ({staff?.name})
              </h3>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-black/25 hover:bg-black/45 text-slate-300 hover:text-white transition shrink-0 cursor-pointer"
              title="Tutup sementara"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4 overflow-y-auto">
          <div className="p-4 rounded-2xl bg-[#10141c] border border-rose-500/30 space-y-3">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              Anda terkena pelanggaran atas alasan:
            </p>
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-sm font-bold text-rose-100 whitespace-pre-wrap leading-relaxed">
              "{currentPoint.reason}"
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">
                Dan dibebankan poin sebesar:
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-mono text-base font-bold shadow-md shadow-rose-600/30">
                {currentPoint.points} Poin
              </span>
            </div>
          </div>

          {/* Metadata details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#12161f] border border-slate-800 flex items-center space-x-2.5">
              <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Diberikan Oleh</span>
                <span className="text-slate-100 font-bold truncate block">{currentPoint.given_by}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#12161f] border border-slate-800 flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Waktu Pencatatan</span>
                <span className="text-slate-100 font-mono text-[11px] font-bold block truncate">
                  {formatWitaDateTime(currentPoint.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between px-1">
            <span>Periode Akumulasi:</span>
            <span className="font-mono font-bold text-slate-300">{currentPoint.cycle_label}</span>
          </div>

          {/* Mandatory Pledge Checkbox */}
          <label className={`flex items-start space-x-3 p-3.5 rounded-2xl border transition cursor-pointer select-none ${
            checked
              ? 'bg-emerald-950/35 border-emerald-500/50 text-emerald-100'
              : 'bg-[#12161f] border-slate-700 hover:border-slate-600 text-slate-300'
          }`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
              required
            />
            <span className="text-xs font-semibold leading-relaxed">
              {PLEDGE_TEXT}
            </span>
          </label>

          {/* Mandatory Submit Button */}
          <button
            type="submit"
            disabled={!checked || submitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{submitting ? 'Menyimpan Konfirmasi...' : 'Saya Mengerti'}</span>
          </button>

          {!checked && (
            <p className="text-[11px] text-center text-amber-400/90 font-medium">
              Centang pernyataan di atas terlebih dahulu untuk mengaktifkan tombol "Saya Mengerti".
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
