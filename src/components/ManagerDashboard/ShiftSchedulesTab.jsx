import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Save, X, Coffee, Plus, Trash2, CheckCircle2, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { getShiftSchedules, updateShiftSchedule, createShiftSchedule, deleteShiftSchedule } from '../../utils/api';

export default function ShiftSchedulesTab() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Edit form state
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editIsFlexible, setEditIsFlexible] = useState(false);
  const [editAllowsBreak, setEditAllowsBreak] = useState(false);
  const [editBreakStartTime, setEditBreakStartTime] = useState('');
  const [editMaxBreakEnd, setEditMaxBreakEnd] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Add shift modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newVenue, setNewVenue] = useState('LuckyCat');
  const [newDivision, setNewDivision] = useState('Bar, Cashier, and Server');
  const [customDivision, setCustomDivision] = useState('');
  const [newShiftName, setNewShiftName] = useState('Shift 1');
  const [newShiftNumber, setNewShiftNumber] = useState(1);
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('19:00');
  const [newIsFlexible, setNewIsFlexible] = useState(false);
  const [newAllowsBreak, setNewAllowsBreak] = useState(true);
  const [newBreakStartTime, setNewBreakStartTime] = useState('14:00');
  const [newMaxBreakEnd, setNewMaxBreakEnd] = useState('17:00');
  const [adding, setAdding] = useState(false);

  const [notification, setNotification] = useState(null);

  const divisionPresets = {
    'LuckyCat': [
      'Bar, Cashier, and Server',
      'Kitchen',
      'Lainnya (Ketik Manual)'
    ],
    'JP Karaoke': [
      'Server and Cashier',
      'Cleaning Service',
      'Storage Staff',
      'Lainnya (Ketik Manual)'
    ]
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await getShiftSchedules();
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleStartEdit = (sched) => {
    setEditingId(sched.id);
    setEditName(sched.name);
    setEditStartTime(sched.start_time);
    setEditEndTime(sched.end_time);
    setEditIsFlexible(Boolean(sched.is_flexible_checkout));
    setEditAllowsBreak(Boolean(sched.allows_break));
    setEditBreakStartTime(sched.break_start_time || '');
    setEditMaxBreakEnd(sched.max_break_end || '');
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await updateShiftSchedule(id, {
        name: editName,
        start_time: editStartTime,
        end_time: editEndTime,
        is_flexible_checkout: editIsFlexible ? 1 : 0,
        allows_break: editAllowsBreak ? 1 : 0,
        break_start_time: editAllowsBreak ? (editBreakStartTime || null) : null,
        max_break_end: editAllowsBreak ? (editMaxBreakEnd || null) : null
      });

      setEditingId(null);
      showNotification('Jadwal shift dan aturan istirahat berhasil diperbarui!');
      await loadSchedules();
    } catch (err) {
      alert('Error updating schedule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (sched) => {
    const confirm = window.confirm(`Hapus jadwal "${sched.name} - ${sched.division}" (${sched.venue})?`);
    if (!confirm) return;

    try {
      await deleteShiftSchedule(sched.id);
      showNotification('Jadwal shift berhasil dihapus.');
      await loadSchedules();
    } catch (err) {
      alert('Gagal menghapus jadwal: ' + err.message);
    }
  };

  const handleOpenAddModal = (presetVenue = 'LuckyCat') => {
    setNewVenue(presetVenue);
    const divs = divisionPresets[presetVenue] || [];
    setNewDivision(divs[0] || 'Bar, Cashier, and Server');
    setCustomDivision('');
    setNewShiftName('Shift 1');
    setNewShiftNumber(1);
    if (presetVenue === 'LuckyCat') {
      setNewStartTime('10:00');
      setNewEndTime('19:00');
      setNewAllowsBreak(true);
      setNewBreakStartTime('14:00');
      setNewMaxBreakEnd('17:00');
    } else {
      setNewStartTime('13:00');
      setNewEndTime('22:00');
      setNewAllowsBreak(false);
      setNewBreakStartTime('');
      setNewMaxBreakEnd('');
    }
    setAddModalOpen(true);
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    const finalDivision = newDivision === 'Lainnya (Ketik Manual)' ? customDivision.trim() : newDivision;
    if (!finalDivision) {
      return alert('Harap isi nama divisi.');
    }

    setAdding(true);
    try {
      await createShiftSchedule({
        venue: newVenue,
        division: finalDivision,
        shift_number: parseInt(newShiftNumber, 10) || 1,
        name: newShiftName.trim(),
        start_time: newStartTime.trim(),
        end_time: newEndTime.trim(),
        is_flexible_checkout: newIsFlexible ? 1 : 0,
        allows_break: newAllowsBreak ? 1 : 0,
        break_start_time: newAllowsBreak ? (newBreakStartTime ? newBreakStartTime.trim() : null) : null,
        max_break_end: newAllowsBreak ? (newMaxBreakEnd ? newMaxBreakEnd.trim() : null) : null
      });

      setAddModalOpen(false);
      showNotification('Shift baru berhasil ditambahkan!');
      await loadSchedules();
    } catch (err) {
      alert('Gagal membuat shift baru: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  // Group schedules robustly
  const isJp = (v) => v && (v.toLowerCase().includes('jp') || v.replace(/\s+/g, '').toLowerCase() === 'jpkaraoke');
  const isLc = (v) => v && (v.toLowerCase().includes('lucky') || v.replace(/\s+/g, '').toLowerCase() === 'luckycat');

  const jpKaraokeSchedules = schedules.filter((s) => isJp(s.venue));
  const luckyCatSchedules = schedules.filter((s) => isLc(s.venue));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-slate-900/80 p-4 sm:p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>Pengaturan Divisi & Jam Kerja (Shift Templates & Break Rules)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Atur jam kerja shift, fleksibilitas checkout, dan jendela waktu istirahat (kapan tombol istirahat diizinkan muncul).
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal('LuckyCat')}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-500/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Shift Baru</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center space-x-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* 1. LuckyCat Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-400/30" />
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                LuckyCat (LC) Shifts
              </h4>
              <span className="text-[11px] text-slate-400">
                Server, Cashier, Bar & Kitchen Shifts
              </span>
            </div>
          </div>
          <button
            onClick={() => handleOpenAddModal('LuckyCat')}
            className="text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30 transition flex items-center space-x-1 self-start sm:self-auto"
          >
            <Plus className="w-3 h-3" />
            <span>Tambah Shift LC</span>
          </button>
        </div>

        {luckyCatSchedules.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/50 rounded-2xl border border-slate-800/60">
            Belum ada jadwal shift untuk LuckyCat. Klik tombol <strong>+ Tambah Shift LC</strong> untuk menambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Divisi</th>
                  <th className="py-2.5 px-3">Nama Shift</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3">Jam Pulang</th>
                  <th className="py-2.5 px-3">Jendela Istirahat (Break Window)</th>
                  <th className="py-2.5 px-3">Checkout Mode</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {luckyCatSchedules.map((sched) => {
                  const isEditing = editingId === sched.id;
                  return (
                    <tr key={sched.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 font-bold text-white">{sched.division}</td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs w-24"
                          />
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                            {sched.name}
                          </span>
                        )}
                      </td>

                      {/* Start Time */}
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {isEditing ? (
                          <input
                            type="time"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                          />
                        ) : (
                          sched.start_time
                        )}
                      </td>

                      {/* End Time */}
                      <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            placeholder="Contoh: 19:00 atau 03:30"
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs w-28"
                          />
                        ) : (
                          sched.end_time
                        )}
                      </td>

                      {/* Break Policy & Window Rules */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <div className="space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editAllowsBreak}
                                onChange={(e) => setEditAllowsBreak(e.target.checked)}
                                className="accent-emerald-500"
                              />
                              <span className="text-[11px] text-white font-semibold">Bolehkan Istirahat</span>
                            </label>
                            {editAllowsBreak && (
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-300">
                                <span>Dari:</span>
                                <input
                                  type="time"
                                  value={editBreakStartTime}
                                  onChange={(e) => setEditBreakStartTime(e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono"
                                />
                                <span>Sampai:</span>
                                <input
                                  type="time"
                                  value={editMaxBreakEnd}
                                  onChange={(e) => setEditMaxBreakEnd(e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono"
                                />
                              </div>
                            )}
                          </div>
                        ) : sched.allows_break ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <Coffee className="w-3 h-3" />
                              <span>Istirahat Aktif</span>
                            </span>
                            <div className="text-[10px] font-mono text-amber-300">
                              {sched.break_start_time && sched.max_break_end
                                ? `Jendela: ${sched.break_start_time} - ${sched.max_break_end}`
                                : sched.max_break_end
                                ? `Maks selesai: ${sched.max_break_end}`
                                : 'Maks 2 jam sebelum usai'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">Tanpa Istirahat</span>
                        )}
                      </td>

                      {/* Checkout Mode */}
                      <td className="py-3 px-3 text-[11px]">
                        {isEditing ? (
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editIsFlexible}
                              onChange={(e) => setEditIsFlexible(e.target.checked)}
                              className="accent-indigo-500"
                            />
                            <span className="text-slate-300">Flexible Checkout</span>
                          </label>
                        ) : sched.is_flexible_checkout ? (
                          <span className="text-amber-400 font-semibold">Flexible (Bebas Checkout Malam)</span>
                        ) : (
                          <span className="text-slate-400">Jadwal Pasti</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSaveEdit(sched.id)}
                              disabled={saving}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{saving ? '...' : 'Simpan'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleStartEdit(sched)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sched)}
                              className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                              title="Hapus shift ini"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. JP Karaoke Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/30" />
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                JP Karaoke Shifts
              </h4>
              <span className="text-[11px] text-slate-400">
                Server & Cashier, Cleaning Service, Storage Staff
              </span>
            </div>
          </div>
          <button
            onClick={() => handleOpenAddModal('JP Karaoke')}
            className="text-[11px] font-bold text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-xl border border-cyan-500/30 transition flex items-center space-x-1 self-start sm:self-auto"
          >
            <Plus className="w-3 h-3" />
            <span>Tambah Shift JP</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Divisi</th>
                <th className="py-2.5 px-3">Nama Shift</th>
                <th className="py-2.5 px-3">Jam Masuk</th>
                <th className="py-2.5 px-3">Jam Pulang</th>
                <th className="py-2.5 px-3">Jendela Istirahat (Break Window)</th>
                <th className="py-2.5 px-3">Checkout Mode</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {jpKaraokeSchedules.map((sched) => {
                const isEditing = editingId === sched.id;
                return (
                  <tr key={sched.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-bold text-white">{sched.division}</td>
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs w-24"
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                          {sched.name}
                        </span>
                      )}
                    </td>

                    {/* Start Time */}
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {isEditing ? (
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                        />
                      ) : (
                        sched.start_time
                      )}
                    </td>

                    {/* End Time */}
                    <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          placeholder="Contoh: 22:00 atau 03:00"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs w-28"
                        />
                      ) : (
                        sched.end_time
                      )}
                    </td>

                    {/* Break Policy & Window Rules */}
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <div className="space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editAllowsBreak}
                              onChange={(e) => setEditAllowsBreak(e.target.checked)}
                              className="accent-emerald-500"
                            />
                            <span className="text-[11px] text-white font-semibold">Bolehkan Istirahat</span>
                          </label>
                          {editAllowsBreak && (
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-300">
                              <span>Dari:</span>
                              <input
                                type="time"
                                value={editBreakStartTime}
                                onChange={(e) => setEditBreakStartTime(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono"
                              />
                              <span>Sampai:</span>
                              <input
                                type="time"
                                value={editMaxBreakEnd}
                                onChange={(e) => setEditMaxBreakEnd(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono"
                              />
                            </div>
                          )}
                        </div>
                      ) : sched.allows_break ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Coffee className="w-3 h-3" />
                            <span>Istirahat Aktif</span>
                          </span>
                          <div className="text-[10px] font-mono text-cyan-300">
                            {sched.break_start_time && sched.max_break_end
                              ? `Jendela: ${sched.break_start_time} - ${sched.max_break_end}`
                              : sched.max_break_end
                              ? `Maks selesai: ${sched.max_break_end}`
                              : 'Maks 2 jam sebelum usai'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">Tanpa Istirahat</span>
                      )}
                    </td>

                    {/* Checkout Mode */}
                    <td className="py-3 px-3 text-[11px]">
                      {isEditing ? (
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsFlexible}
                            onChange={(e) => setEditIsFlexible(e.target.checked)}
                            className="accent-indigo-500"
                          />
                          <span className="text-slate-300">Flexible Checkout</span>
                        </label>
                      ) : sched.is_flexible_checkout ? (
                        <span className="text-amber-400 font-semibold">Flexible (Bebas Checkout Malam)</span>
                      ) : (
                        <span className="text-slate-400">Jadwal Pasti</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(sched.id)}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? '...' : 'Simpan'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleStartEdit(sched)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(sched)}
                            className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                            title="Hapus shift ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Shift Schedule */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateSchedule}>
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Tambah Jadwal Shift Baru</h3>
                    <p className="text-[11px] text-slate-400">Tentukan jam masuk, jam pulang, dan batas jendela istirahat</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Outlet Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Outlet / Venue</label>
                    <select
                      value={newVenue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewVenue(v);
                        const divs = divisionPresets[v] || [];
                        setNewDivision(divs[0] || '');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="LuckyCat">LuckyCat (LC)</option>
                      <option value="JP Karaoke">JP Karaoke</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Divisi Kerja</label>
                    <select
                      value={newDivision}
                      onChange={(e) => setNewDivision(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {(divisionPresets[newVenue] || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {newDivision === 'Lainnya (Ketik Manual)' && (
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nama Divisi Baru</label>
                    <input
                      type="text"
                      required
                      value={customDivision}
                      onChange={(e) => setCustomDivision(e.target.value)}
                      placeholder="Contoh: Security / Teknisi"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Shift Name & Shift Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nama Shift</label>
                    <input
                      type="text"
                      required
                      value={newShiftName}
                      onChange={(e) => setNewShiftName(e.target.value)}
                      placeholder="Contoh: Shift 1, Middle 1, Shift Malam"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Urutan Shift</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newShiftNumber}
                      onChange={(e) => setNewShiftNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Start Time & End Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Jam Mulai (Masuk)</label>
                    <input
                      type="time"
                      required
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Jam Selesai (Pulang)</label>
                    <input
                      type="text"
                      required
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      placeholder="Contoh: 19:00 atau 03:30"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Checkout Mode */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Flexible Checkout</span>
                    <span className="text-[10px] text-slate-400">
                      Aktifkan untuk shift malam/dini hari yang boleh check-out fleksibel saat operasional tutup.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newIsFlexible}
                    onChange={(e) => setNewIsFlexible(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                </div>

                {/* Break Policy & Window Rules */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Bolehkan Istirahat (Break Allowed)</span>
                      <span className="text-[10px] text-slate-400">
                        Apakah karyawan pada shift ini berhak mendapatkan waktu istirahat?
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={newAllowsBreak}
                      onChange={(e) => setNewAllowsBreak(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>

                  {newAllowsBreak && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="text-[11px] font-bold text-amber-300 flex items-center space-x-1.5">
                        <Coffee className="w-3.5 h-3.5" />
                        <span>Aturan Jendela Waktu Istirahat (Break Time Window):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">
                            Tombol Istirahat Muncul Dari Jam:
                          </label>
                          <input
                            type="time"
                            value={newBreakStartTime}
                            onChange={(e) => setNewBreakStartTime(e.target.value)}
                            placeholder="Contoh: 14:00"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">
                            Batas Akhir Selesai Istirahat:
                          </label>
                          <input
                            type="time"
                            value={newMaxBreakEnd}
                            onChange={(e) => setNewMaxBreakEnd(e.target.value)}
                            placeholder="Contoh: 17:00"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        * Tombol istirahat hanya akan muncul dan bisa ditekan oleh staf antara jam di atas (dan maksimal 2 jam sebelum shift selesai).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20"
                >
                  {adding ? 'Menyimpan...' : 'Simpan Shift Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
