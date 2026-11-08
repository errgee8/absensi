import React, { useState, useEffect } from 'react';
import { UserPlus, Key, ShieldAlert, CheckCircle2, XCircle, Search, Eye, EyeOff, RefreshCw, Sparkles, UserCheck, Building2 } from 'lucide-react';
import { getAdminStaffList, createStaff, resetStaffPin, toggleStaffStatus } from '../../utils/api';

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
        label: 'Server (2 Shift)',
        description: 'Shift 1: 10:00 - 19:00 | Shift 2: 18:30 - 03:30 (Istirahat 1 Jam)',
        start_time: '10:00',
        end_time: '19:00',
        standard_hours: 9
      },
      {
        role: 'Cashier',
        division: 'Bar, Cashier, and Server',
        label: 'Cashier (2 Shift)',
        description: 'Shift 1: 10:00 - 19:00 | Shift 2: 18:30 - 03:30 (Istirahat 1 Jam)',
        start_time: '10:00',
        end_time: '19:00',
        standard_hours: 9
      },
      {
        role: 'Bar',
        division: 'Bar, Cashier, and Server',
        label: 'Bar (2 Shift)',
        description: 'Shift 1: 10:00 - 19:00 | Shift 2: 18:30 - 03:30 (Istirahat 1 Jam)',
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
    } catch (err) {
      alert('Error creating staff: ' + err.message);
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
    } catch (err) {
      alert('Error toggling status: ' + err.message);
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
    } catch (err) {
      alert('Error resetting PIN: ' + err.message);
    } finally {
      setPinSubmitting(false);
    }
  };

  const filteredStaff = staffRoster.filter((s) => {
    const matchesVenue = venueFilter === 'ALL' || s.venue === venueFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      (s.division && s.division.toLowerCase().includes(search.toLowerCase())) ||
      s.role.toLowerCase().includes(search.toLowerCase());
    return matchesVenue && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <span>Staff Administration & PIN Provisioning</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin-only management for JP Karaoke & LuckyCat. Staff cannot self-register.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
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
              placeholder="Search staff by name or role..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
          >
            <option value="ALL">All Outlets</option>
            <option value="JP Karaoke">JP Karaoke</option>
            <option value="LuckyCat">LuckyCat</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total: <strong className="text-white">{filteredStaff.length}</strong> staff (
          <span className="text-emerald-400 font-bold">
            {filteredStaff.filter((s) => s.is_active === 1).length} active
          </span>
          )
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-3">Staff ID</th>
                <th className="py-3.5 px-3">Outlet & Division</th>
                <th className="py-3.5 px-3">Full Name</th>
                <th className="py-3.5 px-3">Role</th>
                <th className="py-3.5 px-3">Assigned PIN</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Shift Schedule</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredStaff.map((staff) => {
                const isActive = staff.is_active === 1;
                const pinRevealed = showPins[staff.id];

                return (
                  <tr
                    key={staff.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      !isActive ? 'bg-rose-950/10 opacity-70' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">{staff.id}</td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-200">
                        {staff.venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                      </span>
                      <div className="text-[10px] text-cyan-400 font-medium">
                        {staff.division}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-bold text-white">{staff.name}</td>
                    <td className="py-3 px-3 text-slate-300">{staff.role}</td>

                    {/* Assigned PIN */}
                    <td className="py-3 px-3">
                      <div className="inline-flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 font-mono">
                        <Key className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-amber-300 tracking-wider">
                          {pinRevealed ? staff.pin : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setShowPins((prev) => ({ ...prev, [staff.id]: !prev[staff.id] }))
                          }
                          className="text-slate-400 hover:text-white ml-1"
                        >
                          {pinRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Suspended</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Shift Pattern */}
                    <td className="py-3 px-3 text-[11px] font-mono">
                      <span className="text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-md font-bold">
                        Auto-Detect (Fleksibel)
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setPinModalStaff(staff);
                          setResetPinValue('');
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition"
                      >
                        Reset PIN
                      </button>

                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition ${
                          isActive
                            ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
                            : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
                        }`}
                      >
                        {isActive ? 'Suspend' : 'Activate'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateStaff}>
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Tambah Karyawan Baru</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Outlet Venue Selection */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Outlet / Lokasi</label>
                  <select
                    value={newVenue}
                    onChange={(e) => handleVenueChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LuckyCat">LuckyCat (LC)</option>
                    <option value="JP Karaoke">JP Karaoke</option>
                  </select>
                </div>

                {/* Division & Role Selection */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Divisi & Posisi Kerja</label>
                  <select
                    value={selectedRoleOption}
                    onChange={(e) => setSelectedRoleOption(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
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
                  <label className="text-slate-300 font-semibold block mb-1">Nama Karyawan</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Iwan"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Template Shift Info Card (Auto Inherited) */}
                {currentTemplate && (
                  <div className="p-3.5 bg-indigo-950/30 border border-indigo-700/40 rounded-2xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-indigo-400 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Template Jam Kerja Otomatis:</span>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 font-medium">
                      {currentTemplate.description}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ✓ Jam shift terikat otomatis sesuai template divisi. Anda tidak perlu memasukkan jam manual.
                    </div>
                  </div>
                )}

                {/* PIN */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-semibold">PIN Karyawan (4-Digit)</label>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono text-base font-bold tracking-widest focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Initial Status */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Status Karyawan</span>
                    <span className="text-[10px] text-slate-400">
                      {newStatus ? 'Aktif (Karyawan langsung bisa login via PIN)' : 'Nonaktif / Suspended'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newStatus}
                    onChange={(e) => setNewStatus(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleSaveResetPin}>
              <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Reset Staff PIN</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPinModalStaff(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3 text-xs">
                <p className="text-slate-300">
                  Assign a new 4-digit PIN for <strong>{pinModalStaff.name}</strong> ({pinModalStaff.id}):
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={resetPinValue}
                    onChange={(e) => setResetPinValue(e.target.value)}
                    placeholder="New 4-digit PIN"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setResetPinValue(Math.floor(1000 + Math.random() * 9000).toString());
                    }}
                    className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-[11px]"
                  >
                    Random
                  </button>
                </div>
              </div>

              <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPinModalStaff(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinSubmitting || resetPinValue.length < 4}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md"
                >
                  {pinSubmitting ? 'Updating...' : 'Save New PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
