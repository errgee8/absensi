import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Star,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  Eye,
  ArrowRight,
  Sparkles,
  Building2,
  FileText,
  Quote,
  Users
} from 'lucide-react';
import { getAdminKudosLogs } from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';

export default function KudosAuditLogsModal({
  isOpen,
  onClose
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('ALL'); // 'ALL' | 'JP Karaoke' | 'LuckyCat'
  const [anonFilter, setAnonFilter] = useState('ALL'); // 'ALL' | 'ANON_ONLY' | 'PUBLIC_ONLY'
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminKudosLogs();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.logs) ? res.logs : []);
      setLogs(list);
    } catch (err) {
      console.warn('Failed to load admin kudos logs:', err);
      setError(err.message || 'Gagal memuat log bintang apresiasi.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, loadLogs]);

  const safeLogs = useMemo(() => {
    return (Array.isArray(logs) ? logs : []).filter((item) => item && typeof item === 'object');
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return safeLogs.filter((item) => {
      // Venue filter
      if (venueFilter !== 'ALL') {
        const fromV = item.from_staff_venue || '';
        const toV = item.to_staff_venue || '';
        if (fromV !== venueFilter && toV !== venueFilter) {
          return false;
        }
      }

      // Anonymous filter
      if (anonFilter === 'ANON_ONLY' && !item.is_anonymous) return false;
      if (anonFilter === 'PUBLIC_ONLY' && item.is_anonymous) return false;

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const fromName = String(item.from_staff_name || '').toLowerCase();
        const fromId = String(item.from_staff_id || '').toLowerCase();
        const toName = String(item.to_staff_name || '').toLowerCase();
        const toId = String(item.to_staff_id || '').toLowerCase();
        const reason = String(item.reason || '').toLowerCase();
        const weekKey = String(item.week_key || '').toLowerCase();

        if (
          !fromName.includes(q) &&
          !fromId.includes(q) &&
          !toName.includes(q) &&
          !toId.includes(q) &&
          !reason.includes(q) &&
          !weekKey.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [safeLogs, search, venueFilter, anonFilter]);

  // Stats
  const totalCount = safeLogs.length;
  const anonCount = safeLogs.filter((l) => Boolean(l.is_anonymous)).length;
  const publicCount = totalCount - anonCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#12161f] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-amber-950/30 via-[#161b24] to-[#12161f] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/40">
              <Star className="w-6 h-6 stroke-[2.2] fill-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Log Audit Pengiriman Bintang Apresiasi (Peer Kudos)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Transparansi Manajer
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Audit trail lengkap pengiriman bintang antar karyawan. Identitas pengirim anonim tetap terungkap khusus untuk Manager.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              title="Segarkan Log"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NOTICE: ANONYMITY REVEALED TO MANAGER */}
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border-b border-purple-500/20 flex items-center space-x-3 shrink-0">
          <Eye className="w-4 h-4 text-purple-400 shrink-0" />
          <p className="text-xs text-purple-200 font-bold leading-relaxed">
            <span className="text-white font-black">Catatan Privasi &amp; Akuntabilitas: </span>
            Opsi "Kirim Anonim" hanya merahasiakan nama di layar sesama staf (Kiosk). Di panel Manajer ini, 
            <span className="text-amber-300 font-black"> nama asli dan ID pengirim selalu ditampilkan secara utuh </span> 
            agar manajemen dapat mengawasi akuntabilitas budaya kerja.
          </p>
        </div>

        {/* QUICK STATS & SUMMARY PILLS */}
        <div className="p-4 sm:px-6 bg-[#161b24] border-b border-slate-800/80 shrink-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#12161f] border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Total Bintang Terkirim
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-white mt-0.5 block flex items-center justify-center space-x-1">
                <span>{totalCount}</span>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#12161f] border border-purple-500/20">
              <span className="text-[10px] font-bold text-purple-400 block uppercase">
                Mode Anonim (Revealed)
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-purple-300 mt-0.5 block">
                {anonCount}
              </span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#12161f] border border-blue-500/20">
              <span className="text-[10px] font-bold text-blue-400 block uppercase">
                Mode Terbuka / Publik
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-blue-300 mt-0.5 block">
                {publicCount}
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
                placeholder="Cari nama pengirim, penerima, pesan, atau minggu..."
                className="w-full bg-[#12161f] border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="bg-[#12161f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500 shrink-0"
              >
                <option value="ALL">Semua Outlet</option>
                <option value="JP Karaoke">JP Karaoke</option>
                <option value="LuckyCat">LuckyCat</option>
              </select>

              <select
                value={anonFilter}
                onChange={(e) => setAnonFilter(e.target.value)}
                className="bg-[#12161f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500 shrink-0"
              >
                <option value="ALL">Semua Mode Pengiriman</option>
                <option value="ANON_ONLY">Anonim Saja (Revealed)</option>
                <option value="PUBLIC_ONLY">Terbuka / Publik Saja</option>
              </select>
            </div>
          </div>
        </div>

        {/* LOG CONTENT LIST */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
              <p className="text-xs font-bold">Memuat log bintang apresiasi...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-slate-800 rounded-3xl bg-[#161b24]/40">
              <Star className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-300">Tidak ada catatan pengiriman bintang</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || venueFilter !== 'ALL' || anonFilter !== 'ALL'
                  ? 'Tidak ada data log yang cocok dengan filter pencarian.'
                  : 'Belum ada staf yang mengirimkan bintang apresiasi.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((item, idx) => {
              const isAnon = Boolean(item.is_anonymous);
              const fromName = item.from_staff_name || 'Staff Pengirim';
              const toName = item.to_staff_name || 'Staff Penerima';

              return (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-2xl bg-[#161b24] border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  {/* Top Bar: Timestamp, Week, Anonymity Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-400 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>
                          {item.created_at ? formatWitaDateTime(item.created_at) : '-'}
                        </span>
                      </span>

                      {item.week_key && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {item.week_key}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {isAnon ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-purple-500/20 text-purple-300 border-purple-500/40 flex items-center space-x-1">
                          <Eye className="w-3 h-3 text-purple-400" />
                          <span>Anonim ke Staff &bull; Revealed ke Manager</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-blue-500/20 text-blue-300 border-blue-500/40 flex items-center space-x-1">
                          <Users className="w-3 h-3 text-blue-400" />
                          <span>Publik / Terbuka</span>
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>+1 Bintang</span>
                      </span>
                    </div>
                  </div>

                  {/* Sender & Recipient Box */}
                  <div className="p-3.5 rounded-xl bg-[#12161f] border border-slate-800 grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                    {/* SENDER (REVEALED REAL NAME) */}
                    <div className="md:col-span-5 flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border ${
                        isAnon 
                          ? 'bg-purple-950/60 border-purple-500/40 text-purple-300' 
                          : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                      }`}>
                        {fromName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Pengirim Asli:
                          </span>
                          {isAnon && (
                            <span className="text-[9px] font-black text-purple-400 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-500/30">
                              REVEALED
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black text-white truncate">
                          {fromName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-1.5">
                          {item.from_staff_id && <span>ID: {item.from_staff_id}</span>}
                          {item.from_staff_venue && (
                            <span>&bull; {item.from_staff_venue}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ARROW INDICATOR */}
                    <div className="md:col-span-1 flex justify-center py-1 md:py-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    {/* RECIPIENT */}
                    <div className="md:col-span-5 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-black text-xs shrink-0">
                        {toName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Penerima Apresiasi:
                        </span>
                        <div className="text-sm font-black text-amber-300 truncate">
                          {toName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-1.5">
                          {item.to_staff_id && <span>ID: {item.to_staff_id}</span>}
                          {item.to_staff_venue && (
                            <span>&bull; {item.to_staff_venue}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* APPRECIATION REASON / MESSAGE */}
                  <div className="p-3 rounded-xl bg-[#12161f] border border-amber-500/20 flex items-start space-x-2.5">
                    <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 opacity-80" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Pesan &amp; Alasan Apresiasi:
                      </span>
                      <p className="text-xs font-bold text-slate-200 mt-0.5 leading-relaxed">
                        "{item.reason || '-'}"
                      </p>
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
            <strong className="text-white">{safeLogs.length}</strong> pengiriman bintang.
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
