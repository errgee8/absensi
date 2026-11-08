import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Camera,
  Flame,
  Info,
  ShieldCheck,
  Building2
} from 'lucide-react';

export default function LeaderboardModal({ isOpen, onClose, currentStaff }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'toilet'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('Gagal mengambil data peringkat.');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const period = data?.period;
  const attendanceList = data?.attendance || [];
  const toiletList = data?.toilet || [];

  const currentList = activeTab === 'attendance' ? attendanceList : toiletList;
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];
  const restList = showAll ? currentList.slice(3) : currentList.slice(3, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border-2 border-amber-400/40 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col max-h-[92vh] text-white relative">
        
        {/* Glow ambient background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-gradient-to-b from-amber-500/20 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Modal Top Header - Luxurious Gold & Obsidian */}
        <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-slate-950/90 relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 shrink-0">
              <Trophy className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm sm:text-base font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  LEADERBOARD STAF TERAJIN
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-Time MTD</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Periode Penilaian Bonus: <strong className="text-white">{period?.monthName || 'Bulan Berjalan'} (1 - {period?.endDate?.split('-')[2] || '30'})</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition shadow-sm disabled:opacity-50"
              title="Perbarui Data Real-time"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shadow-sm"
              title="Tutup"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Absensi vs Inspeksi Toilet */}
        <div className="p-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('attendance'); setShowAll(false); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl text-xs font-black transition relative overflow-hidden ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Peringkat Absensi &amp; Jam Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('toilet'); setShowAll(false); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl text-xs font-black transition relative overflow-hidden ${
              activeTab === 'toilet'
                ? 'bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/25 font-black'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>2. Peringkat Inspeksi Toilet QR</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 custom-scrollbar">

          {loading && !data && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-300">Menghitung poin dan data kedisiplinan staf secara real-time...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!loading && currentList.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada data aktivitas tercatat untuk periode ini.
            </div>
          )}

          {!loading && currentList.length > 0 && (
            <>
              {/* TOP 3 PODIUM DISPLAY */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-4 sm:p-5 relative overflow-hidden">
                <div className="text-center mb-4">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-300/80 flex items-center justify-center space-x-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>PODIUM TOP 3 KANDIDAT BONUS TERBAIK</span>
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end pt-4">
                  
                  {/* #2 SILVER (KIRI) */}
                  {top2 ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-2">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-400 text-slate-900 flex items-center justify-center font-black text-xl shadow-lg border-2 border-slate-300">
                          {top2.name.charAt(0)}
                        </div>
                        <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-300 text-slate-950 shadow border border-white">
                          #2
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                        {top2.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold truncate max-w-full">
                        {top2.role}
                      </span>
                      <div className="mt-2 w-full py-2 px-1 bg-slate-900/90 rounded-xl border border-slate-700/80 text-[10px]">
                        <span className="block font-mono font-black text-slate-200 text-xs">
                          {activeTab === 'attendance' ? `${top2.score} Pts` : `${top2.score} Pts`}
                        </span>
                        <span className="text-slate-400 text-[9px] block">
                          {activeTab === 'attendance'
                            ? `${top2.total_days}/26 Hari • Telat ${top2.total_late_minutes}m`
                            : `${top2.total_inspections}x Cek (${top2.pass_rate}%)`}
                        </span>
                      </div>
                    </div>
                  ) : <div />}

                  {/* #1 GOLD (TENGAH - JUARA UTAMA) */}
                  {top1 ? (
                    <div className="flex flex-col items-center text-center -translate-y-3 sm:-translate-y-4">
                      {/* Floating Crown Animation */}
                      <Crown className="w-7 h-7 text-amber-300 fill-amber-300 mb-1 animate-bounce" />
                      
                      <div className="relative mb-2">
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl sm:text-3xl shadow-xl shadow-amber-500/30 border-3 border-amber-200">
                          {top1.name.charAt(0)}
                        </div>
                        <span className="absolute -bottom-2.5 -right-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md border-2 border-white flex items-center space-x-0.5">
                          <span>🥇 #1</span>
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-amber-200 truncate max-w-full">
                        {top1.name}
                      </h4>
                      <span className="text-[10px] sm:text-xs text-amber-300/80 font-bold truncate max-w-full">
                        {top1.role} • {top1.venue}
                      </span>

                      <div className="mt-2.5 w-full py-2.5 px-2 bg-gradient-to-b from-amber-500/20 to-slate-900 rounded-xl border-2 border-amber-400/60 shadow-lg text-[10px]">
                        <span className="block font-mono font-black text-amber-300 text-sm sm:text-base">
                          {top1.score} POIN
                        </span>
                        <span className="text-slate-300 text-[10px] font-bold block mt-0.5">
                          {activeTab === 'attendance'
                            ? `${top1.total_days}/26 Hari • Telat ${top1.total_late_minutes}m ${top1.late_seconds_remainder}s`
                            : `${top1.total_inspections}x Inspeksi • ${top1.verified_photos_count} Foto`}
                        </span>
                        {activeTab === 'attendance' && top1.early_bird_count > 0 && (
                          <span className="inline-block mt-1 px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-200 text-[9px] font-black">
                            ⚡ Awal 30m: {top1.early_bird_30m_count}x
                          </span>
                        )}
                      </div>
                    </div>
                  ) : <div />}

                  {/* #3 BRONZE (KANAN) */}
                  {top3 ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-2">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-600 to-yellow-900 text-amber-100 flex items-center justify-center font-black text-xl shadow-lg border-2 border-amber-600">
                          {top3.name.charAt(0)}
                        </div>
                        <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-700 text-white shadow border border-amber-400">
                          #3
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                        {top3.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold truncate max-w-full">
                        {top3.role}
                      </span>
                      <div className="mt-2 w-full py-2 px-1 bg-slate-900/90 rounded-xl border border-slate-700/80 text-[10px]">
                        <span className="block font-mono font-black text-amber-400 text-xs">
                          {top3.score} Pts
                        </span>
                        <span className="text-slate-400 text-[9px] block">
                          {activeTab === 'attendance'
                            ? `${top3.total_days}/26 Hari • Telat ${top3.total_late_minutes}m`
                            : `${top3.total_inspections}x Cek (${top3.pass_rate}%)`}
                        </span>
                      </div>
                    </div>
                  ) : <div />}

                </div>
              </div>

              {/* LIST PERINGKAT 4, 5, DST */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Kandidat Peringkat Berikutnya:
                  </span>
                  {currentList.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAll(!showAll)}
                      className="text-xs font-black text-amber-400 hover:text-amber-300 underline"
                    >
                      {showAll ? 'Tampilkan Top 5 Saja' : `Lihat Semua (${currentList.length} Staf)`}
                    </button>
                  )}
                </div>

                {restList.map((item) => (
                  <div
                    key={item.staff_id || item.name}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-black text-xs text-slate-300 shrink-0">
                        #{item.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs sm:text-sm font-black text-white truncate">
                            {item.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                            • {item.role}
                          </span>
                        </div>

                        {activeTab === 'attendance' ? (
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/80 font-mono">
                              📅 {item.total_days}/26 Hari Kerja
                            </span>
                            <span className={`px-2 py-0.5 rounded-md border font-mono ${
                              item.total_late_seconds === 0
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border-rose-800'
                            }`}>
                              ⏱️ {item.total_late_seconds === 0 ? 'Telat 0m 0s (Tepat Waktu)' : `Telat ${item.total_late_minutes}m ${item.late_seconds_remainder}s`}
                            </span>
                            {item.early_bird_30m_count > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                                ⚡ Datang Awal: {item.early_bird_30m_count}x
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                              🧹 {item.total_inspections}x Inspeksi
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                              ✓ {item.pass_rate}% Lolos Pass
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                              📷 {item.verified_photos_count} Foto Terverifikasi
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base sm:text-lg font-black font-mono text-amber-300 block">
                        {item.score}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                        Poin
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* RULES & FAIR PLAY BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-slate-900 border border-amber-400/30 text-xs space-y-1.5">
                <div className="flex items-center space-x-1.5 text-amber-300 font-black">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Aturan Transparan Perhitungan Bonus Staf:</span>
                </div>
                {activeTab === 'attendance' ? (
                  <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5 leading-relaxed font-bold">
                    <li><strong>Hari Kerja (Maks 26 Hari)</strong>: Nilai dasar kehadiran hingga 100 poin penuh.</li>
                    <li><strong>Akurasi Keterlambatan</strong>: Mengurangi poin sesuai detik &amp; menit telat (-0.5 poin/menit).</li>
                    <li><strong>Datang Lebih Awal</strong>: Datang ≥ 15-30 menit sebelum shift memberikan bonus poin tambahan.</li>
                  </ul>
                ) : (
                  <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5 leading-relaxed font-bold">
                    <li><strong>10 Poin per Inspeksi</strong>: Tiap checklist toilet sukses (PASS) terverifikasi sistem.</li>
                    <li><strong>+3 Poin Bukti Foto</strong>: Foto kondisi toilet yang jelas dan terunggah otomatis.</li>
                    <li><strong>-5 Poin Penalti</strong>: Checklist bermasalah (FAIL) yang tidak segera dibersihkan.</li>
                  </ul>
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Bottom Close Button */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white font-black text-xs uppercase tracking-wider transition border border-slate-600 shadow-md"
          >
            Tutup Leaderboard
          </button>
        </div>

      </div>
    </div>
  );
}
