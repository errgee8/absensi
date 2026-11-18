import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  Award,
  Sparkles,
  Building2,
  FileText
} from 'lucide-react';
import { formatWitaDateTime, formatWitaDateOnly } from '../../utils/time';

export default function PointDeletionLogsModal({
  isOpen,
  onClose,
  logs = [],
  loading = false,
  onRefresh
}) {
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'VIOLATION' | 'PLUS'

  if (!isOpen) return null;

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // Venue filter
      if (venueFilter !== 'ALL' && item.staff_venue !== venueFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'ALL') {
        const isPlus = item.point_type === 'PLUS' || String(item.points).startsWith('+');
        if (typeFilter === 'PLUS' && !isPlus) return false;
        if (typeFilter === 'VIOLATION' && isPlus) return false;
      }
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const staffName = (item.staff_name || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        const delReason = (item.deletion_reason || '').toLowerCase();
        const delBy = (item.deleted_by || '').toLowerCase();
        const awardedBy = (item.awarded_by || '').toLowerCase();
        if (
          !staffName.includes(q) &&
          !reason.includes(q) &&
          !delReason.includes(q) &&
          !delBy.includes(q) &&
          !awardedBy.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [logs, search, venueFilter, typeFilter]);

  // Statistics
  const totalCount = logs.length;
  const violationCount = logs.filter(
    (l) => l.point_type !== 'PLUS' && !String(l.points).startsWith('+')
  ).length;
  const plusCount = logs.filter(
    (l) => l.point_type === 'PLUS' || String(l.points).startsWith('+')
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#12161f] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-rose-950/30 via-[#161b24] to-[#12161f] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-950/40">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Log Riwayat Penghapusan Poin
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-950 text-rose-300 border border-rose-500/30">
                  Otorisasi Manajer
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Audit trail transparan untuk setiap poin yang pernah dihapus / dibatalkan oleh Operational Manager.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title="Segarkan Log"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QUICK STATS & SUMMARY PILLS */}
        <div className="p-4 sm:px-6 bg-[#161b24] border-b border-slate-800/80 shrink-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#12161f] border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Total Poin Dihapus
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-white mt-0.5 block">
                {totalCount}
              </span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#12161f] border border-rose-500/20">
              <span className="text-[10px] font-bold text-rose-400 block uppercase">
                Sanksi Dibatalkan
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-rose-300 mt-0.5 block">
                {violationCount}
              </span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#12161f] border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                Apresiasi / Plus Dihapus
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-emerald-300 mt-0.5 block">
                {plusCount}
              </span>
            </div>
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-3 pt-3 border-t border-slate-800/80">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama staff, alasan asli, atau manajer..."
                className="w-full bg-[#12161f] border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="bg-[#12161f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-rose-500 shrink-0"
              >
                <option value="ALL">Semua Outlet</option>
                <option value="JP Karaoke">JP Karaoke</option>
                <option value="LuckyCat">LuckyCat</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#12161f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-rose-500 shrink-0"
              >
                <option value="ALL">Semua Tipe Poin</option>
                <option value="VIOLATION">Sanksi / Pelanggaran</option>
                <option value="PLUS">Apresiasi / Poin Plus</option>
              </select>
            </div>
          </div>
        </div>

        {/* LOG CONTENT LIST */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-2" />
              <p className="text-xs font-bold">Memuat riwayat log penghapusan poin...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-slate-800 rounded-3xl bg-[#161b24]/40">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-300">Tidak ada catatan penghapusan poin</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || venueFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'Tidak ada data log yang cocok dengan filter pencarian.'
                  : 'Belum ada catatan poin yang pernah dihapus oleh Manajer.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const isPlus =
                log.point_type === 'PLUS' || String(log.points).startsWith('+');
              const absPoints = Math.abs(Number(log.points) || 1);

              return (
                <div
                  key={log.id || idx}
                  className="p-4 rounded-2xl bg-[#161b24] border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  {/* Top Bar: Timestamp & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-400 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>
                          {log.created_at ? formatWitaDateTime(log.created_at) : '-'}
                        </span>
                      </span>
                      {log.staff_venue && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {log.staff_venue}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border flex items-center space-x-1 ${
                        isPlus
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>
                        {isPlus ? `+${absPoints} Poin Plus` : `-${absPoints} Poin Sanksi`} (Dihapus)
                      </span>
                    </span>
                  </div>

                  {/* Staff Info & Original Reason */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-4 flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                        {(log.staff_name || 'S').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          Karyawan Terkait
                        </span>
                        <div className="text-sm font-black text-white truncate">
                          {log.staff_name}
                        </div>
                        {log.staff_id && (
                          <div className="text-[10px] font-mono text-slate-400">
                            ID: {log.staff_id}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-8 p-3 rounded-xl bg-[#12161f] border border-slate-800/90 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span className="uppercase tracking-wider">Alasan Asli Poin Sebelum Dihapus:</span>
                        <span className="text-amber-300 font-mono">
                          {log.category || 'Disiplin'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        "{log.reason || '-'}"
                      </p>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                        <span>
                          Diberikan oleh: <strong className="text-slate-300">{log.awarded_by || 'Operational Manager'}</strong>
                        </span>
                        {log.awarded_at && (
                          <span>
                            Tanggal: {formatWitaDateOnly(log.awarded_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deletion Details: Who deleted & Why */}
                  <div className="p-2.5 rounded-xl bg-rose-950/25 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-1.5 text-rose-300 font-bold">
                      <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        Dihapus oleh:{' '}
                        <strong className="text-white">
                          {log.deleted_by || 'Operational Manager'}
                        </strong>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-medium">
                      <span className="text-slate-400 font-bold">Catatan Penghapusan: </span>
                      <span className="text-rose-200 font-bold">
                        "{log.deletion_reason || 'Dihapus oleh Manajer'}"
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800/80 bg-[#161b24] flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-medium">
            Menampilkan <strong className="text-white">{filteredLogs.length}</strong> dari{' '}
            <strong className="text-white">{logs.length}</strong> riwayat penghapusan.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
