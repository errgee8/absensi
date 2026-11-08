import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import FilterBar from './FilterBar';
import ShiftTable from './ShiftTable';
import PhotoDetailModal from './PhotoDetailModal';
import VenueSettingsModal from './VenueSettingsModal';
import PrintableTimesheet from './PrintableTimesheet';
import StaffManagementTab from './StaffManagementTab';
import ShiftSchedulesTab from './ShiftSchedulesTab';
import { exportTimesheetToExcel } from '../../utils/excelExport';
import { getShifts, getStats, subscribeRealtimeEvents } from '../../utils/api';
import { LayoutDashboard, Users, Clock, Radio, Building2 } from 'lucide-react';

export default function ManagerDashboard({ venueSettings, refreshSettings }) {
  // Tabs: 'AUDIT' | 'SCHEDULES' | 'STAFF'
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
    'Kitchen'
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="no-print space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'AUDIT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Riwayat & Audit Shift</span>
            </button>

            <button
              onClick={() => setActiveTab('SCHEDULES')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'SCHEDULES'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pengaturan Divisi & Jam Kerja (Shift Templates)</span>
            </button>

            <button
              onClick={() => setActiveTab('STAFF')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'STAFF'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pengaturan Staff & PIN</span>
            </button>
          </div>

          {/* SSE Realtime Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <Radio className="w-3.5 h-3.5" />
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

        {activeTab === 'SCHEDULES' && <ShiftSchedulesTab />}

        {activeTab === 'STAFF' && (
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

        {/* Modal: Geofence & Subnet Settings */}
        {settingsOpen && (
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
