import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Image as ImageIcon,
  Layers,
  Sparkles,
  ArrowLeft,
  Eye,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatWitaDateTime } from '../../utils/time';
import ZoomableImage from '../Common/ZoomableImage';
import { showToast } from '../Common/Toast';

export default function StaffAnnouncementModal({
  isOpen,
  onClose,
  announcements = [],
  staff,
  onAcknowledge,
  initialView = 'AUTO' // 'AUTO' | 'LIST' | 'DETAIL'
}) {
  if (!isOpen || !announcements || announcements.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'DETAIL'
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Set initial view mode based on urgent status or initialView prop
  useEffect(() => {
    if (announcements && announcements.length > 0) {
      const urgentUnreadIdx = announcements.findIndex((a) => a.urgency === 'URGENT' && !a.isRead);
      if (initialView === 'LIST') {
        setViewMode('LIST');
      } else if (urgentUnreadIdx >= 0) {
        // If there is an unread URGENT announcement, immediately show DETAIL of that announcement
        setCurrentIndex(urgentUnreadIdx);
        setViewMode('DETAIL');
      } else if (initialView === 'DETAIL') {
        setViewMode('DETAIL');
      } else {
        setViewMode('LIST');
      }
    }
  }, [announcements, initialView]);

  // Reset image index when switching announcement
  useEffect(() => {
    setSelectedImageIdx(0);
    setActionSuccess(null);
  }, [currentIndex]);

  const currentAnn = announcements[currentIndex] || announcements[0];
  const isUrgent = currentAnn?.urgency === 'URGENT';
  const isRead = currentAnn?.isRead;
  const totalUnread = announcements.filter((a) => !a.isRead).length;

  const handleOpenDetail = (idx) => {
    setCurrentIndex(idx);
    setViewMode('DETAIL');
  };

  const handleConfirm = async () => {
    if (submitting || !currentAnn) return;
    setSubmitting(true);
    setActionSuccess(null);

    try {
      if (onAcknowledge) {
        await onAcknowledge(currentAnn.id);
      }
      setActionSuccess(`Terima kasih! Anda telah menyetujui "${currentAnn.title}".`);
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 }
      });

      setTimeout(() => {
        setActionSuccess(null);
        // If there's another unread announcement, go to it, or return to list view
        const nextUnreadIdx = announcements.findIndex((a, idx) => idx !== currentIndex && !a.isRead);
        if (nextUnreadIdx >= 0) {
          setCurrentIndex(nextUnreadIdx);
          setSelectedImageIdx(0);
        } else {
          setViewMode('LIST');
        }
      }, 1200);
    } catch (e) {
      showToast('Gagal mencatat konfirmasi: ' + (e.message || 'Error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className={`p-4 sm:p-5 flex items-center justify-between text-white ${
            viewMode === 'DETAIL' && isUrgent
              ? 'bg-gradient-to-r from-rose-700 via-red-800 to-slate-900'
              : 'bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <Megaphone className="w-5 h-5 text-amber-300 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                  📢 Pengumuman Resmi Manajemen
                </span>
                {totalUnread > 0 ? (
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black animate-pulse">
                    {totalUnread} Belum Disetujui
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                    Semua Disetujui ✓
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                {viewMode === 'LIST' ? `Daftar Pengumuman (${announcements.length})` : currentAnn?.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {viewMode === 'DETAIL' && announcements.length > 1 && (
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-black flex items-center space-x-1 transition"
                title="Lihat Daftar"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Daftar Pengumuman</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Tutup"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 font-black ${
                viewMode === 'LIST'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Daftar Pengumuman ({announcements.length})</span>
            </button>
            {currentAnn && (
              <button
                type="button"
                onClick={() => setViewMode('DETAIL')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 font-black ${
                  viewMode === 'DETAIL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Detail: {currentAnn.title}</span>
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            {totalUnread > 0 ? `Wajib disetujui 1 per 1` : 'Semua telah disetujui'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-bold text-slate-800 flex-1">
          {viewMode === 'LIST' ? (
            /* ================================================= */
            /* 1. LIST VIEW: SHOW ALL ANNOUNCEMENTS TOGETHER     */
            /* ================================================= */
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                <span>Klik pengumuman untuk membaca detail dan melihat flyer:</span>
                <span>{announcements.length} pengumuman tersedia</span>
              </div>

              <div className="space-y-2.5">
                {announcements.map((ann, idx) => {
                  const annUrgent = ann.urgency === 'URGENT';
                  const hasImages = Array.isArray(ann.images) && ann.images.length > 0;
                  return (
                    <div
                      key={ann.id}
                      onClick={() => handleOpenDetail(idx)}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer shadow-sm hover:shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        !ann.isRead
                          ? annUrgent
                            ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-300/40'
                            : 'bg-amber-50/60 border-amber-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          {annUrgent ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
                              🚨 URGENT / WAJIB BACA
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-300">
                              📢 Pengumuman Reguler
                            </span>
                          )}

                          {ann.isRead ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Disetujui ✓
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-300">
                              ⏳ Perlu Dibaca &amp; Disetujui
                            </span>
                          )}

                          {hasImages && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center space-x-1">
                              <ImageIcon className="w-3 h-3 text-purple-700" />
                              <span>{ann.images.length} Flyer Promo</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-slate-950 truncate">{ann.title}</h4>
                        <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
                          {ann.content}
                        </p>

                        <div className="text-[10px] text-slate-400 font-bold flex items-center space-x-2 pt-0.5">
                          <span>Oleh: {ann.author_name || 'General Manager'}</span>
                          <span>•</span>
                          <span>{formatWitaDateTime(ann.created_at)}</span>
                          <span>•</span>
                          <span className="text-blue-700 font-bold">
                            {ann.target_venue === 'ALL' ? 'Semua Outlet' : ann.target_venue}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(idx);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1 shrink-0 ${
                          !ann.isRead
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{!ann.isRead ? 'Baca & Setujui' : 'Lihat Detail'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ================================================= */
            /* 2. DETAIL VIEW: ZOOMABLE IMAGES & FULL CONTENT    */
            /* ================================================= */
            <div className="space-y-4 animate-fade-in">
              {/* Back to List Button */}
              {announcements.length > 1 && (
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-black text-xs flex items-center space-x-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Kembali ke Daftar Pengumuman</span>
                </button>
              )}

              {/* Metadata Bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>
                    Diterbitkan oleh: <strong className="text-slate-900">{currentAnn.author_name || 'General Manager'}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-1 font-mono text-[10px]">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatWitaDateTime(currentAnn.created_at)}</span>
                </div>
              </div>

              {/* Title & Target */}
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  {isUrgent ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
                      🚨 URGENT
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-300">
                      📢 REGULER
                    </span>
                  )}
                  {isRead ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      Disetujui ✓
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950">
                      Belum Disetujui
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-950 leading-snug">{currentAnn.title}</h2>
                <div className="text-[10px] text-blue-700 font-bold mt-0.5">
                  Target: {currentAnn.target_venue === 'ALL' ? '🌐 Semua Outlet (JP Karaoke & LuckyCat)' : `📍 ${currentAnn.target_venue}`}
                </div>
              </div>

              {/* Promo Flyers / Attached Images with Scroll Zoom */}
              {Array.isArray(currentAnn.images) && currentAnn.images.length > 0 && (
                <div className="space-y-2 bg-slate-900 p-3 rounded-2xl text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-300 flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>
                        Flyer / Promo Terlampir ({currentAnn.images.length} Gambar):
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Scroll mouse wheel / pinch untuk zoom in &amp; out
                    </span>
                  </div>

                  {/* Large Zoomable Preview */}
                  <div className="rounded-xl overflow-hidden border border-white/20 bg-black">
                    <ZoomableImage
                      src={currentAnn.images[selectedImageIdx || 0]}
                      alt={`Flyer ${currentAnn.title}`}
                      maxHeight="max-h-[46vh]"
                    />
                  </div>

                  {/* Thumbnail Selector if > 1 Image */}
                  {currentAnn.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pt-1">
                      {currentAnn.images.map((imgUrl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedImageIdx(i)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                            (selectedImageIdx || 0) === i
                              ? 'border-amber-400 ring-2 ring-amber-400 scale-105'
                              : 'border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Formatted Content */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-xs leading-relaxed text-slate-900 font-medium whitespace-pre-line shadow-inner">
                {currentAnn.content}
              </div>

              {/* Success Banner */}
              {actionSuccess && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-black flex items-center space-x-2 animate-bounce">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {isRead && !actionSuccess && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-2xl flex items-center space-x-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <div className="text-[11px] leading-tight">
                    <span className="font-black block text-emerald-900">
                      Anda Sudah Membaca &amp; Menyetujui Pengumuman Ini
                    </span>
                    <span className="text-slate-600 font-mono text-[10px]">
                      Tercatat pada: {formatWitaDateTime(currentAnn.readAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* Stepper Navigation */}
              {announcements.length > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
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
                    onClick={() => setCurrentIndex((prev) => Math.min(announcements.length - 1, prev + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-30 font-black flex items-center space-x-1"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-black text-slate-800 transition"
          >
            Tutup
          </button>

          {viewMode === 'DETAIL' && !isRead && (
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

          {viewMode === 'LIST' && totalUnread > 0 && (
            <button
              type="button"
              onClick={() => {
                const firstUnread = announcements.findIndex(a => !a.isRead);
                if (firstUnread >= 0) handleOpenDetail(firstUnread);
              }}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-600/30 transition flex items-center justify-center space-x-2"
            >
              <span>Baca &amp; Setujui ({totalUnread} Belum)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
