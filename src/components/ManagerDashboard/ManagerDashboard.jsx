import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import FilterBar from './FilterBar';
import ShiftTable from './ShiftTable';
import PhotoDetailModal from './PhotoDetailModal';
import LateReviewModal from './LateReviewModal';
import VenueSettingsModal from './VenueSettingsModal';
import PrintableTimesheet from './PrintableTimesheet';
import StaffManagementTab from './StaffManagementTab';
import ShiftSchedulesTab from './ShiftSchedulesTab';
import ToiletInspectionTab from './ToiletInspectionTab';
import LeaveManagementTab from './LeaveManagementTab';
import AnnouncementManagementModal from './AnnouncementManagementModal';
import WipeLeaderboardModal from '../Leaderboard/WipeLeaderboardModal';
import SystemRecoveryModal from './SystemRecoveryModal';
import MonitoringAuditTab from './MonitoringAuditTab';
import PointManagementTab from './PointManagementTab';
import { exportMonthlyPayrollReport, exportTimesheetToExcel } from '../../utils/excelExport';
import { getShifts, getStats, getShiftSchedules, getStaffList, getLeaveRequests, getAnnouncements, getAnnouncementReaders, getPoints, subscribeRealtimeEvents, sendPresenceHeartbeat } from '../../utils/api';
import { getOperationalDateYMD, getOperationalYesterdayYMD, getWitaDateYMD, getAppNow, formatWitaDateTime } from '../../utils/time';
import { resolveShift } from '../../utils/shiftResolver';
import { showToast } from '../Common/Toast';
import { LayoutDashboard, Users, Clock, Radio, Building2, Sparkles, Eye, ShieldAlert, Trophy, FileText, Megaphone, Activity, Award } from 'lucide-react';

