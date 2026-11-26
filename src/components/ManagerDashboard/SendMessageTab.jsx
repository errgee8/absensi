import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Search,
  Users,
  CheckSquare,
  Square,
  Trash2,
  Mail,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  MessageSquarePlus
} from 'lucide-react';
import {
  getStaffList,
  getManagerDirectMessages,
  sendManagerDirectMessages,
  deleteManagerDirectMessage,
  subscribeRealtimeEvents
} from '../../utils/api';
import { formatWitaDateTime } from '../../utils/time';
import { showToast } from '../Common/Toast';

export default function SendMessageTab({ adminAuth }) {
  const [staffList, setStaffList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Filters & Multi-select
  const [searchQuery, setSearchQuery] = useState('');
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);

  // Compose Form
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        getStaffList({ includeInactive: false }).catch(() => ({ staff: [] })),
        getManagerDirectMessages().catch(() => ({ messages: [] }))
      ]);
      const rawStaff = Array.isArray(sRes) ? sRes : (sRes?.staff || []);
      setStaffList(rawStaff.filter((s) => s.is_active !== 0 && s.is_active !== false));
      setMessages(Array.isArray(mRes?.messages) ? mRes.messages : []);
    } catch (err) {
      if (!silent) showToast('Gagal memuat data pesan: ' + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const unsub = subscribeRealtimeEvents((eventType) => {
      if (eventType === 'DIRECT_MESSAGE_UPDATE') {
        loadAll(true);
      }
    });
    return () => unsub();
  }, [loadAll]);

  const venues = useMemo(() => {
    const set = new Set(staffList.map((s) => s.venue).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [staffList]);

  const divisions = useMemo(() => {
    const set = new Set(
      staffList
        .filter((s) => venueFilter === 'ALL' || s.venue === venueFilter)
        .map((s) => s.division)
        .filter(Boolean)
    );
    return ['ALL', ...Array.from(set)];
  }, [staffList, venueFilter]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList
      .filter((s) => {
        if (venueFilter !== 'ALL' && s.venue !== venueFilter) return false;
        if (divisionFilter !== 'ALL' && s.division !== divisionFilter) return false;
        if (q) {
          const haystack = `${s.name || ''} ${s.id || ''} ${s.legacy_code || ''} ${s.role || ''} ${s.division || ''}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [staffList, venueFilter, divisionFilter, searchQuery]);

  const getStaffKey = (s) => String(s.legacy_code || s.id);

  const toggleStaffSelection = (staff) => {
    const key = getStaffKey(staff);
    setSelectedStaffIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredKeys = filteredStaff.map(getStaffKey);
    setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...filteredKeys])));
  };

  const handleClearSelection = () => {
    setSelectedStaffIds([]);
  };

  const selectedStaffObjects = useMemo(() => {
    const selectedSet = new Set(selectedStaffIds);
    return staffList.filter((s) => selectedSet.has(getStaffKey(s)));
  }, [staffList, selectedStaffIds]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (selectedStaffIds.length === 0) {
      showToast('Pilih minimal 1 nama karyawan terlebih dahulu.', 'error');
      return;
    }
    if (!messageText.trim()) {
      showToast('Isi pesan tidak boleh kosong.', 'error');
      return;
    }

    setSending(true);
    try {
      const senderName = adminAuth?.name || adminAuth?.role || 'Management';
      const res = await sendManagerDirectMessages({
        staffIds: selectedStaffIds,
        title: title.trim() || 'Pesan dari Manager',
        message: messageText.trim(),
        senderName
      });
      showToast(`Pesan berhasil dikirim ke ${res.sentCount || selectedStaffIds.length} karyawan!`, 'success');
      setMessageText('');
      setTitle('');
      setSelectedStaffIds([]);
      await loadAll(true);
    } catch (err) {
      showToast(err.message || 'Gagal mengirim pesan', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBatch = async (batchId, isBatch = true) => {
    try {
      await deleteManagerDirectMessage(batchId, { batch: isBatch });
      showToast('Pesan berhasil dihapus.', 'success');
      await loadAll(true);
    } catch (err) {
      showToast(err.message || 'Gagal menghapus pesan', 'error');
    }
  };

  // Group history messages by batch_id (fallback to id for single records)
  const groupedBatches = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    const map = new Map();
    for (const msg of messages) {
      if (q) {
        const hay = `${msg.staff_name || ''} ${msg.staff_id || ''} ${msg.title || ''} ${msg.message || ''} ${msg.sender_name || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const key = msg.batch_id || msg.id;
      if (!map.has(key)) {
        map.set(key, {
          batchId: key,
          hasBatchId: Boolean(msg.batch_id),
          title: msg.title || 'Pesan dari Manager',
          message: msg.message || '',
          sender_name: msg.sender_name || 'Management',
          created_at: msg.created_at,
          recipients: []
        });
      }
      map.get(key).recipients.push(msg);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [messages, historySearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#161b24] border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Kirim Pesan Langsung ke Karyawan</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih satu atau beberapa karyawan sekaligus. Pesan akan langsung muncul otomatis saat karyawan tersebut login di Kiosk.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadAll()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Multi-Select Staff & Compose Form (7 cols) */}
        <form onSubmit={handleSend} className="lg:col-span-7 bg-[#161b24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-indigo-400" />
              <span>1. Pilih Karyawan Penerima</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {selectedStaffIds.length} Dipilih
            </span>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative sm:col-span-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama / ID..."
                className="w-full pl-8 pr-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={venueFilter}
              onChange={(e) => {
                setVenueFilter(e.target.value);
                setDivisionFilter('ALL');
              }}
              className="px-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {venues.map((v) => (
                <option key={v} value={v}>
                  {v === 'ALL' ? 'Semua Venue' : v}
                </option>
              ))}
            </select>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {divisions.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'Semua Divisi' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Selection Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-medium">
              Menampilkan <strong className="text-slate-200">{filteredStaff.length}</strong> karyawan aktif
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-bold transition cursor-pointer"
              >
                Pilih Semua ({filteredStaff.length})
              </button>
              {selectedStaffIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold transition cursor-pointer"
                >
                  Reset Pilihan
                </button>
              )}
            </div>
          </div>

          {/* Staff Multi-Select Grid */}
          <div className="max-h-60 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-800/80 bg-[#11151d] rounded-xl p-2.5">
            {filteredStaff.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                Tidak ada karyawan yang cocok dengan filter.
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const key = getStaffKey(staff);
                const isSelected = selectedStaffIds.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleStaffSelection(staff)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-sm'
                        : 'bg-[#161b24] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{staff.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {key} • {staff.venue} • {staff.role || staff.division}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Selected Recipients Chips */}
          {selectedStaffObjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedStaffObjects.map((s) => {
                const key = getStaffKey(s);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-bold"
                  >
                    <span>{s.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleStaffSelection(s)}
                      className="hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Message Composition */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-white">2. Tulis Pesan</h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Judul Pesan (Opsional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Evaluasi Briefing / Tugas Khusus / Pesan dari Manager"
                className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Isi Pesan Langsung *
              </label>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Tulis pesan pribadi untuk karyawan terpilih. Pesan ini akan muncul saat mereka login di Kiosk..."
                className="w-full px-3.5 py-2.5 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={sending || selectedStaffIds.length === 0 || !messageText.trim()}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>
                {sending
                  ? 'Mengirim Pesan...'
                  : `Kirim Pesan ke ${selectedStaffIds.length} Karyawan`}
              </span>
            </button>
          </div>
        </form>

        {/* RIGHT: Sent History & Read Receipts (5 cols) */}
        <div className="lg:col-span-5 bg-[#161b24] border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Riwayat Pesan Terkirim</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">
              {groupedBatches.length} Kiriman
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Cari nama penerima atau isi pesan..."
              className="w-full pl-8 pr-3 py-2 bg-[#12161f] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex-1 max-h-[540px] overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Memuat riwayat pesan...</div>
            ) : groupedBatches.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Belum ada pesan yang dikirim ke karyawan.
              </div>
            ) : (
              groupedBatches.map((batch) => {
                const readCount = batch.recipients.filter((r) => Boolean(r.read_at)).length;
                return (
                  <div
                    key={batch.batchId}
                    className="bg-[#12161f] border border-slate-800 rounded-xl p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-indigo-300 truncate">{batch.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatWitaDateTime(batch.created_at)} WITA • oleh {batch.sender_name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(batch.batchId, batch.hasBatchId)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="Hapus pesan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#161b24] p-2.5 rounded-lg border border-slate-800/80">
                      {batch.message}
                    </p>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>Penerima ({batch.recipients.length})</span>
                        <span className={readCount === batch.recipients.length ? 'text-emerald-400' : 'text-amber-400'}>
                          {readCount}/{batch.recipients.length} Sudah Dibaca
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {batch.recipients.map((r) => {
                          const isRead = Boolean(r.read_at);
                          return (
                            <span
                              key={r.id}
                              title={isRead ? `Dibaca pada ${formatWitaDateTime(r.read_at)} WITA` : 'Belum dibaca oleh karyawan'}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isRead
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {isRead ? (
                                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                              ) : (
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                              )}
                              <span>{r.staff_name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
