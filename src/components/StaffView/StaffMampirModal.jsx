import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Users,
  Building2,
  Crown,
  Sparkles,
  ArrowRight,
  Smile,
  Quote
} from 'lucide-react';
import { getStaffList } from '../../utils/api';
import { isVipStaff } from '../../utils/streakFrames';

export default function StaffMampirModal({
  isOpen,
  currentStaff = null,
  onClose,
  onSelectStaff
}) {
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [venueFilter, setVenueFilter] = useState('ALL'); // 'ALL' | 'JP' | 'LC'

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getStaffList('ALL');
        if (!isMounted) return;
        setStaffList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Gagal memuat daftar staf untuk mampir:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList.filter((s) => {
      // Exclude self if logged in
      if (currentStaff && (String(s.id) === String(currentStaff.id) || String(s.uuid) === String(currentStaff.uuid))) {
        return false;
      }

      // Venue filter
      if (venueFilter === 'JP' && !String(s.venue || '').toLowerCase().includes('jp')) return false;
      if (venueFilter === 'LC' && !String(s.venue || '').toLowerCase().includes('lucky')) return false;

      // Search match
      if (!q) return true;
      const name = String(s.name || '').toLowerCase();
      const role = String(s.role || '').toLowerCase();
      const venue = String(s.venue || '').toLowerCase();
      const division = String(s.division || '').toLowerCase();
      return name.includes(q) || role.includes(q) || venue.includes(q) || division.includes(q);
    });
  }, [staffList, searchQuery, venueFilter, currentStaff]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#121620] border border-white/15 rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 text-slate-100 shadow-2xl relative my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Mampir ke Profil Rekan</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase">
                  Social
                </span>
              </h2>
              <p className="text-[10.5px] text-slate-400">
                Kunjungi dashboard rekan kerja &amp; beri apresiasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="mt-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama rekan kerja yang ingin dikunjungi..."
              className="w-full bg-[#181d28] border border-white/15 rounded-2xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Venue Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0b0e14] rounded-2xl mt-2.5 border border-white/5 text-[11px] font-black">
            <button
              type="button"
              onClick={() => setVenueFilter('ALL')}
              className={`py-1.5 rounded-xl transition cursor-pointer ${
                venueFilter === 'ALL'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({staffList.length})
            </button>
            <button
              type="button"
              onClick={() => setVenueFilter('JP')}
              className={`py-1.5 rounded-xl transition cursor-pointer ${
                venueFilter === 'JP'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JP Karaoke
            </button>
            <button
              type="button"
              onClick={() => setVenueFilter('LC')}
              className={`py-1.5 rounded-xl transition cursor-pointer ${
                venueFilter === 'LC'
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LuckyCat
            </button>
          </div>
        </div>

        {/* Staff List Container */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2 min-h-[220px]">
          {loading && (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Memuat daftar rekan kerja...</p>
            </div>
          )}

          {!loading && filteredStaff.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <p className="text-sm">🔍 Tidak ada staf yang cocok</p>
              <p className="text-[11px] text-slate-500">
                Coba gunakan kata kunci nama atau jabatan lain
              </p>
            </div>
          )}

          {!loading &&
            filteredStaff.map((s) => {
              const isVip = isVipStaff(s);
              return (
                <div
                  key={s.id || s.uuid || s.name}
                  onClick={() => {
                    onClose();
                    onSelectStaff(s);
                  }}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group active:scale-[0.98] ${
                    isVip
                      ? 'bg-gradient-to-r from-amber-950/60 via-[#1f1707] to-slate-900 border-amber-500/40 hover:border-amber-400'
                      : 'bg-[#181d28]/90 hover:bg-[#202636] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar Thumbnail */}
                    <div
                      className={`w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 border ${
                        isVip ? 'border-amber-400/80 shadow-md shadow-amber-500/30' : 'border-white/10'
                      }`}
                    >
                      {s.profile_photo_url ? (
                        <img
                          src={s.profile_photo_url}
                          alt={s.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-black text-slate-300">
                          {s.name ? s.name.slice(0, 2).toUpperCase() : 'ST'}
                        </span>
                      )}
                    </div>

                    {/* Staff Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white truncate group-hover:text-amber-300 transition">
                          {s.name}
                        </span>
                        {isVip && (
                          <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 text-[8.5px] font-black border border-white shrink-0">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <span>{s.role || 'Staff'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-300 font-semibold">{s.venue || 'Outlet'}</span>
                      </div>
                      {s.bio && (
                        <div className="text-[10px] text-slate-400/80 italic truncate mt-0.5 max-w-[200px]">
                          "{s.bio}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mampir Action Button */}
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black shrink-0 transition flex items-center gap-1 ${
                      isVip
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : 'bg-[#262e40] group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-200'
                    }`}
                  >
                    <span>Mampir</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
