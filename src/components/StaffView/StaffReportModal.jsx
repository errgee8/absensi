import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, X, ShieldAlert, Camera, Upload, AlertTriangle, CheckCircle2, Loader2, Lock, Eye, Clock, Award, History, MessageSquare, ChevronRight } from 'lucide-react';
import { submitStaffReport, getMyStaffReports } from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';

const REPORT_CATEGORIES = [
  'Kecurangan Kasir / Finansial / Bill',
  'Pelanggaran SOP / Titip Absen / Jam Kerja',
  'Perilaku Buruk / Intimidasi Leader / Senioritas',
  'Kerusakan / Masalah Fasilitas Meja',
  'Lainnya (Rahasia)'
];

export default function StaffReportModal({ staff, isOpen, onClose, onSuccess }) {
  if (!isOpen || !staff) return null;

  const [activeTab, setActiveTab] = useState('NEW'); // 'NEW' | 'MY_REPORTS'
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // My Reports State
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const fileInputRef = useRef(null);

  const loadMyReports = async () => {
    if (!staff?.id) return;
    try {
      setLoadingReports(true);
      const data = await getMyStaffReports(staff.id);
      setMyReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Gagal memuat status laporan staf:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadMyReports();
  }, [staff?.id]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      setErrorMsg(null);
    };
    reader.onerror = () => setErrorMsg('Gagal memproses file foto.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Mohon isi rincian kronologi laporan kejadian.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitStaffReport({
        staffId: staff.id,
        venue: staff.venue || 'LuckyCat',
        category,
        title: title.trim() || `Laporan ${category}`,
        description: description.trim(),
        photoBase64: photoPreview,
        isAnonymous
      });

      setSuccessMsg(res.message || 'Laporan berhasil terkirim langsung ke Manajer.');
      setTitle('');
      setDescription('');
      setPhotoPreview(null);
      loadMyReports();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('MY_REPORTS');
      }, 1600);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'VALID_REWARDED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Valid &amp; Diberi Reward
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Sudah Terselesaikan
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-black flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Sedang Diinvestigasi
          </span>
        );
      case 'NEED_MORE_PROOF':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Butuh Bukti Lebih Lanjut
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600 text-[11px] font-bold flex items-center gap-1">
            <X className="w-3.5 h-3.5" />
            Tidak Valid / Ditutup
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            Menunggu Tinjauan
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#181d26] border border-rose-500/40 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-rose-950/80 via-[#1b151f] to-[#12161f] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>🚨 Pusat Laporan &amp; Aduan Staf</span>
              </h3>
              <p className="text-[10px] text-rose-300 font-medium">Kerahasiaan Terjamin • Ditinjau Langsung oleh Manajer</p>
            </div>
          </div>
          {!submitting && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-800/80 bg-[#141822] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('NEW')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'NEW'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Buat Laporan Baru</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('MY_REPORTS');
              loadMyReports();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer relative ${
              activeTab === 'MY_REPORTS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Status &amp; Tindak Lanjut</span>
            {myReports.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {myReports.length}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'NEW' ? (
            successMsg ? (
              <div className="py-8 text-center space-y-3 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-base font-black text-white">Laporan Berhasil Terkirim!</h4>
                <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                  {successMsg}
                </p>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-300 font-bold max-w-xs mx-auto">
                  ✓ Laporan valid dan bermanfaat bagi manajemen akan mendapatkan <strong>Poin Apresiasi Tambahan</strong>.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Privacy Shield Info Banner */}
                <div className="bg-rose-950/60 border border-rose-500/35 rounded-2xl p-3 space-y-1">
                  <div className="flex items-center space-x-1.5 text-rose-300 font-black text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Kerahasiaan &amp; Proteksi Identitas</span>
                  </div>
                  <p className="text-[10.5px] text-slate-200 leading-relaxed font-medium">
                    Gunakan form ini untuk melaporkan kecurangan kasir, pelanggaran SOP, atau kelakuan buruk rekan/leader. Laporan yang terbukti valid akan diberikan <strong>Poin Apresiasi</strong> oleh Manajemen.
                  </p>
                </div>

                {/* Mode Kerahasiaan (Anonim vs Umum) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Pilihan Kerahasiaan Pelapor:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(true)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2 ${
                        isAnonymous
                          ? 'bg-rose-950/80 border-rose-400 text-rose-200 ring-1 ring-rose-400 shadow-md'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Lock className={`w-4 h-4 shrink-0 mt-0.5 ${isAnonymous ? 'text-rose-400' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <span className="font-bold block text-[11px]">Anonim</span>
                        <span className="text-[9.5px] leading-tight block text-slate-300">
                          Nama dirahasiakan penuh dari rekan floor.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAnonymous(false)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2 ${
                        !isAnonymous
                          ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 ring-1 ring-indigo-400 shadow-md'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye className={`w-4 h-4 shrink-0 mt-0.5 ${!isAnonymous ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <span className="font-bold block text-[11px]">Terbuka</span>
                        <span className="text-[9.5px] leading-tight block text-slate-300">
                          Nama saya ditampilkan secara normal.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">Kategori Laporan:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-400"
                  >
                    {REPORT_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">Perihal / Judul Singkat:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Titip Absen Meja Kasir / Pemalsuan Nota"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Detail Kronologi Kejadian <span className="text-rose-400">*</span>:
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Jelaskan secara rinci: Kapan kejadian terjadi, siapa saja yang terlibat, dan bagaimana kronologinya..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl p-3 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-400 leading-relaxed"
                  />
                </div>

                {/* Upload Foto / Bukti */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Foto Bukti / Dokumen (Opsional):
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {photoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center group">
                      <img src={photoPreview} alt="Bukti Foto" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white transition cursor-pointer"
                        title="Hapus Foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-700 hover:border-rose-400/60 bg-[#12161f] text-slate-300 hover:text-white flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-semibold">Lampirkan Foto Bukti / Kamera</span>
                    </button>
                  )}
                </div>

                {/* Error Alert */}
                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4" />
                        <span>Kirim Laporan Rahasia</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* TAB 2: STATUS & TINDAK LANJUT ADUAN */
            <div className="space-y-3">
              {loadingReports ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                  <p className="text-xs font-bold">Memeriksa status laporan...</p>
                </div>
              ) : myReports.length === 0 ? (
                <div className="py-12 text-center bg-[#12161f] border border-slate-800 rounded-2xl p-6 space-y-2">
                  <ShieldAlert className="w-10 h-10 mx-auto text-slate-500" />
                  <h4 className="text-sm font-black text-white">Belum Ada Laporan Tercatat</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Anda belum pernah mengirim aduan atau laporan kejadian. Gunakan tombol 'Buat Laporan Baru' jika menemukan indikasi pelanggaran SOP.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 font-bold px-1 flex items-center justify-between">
                    <span>Daftar Aduan Anda ({myReports.length})</span>
                    <button
                      type="button"
                      onClick={loadMyReports}
                      className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      Segarkan ↻
                    </button>
                  </div>

                  {myReports.map((r) => {
                    const managerFeedback = r.manager_note || r.management_note;
                    return (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-2xl bg-[#12161f] border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {r.category || 'Laporan Umum'}
                            </span>
                            <h4 className="text-xs font-black text-white mt-0.5">
                              {r.title || 'Laporan Tanpa Judul'}
                            </h4>
                          </div>
                          <div>{renderStatusBadge(r.status)}</div>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed bg-[#161b26] p-2.5 rounded-xl border border-slate-800/80">
                          {r.description}
                        </p>

                        {/* Manager Feedback / Note Alert */}
                        {managerFeedback && (
                          <div className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-500/35 text-[11px] space-y-1">
                            <div className="flex items-center gap-1.5 text-indigo-300 font-black">
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>Tindak Lanjut &amp; Instruksi Manajer:</span>
                            </div>
                            <p className="text-slate-200 leading-relaxed font-medium pl-5">
                              "{managerFeedback}"
                            </p>
                          </div>
                        )}

                        {/* Reward Points Alert */}
                        {r.reward_points > 0 && (
                          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/35 text-[11px] text-emerald-300 font-black flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              Apresiasi Manajemen: <strong>+{r.reward_points} Poin Leaderboard</strong> telah ditambahkan ke profil Anda!
                            </span>
                          </div>
                        )}

                        {/* Meta & Photo Footer */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                          <span>
                            Dikirim: {r.created_at ? formatWitaDateTime(r.created_at) : 'Baru saja'}
                          </span>

                          {r.photo_url && (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(r.photo_url)}
                              className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Lihat Bukti Foto</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo Modal Preview if clicked */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="relative max-w-lg w-full bg-[#181d26] rounded-2xl overflow-hidden border border-slate-700">
              <div className="p-3 bg-black flex items-center justify-between">
                <span className="text-xs font-bold text-white">Foto Bukti Terlampir</span>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img src={selectedPhoto} alt="Bukti" className="w-full max-h-[70vh] object-contain bg-black" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
