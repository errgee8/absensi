import React from 'react';
import { Users, Clock, AlertTriangle, MapPin, Printer, Settings, FileSpreadsheet, RotateCcw, Shield } from 'lucide-react';

export default function DashboardHeader({
  stats,
  onPrint,
  onExportCsv,
  isExporting = false,
  onOpenSettings,
  onOpenResetLeaderboard,
  onOpenRecovery,
  isReadOnly = false
}) {
  const cards = [
    {
      label: "Today's Shifts",
      value: stats?.totalToday ?? 0,
      icon: Users,
      color: 'text-blue-700',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100 text-blue-700'
    },
    {
      label: 'Currently On Shift',
      value: stats?.activeShifts ?? 0,
      icon: Clock,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700'
    },
    {
      label: 'Flagged Anomalies',
      value: stats?.flaggedAnomalies ?? 0,
      icon: AlertTriangle,
      color: stats?.flaggedAnomalies > 0 ? 'text-amber-700' : 'text-slate-800',
      border: stats?.flaggedAnomalies > 0 ? 'border-amber-300' : 'border-slate-200',
      iconBg: stats?.flaggedAnomalies > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
    },
    {
      label: 'GPS Geofence Match',
      value: `${stats?.gpsComplianceRate ?? stats?.wifiComplianceRate ?? 100}%`,
      icon: MapPin,
      color: 'text-indigo-700',
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-100 text-indigo-700'
    }
  ];

  return (
    <div className="mb-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 flex items-center space-x-2">
            <span>Shift Audit &amp; Anomaly Intelligence</span>
          </h1>
          <p className="text-xs text-slate-700 font-bold mt-1">
            Real-time compliance monitoring, biometric selfie inspection &amp; automated flags
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel (.xlsx) */}
          <button
            onClick={onExportCsv}
            disabled={isExporting}
            className={`px-3.5 py-2 ${
              isExporting ? 'bg-emerald-800 opacity-80 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'
            } text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition shadow-md shadow-emerald-600/20`}
            title="Export Rekap Gaji Bulanan Excel (.xlsx) seluruh staff"
          >
            <FileSpreadsheet className={`w-4 h-4 stroke-[2.5] ${isExporting ? 'animate-pulse' : ''}`} />
            <span>{isExporting ? 'Menyiapkan Rekap Gaji...' : 'Export Excel (.xlsx)'}</span>
          </button>

          {/* Print / Export PDF */}
          <button
            onClick={onPrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Print / Export PDF</span>
          </button>

          {/* Reset Leaderboard & Trial Data Button - Manager Only */}
          {!isReadOnly && onOpenResetLeaderboard && (
            <button
              onClick={onOpenResetLeaderboard}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md shadow-slate-900/20 transition"
              title="Reset Poin Leaderboard ke Nol atau Wipe Data Trial"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300 stroke-[2.5]" />
              <span>Reset Leaderboard</span>
            </button>
          )}

          {/* Disaster Recovery & Fault Switch Button - Manager Only */}
          {!isReadOnly && onOpenRecovery && (
            <button
              onClick={onOpenRecovery}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md shadow-blue-700/20 transition"
              title="Disaster Recovery Snapshot, Fault Switch & Server Health"
            >
              <Shield className="w-3.5 h-3.5 text-blue-300 stroke-[2.5]" />
              <span>Recovery &amp; Fault Switch</span>
            </button>
          )}

          {/* Settings Modal Button - Only accessible for Full Manager */}
          {!isReadOnly && (
            <button
              onClick={onOpenSettings}
              className="p-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border-2 border-slate-300 transition shadow-sm"
              title="Venue & Gatekeeper Settings"
            >
              <Settings className="w-4 h-4 stroke-[2.5]" />
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
              className={`p-4 rounded-2xl bg-white border-2 ${card.border} shadow-sm flex items-center justify-between`}
            >
              <div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className={`text-2xl font-black mt-1 block font-mono ${card.color}`}>
                  {card.value}
                </span>
              </div>
              <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
