import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Key,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  UserCheck,
  Building2,
  Trash2,
  Calendar,
  Award,
  Clock,
  AlertCircle,
  FileText,
  Plus,
  Minus,
  History,
  Info
} from 'lucide-react';
import {
  getAdminStaffList,
  createStaff,
  resetStaffPin,
  toggleStaffStatus,
  deleteStaff,
  getStaffAuditTrail,
  saveStaffDayAdjustment,
  getStaffAttendanceHistory,
  deleteStaffPoint,
  getPoints
} from '../../utils/api';
import { showToast } from '../Common/Toast';
import { formatWitaDateTime } from '../../utils/time';

export default function StaffManagementTab({ onStaffUpdated, adminAuth }) {
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

  // Staff Detail & Adjustment Modal State
  const [detailModalStaff, setDetailModalStaff] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAttendance, setDetailAttendance] = useState(null);
  const [detailAuditLogs, setDetailAuditLogs] = useState([]);
  const [detailPoints, setDetailPoints] = useState([]);
  const [adjDays, setAdjDays] = useState(1);
  const [adjReason, setAdjReason] = useState('');
  const [adjPin, setAdjPin] = useState(adminAuth?.pin || '');
  const [adjSubmitting, setAdjSubmitting] = useState(false);
  const [adjError, setAdjError] = useState(null);
  const [adjSuccess, setAdjSuccess] = useState(null);

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

  const openStaffDetailModal = async (staff) => {
    setDetailModalStaff(staff);
    setDetailLoading(true);
    setAdjDays(1);
    setAdjReason('');
    setAdjPin(adminAuth?.pin || '');
    setAdjError(null);
    setAdjSuccess(null);
    try {
      const [histData, auditData, pointsData] = await Promise.all([
        getStaffAttendanceHistory(staff.id, 'CURRENT_MONTH').catch(() => null),
        getStaffAuditTrail(staff.id).catch(() => []),
        getPoints({ staffId: staff.id }).catch(() => ({ points: [] }))
      ]);
      setDetailAttendance(histData);
      setDetailAuditLogs(Array.isArray(auditData) ? auditData : []);
      setDetailPoints(pointsData?.points || []);
    } catch (err) {
      console.error('Failed to load staff details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveDayAdjustment = async (e) => {
    e.preventDefault();
    if (!detailModalStaff || adjSubmitting) return;
    const effectivePin = (adjPin || adminAuth?.pin || '').trim();
    if (!effectivePin) {
      setAdjError('PIN Otorisasi Manajer wajib diisi.');
      return;
    }
    if (!adjReason.trim()) {
      setAdjError('Alasan penyesuaian hari kerja wajib diisi.');
      return;
    }
    setAdjSubmitting(true);
    setAdjError(null);
    setAdjSuccess(null);
    try {
      await saveStaffDayAdjustment({
        pin: effectivePin,
        staffId: detailModalStaff.id,
        staffName: detailModalStaff.name,
        adjustmentDays: Number(adjDays),
        reason: adjReason.trim()
      });
      setAdjSuccess(`Berhasil menyimpan penyesuaian hari kerja (${Number(adjDays) > 0 ? '+' : ''}${adjDays} hari).`);
      setAdjReason('');
      const [histData, auditData] = await Promise.all([
        getStaffAttendanceHistory(detailModalStaff.id, 'CURRENT_MONTH').catch(() => null),
        getStaffAuditTrail(detailModalStaff.id).catch(() => [])
      ]);
      setDetailAttendance(histData);
      setDetailAuditLogs(Array.isArray(auditData) ? auditData : []);
      if (onStaffUpdated) onStaffUpdated();
    } catch (err) {
      setAdjError(err.message || 'Gagal menyimpan penyesuaian.');
    } finally {
      setAdjSubmitting(false);
    }
  };

  const handleDeleteStaffPointItem = async (pointId) => {
    const effectivePin = (adjPin || adminAuth?.pin || '').trim();
    if (!effectivePin) {
      showToast('Silakan masukkan PIN Otorisasi pada form di atas untuk konfirmasi.', 'error');
      return;
    }
    if (!window.confirm('Hapus catatan poin ini? Tindakan ini akan dicatat dalam audit trail staf.')) return;
    try {
      await deleteStaffPoint(pointId, effectivePin);
      showToast('Catatan poin berhasil dihapus.', 'success');
      const [histData, auditData, pointsData] = await Promise.all([
        getStaffAttendanceHistory(detailModalStaff.id, 'CURRENT_MONTH').catch(() => null),
        getStaffAuditTrail(detailModalStaff.id).catch(() => []),
        getPoints({ staffId: detailModalStaff.id }).catch(() => ({ points: [] }))
      ]);
      setDetailAttendance(histData);
      setDetailAuditLogs(Array.isArray(auditData) ? auditData : []);
      setDetailPoints(pointsData?.points || []);
      if (onStaffUpdated) onStaffUpdated();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus poin.', 'error');
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
    <div className="space-y-6 animate-fade-in text-slate-200">
      {/* Top Banner Card */}
      <div className="bg-[#161b24] rounded-3xl p-5 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Staff &amp; PIN Management
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-100 mt-1">
            Pengaturan Karyawan &amp; Hak Akses PIN
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-bold">
            Manajemen staf terpusat JP Karaoke &amp; LuckyCat Billiard. Data tersimpan permanen di cloud.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-600/30 transition shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Tambah Karyawan Baru</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, role, atau ID staff..."
              className="w-full bg-[#12161f] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            className="bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-black focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Outlet</option>
            <option value="JP Karaoke">JP Karaoke</option>
            <option value="LuckyCat">LuckyCat</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-bold flex items-center space-x-2">
          <span>Total: <strong className="text-slate-100 font-black">{filteredStaff.length}</strong> staff</span>
          <span>•</span>
          <span className="text-emerald-400 font-black">
            {filteredStaff.filter((s) => s.is_active === 1).length} aktif
          </span>
          <button
            onClick={loadRoster}
            disabled={loading}
            className="p-1.5 rounded-lg bg-[#1c2230] hover:bg-[#252d3d] text-slate-300 border border-slate-700 transition ml-2 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-[#161b24] border border-slate-800 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#12161f] text-slate-300 uppercase text-[10px] tracking-wider font-black border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800 font-medium">
              {filteredStaff.map((staff) => {
                const isActive = staff.is_active === 1;
                const pinRevealed = showPins[staff.id];

                return (
                  <tr
                    key={staff.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      !isActive ? 'bg-rose-500/5 opacity-75' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">{staff.id}</td>

                    <td className="py-3 px-3">
                      <span className="font-black text-slate-100 block">
                        {staff.venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                      </span>
                      <div className="text-[11px] text-blue-400 font-bold">
                        {staff.division}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-black text-slate-100 text-sm">{staff.name}</td>
                    <td className="py-3 px-3 text-slate-300 font-bold">{staff.role}</td>

                    {/* Assigned PIN */}
                    <td className="py-3 px-3">
                      <div className="inline-flex items-center space-x-1.5 bg-[#12161f] px-2.5 py-1 rounded-xl border border-slate-700 font-mono">
                        <Key className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
                        <span className="font-black text-slate-100 tracking-wider">
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
                        onClick={() => openStaffDetailModal(staff)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black shadow-md shadow-blue-600/30 transition inline-flex items-center space-x-1"
                        title="Lihat Detail, Riwayat & Sesuaikan Hari Kerja"
                      >
                        <History className="w-3 h-3" />
                        <span>Detail & Koreksi</span>
                      </button>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-slate-200">
          <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateStaff}>
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#12161f] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-base font-black text-slate-100">Tambah Karyawan Baru</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Outlet Venue Selection */}
                <div>
                  <label className="text-slate-300 font-black block mb-1">Outlet / Lokasi</label>
                  <select
                    value={newVenue}
                    onChange={(e) => handleVenueChange(e.target.value)}
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="LuckyCat">LuckyCat (LC)</option>
                    <option value="JP Karaoke">JP Karaoke</option>
                  </select>
                </div>

                {/* Division & Role Selection */}
                <div>
                  <label className="text-slate-300 font-black block mb-1">Divisi &amp; Posisi Kerja</label>
                  <select
                    value={selectedRoleOption}
                    onChange={(e) => setSelectedRoleOption(e.target.value)}
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
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
                  <label className="text-slate-300 font-black block mb-1">Nama Karyawan</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Iwan"
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder:text-slate-500 text-sm font-black focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Template Shift Info Card (Auto Inherited) */}
                {currentTemplate && (
                  <div className="p-3.5 bg-[#1c2230] border border-blue-500/30 rounded-2xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-blue-300 font-black text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
                      <span>Template Jam Kerja Terikat:</span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 font-black">
                      {currentTemplate.description}
                    </div>
                    <div className="text-[11px] text-slate-400 font-bold">
                      ✓ Jam shift terikat otomatis sesuai template divisi. Anda tidak perlu memasukkan jam manual.
                    </div>
                  </div>
                )}

                {/* PIN */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-black">PIN Karyawan (4-Digit)</label>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-bold cursor-pointer"
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
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-blue-400 font-mono text-lg font-black tracking-widest focus:outline-none focus:border-blue-500 text-center"
                  />
                </div>

                {/* Initial Status */}
                <div className="p-3 bg-[#1c2230] rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-100 block">Status Karyawan</span>
                    <span className="text-[11px] text-slate-400 font-bold">
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

              <div className="p-4 border-t border-slate-800 bg-[#12161f] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#1c2230] hover:bg-[#252d3d] text-slate-300 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-slate-200">
          <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleSaveResetPin}>
              <div className="p-4 border-b border-slate-800 bg-[#12161f] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                    <Key className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-100">Reset PIN Staff</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPinModalStaff(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <p className="text-slate-300 font-bold">
                  Masukkan 4 digit PIN baru untuk <strong className="text-white">{pinModalStaff.name}</strong> ({pinModalStaff.id}):
                </p>

                <div>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={resetPinValue}
                    onChange={(e) => setResetPinValue(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-xl font-black text-center tracking-widest focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-[#12161f] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPinModalStaff(null)}
                  className="px-4 py-2 bg-[#1c2230] hover:bg-[#252d3d] text-slate-300 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pinSubmitting || resetPinValue.length < 4}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {pinSubmitting ? 'Menyimpan...' : 'Perbarui PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Staff Detail & Manager Correction */}
      {detailModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-slate-200">
          <div className="bg-[#161b24] border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#12161f] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md overflow-hidden">
                  {detailModalStaff.photo_url ? (
                    <img src={detailModalStaff.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    detailModalStaff.name?.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-black text-white">{detailModalStaff.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                      PIN: {detailModalStaff.pin}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold">
                    {detailModalStaff.venue} • {detailModalStaff.role} ({detailModalStaff.division})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalStaff(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {detailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2 text-blue-500" />
                  <span className="font-bold">Memuat data detail staf...</span>
                </div>
              ) : (
                <>
                  {/* Attendance & Performance Summary Cards */}
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>Rekap Kehadiran Bulan Berjalan (Target 26 Hari)</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-[#12161f] border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Hari Kerja Aktual</span>
                        <span className="text-lg font-black text-blue-400">
                          {detailAttendance?.summary?.actualWorkDays ?? detailAttendance?.summary?.workDays ?? 0} Hari
                        </span>
                      </div>
                      <div className="p-3 bg-[#12161f] border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Penyesuaian Manajer</span>
                        <span className={`text-lg font-black ${
                          (detailAttendance?.summary?.manualDaysSum || 0) > 0
                            ? 'text-emerald-400'
                            : (detailAttendance?.summary?.manualDaysSum || 0) < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}>
                          {(detailAttendance?.summary?.manualDaysSum || 0) > 0 ? '+' : ''}
                          {detailAttendance?.summary?.manualDaysSum || 0} Hari
                        </span>
                      </div>
                      <div className="p-3 bg-[#12161f] border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Total Hari Final</span>
                        <span className="text-lg font-black text-emerald-400">
                          {detailAttendance?.summary?.workDays || 0} / 26
                        </span>
                      </div>
                      <div className="p-3 bg-[#12161f] border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Total Telat</span>
                        <span className="text-lg font-black text-amber-400">
                          {detailAttendance?.summary?.totalLateCount || 0}x
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form: Add or Deduct Working Days */}
                  <div className="p-4 bg-gradient-to-br from-[#1a202c] to-[#12161f] border border-slate-700/80 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-2 text-white">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-black">⚡ Koreksi / Penyesuaian Hari Kerja (Otorisasi Manajer)</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                      Gunakan fitur ini untuk menambah bonus hari kerja (misal: lembur/bantuan shift) atau memotong hari kerja. Nilai ini akan dihitung pada akumulasi hari kerja (maks 26) dan dicatat transparan di dashboard staf.
                    </p>

                    {adjError && (
                      <div className="p-2.5 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-bold flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{adjError}</span>
                      </div>
                    )}

                    {adjSuccess && (
                      <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{adjSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveDayAdjustment} className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            Nilai Penyesuaian Hari (+ / -):
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="1"
                              value={adjDays}
                              onChange={(e) => setAdjDays(e.target.value)}
                              required
                              className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-black text-sm focus:outline-none focus:border-blue-500"
                            />
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => setAdjDays(1)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-black border ${Number(adjDays) === 1 ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdjDays(-1)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-black border ${Number(adjDays) === -1 ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                              >
                                -1
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-300 mb-1">
                            PIN Otorisasi Manajer:
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={8}
                            value={adjPin}
                            onChange={(e) => setAdjPin(e.target.value)}
                            placeholder="Masukkan PIN Manager..."
                            required
                            className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono tracking-widest text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-300 mb-1">
                          Alasan Penyesuaian (Wajib Diisi):
                        </label>
                        <input
                          type="text"
                          value={adjReason}
                          onChange={(e) => setAdjReason(e.target.value)}
                          placeholder="Contoh: Bantuan operasional event / Koreksi lupa absensi"
                          required
                          className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={adjSubmitting || !adjPin.trim() || !adjReason.trim()}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                        >
                          {adjSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Terapkan Penyesuaian Hari</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Violation / Disciplinary Points Management */}
                  {detailPoints && detailPoints.length > 0 && (
                    <div className="p-4 bg-[#12161f] border border-slate-800 rounded-2xl space-y-3">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>Daftar Catatan Poin ({detailPoints.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-500 lowercase">bisa dihapus langsung oleh manajer</span>
                      </h4>
                      <div className="space-y-2">
                        {detailPoints.map((pt) => (
                          <div key={pt.id} className="p-2.5 bg-[#161b24] border border-slate-800 rounded-xl flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black ${
                                  Number(pt.points) > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {Number(pt.points) > 0 ? `+${pt.points}` : pt.points} Poin
                                </span>
                                <span className="font-black text-white text-xs">{pt.reason || pt.type}</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                {formatWitaDateTime(pt.created_at)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaffPointItem(pt.id)}
                              className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 hover:text-white rounded-lg text-[10px] font-black transition flex items-center space-x-1 cursor-pointer"
                              title="Hapus Catatan Poin"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus Poin</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audit Trail List (Logged changes for transparency) */}
                  <div className="p-4 bg-[#12161f] border border-slate-800 rounded-2xl space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Log Transparansi Audit Manajer ({detailAuditLogs.length})</span>
                    </h4>
                    {detailAuditLogs.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-2">
                        Belum ada riwayat penyesuaian/penghapusan dari manajer untuk staf ini.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {detailAuditLogs.map((log) => (
                          <div key={log.id} className="p-2.5 bg-[#161b24] border border-slate-800 rounded-xl text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-slate-400 text-[10px]">
                              <span className="font-mono">{formatWitaDateTime(log.created_at)}</span>
                              <span className="font-black text-slate-300">{log.actor || 'Manajer'}</span>
                            </div>
                            <p className="text-white font-bold">{log.description}</p>
                            {log.reason && (
                              <p className="text-slate-400 italic text-[10px]">
                                Alasan: "{log.reason}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#12161f] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailModalStaff(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
