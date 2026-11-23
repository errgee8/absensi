import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Save, X, Coffee, Plus, Trash2, CheckCircle2, ShieldAlert, Sparkles, Building2, Users, CheckSquare, Square, Search, Zap, Check } from 'lucide-react';
import { getShiftSchedules, updateShiftSchedule, createShiftSchedule, deleteShiftSchedule, getFlexible9hSettings, updateFlexible9hEligibleStaff, getAdminStaffList } from '../../utils/api';
import { showToast } from '../Common/Toast';

export default function ShiftSchedulesTab() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Flexible 9H Shift Template State
  const [flexData, setFlexData] = useState(null);
  const [allStaffList, setAllStaffList] = useState([]);
  const [manageStaffModalOpen, setManageStaffModalOpen] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffOutletFilter, setStaffOutletFilter] = useState('ALL');
  const [savingEligibleStaff, setSavingEligibleStaff] = useState(false);

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
      'Management',
      'Lainnya (Ketik Manual)'
    ],
    'JP Karaoke': [
      'Server and Cashier',
      'Cleaning Service',
      'Storage Staff',
      'Management',
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
      const [data, flex, staffData] = await Promise.all([
        getShiftSchedules(),
        getFlexible9hSettings().catch(() => null),
        getAdminStaffList().catch(() => [])
      ]);
      setSchedules(data);
      if (flex) {
        setFlexData(flex);
        setSelectedStaffIds(flex.eligibleStaffIds || []);
      }
      const roster = Array.isArray(staffData) ? staffData : (staffData?.staff || []);
      setAllStaffList(roster);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleSaveEligibleStaff = async (newIds) => {
    const listToSave = newIds !== undefined ? newIds : selectedStaffIds;
    setSavingEligibleStaff(true);
    try {
      const res = await updateFlexible9hEligibleStaff(listToSave);
      setFlexData((prev) => ({ ...prev, eligibleStaffIds: res.eligibleStaffIds }));
      setSelectedStaffIds(res.eligibleStaffIds);
      setManageStaffModalOpen(false);
      showToast('Izin shift fleksibel 9 jam berhasil disimpan!', 'success');
      showNotification('Daftar staf yang diizinkan shift fleksibel berhasil diperbarui.');
    } catch (err) {
      showToast('Gagal menyimpan izin staf: ' + err.message, 'error');
    } finally {
      setSavingEligibleStaff(false);
    }
  };

  const handleToggleStaffId = (sId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  const handleQuickRemoveStaff = async (sId) => {
    const nextList = (flexData?.eligibleStaffIds || []).filter((id) => id !== sId);
    await handleSaveEligibleStaff(nextList);
  };

  const handleSelectAllHOD = () => {
    const hodIds = allStaffList
      .filter((s) => {
        const r = (s.role || '').toLowerCase();
        const d = (s.division || '').toLowerCase();
        return (
          d.includes('manage') ||
          r.includes('manager') ||
          r.includes('head') ||
          r.includes('lead') ||
          r.includes('spv') ||
          r.includes('supervisor')
        );
      })
      .map((s) => s.id);
    setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...hodIds])));
  };

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
      showToast('Jadwal shift berhasil diperbarui.', 'success');
    } catch (err) {
      showToast('Gagal menyimpan jadwal: ' + err.message, 'error');
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
      showToast('Jadwal shift berhasil dihapus.', 'success');
    } catch (err) {
      showToast('Gagal menghapus shift: ' + err.message, 'error');
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
        showToast('Harap masukkan nama divisi kerja.', 'warning');
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
      showToast(`Shift baru "${newShiftName}" berhasil ditambahkan!`, 'success');
    } catch (err) {
      showToast('Gagal membuat shift baru: ' + err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const luckyCatSchedules = schedules.filter((s) => s.venue === 'LuckyCat');
  const jpKaraokeSchedules = schedules.filter((s) => s.venue === 'JP Karaoke');

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      {/* Header Bar */}
      <div className="bg-[#161b24] p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Shift &amp; Break Rules
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-100 mt-1 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400 stroke-[2.5]" />
            <span>Pengaturan Divisi &amp; Jam Kerja Shift</span>
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Atur jam kerja shift, checkout fleksibel, dan jendela waktu istirahat (kapan tombol istirahat diizinkan muncul).
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal('LuckyCat')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-600/30 transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Tambah Shift Baru</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 font-black flex items-center space-x-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* ========================================================
          SPECIAL TEMPLATE: SHIFT FLEKSIBEL 9 JAM (KHUSUS HOD)
         ======================================================== */}
      <div className="bg-gradient-to-br from-[#1c1a2e] via-[#161a26] to-[#12151f] border-2 border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
        {/* Glow ambient accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Template Khusus &bull; Jam Masuk &amp; Pulang Bebas</span>
            </div>
            <h4 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 pt-1">
              <span>Shift Fleksibel 9 Jam (HOD / Staf Pilihan)</span>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Target 9 Jam
              </span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Staf dengan shift ini <strong>bebas masuk jam berapapun</strong> tanpa jam masuk dan jam pulang yang mengikat, serta <strong>tidak pernah dikenakan penalti terlambat</strong>, asalkan durasi kerja memenuhi standar <strong>9 jam</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedStaffIds(flexData?.eligibleStaffIds || []);
              setStaffSearchQuery('');
              setStaffOutletFilter('ALL');
              setManageStaffModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Users className="w-4 h-4" />
            <span>Pilih Staf yang Berhak ({(flexData?.eligibleStaffIds || []).length})</span>
          </button>
        </div>

        {/* Feature Specs Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-2xl bg-[#12151f]/80 border border-purple-500/20 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-black">Jam Masuk</div>
              <div className="font-bold text-slate-100">Bebas Jam Berapapun</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#12151f]/80 border border-purple-500/20 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-black">Durasi Standar</div>
              <div className="font-bold text-slate-100">Wajib 9 Jam Kerja</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#12151f]/80 border border-purple-500/20 flex items-center gap-2.5">
            <Coffee className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-black">Hak Istirahat</div>
              <div className="font-bold text-slate-100">1 Jam Fleksibel</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#12151f]/80 border border-purple-500/20 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-black">Status Terlambat</div>
              <div className="font-bold text-slate-100">Tanpa Late Flag</div>
            </div>
          </div>
        </div>

        {/* List of currently authorized staff */}
        <div className="pt-2 border-t border-purple-500/20">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Daftar Staf yang Diizinkan Mengambil Shift Ini:</span>
            <span className="text-purple-300 font-mono font-bold">
              {(flexData?.eligibleStaffIds || []).length} Staf Aktif
            </span>
          </div>

          {(flexData?.eligibleStaffIds || []).length === 0 ? (
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs italic text-center">
              Belum ada staf yang diizinkan. Klik tombol <strong>"Pilih Staf yang Berhak"</strong> di atas untuk memberikan akses khusus HOD.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(flexData?.eligibleStaffIds || []).map((sId) => {
                const staffObj = allStaffList.find(
                  (s) => String(s.id) === String(sId) || String(s.legacy_code) === String(sId) || String(s.uuid) === String(sId)
                );
                const displayName = staffObj?.name || sId;
                const roleLabel = staffObj?.role ? ` (${staffObj.role})` : '';
                const venueLabel = staffObj?.venue === 'LuckyCat' ? '🐱 LC' : (staffObj?.venue === 'JP Karaoke' ? '🎤 JP' : '');

                return (
                  <div
                    key={sId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 text-xs font-bold transition shadow-xs"
                  >
                    <span>{venueLabel && `${venueLabel} • `}{displayName}{roleLabel}</span>
                    <button
                      type="button"
                      onClick={() => handleQuickRemoveStaff(sId)}
                      title="Cabut izin shift fleksibel staf ini"
                      className="w-4 h-4 rounded-full bg-purple-400/20 hover:bg-rose-500 hover:text-white flex items-center justify-center text-purple-300 transition cursor-pointer text-[10px]"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 1. LuckyCat Section */}
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm" />
            <div>
              <h4 className="text-base font-black text-slate-100 uppercase tracking-tight">
                LuckyCat (LC) Shifts
              </h4>
              <span className="text-xs text-slate-400 font-bold">
                Server, Cashier, Bar &amp; Kitchen Shifts
              </span>
            </div>
          </div>
          <button
            onClick={() => handleOpenAddModal('LuckyCat')}
            className="text-xs font-black text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-500/30 transition flex items-center space-x-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Shift LC</span>
          </button>
        </div>

        {luckyCatSchedules.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-[#1c2230] rounded-2xl border border-slate-800 font-bold">
            Belum ada jadwal shift untuk LuckyCat. Klik tombol <strong>+ Tambah Shift LC</strong> untuk menambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200 border-collapse">
              <thead className="bg-[#12161f] text-slate-300 text-[10px] uppercase font-black tracking-wider border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800 font-bold">
                {luckyCatSchedules.map((sched) => {
                  const isEditing = editingId === sched.id;
                  return (
                    <tr key={sched.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-black text-slate-100 text-sm">{sched.division}</td>
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
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm" />
            <div>
              <h4 className="text-base font-black text-slate-100 uppercase tracking-tight">
                JP Karaoke Shifts
              </h4>
              <span className="text-xs text-slate-400 font-bold">
                Server &amp; Cashier, Cleaning Service, Storage Staff
              </span>
            </div>
          </div>
          <button
            onClick={() => handleOpenAddModal('JP Karaoke')}
            className="text-xs font-black text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-500/30 transition flex items-center space-x-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Shift JP</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200 border-collapse">
            <thead className="bg-[#12161f] text-slate-300 text-[10px] uppercase font-black tracking-wider border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800 font-bold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-slate-200">
          <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateSchedule}>
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#12161f] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-sm">
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-100">Tambah Jadwal Shift Baru</h3>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Tentukan jam masuk, jam pulang, dan batas jendela istirahat</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Outlet Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-black block mb-1">Outlet / Venue</label>
                    <select
                      value={newVenue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewVenue(v);
                        const divs = divisionPresets[v] || [];
                        setNewDivision(divs[0] || '');
                      }}
                      className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-black focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="LuckyCat">LuckyCat (LC)</option>
                      <option value="JP Karaoke">JP Karaoke</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-black block mb-1">Divisi Kerja</label>
                    <select
                      value={newDivision}
                      onChange={(e) => setNewDivision(e.target.value)}
                      className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-black focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {(divisionPresets[newVenue] || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {newDivision === 'Lainnya (Ketik Manual)' && (
                  <div>
                    <label className="text-slate-300 font-black block mb-1">Nama Divisi Baru</label>
                    <input
                      type="text"
                      required
                      value={customDivision}
                      onChange={(e) => setCustomDivision(e.target.value)}
                      placeholder="Contoh: Security / Teknisi"
                      className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 font-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Shift Name & Shift Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-black block mb-1">Nama Shift</label>
                    <input
                      type="text"
                      required
                      value={newShiftName}
                      onChange={(e) => setNewShiftName(e.target.value)}
                      placeholder="Contoh: Shift 1, Middle 1, Shift Malam"
                      className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 font-black focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-black block mb-1">Urutan Shift</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newShiftNumber}
                      onChange={(e) => setNewShiftNumber(e.target.value)}
                      className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Start Time & End Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-black block mb-1">Jam Mulai (Masuk)</label>
                    <input
                      type="time"
                      required
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-black focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-black block mb-1">Jam Selesai (Pulang)</label>
                    <input
                      type="text"
                      required
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      placeholder="Contoh: 19:00 atau 03:30"
                      className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Checkout Mode */}
                <div className="p-3.5 bg-[#1c2230] rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-100 block">Flexible Checkout</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 font-bold">
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
                <div className="p-4 bg-[#1c2230] rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-slate-100 block">Bolehkan Istirahat (Break Allowed)</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5 font-bold">
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
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="text-xs font-black text-amber-300 flex items-center space-x-1.5">
                        <Coffee className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Aturan Jendela Waktu Istirahat (Break Time Window):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 font-black block mb-1">
                            Tombol Istirahat Muncul Dari Jam:
                          </label>
                          <input
                            type="time"
                            value={newBreakStartTime}
                            onChange={(e) => setNewBreakStartTime(e.target.value)}
                            placeholder="Contoh: 14:00"
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 font-mono font-black text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 font-black block mb-1">
                            Batas Akhir Selesai Istirahat:
                          </label>
                          <input
                            type="time"
                            value={newMaxBreakEnd}
                            onChange={(e) => setNewMaxBreakEnd(e.target.value)}
                            placeholder="Contoh: 17:00"
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 font-mono font-black text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold">
                        * Tombol istirahat hanya akan muncul dan bisa ditekan oleh staf antara jam di atas (dan maksimal 2 jam sebelum shift selesai).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-[#12161f] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 bg-[#1c2230] hover:bg-[#252d3d] text-slate-300 rounded-xl text-xs font-black border border-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  {adding ? 'Menyimpan...' : 'Simpan Shift Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: KELOLA STAF YANG DIIZINKAN SHIFT FLEKSIBEL 9 JAM
         ======================================================== */}
      {manageStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-[#161a24] border-2 border-purple-500/50 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/70 via-[#1b1928] to-[#121620] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Kelola Izin Shift Fleksibel 9 Jam</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Khusus HOD
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    Pilih staf mana saja yang berhak masuk jam berapapun dengan target kerja 9 jam.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManageStaffModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="p-4 border-b border-slate-800 bg-[#12151f] space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Cari nama staf, jabatan, ID..."
                    className="w-full bg-[#181d28] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-bold"
                  />
                </div>

                <select
                  value={staffOutletFilter}
                  onChange={(e) => setStaffOutletFilter(e.target.value)}
                  className="bg-[#181d28] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="ALL">Semua Outlet</option>
                  <option value="LuckyCat">LuckyCat</option>
                  <option value="JP Karaoke">JP Karaoke</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllHOD}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-black border border-purple-400/40 transition flex items-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Pilih Semua HOD &amp; Management</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const visibleIds = allStaffList
                      .filter((s) => {
                        const q = staffSearchQuery.toLowerCase();
                        const matchQ = !q || s.name?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q);
                        const matchV = staffOutletFilter === 'ALL' || s.venue === staffOutletFilter;
                        return matchQ && matchV;
                      })
                      .map((s) => s.id);
                    setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition cursor-pointer text-[11px]"
                >
                  Pilih Semua Terlihat
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStaffIds([])}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 font-bold border border-slate-700 hover:border-rose-500/40 transition cursor-pointer text-[11px] ml-auto"
                >
                  Kosongkan Semua
                </button>
              </div>
            </div>

            {/* Staff Checklist Roster */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-96">
              {allStaffList
                .filter((s) => {
                  const q = staffSearchQuery.toLowerCase();
                  const matchQ = !q || s.name?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q);
                  const matchV = staffOutletFilter === 'ALL' || s.venue === staffOutletFilter;
                  return matchQ && matchV;
                })
                .map((s) => {
                  const isChecked = selectedStaffIds.includes(s.id) || (s.uuid && selectedStaffIds.includes(s.uuid));
                  const r = (s.role || '').toLowerCase();
                  const d = (s.division || '').toLowerCase();
                  const isHodRole = (
                    d.includes('manage') ||
                    r.includes('manager') ||
                    r.includes('head') ||
                    r.includes('lead') ||
                    r.includes('spv') ||
                    r.includes('supervisor')
                  );

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleStaffId(s.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-purple-950/40 border-purple-500/60 text-white shadow-sm ring-1 ring-purple-500/30'
                          : 'bg-[#181d28]/70 hover:bg-[#1f2533] border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition shrink-0 ${
                          isChecked
                            ? 'bg-purple-500 border-purple-400 text-white'
                            : 'border-slate-600 bg-slate-800'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div>
                          <div className="font-black text-xs text-white flex items-center gap-2">
                            <span>{s.name}</span>
                            {isHodRole && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                HOD
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-bold mt-0.5">
                            {s.role} &bull; {s.division}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                          s.venue === 'LuckyCat'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-400/30'
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30'
                        }`}>
                          {s.venue === 'LuckyCat' ? '🐱 LuckyCat' : '🎤 JP Karaoke'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#12151f] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                <strong className="text-purple-400 font-black">{selectedStaffIds.length}</strong> staf dipilih berhak
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManageStaffModalOpen(false)}
                  className="px-4 py-2.5 bg-[#1c2230] hover:bg-[#252d3d] text-slate-300 rounded-xl text-xs font-black border border-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingEligibleStaff}
                  onClick={() => handleSaveEligibleStaff()}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingEligibleStaff ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Izin Staf ({selectedStaffIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
