import React, { useState } from 'react';
import { Search, Calendar, RefreshCw, AlertTriangle, Clock, X, CalendarCheck2, Check } from 'lucide-react';
import { formatWitaDateFull } from '../../utils/time';

export default function FilterBar({
  dateRange,
  setDateRange,
  specificDate,
  setSpecificDate,
  shiftFilter = 'ALL',
  setShiftFilter,
  venue = 'ALL',
  setVenue,
  department = 'ALL',
  setDepartment,
  flagFilter = 'ALL',
  setFlagFilter,
  search,
  setSearch,
  departments = [],
  loading = false,
  onRefresh,
  totalResults = 0
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const isActuallyRefreshing = loading || isSpinning;

  const handleRefreshClick = async () => {
    if (!onRefresh || isActuallyRefreshing) return;
    setIsSpinning(true);
    setJustRefreshed(false);

    const minSpinPromise = new Promise((resolve) => setTimeout(resolve, 800));
    try {
      if (typeof onRefresh === 'function') {
        await Promise.all([Promise.resolve(onRefresh()), minSpinPromise]);
      } else {
        await minSpinPromise;
      }
      setJustRefreshed(true);
      setTimeout(() => {
        setJustRefreshed(false);
      }, 2000);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsSpinning(false);
    }
  };

  const isCustomDate = dateRange === 'CUSTOM' && specificDate;

  const handlePickDate = (e) => {
    const val = e.target.value;
    if (val) {
      setSpecificDate(val);
      setDateRange('CUSTOM');
    } else {
      setSpecificDate('');
      setDateRange('ALL');
    }
  };

  const handleClearDate = () => {
    setSpecificDate('');
    setDateRange('ALL');
  };

  const handlePresetDate = (range) => {
    setSpecificDate('');
    setDateRange(range);
  };

  return (
    <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-5 mb-6 space-y-4 shadow-md">
      {/* Top Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 stroke-[2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / ID staf..."
            className="w-full bg-[#12161f] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-medium placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-[#151a24] transition"
          />
        </div>

        {/* 2. Venue Filter (JP Karaoke vs LuckyCat) */}
        <div className="relative">
          <select
            value={venue}
            onChange={(e) => setVenue && setVenue(e.target.value)}
            className="w-full bg-[#12161f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500 focus:bg-[#151a24] transition cursor-pointer"
          >
            <option value="ALL">Semua Outlet / Venue</option>
            <option value="JP Karaoke">🎤 JP Karaoke</option>
            <option value="LuckyCat">🐱 LuckyCat</option>
          </select>
        </div>

        {/* 3. Division Filter */}
        <div className="relative">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-[#12161f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500 focus:bg-[#151a24] transition cursor-pointer"
          >
            <option value="ALL">Semua Divisi</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Shift Filter */}
        <div className="relative">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter && setShiftFilter(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition cursor-pointer ${
              shiftFilter !== 'ALL'
                ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                : 'bg-[#12161f] border-slate-700/80 text-white focus:border-blue-500'
            }`}
          >
            <option value="ALL">Semua Shift</option>
            <option value="1">Shift 1 (Pagi / Siang)</option>
            <option value="2">Shift 2 (Middle / Malam)</option>
            <option value="3">Shift 3 (Malam / Middle 1)</option>
            <option value="4">Shift 4 (Middle 2)</option>
            <option value="FLEX">Shift Fleksibel (Management)</option>
          </select>
        </div>

        {/* 5. Flag Filter */}
        <div className="relative">
          <select
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition cursor-pointer ${
              flagFilter === 'FLAGS_ONLY'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                : 'bg-[#12161f] border-slate-700/80 text-white focus:border-blue-500'
            }`}
          >
            <option value="ALL">Semua Status (Normal &amp; Flag)</option>
            <option value="FLAGS_ONLY">⚠️ Flag Anomali Saja</option>
            <option value="NORMAL_ONLY">✓ Shift Normal Saja</option>
          </select>
        </div>
      </div>

      {/* Date Audit Navigation Bar */}
      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Date picker & quick date chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-slate-300 font-bold">
            <Calendar className="w-4 h-4 text-blue-400 stroke-[2]" />
            <span>Audit Tanggal:</span>
          </div>

          {/* HTML5 Date Input for Specific Audit */}
          <div className="relative">
            <input
              type="date"
              value={specificDate || ''}
              onChange={handlePickDate}
              title="Pilih tanggal spesifik untuk audit riwayat absensi"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isCustomDate
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-[#12161f] border-slate-700/80 text-white hover:border-blue-500 focus:bg-[#151a24] focus:border-blue-500'
              }`}
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handlePresetDate('TODAY')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                dateRange === 'TODAY' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#1c2230] text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-700/60'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('YESTERDAY')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                dateRange === 'YESTERDAY' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#1c2230] text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-700/60'
              }`}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('LAST_7_DAYS')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                dateRange === 'LAST_7_DAYS' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#1c2230] text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-700/60'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('THIS_MONTH')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                dateRange === 'THIS_MONTH' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#1c2230] text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-700/60'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('ALL')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                dateRange === 'ALL' && !specificDate
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-[#1c2230] text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-700/60'
              }`}
            >
              Semua
            </button>

            {/* Clear specific date button if active */}
            {isCustomDate && (
              <button
                type="button"
                onClick={handleClearDate}
                className="px-2 py-1.5 rounded-xl text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900 transition flex items-center space-x-1"
                title="Hapus filter tanggal spesifik"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
                <span>Reset Tanggal</span>
              </button>
            )}
          </div>
        </div>

        {/* Right side: Active date info & Refresh */}
        <div className="flex items-center space-x-3">
          {/* Active Audit Date Indicator */}
          {isCustomDate ? (
            <div className="flex items-center space-x-1 px-3 py-1 bg-[#121927] border border-blue-500/30 rounded-xl text-blue-300 font-bold text-xs">
              <CalendarCheck2 className="w-3.5 h-3.5 text-blue-400 stroke-[2]" />
              <span>Audit: {formatWitaDateFull(specificDate)}</span>
            </div>
          ) : dateRange === 'TODAY' ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#121927] border border-blue-500/30 rounded-xl text-blue-300 font-bold text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-400 stroke-[2]" />
              <span>Lembaran Hari Ini (08:00 - 05:00 WITA)</span>
            </div>
          ) : dateRange === 'YESTERDAY' ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#181d28] border border-slate-700/80 rounded-xl text-slate-300 font-bold text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
              <span>Lembaran Kemarin (Arsip)</span>
            </div>
          ) : null}

          {onRefresh && (
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isActuallyRefreshing}
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center space-x-1.5 text-xs transition-all shadow-xs cursor-pointer active:scale-95 ${
                isActuallyRefreshing
                  ? 'bg-blue-950/80 border-blue-500/40 text-blue-300 opacity-90 cursor-wait'
                  : justRefreshed
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#1c2230] hover:bg-[#252d3f] text-slate-300 hover:text-white border-slate-700/80'
              }`}
              title="Perbarui riwayat absensi dan data kehadiran realtime"
            >
              {justRefreshed ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400 animate-in fade-in" />
                  <span className="text-emerald-300 font-bold">Terkini ✓</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    className={`w-3.5 h-3.5 stroke-[2] ${
                      isActuallyRefreshing
                        ? 'animate-spin text-blue-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{isActuallyRefreshing ? 'Memuat...' : 'Refresh'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
