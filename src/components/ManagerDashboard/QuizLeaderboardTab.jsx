import React, { useState, useEffect } from 'react';
import {
  Trophy,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Eye,
  User,
  X,
  Zap,
  Target,
  TrendingUp,
  Lightbulb,
  Award
} from 'lucide-react';
import { getQuizLeaderboard } from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';

export default function QuizLeaderboardTab({ adminAuth }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(''); // '' or 'ALL' or '2026-W48', etc.
  const [selectedVenue, setSelectedVenue] = useState('LuckyCat');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getQuizLeaderboard(selectedWeek, selectedVenue);
      setCurrentWeek(data.currentWeek || '');
      setAvailableWeeks(Array.isArray(data.availableWeeks) ? data.availableWeeks : []);
      // If selectedWeek was empty, sync to data.weekKey
      if (!selectedWeek && data.weekKey) {
        setSelectedWeek(data.weekKey);
      }
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setStats(data.stats || null);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat history dan evaluasi kuis produk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedWeek, selectedVenue]);

  const filteredList = leaderboard.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (item.staff_name || '').toLowerCase().includes(q);
      const matchRole = (item.staff_role || '').toLowerCase().includes(q);
      const matchDiag = (item.diagnostic?.weaknessSummary || '').toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchDiag) return false;
    }
    if (selectedGrade !== 'ALL') {
      const grade = item.diagnostic?.accuracyGrade || 'D';
      if (selectedGrade === 'A' && grade !== 'A') return false;
      if (selectedGrade === 'B' && grade !== 'B') return false;
      if (selectedGrade === 'C' && grade !== 'C') return false;
      if (selectedGrade === 'D' && grade !== 'D') return false;
      if (selectedGrade === 'NEEDS_COACHING' && (grade === 'A' || grade === 'B')) return false;
    }
    return true;
  });

  const formatDuration = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-[#1f1a14] to-[#121622] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
            <Trophy className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">
                📝 History &amp; Evaluasi Kuis Produk (Product Knowledge)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-black border border-amber-400/30">
                {selectedWeek === 'ALL' ? 'Semua Riwayat' : `Minggu ${selectedWeek || currentWeek || 'Aktif'}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-sans text-[11px] font-black border border-emerald-400/30">
                Khusus Tim LuckyCat • 1x Seminggu
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
              Memantau hasil kuis produk mingguan (10 soal / 8 menit) yang dapat dikerjakan staf secara fleksibel 1x per minggu (kapanpun termasuk saat waktu luang). Sistem menganalisis secara otomatis tingkat <strong>kecepatan</strong>, <strong>ketepatan</strong>, <strong>titik kelemahan materi</strong> (Bar, Kitchen, Billiard, SOP), serta memberikan <strong>rekomendasi tindakan perbaikan (improvement)</strong> bagi Manager.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLeaderboard}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer self-start md:self-center shrink-0 shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 2. Ringkasan Metrik / KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Partisipan */}
          <div className="bg-[#181d26] border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staf Kuis</div>
              <div className="text-lg font-black text-white">{stats.totalParticipants} Staf</div>
              <div className="text-[10px] text-slate-400">Periode {selectedWeek === 'ALL' ? 'Semua' : selectedWeek}</div>
            </div>
          </div>

          {/* Card 2: Rata-Rata Skor */}
          <div className="bg-[#181d26] border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Skor</div>
              <div className="text-lg font-black text-emerald-300">{stats.averageScore} / 100</div>
              <div className="text-[10px] text-slate-400">
                {stats.averageScore >= 80 ? 'Tingkat Pemahaman Baik' : 'Butuh Coaching Tambahan'}
              </div>
            </div>
          </div>

          {/* Card 3: Rata-Rata Waktu */}
          <div className="bg-[#181d26] border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Durasi</div>
              <div className="text-lg font-black text-white">{formatDuration(stats.averageDuration)}</div>
              <div className="text-[10px] text-slate-400">
                {stats.averageDuration <= 180 ? '⚡ Kecepatan Sangat Sigap' : '⏱️ Standar Wajar'}
              </div>
            </div>
          </div>

          {/* Card 4: Area Fokus Kesalahan */}
          <div className="bg-[#181d26] border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fokus Evaluasi Tim</div>
              <div className="text-xs font-black text-rose-300 truncate">
                {stats.domainMistakes?.bar >= stats.domainMistakes?.kitchen && stats.domainMistakes?.bar > 0
                  ? `Bar & Minuman (${stats.domainMistakes.bar} salah)`
                  : stats.domainMistakes?.kitchen > 0
                  ? `Kitchen (${stats.domainMistakes.kitchen} salah)`
                  : stats.domainMistakes?.billiard > 0
                  ? `Billiard (${stats.domainMistakes.billiard} salah)`
                  : 'Seluruh materi aman'}
              </div>
              <div className="text-[10px] text-slate-400">Top materi perlu briefing</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter Bar (Week, Venue, Grade, Search) */}
      <div className="bg-[#181d26] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama staf, posisi, atau kelemahan (contoh: Bar, Kitchen)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#11141c] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Filter Week Dropdown / Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selector */}
          <div className="flex items-center space-x-1.5 bg-[#11141c] p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-400 pl-2">Minggu:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-transparent text-xs font-bold text-amber-300 outline-none cursor-pointer pr-2"
            >
              {availableWeeks.map((wk) => (
                <option key={wk} value={wk} className="bg-slate-900 text-white">
                  {wk === currentWeek ? `${wk} (Minggu Ini)` : wk}
                </option>
              ))}
              <option value="ALL" className="bg-slate-900 text-white">Semua Riwayat (All Weeks)</option>
            </select>
          </div>

          {/* Grade Filter */}
          <div className="flex items-center space-x-1.5 bg-[#11141c] p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-400 pl-2">Filter Nilai:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-slate-900 text-white">Semua Nilai</option>
              <option value="A" className="bg-slate-900 text-emerald-300">Grade A (≥90)</option>
              <option value="B" className="bg-slate-900 text-blue-300">Grade B (75-89)</option>
              <option value="C" className="bg-slate-900 text-amber-300">Grade C (60-74)</option>
              <option value="D" className="bg-slate-900 text-rose-300">Grade D (&lt;60)</option>
              <option value="NEEDS_COACHING" className="bg-slate-900 text-rose-400">⚠️ Butuh Bimbingan (&lt;75)</option>
            </select>
          </div>

          {/* Venue Toggle */}
          <div className="flex items-center space-x-1 bg-[#11141c] p-1 rounded-xl border border-slate-700">
            {['LuckyCat', 'ALL'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedVenue(v)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedVenue === v
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {v === 'LuckyCat' ? 'LuckyCat Only' : 'Semua Venue'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-500/40 text-rose-200 p-4 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={fetchLeaderboard} className="underline text-rose-300">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Main Table / Cards */}
      {loading ? (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl p-14 text-center text-slate-400">
          <RefreshCw className="w-9 h-9 animate-spin mx-auto mb-3 text-amber-400" />
          <p className="text-xs font-bold">Memuat history pengerjaan kuis produk...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-amber-400/80" />
          <h3 className="text-base font-black text-white">Belum Ada Riwayat Kuis Untuk Periode Ini</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {selectedWeek === currentWeek
              ? `Kuis minggu ${currentWeek} baru saja berjalan. Staf LuckyCat akan otomatis tercatat di sini saat mereka menyelesaikan kuis produk mingguan (1x fleksibel kapan saja).`
              : 'Tidak ada data kuis ditemukan pada filter pencarian yang Anda pilih.'}
          </p>
          {selectedWeek === currentWeek && availableWeeks.length > 1 && (
            <button
              type="button"
              onClick={() => setSelectedWeek('ALL')}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold text-xs border border-amber-400/40 transition cursor-pointer"
            >
              Lihat History Kuis Minggu Sebelumnya (Semua Riwayat)
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#12161f] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-3 text-center w-14">Rank</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Nama Staf</th>
                  <th className="py-3.5 px-3 text-center min-w-[100px]">Nilai &amp; Grade</th>
                  <th className="py-3.5 px-3 text-center min-w-[110px]">Kecepatan</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Rangkuman Kekurangan (Lemah di Mana)</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Rekomendasi Improvement Manager</th>
                  <th className="py-3.5 px-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((entry, index) => {
                  const rank = index + 1;
                  const score = entry.score || 0;
                  const diag = entry.diagnostic || {};
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  // Grade badge styling
                  let gradeBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                  if (diag.accuracyGrade === 'A') gradeBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  else if (diag.accuracyGrade === 'B') gradeBadgeClass = 'bg-blue-500/20 text-blue-300 border-blue-400/40';
                  else if (diag.accuracyGrade === 'C') gradeBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                  // Speed badge styling
                  let speedBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (diag.speedCategory === 'FAST') speedBadgeClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
                  else if (diag.speedCategory === 'SLOW') speedBadgeClass = 'bg-rose-950/60 text-rose-300 border-rose-500/40';

                  return (
                    <tr
                      key={entry.id || `${entry.staff_id}_${index}`}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Peringkat */}
                      <td className="py-3.5 px-3 text-center">
                        {isTop1 ? (
                          <span className="text-xl" title="Peringkat 1">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-xl" title="Peringkat 2">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-xl" title="Peringkat 3">🥉</span>
                        ) : (
                          <span className="font-mono font-bold text-slate-400 text-xs">#{rank}</span>
                        )}
                      </td>

                      {/* Info Staf */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                          <span>{entry.staff_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {entry.staff_role} • <span className="text-amber-400 font-semibold">{entry.staff_venue || 'LuckyCat'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {formatWitaDateTime(entry.completed_at)} ({entry.week_key})
                        </div>
                      </td>

                      {/* Nilai & Grade */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-0.5 rounded-lg font-black text-xs border ${gradeBadgeClass}`}>
                            {score} / 100
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-300 mt-1">
                            Grade {diag.accuracyGrade || 'D'} • {entry.correct_count}/{entry.total_questions || 10} Benar
                          </span>
                        </div>
                      </td>

                      {/* Kecepatan */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border ${speedBadgeClass}`}>
                            {diag.speedBadge || '⏱️ Normal'}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-mono mt-1">
                            {formatDuration(entry.duration_seconds)}
                          </span>
                        </div>
                      </td>

                      {/* Rangkuman Kekurangan */}
                      <td className="py-3.5 px-4">
                        {score === 100 ? (
                          <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Sempurna (Menguasai Semua Materi)</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-rose-300 flex items-start gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{diag.weaknessSummary || 'Beberapa materi belum tepat'}</span>
                            </div>
                            {/* Domain Badges */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {diag.weakDomains?.map((wd) => (
                                <span
                                  key={wd.key}
                                  className="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 text-[9.5px] font-bold border border-rose-500/30"
                                >
                                  {wd.name}: {wd.wrong} salah
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Rekomendasi Improvement Manager */}
                      <td className="py-3.5 px-4">
                        <div className="p-2 rounded-xl bg-[#12161f] border border-slate-800 text-[11px] leading-relaxed text-slate-300">
                          <div className="flex items-center space-x-1 text-amber-400 font-bold text-[10px] uppercase mb-0.5">
                            <Lightbulb className="w-3 h-3 text-amber-400" />
                            <span>Tindakan Manager:</span>
                          </div>
                          <p className="line-clamp-2 text-slate-200">
                            {diag.managerRecommendation || 'Lakukan pemantauan rutin pada shift kerja berikutnya.'}
                          </p>
                        </div>
                      </td>

                      {/* Aksi Button */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1 mx-auto shadow-xs active:scale-95"
                          title="Buka Lembar Jawaban & Coaching Card"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400 group-hover:text-slate-950" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Modal: Coaching Card & Detail Lembar Jawaban Staf */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in text-slate-100">
          <div className="bg-[#181d26] border-2 border-amber-500/40 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-950/80 via-[#1b1712] to-[#12161f] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Lembar Evaluasi &amp; Coaching Kuis Produk
                  </h3>
                  <p className="text-[11px] text-amber-300 font-semibold">
                    Staf: {selectedEntry.staff_name} ({selectedEntry.staff_role}) • {selectedEntry.staff_venue || 'LuckyCat'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Score & Key KPIs Bar */}
              <div className="grid grid-cols-3 gap-2 bg-[#12161f] p-3.5 rounded-2xl border border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Skor Akhir</span>
                  <span className="text-base font-black text-amber-400">{selectedEntry.score} / 100</span>
                  <span className="text-[10px] text-slate-400 block">Grade {selectedEntry.diagnostic?.accuracyGrade || 'D'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Akurasi Jawaban</span>
                  <span className="text-base font-black text-emerald-400">
                    {selectedEntry.correct_count} / {selectedEntry.total_questions || 10}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Soal Terjawab Tepat</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Waktu Pengerjaan</span>
                  <span className="text-base font-black text-white">
                    {formatDuration(selectedEntry.duration_seconds)}
                  </span>
                  <span className="text-[10px] text-amber-300 block">{selectedEntry.diagnostic?.speedLabel || 'Normal'}</span>
                </div>
              </div>

              {/* Box A: Ringkasan Analisis Kelemahan Staf */}
              <div className="p-4 rounded-2xl bg-[#131720] border border-rose-500/30 space-y-2.5">
                <div className="flex items-center space-x-2 text-rose-400 font-black text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" />
                  <span>🎯 Analisis Titik Kelemahan Staf:</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedEntry.diagnostic?.weaknessSummary || 'Pemahaman merata.'}
                </p>

                {/* Per-Domain Accuracy Breakdown */}
                {selectedEntry.diagnostic?.domainBreakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {Object.values(selectedEntry.diagnostic.domainBreakdown).map((d) => {
                      const isWeak = d.wrong > 0;
                      return (
                        <div
                          key={d.key}
                          className={`p-2 rounded-xl border text-center ${
                            isWeak
                              ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="text-[10px] font-bold truncate">{d.name}</div>
                          <div className="text-xs font-black mt-0.5">
                            {d.total - d.wrong} / {d.total} Benar
                          </div>
                          {isWeak ? (
                            <span className="text-[9.5px] text-rose-400 font-extrabold block">⚠️ {d.wrong} Salah</span>
                          ) : (
                            <span className="text-[9.5px] text-emerald-400 font-extrabold block">✓ Menguasai</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box B: Rekomendasi Coaching / Tindakan Manager */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#1a1712] to-[#12161f] border border-amber-500/40 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 font-black text-xs uppercase tracking-wide">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>💡 Rekomendasi Tindakan Coaching Untuk Manager:</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedEntry.diagnostic?.managerRecommendation || 'Lakukan evaluasi rutin pada shift berikutnya.'}
                </p>
                <div className="pt-1 text-[10.5px] text-slate-400 italic">
                  *Gunakan poin-poin di atas sebagai materi briefing singkat (5-10 menit) sebelum staf memulai shift berikutnya.
                </div>
              </div>

              {/* Box C: Lembar 10 Soal & Jawaban Staf */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lembar Jawaban 10 Soal (Audit &amp; Kunci SOP):</span>
                </h4>

                {(selectedEntry.results || []).map((r, i) => (
                  <div
                    key={r.id || i}
                    className={`p-3.5 rounded-2xl border text-left space-y-2 ${
                      r.isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/25 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                          {r.category || 'Materi Produk'}
                        </span>
                        <div className="font-bold text-white text-xs leading-snug pt-1">
                          {i + 1}. {r.question}
                        </div>
                      </div>
                      {r.isCorrect ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30 shrink-0">
                          ✓ Benar
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-400/30 shrink-0">
                          ✕ Salah
                        </span>
                      )}
                    </div>

                    {/* Jawaban Staf (Tampil Baik Benar Maupun Salah) */}
                    {r.isCorrect ? (
                      <div className="text-[11px] space-y-1 bg-emerald-950/40 p-2.5 rounded-xl text-slate-200 border border-emerald-500/30">
                        <div className="text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span><strong>Jawaban Staf:</strong> {r.staffAnswer}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-bold ml-auto shrink-0">
                            ✓ Tepat
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] space-y-1.5 bg-black/40 p-2.5 rounded-xl text-slate-300 border border-rose-500/25">
                        <div className="text-rose-300 flex items-start gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <strong>Jawaban Staf (Salah):</strong> {r.staffAnswer || '(Tidak dijawab / Kosong)'}
                          </div>
                        </div>
                        <div className="text-emerald-300 flex items-start gap-1.5 pt-0.5 border-t border-slate-800/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <strong>Kunci Jawaban Seharusnya:</strong> {r.correctAnswer}
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-300 leading-relaxed italic bg-[#10141c] p-2.5 rounded-xl border border-slate-800/80">
                      💡 <strong>Standar SOP / Resep:</strong> {r.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#12161f] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Waktu submit: {formatWitaDateTime(selectedEntry.completed_at)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Tutup Evaluasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
