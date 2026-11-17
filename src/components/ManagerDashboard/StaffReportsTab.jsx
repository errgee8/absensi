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
  X,
  Star,
  Heart,
  MessageSquare
} from 'lucide-react';
import {
  getStaffReports,
  rewardStaffReport,
  updateStaffReportStatus,
  getAdminKudosLogs
} from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';

export default function StaffReportsTab({ adminAuth }) {
  const [activeSection, setActiveSection] = useState('REPORTS'); // 'REPORTS' | 'KUDOS'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Kudos Audit Logs State
  const [kudosLogs, setKudosLogs] = useState([]);
  const [kudosLoading, setKudosLoading] = useState(false);
  const [kudosSearch, setKudosSearch] = useState('');
  const [kudosVenueFilter, setKudosVenueFilter] = useState('ALL');

  // Reward Modal State
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [targetReport, setTargetReport] = useState(null);
  const [rewardPoints, setRewardPoints] = useState(10);
  const [rewardNote, setRewardNote] = useState('Apresiasi laporan valid & integritas SOP manajemen');
  const [rewardPin, setRewardPin] = useState(adminAuth?.pin || '8980');
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardError, setRewardError] = useState(null);

  // Status Update Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetReport, setStatusTargetReport] = useState(null);
  const [newStatus, setNewStatus] = useState('INVESTIGATING');
  const [statusNote, setStatusNote] = useState('');
  const [statusPin, setStatusPin] = useState(adminAuth?.pin || '8980');
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

  const fetchKudos = async () => {
    setKudosLoading(true);
    try {
      const res = await getAdminKudosLogs();
      setKudosLogs(Array.isArray(res?.logs) ? res.logs : []);
    } catch (err) {
      console.warn('Failed to load kudos logs:', err.message);
    } finally {
      setKudosLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchKudos();
  }, []);

  const handleOpenReward = (report) => {
    setTargetReport(report);
    setRewardPoints(10);
    setRewardNote(`Apresiasi validitas laporan: ${report.title}`);
    setRewardPin(adminAuth?.pin || '8980');
    setRewardError(null);
    setRewardModalOpen(true);
  };

  const handleConfirmReward = async () => {
    if (!targetReport) return;
    const finalPoints = Math.max(1, Number(rewardPoints) || 1);
    setRewardSubmitting(true);
    setRewardError(null);
    try {
      await rewardStaffReport(targetReport.id, {
        points: finalPoints,
        note: rewardNote,
        pin: (rewardPin || '8980').trim(),
        managerPin: (rewardPin || '8980').trim()
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
    setStatusNote(report.management_note || report.manager_note || '');
    setStatusPin(adminAuth?.pin || '8980');
    setStatusModalOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!statusTargetReport) return;
    setStatusSubmitting(true);
    try {
      await updateStaffReportStatus(statusTargetReport.id, {
        status: newStatus,
        managerNote: statusNote,
        pin: (statusPin || '8980').trim(),
        managerPin: (statusPin || '8980').trim()
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
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {status === 'VALID_REWARDED' ? 'Valid & Diberi Reward' : 'Sudah Terselesaikan'}
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
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
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

  const filteredKudos = kudosLogs.filter((k) => {
    if (kudosVenueFilter !== 'ALL') {
      const matchVenue = (k.from_staff_venue || '').toLowerCase().includes(kudosVenueFilter.toLowerCase()) ||
                         (k.to_staff_venue || '').toLowerCase().includes(kudosVenueFilter.toLowerCase());
      if (!matchVenue) return false;
    }
    if (kudosSearch.trim()) {
      const q = kudosSearch.toLowerCase();
      const matchSender = (k.from_staff_name || '').toLowerCase().includes(q);
      const matchReceiver = (k.to_staff_name || '').toLowerCase().includes(q);
      const matchReason = (k.reason || '').toLowerCase().includes(q);
      const matchWeek = (k.week_key || '').toLowerCase().includes(q);
      if (!matchSender && !matchReceiver && !matchReason && !matchWeek) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Subtab Navigation Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection('REPORTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
            activeSection === 'REPORTS'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
              : 'bg-[#181d26] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Laporan Integritas ({reports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('KUDOS');
            fetchKudos();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
            activeSection === 'KUDOS'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black'
              : 'bg-[#181d26] text-amber-300 hover:text-amber-200 border border-amber-500/20'
          }`}
        >
          <Star className="w-4 h-4 fill-amber-400" />
          <span>Log Riwayat Bintang Apresiasi (Kudos)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSection === 'KUDOS' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {kudosLogs.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: WHISTLEBLOWER INTEGRITY REPORTS */}
      {activeSection === 'REPORTS' && (
        <>
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
                  Kanal khusus penerimaan aduan pelanggaran peraturan perusahaan, kecurangan, perilaku tidak etis/bullying, atau tindakan yang merugikan integritas tim.
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-white">
                        Pelapor: {report.reporter_name || report.staff_name || 'Staf'} {report.is_anonymous ? '(Anonim)' : ''}
                      </span>
                      {report.is_anonymous ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black flex items-center gap-1" title="Staf memilih opsi Anonim: nama dirahasiakan ke rekan kerja, tetapi tetap diketahui oleh Manager">
                          <Lock className="w-3 h-3" />
                          Anonim ke Rekan Floor (Khusus Manager Tahu)
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
        </>
      )}

      {/* SECTION 2: PEER KUDOS AUDIT LOGS */}
      {activeSection === 'KUDOS' && (
        <div className="space-y-5 animate-fade-in">
          {/* Kudos Header Banner */}
          <div className="bg-gradient-to-r from-amber-950/70 via-[#221c17] to-[#141822] border-2 border-amber-400/40 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
                <Star className="w-6 h-6 fill-amber-400 stroke-[1.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">
                    ⭐ Log Audit Bintang Apresiasi Karyawan (Peer Kudos)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                    Apresiasi Mingguan
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Pantau budaya apresiasi dan kekompakan tim antar staf. Setiap karyawan memiliki kuota 1 Bintang Apresiasi per minggu untuk diberikan kepada rekan kerja yang berdedikasi tinggi.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchKudos}
              disabled={kudosLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer self-start md:self-center shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${kudosLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Log</span>
            </button>
          </div>

          {/* 3 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#181d26] border border-amber-400/20 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Total Bintang Terkirim</span>
              </div>
              <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
                {kudosLogs.length} <span className="text-xs font-normal text-slate-400">bintang</span>
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1">
                Akumulasi seluruh outlet
              </div>
            </div>

            <div className="bg-[#181d26] border border-purple-400/20 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Penerima Bintang Unik</span>
              </div>
              <div className="text-2xl font-black text-purple-300 mt-1 font-mono">
                {new Set(kudosLogs.map(k => k.to_staff_id)).size} <span className="text-xs font-normal text-slate-400">staf</span>
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1">
                Mendapat apresiasi dari rekan
              </div>
            </div>

            <div className="bg-[#181d26] border border-emerald-400/20 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pengirim Apresiasi</span>
              </div>
              <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">
                {new Set(kudosLogs.map(k => k.from_staff_id)).size} <span className="text-xs font-normal text-slate-400">staf</span>
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1">
                Aktif berbagi semangat tim
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-[#181d26] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama pengirim, penerima, atau pesan apresiasi..."
                value={kudosSearch}
                onChange={(e) => setKudosSearch(e.target.value)}
                className="w-full bg-[#11141c] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'LuckyCat', 'JP Karaoke'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setKudosVenueFilter(v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    kudosVenueFilter === v
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {v === 'ALL' ? 'Semua Outlet' : v}
                </button>
              ))}
            </div>
          </div>

          {/* Kudos Logs Table */}
          {kudosLoading && (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Memuat log riwayat bintang apresiasi...</p>
            </div>
          )}

          {!kudosLoading && filteredKudos.length === 0 && (
            <div className="bg-[#181d26] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
              <Star className="w-8 h-8 text-slate-600 mx-auto stroke-1" />
              <p className="text-xs font-bold text-slate-300">Belum ada riwayat Bintang Apresiasi yang cocok</p>
              <p className="text-[11px] text-slate-500">
                Staf dapat mengirimkan bintang apresiasi langsung dari Staff Portal Kiosk.
              </p>
            </div>
          )}

          {!kudosLoading && filteredKudos.length > 0 && (
            <div className="bg-[#181d26] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#12151d] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Waktu (WITA)</th>
                      <th className="py-3 px-4">Pengirim (Dari)</th>
                      <th className="py-3 px-4">Penerima (Kepada)</th>
                      <th className="py-3 px-4 min-w-[240px]">Alasan Apresiasi</th>
                      <th className="py-3 px-4">Minggu Ke-</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredKudos.map((kudos) => (
                      <tr key={kudos.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                          {formatWitaDateTime(kudos.created_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{kudos.from_staff_name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {kudos.from_staff_venue || 'Outlet'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5">
                            <span>⭐</span>
                            <span>{kudos.to_staff_name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {kudos.to_staff_venue || 'Outlet'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5 text-slate-200 text-[11.5px] italic leading-relaxed">
                            "{kudos.reason}"
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10.5px] border border-white/10 font-bold">
                            {kudos.week_key || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Jumlah Poin Bonus Apresiasi (+):
                  </label>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
                    +{rewardPoints || 0} Poin Plus
                  </span>
                </div>
                
                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  {[5, 10, 15, 20, 25].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setRewardPoints(pts)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                        Number(rewardPoints) === pts
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      +{pts}
                    </button>
                  ))}
                </div>

                {/* Custom Point Input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Atau Ketik Manual Poin Custom (Bebas):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-400">
                      +
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={rewardPoints}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                        setRewardPoints(val);
                      }}
                      placeholder="Input jumlah poin (contoh: 30, 50, 100)"
                      className="w-full bg-[#11141c] border border-slate-700 rounded-xl pl-8 pr-20 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                      Poin Plus
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Pilih preset di atas atau ketik manual berapa pun poin yang ingin diberikan.
                  </p>
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

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  PIN Otorisasi Manajer:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={rewardPin}
                  onChange={(e) => setRewardPin(e.target.value)}
                  placeholder="PIN Manajer (default: 8980)"
                  className="w-full bg-[#11141c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono tracking-widest"
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
                  <option value="NEED_MORE_PROOF">Butuh Bukti Lebih Lanjut</option>
                  <option value="RESOLVED">Sudah Terselesaikan</option>
                  <option value="VALID_REWARDED">Valid &amp; Diberi Reward</option>
                  <option value="DISMISSED">Tidak Valid / Ditutup</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  PIN Otorisasi Manajer:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={statusPin}
                  onChange={(e) => setStatusPin(e.target.value)}
                  placeholder="PIN Manajer (default: 8980)"
                  className="w-full bg-[#11141c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono tracking-widest"
                />
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