export default function ManagerDashboard({ venueSettings, refreshSettings, adminAuth, isReadOnly = false, onOpenLeaderboard }) {
  // Tabs: 'AUDIT' | 'SCHEDULES' | 'STAFF' | 'TOILET'
  const [activeTab, setActiveTab] = useState('AUDIT');

  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingPointsCount, setPendingPointsCount] = useState(0);

  // Filters - Default to TODAY's operational shift cycle (07:00 AM cutoff)
  const [dateRange, setDateRange] = useState('TODAY');
  const [specificDate, setSpecificDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [venue, setVenue] = useState('ALL');
  const [department, setDepartment] = useState('ALL');
  const [flagFilter, setFlagFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [inspectData, setInspectData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false);
  const [announcementInitialTab, setAnnouncementInitialTab] = useState('LIST');
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [announcementCompliance, setAnnouncementCompliance] = useState(null);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [lateReviewShift, setLateReviewShift] = useState(null);

  const departments = [
    'Server and Cashier',
    'Cleaning Service',
    'Storage Staff',
    'Bar, Cashier, and Server',
    'Kitchen',
    'Management'
  ];

  const loadActiveAnnouncement = async () => {
    try {
      const list = await getAnnouncements({ activeOnly: true });
      if (Array.isArray(list) && list.length > 0) {
        const top = list[0];
        setActiveAnnouncement(top);
        try {
          const report = await getAnnouncementReaders(top.id);
          setAnnouncementCompliance({
            readCount: report.read_count,
            totalStaff: report.total_active_staff,
            percentage: report.percentage,
            readersSet: new Set(report.readers.map(r => String(r.staff_id)))
          });
        } catch {}
      } else {
        setActiveAnnouncement(null);
        setAnnouncementCompliance(null);
      }
    } catch (e) {
      console.warn('Failed to load active announcement:', e);
    }
  };

  const loadPendingLeaveCount = async () => {
    try {
      const data = await getLeaveRequests({ status: 'PENDING' });
      if (Array.isArray(data)) {
        setPendingLeaveCount(data.length);
      }
    } catch (e) {
      console.warn('Failed to load pending leave requests:', e);
    }
  };

  const loadPendingPointsCount = async () => {
    try {
      const data = await getPoints({ cycleKey: 'CURRENT', status: 'PENDING' });
      if (Array.isArray(data?.points)) {
        setPendingPointsCount(data.points.length);
      }
    } catch (e) {
      console.warn('Failed to load pending points count:', e);
    }
  };

  const loadSchedules = async () => {
    try {
      const data = await getShiftSchedules();
      if (Array.isArray(data)) setSchedules(data);
    } catch (e) {
      console.warn('Failed to load schedules in dashboard:', e);
    }
  };

  useEffect(() => {
    loadSchedules();
    loadPendingLeaveCount();
    loadPendingPointsCount();
    loadActiveAnnouncement();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentOpToday = getOperationalDateYMD(now);
      let startDate = null;
      let endDate = null;

      if (dateRange === 'CUSTOM' && specificDate) {
        startDate = specificDate;
        endDate = specificDate;
      } else if (dateRange === 'TODAY') {
        startDate = currentOpToday;
        endDate = currentOpToday;
      } else if (dateRange === 'YESTERDAY') {
        const opYesterday = getOperationalYesterdayYMD(now);
        startDate = opYesterday;
        endDate = opYesterday;
      } else if (dateRange === 'LAST_7_DAYS') {
        const [y, m, d] = currentOpToday.split('-').map(Number);
        const past7 = new Date(Date.UTC(y, m - 1, d - 7, 12, 0, 0));
        const past7Str = `${past7.getUTCFullYear()}-${String(past7.getUTCMonth() + 1).padStart(2, '0')}-${String(past7.getUTCDate()).padStart(2, '0')}`;
        startDate = past7Str;
        endDate = currentOpToday;
      } else if (dateRange === 'THIS_MONTH') {
        const [year, month] = currentOpToday.split('-');
        startDate = `${year}-${month}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      }

      const [shiftsData, statsData] = await Promise.all([
        getShifts({
          startDate,
          endDate,
          venue,
          department,
          flagFilter,
          search
        }),
        getStats()
      ]);

      setShifts(shiftsData || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, specificDate, venue, department, flagFilter, search]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((eventType) => {
      if (eventType === 'SHIFT_UPDATE') {
        loadData();
        loadPendingLeaveCount();
      } else if (eventType === 'LEAVE_UPDATE') {
        loadPendingLeaveCount();
      } else if (eventType === 'ANNOUNCEMENT_UPDATE' || eventType === 'ANNOUNCEMENT_READ') {
        loadActiveAnnouncement();
      } else if (eventType === 'POINT_UPDATE') {
        loadPendingPointsCount();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Presence Heartbeat for Management / Assistant Manager Session
  useEffect(() => {
    if (!adminAuth) return;
    const isAsstMgr = adminAuth.role === 'VIEW_ONLY' || isReadOnly;
    const sendBeat = () => {
      sendPresenceHeartbeat({
        id: isAsstMgr ? 'asst_manager' : 'op_manager',
        name: isAsstMgr ? (adminAuth.staffName || 'Sherly') : 'Operational Manager',
        role: isAsstMgr ? 'Assistant Manager' : 'Operational Manager',
        venue: 'Management',
        type: isAsstMgr ? 'ASSISTANT_MANAGER' : 'MANAGER'
      }).catch(() => {});
    };
    sendBeat();
    const interval = setInterval(sendBeat, 30000);
    return () => clearInterval(interval);
  }, [adminAuth, isReadOnly]);

  const displayedShifts = React.useMemo(() => {
    if (shiftFilter === 'ALL') return shifts;
    return shifts.filter((s) => {
      const info = resolveShift(s, schedules);
      if (shiftFilter === 'FLEX') {
        return info.shiftNumber === null || info.shiftName.toLowerCase().includes('fleksibel');
      }
      return String(info.shiftNumber) === String(shiftFilter);
    });
  }, [shifts, shiftFilter, schedules]);

  // Live Floor Staff (Sedang Bertugas Detik Ini)
  const onDutyShifts = React.useMemo(() => {
    return shifts.filter(
      (s) => !s.checkout_time || s.status === 'IN_PROGRESS' || s.status === 'ON_DUTY' || s.status === 'ON_BREAK'
    );
  }, [shifts]);

  const jpOnDuty = React.useMemo(() => onDutyShifts.filter((s) => s.staff_venue === 'JP Karaoke'), [onDutyShifts]);
  const lcOnDuty = React.useMemo(() => onDutyShifts.filter((s) => s.staff_venue !== 'JP Karaoke'), [onDutyShifts]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const nowApp = getAppNow();
      const todayYmd = getOperationalDateYMD(nowApp);
      const [curYear, curMonth] = todayYmd.split('-');
      const startOfMonth = `${curYear}-${curMonth}-01`;
      const exportTimestamp = formatWitaDateTime(nowApp.toISOString());

      // Fetch month-to-date data in parallel: shifts, staff roster, and approved leave
      const [monthShifts, allStaffList, allLeaveRequests] = await Promise.all([
        getShifts({ startDate: startOfMonth, endDate: todayYmd }),
        getStaffList('ALL'),
        getLeaveRequests({ year: curYear }).catch(() => [])
      ]);

      // Strictly filter completed shifts only (strictly exclude ON_DUTY / IN_PROGRESS)
      const completedShifts = (monthShifts || []).filter(
        (s) =>
          (s.status === 'COMPLETED' || (s.checkout_time && s.status !== 'IN_PROGRESS' && s.status !== 'ON_DUTY')) &&
          s.checkin_time
      );

      await exportMonthlyPayrollReport({
        shifts: completedShifts,
        allStaff: allStaffList || [],
        leaveRequests: allLeaveRequests || [],
        periodStart: startOfMonth,
        periodEnd: todayYmd,
        exportTimestamp
      });
    } catch (err) {
      console.error('Failed to export Excel payroll recap:', err);
      showToast('Gagal mengekspor Rekap Gaji Excel: ' + (err.message || 'Terjadi kesalahan sistem'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Auto-redirect if in read-only mode and somehow on edit tabs
  useEffect(() => {
    if (isReadOnly && (activeTab === 'SCHEDULES' || activeTab === 'STAFF')) {
      setActiveTab('AUDIT');
    }
  }, [isReadOnly, activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="no-print space-y-6">
        {/* View Only Mode Notification Banner */}
        {isReadOnly && (
          <div className="bg-[#141d2e] border border-blue-500/40 text-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                <Eye className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">
                    Mode Pengawas (View Only)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-500/40">
                    Read Only
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Login: <span className="font-bold text-blue-300">{adminAuth?.staffName || 'Assistant Manager'}</span> • Khusus monitoring laporan absensi &amp; kebersihan toilet. Akses pendaftaran dan perubahan data dinonaktifkan.
                </p>
              </div>
            </div>
            <div className="text-[11px] font-bold text-blue-300 bg-blue-950/80 px-3 py-1.5 rounded-xl border border-blue-500/30 self-start sm:self-auto">
              👁️ Akses Terbatas (Laporan Saja)
            </div>
          </div>
        )}

        {/* Navigation Tabs Bar - Refined Dark Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap bg-[#161b24] p-1.5 rounded-2xl border border-slate-800 shadow-md gap-1.5">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'AUDIT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 stroke-[2.2]" />
              <span>Riwayat &amp; Audit Shift</span>
            </button>

            <button
              onClick={() => setActiveTab('TOILET')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'TOILET'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Sparkles className="w-4 h-4 stroke-[2.2]" />
              <span>Kebersihan Toilet (QR Live)</span>
            </button>

            <button
              onClick={() => setActiveTab('LEAVE')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition relative ${
                activeTab === 'LEAVE'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <FileText className="w-4 h-4 stroke-[2.2]" />
              <span>Perizinan &amp; Cuti</span>
              {pendingLeaveCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {pendingLeaveCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('POINT')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition relative cursor-pointer ${
                activeTab === 'POINT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Award className="w-4 h-4 stroke-[2.2]" />
              <span>Point</span>
              {pendingPointsCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {pendingPointsCount}
                </span>
              )}
            </button>

            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/25 text-amber-200 border border-amber-400/30 transition active:scale-95 shadow-xs"
                title="Buka Peringkat Kinerja Staf Terajin & Bonus Bulanan"
              >
                <Trophy className="w-4 h-4 text-amber-300 stroke-[2.2]" />
                <span>🏆 Leaderboard Bonus</span>
              </button>
            )}

            {!isReadOnly && (
              <>
                <button
                  onClick={() => setActiveTab('SCHEDULES')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'SCHEDULES'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                  <span>Pengaturan Divisi &amp; Jam Kerja</span>
                </button>

                <button
                  onClick={() => setActiveTab('STAFF')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'STAFF'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Users className="w-4 h-4 stroke-[2.2]" />
                  <span>Pengaturan Staff &amp; PIN</span>
                </button>

                <button
                  onClick={() => setActiveTab('MONITORING')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'MONITORING'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Activity className="w-4 h-4 stroke-[2.2]" />
                  <span>Monitoring &amp; Log Akses</span>
                </button>
              </>
            )}
          </div>

          {/* SSE Realtime Indicator */}
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#161b24] border border-slate-800 shadow-sm text-xs font-mono font-bold text-emerald-400">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <Radio className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
            <span>Realtime Live Sync Active</span>
          </div>
        </div>

        {activeTab === 'AUDIT' && (
          <>
            <DashboardHeader
              stats={stats}
              onPrint={handlePrint}
              onExportCsv={handleExportCsv}
              isExporting={isExporting}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenResetLeaderboard={() => setWipeModalOpen(true)}
              onOpenRecovery={() => setRecoveryModalOpen(true)}
              isReadOnly={isReadOnly}
              onRefresh={loadData}
              loading={loading}
            />

            {/* Official Management Announcement Compliance Bar */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border-2 border-blue-400/40 rounded-3xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                  <Megaphone className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                      Pengumuman Management (Operational Manager)
                    </span>
                    {activeAnnouncement ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/40 text-blue-100 border border-blue-400/40">
                        {activeAnnouncement.urgency === 'URGENT' ? '🚨 URGENT' : 'Aktif'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-800 text-slate-300">
                        Tidak Ada Pengumuman Aktif
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white truncate mt-0.5">
                    {activeAnnouncement ? activeAnnouncement.title : 'Belum ada pengumuman resmi yang sedang disiarkan ke staf.'}
                  </h4>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
                {activeAnnouncement && (
                  <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-black text-emerald-300 flex items-center space-x-1.5">
                    <span>{announcementCompliance?.readCount || 0}/{announcementCompliance?.totalStaff || 0} Membaca</span>
                    <span className="text-[10px] font-bold text-white/80">({announcementCompliance?.percentage || 0}%)</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAnnouncementInitialTab(activeAnnouncement ? 'LIST' : 'CREATE');
                    setAnnouncementsModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-600/30 transition flex items-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{activeAnnouncement ? 'Lihat Bukti Baca & Kelola' : '+ Buat Pengumuman (Manager)'}</span>
                </button>

                {activeAnnouncement && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementInitialTab('CREATE');
                      setAnnouncementsModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition flex items-center space-x-1"
                    title="Terbitkan Pengumuman Baru"
                  >
                    <span>+ Buat Baru</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live On-Duty Floor Intelligence Banner */}
            <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xs relative shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1 animate-ping" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1" />
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                      Sedang Bertugas di Lantai (Live On Duty)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      {onDutyShifts.length} Staf Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Monitoring staf yang saat ini aktif bertugas di masing-masing outlet
                  </p>
                </div>
              </div>

              {/* Outlet Breakdown Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-[#131b2c] border border-blue-500/30 flex items-center space-x-2">
                  <span className="text-xs">🎤</span>
                  <span className="text-xs font-bold text-blue-200">JP Karaoke:</span>
                  <span className="font-mono text-xs font-bold text-blue-300 bg-[#0f1422] px-1.5 py-0.5 rounded border border-blue-500/30">
                    {jpOnDuty.length} Orang
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#241c12] border border-amber-500/30 flex items-center space-x-2">
                  <span className="text-xs">🐱</span>
                  <span className="text-xs font-bold text-amber-200">LuckyCat:</span>
                  <span className="font-mono text-xs font-bold text-amber-300 bg-[#1a140d] px-1.5 py-0.5 rounded border border-amber-500/30">
                    {lcOnDuty.length} Orang
                  </span>
                  {lcOnDuty.some((s) => s.break_status === 'ON_BREAK') && (
                    <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 px-1.5 py-0.2 rounded border border-sky-500/40">
                      ({lcOnDuty.filter((s) => s.break_status === 'ON_BREAK').length} istirahat)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <FilterBar
              dateRange={dateRange}
              setDateRange={setDateRange}
              specificDate={specificDate}
              setSpecificDate={setSpecificDate}
              shiftFilter={shiftFilter}
              setShiftFilter={setShiftFilter}
              venue={venue}
              setVenue={setVenue}
              department={department}
              setDepartment={setDepartment}
              flagFilter={flagFilter}
              setFlagFilter={setFlagFilter}
              search={search}
              setSearch={setSearch}
              departments={departments}
              loading={loading}
              onRefresh={loadData}
              totalResults={displayedShifts.length}
            />

            <ShiftTable
              shifts={displayedShifts}
              schedules={schedules}
              readersSet={announcementCompliance?.readersSet}
              hasActiveAnnouncement={Boolean(activeAnnouncement)}
              onInspectPhoto={(shift, type) => setInspectData({ shift, type })}
              onReviewLate={(shift) => setLateReviewShift(shift)}
            />
          </>
        )}

        {activeTab === 'TOILET' && <ToiletInspectionTab />}

        {activeTab === 'LEAVE' && (
          <LeaveManagementTab
            adminAuth={adminAuth}
            onRefreshData={() => {
              loadData();
              loadPendingLeaveCount();
            }}
          />
        )}

        {activeTab === 'POINT' && (
          <PointManagementTab
            adminAuth={adminAuth}
            isReadOnly={isReadOnly}
            onPointsUpdated={loadPendingPointsCount}
          />
        )}

        {!isReadOnly && activeTab === 'SCHEDULES' && <ShiftSchedulesTab />}

        {!isReadOnly && activeTab === 'STAFF' && (
          <StaffManagementTab
            onStaffUpdated={() => {
              loadData();
              refreshSettings();
            }}
          />
        )}

        {!isReadOnly && activeTab === 'MONITORING' && (
          <MonitoringAuditTab adminAuth={adminAuth} />
        )}

        {/* Modal: High-Res Photo & Break Inspection */}
        {inspectData && (
          <PhotoDetailModal
            shift={inspectData.shift}
            type={inspectData.type}
            adminAuth={adminAuth}
            onShiftUpdated={() => {
              loadData();
              loadPendingLeaveCount();
            }}
            onClose={() => setInspectData(null)}
          />
        )}

        {/* Modal: 1-Click Late Check-In Review */}
        {lateReviewShift && (
          <LateReviewModal
            shift={lateReviewShift}
            schedules={schedules}
            adminAuth={adminAuth}
            onClose={() => setLateReviewShift(null)}
            onShiftUpdated={() => {
              loadData();
              loadPendingLeaveCount();
            }}
          />
        )}

        {/* Modal: Geofence & Subnet Settings (Only for Full Manager) */}
        {!isReadOnly && settingsOpen && (
          <VenueSettingsModal
            settings={venueSettings}
            onClose={() => setSettingsOpen(false)}
            onSaved={() => {
              refreshSettings();
              loadData();
            }}
            onGoToSchedules={() => {
              setSettingsOpen(false);
              setActiveTab('SCHEDULES');
            }}
          />
        )}

        {/* Modal: Reset Leaderboard & Trial Data (Only for Full Manager) */}
        {!isReadOnly && wipeModalOpen && (
          <WipeLeaderboardModal
            isOpen={wipeModalOpen}
            onClose={() => setWipeModalOpen(false)}
            onSuccess={() => {
              loadData();
            }}
          />
        )}

        {/* Modal: Management Announcements & Read Receipts */}
        {announcementsModalOpen && (
          <AnnouncementManagementModal
            isOpen={announcementsModalOpen}
            onClose={() => setAnnouncementsModalOpen(false)}
            adminAuth={adminAuth}
            isReadOnly={isReadOnly}
            initialTab={announcementInitialTab}
            onAnnouncementChanged={() => {
              loadActiveAnnouncement();
            }}
          />
        )}

        {/* Modal: Disaster Recovery, Backups & Fault Switch */}
        {!isReadOnly && recoveryModalOpen && (
          <SystemRecoveryModal
            isOpen={recoveryModalOpen}
            onClose={() => setRecoveryModalOpen(false)}
            adminAuth={adminAuth}
            venueSettings={venueSettings}
          />
        )}
      </div>

      {/* Printable Timesheet Layout (Active only on Print) */}
      <PrintableTimesheet
        shifts={displayedShifts}
        venueName={venueSettings?.venue_name || 'JP Karaoke & LuckyCat Outlets'}
      />
    </div>
  );
}
