import React from 'react';
import { Users, Clock, AlertTriangle, ShieldCheck, Printer, Settings, FileSpreadsheet } from 'lucide-react';

export default function DashboardHeader({
  stats,
  onPrint,
  onExportCsv,
  onOpenSettings
}) {
  const cards = [
    {
      label: "Today's Shifts",
      value: stats?.totalToday ?? 0,
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20'
    },
    {
      label: 'Currently On Shift',
      value: stats?.activeShifts ?? 0,
      icon: Clock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      label: 'Flagged Anomalies',
      value: stats?.flaggedAnomalies ?? 0,
      icon: AlertTriangle,
      color: stats?.flaggedAnomalies > 0 ? 'text-amber-400' : 'text-slate-400',
      bg: stats?.flaggedAnomalies > 0 ? 'bg-amber-500/10 border-amber-500/25' : 'bg-slate-800/40 border-slate-700/50'
    },
    {
      label: 'Wi-Fi Match Rate',
      value: `${stats?.wifiComplianceRate ?? 100}%`,
      icon: ShieldCheck,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20'
    }
  ];

  return (
    <div className="mb-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Shift Audit & Anomaly Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time compliance monitoring, biometric selfie inspection & automated flags
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel (.xlsx) */}
          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-700/60 flex items-center space-x-1.5 transition shadow"
            title="Export color-coded executive Excel (.xlsx) file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* Print / Export PDF */}
          <button
            onClick={onPrint}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF</span>
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Venue & Gatekeeper Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${card.bg} flex items-center justify-between`}
            >
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className={`text-2xl font-black mt-1 block ${card.color}`}>
                  {card.value}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
