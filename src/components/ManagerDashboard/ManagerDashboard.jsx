import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import FilterBar from './FilterBar';
import ShiftTable from './ShiftTable';
import PhotoDetailModal from './PhotoDetailModal';
import VenueSettingsModal from './VenueSettingsModal';
import PrintableTimesheet from './PrintableTimesheet';
import StaffManagementTab from './StaffManagementTab';
import ShiftSchedulesTab from './ShiftSchedulesTab';
import ToiletInspectionTab from './ToiletInspectionTab';
import { exportTimesheetToExcel } from '../../utils/excelExport';
import { getShifts, getStats, subscribeRealtimeEvents } from '../../utils/api';
import { LayoutDashboard, Users, Clock, Radio, Building2, Sparkles, Eye, ShieldAlert } from 'lucide-react';

export default function ManagerDashboard({ venueSettings, refreshSettings, adminAuth, isReadOnly = false }) {
  // Tabs: 'AUDIT' | 'SCHEDULES' | 'STAFF' | 'TOILET'
  const [activeTab, setActiveTab] = useState('AUDIT');

  const [shifts, setShifts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState('ALL');
  const [venue, setVenue] = useState('ALL');
  const [department, setDepartment] = useState('ALL');
  const [flagFilter, setFlagFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [inspectData, setInspectData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const departments = [
    'Server and Cashier',
    'Cleaning Service',
    'Storage Staff',
    'Bar, Cashier, and Server',
    'Kitchen',
    'Management'
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      let startDate = null;
      let endDate = null;

      if (dateRange === 'TODAY') {
        startDate = today.toISOString().split('T')[0];
        endDate = startDate;
      } else if (dateRange === 'YESTERDAY') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        startDate = y.toISOString().split('T')[0];
        endDate = startDate;
      } else if (dateRange === 'LAST_7_DAYS') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
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

      setShifts(shiftsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, venue, department, flagFilter, search]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((eventType) => {
      if (eventType === 'SHIFT_UPDATE') {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleExportCsv = async () => {
    if (shifts.length === 0) return alert('No records to export');
    try {
      await exportTimesheetToExcel({
        shifts,
        venueName: venueSettings?.venue_name || 'JP Karaoke & LuckyCat Outlets'
      });
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Gagal mengekspor file Excel: ' + err.message);
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
          <div className="bg-blue-50 border-2 border-blue-300 text-blue-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                <Eye className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-slate-950">
                    Mode Pengawas (View Only)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-200 text-blue-900 border border-blue-400">
                    Read Only
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-bold mt-0.5">
                  Login: <span className="font-black text-blue-950">{adminAuth?.staffName || 'Assistant Manager'}</span> • Khusus monitoring laporan absensi &amp; kebersihan toilet. Akses pendaftaran dan perubahan data dinonaktifkan.
                </p>
              </div>
            </div>
            <div className="text-[11px] font-black text-blue-900 bg-white/80 px-3 py-1.5 rounded-xl border border-blue-200 self-start sm:self-auto">
              👁️ Akses Terbatas (Laporan Saja)
            </div>
          </div>
        )}

        {/* Navigation Tabs Bar - Clean White & Blue Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm gap-1.5">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
                activeTab === 'AUDIT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
              <span>Riwayat &amp; Audit Shift</span>
            </button>

            <button
              onClick={() => setActiveTab('TOILET')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
                activeTab === 'TOILET'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Kebersihan Toilet (QR Live)</span>
            </button>

            {!isReadOnly && (
              <>
                <button
                  onClick={() => setActiveTab('SCHEDULES')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
                    activeTab === 'SCHEDULES'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-800 hover:text-blue-700 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  <span>Pengaturan Divisi &amp; Jam Kerja</span>
                </button>

                <button
                  onClick={() => setActiveTab('STAFF')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
                    activeTab === 'STAFF'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-800 hover:text-blue-700 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4 stroke-[2.5]" />
                  <span>Pengaturan Staff &amp; PIN</span>
                </button>
              </>
            )}
          </div>

          {/* SSE Realtime Indicator */}
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border-2 border-slate-200 shadow-sm text-xs font-mono font-black text-emerald-800">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping" />
            <Radio className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
            <span>Realtime Live Sync Active</span>
          </div>
        </div>

        {activeTab === 'AUDIT' && (
          <>
            <DashboardHeader
              stats={stats}
              onPrint={handlePrint}
              onExportCsv={handleExportCsv}
              onOpenSettings={() => setSettingsOpen(true)}
              isReadOnly={isReadOnly}
            />

            <FilterBar
              dateRange={dateRange}
              setDateRange={setDateRange}
              venue={venue}
              setVenue={setVenue}
              department={department}
              setDepartment={setDepartment}
              flagFilter={flagFilter}
              setFlagFilter={setFlagFilter}
              search={search}
              setSearch={setSearch}
              departments={departments}
              onRefresh={loadData}
            />

            <ShiftTable
              shifts={shifts}
              onInspectPhoto={(shift, type) => setInspectData({ shift, type })}
            />
          </>
        )}

        {activeTab === 'TOILET' && <ToiletInspectionTab />}

        {!isReadOnly && activeTab === 'SCHEDULES' && <ShiftSchedulesTab />}

        {!isReadOnly && activeTab === 'STAFF' && (
          <StaffManagementTab
            onStaffUpdated={() => {
              loadData();
              refreshSettings();
            }}
          />
        )}

        {/* Modal: High-Res Photo & Break Inspection */}
        {inspectData && (
          <PhotoDetailModal
            shift={inspectData.shift}
            type={inspectData.type}
            onClose={() => setInspectData(null)}
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
      </div>

      {/* Printable Timesheet Layout (Active only on Print) */}
      <PrintableTimesheet
        shifts={shifts}
        venueName={venueSettings?.venue_name || 'JP Karaoke & LuckyCat Outlets'}
      />
    </div>
  );
}
