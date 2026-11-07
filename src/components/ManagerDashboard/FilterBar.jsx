import React from 'react';
import { Search, Filter, AlertTriangle, CheckCircle, Calendar, RefreshCw, Building2 } from 'lucide-react';

export default function FilterBar({
  dateRange,
  setDateRange,
  venue = 'ALL',
  setVenue,
  department,
  setDepartment,
  flagFilter,
  setFlagFilter,
  search,
  setSearch,
  departments = [],
  onRefresh
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer"
          >
            <option value="TODAY">Filter: Today</option>
            <option value="YESTERDAY">Filter: Yesterday</option>
            <option value="LAST_7_DAYS">Filter: Last 7 Days</option>
            <option value="ALL">Filter: All Time</option>
          </select>
        </div>

        {/* Venue Filter (JP Karaoke vs LuckyCat) */}
        <div className="relative">
          <select
            value={venue}
            onChange={(e) => setVenue && setVenue(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer font-semibold"
          >
            <option value="ALL">All Venues / Outlets</option>
            <option value="JP Karaoke">🎤 JP Karaoke</option>
            <option value="LuckyCat">🐱 LuckyCat</option>
          </select>
        </div>

        {/* Division Filter */}
        <div className="relative">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer"
          >
            <option value="ALL">All Divisions</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Flag Filter */}
        <div className="relative">
          <select
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none transition appearance-none cursor-pointer ${
              flagFilter === 'FLAGS_ONLY'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500'
            }`}
          >
            <option value="ALL">All Statuses (Normal & Flags)</option>
            <option value="FLAGS_ONLY">⚠️ Flags Only (Anomalies)</option>
            <option value="NORMAL_ONLY">✓ Normal Shifts Only</option>
          </select>
        </div>
      </div>

      {/* Quick Pills row */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400 font-medium">Quick Filter:</span>
          <button
            onClick={() => setFlagFilter(flagFilter === 'FLAGS_ONLY' ? 'ALL' : 'FLAGS_ONLY')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
              flagFilter === 'FLAGS_ONLY'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Show Anomalies Only</span>
          </button>
        </div>

        <button
          onClick={onRefresh}
          className="text-slate-400 hover:text-white flex items-center space-x-1 text-xs"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh Data</span>
        </button>
      </div>
    </div>
  );
}
