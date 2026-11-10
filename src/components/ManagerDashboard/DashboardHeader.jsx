import React from 'react';
import { Users, Clock, AlertTriangle, MapPin, Printer, Settings, FileSpreadsheet, RotateCcw, Shield, RefreshCw } from 'lucide-react';

export default function DashboardHeader({
  stats,
  onPrint,
  onExportCsv,
  isExporting = false,
  onOpenSettings,
  onOpenResetLeaderboard,
  onOpenRecovery,
  isReadOnly = false,
  onRefresh,
  loading = false
}) {
  const cards = [
    {
      label: "Today's Shifts",
      value: stats?.totalToday ?? 0,
      icon: Users,
      color: 'text-blue-400',
      border: 'border-slate-800',
      iconBg: 'bg-blue-950/80 text-blue-400 border border-blue-500/30'
    },
    {
      label: 'Currently On Shift',
      value: stats?.activeShifts ?? 0,
      icon: Clock,
      color: 'text-emerald-400',
      border: 'border-slate-800',
      iconBg: 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
    },
    {
      label: 'Flagged Anomalies',
      value: stats?.flaggedAnomalies ?? 0,
      icon: AlertTriangle,
      color: stats?.flaggedAnomalies > 0 ? 'text-amber-400' : 'text-slate-300',
      border: 'border-slate-800',
      iconBg: stats?.flaggedAnomalies > 0 ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
    },
    {
      label: 'GPS Geofence Match',
      value: `${stats?.gpsComplianceRate ?? stats?.wifiComplianceRate ?? 100}%`,
      icon: MapPin,
      color: 'text-indigo-400',
      border: 'border-slate-800',
      iconBg: 'bg-indigo-950/80 text-indigo-400 border border-indigo-500/30'
    }
  ];

  return (
    <div className="mb-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Shift Audit &amp; Anomaly Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Real-time compliance monitoring, biometric selfie inspection &amp; automated flags
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className={`px-3.5 py-2 bg-[#161b24] hover:bg-[#202736] text-slate-200 rounded-xl border border-slate-700/80 text-xs font-bold flex items-center space-x-1.5 transition shadow-xs active:scale-95 cursor-pointer ${
                loading ? 'opacity-80 cursor-wait' : ''
              }`}
              title="Segarkan data riwayat dan statistik dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2] ${loading ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{loading ? 'Menyegarkan...' : 'Refresh'}</span>
            </button>
          )}

          {/* Export Excel (.xlsx) */}
          <button
            onClick={onExportCsv}
            disabled={isExporting}
            className={`px-3.5 py-2 ${
              isExporting ? 'bg-emerald-800 opacity-80 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'
            } text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-md shadow-emerald-600/20 active:scale-95`}
            title="Export Rekap Gaji Bulanan Excel (.xlsx) seluruh staff"
          >
            <FileSpreadsheet className={`w-4 h-4 stroke-[2] ${isExporting ? 'animate-pulse' : ''}`} />
            <span>{isExporting ? 'Menyiapkan Rekap Gaji...' : 'Export Excel (.xlsx)'}</span>
          </button>

          {/* Print / Export PDF */}
          <button
            onClick={onPrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2]" />
            <span>Print / Export PDF</span>
          </button>

          {/* Reset Leaderboard & Trial Data Button - Manager Only */}
          {!isReadOnly && onOpenResetLeaderboard && (
            <button
              onClick={onOpenResetLeaderboard}
              className="px-3.5 py-2 bg-[#1c2230] hover:bg-[#252d3f] text-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-amber-500/30 shadow-xs transition active:scale-95"
              title="Reset Poin Leaderboard ke Nol atau Wipe Data Trial"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300 stroke-[2]" />
              <span>Reset Leaderboard</span>
            </button>
          )}

          {/* Disaster Recovery & Fault Switch Button - Manager Only */}
          {!isReadOnly && onOpenRecovery && (
            <button
              onClick={onOpenRecovery}
              className="px-3.5 py-2 bg-[#131b2e] hover:bg-[#1a2640] text-blue-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-blue-500/30 shadow-xs transition active:scale-95"
              title="Disaster Recovery Snapshot, Fault Switch & Server Health"
            >
              <Shield className="w-3.5 h-3.5 text-blue-300 stroke-[2]" />
              <span>Recovery</span>
            </button>
          )}

          {/* Settings Modal Button - Only accessible for Full Manager */}
          {!isReadOnly && (
            <button
              onClick={onOpenSettings}
              className="p-2 bg-[#161b24] hover:bg-[#202736] text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition shadow-xs active:scale-95"
              title="Venue & Gatekeeper Settings"
            >
              <Settings className="w-4 h-4 stroke-[2]" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-[#161b24] border ${card.border} shadow-md flex items-center justify-between`}
            >
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className={`text-2xl font-bold mt-1 block font-mono ${card.color}`}>
                  {card.value}
                </span>
              </div>
              <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
