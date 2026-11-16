import React, { useState, useRef } from 'react';
import { Megaphone, X, ShieldAlert, Camera, Upload, AlertTriangle, CheckCircle2, Loader2, Lock, Eye } from 'lucide-react';
import { submitStaffReport } from '../../utils/api';

const REPORT_CATEGORIES = [
  'Kecurangan Kasir / Finansial / Bill',
  'Pelanggaran SOP / Titip Absen / Jam Kerja',
  'Perilaku Buruk / Intimidasi Leader / Senioritas',
  'Kerusakan / Masalah Fasilitas Meja',
  'Lainnya (Rahasia)'
];

export default function StaffReportModal({ staff, isOpen, onClose, onSuccess }) {
  if (!isOpen || !staff) return null;

  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fileInputRef = useRef(null);

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
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 2400);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#181d26] border border-rose-500/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]">
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

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {successMsg ? (
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
                  Gunakan form ini untuk melaporkan kecurangan, pelanggaran SOP, atau perilaku buruk rekan/leader. Laporan yang terbukti valid akan diberikan <strong>Poin Apresiasi</strong> oleh Manajemen.
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
                        Identitas dirahasiakan penuh dari rekan floor.
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
          )}
        </div>
      </div>
    </div>
  );
}
