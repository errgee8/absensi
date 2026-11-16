import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Eye,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Sparkles,
  User,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import {
  getStaffReports,
  rewardStaffReport,
  updateStaffReportStatus
} from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';

export default function StaffReportsTab({ adminAuth }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Reward Modal State
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [targetReport, setTargetReport] = useState(null);
  const [rewardPoints, setRewardPoints] = useState(10);
  const [rewardNote, setRewardNote] = useState('Apresiasi laporan valid & integritas SOP manajemen');
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardError, setRewardError] = useState(null);

  // Status Update Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetReport, setStatusTargetReport] = useState(null);
  const [newStatus, setNewStatus] = useState('INVESTIGATING');
  const [statusNote, setStatusNote] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getStaffReports('8980');
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar laporan staf.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleOpenReward = (report) => {
    setTargetReport(report);
    setRewardPoints(10);
    setRewardNote(`Apresiasi validitas laporan: ${report.title}`);
    setRewardError(null);
    setRewardModalOpen(true);
  };

  const handleConfirmReward = async () => {
    if (!targetReport) return;
    setRewardSubmitting(true);
    setRewardError(null);
    try {
      await rewardStaffReport(targetReport.id, {
        points: Number(rewardPoints) || 10,
        note: rewardNote,
        managerPin: '8980'
      });
      setRewardModalOpen(false);
      setTargetReport(null);
      await fetchReports();
    } catch (err) {
      setRewardError(err.message || 'Gagal memberikan poin reward.');
    } finally {
      setRewardSubmitting(false);
    }
  };

  const handleOpenStatusModal = (report, defaultStatus) => {
    setStatusTargetReport(report);
    setNewStatus(defaultStatus || report.status || 'INVESTIGATING');
    setStatusNote(report.management_note || '');
    setStatusModalOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!statusTargetReport) return;
    setStatusSubmitting(true);
    try {
      await updateStaffReportStatus(statusTargetReport.id, {
        status: newStatus,
        managementNote: statusNote,
        managerPin: '8980'
      });
      setStatusModalOpen(false);
      setStatusTargetReport(null);
      await fetchReports();
    } catch (err) {
      alert('Gagal memperbarui status: ' + (err.message || 'Error'));
    } finally {
      setStatusSubmitting(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchReporter = (r.reporter_name || '').toLowerCase().includes(q);
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      const matchCat = (r.category || '').toLowerCase().includes(q);
      if (!matchReporter && !matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALID_REWARDED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Valid &amp; Diberi Reward
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Sedang Diinvestigasi
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600 text-[11px] font-bold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            Tidak Valid / Ditutup
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Menunggu Tinjauan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/70 via-[#1e1520] to-[#141822] border-2 border-rose-500/40 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-950/50">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                🚨 Pusat Laporan &amp; Aduan Staf (Whistleblower System)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-400/30">
                Kerahasiaan Manager
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Kanal khusus penerimaan aduan kecurangan kasir, pelanggaran SOP, atau perilaku buruk leader.
              Staf yang memilih opsi <strong>Anonim</strong> tetap dirahasiakan identitasnya dari rekan kerja, namun
              <strong> khusus Manager dapat melihat siapa pelapor</strong> untuk verifikasi dan pemberian reward poin.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchReports}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181d26] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan pelapor, judul, isi laporan, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#11141c] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['ALL', 'PENDING', 'INVESTIGATING', 'VALID_REWARDED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL'
                ? 'Semua Laporan'
                : st === 'PENDING'
                ? 'Menunggu'
                : st === 'INVESTIGATING'
                ? 'Investigasi'
                : st === 'VALID_REWARDED'
                ? 'Valid & Reward'
                : 'Ditutup'}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-500/40 text-rose-200 p-4 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={fetchReports} className="underline text-rose-300">
            Coba Lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-400" />
          <p className="text-xs font-bold">Memuat daftar laporan staf...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-[#181d26] border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
          <h3 className="text-sm font-black text-white">Tidak Ada Laporan Ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1">
            {statusFilter !== 'ALL' || search
              ? 'Tidak ada laporan yang sesuai dengan filter pencarian.'
              : 'Belum ada aduan atau laporan masuk dari staf floor.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-[#181d26] border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl transition space-y-4"
            >
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-black">
                    {report.category || 'Aduan Staf'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    🕒 {formatWitaDateTime(report.created_at)}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs font-semibold text-slate-300">
                    Venue: <strong>{report.venue || 'LuckyCat'}</strong>
                  </span>
                </div>
                <div>{getStatusBadge(report.status)}</div>
              </div>

              {/* Title & Chronology */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">{report.title}</h3>
                <div className="bg-[#11141c] border border-slate-800/90 rounded-2xl p-3.5 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {report.description}
                </div>
              </div>

              {/* Reporter Identity Box (Crucial for user: Anonim to peers, visible to manager) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#141b2b] to-[#171f30] border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        Pelapor: {report.reporter_name || 'Staf'}
                      </span>
                      {report.is_anonymous ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Anonim ke Rekan (Khusus Manager)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Terbuka
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Role / Divisi: <strong>{report.reporter_role || 'Staff Floor'}</strong> ({report.reporter_division || 'Floor'})
                    </p>
                  </div>
                </div>

                {report.reward_points_awarded > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 self-start sm:self-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Reward Diberikan: +{report.reward_points_awarded} Poin</span>
                  </div>
                )}
              </div>

              {/* Attached Photo Evidence */}
              {report.photo_url && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lampiran Bukti Foto:</span>
                  </span>
                  <div className="inline-block relative rounded-2xl overflow-hidden border border-slate-700 bg-black max-w-xs group cursor-pointer">
                    <img
                      src={report.photo_url}
                      alt="Lampiran Bukti"
                      className="w-full max-h-48 object-cover group-hover:scale-105 transition"
                      onClick={() => setSelectedPhoto(report.photo_url)}
                    />
                    <div
                      onClick={() => setSelectedPhoto(report.photo_url)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Perbesar Foto</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Management Notes if any */}
              {report.management_note && (
                <div className="bg-[#12161f] border border-slate-700/80 rounded-2xl p-3 text-xs text-slate-300">
                  <span className="font-bold text-amber-300">Catatan Tindak Lanjut Manajemen:</span>
                  <p className="mt-0.5 italic">{report.management_note}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenStatusModal(report, 'INVESTIGATING')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer border border-slate-700"
                >
                  Ubah Status / Catatan
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenReward(report)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4 text-emerald-200" />
                  <span>🏆 Berikan Poin Apresiasi (+Reward)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700">
            <img src={selectedPhoto} alt="Bukti Foto Penuh" className="max-w-full max-h-[85vh] object-contain" />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-rose-600 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Reward Points Modal */}
      {rewardModalOpen && targetReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#181d26] border border-emerald-500/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Beri Reward Poin Apresiasi</h3>
                <p className="text-[11px] text-slate-400">
                  Untuk: <strong>{targetReport.reporter_name}</strong>
                </p>
              </div>
            </div>

            {rewardError && (
              <div className="bg-rose-950/80 border border-rose-500 text-rose-200 p-3 rounded-xl text-xs font-bold">
                {rewardError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Jumlah Poin Bonus Apresiasi (+):
                </label>
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 20].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setRewardPoints(pts)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        rewardPoints === pts
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      +{pts} Poin
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Catatan Apresiasi Manajemen:
                </label>
                <textarea
                  rows={2}
                  value={rewardNote}
                  onChange={(e) => setRewardNote(e.target.value)}
                  className="w-full bg-[#11141c] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200">
                💡 Poin ini akan langsung masuk ke total skor leaderboard staf <strong>{targetReport.reporter_name}</strong> dan status laporan otomatis diubah menjadi <strong>Valid &amp; Diberi Reward</strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={rewardSubmitting}
                onClick={() => setRewardModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={rewardSubmitting}
                onClick={handleConfirmReward}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                {rewardSubmitting ? 'Menyimpan...' : 'Kirim Reward Poin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModalOpen && statusTargetReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#181d26] border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Perbarui Status Laporan</h3>
                <p className="text-[11px] text-slate-400">{statusTargetReport.title}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Status Penanganan:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#11141c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="PENDING">Menunggu Tinjauan</option>
                  <option value="INVESTIGATING">Sedang Diinvestigasi</option>
                  <option value="VALID_REWARDED">Valid &amp; Diberi Reward</option>
                  <option value="DISMISSED">Tidak Valid / Ditutup</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Catatan Tindak Lanjut Manajemen:
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan hasil investigasi atau alasan penutupan aduan..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full bg-[#11141c] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={handleConfirmStatus}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer"
              >
                {statusSubmitting ? 'Menyimpan...' : 'Simpan Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
