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
    setEditName(sched.name || 'Shift');
    setEditStartTime(sched.start_time || '10:00');
    setEditEndTime(sched.end_time || '19:00');
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
        break_start_time: editAllowsBreak ? editBreakStartTime : null,
        max_break_end: editAllowsBreak ? editMaxBreakEnd : null
      });

      setEditingId(null);
      await loadSchedules();
      showNotification('Jadwal shift berhasil diperbarui.');
    } catch (err) {
      alert('Gagal menyimpan jadwal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (sched) => {
    if (!window.confirm(`Yakin ingin menghapus jadwal "${sched.name}" (${sched.venue} - ${sched.division})?`)) {
      return;
    }
    try {
      await deleteShiftSchedule(sched.id);
      await loadSchedules();
      showNotification('Jadwal shift berhasil dihapus.');
    } catch (err) {
      alert('Gagal menghapus shift: ' + err.message);
    }
  };

  const handleOpenAddModal = (presetVenue = 'LuckyCat') => {
    setNewVenue(presetVenue);
    const divs = divisionPresets[presetVenue] || [];
    setNewDivision(divs[0] || 'Bar, Cashier, and Server');
    setCustomDivision('');
    setNewShiftName('Shift 1');
    setNewShiftNumber(1);
    setNewStartTime('10:00');
    setNewEndTime('19:00');
    setNewIsFlexible(false);
    setNewAllowsBreak(true);
    setNewBreakStartTime('14:00');
    setNewMaxBreakEnd('17:00');
    setAddModalOpen(true);
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const targetDivision = newDivision === 'Lainnya (Ketik Manual)' ? customDivision.trim() : newDivision;
      if (!targetDivision) {
        alert('Harap masukkan nama divisi kerja.');
        setAdding(false);
        return;
      }

      await createShiftSchedule({
        venue: newVenue,
        division: targetDivision,
        name: newShiftName.trim(),
        shift_number: parseInt(newShiftNumber, 10) || 1,
        start_time: newStartTime,
        end_time: newEndTime,
        is_flexible_checkout: newIsFlexible ? 1 : 0,
        allows_break: newAllowsBreak ? 1 : 0,
        break_start_time: newAllowsBreak ? newBreakStartTime : null,
        max_break_end: newAllowsBreak ? newMaxBreakEnd : null
      });

      setAddModalOpen(false);
      await loadSchedules();
      showNotification(`Shift baru "${newShiftName}" untuk ${targetDivision} berhasil ditambahkan!`);
    } catch (err) {
      alert('Gagal membuat shift baru: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const luckyCatSchedules = schedules.filter((s) => s.venue === 'LuckyCat');
  const jpKaraokeSchedules = schedules.filter((s) => s.venue === 'JP Karaoke');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
              Shift &amp; Break Rules
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-950 mt-1 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <span>Pengaturan Divisi &amp; Jam Kerja Shift</span>
          </h3>
          <p className="text-xs text-slate-700 font-bold mt-0.5">
            Atur jam kerja shift, checkout fleksibel, dan jendela waktu istirahat (kapan tombol istirahat diizinkan muncul).
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal('LuckyCat')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/30 transition shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Tambah Shift Baru</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-100 border-2 border-emerald-300 rounded-2xl text-xs text-emerald-950 font-black flex items-center space-x-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 stroke-[2.5]" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* 1. LuckyCat Section */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b-2 border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm" />
            <div>
              <h4 className="text-base font-black text-slate-950 uppercase tracking-tight">
                LuckyCat (LC) Shifts
              </h4>
              <span className="text-xs text-slate-700 font-bold">
                Server, Cashier, Bar &amp; Kitchen Shifts
              </span>
            </div>
          </div>
          <button
            onClick={() => handleOpenAddModal('LuckyCat')}
            className="text-xs font-black text-blue-900 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-300 transition flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Shift LC</span>
          </button>
        </div>

        {luckyCatSchedules.length === 0 ? (
          <div className="p-8 text-center text-slate-700 text-xs bg-slate-50 rounded-2xl border-2 border-slate-200 font-bold">
            Belum ada jadwal shift untuk LuckyCat. Klik tombol <strong>+ Tambah Shift LC</strong> untuk menambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-900 border-collapse">
              <thead className="bg-slate-100 text-slate-950 text-[10px] uppercase font-black tracking-wider border-b-2 border-slate-200">
                <tr>
                  <th className="py-3 px-3">Divisi</th>
                  <th className="py-3 px-3">Nama Shift</th>
                  <th className="py-3 px-3">Jam Masuk</th>
                  <th className="py-3 px-3">Jam Pulang</th>
                  <th className="py-3 px-3">Jendela Istirahat (Break Window)</th>
                  <th className="py-3 px-3">Checkout Mode</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100 font-bold">
                {luckyCatSchedules.map((sched) => {
                  const isEditing = editingId === sched.id;
                  return (
                    <tr key={sched.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-3 font-black text-slate-950 text-sm">{sched.division}</td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-slate-50 border-2 border-slate-300 rounded-lg px-2 py-1 text-slate-950 font-black text-xs w-28 focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono bg-blue-100 text-blue-900 border border-blue-300 font-black">
                            {sched.name}
                          </span>
                        )}
                      </td>

                      {/* Start Time */}
                      <td className="py-3 px-3 font-mono font-black text-emerald-800">
                        {isEditing ? (
                          <input
                            type="time"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="bg-slate-50 border-2 border-slate-300 rounded-lg px-2 py-1 text-slate-950 font-mono font-black text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        ) : (
                          sched.start_time
                        )}
                      </td>

                      {/* End Time */}
                      <td className="py-3 px-3 font-mono font-black text-indigo-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            placeholder="Contoh: 19:00 atau 03:30"
                            className="bg-slate-50 border-2 border-slate-300 rounded-lg px-2 py-1 text-slate-950 font-mono font-black text-xs w-28 focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        ) : (
                          sched.end_time
                        )}
                      </td>

                      {/* Break Policy & Window Rules */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border-2 border-slate-200">
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editAllowsBreak}
                                onChange={(e) => setEditAllowsBreak(e.target.checked)}
                                className="accent-blue-600"
                              />
                              <span className="text-xs text-slate-950 font-black">Bolehkan Istirahat</span>
                            </label>
                            {editAllowsBreak && (
                              <div className="flex items-center space-x-1.5 text-xs text-slate-800 font-bold pt-1">
                                <span>Dari:</span>
                                <input
                                  type="time"
                                  value={editBreakStartTime}
                                  onChange={(e) => setEditBreakStartTime(e.target.value)}
                                  className="bg-white border-2 border-slate-300 rounded px-1.5 py-0.5 text-slate-950 font-mono font-bold"
                                />
                                <span>Sampai:</span>
                                <input
                                  type="time"
                                  value={editMaxBreakEnd}
                                  onChange={(e) => setEditMaxBreakEnd(e.target.value)}
                                  className="bg-white border-2 border-slate-300 rounded px-1.5 py-0.5 text-slate-950 font-mono font-bold"
                                />
                              </div>
                            )}
                          </div>
                        ) : sched.allows_break ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                              <Coffee className="w-3 h-3 stroke-[2.5]" />
                              <span>Istirahat Aktif</span>
                            </span>
                            <div className="text-xs font-mono font-black text-amber-900">
                              {sched.break_start_time && sched.max_break_end
                                ? `Jendela: ${sched.break_start_time} - ${sched.max_break_end}`
                                : sched.max_break_end
                                ? `Maks selesai: ${sched.max_break_end}`
                                : 'Maks 2 jam sebelum usai'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 font-bold">Tanpa Istirahat</span>
                        )}
                      </td>

                      {/* Checkout Mode */}
                      <td className="py-3 px-3 text-xs">
                        {isEditing ? (
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editIsFlexible}
                              onChange={(e) => setEditIsFlexible(e.target.checked)}
                              className="accent-blue-600"
                            />
                            <span className="text-slate-950 font-black">Flexible Checkout</span>
                          </label>
                        ) : sched.is_flexible_checkout ? (
                          <span className="text-amber-800 font-black">Flexible (Bebas Checkout Malam)</span>
                        ) : (
                          <span className="text-slate-700 font-bold">Jadwal Pasti</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-300"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => handleSaveEdit(sched.id)}
                              disabled={saving}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center space-x-1 shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{saving ? '...' : 'Simpan'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleStartEdit(sched)}
                              className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black border border-blue-200 flex items-center space-x-1 transition shadow-sm"
                            >
                              <Edit2 className="w-3 h-3 stroke-[2.5]" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sched)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition shadow-sm"
                              title="Hapus shift ini"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
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
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b-2 border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-sm" />
            <div>
              <h4 className="text-base font-black text-slate-950 uppercase tracking-tight">
                JP Karaoke Shifts
              </h4>
              <span className="text-xs text-slate-700 font-bold">
                Server &amp; Cashier, Cleaning Service, Storage Staff
              </span>
            </div>
          </div>
          <button
            onClick={() => handleOpenAddModal('JP Karaoke')}
            className="text-xs font-black text-blue-900 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-300 transition flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Shift JP</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-900 border-collapse">
            <thead className="bg-slate-100 text-slate-950 text-[10px] uppercase font-black tracking-wider border-b-2 border-slate-200">
              <tr>
                <th className="py-3 px-3">Divisi</th>
                <th className="py-3 px-3">Nama Shift</th>
                <th className="py-3 px-3">Jam Masuk</th>
                <th className="py-3 px-3">Jam Pulang</th>
                <th className="py-3 px-3">Jendela Istirahat (Break Window)</th>
                <th className="py-3 px-3">Checkout Mode</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-bold">
              {jpKaraokeSchedules.map((sched) => {
                const isEditing = editingId === sched.id;
                return (
                  <tr key={sched.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-3 font-black text-slate-950 text-sm">{sched.division}</td>
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-50 border-2 border-slate-300 rounded-lg px-2 py-1 text-slate-950 font-black text-xs w-28 focus:outline-none focus:border-blue-600 focus:bg-white"
                        />
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono bg-blue-100 text-blue-900 border border-blue-300 font-black">
                          {sched.name}
                        </span>
                      )}
                    </td>

                    {/* Start Time */}
                    <td className="py-3 px-3 font-mono font-black text-emerald-800">
                      {isEditing ? (
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="bg-slate-50 border-2 border-slate-300 rounded-lg px-2 py-1 text-slate-950 font-mono font-black text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                        />
                      ) : (
                        sched.start_time
                      )}
                    </td>

                    {/* End Time */}
                    <td className="py-3 px-3 font-mono font-black text-indigo-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          placeholder="Contoh: 22:00 atau 03:00"
                          className="bg-slate-50 border-2 border-slate-300 rounded-lg px-2 py-1 text-slate-950 font-mono font-black text-xs w-28 focus:outline-none focus:border-blue-600 focus:bg-white"
                        />
                      ) : (
                        sched.end_time
                      )}
                    </td>

                    {/* Break Policy & Window Rules */}
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border-2 border-slate-200">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editAllowsBreak}
                              onChange={(e) => setEditAllowsBreak(e.target.checked)}
                              className="accent-blue-600"
                            />
                            <span className="text-xs text-slate-950 font-black">Bolehkan Istirahat</span>
                          </label>
                          {editAllowsBreak && (
                            <div className="flex items-center space-x-1.5 text-xs text-slate-800 font-bold pt-1">
                              <span>Dari:</span>
                              <input
                                type="time"
                                value={editBreakStartTime}
                                onChange={(e) => setEditBreakStartTime(e.target.value)}
                                className="bg-white border-2 border-slate-300 rounded px-1.5 py-0.5 text-slate-950 font-mono font-bold"
                              />
                              <span>Sampai:</span>
                              <input
                                type="time"
                                value={editMaxBreakEnd}
                                onChange={(e) => setEditMaxBreakEnd(e.target.value)}
                                className="bg-white border-2 border-slate-300 rounded px-1.5 py-0.5 text-slate-950 font-mono font-bold"
                              />
                            </div>
                          )}
                        </div>
                      ) : sched.allows_break ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                            <Coffee className="w-3 h-3 stroke-[2.5]" />
                            <span>Istirahat Aktif</span>
                          </span>
                          <div className="text-xs font-mono font-black text-blue-900">
                            {sched.break_start_time && sched.max_break_end
                              ? `Jendela: ${sched.break_start_time} - ${sched.max_break_end}`
                              : sched.max_break_end
                              ? `Maks selesai: ${sched.max_break_end}`
                              : 'Maks 2 jam sebelum usai'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 font-bold">Tanpa Istirahat</span>
                      )}
                    </td>

                    {/* Checkout Mode */}
                    <td className="py-3 px-3 text-xs">
                      {isEditing ? (
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsFlexible}
                            onChange={(e) => setEditIsFlexible(e.target.checked)}
                            className="accent-blue-600"
                          />
                          <span className="text-slate-950 font-black">Flexible Checkout</span>
                        </label>
                      ) : sched.is_flexible_checkout ? (
                        <span className="text-amber-800 font-black">Flexible (Bebas Checkout Malam)</span>
                      ) : (
                        <span className="text-slate-700 font-bold">Jadwal Pasti</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-300"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(sched.id)}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center space-x-1 shadow-sm"
                          >
                            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{saving ? '...' : 'Simpan'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleStartEdit(sched)}
                            className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black border border-blue-200 flex items-center space-x-1 transition shadow-sm"
                          >
                            <Edit2 className="w-3 h-3 stroke-[2.5]" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(sched)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition shadow-sm"
                            title="Hapus shift ini"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateSchedule}>
              <div className="p-4 sm:p-5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">Tambah Jadwal Shift Baru</h3>
                    <p className="text-xs text-slate-700 font-bold mt-0.5">Tentukan jam masuk, jam pulang, dan batas jendela istirahat</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-xl border border-slate-300 transition"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Outlet Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-950 font-black block mb-1">Outlet / Venue</label>
                    <select
                      value={newVenue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewVenue(v);
                        const divs = divisionPresets[v] || [];
                        setNewDivision(divs[0] || '');
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      <option value="LuckyCat">LuckyCat (LC)</option>
                      <option value="JP Karaoke">JP Karaoke</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-950 font-black block mb-1">Divisi Kerja</label>
                    <select
                      value={newDivision}
                      onChange={(e) => setNewDivision(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      {(divisionPresets[newVenue] || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {newDivision === 'Lainnya (Ketik Manual)' && (
                  <div>
                    <label className="text-slate-950 font-black block mb-1">Nama Divisi Baru</label>
                    <input
                      type="text"
                      required
                      value={customDivision}
                      onChange={(e) => setCustomDivision(e.target.value)}
                      placeholder="Contoh: Security / Teknisi"
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                )}

                {/* Shift Name & Shift Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-950 font-black block mb-1">Nama Shift</label>
                    <input
                      type="text"
                      required
                      value={newShiftName}
                      onChange={(e) => setNewShiftName(e.target.value)}
                      placeholder="Contoh: Shift 1, Middle 1, Shift Malam"
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-950 font-black block mb-1">Urutan Shift</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newShiftNumber}
                      onChange={(e) => setNewShiftNumber(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Start Time & End Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-950 font-black block mb-1">Jam Mulai (Masuk)</label>
                    <input
                      type="time"
                      required
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-950 font-black block mb-1">Jam Selesai (Pulang)</label>
                    <input
                      type="text"
                      required
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      placeholder="Contoh: 19:00 atau 03:30"
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Checkout Mode */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-950 block">Flexible Checkout</span>
                    <span className="text-[11px] text-slate-700 block mt-0.5 font-bold">
                      Aktifkan untuk shift malam/dini hari yang boleh check-out fleksibel saat operasional tutup.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newIsFlexible}
                    onChange={(e) => setNewIsFlexible(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer ml-3"
                  />
                </div>

                {/* Break Policy & Window Rules */}
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-slate-950 block">Bolehkan Istirahat (Break Allowed)</span>
                      <span className="text-[11px] text-slate-700 block mt-0.5 font-bold">
                        Apakah karyawan pada shift ini berhak mendapatkan waktu istirahat?
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={newAllowsBreak}
                      onChange={(e) => setNewAllowsBreak(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer ml-3"
                    />
                  </div>

                  {newAllowsBreak && (
                    <div className="pt-2 border-t-2 border-slate-200 space-y-2.5">
                      <div className="text-xs font-black text-amber-900 flex items-center space-x-1.5">
                        <Coffee className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Aturan Jendela Waktu Istirahat (Break Time Window):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-950 font-black block mb-1">
                            Tombol Istirahat Muncul Dari Jam:
                          </label>
                          <input
                            type="time"
                            value={newBreakStartTime}
                            onChange={(e) => setNewBreakStartTime(e.target.value)}
                            placeholder="Contoh: 14:00"
                            className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-slate-950 font-mono font-black text-xs focus:outline-none focus:border-blue-600"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-950 font-black block mb-1">
                            Batas Akhir Selesai Istirahat:
                          </label>
                          <input
                            type="time"
                            value={newMaxBreakEnd}
                            onChange={(e) => setNewMaxBreakEnd(e.target.value)}
                            placeholder="Contoh: 17:00"
                            className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-slate-950 font-mono font-black text-xs focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-700 font-bold">
                        * Tombol istirahat hanya akan muncul dan bisa ditekan oleh staf antara jam di atas (dan maksimal 2 jam sebelum shift selesai).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t-2 border-slate-200 bg-slate-50 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black border border-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-600/30 transition"
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
