import React, { useState, useEffect } from 'react';
import {
  Trophy,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Eye,
  User,
  X
} from 'lucide-react';
import { getQuizLeaderboard } from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';

export default function QuizLeaderboardTab({ adminAuth }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [weekKey, setWeekKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('ALL');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getQuizLeaderboard('8980', selectedVenue);
      setWeekKey(data.weekKey || '');
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat papan peringkat kuis produk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedVenue]);

  const filteredList = leaderboard.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (item.staff_name || '').toLowerCase().includes(q);
      const matchRole = (item.staff_role || '').toLowerCase().includes(q);
      if (!matchName && !matchRole) return false;
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
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-[#1f1a14] to-[#121622] border-2 border-amber-500/40 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
            <Trophy className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                📝 Leaderboard Kuis Pengetahuan Produk (Product Knowledge)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-black border border-amber-400/30">
                Minggu {weekKey || 'Aktif'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Hasil kuis wajib mingguan (10 soal / 8 menit) staf sebelum mengambil jam istirahat.
              Memantau tingkat pemahaman menu, paket billiard, promo aktif, dan standar venue seluruh divisi.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLeaderboard}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Klasemen</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181d26] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama staf atau posisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#11141c] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'LuckyCat', 'JP Karaoke'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSelectedVenue(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedVenue === v
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {v === 'ALL' ? 'Semua Venue' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-500/40 text-rose-200 p-4 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={fetchLeaderboard} className="underline text-rose-300">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Table / Cards */}
      {loading ? (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-400" />
          <p className="text-xs font-bold">Memuat data klasemen kuis...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-amber-400" />
          <h3 className="text-sm font-black text-white">Belum Ada Staf Menyelesaikan Kuis Minggu Ini</h3>
          <p className="text-xs text-slate-400 mt-1">
            Kuis akan otomatis tercatat di sini begitu staf mengambil istirahat dan menyelesaikan 10 soal kuis.
          </p>
        </div>
      ) : (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#12161f] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">Peringkat</th>
                  <th className="py-3.5 px-4">Nama Staf</th>
                  <th className="py-3.5 px-4">Venue &amp; Divisi</th>
                  <th className="py-3.5 px-4 text-center">Skor Akhir</th>
                  <th className="py-3.5 px-4 text-center">Jawaban Benar</th>
                  <th className="py-3.5 px-4 text-center">Durasi</th>
                  <th className="py-3.5 px-4 text-right">Waktu Selesai</th>
                  <th className="py-3.5 px-4 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((entry, index) => {
                  const rank = index + 1;
                  const score = entry.score || 0;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  return (
                    <tr
                      key={entry.id || `${entry.staff_id}_${index}`}
                      className="hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 text-center">
                        {isTop1 ? (
                          <span className="text-lg" title="Peringkat 1">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-lg" title="Peringkat 2">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-lg" title="Peringkat 3">🥉</span>
                        ) : (
                          <span className="font-mono font-bold text-slate-400">#{rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-white text-xs">
                          {entry.staff_name}
                        </div>
                        <div className="text-[11px] text-slate-400">{entry.staff_role}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-300">{entry.venue || 'LuckyCat'}</div>
                        <div className="text-[10.5px] text-slate-500">{entry.division || 'Floor'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl font-black text-xs border ${
                            score >= 80
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : score >= 60
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {score} / 100
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                        {entry.correct_count} / {entry.total_questions || 10}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {formatDuration(entry.duration_seconds)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                        {formatWitaDateTime(entry.completed_at)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
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

      {/* Detail Review Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in text-slate-100">
          <div className="bg-[#181d26] border border-amber-500/40 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/80 via-[#1b1712] to-[#12161f] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Review Lembar Jawaban Kuis
                  </h3>
                  <p className="text-[10px] text-amber-300 font-medium">
                    Staf: {selectedEntry.staff_name} • Skor: {selectedEntry.score}/100
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

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="grid grid-cols-3 gap-2 bg-[#12161f] p-3 rounded-2xl border border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Skor Akhir</span>
                  <span className="text-sm font-black text-amber-400">{selectedEntry.score}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Jawaban Benar</span>
                  <span className="text-sm font-black text-emerald-400">
                    {selectedEntry.correct_count} / {selectedEntry.total_questions || 10}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Waktu Pengerjaan</span>
                  <span className="text-sm font-black text-white">
                    {formatDuration(selectedEntry.duration_seconds)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rincian Soal &amp; Jawaban:</span>
                </h4>

                {(selectedEntry.results || []).map((r, i) => (
                  <div
                    key={r.id || i}
                    className={`p-3 rounded-2xl border text-left space-y-2 ${
                      r.isCorrect
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : 'bg-rose-950/30 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white text-[11.5px] leading-snug">
                        {i + 1}. {r.question}
                      </span>
                      {r.isCorrect ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30 shrink-0">
                          ✓ Benar
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-400/30 shrink-0">
                          ✕ Salah
                        </span>
                      )}
                    </div>

                    {!r.isCorrect && (
                      <div className="text-[11px] space-y-0.5 bg-black/30 p-2 rounded-xl text-slate-300">
                        <div className="text-rose-300">
                          <strong>Jawaban Staf:</strong> {r.staffAnswer || '(Tidak dijawab)'}
                        </div>
                        <div className="text-emerald-300">
                          <strong>Jawaban Seharusnya:</strong> {r.correctAnswer}
                        </div>
                      </div>
                    )}

                    <p className="text-[10.5px] text-slate-300 leading-relaxed italic bg-[#10141c] p-2 rounded-xl border border-slate-800">
                      💡 {r.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#12161f] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Tutup Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
