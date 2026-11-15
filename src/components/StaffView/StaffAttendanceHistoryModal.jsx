import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  CalendarX,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Award,
  Trash2,
  Edit3
} from 'lucide-react';
import { getStaffAttendanceHistory } from '../../utils/api';
import { formatWitaDateFull, formatWitaDateOnly, formatWitaTimeOnly } from '../../utils/time';

export default function StaffAttendanceHistoryModal({
  isOpen,
  onClose,
  staff,
  initialTab = 'LATE' // 'LATE' | 'ABSENT' | 'AUDIT'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedMonth, setSelectedMonth] = useState('CURRENT'); // 'CURRENT' | 'PREVIOUS'
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async (monthChoice = selectedMonth) => {
    if (!staff?.id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const now = new Date();
      let targetMonthKey = now.toISOString().substring(0, 7);

      if (monthChoice === 'PREVIOUS') {
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = prevMonth.getFullYear();
        const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
        targetMonthKey = `${y}-${m}`;
      }

      const res = await getStaffAttendanceHistory(staff.id, targetMonthKey);
      setHistoryData(res);
    } catch (err) {
      console.error('Failed to load staff attendance history:', err);
      setErrorMsg(err.message || 'Gagal memuat riwayat kehadiran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && staff?.id) {
      loadData(selectedMonth);
    }
  }, [isOpen, staff?.id, selectedMonth]);

  if (!isOpen || !staff) return null;

  const stats = historyData?.stats || {
    actualWorkDays: 0,
    manualDaysSum: 0,
    workDays: 0,
    totalLate: 0,
    approvedLate: 0,
    pendingLate: 0,
    rejectedLate: 0,
    totalLeave: 0,
    totalUnexcused: 0
  };

  const lateRecords = historyData?.lateRecords || [];
  const absenceRecords = historyData?.absenceRecords || [];
  const auditLogs = historyData?.auditLogs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-slate-100">
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#12161f] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white truncate">Riwayat Kehadiran &amp; Kedisiplinan</h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                {staff.name} • {staff.venue} • {staff.role || staff.division}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month Selector & KPI Chips */}
        <div className="p-4 bg-[#141822] border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Periode Laporan:
            </span>
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedMonth('CURRENT')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedMonth === 'CURRENT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth('PREVIOUS')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedMonth === 'PREVIOUS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulan Lalu
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#181e2b] p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Hari Kerja</span>
              <span className="text-lg font-black font-mono text-blue-300 mt-0.5 block">{stats.workDays} Hari</span>
              {Boolean(stats.manualDaysSum) && (
                <span className="text-[9px] font-bold text-indigo-400 block">
                  {stats.manualDaysSum > 0 ? `(+${stats.manualDaysSum} Manajer)` : `(${stats.manualDaysSum} Manajer)`}
                </span>
              )}
            </div>

            <div className={`p-2.5 rounded-xl border text-center ${
              stats.totalLate > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-[#181e2b] border-slate-800'
            }`}>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Telat</span>
              <span className={`text-lg font-black font-mono mt-0.5 block ${
                stats.totalLate > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>{stats.totalLate}x</span>
            </div>

            <div className={`p-2.5 rounded-xl border text-center ${
              (stats.totalLeave + stats.totalUnexcused) > 0 ? 'bg-rose-950/20 border-rose-500/30' : 'bg-[#181e2b] border-slate-800'
            }`}>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Tidak Masuk / Izin</span>
              <span className={`text-lg font-black font-mono mt-0.5 block ${
                (stats.totalLeave + stats.totalUnexcused) > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>{stats.totalLeave + stats.totalUnexcused} Hari</span>
            </div>
          </div>

          {/* Segmented Tab Controls (3 Tabs: Late, Absent, Audit) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('LATE')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'LATE'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="truncate">Keterlambatan</span>
              {stats.totalLate > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
                  activeTab === 'LATE' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {stats.totalLate}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ABSENT')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'ABSENT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <CalendarX className="w-3.5 h-3.5" />
              <span className="truncate">Tidak Masuk &amp; Izin</span>
              {(stats.totalLeave + stats.totalUnexcused) > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
                  activeTab === 'ABSENT' ? 'bg-white text-rose-700' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {stats.totalLeave + stats.totalUnexcused}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AUDIT')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'AUDIT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="truncate">Log Manajer</span>
              {auditLogs.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
                  activeTab === 'AUDIT' ? 'bg-white text-indigo-700' : 'bg-indigo-500/20 text-indigo-300'
                }`}>
                  {auditLogs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" />
              <p className="text-xs font-bold">Memuat riwayat kehadiran...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 text-center font-bold">
              {errorMsg}
            </div>
          ) : activeTab === 'LATE' ? (
            lateRecords.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                <h4 className="text-sm font-black text-white">Luar Biasa, Tidak Ada Catatan Telat!</h4>
                <p className="text-xs text-slate-400">Seluruh jadwal kerja Anda pada bulan ini tercatat tepat waktu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lateRecords.map((item, idx) => {
                  const isApproved = item.late_status === 'APPROVED';
                  const isPending = item.late_status === 'PENDING_REVIEW';
                  const isRejected = item.late_status === 'REJECTED';

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-[#181e2b] border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-sm hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-1.5 text-xs font-black text-white">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>{formatWitaDateFull(item.date || item.shift_date)}</span>
                          </div>
                          <div className="text-xs text-amber-300 font-bold mt-1 flex items-center space-x-2 flex-wrap">
                            <span>⚠️ Masuk: <strong className="font-mono text-white">{formatWitaTimeOnly(item.checkin_time)} WITA</strong></span>
                            <span className="text-slate-400 text-[11px] font-mono">(Jadwal: {item.scheduled_start || '-'})</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">
                              Telat +{item.late_minutes} menit
                            </span>
                          </div>
                        </div>

                        {/* Late status badge */}
                        <div className="shrink-0">
                          {isApproved ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Di-ACC Manajer</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Menunggu Review</span>
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Ditolak</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 bg-slate-800">
                              Belum Direview
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reason & Proof Photo */}
                      <div className="bg-[#12161f] p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Alasan Keterlambatan:
                        </div>
                        <p className="italic text-slate-200">
                          &ldquo;{item.late_reason || 'Tidak ada alasan tertulis'}&rdquo;
                        </p>
                        {item.late_proof_photo && (
                          <div className="pt-1.5 flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl(item.late_proof_photo)}
                              className="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Lihat Foto Bukti Telat</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Review details */}
                      {item.late_reviewed_by && (
                        <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-800/80 pt-2">
                          <span>Direview oleh: <strong className="text-slate-200">{item.late_reviewed_by}</strong></span>
                          {item.late_reviewed_at && (
                            <span className="font-mono">{formatWitaDateOnly(item.late_reviewed_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'ABSENT' ? (
            absenceRecords.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                <h4 className="text-sm font-black text-white">Kehadiran Sempurna!</h4>
                <p className="text-xs text-slate-400">Tidak ada catatan izin, cuti, maupun absensi tidak terkonfirmasi di bulan ini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {absenceRecords.map((item, idx) => {
                  const isUnexcused = item.type === 'UNEXCUSED_ABSENCE';
                  const isLeaveApproved = item.status === 'APPROVED' || item.status === 'ADJUSTED';
                  const isLeavePending = item.status === 'PENDING';

                  return (
                    <div
                      key={item.id || idx}
                      className={`bg-[#181e2b] border rounded-2xl p-4 space-y-2.5 shadow-sm transition ${
                        isUnexcused
                          ? 'border-rose-500/40 bg-rose-950/10'
                          : isLeaveApproved
                          ? 'border-slate-800'
                          : 'border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-1.5 text-xs font-black text-white">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>
                              {isUnexcused
                                ? formatWitaDateFull(item.date)
                                : item.start_date === item.end_date
                                ? formatWitaDateFull(item.start_date)
                                : `${formatWitaDateOnly(item.start_date)} - ${formatWitaDateOnly(item.end_date)}`}
                            </span>
                          </div>
                          <div className="text-xs font-bold mt-1 text-slate-300">
                            {isUnexcused ? (
                              <span className="text-rose-400 font-black">Tidak Ada Presensi (Hari Kerja Kosong)</span>
                            ) : (
                              <span>Kategori: <strong className="text-white">{item.category}</strong> ({item.requested_days || 1} Hari)</span>
                            )}
                          </div>
                        </div>

                        {/* Status chip */}
                        <div className="shrink-0">
                          {isUnexcused ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <AlertCircle className="w-3 h-3 text-rose-400" />
                              <span>Alpa / Tanpa Presensi</span>
                            </span>
                          ) : isLeaveApproved ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Izin Disetujui</span>
                            </span>
                          ) : isLeavePending ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Menunggu ACC</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <span>Ditolak</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail / Alasan */}
                      <div className="bg-[#12161f] p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Keterangan / Alasan:
                        </div>
                        <p className="font-medium text-slate-200">
                          {item.reason}
                        </p>
                      </div>

                      {/* Approval metadata */}
                      {item.reviewed_by && (
                        <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-800/80 pt-2">
                          <span>Disetujui oleh: <strong className="text-slate-200">{item.reviewed_by}</strong></span>
                          {item.reviewed_at && (
                            <span className="font-mono">{formatWitaDateOnly(item.reviewed_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 3: AUDIT LOGS BY MANAGEMENT */
            auditLogs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-indigo-400" />
                <h4 className="text-sm font-black text-white">Belum Ada Penyesuaian Manual</h4>
                <p className="text-xs text-slate-400">Seluruh riwayat dan poin staf saat ini murni tercatat otomatis dari log absensi sistem.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="bg-[#181e2b] border border-slate-800 rounded-2xl p-4 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        log.action_type === 'DAY_ADJUSTED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : log.action_type === 'POINT_REMOVED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {log.action_type === 'DAY_ADJUSTED'
                          ? 'Penyesuaian Hari Kerja'
                          : log.action_type === 'POINT_REMOVED'
                          ? 'Koreksi Penghapusan Poin'
                          : 'Koreksi Penghapusan Izin'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatWitaDateFull(log.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-bold leading-relaxed">
                      {log.description}
                    </p>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                      <span>Otoritas: <strong className="text-slate-300">{log.author_name || 'Operational Manager'}</strong></span>
                      <span className="text-[9px] text-emerald-400 font-bold">✓ Tercatat di Audit Log</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#12161f] border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-medium">
            Data tercatat transparan dari log sistem &amp; otorisasi manajer
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Lightbox photo preview */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-lg w-full bg-[#181e2b] border border-slate-800 rounded-3xl p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewPhotoUrl} alt="Bukti Foto" className="w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
