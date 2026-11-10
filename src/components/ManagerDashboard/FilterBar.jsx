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
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 mb-6 space-y-4 shadow-sm">
      {/* Top Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 stroke-[2.5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / ID staf..."
            className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-950 font-black placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
          />
        </div>

        {/* 2. Venue Filter (JP Karaoke vs LuckyCat) */}
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

        {/* 3. Division Filter */}
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

        {/* 4. Shift Filter (New!) */}
        <div className="relative">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter && setShiftFilter(e.target.value)}
            className={`w-full border-2 rounded-xl px-3 py-2 text-xs font-black focus:outline-none transition cursor-pointer ${
              shiftFilter !== 'ALL'
                ? 'bg-blue-100 border-blue-400 text-blue-950'
                : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
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

      {/* Date Audit Navigation Bar */}
      <div className="pt-3 border-t-2 border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Date picker & quick date chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-slate-800 font-black">
            <Calendar className="w-4 h-4 text-blue-700 stroke-[2.5]" />
            <span>Audit Tanggal:</span>
          </div>

          {/* HTML5 Date Input for Specific Audit */}
          <div className="relative">
            <input
              type="date"
              value={specificDate || ''}
              onChange={handlePickDate}
              title="Pilih tanggal spesifik untuk audit riwayat absensi"
              className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition cursor-pointer ${
                isCustomDate
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 border-slate-300 text-slate-950 hover:border-blue-500 focus:bg-white focus:border-blue-600'
              }`}
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handlePresetDate('TODAY')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition ${
                dateRange === 'TODAY' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('YESTERDAY')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition ${
                dateRange === 'YESTERDAY' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('LAST_7_DAYS')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition ${
                dateRange === 'LAST_7_DAYS' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('THIS_MONTH')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition ${
                dateRange === 'THIS_MONTH' && !specificDate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('ALL')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition ${
                dateRange === 'ALL' && !specificDate
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Semua
            </button>

            {/* Clear specific date button if active */}
            {isCustomDate && (
              <button
                type="button"
                onClick={handleClearDate}
                className="px-2 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 transition flex items-center space-x-1"
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
            <div className="flex items-center space-x-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 font-black text-xs">
              <CalendarCheck2 className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
              <span>Audit: {formatWitaDateFull(specificDate)}</span>
            </div>
          ) : dateRange === 'TODAY' ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 font-black text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
              <span>Lembaran Hari Ini (Siklus 08:00 - 05:00 WITA, Cutoff 07:00)</span>
            </div>
          ) : dateRange === 'YESTERDAY' ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 font-black text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
              <span>Lembaran Kemarin (Tersimpan &amp; Diarsipkan)</span>
            </div>
          ) : null}

          {onRefresh && (
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isActuallyRefreshing}
              className={`px-3 py-1.5 rounded-xl border-2 font-black flex items-center space-x-1.5 text-xs transition-all shadow-xs cursor-pointer ${
                isActuallyRefreshing
                  ? 'bg-blue-50 border-blue-300 text-blue-700 opacity-90 cursor-wait'
                  : justRefreshed
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-900 border-slate-200 hover:border-blue-300 active:scale-95'
              }`}
              title="Perbarui riwayat absensi dan data kehadiran realtime"
            >
              {justRefreshed ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 animate-in fade-in" />
                  <span className="text-emerald-700 font-black">Data Terkini ✓</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    className={`w-3.5 h-3.5 stroke-[2.5] ${
                      isActuallyRefreshing
                        ? 'animate-spin text-blue-600'
                        : 'text-blue-700'
                    }`}
                  />
                  <span>{isActuallyRefreshing ? 'Menyegarkan...' : 'Refresh'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
