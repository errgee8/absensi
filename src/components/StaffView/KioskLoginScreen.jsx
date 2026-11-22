import React, { useState, useEffect } from 'react';
import { Lock, Delete, AlertCircle, Loader2, Trophy, Clock, QrCode, Megaphone, BookOpen, Smartphone, X, ShieldAlert, CheckCircle2, Coffee, FileText, Star, ChevronRight } from 'lucide-react';

export default function KioskLoginScreen({
  pin,
  setPin,
  onLogin,
  onOpenAdminAuth,
  onOpenLeaderboard,
  loading,
  error,
  directToiletLocation,
  publicAnnouncements = [],
  onOpenAnnouncement
}) {
  const [liveTime, setLiveTime] = useState(() => new Date());
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideTab, setGuideTab] = useState('guide'); // 'guide' | 'install'

  // Real-time live WITA clock ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(liveTime);

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(liveTime);

  // Keyboard navigation for physical numpad / keyboard typing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loading) return;
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          const nextPin = pin + e.key;
          setPin(nextPin);
          if (nextPin.length === 4) {
            onLogin(nextPin);
          }
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setPin('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading, onLogin, setPin]);

  // Numpad click
  const handleNumClick = (val) => {
    if (loading) return;
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      // Auto submit immediately on 4 digits
      if (nextPin.length === 4) {
        onLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
  };

  return (
    <div className="max-w-md mx-auto pt-3 pb-8">
      {/* Header Banner - Elegant Dark Theme */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/25 mb-3 border border-blue-400/30">
          <Lock className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Staff Portal
        </h2>
        <p className="text-sm sm:text-base text-blue-400 font-semibold mt-0.5">
          Lucky Cat &amp; JP Executive Karaoke
        </p>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Sistem Terintegrasi: Absensi Digital &amp; Checklist Toilet
        </p>
      </div>

      {/* Live WITA Digital Clock Banner */}
      <div className="mb-4 flex items-center justify-center">
        <div className="inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-[#141822] text-white shadow-md border border-slate-800">
          <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-emerald-400">
            {timeStr} <span className="text-xs font-semibold text-slate-400">WITA</span>
          </span>
          <span className="text-[11px] font-medium text-slate-400 border-l border-slate-700/80 pl-2.5 hidden sm:inline">
            {dateStr}
          </span>
        </div>
      </div>

      {/* Active Management Announcement Banner (Public Bulletin) */}
      {publicAnnouncements && publicAnnouncements.length > 0 && (
        <div
          onClick={() => onOpenAnnouncement && onOpenAnnouncement(publicAnnouncements[0])}
          className="w-full mb-4 p-3.5 rounded-3xl bg-gradient-to-r from-rose-500/25 via-amber-500/20 to-rose-500/25 hover:from-rose-500/35 hover:to-amber-500/30 border-2 border-amber-400/60 shadow-xl shadow-amber-950/30 cursor-pointer transition-all active:scale-[0.98] group animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center space-x-3 text-left min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-400/40 animate-pulse">
                <Megaphone className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    publicAnnouncements[0].urgency === 'URGENT'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-amber-400 text-slate-950'
                  }`}>
                    {publicAnnouncements[0].urgency === 'URGENT' ? '🚨 PENTING / URGENT' : '📢 PENGUMUMAN MANAJEMEN'}
                  </span>
                  {publicAnnouncements.length > 1 && (
                    <span className="text-[10px] text-amber-300 font-bold">
                      +{publicAnnouncements.length - 1} lainnya
                    </span>
                  )}
                </div>
                <div className="text-xs font-black text-white truncate mt-1 group-hover:text-amber-300 transition">
                  {publicAnnouncements[0].title}
                </div>
                <div className="text-[10.5px] text-slate-300 line-clamp-1 mt-0.5">
                  {publicAnnouncements[0].content}
                </div>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-400 group-hover:bg-amber-300 text-slate-950 text-xs font-black shrink-0 transition shadow-md shadow-amber-400/20">
              Baca →
            </span>
          </div>
        </div>
      )}

      {/* Luxurious Real-time Leaderboard Teaser Banner */}
      {onOpenLeaderboard && (
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full mb-4 p-3.5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/25 text-amber-200 border border-amber-400/30 transition-all active:scale-[0.98] flex items-center justify-between group shadow-lg shadow-black/20"
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-[#10141d] text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30 shadow-inner">
              <Trophy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300/90 block leading-tight">
                🏆 Papan Peringkat Prestasi
              </span>
              <span className="text-xs sm:text-sm font-bold text-white leading-tight block">
                Leaderboard Staf Terajin (Bonus Bulanan) →
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#10141d] text-amber-300 text-[10px] font-bold shrink-0 hidden sm:inline border border-amber-400/30">
            Live Top 5
          </span>
        </button>
      )}

      <div className="bg-[#161b24] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40 space-y-6">
        {/* Direct Toilet Scan Notice */}
        {directToiletLocation && (
          <div className="p-3.5 bg-teal-950/50 border border-teal-500/40 rounded-2xl flex items-center space-x-3 text-xs animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-teal-300 font-bold">Checklist {directToiletLocation.name}</div>
              <div className="text-slate-400 text-[11px] truncate">
                Ketik PIN Anda untuk otomatis mengisi checklist atas nama Anda
              </div>
            </div>
          </div>
        )}

        {/* PIN Prompt & Visual Indicator Dots */}
        <div className="text-center space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Masukkan PIN Staf (4 Digit)
          </label>

          {/* 4 PIN Dots */}
          <div className="flex justify-center items-center space-x-3.5 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                    isFilled
                      ? 'bg-blue-500 border-blue-400 scale-125 shadow-md shadow-blue-500/50'
                      : 'bg-[#0f131a] border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          <div className="h-4">
            <span className="text-xs text-slate-400 font-mono font-medium tracking-widest">
              {pin ? '●'.repeat(pin.length) : 'Ketik 4 digit PIN Anda di tombol bawah'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-3 text-rose-200 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Numpad 3x4 Grid - Dark Grey Keys with Crisp Numbers */}
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => handleNumClick(String(num))}
              className="h-16 rounded-2xl bg-[#1e2533] border border-slate-700/70 text-2xl font-bold text-white hover:bg-blue-600 hover:border-blue-500 active:bg-blue-700 active:scale-95 transition flex items-center justify-center shadow-xs focus:outline-none"
            >
              {num}
            </button>
          ))}

          {/* Reset / Clear Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleClear}
            className="h-16 rounded-2xl bg-[#12161f] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition flex items-center justify-center text-xs font-bold uppercase tracking-wider"
          >
            Hapus
          </button>

          {/* Number 0 */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleNumClick('0')}
            className="h-16 rounded-2xl bg-[#1e2533] border border-slate-700/70 text-2xl font-bold text-white hover:bg-blue-600 hover:border-blue-500 active:bg-blue-700 active:scale-95 transition flex items-center justify-center shadow-xs focus:outline-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-[#12161f] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition flex items-center justify-center"
            title="Hapus Satu Angka"
          >
            <Delete className="w-6 h-6 stroke-[2]" />
          </button>
        </div>

        {/* Auto-verifying Loading Indicator */}
        {loading && (
          <div className="py-3.5 px-4 rounded-2xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center space-x-2 animate-pulse shadow-md shadow-blue-600/30">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Memverifikasi PIN Staf...</span>
          </div>
        )}

        {/* Cara Menggunakan & Download Aplikasi Button */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setGuideTab('guide');
              setGuideModalOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#141822] hover:bg-[#1a2130] border border-slate-800 hover:border-slate-700 text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center justify-center space-x-2 transition shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Cara Menggunakan &amp; Download Aplikasi</span>
          </button>
        </div>
      </div>

      {/* Panduan Penggunaan & Download Aplikasi Modal */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-100">
          <div className="bg-[#12161f] border-2 border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-sm">
                  <BookOpen className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Panduan Staff Portal</h3>
                  <p className="text-xs text-blue-300 font-bold">Lucky Cat Billiard &amp; JP Executive Karaoke</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="p-2.5 bg-[#0e121a] border-b border-slate-800 flex space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setGuideTab('guide')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer ${
                  guideTab === 'guide'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#161b24] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Tata Cara &amp; Fitur</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('install')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer ${
                  guideTab === 'install'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#161b24] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Cara Download di HP</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
              
              {/* TAB 1: PANDUAN PENGGUNAAN */}
              {guideTab === 'guide' && (
                <div className="space-y-3.5 animate-fade-in">
                  
                  {/* Section 1: Login */}
                  <div className="p-3.5 rounded-2xl bg-[#161b24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2 text-blue-400 font-black text-xs">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>1. Login &amp; Keamanan PIN</span>
                    </div>
                    <p className="text-slate-300">
                      Masukkan <strong>4-Digit PIN pribadi</strong> yang diberikan Manajer. Jaga kerahasiaan PIN Anda dan dilarang membagikan PIN kepada siapa pun.
                    </p>
                  </div>

                  {/* Section 2: Absensi */}
                  <div className="p-3.5 rounded-2xl bg-[#161b24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2 text-emerald-400 font-black text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>2. Absensi Masuk &amp; Pulang (Check-In / Out)</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 list-disc pl-4">
                      <li><strong>Foto Selfie Wajib</strong>: Foto langsung di outlet dengan pencahayaan cukup dan wajah terlihat jelas tanpa masker.</li>
                      <li><strong>GPS &amp; WiFi</strong>: Wajib mengaktifkan GPS dan terhubung ke jaringan outlet.</li>
                      <li><strong>Toleransi Keterlambatan (Grace Period 10 Menit)</strong>: Sistem memberikan toleransi 10 menit dari jam shift Anda. Jika lewat dari 10 menit, wajib mengisi form alasan telat dan foto bukti.</li>
                      <li><strong>Absen Pulang</strong>: Tombol check-out otomatis terbuka <strong>30 menit sebelum shift berakhir</strong>. Jangan lupa check-out sebelum pulang.</li>
                    </ul>
                  </div>

                  {/* Section 3: Istirahat & Toilet */}
                  <div className="p-3.5 rounded-2xl bg-[#161b24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2 text-amber-400 font-black text-xs">
                      <Coffee className="w-4 h-4 shrink-0" />
                      <span>3. Istirahat &amp; Checklist Toilet (Per 2 Jam)</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 list-disc pl-4">
                      <li><strong>Istirahat</strong>: Bagi shift yang memiliki jam istirahat, tekan tombol <em>Mulai Istirahat</em> saat keluar dan <em>Selesai Istirahat</em> saat kembali bertugas.</li>
                      <li><strong>Scan QR Toilet</strong>: Petugas kebersihan/staf bertugas wajib scan QR di masing-masing toilet <strong>tiap 2 jam sekali</strong> untuk verifikasi kebersihan berkala.</li>
                    </ul>
                  </div>

                  {/* Section 4: Pengajuan & Poin */}
                  <div className="p-3.5 rounded-2xl bg-[#161b24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2 text-rose-400 font-black text-xs">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>4. Pengajuan Izin/Cuti &amp; Sistem Poin</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 list-disc pl-4">
                      <li><strong>Pengajuan</strong>: Izin, Cuti, Sakit (wajib surat dokter), dan Pulang Awal diajukan via tombol <em>Pengajuan</em> untuk ditinjau oleh Manajer.</li>
                      <li><strong>Siklus Poin (Cut-off Tgl 16)</strong>: Poin pelanggaran dan poin plus dihitung dari <strong>tanggal 16 s/d tanggal 15 bulan berikutnya</strong>, dan reset otomatis ke 0 setiap tanggal 16.</li>
                    </ul>
                  </div>

                  {/* Section 5: Peraturan Tegas */}
                  <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1.5 text-rose-200">
                    <div className="flex items-center space-x-2 font-black text-xs text-rose-300">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>5. Peraturan &amp; Sanksi Tegas</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      • <strong>Dilarang keras titip absen</strong> atau memalsukan lokasi/foto (dikenakan sanksi Surat Peringatan / SP).<br />
                      • Jika lupa check-out, sistem otomatis menutup sesi pada <strong>cut-off pukul 07:00 WITA</strong> dengan status pelanggaran lupa absen pulang.
                    </p>
                  </div>

                </div>
              )}

              {/* TAB 2: CARA DOWNLOAD PWA */}
              {guideTab === 'install' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Android Chrome */}
                  <div className="p-4 rounded-2xl bg-[#161b24] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-emerald-400 flex items-center gap-1.5">
                        🤖 Pengguna Android (Google Chrome)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Rekomendasi
                      </span>
                    </div>
                    <ol className="space-y-2 text-slate-300 list-decimal pl-4">
                      <li>Buka link Staff Portal menggunakan browser <strong>Google Chrome</strong>.</li>
                      <li>Di pojok kanan atas, tekan icon <strong>Titik Tiga ( ⋮ )</strong>.</li>
                      <li>Pilih menu <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.</li>
                      <li>Tekan <strong>"Instal" / "Tambah"</strong> pada kotak konfirmasi.</li>
                      <li>Icon aplikasi Staff Portal akan langsung muncul di menu utama HP Anda seperti aplikasi biasa.</li>
                    </ol>
                  </div>

                  {/* iPhone Safari */}
                  <div className="p-4 rounded-2xl bg-[#161b24] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-blue-400 flex items-center gap-1.5">
                        🍎 Pengguna iPhone / iPad (Safari)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30">
                        Wajib Safari
                      </span>
                    </div>
                    <ol className="space-y-2 text-slate-300 list-decimal pl-4">
                      <li>Buka link Staff Portal <strong>wajib menggunakan browser Safari</strong> (bukan dari Chrome atau browser dalam WhatsApp).</li>
                      <li>Di bagian bawah tengah layar, tekan tombol <strong>Share</strong> (icon kotak dengan panah ke atas <span className="font-mono">[↑]</span>).</li>
                      <li>Gulir ke bawah dan pilih menu <strong>"Add to Home Screen" (Tambahkan ke Layar Utama / icon ⊞)</strong>.</li>
                      <li>Di pojok kanan atas layar, tekan tombol <strong>"Add" (Tambah)</strong>.</li>
                      <li>Aplikasi siap dibuka langsung dari layar depan iPhone Anda.</li>
                    </ol>
                  </div>

                  {/* Izin Akses */}
                  <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] leading-relaxed">
                    <strong>PENTING:</strong> Saat pertama kali membuka aplikasi, pastikan memilih <strong>"Izinkan"</strong> saat browser meminta izin <strong>Kamera</strong> dan <strong>Lokasi (GPS)</strong> agar absensi selfie dan scan QR berjalan lancar.
                  </div>

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-3 bg-[#0e121a] border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer shadow-md shadow-blue-600/30"
              >
                Tutup Panduan
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
