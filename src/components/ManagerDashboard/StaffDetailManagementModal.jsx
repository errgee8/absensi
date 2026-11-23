import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  CalendarX,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Edit3,
  Plus,
  Sparkles,
  Star,
  History,
  ShieldAlert,
  ChevronRight,
  FileText,
  Zap
} from 'lucide-react';
import {
  getStaffAttendanceHistory,
  getStaffAuditTrail,
  getPoints,
  createStaffPoint,
  deleteStaffPoint,
  getPointDeletionLogs,
  saveStaffDayAdjustment,
  clearShiftLateness,
  reviewLateCheckin,
  deleteShift,
  deleteLeaveRequest,
  getFlexible9hSettings,
  updateFlexible9hEligibleStaff
} from '../../utils/api';
import { showToast } from '../Common/Toast';
import PointDeletionLogsModal from './PointDeletionLogsModal';
import KudosAuditLogsModal from './KudosAuditLogsModal';
import {
  formatWitaDateFull,
  formatWitaDateOnly,
  formatWitaTimeOnly,
  formatWitaDateTime,
  formatDuration
} from '../../utils/time';

export default function StaffDetailManagementModal({
  isOpen,
  onClose,
  staff,
  initialTab = 'POINTS', // 'POINTS' | 'WORK_DAYS' | 'LATE' | 'LEAVE' | 'AUDIT'
  adminAuth,
  isReadOnly = false,
  onUpdate
}) {
  const canEditStaffData = !isReadOnly && (adminAuth?.role === 'MANAGER' || adminAuth?.role === 'FULL_ADMIN');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [monthChoice, setMonthChoice] = useState('CURRENT'); // 'CURRENT' | 'PREVIOUS'
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Flexible 9H Shift permission state for this staff
  const [isFlexEligible, setIsFlexEligible] = useState(false);
  const [togglingFlex, setTogglingFlex] = useState(false);

  useEffect(() => {
    if (!staff?.id) return;
    let mounted = true;
    getFlexible9hSettings()
      .then((data) => {
        if (!mounted) return;
        const ids = data?.eligibleStaffIds || [];
        setIsFlexEligible(
          ids.includes(String(staff.id)) ||
          (staff.legacy_code && ids.includes(String(staff.legacy_code))) ||
          (staff.uuid && ids.includes(String(staff.uuid))) ||
          staff.shift_start === 'FLEXIBLE'
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [staff?.id, staff?.uuid, staff?.legacy_code, staff?.shift_start]);

  const handleToggleFlex = async () => {
    setTogglingFlex(true);
    try {
      const data = await getFlexible9hSettings();
      const currentIds = (data?.eligibleStaffIds || []).map(String);
      const sId = String(staff.id);
      let nextIds;
      if (currentIds.includes(sId)) {
        nextIds = currentIds.filter((id) => id !== sId);
      } else {
        nextIds = [...currentIds, sId];
      }
      await updateFlexible9hEligibleStaff(nextIds);
      setIsFlexEligible(!isFlexEligible);
      showToast(
        !isFlexEligible
          ? `Izin Shift Fleksibel 9 Jam diberikan kepada ${staff.name}!`
          : `Izin Shift Fleksibel 9 Jam dicabut dari ${staff.name}.`,
        'success'
      );
      if (onUpdate) onUpdate();
    } catch (e) {
      showToast('Gagal mengubah izin shift: ' + e.message, 'error');
    } finally {
      setTogglingFlex(false);
    }
  };

  // Loaded data
  const [attendanceData, setAttendanceData] = useState(null);
  const [pointsList, setPointsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Point creation form state
  const [showAddPointForm, setShowAddPointForm] = useState(false);
  const [newPointType, setNewPointType] = useState('MINUS'); // 'PLUS' | 'MINUS'
  const [newPointValue, setNewPointValue] = useState(1);
  const [newPointCategory, setNewPointCategory] = useState('Kedisiplinan');
  const [newPointReason, setNewPointReason] = useState('');
  const [newPointPin, setNewPointPin] = useState(adminAuth?.pin || '');
  const [pointSubmitting, setPointSubmitting] = useState(false);
  const [pointFormError, setPointFormError] = useState(null);

  // Day adjustment state
  const [adjDays, setAdjDays] = useState(1);
  const [adjReason, setAdjReason] = useState('');
  const [adjPin, setAdjPin] = useState(adminAuth?.pin || '');
  const [adjSubmitting, setAdjSubmitting] = useState(false);
  const [adjError, setAdjError] = useState(null);
  const [adjSuccess, setAdjSuccess] = useState(null);

  // Universal Action Confirmation Modal state (for deletions & status changes)
  const [actionModal, setActionModal] = useState(null);
  const [actionPin, setActionPin] = useState(adminAuth?.pin || '');
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Point Deletion & Kudos Modals State
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState([]);
  const [loadingDeletionLogs, setLoadingDeletionLogs] = useState(false);
  const [showKudosModal, setShowKudosModal] = useState(false);

  const handleOpenDeletionLogs = async () => {
    setShowDeletionModal(true);
    setLoadingDeletionLogs(true);
    try {
      const res = await getPointDeletionLogs();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.logs) ? res.logs : []);
      setDeletionLogs(list);
    } catch {
      setDeletionLogs([]);
    } finally {
      setLoadingDeletionLogs(false);
    }
  };

  // Sync initial tab when modal opens or initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Sync PIN from adminAuth
  useEffect(() => {
    if (adminAuth?.pin) {
      setAdjPin(adminAuth.pin);
      setNewPointPin(adminAuth.pin);
      setActionPin(adminAuth.pin);
    }
  }, [adminAuth]);

  // Load all details for this staff
  const loadStaffDetails = async (mChoice = monthChoice) => {
    if (!staff?.id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const now = new Date();
      let targetMonthKey = now.toISOString().substring(0, 7);
      if (mChoice === 'PREVIOUS') {
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = prevMonth.getFullYear();
        const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
        targetMonthKey = `${y}-${m}`;
      }

      const staffIdentifier = staff.id;
      const [histData, auditData, ptsData] = await Promise.all([
        getStaffAttendanceHistory(staffIdentifier, targetMonthKey).catch(() => null),
        getStaffAuditTrail(staffIdentifier).catch(() => []),
        getPoints({ staffId: staffIdentifier }).catch(() => ({ points: [] }))
      ]);

      setAttendanceData(histData);
      setAuditLogs(Array.isArray(auditData) ? auditData : []);
      setPointsList(ptsData?.points || []);
    } catch (err) {
      console.error('Failed to load staff details:', err);
      setErrorMsg(err.message || 'Gagal memuat detail data karyawan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && staff?.id) {
      loadStaffDetails(monthChoice);
    }
  }, [isOpen, staff?.id, monthChoice]);

  if (!isOpen || !staff) return null;

  // Handle month choice switch
  const handleMonthChoiceChange = (newChoice) => {
    setMonthChoice(newChoice);
    loadStaffDetails(newChoice);
  };

  // 1. Submit Add Point
  const handleAddPointSubmit = async (e) => {
    e.preventDefault();
    const effectivePin = (newPointPin || adminAuth?.pin || '').trim();
    if (!effectivePin) {
      setPointFormError('PIN Otorisasi Manajer wajib diisi.');
      return;
    }
    if (!newPointReason.trim()) {
      setPointFormError('Alasan pemberian poin wajib diisi.');
      return;
    }

    setPointSubmitting(true);
    setPointFormError(null);
    try {
      const numericVal = Math.abs(Number(newPointValue) || 1);
      await createStaffPoint({
        staffId: staff.id,
        staffName: staff.name,
        points: numericVal,
        pointType: newPointType,
        category: newPointCategory,
        reason: newPointReason.trim(),
        pin: effectivePin
      });
      setShowAddPointForm(false);
      setNewPointReason('');
      await loadStaffDetails(monthChoice);
      if (onUpdate) onUpdate();
    } catch (err) {
      setPointFormError(err.message || 'Gagal menambahkan poin.');
    } finally {
      setPointSubmitting(false);
    }
  };

  // 2. Submit Day Adjustment
  const handleSaveDayAdjustment = async (e) => {
    e.preventDefault();
    if (adjSubmitting) return;
    const effectivePin = (adjPin || adminAuth?.pin || '').trim();
    if (!effectivePin) {
      setAdjError('PIN Otorisasi Manajer wajib diisi.');
      return;
    }
    if (!adjReason.trim()) {
      setAdjError('Alasan penyesuaian hari kerja wajib diisi.');
      return;
    }

    setAdjSubmitting(true);
    setAdjError(null);
    setAdjSuccess(null);
    try {
      await saveStaffDayAdjustment({
        pin: effectivePin,
        staffId: staff.id,
        staffName: staff.name,
        adjustmentDays: Number(adjDays),
        reason: adjReason.trim()
      });
      setAdjSuccess(`Berhasil menyimpan penyesuaian hari kerja (${Number(adjDays) > 0 ? '+' : ''}${adjDays} hari).`);
      setAdjReason('');
      await loadStaffDetails(monthChoice);
      if (onUpdate) onUpdate();
    } catch (err) {
      setAdjError(err.message || 'Gagal menyimpan penyesuaian hari kerja.');
    } finally {
      setAdjSubmitting(false);
    }
  };

  // 3. Open universal action confirmation modal
  const handleOpenActionModal = (actionConfig) => {
    setActionModal(actionConfig);
    setActionPin(adminAuth?.pin || '');
    setActionReason(actionConfig.defaultReason || '');
    setActionError(null);
  };

  // 4. Execute sensitive action (Clear Late, Delete Point, Delete Shift, Delete Leave)
  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!actionModal || actionSubmitting) return;
    const effectivePin = (actionPin || adminAuth?.pin || '').trim();
    if (!effectivePin) {
      setActionError('PIN Otorisasi Manajer wajib diisi.');
      return;
    }

    setActionSubmitting(true);
    setActionError(null);
    try {
      if (actionModal.type === 'DELETE_POINT') {
        await deleteStaffPoint(actionModal.id, effectivePin, actionReason.trim() || 'Catatan poin dihapus/dibatalkan oleh Manajer');
      } else if (actionModal.type === 'CLEAR_LATE') {
        await clearShiftLateness(actionModal.id, effectivePin, actionReason.trim() || 'Keterlambatan dibatalkan oleh Manajer');
      } else if (actionModal.type === 'REVIEW_LATE') {
        await reviewLateCheckin(actionModal.id, {
          pin: effectivePin,
          action: actionModal.extra?.action || 'APPROVE',
          managerNotes: actionReason.trim() || (actionModal.extra?.action === 'APPROVE' ? 'Di-ACC Manajer' : 'Ditolak Manajer')
        });
      } else if (actionModal.type === 'DELETE_SHIFT') {
        await deleteShift(actionModal.id, effectivePin, actionReason.trim() || 'Riwayat shift dihapus oleh Manajer');
      } else if (actionModal.type === 'DELETE_LEAVE') {
        await deleteLeaveRequest(actionModal.id, effectivePin, actionReason.trim() || 'Riwayat izin dihapus oleh Manajer');
      }

      setActionModal(null);
      await loadStaffDetails(monthChoice);
      if (onUpdate) onUpdate();
    } catch (err) {
      setActionError(err.message || 'Gagal mengeksekusi tindakan.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Computed summary values
  const stats = attendanceData?.stats || {
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

  const shifts = attendanceData?.shifts || [];
  const lateRecords = attendanceData?.lateRecords || [];
  const absenceRecords = attendanceData?.absenceRecords || [];

  // Active points calculation
  const totalActivePoints = pointsList.reduce((acc, p) => {
    if (p.status === 'REVOKED') return acc;
    const val = Math.abs(Number(p.points) || 0);
    const isPlus = p.point_type === 'PLUS' || p.type === 'PLUS';
    return isPlus ? acc + val : acc - val;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#151923] border border-slate-700/80 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181d29] to-[#12161f] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            {staff.photo_url || staff.staff_profile_photo_url ? (
              <img
                src={staff.photo_url || staff.staff_profile_photo_url}
                alt={staff.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg shrink-0">
                {staff.name?.charAt(0) || 'S'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {staff.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {staff.id}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-slate-400 truncate font-bold">
                  {staff.venue || staff.staff_venue} &bull; {staff.role || staff.division || staff.staff_role}
                </p>
                <button
                  type="button"
                  disabled={togglingFlex}
                  onClick={handleToggleFlex}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border transition cursor-pointer ${
                    isFlexEligible
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/50 hover:bg-purple-500/30 shadow-xs'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Klik untuk mengaktifkan / menonaktifkan izin Shift Fleksibel 9 Jam (HOD) untuk staf ini"
                >
                  <Zap className={`w-3 h-3 ${isFlexEligible ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                  <span>{isFlexEligible ? '⚡ Fleksibel 9 Jam (Aktif)' : '+ Izin Fleksibel 9 Jam'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Month Filter Selector */}
            <div className="flex items-center bg-[#12161f] p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => handleMonthChoiceChange('CURRENT')}
                className={`px-2.5 py-1 rounded-lg font-black transition cursor-pointer text-[11px] ${
                  monthChoice === 'CURRENT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleMonthChoiceChange('PREVIOUS')}
                className={`px-2.5 py-1 rounded-lg font-black transition cursor-pointer text-[11px] ${
                  monthChoice === 'PREVIOUS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulan Lalu
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadStaffDetails(monthChoice)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-4 pt-3 pb-2 bg-[#12161f] border-b border-slate-800/80 flex items-center space-x-2 overflow-x-auto shrink-0 scrollbar-none">
          {/* Tab 1: Poin */}
          <button
            type="button"
            onClick={() => setActiveTab('POINTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'POINTS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Riwayat Poin</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
              totalActivePoints > 0 ? 'bg-emerald-500/30 text-emerald-300' : totalActivePoints < 0 ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-700 text-slate-300'
            }`}>
              {totalActivePoints > 0 ? `+${totalActivePoints}` : totalActivePoints}
            </span>
          </button>

          {/* Tab 2: Hari Kerja & Shift */}
          <button
            type="button"
            onClick={() => setActiveTab('WORK_DAYS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'WORK_DAYS'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Hari Kerja &amp; Shift</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md font-mono text-[10px] bg-blue-500/30 text-blue-300">
              {stats.workDays ?? 0} Hari
            </span>
          </button>

          {/* Tab 3: Keterlambatan */}
          <button
            type="button"
            onClick={() => setActiveTab('LATE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'LATE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>Keterlambatan</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
              (stats.totalLate || 0) > 0 ? 'bg-rose-500/30 text-rose-300 font-bold' : 'bg-slate-700 text-slate-400'
            }`}>
              {stats.totalLate || 0}
            </span>
          </button>

          {/* Tab 4: Izin & Cuti */}
          <button
            type="button"
            onClick={() => setActiveTab('LEAVE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'LEAVE'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CalendarX className="w-3.5 h-3.5 text-purple-400" />
            <span>Izin &amp; Cuti</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md font-mono text-[10px] bg-purple-500/30 text-purple-300">
              {absenceRecords.length}
            </span>
          </button>

          {/* Tab 5: Audit Trail */}
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Log Audit Manajer</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md font-mono text-[10px] bg-slate-700 text-slate-300">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {loading && !attendanceData && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Memuat rincian riwayat staf...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-xs text-rose-300 font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!loading && (
            <>
              {/* TAB 1: POINTS MANAGEMENT */}
              {activeTab === 'POINTS' && (
                <div className="space-y-4">
                  {/* Poin Summary Card & Add Point Trigger */}
                  <div className="p-4 bg-[#1a202c] border border-slate-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-xl border ${
                        totalActivePoints > 0
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : totalActivePoints < 0
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {totalActivePoints > 0 ? `+${totalActivePoints}` : totalActivePoints}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Total Poin Aktif Staf
                        </span>
                        <p className="text-xs font-bold text-slate-200 mt-0.5">
                          {totalActivePoints > 0
                            ? 'Staf memiliki catatan apresiasi/poin plus berjalan.'
                            : totalActivePoints < 0
                            ? 'Akumulasi sanksi/pelanggaran aktif staf.'
                            : 'Staf tertib tanpa catatan sanksi.'}
                        </p>
                      </div>
                    </div>

                    {canEditStaffData ? (
                      <button
                        type="button"
                        onClick={() => setShowAddPointForm(!showAddPointForm)}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{showAddPointForm ? 'Batal Form Poin' : 'Beri Poin Baru'}</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[11px] font-bold border border-slate-700 self-center">
                        🔒 Akses Edit Khusus Manajer
                      </span>
                    )}
                  </div>

                  {!canEditStaffData && (
                    <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex items-center space-x-2 text-xs text-amber-300 font-bold">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Mode Pengawas (Assistant Manager): Anda dalam mode Lihat Saja (View Only). Penambahan dan penghapusan poin staf hanya dapat dilakukan oleh Operational Manager.</span>
                    </div>
                  )}

                  {/* Form: Add / Deduct Points */}
                  {canEditStaffData && showAddPointForm && (
                    <form onSubmit={handleAddPointSubmit} className="p-4 bg-[#161b24] border border-amber-500/40 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-black text-amber-300 border-b border-slate-800 pb-2">
                        <span className="flex items-center space-x-1.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span>Form Penambahan Poin / Sanksi (Manajer)</span>
                        </span>
                        <span className="text-[10px] text-slate-400 lowercase">otorisasi pin manajer</span>
                      </div>

                      {pointFormError && (
                        <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-bold flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{pointFormError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            Tipe Poin:
                          </label>
                          <select
                            value={newPointType}
                            onChange={(e) => setNewPointType(e.target.value)}
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="MINUS">Penalti / Sanksi (-)</option>
                            <option value="PLUS">Apresiasi / Bonus (+)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            Jumlah Poin:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={newPointValue}
                            onChange={(e) => setNewPointValue(e.target.value)}
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-black text-xs focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            Kategori:
                          </label>
                          <select
                            value={newPointCategory}
                            onChange={(e) => setNewPointCategory(e.target.value)}
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="Kedisiplinan">Kedisiplinan / Telat</option>
                            <option value="Kerapihan">Kerapihan &amp; Seragam</option>
                            <option value="Pelayanan">Pelayanan Tamu</option>
                            <option value="Inspeksi Toilet">Inspeksi Toilet</option>
                            <option value="SOP & Operasional">SOP &amp; Operasional</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            Alasan Poin (Wajib Diisi):
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Keterlambatan tanpa kabar / Apresiasi inisiatif lembur"
                            value={newPointReason}
                            onChange={(e) => setNewPointReason(e.target.value)}
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            PIN Manajer:
                          </label>
                          <input
                            type="password"
                            maxLength={8}
                            placeholder="PIN Manager..."
                            value={newPointPin}
                            onChange={(e) => setNewPointPin(e.target.value)}
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono tracking-widest text-xs focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddPointForm(false)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={pointSubmitting}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1"
                        >
                          {pointSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <span>Simpan Poin</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Points */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-black text-slate-400 px-1">
                      <div>
                        <span>Daftar Riwayat Poin ({pointsList.length})</span>
                        <span className="text-[10px] text-slate-500 block">Manajer dapat menghapus poin kapan saja</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleOpenDeletionLogs}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                          title="Buka Log Riwayat Poin yang Pernah Dihapus oleh Manajer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Riwayat Hapus Poin</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowKudosModal(true)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                          title="Buka Log Pengiriman Bintang Apresiasi (Peer Kudos)"
                        >
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Log Bintang</span>
                        </button>
                      </div>
                    </div>

                    {pointsList.length === 0 ? (
                      <div className="p-8 bg-[#12161f] border border-slate-800 rounded-2xl text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-sm text-slate-300">Tidak ada catatan poin</p>
                        <p className="text-xs text-slate-500 mt-0.5">Staff tertib dan tidak memiliki catatan sanksi / penalti.</p>
                      </div>
                    ) : (
                      pointsList.map((pt) => {
                        const isPlus = pt.point_type === 'PLUS' || pt.type === 'PLUS';
                        const pts = Math.abs(Number(pt.points) || 0);

                        return (
                          <div
                            key={pt.id}
                            className="p-3.5 bg-[#12161f] hover:bg-[#161b24] border border-slate-800 rounded-2xl flex items-center justify-between transition gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-black border ${
                                  isPlus
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                }`}>
                                  {isPlus ? `+${pts}` : `-${pts}`} Poin
                                </span>
                                <span className="font-black text-white text-xs truncate">
                                  {pt.category || 'Disiplin'} &bull; {pt.reason || pt.type}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Diberikan: {pt.created_at ? formatWitaDateTime(pt.created_at) : '-'} &bull; Oleh: <strong className="text-slate-300">{pt.awarded_by || 'Manajer'}</strong>
                              </p>
                            </div>

                            {canEditStaffData && (
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal({
                                  type: 'DELETE_POINT',
                                  id: pt.id,
                                  title: 'Hapus Catatan Poin',
                                  description: `Hapus catatan poin (${isPlus ? `+${pts}` : `-${pts}`} poin: "${pt.reason || pt.category}") dari staf ini? Tindakan ini akan dicatat transparan di audit log staf.`,
                                  defaultReason: 'Catatan poin dihapus/dibatalkan oleh Manajer'
                                })}
                                className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/80 text-rose-300 hover:text-white rounded-xl text-[11px] font-black transition flex items-center space-x-1 cursor-pointer shrink-0"
                                title="Hapus Catatan Poin"
                              >
                                <Trash2 className="w-3 h-3 text-rose-400" />
                                <span>Hapus Poin</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: WORK DAYS & SHIFTS */}
              {activeTab === 'WORK_DAYS' && (
                <div className="space-y-4">
                  {/* Summary & Day Adjustment Form (Manager Only) */}
                  {!canEditStaffData ? (
                    <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-2 text-amber-300 font-bold">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Mode Pengawas (Assistant Manager): Koreksi hari kerja dan penghapusan shift hanya dapat dilakukan oleh Operational Manager.</span>
                      </div>
                      <span className="text-xs font-mono font-black text-blue-300 bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/30 self-start sm:self-auto shrink-0">
                        Total: {stats.workDays ?? 0} Hari (Aktual: {stats.actualWorkDays ?? 0})
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-br from-[#1a202c] to-[#12161f] border border-slate-700/80 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-white">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-black">⚡ Koreksi / Penyesuaian Hari Kerja (Otorisasi Manajer)</h4>
                        </div>
                        <span className="text-xs font-mono font-black text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30">
                          Total: {stats.workDays ?? 0} Hari (Aktual: {stats.actualWorkDays ?? 0}, Penyesuaian: {stats.manualDaysSum > 0 ? `+${stats.manualDaysSum}` : (stats.manualDaysSum || 0)})
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                        Gunakan fitur ini untuk menambah bonus hari kerja (misal: lembur/bantuan event) atau memotong hari kerja. Nilai ini otomatis mempengaruhi leaderboard dan perhitungan gaji.
                      </p>

                      {adjError && (
                        <div className="p-2.5 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-bold flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{adjError}</span>
                        </div>
                      )}

                      {adjSuccess && (
                        <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{adjSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleSaveDayAdjustment} className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-black text-slate-300 mb-1">
                              Nilai Penyesuaian Hari (+ / -):
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="1"
                                value={adjDays}
                                onChange={(e) => setAdjDays(e.target.value)}
                                required
                                className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-black text-sm focus:outline-none focus:border-blue-500"
                              />
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setAdjDays(1)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black border transition ${
                                    Number(adjDays) === 1 ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdjDays(-1)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black border transition ${
                                    Number(adjDays) === -1 ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  -1
                                </button>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-300 mb-1">
                              PIN Otorisasi Manajer:
                            </label>
                            <input
                              type="password"
                              maxLength={8}
                              value={adjPin}
                              onChange={(e) => setAdjPin(e.target.value)}
                              placeholder="PIN Manager..."
                              required
                              className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono tracking-widest text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            Alasan Penyesuaian (Wajib Diisi):
                          </label>
                          <input
                            type="text"
                            value={adjReason}
                            onChange={(e) => setAdjReason(e.target.value)}
                            placeholder="Contoh: Bantuan operasional event / Koreksi lupa absensi"
                            required
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={adjSubmitting || !adjPin.trim() || !adjReason.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                          >
                            {adjSubmitting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Menyimpan...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Terapkan Penyesuaian Hari</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* List of Shifts */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-400 px-1">
                      <span>Rincian Shift Selesai Bulan Ini ({shifts.length})</span>
                      <span className="text-[10px] text-slate-500">Hapus shift jika ada data duplikat/salah</span>
                    </div>

                    {shifts.length === 0 ? (
                      <div className="p-8 bg-[#12161f] border border-slate-800 rounded-2xl text-center text-slate-400">
                        <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <p className="font-bold text-sm text-slate-300">Belum ada data shift kerja</p>
                        <p className="text-xs text-slate-500 mt-0.5">Belum ada shift kerja selesai yang tercatat pada periode ini.</p>
                      </div>
                    ) : (
                      shifts.map((shift, idx) => (
                        <div key={shift.id || idx} className="p-3.5 bg-[#12161f] border border-slate-800 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black text-white">
                                {shift.date ? formatWitaDateOnly(shift.date) : '-'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {shift.staff_venue || shift.venue || staff.venue}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {shift.status || 'COMPLETED'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-bold">
                            <div className="p-2 bg-[#161b24] rounded-xl border border-slate-800/80">
                              <span className="text-[10px] text-slate-500 block">Jam Masuk:</span>
                              <span className="text-white font-mono">
                                {shift.checkin_time ? formatWitaTimeOnly(shift.checkin_time) : '-'}
                              </span>
                            </div>
                            <div className="p-2 bg-[#161b24] rounded-xl border border-slate-800/80">
                              <span className="text-[10px] text-slate-500 block">Jam Pulang:</span>
                              <span className="text-white font-mono">
                                {shift.checkout_time ? formatWitaTimeOnly(shift.checkout_time) : '-'}
                              </span>
                            </div>
                            <div className="p-2 bg-[#161b24] rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
                              <span className="text-[10px] text-slate-500 block">Durasi Kerja:</span>
                              <span className="text-emerald-400 font-mono">
                                {shift.duration_minutes ? formatDuration(shift.duration_minutes) : '-'}
                              </span>
                            </div>
                          </div>

                          {canEditStaffData && (
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal({
                                  type: 'DELETE_SHIFT',
                                  id: shift.id,
                                  title: 'Hapus Riwayat Shift',
                                  description: `Hapus permanen riwayat shift tanggal ${shift.date} ini? Tindakan ini akan menghapus log presensi dari database dan mengurangi akumulasi hari kerja.`,
                                  defaultReason: 'Shift salah input/dihapus oleh Manajer'
                                })}
                                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-black transition flex items-center space-x-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 text-rose-400" />
                                <span>Hapus Shift Ini</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: LATENESS HISTORY & CLEAR LATE */}
              {activeTab === 'LATE' && (
                <div className="space-y-3">
                  {!canEditStaffData && (
                    <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex items-center space-x-2 text-xs text-amber-300 font-bold">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Mode Pengawas (Assistant Manager): Anda dalam mode Lihat Saja. Pembatalan status telat dan review alasan hanya dapat dilakukan oleh Operational Manager.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-black text-slate-400 px-1">
                    <span>Riwayat Keterlambatan ({lateRecords.length})</span>
                    <span className="text-[10px] text-slate-500">{canEditStaffData ? 'Klik "Hapus Status Telat" untuk memaafkan/membatalkan sanksi' : 'Daftar riwayat keterlambatan staf'}</span>
                  </div>

                  {lateRecords.length === 0 ? (
                    <div className="p-8 bg-[#12161f] border border-slate-800 rounded-2xl text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-sm text-slate-300">Tidak ada riwayat keterlambatan</p>
                      <p className="text-xs text-slate-500 mt-0.5">Staf selalu hadir tepat waktu pada periode ini.</p>
                    </div>
                  ) : (
                    lateRecords.map((rec, idx) => (
                      <div key={rec.shift_id || idx} className="p-4 bg-[#12161f] border border-slate-800 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-xs font-black text-white">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>{rec.date ? formatWitaDateOnly(rec.date) : '-'}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            rec.late_status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : rec.late_status === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {rec.late_status === 'APPROVED' ? '✓ Di-ACC Manajer' : rec.late_status === 'REJECTED' ? '✕ Ditolak' : '⏳ Menunggu Review'}
                          </span>
                        </div>

                        <div className="text-xs text-amber-300 font-bold flex items-center space-x-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Masuk: <strong className="text-white">{rec.actual_time_wita || (rec.checkin_time ? formatWitaTimeOnly(rec.checkin_time) : '-')}</strong> (Jadwal: {rec.scheduled_start}) &bull; Telat <strong className="text-rose-400">+{rec.late_minutes} menit</strong>
                          </span>
                        </div>

                        <div className="p-3 bg-[#161b24] rounded-xl border border-slate-800">
                          <span className="text-[10px] uppercase font-black text-slate-500 block">ALASAN KETERLAMBATAN:</span>
                          <p className="text-slate-300 font-bold text-xs mt-0.5">"{rec.late_reason || 'Tidak ada alasan tertulis'}"</p>
                        </div>

                        {rec.late_reviewed_by && (
                          <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                            <span>Di-review oleh: <strong className="text-white">{rec.late_reviewed_by}</strong></span>
                            {rec.late_manager_note && <span>Catatan: "{rec.late_manager_note}"</span>}
                          </div>
                        )}

                        {/* Management Actions */}
                        {canEditStaffData && (
                          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal({
                                type: 'CLEAR_LATE',
                                id: rec.shift_id,
                                title: 'Hapus Status Keterlambatan',
                                description: `Hapus status keterlambatan (+${rec.late_minutes} menit) pada shift tanggal ${rec.date}? Poin penalti akan dipulihkan dan perubahan dicatat di log audit staf.`,
                                defaultReason: 'Keterlambatan dibatalkan oleh Manajer'
                              })}
                              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-black transition flex items-center space-x-1 cursor-pointer"
                              title="Hapus status telat dari shift ini"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus Status Telat</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenActionModal({
                                type: 'REVIEW_LATE',
                                id: rec.shift_id,
                                title: rec.late_status === 'APPROVED' ? 'Tolak Keterlambatan' : 'Setujui (ACC) Keterlambatan',
                                description: `Ubah status review keterlambatan tanggal ${rec.date} menjadi ${rec.late_status === 'APPROVED' ? 'DITOLAK' : 'DI-ACC'}?`,
                                defaultReason: rec.late_status === 'APPROVED' ? 'Alasan ditolak oleh Manajer' : 'Di-ACC dan dimaafkan oleh Manajer',
                                extra: { action: rec.late_status === 'APPROVED' ? 'REJECT' : 'APPROVE' }
                              })}
                              className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-[11px] font-black transition flex items-center space-x-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{rec.late_status === 'APPROVED' ? 'Ubah: Tolak' : 'Ubah: ACC'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenActionModal({
                                type: 'DELETE_SHIFT',
                                id: rec.shift_id,
                                title: 'Hapus Riwayat Shift',
                                description: `Hapus permanen seluruh data shift tanggal ${rec.date} ini? Tindakan ini akan menghapus log presensi dari database.`,
                                defaultReason: 'Shift salah input/dihapus oleh Manajer'
                              })}
                              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-black transition flex items-center space-x-1 cursor-pointer"
                              title="Hapus permanen shift ini"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span>Hapus Shift</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: LEAVE & CUTI */}
              {activeTab === 'LEAVE' && (
                <div className="space-y-3">
                  {!canEditStaffData && (
                    <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex items-center space-x-2 text-xs text-amber-300 font-bold">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Mode Pengawas (Assistant Manager): Anda dalam mode Lihat Saja. Penghapusan riwayat izin / cuti hanya dapat dilakukan oleh Operational Manager.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-black text-slate-400 px-1">
                    <span>Riwayat Izin &amp; Cuti ({absenceRecords.length})</span>
                    <span className="text-[10px] text-slate-500">{canEditStaffData ? 'Hapus izin jika dibatalkan staf atau salah pengajuan' : 'Daftar riwayat izin staf'}</span>
                  </div>

                  {absenceRecords.length === 0 ? (
                    <div className="p-8 bg-[#12161f] border border-slate-800 rounded-2xl text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-sm text-slate-300">Tidak ada riwayat izin / cuti</p>
                      <p className="text-xs text-slate-500 mt-0.5">Staf tidak memiliki catatan izin atau ketidakhadiran pada periode ini.</p>
                    </div>
                  ) : (
                    absenceRecords.map((rec, idx) => (
                      <div key={rec.id || idx} className="p-4 bg-[#12161f] border border-slate-800 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                              {rec.category || rec.type}
                            </span>
                            <span className="text-xs font-black text-white">
                              {rec.start_date ? formatWitaDateOnly(rec.start_date) : '-'} {rec.end_date && rec.end_date !== rec.start_date ? `s/d ${formatWitaDateOnly(rec.end_date)}` : ''} ({rec.requested_days || 1} Hari)
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            rec.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : rec.status === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {rec.status === 'APPROVED' ? '✓ Disetujui' : rec.status === 'REJECTED' ? '✕ Ditolak' : '⏳ Menunggu'}
                          </span>
                        </div>

                        <div className="p-3 bg-[#161b24] rounded-xl border border-slate-800">
                          <span className="text-[10px] uppercase font-black text-slate-500 block">ALASAN PENGAJUAN:</span>
                          <p className="text-slate-300 font-bold text-xs mt-0.5">"{rec.reason || '-'}"</p>
                        </div>

                        {rec.reviewed_by && (
                          <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                            <span>Di-review oleh: <strong className="text-white">{rec.reviewed_by}</strong></span>
                            {rec.manager_notes && <span>Catatan: "{rec.manager_notes}"</span>}
                          </div>
                        )}

                        {canEditStaffData && rec.type === 'LEAVE' && (
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal({
                                type: 'DELETE_LEAVE',
                                id: rec.id,
                                title: 'Hapus Riwayat Izin / Cuti',
                                description: `Hapus permanen pengajuan ${rec.category || 'izin'} (${rec.requested_days || 1} hari) tanggal ${rec.start_date} dari database riwayat staf?`,
                                defaultReason: 'Dihapus/dibatalkan oleh Manajer'
                              })}
                              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-black transition flex items-center space-x-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span>Hapus Riwayat Izin</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: AUDIT TRAIL */}
              {activeTab === 'AUDIT' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 px-1">
                    <span>Log Transparansi Audit Manajer ({auditLogs.length})</span>
                    <span className="text-[10px] text-slate-500">Setiap perubahan manajer tercatat otomatis di sini</span>
                  </div>

                  {auditLogs.length === 0 ? (
                    <div className="p-8 bg-[#12161f] border border-slate-800 rounded-2xl text-center text-slate-400">
                      <History className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="font-bold text-sm text-slate-300">Belum ada catatan audit</p>
                      <p className="text-xs text-slate-500 mt-0.5">Belum ada penyesuaian atau penghapusan yang dilakukan manajer untuk staf ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-[#12161f] border border-slate-800 rounded-xl text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-400 text-[10px]">
                            <span className="font-mono">{formatWitaDateTime(log.created_at)}</span>
                            <span className="font-black text-blue-400">{log.actor || 'Manajer'}</span>
                          </div>
                          <p className="text-white font-bold">{log.description}</p>
                          {log.reason && (
                            <p className="text-slate-400 italic text-[10px]">
                              Alasan: "{log.reason}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-[#12161f] flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-500 font-bold">
            Sistem Manajemen Transparan LuckyCat &amp; JP
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR SENSITIVE ACTIONS */}
      {actionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in text-slate-200">
          <div className="bg-[#161b24] border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">{actionModal.title}</h3>
                <p className="text-xs text-slate-400 font-bold">Otorisasi Manajer Diperlukan</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-bold leading-relaxed">
              {actionModal.description}
            </p>

            {actionError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-black text-slate-300 mb-1">
                  Alasan Penghapusan / Perubahan:
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Masukkan alasan yang akan dicatat di log audit..."
                  className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 mb-1">
                  PIN Otorisasi Manajer:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={actionPin}
                  onChange={(e) => setActionPin(e.target.value)}
                  placeholder="Masukkan PIN Manager..."
                  required
                  className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono tracking-widest text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  disabled={actionSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting || !actionPin.trim() || !actionReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {actionSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Tindakan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Point Deletion Logs Audit Modal */}
      <PointDeletionLogsModal
        isOpen={showDeletionModal}
        onClose={() => setShowDeletionModal(false)}
        logs={deletionLogs}
        loading={loadingDeletionLogs}
        onRefresh={handleOpenDeletionLogs}
      />

      {/* Peer Kudos Star Audit Modal */}
      <KudosAuditLogsModal
        isOpen={showKudosModal}
        onClose={() => setShowKudosModal(false)}
      />
    </div>
  );
}
