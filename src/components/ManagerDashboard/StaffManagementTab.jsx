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
  const [newVenue, setNewVenue] = useState('JP Karaoke');
  const [newDivision, setNewDivision] = useState('Server and Cashier');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Cashier');
  const [newPin, setNewPin] = useState('');
  const [newStatus, setNewStatus] = useState(true);
  const [newShiftStart, setNewShiftStart] = useState('13:00');
  const [newShiftEnd, setNewShiftEnd] = useState('22:00');
  const [newHours, setNewHours] = useState(9);
  const [submitting, setSubmitting] = useState(false);

  // Reset PIN modal state
  const [pinModalStaff, setPinModalStaff] = useState(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const [showPins, setShowPins] = useState({});

  const divisionsByVenue = {
    'JP Karaoke': [
      'Server and Cashier',
      'Cleaning Service',
      'Storage Staff'
    ],
    'LuckyCat': [
      'Bar, Cashier, and Server',
      'Kitchen'
    ]
  };

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

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(randomPin);
  };

  const handleVenueChange = (venue) => {
    setNewVenue(venue);
    const divs = divisionsByVenue[venue] || [];
    if (divs.length > 0) {
      setNewDivision(divs[0]);
      if (venue === 'JP Karaoke') {
        setNewShiftStart('13:00');
        setNewShiftEnd('22:00');
      } else {
        setNewShiftStart('10:00');
        setNewShiftEnd('19:00');
      }
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newName || !newRole) return;
    setSubmitting(true);

    try {
      await createStaff({
        name: newName,
        venue: newVenue,
        division: newDivision,
        role: newRole,
        department: newDivision,
        pin: newPin || Math.floor(1000 + Math.random() * 9000).toString(),
        is_active: newStatus ? 1 : 0,
        shift_start: newShiftStart,
        shift_end: newShiftEnd,
        standard_hours: newHours
      });

      setModalOpen(false);
      setNewName('');
      setNewRole('');
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
          onClick={() => {
            handleGeneratePin();
            setModalOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Staff</span>
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

      {/* Modal: Add New Staff */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateStaff}>
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Provision New Staff Member</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                {/* Outlet Venue Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Outlet / Venue</label>
                    <select
                      value={newVenue}
                      onChange={(e) => handleVenueChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="JP Karaoke">JP Karaoke</option>
                      <option value="LuckyCat">LuckyCat</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Division</label>
                    <select
                      value={newDivision}
                      onChange={(e) => setNewDivision(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {(divisionsByVenue[newVenue] || []).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Name & Role */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Ketut Budiarta"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Role</label>
                    <input
                      type="text"
                      required
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      placeholder="e.g. Server"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* PIN */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-semibold">Assigned 4-Digit PIN</label>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="4-digit PIN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Shift Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Shift Start</label>
                    <input
                      type="time"
                      value={newShiftStart}
                      onChange={(e) => setNewShiftStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Shift End</label>
                    <input
                      type="text"
                      value={newShiftEnd}
                      onChange={(e) => setNewShiftEnd(e.target.value)}
                      placeholder="e.g. 22:00 or 03:00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Initial Status */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Initial Status</span>
                    <span className="text-[10px] text-slate-400">
                      {newStatus ? 'Active (Staff can immediately log in)' : 'Suspended'}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20"
                >
                  {submitting ? 'Creating...' : 'Provision Staff'}
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
