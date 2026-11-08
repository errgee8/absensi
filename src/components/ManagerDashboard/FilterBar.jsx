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
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 mb-6 space-y-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 stroke-[2.5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama staf..."
            className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-950 font-black placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white transition cursor-pointer"
          >
            <option value="TODAY">Filter: Hari Ini</option>
            <option value="YESTERDAY">Filter: Kemarin</option>
            <option value="LAST_7_DAYS">Filter: 7 Hari Terakhir</option>
            <option value="ALL">Filter: Semua Riwayat</option>
          </select>
        </div>

        {/* Venue Filter (JP Karaoke vs LuckyCat) */}
        <div className="relative">
          <select
            value={venue}
            onChange={(e) => setVenue && setVenue(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white transition cursor-pointer"
          >
            <option value="ALL">Semua Outlet / Venue</option>
            <option value="JP Karaoke">🎤 JP Karaoke</option>
            <option value="LuckyCat">🐱 LuckyCat</option>
          </select>
        </div>

        {/* Division Filter */}
        <div className="relative">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white transition cursor-pointer"
          >
            <option value="ALL">Semua Divisi</option>
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
            className={`w-full border-2 rounded-xl px-3 py-2 text-xs font-black focus:outline-none transition cursor-pointer ${
              flagFilter === 'FLAGS_ONLY'
                ? 'bg-amber-100 border-amber-400 text-amber-950'
                : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
            }`}
          >
            <option value="ALL">Semua Status (Normal &amp; Flag)</option>
            <option value="FLAGS_ONLY">⚠️ Flag Anomali Saja</option>
            <option value="NORMAL_ONLY">✓ Shift Normal Saja</option>
          </select>
        </div>
      </div>

      {/* Quick Pills row */}
      <div className="flex items-center justify-between pt-2 border-t-2 border-slate-100 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-700 font-extrabold">Filter Cepat:</span>
          <button
            type="button"
            onClick={() => setFlagFilter(flagFilter === 'FLAGS_ONLY' ? 'ALL' : 'FLAGS_ONLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-sm ${
              flagFilter === 'FLAGS_ONLY'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tampilkan Anomali Saja</span>
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-blue-700 hover:text-blue-900 font-black flex items-center space-x-1.5 text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Refresh Data</span>
          </button>
        )}
      </div>
    </div>
  );
}
