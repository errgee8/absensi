import React, { useState } from 'react';
import { Megaphone, CheckCircle, Clock, X, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatWitaDateTime } from '../../utils/time';

export default function StaffAnnouncementModal({
  isOpen,
  onClose,
  announcements = [],
  staff,
  onAcknowledge
}) {
  if (!isOpen || !announcements || announcements.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const currentAnn = announcements[currentIndex] || announcements[0];
  const isUrgent = currentAnn.urgency === 'URGENT';
  const isRead = currentAnn.isRead;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setActionSuccess(null);

    try {
      if (onAcknowledge) {
        await onAcknowledge(currentAnn.id);
      }
      setActionSuccess('Terima kasih! Konfirmasi membaca telah tersimpan.');
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
      setTimeout(() => {
        setActionSuccess(null);
        // If there's another unread announcement, advance to it; otherwise close
        const nextUnreadIdx = announcements.findIndex((a, idx) => idx > currentIndex && !a.isRead);
        if (nextUnreadIdx >= 0) {
          setCurrentIndex(nextUnreadIdx);
        } else {
          onClose();
        }
      }, 1200);
    } catch (e) {
      alert('Gagal mencatat konfirmasi: ' + (e.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between text-white ${
          isUrgent
            ? 'bg-gradient-to-r from-rose-700 via-red-800 to-slate-900'
            : 'bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <Megaphone className="w-5 h-5 text-amber-300 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-500/50 text-blue-100'
                }`}>
                  {isUrgent ? '🚨 PENTING / WAJIB BACA' : '📢 Pengumuman Resmi'}
                </span>
                {announcements.length > 1 && (
                  <span className="text-[10px] text-slate-300 font-mono font-bold">
                    ({currentIndex + 1} / {announcements.length})
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                Pengumuman Management
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-bold text-slate-800">
          
          {/* Metadata Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200 pb-2">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Diterbitkan oleh: <strong className="text-slate-900">{currentAnn.author_name || 'General Manager'}</strong></span>
            </div>
            <div className="flex items-center space-x-1 font-mono text-[10px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatWitaDateTime(currentAnn.created_at)}</span>
            </div>
          </div>

          {/* Announcement Title */}
          <div>
            <h2 className="text-lg font-black text-slate-950 leading-snug">
              {currentAnn.title}
            </h2>
            <div className="text-[10px] text-blue-700 font-bold mt-0.5">
              Target: {currentAnn.target_venue === 'ALL' ? '🌐 Semua Outlet (JP & LuckyCat)' : `📍 ${currentAnn.target_venue}`}
            </div>
          </div>

          {/* Formatted Content */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-xs leading-relaxed text-slate-900 font-medium whitespace-pre-line shadow-inner">
            {currentAnn.content}
          </div>

          {/* Acknowledge Status or Success Banner */}
          {actionSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-black flex items-center space-x-2 animate-bounce">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {isRead && !actionSuccess && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-2xl flex items-center space-x-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
              <div className="text-[11px] leading-tight">
                <span className="font-black block text-emerald-900">Anda Sudah Membaca &amp; Menyetujui Pengumuman Ini</span>
                <span className="text-slate-600 font-mono text-[10px]">
                  Tercatat pada: {formatWitaDateTime(currentAnn.readAt)}
                </span>
              </div>
            </div>
          )}

          {/* Multiple Announcements Navigation (if > 1) */}
          {announcements.length > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-30 font-black flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="text-[11px] text-slate-500 font-bold">
                Pengumuman {currentIndex + 1} dari {announcements.length}
              </span>

              <button
                type="button"
                disabled={currentIndex === announcements.length - 1}
                onClick={() => setCurrentIndex(prev => Math.min(announcements.length - 1, prev + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-30 font-black flex items-center space-x-1"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-black text-slate-800 transition"
          >
            Tutup
          </button>

          {!isRead && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{submitting ? 'Menyimpan...' : 'Saya Mengerti & Menyetujui'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
