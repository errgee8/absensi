import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Timer,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Download,
  Camera,
  Calendar,
  X,
  Clock
} from 'lucide-react';
import {
  getManagerOvertimeLogs,
  reviewManagerOvertime,
  deleteManagerOvertime,
  subscribeRealtimeEvents
} from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';
import { showToast } from '../Common/Toast';

function formatMinutesLabel(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h} jam ${rem} mnt`;
  if (h > 0) return `${h} jam`;
  return `${rem} mnt`;
}

export default function OvertimeManagementTab({ adminAuth, onOvertimeChanged }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Partial / Reject Review Modal
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewMode, setReviewMode] = useState('PARTIAL'); // 'PARTIAL' | 'REJECT'
  const [partialMinutes, setPartialMinutes] = useState('');
  const [managerNote, setManagerNote] = useState('');

  // Photo Preview Modal
  const [photoPreview, setPhotoPreview] = useState(null);

  const loadOvertime = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getManagerOvertimeLogs();
      const nextLogs = Array.isArray(res?.logs) ? res.logs : [];
      setLogs(nextLogs);
      if (onOvertimeChanged) {
        onOvertimeChanged(nextLogs.filter((l) => l.status === 'PENDING').length);
      }
    } catch (err) {
      if (!silent) showToast('Gagal memuat log lembur: ' + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onOvertimeChanged]);

  useEffect(() => {
    loadOvertime();
    const unsub = subscribeRealtimeEvents((eventType) => {
      if (eventType === 'OVERTIME_UPDATE') {
        loadOvertime(true);
      }
    });
    return () => unsub();
  }, [loadOvertime]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (venueFilter !== 'ALL' && item.staff_venue !== venueFilter) return false;
      if (monthFilter && !String(item.overtime_date || '').startsWith(monthFilter)) return false;
      if (q) {
        const hay = `${item.staff_name || ''} ${item.staff_id || ''} ${item.staff_role || ''} ${item.reason || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, statusFilter, venueFilter, monthFilter, searchQuery]);

  const stats = useMemo(() => {
    const pending = logs.filter((l) => l.status === 'PENDING').length;
    const inProgress = logs.filter((l) => l.status === 'IN_PROGRESS').length;
    const approvedMinutesTotal = filteredLogs
      .filter((l) => l.status === 'APPROVED' || l.status === 'PARTIAL')
      .reduce((acc, l) => acc + Number(l.approved_minutes || 0), 0);
    return {
      total: filteredLogs.length,
      pending,
      inProgress,
      approvedMinutesTotal
    };
  }, [logs, filteredLogs]);

  const reviewerName = adminAuth?.name || adminAuth?.role || 'Management';

  const handleFullApprove = async (item) => {
    setProcessingId(item.id);
    try {
      await reviewManagerOvertime(item.id, {
        action: 'APPROVE_FULL',
        reviewedBy: reviewerName
      });
      showToast(`Lembur ${item.staff_name} disetujui penuh (${formatMinutesLabel(item.requested_minutes)}).`, 'success');
      await loadOvertime(true);
    } catch (err) {
      showToast(err.message || 'Gagal ACC penuh', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const openPartialModal = (item, mode = 'PARTIAL') => {
    setReviewTarget(item);
    setReviewMode(mode);
    setPartialMinutes(String(Math.max(1, Math.floor(Number(item.requested_minutes || 60) / 2))));
    setManagerNote('');
  };

  const handleSubmitReviewModal = async (e) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setProcessingId(reviewTarget.id);
    try {
      if (reviewMode === 'PARTIAL') {
        const mins = Math.round(Number(partialMinutes));
        if (!Number.isFinite(mins) || mins <= 0 || mins > Number(reviewTarget.requested_minutes || 0)) {
          showToast(`Masukkan menit antara 1 hingga ${reviewTarget.requested_minutes} menit.`, 'error');
          setProcessingId(null);
          return;
        }
        await reviewManagerOvertime(reviewTarget.id, {
          action: 'APPROVE_PARTIAL',
          approvedMinutes: mins,
          managerNote: managerNote.trim(),
          reviewedBy: reviewerName
        });
        showToast(`Lembur ${reviewTarget.staff_name} di-ACC partial (${formatMinutesLabel(mins)}).`, 'success');
      } else {
        await reviewManagerOvertime(reviewTarget.id, {
          action: 'REJECT',
          managerNote: managerNote.trim(),
          reviewedBy: reviewerName
        });
        showToast(`Pengajuan lembur ${reviewTarget.staff_name} ditolak.`, 'info');
      }
      setReviewTarget(null);
      await loadOvertime(true);
    } catch (err) {
      showToast(err.message || 'Gagal memproses review lembur', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus log lembur ${item.staff_name} (${item.overtime_date})?`)) return;
    setProcessingId(item.id);
    try {
      await deleteManagerOvertime(item.id);
      showToast('Log lembur berhasil dihapus.', 'success');
      await loadOvertime(true);
    } catch (err) {
      showToast(err.message || 'Gagal menghapus log lembur', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Tanggal',
      'ID Staff',
      'Nama',
      'Venue',
      'Divisi',
      'Tipe',
      'Jam Mulai',
      'Jam Selesai',
      'Pengajuan (Menit)',
      'ACC (Menit)',
      'Status',
      'Alasan',
      'Catatan Manager',
      'Direview Oleh'
    ];
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((l) => [
      l.overtime_date,
      l.staff_id,
      l.staff_name,
      l.staff_venue,
      l.staff_division,
      l.mode === 'RETROACTIVE' ? 'Susulan' : 'Live Foto',
      l.start_time_hm,
      l.end_time_hm || '-',
      l.requested_minutes || 0,
      l.approved_minutes ?? '-',
      l.status,
      l.reason,
      l.manager_note || '',
      l.reviewed_by || ''
    ].map(escapeCsv).join(','));

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log_lembur_${monthFilter || 'semua'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Summary Stats */}
      <div className="bg-[#161b24] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Manajemen &amp; Log Khusus Lembur</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tinjau pengajuan lembur harian (dengan foto datang &amp; pulang) maupun lembur susulan hari terlewat, lalu tentukan ACC Penuh, Partial, atau Tolak.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Log (.csv)</span>
          </button>
          <button
            type="button"
            onClick={() => loadOvertime()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#161b24] border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-400">Menunggu Review</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-[#161b24] border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-400">Sedang Lembur (Live)</div>
          <div className="text-2xl font-black text-violet-400 mt-1">{stats.inProgress}</div>
        </div>
        <div className="bg-[#161b24] border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-400">Total ACC Lembur (Filter)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{formatMinutesLabel(stats.approvedMinutesTotal)}</div>
        </div>
        <div className="bg-[#161b24] border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-400">Jumlah Catatan Log</div>
          <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#161b24] border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama / ID / alasan..."
            className="w-full pl-8 pr-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING">⏳ Menunggu Review</option>
          <option value="IN_PROGRESS">● Sedang Lembur (Live)</option>
          <option value="APPROVED">✓ ACC Penuh</option>
          <option value="PARTIAL">⚡ ACC Partial</option>
          <option value="REJECTED">✕ Ditolak</option>
        </select>
        <select
          value={venueFilter}
          onChange={(e) => setVenueFilter(e.target.value)}
          className="px-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
        >
          <option value="ALL">Semua Venue</option>
          <option value="JP Karaoke">JP Karaoke</option>
          <option value="LuckyCat">LuckyCat</option>
        </select>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          title="Filter per bulan"
        />
      </div>

      {/* Dedicated Overtime Log Table / Cards */}
      <div className="bg-[#161b24] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-14 text-center text-xs text-slate-400">Memuat log lembur...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-500">
            Belum ada data log lembur yang sesuai filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((item) => {
              const isPending = item.status === 'PENDING';
              const isBusy = processingId === item.id;

              const statusBadge =
                item.status === 'APPROVED'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : item.status === 'PARTIAL'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : item.status === 'REJECTED'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : item.status === 'IN_PROGRESS'
                  ? 'bg-violet-500/20 text-violet-200 border-violet-400/40 animate-pulse'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30';

              const statusLabel =
                item.status === 'APPROVED'
                  ? `✓ ACC Penuh (${formatMinutesLabel(item.approved_minutes)})`
                  : item.status === 'PARTIAL'
                  ? `⚡ ACC Partial (${formatMinutesLabel(item.approved_minutes)} / ${formatMinutesLabel(item.requested_minutes)})`
                  : item.status === 'REJECTED'
                  ? '✕ Ditolak'
                  : item.status === 'IN_PROGRESS'
                  ? '● Sedang Lembur'
                  : '⏳ Menunggu Manager';

              return (
                <div key={item.id} className="p-4 sm:p-5 hover:bg-white/[0.015] transition space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Staff & Time Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">{item.staff_name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                          {item.staff_id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 text-[10px] font-bold border border-indigo-500/25">
                          {item.staff_venue}
                        </span>
                        {item.mode === 'RETROACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            <Calendar className="w-2.5 h-2.5" /> Susulan (Tanpa Foto)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-bold">
                            <Camera className="w-2.5 h-2.5" /> Live Foto Datang &amp; Pulang
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-white">
                          <Clock className="w-3.5 h-3.5 text-violet-400" />
                          {item.overtime_date} • {item.start_time_hm} – {item.end_time_hm || 'Berjalan'} WITA
                        </span>
                        {item.requested_minutes > 0 && (
                          <span className="text-slate-400">
                            Durasi Pengajuan: <strong className="text-slate-200">{formatMinutesLabel(item.requested_minutes)} ({item.requested_minutes} mnt)</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge + Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${statusBadge}`}>
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(item)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Hapus log lembur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reason & Photos */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12161f] border border-slate-800/80 rounded-xl p-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Alasan / Pekerjaan Lembur</div>
                      <p className="text-xs text-slate-200 leading-relaxed">{item.reason}</p>
                      {item.manager_note && (
                        <p className="text-[11px] text-amber-300 pt-1">
                          <strong>Catatan Manager:</strong> {item.manager_note}
                        </p>
                      )}
                      {item.reviewed_by && (
                        <p className="text-[10px] text-slate-500">
                          Direview oleh {item.reviewed_by} • {formatWitaDateTime(item.reviewed_at)} WITA
                        </p>
                      )}
                    </div>

                    {/* Photo Thumbnails */}
                    {(item.start_photo_url || item.end_photo_url) && (
                      <div className="flex items-center gap-2 shrink-0">
                        {item.start_photo_url && (
                          <button
                            type="button"
                            onClick={() => setPhotoPreview({ url: item.start_photo_url, title: `Foto Datang Lembur - ${item.staff_name}` })}
                            className="group relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 hover:border-violet-400 transition cursor-pointer bg-slate-900"
                            title="Lihat Foto Datang Lembur"
                          >
                            <img
                              src={item.start_photo_url}
                              alt="Datang Lembur"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-black text-center text-violet-200 py-0.5">
                              DATANG
                            </span>
                          </button>
                        )}
                        {item.end_photo_url && (
                          <button
                            type="button"
                            onClick={() => setPhotoPreview({ url: item.end_photo_url, title: `Foto Pulang Lembur - ${item.staff_name}` })}
                            className="group relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-400 transition cursor-pointer bg-slate-900"
                            title="Lihat Foto Pulang Lembur"
                          >
                            <img
                              src={item.end_photo_url}
                              alt="Pulang Lembur"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-black text-center text-emerald-200 py-0.5">
                              PULANG
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manager Decision Buttons (for PENDING) */}
                  {isPending && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleFullApprove(item)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACC Penuh ({formatMinutesLabel(item.requested_minutes)})</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openPartialModal(item, 'PARTIAL')}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>ACC Partial</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openPartialModal(item, 'REJECT')}
                        className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/30 text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Partial / Reject Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitReviewModal}
            className="bg-[#161b24] border border-slate-700 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                {reviewMode === 'PARTIAL' ? 'ACC Partial Lembur' : 'Tolak Pengajuan Lembur'}
              </h3>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#12161f] border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
              <div><strong className="text-white">{reviewTarget.staff_name}</strong> ({reviewTarget.overtime_date})</div>
              <div>Pengajuan: <strong className="text-amber-300">{reviewTarget.requested_minutes} menit</strong> ({formatMinutesLabel(reviewTarget.requested_minutes)})</div>
            </div>

            {reviewMode === 'PARTIAL' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Jumlah Menit yang Di-ACC (1 – {reviewTarget.requested_minutes} menit) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={reviewTarget.requested_minutes}
                  value={partialMinutes}
                  onChange={(e) => setPartialMinutes(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                />
                <div className="text-[11px] text-amber-300 mt-1 font-bold">
                  Setara: {formatMinutesLabel(partialMinutes)}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Catatan Manager (Opsional)
              </label>
              <textarea
                rows={3}
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                placeholder={reviewMode === 'PARTIAL' ? 'Contoh: Hanya di-ACC 2 jam sesuai kebutuhan operasional' : 'Alasan penolakan...'}
                className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={processingId === reviewTarget.id}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black cursor-pointer ${
                  reviewMode === 'PARTIAL'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {processingId === reviewTarget.id ? 'Menyimpan...' : reviewMode === 'PARTIAL' ? 'Simpan ACC Partial' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Photo Preview Modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setPhotoPreview(null)}
        >
          <div className="max-w-lg w-full bg-[#161b24] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black text-white">{photoPreview.title}</span>
              <button type="button" onClick={() => setPhotoPreview(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={photoPreview.url} alt={photoPreview.title} className="w-full max-h-[75vh] object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
