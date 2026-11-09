import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  X,
  Palmtree,
  HeartPulse,
  RefreshCw,
  Search,
  Check,
  Edit3,
  Eye,
  ShieldCheck,
  MessageSquare,
  Lock,
  User,
  Clock,
  Filter
} from 'lucide-react';
import { getLeaveRequests, reviewLeaveRequest } from '../../utils/api';
import { formatWitaDateOnly, formatWitaDateTime } from '../../utils/time';

export default function LeaveManagementTab({ adminAuth, onRefreshData }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'CUTI' | 'IZIN'
  const [filterStatus, setFilterStatus] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'ADJUSTED' | 'REJECTED' | 'ALL'
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Review Action Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE'); // 'APPROVE' | 'ADJUST' | 'REJECT'
  const [approvedDays, setApprovedDays] = useState(1);
  const [approvedStart, setApprovedStart] = useState('');
  const [approvedEnd, setApprovedEnd] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getLeaveRequests();
      setRequests(data || []);
    } catch (e) {
      console.error('Failed to load leave requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openReviewModal = (req, action) => {
    setTargetRequest(req);
    setReviewAction(action);
    setApprovedDays(req.requested_days || 1);
    setApprovedStart(req.start_date || '');
    setApprovedEnd(req.end_date || '');
    setManagerNotes('');
    setPin(adminAuth?.pin || '');
    setActionError(null);
    setReviewModalOpen(true);
  };

  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setActionError('Silakan masukkan PIN Manager / Assistant Manager untuk otorisasi.');
      return;
    }
    if ((reviewAction === 'ADJUST' || reviewAction === 'REJECT') && !managerNotes.trim()) {
      setActionError('Catatan penjelasan dari management wajib diisi saat menyesuaikan atau menolak.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      await reviewLeaveRequest(targetRequest.id, {
        pin: pin.trim(),
        action: reviewAction,
        approvedDays: reviewAction === 'ADJUST' ? Number(approvedDays) : targetRequest.requested_days,
        approvedStartDate: reviewAction === 'ADJUST' ? approvedStart : targetRequest.start_date,
        approvedEndDate: reviewAction === 'ADJUST' ? approvedEnd : targetRequest.end_date,
        managerNotes: managerNotes.trim()
      });

      setReviewModalOpen(false);
      await loadRequests();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setActionError(err.message || 'Gagal menyimpan review.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        (r.staff_name && r.staff_name.toLowerCase().includes(q)) ||
        (r.staff_division && r.staff_division.toLowerCase().includes(q)) ||
        (r.staff_venue && r.staff_venue.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const cutiPendingCount = requests.filter((r) => r.type === 'CUTI' && r.status === 'PENDING').length;
  const izinPendingCount = requests.filter((r) => r.type === 'IZIN' && r.status === 'PENDING').length;

  return (
    <div className="space-y-5 animate-fade-in text-slate-900">
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase text-slate-500">Total Menunggu Review</span>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{pendingCount} Pengajuan</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
            ⏳
          </div>
        </div>

        <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase text-slate-500">Cuti Tahunan Pending</span>
            <div className="text-2xl font-black text-blue-700 mt-0.5">{cutiPendingCount} Staf</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
            🌴
          </div>
        </div>

        <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase text-slate-500">Izin Sakit Pending</span>
            <div className="text-2xl font-black text-purple-700 mt-0.5">{izinPendingCount} Surat</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
            🏥
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama staf, divisi, alasan..."
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Type selector */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 transition"
            >
              <option value="ALL">Semua Jenis (Cuti &amp; Izin)</option>
              <option value="CUTI">🌴 Cuti Tahunan Saja</option>
              <option value="IZIN">🏥 Izin Sakit / Darurat</option>
            </select>

            {/* Status selector */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 transition"
            >
              <option value="PENDING">⏳ Menunggu Review Saja</option>
              <option value="APPROVED">✅ Disetujui Penuh</option>
              <option value="ADJUSTED">✏️ Disesuaikan</option>
              <option value="REJECTED">❌ Ditolak</option>
              <option value="ALL">Semua Status</option>
            </select>

            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 transition"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Requests Card Grid */}
      {loading && requests.length === 0 ? (
        <div className="py-20 text-center text-slate-500 font-bold space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p>Memuat daftar permohonan cuti dan izin...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-500 space-y-1">
          <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
          <p className="font-black text-slate-800 text-sm">Tidak ada pengajuan yang cocok dengan filter.</p>
          <p className="text-xs">Semua permohonan staf sudah di-review atau belum ada pengajuan baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const isCuti = req.type === 'CUTI';
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isAdjusted = req.status === 'ADJUSTED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className={`bg-white border-2 rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : isApproved
                    ? 'border-emerald-300'
                    : isAdjusted
                    ? 'border-blue-300'
                    : 'border-slate-200 opacity-90'
                }`}
              >
                <div>
                  {/* Card Header: Type Badge & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 ${
                      isCuti
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-purple-100 text-purple-900 border border-purple-300'
                    }`}>
                      {isCuti ? <Palmtree className="w-3 h-3 text-amber-500" /> : <HeartPulse className="w-3 h-3 text-rose-500" />}
                      <span>{isCuti ? 'Cuti Tahunan (12h/thn)' : req.category === 'SAKIT' ? 'Izin Sakit' : 'Izin Darurat'}</span>
                    </span>

                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                      isPending
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isApproved
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : isAdjusted
                        ? 'bg-blue-100 text-blue-950 border border-blue-300'
                        : 'bg-rose-100 text-rose-950 border border-rose-300'
                    }`}>
                      {isPending
                        ? '⏳ Menunggu Review'
                        : isApproved
                        ? '✅ Disetujui Penuh'
                        : isAdjusted
                        ? `✏️ Disesuaikan (${req.approved_days}h)`
                        : '❌ Ditolak'}
                    </span>
                  </div>

                  {/* Staff Info & Photo */}
                  <div className="flex items-start space-x-3 mb-3">
                    {/* Selfie or Proof Photo Thumbnail */}
                    <div className="relative shrink-0">
                      {req.photo_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(req.photo_url)}
                          className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-300 hover:opacity-85 shadow-sm group relative block"
                          title="Klik untuk perbesar bukti"
                        >
                          <img src={req.photo_url} alt="Bukti" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-black text-slate-600">
                          {req.staff_name?.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-slate-950 truncate">{req.staff_name}</h4>
                      <p className="text-[11px] text-slate-600 font-bold">
                        {req.staff_venue} • {req.staff_division}
                      </p>
                      <div className="mt-1 flex items-center space-x-1.5 text-xs font-mono font-black text-blue-900">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {formatWitaDateOnly(req.start_date)} s/d {formatWitaDateOnly(req.end_date)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          ({req.requested_days} Hari)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reason text */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 font-bold mb-3">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-black">Alasan Pengajuan:</span>
                    <p className="mt-0.5 leading-relaxed font-black text-slate-950">"{req.reason}"</p>
                  </div>

                  {/* Adjustment info if adjusted */}
                  {isAdjusted && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 font-bold mb-3">
                      <div className="flex items-center space-x-1 text-blue-900 font-black">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Penyesuaian Hari yang Disetujui:</span>
                      </div>
                      <p className="text-[11px] mt-0.5">
                        Disetujui <strong>{req.approved_days} Hari</strong> ({formatWitaDateOnly(req.approved_start_date || req.start_date)} s/d {formatWitaDateOnly(req.approved_end_date || req.end_date)})
                      </p>
                    </div>
                  )}

                  {/* Log ACC & Notes */}
                  {req.reviewed_by && (
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-700 font-bold mb-3 space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Di-review oleh: <strong className="text-slate-900">{req.reviewed_by}</strong></span>
                        <span>{formatWitaDateTime(req.reviewed_at)}</span>
                      </div>
                      {req.manager_notes && (
                        <div className="pt-1 border-t border-slate-200 text-slate-900 font-bold">
                          <span className="text-slate-500">Catatan: </span>
                          <span>"{req.manager_notes}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Management Action Buttons (Available for Manager & Assistant Manager) */}
                <div className="pt-3 border-t-2 border-slate-100 flex items-center justify-end gap-2">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openReviewModal(req, 'REJECT')}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-xl text-xs font-black transition flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Tolak</span>
                      </button>

                      {isCuti && (
                        <button
                          type="button"
                          onClick={() => openReviewModal(req, 'ADJUST')}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-300 rounded-xl text-xs font-black transition flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Sesuaikan (ACC Parsial)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openReviewModal(req, 'APPROVE')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Setujui (ACC Penuh)</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => openReviewModal(req, req.status === 'APPROVED' ? 'REJECT' : 'APPROVE')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-black transition"
                      >
                        Ubah Keputusan Review
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REVIEW & AUTHORIZATION MODAL */}
      {reviewModalOpen && targetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-900">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header */}
            <div className={`p-4 text-white flex items-center justify-between ${
              reviewAction === 'APPROVE'
                ? 'bg-emerald-600'
                : reviewAction === 'ADJUST'
                ? 'bg-blue-600'
                : 'bg-rose-600'
            }`}>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-tight">
                  {reviewAction === 'APPROVE'
                    ? 'Konfirmasi ACC Penuh'
                    : reviewAction === 'ADJUST'
                    ? 'Sesuaikan Jumlah Hari Cuti (ACC Parsial)'
                    : 'Konfirmasi Penolakan Pengajuan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleExecuteReview} className="p-5 space-y-4 text-xs font-bold">
              
              {/* Target info preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="text-slate-950 font-black text-sm">{targetRequest.staff_name}</div>
                <div className="text-slate-600 text-[11px]">
                  {targetRequest.type === 'CUTI' ? '🌴 Cuti Tahunan' : '🏥 Izin Sakit'} • {formatWitaDateOnly(targetRequest.start_date)} s/d {formatWitaDateOnly(targetRequest.end_date)} ({targetRequest.requested_days} Hari)
                </div>
                <div className="text-slate-800 text-[11px] pt-1 border-t border-slate-200">
                  Alasan: "{targetRequest.reason}"
                </div>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Adjustment Fields if Action == ADJUST */}
              {reviewAction === 'ADJUST' && (
                <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl space-y-3">
                  <div className="text-blue-950 font-black">Atur Hari Cuti yang Di-ACC:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-600 font-black mb-1">Mulai Tanggal:</label>
                      <input
                        type="date"
                        value={approvedStart}
                        onChange={(e) => setApprovedStart(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 font-black mb-1">Hingga Tanggal:</label>
                      <input
                        type="date"
                        value={approvedEnd}
                        onChange={(e) => setApprovedEnd(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-black mb-1">Jumlah Hari yang Di-ACC:</label>
                    <input
                      type="number"
                      min={1}
                      max={targetRequest.requested_days}
                      value={approvedDays}
                      onChange={(e) => setApprovedDays(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Manager Notes */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  Catatan Management: {reviewAction !== 'APPROVE' && <span className="text-rose-600">*Wajib</span>}
                </label>
                <textarea
                  rows={2}
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVE'
                      ? 'Catatan opsional (misal: Selamat berlibur, dll)...'
                      : reviewAction === 'ADJUST'
                      ? 'Alasan penyesuaian (misal: Kamis wajib masuk karena ada event)...'
                      : 'Alasan penolakan (misal: Personel shift sedang kurang)...'
                  }
                  required={reviewAction !== 'APPROVE'}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              {/* PIN Otorisasi */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  PIN Otorisasi (Manager / Assistant Manager):
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Masukkan PIN Manager / Asst Manager..."
                    required
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-950 tracking-widest focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                  Nama Anda akan otomatis tercatat di Log ACC sistem.
                </p>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-black text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !pin.trim()}
                  className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-sm flex items-center space-x-1.5 disabled:opacity-50 ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : reviewAction === 'ADJUST'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Keputusan</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: PHOTO PROOF ZOOM MODAL */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-black">Bukti Foto / Surat Keterangan</span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[80vh] overflow-auto flex items-center justify-center">
              <img src={selectedPhoto} alt="Bukti Foto" className="max-w-full max-h-[75vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
