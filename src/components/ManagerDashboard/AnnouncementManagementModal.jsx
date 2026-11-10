import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone,
  X,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  User,
  Building2,
  RefreshCw,
  Eye,
  Check,
  Lock,
  Archive,
  ArrowRight,
  Image as ImageIcon,
  Camera,
  Trash2
} from 'lucide-react';
import { getAnnouncements, createAnnouncement, updateAnnouncement, getAnnouncementReaders } from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';
import ZoomableImage from '../Common/ZoomableImage';
import { showToast } from '../Common/Toast';

export default function AnnouncementManagementModal({
  isOpen,
  onClose,
  adminAuth,
  isReadOnly = false,
  onAnnouncementChanged,
  initialTab = 'LIST'
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState(initialTab || 'LIST'); // 'LIST' | 'CREATE' | 'READERS'
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State: Create Announcement
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState('NORMAL');
  const [targetVenue, setTargetVenue] = useState('ALL');
  const [expiryPreset, setExpiryPreset] = useState('FOREVER'); // 'FOREVER' | '1D' | '3D' | '7D' | '14D' | '30D' | 'CUSTOM'
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [pin, setPin] = useState(adminAuth?.pin || (adminAuth?.role === 'MANAGER' ? '8980' : ''));
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);

  // Attached Images / Flyers State
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setImages((prev) => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Readers Report State
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [readersReport, setReadersReport] = useState(null);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [readerFilter, setReaderFilter] = useState('ALL'); // 'ALL' | 'READ' | 'UNREAD'

  const isGM = adminAuth?.role === 'FULL_ADMIN' || adminAuth?.role === 'MANAGER' || adminAuth?.pin === '8980' || !isReadOnly;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnnouncements({ activeOnly: false });
      setAnnouncements(data || []);
    } catch (e) {
      console.error('Failed to load announcements:', e);
      setError(e.message || 'Gagal memuat pengumuman');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      loadData();
    }
  }, [isOpen, initialTab]);

  const calculateExpiresAt = () => {
    if (expiryPreset === 'FOREVER') return null;
    if (expiryPreset === 'CUSTOM') return customExpiresAt ? new Date(customExpiresAt).toISOString() : null;
    const d = new Date();
    if (expiryPreset === '1D') d.setDate(d.getDate() + 1);
    else if (expiryPreset === '3D') d.setDate(d.getDate() + 3);
    else if (expiryPreset === '7D') d.setDate(d.getDate() + 7);
    else if (expiryPreset === '14D') d.setDate(d.getDate() + 14);
    else if (expiryPreset === '30D') d.setDate(d.getDate() + 30);
    return d.toISOString();
  };

  const handleOpenReaders = async (ann) => {
    setSelectedAnnouncement(ann);
    setActiveTab('READERS');
    setLoadingReaders(true);
    try {
      const report = await getAnnouncementReaders(ann.id);
      setReadersReport(report);
    } catch (e) {
      showToast('Gagal memuat laporan pembaca: ' + e.message, 'error');
    } finally {
      setLoadingReaders(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('PIN General Manager (8980) wajib diisi untuk otorisasi penerbitan.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setFormSuccess(null);

    try {
      const computedExpiry = calculateExpiresAt();
      await createAnnouncement({
        pin: pin.trim(),
        title: title.trim(),
        content: content.trim(),
        urgency,
        targetVenue,
        expiresAt: computedExpiry,
        images
      });

      setFormSuccess('Pengumuman resmi berhasil diterbitkan ke semua portal staf!');
      setTitle('');
      setContent('');
      setImages([]);
      setExpiryPreset('FOREVER');
      setCustomExpiresAt('');
      await loadData();
      if (onAnnouncementChanged) onAnnouncementChanged();
      setTimeout(() => {
        setFormSuccess(null);
        setActiveTab('LIST');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Gagal membuat pengumuman.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (ann) => {
    if (!isGM) {
      showToast('Hanya General Manager yang berwenang mengaktifkan / mengarsipkan pengumuman.', 'warning');
      return;
    }
    const nextState = !ann.is_active;
    if (!window.confirm(`Yakin ingin ${nextState ? 'mengaktifkan kembali' : 'mengarsipkan'} pengumuman "${ann.title}"?`)) {
      return;
    }

    try {
      await updateAnnouncement(ann.id, {
        pin: adminAuth?.pin || '8980',
        isActive: nextState
      });
      await loadData();
      if (onAnnouncementChanged) onAnnouncementChanged();
      showToast(`Pengumuman berhasil ${nextState ? 'diaktifkan kembali' : 'diarsipkan'}.`, 'success');
    } catch (e) {
      showToast('Gagal mengubah status pengumuman: ' + e.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <Megaphone className="w-5 h-5 text-amber-300 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Pengumuman Resmi Management
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/40 text-blue-100 font-bold">
                  {isGM ? 'Hak Akses GM Penuh' : 'Mode Pengawas (View Report)'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-bold">
                Broadcast SOP, instruksi kerja, dan pantau bukti baca staf secara transparan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('LIST')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition ${
                activeTab === 'LIST'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Daftar Pengumuman ({announcements.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('CREATE');
                setError(null);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition ${
                activeTab === 'CREATE'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Buat Pengumuman Baru</span>
            </button>

            {activeTab === 'READERS' && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-purple-100 text-purple-900 border border-purple-300">
                Laporan Pembaca: {selectedAnnouncement?.title}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-bold text-slate-800">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 font-bold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* TAB 1: DAFTAR PENGUMUMAN */}
          {activeTab === 'LIST' && (
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6">
                  <Megaphone className="w-12 h-12 mx-auto text-blue-500" />
                  <div>
                    <p className="font-black text-slate-900 text-base">Belum Ada Pengumuman Diterbitkan</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Klik tombol di bawah untuk membuat pengumuman, SOP, atau instruksi kerja resmi ke seluruh dashboard staf.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('CREATE')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/25 transition inline-flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Pengumuman Sekarang</span>
                    </button>
                  </div>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                      ann.is_active
                        ? 'bg-white border-slate-300 shadow-sm'
                        : 'bg-slate-100 border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          ann.urgency === 'URGENT'
                            ? 'bg-rose-100 text-rose-950 border border-rose-300'
                            : 'bg-blue-100 text-blue-950 border border-blue-300'
                        }`}>
                          {ann.urgency === 'URGENT' ? '🚨 URGENT' : '📢 INFO'}
                        </span>

                        <span className="text-[11px] font-black text-slate-900">
                          {ann.target_venue === 'ALL' ? '🌐 Semua Outlet' : `📍 ${ann.target_venue}`}
                        </span>

                        {ann.expires_at && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            new Date() > new Date(ann.expires_at)
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {new Date() > new Date(ann.expires_at)
                              ? '⚠️ Telah Kedaluwarsa'
                              : `⏳ Berlaku s/d: ${formatWitaDateTime(ann.expires_at)}`}
                          </span>
                        )}

                        {!ann.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-200 text-slate-700">
                            Diarsipkan
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono">
                        Dibuat: {formatWitaDateTime(ann.created_at)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-950 leading-snug">
                        {ann.title}
                      </h4>
                      <p className="text-xs text-slate-700 font-medium mt-1 line-clamp-2 whitespace-pre-line">
                        {ann.content}
                      </p>

                      {/* Attached Promo Flyers / Images Thumbnails */}
                      {Array.isArray(ann.images) && ann.images.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {ann.images.map((imgUrl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setZoomPhoto(imgUrl)}
                              className="w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-300 hover:border-blue-600 bg-slate-950 shadow-sm relative group cursor-pointer transition"
                              title="Klik untuk zoom / perbesar flyer"
                            >
                              <img src={imgUrl} alt={`Flyer ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <Eye className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                            📎 {ann.images.length} Flyer / Gambar Promo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer / Read Receipts Bar & Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-600 font-bold">Laporan Membaca:</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-300 font-black">
                          {ann.totalReads || 0} Staf Telah Membaca
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReaders(ann)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-xs font-black transition flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Bukti Baca</span>
                        </button>

                        {isGM && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(ann)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition"
                            title={ann.is_active ? 'Arsipkan pengumuman' : 'Aktifkan kembali'}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: BUAT PENGUMUMAN BARU (GENERAL MANAGER ONLY) */}
          {activeTab === 'CREATE' && (
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs font-bold space-y-1">
                <div className="flex items-center space-x-1.5 font-black text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Otoritas Khusus General Manager:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Pengumuman yang Anda buat akan langsung terkirim secara realtime ke seluruh dashboard staf saat mereka login, lengkap dengan tombol <strong>"Saya Mengerti"</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  Judul Pengumuman: <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Standar Operasional Kebersihan Meja & Toilet Shift Malam"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    Tingkat Urgensi:
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600"
                  >
                    <option value="NORMAL">📌 Biasa (Tampil di Banner Kiosk)</option>
                    <option value="URGENT">🚨 PENTING / URGENT (Wajib Pop-Up Langsung Saat Login)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    Target Outlet:
                  </label>
                  <select
                    value={targetVenue}
                    onChange={(e) => setTargetVenue(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600"
                  >
                    <option value="ALL">🌐 Semua Outlet (JP Karaoke &amp; LuckyCat)</option>
                    <option value="JP Karaoke">🎤 Khusus JP Karaoke</option>
                    <option value="LuckyCat">🐱 Khusus LuckyCat Billiard</option>
                  </select>
                </div>
              </div>

              {/* Masa Berlaku Pengumuman */}
              <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-900">
                    Masa Berlaku Pengumuman:
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Otomatis kedaluwarsa setelah batas waktu
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpiryPreset('FOREVER')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-black transition ${
                      expiryPreset === 'FOREVER'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Selamanya (Manual)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryPreset('1D')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-black transition ${
                      expiryPreset === '1D'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    1 Hari (24 Jam)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryPreset('7D')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-black transition ${
                      expiryPreset === '7D'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    7 Hari (1 Minggu)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryPreset('30D')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-black transition ${
                      expiryPreset === '30D'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    30 Hari (1 Bulan)
                  </button>
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpiryPreset('CUSTOM')}
                    className={`py-1.5 px-3 rounded-lg border text-[10px] font-black transition shrink-0 ${
                      expiryPreset === 'CUSTOM'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Pilih Tanggal &amp; Jam Kustom
                  </button>
                  {expiryPreset === 'CUSTOM' && (
                    <input
                      type="datetime-local"
                      value={customExpiresAt}
                      onChange={(e) => setCustomExpiresAt(e.target.value)}
                      required={expiryPreset === 'CUSTOM'}
                      className="bg-white border-2 border-purple-400 rounded-xl px-2.5 py-1 text-xs font-black text-slate-950 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  Isi Pesan Pengumuman: <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan instruksi, arahan, ketentuan promo, atau SOP lengkap untuk staf..."
                  required
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white leading-relaxed"
                />
              </div>

              {/* Lampiran Foto / Flyer Promo (Bisa Lebih dari 1) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <label className="text-xs font-black text-slate-900">
                      Lampiran Foto / Flyer Promo (Opsional):
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Bisa unggah lebih dari 1 gambar
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2.5 items-center">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-slate-300 overflow-hidden bg-slate-900 shadow-sm cursor-pointer"
                      onClick={() => setZoomPhoto(imgUrl)}
                      title="Klik untuk memperbesar / zoom"
                    >
                      <img src={imgUrl} alt={`Flyer ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(idx);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition"
                        title="Hapus gambar"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                        Foto {idx + 1}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/60 hover:bg-blue-100/60 flex flex-col items-center justify-center text-blue-700 transition p-2 text-center"
                  >
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-black leading-tight">Tambah Flyer / Foto</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  PIN Otorisasi General Manager:
                </label>
                <div className="relative max-w-xs">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN GM (8980)"
                    required
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-black text-slate-950 tracking-widest focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-black text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !content.trim() || !pin.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 transition flex items-center space-x-1.5"
                >
                  <Megaphone className="w-4 h-4 text-amber-300" />
                  <span>{submitting ? 'Menerbitkan...' : 'Terbitkan Pengumuman Resmi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: DETAIL LAPORAN PEMBACA */}
          {activeTab === 'READERS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                <div>
                  <h4 className="text-sm font-black text-slate-950">{selectedAnnouncement?.title}</h4>
                  <span className="text-[11px] text-slate-500 font-bold">
                    Diterbitkan: {formatWitaDateTime(selectedAnnouncement?.created_at)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-xs text-center">
                    <div>{readersReport?.read_count || 0} / {readersReport?.total_active_staff || 0}</div>
                    <div className="text-[9px] uppercase tracking-wider text-emerald-800">Membaca ({readersReport?.percentage || 0}%)</div>
                  </div>
                </div>
              </div>

              {/* Filter Readers vs Unread */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setReaderFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    readerFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua Staf ({readersReport?.total_active_staff || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setReaderFilter('READ')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    readerFilter === 'READ'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  🟢 Sudah Membaca ({readersReport?.read_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setReaderFilter('UNREAD')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    readerFilter === 'UNREAD'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-900 hover:bg-rose-100'
                  }`}
                >
                  🔴 Belum Membaca ({(readersReport?.total_active_staff || 0) - (readersReport?.read_count || 0)})
                </button>
              </div>

              {loadingReaders ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="font-bold text-xs">Memuat daftar kepatuhan pembaca...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {/* Read List */}
                  {(readerFilter === 'ALL' || readerFilter === 'READ') && (readersReport?.readers || []).map((r) => (
                    <div
                      key={r.staff_id}
                      className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-300 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-black text-slate-950 text-xs">{r.staff_name}</div>
                          <div className="text-[10px] text-slate-600 font-bold">{r.staff_venue} • {r.staff_division}</div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono font-bold text-emerald-900">
                        <div>{formatWitaDateTime(r.read_at)}</div>
                        <span className="text-[9px] uppercase font-black text-emerald-700">Sudah Baca ✓</span>
                      </div>
                    </div>
                  ))}

                  {/* Unread List */}
                  {(readerFilter === 'ALL' || readerFilter === 'UNREAD') && (readersReport?.unread || []).map((u) => (
                    <div
                      key={u.staff_id}
                      className="p-3 rounded-xl bg-rose-50/60 border border-rose-300 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <div className="font-black text-slate-950 text-xs">{u.staff_name}</div>
                          <div className="text-[10px] text-slate-600 font-bold">{u.staff_venue} • {u.staff_division}</div>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200">
                        Belum Baca ✕
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-black text-slate-700"
                >
                  ← Kembali ke Daftar Pengumuman
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 transition"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Fullscreen Zoomable Flyer Lightbox Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/95 flex flex-col items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-2 mb-2 border-b border-white/20">
              <span className="text-xs font-black flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-amber-300" />
                <span>Pratinjau Flyer / Dokumen Pengumuman</span>
              </span>
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition flex items-center space-x-1"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span className="text-xs font-black">Tutup</span>
              </button>
            </div>
            <ZoomableImage src={zoomPhoto} alt="Flyer Promo Pengumuman" maxHeight="max-h-[82vh]" className="rounded-2xl border border-white/20" />
          </div>
        </div>
      )}
    </div>
  );
}
