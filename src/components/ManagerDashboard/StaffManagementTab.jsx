import React, { useState, useEffect } from 'react';
import { UserPlus, Key, ShieldAlert, CheckCircle2, XCircle, Search, Eye, EyeOff, RefreshCw, Sparkles, UserCheck, Building2, Trash2 } from 'lucide-react';
import { getAdminStaffList, createStaff, resetStaffPin, toggleStaffStatus, deleteStaff } from '../../utils/api';
import { showToast } from '../Common/Toast';

export default function StaffManagementTab({ onStaffUpdated }) {
  const [staffRoster, setStaffRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('ALL');

  // Add staff modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newVenue, setNewVenue] = useState('LuckyCat');
  const [selectedRoleOption, setSelectedRoleOption] = useState('Server');
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newStatus, setNewStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reset PIN modal state
  const [pinModalStaff, setPinModalStaff] = useState(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const [showPins, setShowPins] = useState({});

  // Division & Role templates mapping
  const templatesByVenue = {
    'LuckyCat': [
      {
        role: 'Server',
        division: 'Bar, Cashier, and Server',
        label: 'Server (3 Shift: Shift 1, Middle, Shift 3)',
        description: 'Shift 1: 10:00-19:00 | Middle: 14:00-23:00 | Shift 3: 18:30-03:30 (Istirahat 1 Jam)',
        start_time: '10:00',
        end_time: '19:00',
        standard_hours: 9
      },
      {
        role: 'Cashier',
        division: 'Bar, Cashier, and Server',
        label: 'Cashier (3 Shift: Shift 1, Middle, Shift 3)',
        description: 'Shift 1: 10:00-19:00 | Middle: 14:00-23:00 | Shift 3: 18:30-03:30 (Istirahat 1 Jam)',
        start_time: '10:00',
        end_time: '19:00',
        standard_hours: 9
      },
      {
        role: 'Bar',
        division: 'Bar, Cashier, and Server',
        label: 'Bar (3 Shift: Shift 1, Middle, Shift 3)',
        description: 'Shift 1: 10:00-19:00 | Middle: 14:00-23:00 | Shift 3: 18:30-03:30 (Istirahat 1 Jam)',
        start_time: '10:00',
        end_time: '19:00',
        standard_hours: 9
      },
      {
        role: 'Kitchen',
        division: 'Kitchen',
        label: 'Kitchen (4 Shift: Pagi, Mid 1, Mid 2, Malam)',
        description: 'Shift 1: 09:00-19:00 | Mid 1: 12:00-22:00 | Mid 2: 14:00-00:00 | Shift 2: 18:00-03:00 (Istirahat 1 Jam)',
        start_time: '09:00',
        end_time: '19:00',
        standard_hours: 9
      },
      {
        role: 'Assistant Manager',
        division: 'Management',
        label: 'Assistant Manager (Management)',
        description: 'Shift Fleksibel (Tanpa jam shift kaku, checkout bebas, tanpa batas istirahat)',
        start_time: '00:00',
        end_time: '23:59',
        standard_hours: 8
      },
      {
        role: 'Management',
        division: 'Management',
        label: 'Management (General)',
        description: 'Shift Fleksibel (Full Bebas & Tanpa Anomali Jam Masuk/Pulang)',
        start_time: '00:00',
        end_time: '23:59',
        standard_hours: 8
      }
    ],
    'JP Karaoke': [
      {
        role: 'Cashier',
        division: 'Server and Cashier',
        label: 'Cashier (2 Shift)',
        description: 'Shift 1: 13:00 - 22:00 | Shift 2: 18:30 - 03:00 (Tanpa Istirahat)',
        start_time: '13:00',
        end_time: '22:00',
        standard_hours: 8.5
      },
      {
        role: 'Server',
        division: 'Server and Cashier',
        label: 'Server (2 Shift)',
        description: 'Shift 1: 13:00 - 22:00 | Shift 2: 18:30 - 03:00 (Tanpa Istirahat)',
        start_time: '13:00',
        end_time: '22:00',
        standard_hours: 8.5
      },
      {
        role: 'Cleaning Service',
        division: 'Cleaning Service',
        label: 'Cleaning Service (2 Shift)',
        description: 'Shift 1: 10:00 - 19:00 | Shift 2: 18:30 - 03:00 (Tanpa Istirahat)',
        start_time: '10:00',
        end_time: '19:00',
        standard_hours: 8.5
      },
      {
        role: 'Storage Staff',
        division: 'Storage Staff',
        label: 'Storage Staff (3 Shift: Pagi, Mid, Malam)',
        description: 'Shift 1: 10:00-19:00 | Shift 2: 13:00-22:00 | Shift 3: 18:30-03:30',
        start_time: '10:00',
        end_time: '19:00',
        standard_hours: 9
      },
      {
        role: 'Assistant Manager',
        division: 'Management',
        label: 'Assistant Manager (Management)',
        description: 'Shift Fleksibel (Tanpa jam shift kaku, checkout bebas, tanpa batas istirahat)',
        start_time: '00:00',
        end_time: '23:59',
        standard_hours: 8
      },
      {
        role: 'Management',
        division: 'Management',
        label: 'Management (General)',
        description: 'Shift Fleksibel (Full Bebas & Tanpa Anomali Jam Masuk/Pulang)',
        start_time: '00:00',
        end_time: '23:59',
        standard_hours: 8
      }
    ]
  };

  const currentTemplateOptions = templatesByVenue[newVenue] || [];
  const currentTemplate = currentTemplateOptions.find((t) => t.role === selectedRoleOption) || currentTemplateOptions[0];

  const loadRoster = async () => {
    setLoading(true);
    try {
      const data = await getAdminStaffList();
      setStaffRoster(data);
    } catch (err) {
      console.error('Failed to load admin roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const handleOpenAddModal = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(randomPin);
    setNewName('');
    setSelectedRoleOption('Server');
    setNewVenue('LuckyCat');
    setModalOpen(true);
  };

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(randomPin);
  };

  const handleVenueChange = (venue) => {
    setNewVenue(venue);
    const opts = templatesByVenue[venue] || [];
    if (opts.length > 0) {
      setSelectedRoleOption(opts[0].role);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);

    try {
      const activeTemplate = currentTemplateOptions.find((t) => t.role === selectedRoleOption) || currentTemplateOptions[0];

      await createStaff({
        name: newName.trim(),
        venue: newVenue,
        division: activeTemplate.division,
        role: activeTemplate.role,
        department: activeTemplate.division,
        pin: newPin || Math.floor(1000 + Math.random() * 9000).toString(),
        is_active: newStatus ? 1 : 0,
        shift_start: activeTemplate.start_time,
        shift_end: activeTemplate.end_time,
        standard_hours: activeTemplate.standard_hours
      });

      setModalOpen(false);
      setNewName('');
      setNewPin('');
      await loadRoster();
      if (onStaffUpdated) onStaffUpdated();
      showToast('Karyawan baru berhasil ditambahkan.', 'success');
    } catch (err) {
      showToast('Error creating staff: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    const nextStatus = staff.is_active === 1 ? 0 : 1;
    try {
      await toggleStaffStatus(staff.id, nextStatus);
      await loadRoster();
      if (onStaffUpdated) onStaffUpdated();
      showToast(`Status staf ${staff.name} berhasil diubah.`, 'success');
    } catch (err) {
      showToast('Error toggling status: ' + err.message, 'error');
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Yakin ingin menghapus karyawan "${staff.name}" (${staff.id})? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await deleteStaff(staff.id);
      await loadRoster();
      if (onStaffUpdated) onStaffUpdated();
      showToast('Staff berhasil dihapus.', 'success');
    } catch (err) {
      showToast('Gagal menghapus staff: ' + err.message, 'error');
    }
  };

  const handleSaveResetPin = async (e) => {
    e.preventDefault();
    if (!pinModalStaff || resetPinValue.length < 4) return;
    setPinSubmitting(true);

    try {
      await resetStaffPin(pinModalStaff.id, resetPinValue);
      setPinModalStaff(null);
      setResetPinValue('');
      await loadRoster();
      if (onStaffUpdated) onStaffUpdated();
      showToast('PIN berhasil diperbarui.', 'success');
    } catch (err) {
      showToast('Error resetting PIN: ' + err.message, 'error');
    } finally {
      setPinSubmitting(false);
    }
  };

  const filteredStaff = staffRoster.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(search.toLowerCase()) ||
      staff.role.toLowerCase().includes(search.toLowerCase()) ||
      staff.id.toLowerCase().includes(search.toLowerCase()) ||
      (staff.division && staff.division.toLowerCase().includes(search.toLowerCase()));

    const matchesVenue = venueFilter === 'ALL' || staff.venue === venueFilter;
    return matchesSearch && matchesVenue;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Card - White & Blue */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
              Staff &amp; PIN Management
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-950 mt-1">
            Pengaturan Karyawan &amp; Hak Akses PIN
          </h3>
          <p className="text-xs text-slate-700 mt-0.5 font-bold">
            Manajemen staf terpusat JP Karaoke &amp; LuckyCat Billiard. Data tersimpan permanen di cloud.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/30 transition shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Tambah Karyawan Baru</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, role, atau ID staff..."
              className="w-full bg-white border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-950 font-bold placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            className="bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-950 font-black focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="ALL">Semua Outlet</option>
            <option value="JP Karaoke">JP Karaoke</option>
            <option value="LuckyCat">LuckyCat</option>
          </select>
        </div>

        <div className="text-xs text-slate-700 font-bold flex items-center space-x-2">
          <span>Total: <strong className="text-slate-950 font-black">{filteredStaff.length}</strong> staff</span>
          <span>•</span>
          <span className="text-emerald-700 font-black">
            {filteredStaff.filter((s) => s.is_active === 1).length} aktif
          </span>
          <button
            onClick={loadRoster}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition ml-2"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Roster Table - High Contrast */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-950 uppercase text-[10px] tracking-wider font-black border-b-2 border-slate-200">
              <tr>
                <th className="py-3.5 px-3">Staff ID</th>
                <th className="py-3.5 px-3">Outlet &amp; Divisi</th>
                <th className="py-3.5 px-3">Nama Lengkap</th>
                <th className="py-3.5 px-3">Posisi (Role)</th>
                <th className="py-3.5 px-3">PIN Staf</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Shift Jam Kerja</th>
                <th className="py-3.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStaff.map((staff) => {
                const isActive = staff.is_active === 1;
                const pinRevealed = showPins[staff.id];

                return (
                  <tr
                    key={staff.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      !isActive ? 'bg-rose-50/40 opacity-75' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">{staff.id}</td>

                    <td className="py-3 px-3">
                      <span className="font-black text-slate-950 block">
                        {staff.venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                      </span>
                      <div className="text-[11px] text-blue-700 font-bold">
                        {staff.division}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-black text-slate-950 text-sm">{staff.name}</td>
                    <td className="py-3 px-3 text-slate-800 font-bold">{staff.role}</td>

                    {/* Assigned PIN */}
                    <td className="py-3 px-3">
                      <div className="inline-flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border-2 border-slate-200 font-mono">
                        <Key className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                        <span className="font-black text-slate-950 tracking-wider">
                          {pinRevealed ? staff.pin : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setShowPins((prev) => ({ ...prev, [staff.id]: !prev[staff.id] }))
                          }
                          className="text-slate-500 hover:text-slate-950 ml-1"
                          title={pinRevealed ? 'Sembunyikan' : 'Lihat PIN'}
                        >
                          {pinRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : 'bg-rose-100 text-rose-950 border-rose-300'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 stroke-[3]" />
                            <span>Suspended</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Shift Pattern */}
                    <td className="py-3 px-3 text-[11px] font-mono">
                      <span className="text-blue-950 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                        Auto-Detect Shift
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setPinModalStaff(staff);
                          setResetPinValue('');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-black border border-slate-300 transition"
                      >
                        Reset PIN
                      </button>

                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition ${
                          isActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>

                      <button
                        onClick={() => handleDeleteStaff(staff)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-black border border-rose-300 transition inline-flex items-center space-x-1"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Staff (Simplified Template-based) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateStaff}>
              <div className="p-4 sm:p-5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-base font-black text-slate-950">Tambah Karyawan Baru</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-200 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Outlet Venue Selection */}
                <div>
                  <label className="text-slate-950 font-black block mb-1">Outlet / Lokasi</label>
                  <select
                    value={newVenue}
                    onChange={(e) => handleVenueChange(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-bold focus:outline-none focus:border-blue-600"
                  >
                    <option value="LuckyCat">LuckyCat (LC)</option>
                    <option value="JP Karaoke">JP Karaoke</option>
                  </select>
                </div>

                {/* Division & Role Selection */}
                <div>
                  <label className="text-slate-950 font-black block mb-1">Divisi &amp; Posisi Kerja</label>
                  <select
                    value={selectedRoleOption}
                    onChange={(e) => setSelectedRoleOption(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-bold focus:outline-none focus:border-blue-600"
                  >
                    {currentTemplateOptions.map((opt) => (
                      <option key={opt.role} value={opt.role}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="text-slate-950 font-black block mb-1">Nama Karyawan</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Iwan"
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 text-sm font-black focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Template Shift Info Card (Auto Inherited) */}
                {currentTemplate && (
                  <div className="p-3.5 bg-blue-50 border-2 border-blue-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-blue-900 font-black text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>Template Jam Kerja Terikat:</span>
                    </div>
                    <div className="text-xs font-mono text-blue-950 font-black">
                      {currentTemplate.description}
                    </div>
                    <div className="text-[11px] text-slate-700 font-bold">
                      ✓ Jam shift terikat otomatis sesuai template divisi. Anda tidak perlu memasukkan jam manual.
                    </div>
                  </div>
                )}

                {/* PIN */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-950 font-black">PIN Karyawan (4-Digit)</label>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-xs text-blue-700 hover:underline flex items-center space-x-1 font-bold"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Acak Ulang PIN</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Contoh: 4829"
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-blue-700 font-mono text-lg font-black tracking-widest focus:outline-none focus:border-blue-600 text-center"
                  />
                </div>

                {/* Initial Status */}
                <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-950 block">Status Karyawan</span>
                    <span className="text-[11px] text-slate-600 font-bold">
                      {newStatus ? 'Aktif (Karyawan langsung bisa login via PIN)' : 'Nonaktif / Suspended'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newStatus}
                    onChange={(e) => setNewStatus(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 border-t-2 border-slate-200 bg-slate-50 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-600/30 transition"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Daftarkan Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Staff PIN */}
      {pinModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleSaveResetPin}>
              <div className="p-4 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Key className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-950">Reset PIN Staff</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPinModalStaff(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-200 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <p className="text-slate-800 font-bold">
                  Masukkan 4 digit PIN baru untuk <strong className="text-slate-950">{pinModalStaff.name}</strong> ({pinModalStaff.id}):
                </p>

                <div>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={resetPinValue}
                    onChange={(e) => setResetPinValue(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono text-xl font-black text-center tracking-widest focus:outline-none focus:border-blue-600"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 border-t-2 border-slate-200 bg-slate-50 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPinModalStaff(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pinSubmitting || resetPinValue.length < 4}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {pinSubmitting ? 'Menyimpan...' : 'Perbarui PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
