import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, AlertTriangle, CheckCircle2, ChevronRight, FileText, Image as ImageIcon, CalendarX, AlertCircle, RefreshCw } from 'lucide-react';
import { getStaffAttendanceHistory } from '../../utils/api';
import { formatWitaDateFull, formatWitaDateOnly, formatWitaTimeOnly } from '../../utils/time';

export default function StaffAttendanceHistoryModal({
  isOpen,
  onClose,
  staff,
  initialTab = 'LATE' // 'LATE' | 'ABSENT'
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

          {/* Segmented Tab Controls */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('LATE')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'LATE'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Riwayat Keterlambatan</span>
              {stats.totalLate > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'LATE' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {stats.totalLate}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ABSENT')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'ABSENT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-black'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <CalendarX className="w-3.5 h-3.5" />
              <span>Riwayat Tidak Masuk &amp; Izin</span>
              {(stats.totalLeave + stats.totalUnexcused) > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'ABSENT' ? 'bg-white text-blue-900' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {stats.totalLeave + stats.totalUnexcused}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Memuat riwayat kehadiran...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : activeTab === 'LATE' ? (
            /* TAB 1: RIWAYAT KETERLAMBATAN */
            lateRecords.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-[#131720] border border-slate-800/80 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-white">Disiplin Sangat Baik!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tidak ada catatan keterlambatan pada periode ini. Pertahankan ketepatan waktu Anda!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lateRecords.map((item, idx) => {
                  const isApproved = item.late_status === 'APPROVED';
                  const isPending = item.late_status === 'PENDING_REVIEW';
                  const isRejected = item.late_status === 'REJECTED';

                  return (
                    <div
                      key={item.shift_id || idx}
                      className="bg-[#181e2b] border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 space-y-2.5 shadow-md transition"
                    >
                      {/* Top Header: Date, Late Minutes, Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-white flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>{formatWitaDateFull(item.date)}</span>
                          </div>
                          <div className="text-[11px] text-amber-300 font-mono font-bold mt-1">
                            ⚠️ Masuk: <span className="text-white">{item.actual_time_wita}</span> (Jadwal: {item.scheduled_start})
                            {item.late_minutes > 0 && ` • Telat +${item.late_minutes} menit`}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 text-right">
                          {isApproved && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Di-ACC Manajer</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Menunggu Review</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Ditolak (+Poin)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Alasan Terlambat dari Staff */}
                      <div className="bg-[#12161f] p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Alasan Keterlambatan:
                        </div>
                        <p className="font-medium text-slate-200 italic">
                          "{item.late_reason || 'Tidak ada alasan tertulis'}"
                        </p>
                      </div>

                      {/* Review details from Manager if available */}
                      {item.late_reviewed_by && (
                        <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-800/80 pt-2">
                          <span>Ditinjau oleh: <strong className="text-slate-200">{item.late_reviewed_by}</strong></span>
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
          ) : (
            /* TAB 2: RIWAYAT TIDAK MASUK & PERIZINAN */
            absenceRecords.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-[#131720] border border-slate-800/80 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-white">Kehadiran 100%!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tidak ada catatan hari alpa atau perizinan tidak masuk pada periode ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {absenceRecords.map((item, idx) => {
                  const isUnexcused = item.type === 'UNEXCUSED';
                  const isLeaveApproved = item.status === 'APPROVED';
                  const isLeavePending = item.status === 'PENDING';

                  return (
                    <div
                      key={item.id || idx}
                      className={`border rounded-2xl p-3.5 space-y-2.5 shadow-md transition ${
                        isUnexcused
                          ? 'bg-rose-950/20 border-rose-500/35'
                          : 'bg-[#181e2b] border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-white flex items-center space-x-1.5">
                            <CalendarX className={`w-3.5 h-3.5 ${isUnexcused ? 'text-rose-400' : 'text-blue-400'}`} />
                            <span>
                              {formatWitaDateFull(item.date || item.start_date)}
                              {item.end_date && item.end_date !== item.start_date && ` s/d ${formatWitaDateFull(item.end_date)}`}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono font-bold mt-1">
                            {isUnexcused ? (
                              <span className="text-rose-300">
                                ⚠️ Tidak Masuk Kerja (Jadwal: {item.scheduled_start || '13:00'} - {item.scheduled_end || '22:00'})
                              </span>
                            ) : (
                              <span className="text-blue-300">
                                📋 Pengajuan {item.category || item.type} ({item.requested_days || 1} Hari)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 text-right">
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
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#12161f] border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-medium">
            Data tercatat otomatis dari log absensi sistem
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
    </div>
  );
}
