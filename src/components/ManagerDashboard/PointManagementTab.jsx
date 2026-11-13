import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ExcelJS from 'exceljs';
import {
  AlertTriangle,
  Award,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Image,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { getPoints, getStaffList, createStaffPoint, deleteStaffPoint, subscribeRealtimeEvents } from '../../utils/api';
import { formatWitaDateTime, getPointCycleInfo } from '../../utils/time';
import { showToast } from '../Common/Toast';

export default function PointManagementTab({ adminAuth, isReadOnly = false, onPointsUpdated }) {
  const [staffList, setStaffList] = useState([]);
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sub-tab: 'RECAP' | 'LOG'
  const [subTab, setSubTab] = useState('RECAP');

  // Shared Filters
  const [selectedCycleKey, setSelectedCycleKey] = useState('CURRENT');
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [onlyWithPoints, setOnlyWithPoints] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'ACKNOWLEDGED'

  // Give Point Form State
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [formVenueFilter, setFormVenueFilter] = useState('ALL');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [pointAmount, setPointAmount] = useState('');
  const [reason, setReason] = useState('');
  const [proofPhoto, setProofPhoto] = useState(null);
  const [proofPhotoPreview, setProofPhotoPreview] = useState(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);
  const fileInputRef = useRef(null);
  const [pinInput, setPinInput] = useState(adminAuth?.pin || '');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal (strictly Operational Manager)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePin, setDeletePin] = useState(adminAuth?.pin || '');
  const [deleting, setDeleting] = useState(false);

  const [exporting, setExporting] = useState(false);

  const handleProofPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File yang dipilih harus berupa gambar/foto.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => showToast('Gagal membaca file gambar.', 'error');
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => showToast('Gambar tidak valid.', 'error');
      img.onload = () => {
        const maxSize = 1024;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          showToast('Browser tidak mendukung canvas.', 'error');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProofPhoto(dataUrl);
        setProofPhotoPreview(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (adminAuth?.pin && !pinInput) {
      setPinInput(adminAuth.pin);
    }
    if (adminAuth?.pin && !deletePin) {
      setDeletePin(adminAuth.pin);
    }
  }, [adminAuth?.pin]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [ptsRes, staffRes] = await Promise.all([
        getPoints({ cycleKey: selectedCycleKey, status: 'ALL' }),
        getStaffList('ALL')
      ]);
      setPointsData(ptsRes);
      setStaffList(Array.isArray(staffRes) ? staffRes : []);
    } catch (err) {
      console.error('Failed to load point management data:', err);
      if (!isSilent) showToast('Gagal memuat data poin: ' + (err.message || 'Error'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCycleKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((eventType) => {
      if (eventType === 'POINT_UPDATE' || eventType === 'STAFF_UPDATE') {
        loadData(true);
        if (eventType === 'POINT_UPDATE' && onPointsUpdated) onPointsUpdated();
      }
    });
    return () => unsubscribe();
  }, [loadData, onPointsUpdated]);

  const currentCycle = pointsData?.currentCycle || getPointCycleInfo();
  const activeCycleInfo = pointsData?.selectedCycle || currentCycle;
  const availableCycles = pointsData?.availableCycles || [currentCycle];
  const allPoints = pointsData?.points || [];
  const staffTotals = pointsData?.staffTotals || [];

  // Selectable staff in the form (exclude Management if desired? Keep non-management first or all active staff cleanly searchable)
  const selectableStaff = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase();
    return staffList
      .filter((s) => {
        if (formVenueFilter !== 'ALL' && s.venue !== formVenueFilter) return false;
        if (!q) return true;
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.division && s.division.toLowerCase().includes(q)) ||
          (s.role && s.role.toLowerCase().includes(q)) ||
          (s.venue && s.venue.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [staffList, staffSearchQuery, formVenueFilter]);

  const selectedStaffObjs = useMemo(
    () =>
      selectedStaffIds
        .map((id) => staffList.find((s) => String(s.id) === String(id) || String(s.uuid) === String(id)))
        .filter(Boolean),
    [staffList, selectedStaffIds]
  );

  const toggleStaffSelection = (staffId) => {
    const targetId = String(staffId);
    setSelectedStaffIds((prev) =>
      prev.some((id) => String(id) === targetId)
        ? prev.filter((id) => String(id) !== targetId)
        : [...prev, staffId]
    );
  };

  const selectAllFilteredStaff = () => {
    setSelectedStaffIds((prev) => {
      const next = [...prev];
      const existing = new Set(prev.map((id) => String(id)));
      selectableStaff.forEach((s) => {
        if (!existing.has(String(s.id))) {
          existing.add(String(s.id));
          next.push(s.id);
        }
      });
      return next;
    });
  };

  const clearSelectedStaff = () => {
    setSelectedStaffIds([]);
  };

  // KPI metrics for selected period
  const stats = useMemo(() => {
    const totalPoints = allPoints.reduce((sum, p) => sum + Number(p.points || 0), 0);
    const totalEntries = allPoints.length;
    const acknowledged = allPoints.filter((p) => p.status === 'ACKNOWLEDGED').length;
    const pending = totalEntries - acknowledged;
    return {
      totalPoints: Math.round(totalPoints * 100) / 100,
      totalEntries,
      acknowledged,
      pending
    };
  }, [allPoints]);

  // Filtered staff recap table
  const filteredRecap = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffTotals.filter((row) => {
      if (venueFilter !== 'ALL' && row.staff_venue !== venueFilter) return false;
      if (onlyWithPoints && Number(row.total_points || 0) === 0 && Number(row.violation_count || 0) === 0) return false;
      if (q) {
        return (
          (row.staff_name && row.staff_name.toLowerCase().includes(q)) ||
          (row.staff_division && row.staff_division.toLowerCase().includes(q)) ||
          (row.staff_role && row.staff_role.toLowerCase().includes(q)) ||
          (row.staff_venue && row.staff_venue.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [staffTotals, venueFilter, onlyWithPoints, search]);

  // Filtered violation log table
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPoints.filter((p) => {
      if (venueFilter !== 'ALL' && p.staff_venue !== venueFilter) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q) {
        return (
          (p.staff_name && p.staff_name.toLowerCase().includes(q)) ||
          (p.reason && p.reason.toLowerCase().includes(q)) ||
          (p.given_by && p.given_by.toLowerCase().includes(q)) ||
          (p.staff_division && p.staff_division.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allPoints, venueFilter, statusFilter, search]);

  const handleSubmitPoint = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const effectivePin = (adminAuth?.pin || pinInput || '').trim();
    if (!effectivePin) {
      showToast('Masukkan PIN otorisasi Operational Manager / Assistant Manager terlebih dahulu.', 'error');
      return;
    }
    if (selectedStaffIds.length === 0) {
      showToast('Pilih minimal 1 nama staff yang akan diberikan poin.', 'error');
      return;
    }
    const numPts = Number(pointAmount);
    if (!Number.isFinite(numPts) || numPts === 0) {
      showToast('Masukkan jumlah poin berupa angka yang valid (tidak boleh 0).', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Alasan pemberian poin wajib diisi.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createStaffPoint({
        pin: effectivePin,
        staffIds: selectedStaffIds,
        points: numPts,
        reason: reason.trim(),
        proofPhotoBase64: proofPhoto || null
      });
      showToast(res.message || 'Poin pelanggaran berhasil diberikan & notifikasi dikirim.', 'success');
      setSelectedStaffIds([]);
      setStaffSearchQuery('');
      setPointAmount('');
      setReason('');
      setProofPhoto(null);
      setProofPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData(true);
      if (onPointsUpdated) onPointsUpdated();
    } catch (err) {
      showToast(err.message || 'Gagal memberikan poin.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deleteTarget || deleting) return;
    const effectivePin = (adminAuth?.pin || deletePin || '').trim();
    if (!effectivePin) {
      showToast('PIN Operational Manager wajib diisi untuk menghapus catatan poin.', 'error');
      return;
    }

    setDeleting(true);
    try {
      await deleteStaffPoint(deleteTarget.id, effectivePin);
      showToast('Catatan poin berhasil dihapus.', 'success');
      setDeleteTarget(null);
      await loadData(true);
      if (onPointsUpdated) onPointsUpdated();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus catatan poin.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'JP & LuckyCat Attendance System';

      // Sheet 1: Rekap Cut-Off Per Staff
      const wsRecap = workbook.addWorksheet('Rekap Poin Cut-Off');
      wsRecap.addRow([
        `REKAP AKUMULASI POIN PELANGGARAN STAFF — PERIODE: ${selectedCycleKey === 'ALL' ? 'SEMUA PERIODE' : activeCycleInfo.label}`
      ]);
      wsRecap.addRow([`Dicetak oleh: ${adminAuth?.staffName || 'Management'} • ${formatWitaDateTime(new Date().toISOString())}`]);
      wsRecap.addRow([]);
      wsRecap.addRow([
        'No',
        'Nama Staff',
        'Outlet',
        'Divisi / Role',
        'Jumlah Pelanggaran',
        'Total Poin Akumulasi',
        'Sudah Disetujui Staff',
        'Belum Disetujui Staff'
      ]);

      const headerRow = wsRecap.getRow(4);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

      filteredRecap.forEach((row, idx) => {
        wsRecap.addRow([
          idx + 1,
          row.staff_name,
          row.staff_venue,
          row.staff_division || row.staff_role,
          row.violation_count,
          row.total_points,
          row.acknowledged_count,
          row.pending_count
        ]);
      });

      wsRecap.columns.forEach((col, idx) => {
        col.width = idx === 1 ? 26 : idx === 3 ? 24 : 18;
      });

      // Sheet 2: Log Riwayat Detail
      const wsLog = workbook.addWorksheet('Log Riwayat Poin');
      wsLog.addRow([
        'No',
        'Tanggal & Waktu (WITA)',
        'Periode Cut-Off',
        'Nama Staff',
        'Outlet',
        'Divisi',
        'Jumlah Poin',
        'Alasan Pelanggaran',
        'Diberikan Oleh',
        'Status Konfirmasi Staff',
        'Waktu Disetujui Staff (WITA)'
      ]);
      const logHeader = wsLog.getRow(1);
      logHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      logHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

      filteredLogs.forEach((pt, idx) => {
        wsLog.addRow([
          idx + 1,
          formatWitaDateTime(pt.created_at),
          pt.cycle_label,
          pt.staff_name,
          pt.staff_venue,
          pt.staff_division,
          pt.points,
          pt.reason,
          pt.given_by,
          pt.status === 'ACKNOWLEDGED' ? 'Sudah Disetujui Staff' : 'Menunggu Persetujuan',
          pt.acknowledged_at ? formatWitaDateTime(pt.acknowledged_at) : '-'
        ]);
      });

      wsLog.columns.forEach((col, idx) => {
        col.width = idx === 7 ? 38 : idx === 1 || idx === 10 ? 24 : 18;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileSlug = selectedCycleKey === 'ALL' ? 'Semua_Periode' : activeCycleInfo.cycleKey;
      a.download = `Rekap_Poin_Staff_${fileSlug}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('File Excel Rekap Poin berhasil diunduh.', 'success');
    } catch (err) {
      showToast('Gagal mengekspor Excel: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const quickSelectStaff = (staffId) => {
    const targetId = String(staffId);
    setSelectedStaffIds((prev) =>
      prev.some((id) => String(id) === targetId) ? prev : [...prev, staffId]
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const issuerLabel = adminAuth?.role === 'MANAGER'
    ? 'Operational Manager'
    : `Assistant Manager${adminAuth?.staffName && adminAuth.staffName !== 'Assistant Manager' ? ` (${adminAuth.staffName})` : ''}`;

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      {/* Header Banner + Cutoff Period KPI */}
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Sistem Poin Pelanggaran Staff
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-500/30">
                  Akses: {issuerLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Siklus Reset Bulanan: <strong className="text-slate-200">Tanggal 17 s/d Tanggal 13 bulan berikutnya</strong> • Periode aktif: <strong className="text-amber-300">{currentCycle.label}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-[#1c2230] hover:bg-[#252d3f] border border-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{exporting ? 'Menyiapkan...' : 'Export Excel Cut-Off'}</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-[#12161f] border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Total Poin Periode Terpilih
            </span>
            <div className="text-2xl font-mono font-bold text-rose-400 mt-1">
              {stats.totalPoints} <span className="text-xs text-slate-400 font-sans">Poin</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#12161f] border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Total Catatan Pelanggaran
            </span>
            <div className="text-2xl font-mono font-bold text-white mt-1">
              {stats.totalEntries} <span className="text-xs text-slate-400 font-sans">Catatan</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#12161f] border border-emerald-500/25">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block">
              Sudah Disetujui Staff ✓
            </span>
            <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">
              {stats.acknowledged}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#12161f] border border-amber-500/25">
            <span className="text-[10px] font-bold uppercase text-amber-400 block">
              Menunggu "Saya Mengerti"
            </span>
            <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
              {stats.pending}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Give Point Form (OM & AM) */}
      <form
        onSubmit={handleSubmitPoint}
        className="bg-[#161b24] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Berikan Poin Pelanggaran Staff</h3>
              <p className="text-[11px] text-slate-400">
                Notifikasi langsung terkirim ke staff &amp; wajib disetujui dengan janji perbaikan saat login.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-xl self-start sm:self-auto">
            Dicatat sebagai: {issuerLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Staff Search & Selection (5 cols) */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 block">
                1. Cari &amp; Pilih Nama Staff (Multi-Select)
              </label>
              <div className="flex items-center gap-1.5">
                {selectableStaff.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllFilteredStaff}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded-lg bg-blue-950/40 border border-blue-500/20 cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                )}
                {selectedStaffIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelectedStaff}
                    className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                  >
                    Bersihkan ({selectedStaffIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder="Ketik nama staff..."
                  className="w-full bg-[#12161f] border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={formVenueFilter}
                onChange={(e) => setFormVenueFilter(e.target.value)}
                className="bg-[#12161f] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Outlet</option>
                <option value="JP Karaoke">JP Karaoke</option>
                <option value="LuckyCat">LuckyCat</option>
              </select>
            </div>

            {/* Staff List Box */}
            <div className="bg-[#12161f] border border-slate-800 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-800/70">
              {selectableStaff.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Tidak ada staff cocok dengan pencarian.
                </div>
              ) : (
                selectableStaff.map((s) => {
                  const isSelected = selectedStaffIds.some((id) => String(id) === String(s.id));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStaffSelection(s.id)}
                      className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/20 text-white border-l-4 border-l-blue-500'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-slate-600 bg-slate-900/80'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{s.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {s.venue} • {s.division || s.role}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shrink-0 ml-2">
                          Dipilih ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {selectedStaffObjs.length > 0 && (
              <div className="px-3 py-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold">
                    Target Terpilih: <span className="text-white">{selectedStaffObjs.length} Staff</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearSelectedStaff}
                    className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Hapus semua
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedStaffObjs.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-[11px] font-semibold text-white"
                    >
                      <span>{s.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleStaffSelection(s.id)}
                        className="text-blue-200 hover:text-white cursor-pointer"
                        title={`Hapus ${s.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Points & Reason (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5">
                2. Masukkan Jumlah Poin (Bebas Angka Berapapun)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={pointAmount}
                  onChange={(e) => setPointAmount(e.target.value)}
                  placeholder="Contoh: 10 atau 25 atau 100"
                  className="flex-1 bg-[#12161f] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 15, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPointAmount(String(preset))}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${
                        String(pointAmount) === String(preset)
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-[#12161f] hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              {Number(pointAmount) < 0 && (
                <p className="text-[11px] text-amber-300 mt-1">
                  Catatan: Angka negatif akan mengurangi akumulasi poin staff (koreksi/pengurangan poin).
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5">
                3. Alasan Pemberian Poin / Kesalahan
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Tidak memakai seragam lengkap / Terlambat tanpa konfirmasi / Kesalahan SOP kasir..."
                className="w-full bg-[#12161f] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Step 4: Optional Proof Photo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>4. Bukti Foto Pelanggaran (Opsional)</span>
                </label>
                {proofPhotoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setProofPhoto(null);
                      setProofPhotoPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                  >
                    Hapus Foto ✕
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProofPhotoChange}
                className="hidden"
              />

              {proofPhotoPreview ? (
                <div className="rounded-2xl border border-slate-700 bg-[#12161f] p-2.5 flex items-center space-x-3">
                  <img
                    src={proofPhotoPreview}
                    alt="Preview Bukti Foto"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-600 cursor-pointer shrink-0"
                    onClick={() => setPreviewPhotoModal(proofPhotoPreview)}
                    title="Klik untuk perbesar"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold text-emerald-300 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Foto bukti siap disertakan</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      Foto akan tersimpan & dapat dilihat oleh staff dan management.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 cursor-pointer shrink-0"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-[#12161f]/60 hover:bg-[#12161f] text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>Ambil Foto / Pilih Gambar Bukti Pelanggaran</span>
                </button>
              )}
            </div>

            {/* PIN Input only if not already cached in session */}
            {!adminAuth?.pin && (
              <div>
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>PIN Otorisasi OM / AM</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Masukkan PIN Operational Manager atau Assistant Manager"
                  className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={submitting || selectedStaffIds.length === 0 || !pointAmount || !reason.trim()}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Menyimpan & Mengirim...'
                    : selectedStaffIds.length > 1
                      ? `Berikan Poin ke ${selectedStaffIds.length} Staff & Kirim Notifikasi`
                      : 'Berikan Poin & Kirim Notifikasi'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* SECTION 2: Sub-tabs + Filters + Data Tables */}
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        {/* Sub-tab switcher & Period/Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex bg-[#12161f] p-1 rounded-2xl border border-slate-800 gap-1 self-start">
            <button
              type="button"
              onClick={() => setSubTab('RECAP')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
                subTab === 'RECAP'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Rekap Poin Per Staff ({filteredRecap.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('LOG')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
                subTab === 'LOG'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Log Riwayat &amp; Persetujuan ({filteredLogs.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <select
              value={selectedCycleKey}
              onChange={(e) => setSelectedCycleKey(e.target.value)}
              className="bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {availableCycles.map((c) => (
                <option key={c.cycleKey} value={c.cycleKey === currentCycle.cycleKey ? 'CURRENT' : c.cycleKey}>
                  {c.label}{c.cycleKey === currentCycle.cycleKey ? ' (Periode Aktif)' : ''}
                </option>
              ))}
              <option value="ALL">Semua Periode</option>
            </select>

            {/* Outlet Filter */}
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Outlet</option>
              <option value="JP Karaoke">JP Karaoke</option>
              <option value="LuckyCat">LuckyCat</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / alasan..."
                className="bg-[#12161f] border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-52"
              />
            </div>

            {subTab === 'RECAP' ? (
              <label className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#12161f] border border-slate-700 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyWithPoints}
                  onChange={(e) => setOnlyWithPoints(e.target.checked)}
                  className="accent-blue-500 rounded cursor-pointer"
                />
                <span>Hanya yang punya poin</span>
              </label>
            ) : (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Status Persetujuan</option>
                <option value="PENDING">Menunggu Konfirmasi Staff</option>
                <option value="ACKNOWLEDGED">Sudah Disetujui Staff</option>
              </select>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat data poin...</div>
        ) : subTab === 'RECAP' ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#12161f] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Staff</th>
                  <th className="py-3 px-3">Outlet &amp; Divisi</th>
                  <th className="py-3 px-3 text-center">Pelanggaran</th>
                  <th className="py-3 px-3 text-center">Total Poin Cut-Off</th>
                  <th className="py-3 px-3">Status Persetujuan</th>
                  <th className="py-3 px-4 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRecap.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Tidak ada data staff sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecap.map((row, idx) => (
                    <tr key={`${row.staff_id}-${idx}`} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-white">{row.staff_name}</td>
                      <td className="py-3 px-3 text-slate-400">
                        <span className="text-slate-200 font-semibold">{row.staff_venue}</span>
                        <span className="block text-[10px] text-slate-500">{row.staff_division}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                        {row.violation_count}x
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-xl font-mono font-bold text-xs ${
                          row.total_points > 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                            : row.total_points < 0
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {row.total_points} Poin
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {row.violation_count === 0 ? (
                          <span className="text-[11px] text-slate-500">-</span>
                        ) : row.pending_count === 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Semua Disetujui ({row.acknowledged_count})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>{row.pending_count} Belum Disetujui</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => quickSelectStaff(row.staff_id)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-bold transition cursor-pointer"
                        >
                          + Beri Poin
                        </button>
                        {row.violation_count > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearch(row.staff_name);
                              setSubTab('LOG');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition cursor-pointer"
                            title="Buka log riwayat poin staff ini untuk memeriksa atau menghapus poin"
                          >
                            Kelola Log →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#12161f] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Waktu (WITA)</th>
                  <th className="py-3 px-3">Staff</th>
                  <th className="py-3 px-3 text-center">Poin</th>
                  <th className="py-3 px-3">Alasan Pelanggaran</th>
                  <th className="py-3 px-3">Pemberi Poin</th>
                  <th className="py-3 px-3">Konfirmasi Staff</th>
                  {!isReadOnly && <th className="py-3 px-4 text-right">Hapus</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 6 : 7} className="py-10 text-center text-slate-500">
                      Belum ada riwayat pemberian poin pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((pt) => {
                    const isAck = pt.status === 'ACKNOWLEDGED';
                    return (
                      <tr key={pt.id} className="hover:bg-slate-800/30 transition align-top">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-slate-200 font-bold">
                            {formatWitaDateTime(pt.created_at)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{pt.cycle_label}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{pt.staff_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {pt.staff_venue} • {pt.staff_division}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-xl font-mono font-bold text-xs bg-rose-500/20 text-rose-300 border border-rose-500/35">
                            {pt.points > 0 ? `+${pt.points}` : pt.points} Poin
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs space-y-1.5">
                          <p className="text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                            {pt.reason}
                          </p>
                          {pt.proof_photo_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoModal(pt.proof_photo_url)}
                              className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-[10px] font-bold transition cursor-pointer"
                              title="Klik untuk melihat bukti foto pelanggaran"
                            >
                              <Camera className="w-3 h-3 text-blue-400" />
                              <span>Lihat Bukti Foto 📷</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-slate-200 font-semibold">{pt.given_by}</span>
                        </td>
                        <td className="py-3 px-3">
                          {isAck ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/35">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Sudah Disetujui Staff</span>
                              </span>
                              <div className="text-[10px] font-mono text-slate-400">
                                {formatWitaDateTime(pt.acknowledged_at)}
                              </div>
                              <div className="text-[10px] text-emerald-400/80 italic">
                                Menyetujui janji perbaikan ✓
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/35 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>Menunggu "Saya Mengerti"</span>
                            </span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(pt)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition cursor-pointer inline-flex items-center space-x-1.5 text-xs font-bold"
                              title="Hapus Catatan Poin (Operational Manager)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Operational Manager Only) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Hapus Catatan Poin Pelanggaran?</span>
              </h4>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#12161f] border border-slate-800 text-xs space-y-1.5">
              <div>Staff: <strong className="text-white">{deleteTarget.staff_name}</strong></div>
              <div>Poin: <strong className="text-rose-300 font-mono">{deleteTarget.points} Poin</strong></div>
              <div>Alasan: <span className="text-slate-300">{deleteTarget.reason}</span></div>
              {deleteTarget.proof_photo_url && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block mb-1">Bukti Foto:</span>
                  <img
                    src={deleteTarget.proof_photo_url}
                    alt="Bukti Foto"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700 cursor-pointer"
                    onClick={() => setPreviewPhotoModal(deleteTarget.proof_photo_url)}
                  />
                </div>
              )}
              <div className="text-[11px] text-amber-300/90 pt-1.5 border-t border-slate-800/80">
                Poin akan langsung dihapus dari akumulasi staff tanpa perlu persetujuan staff dan tanpa harus memberikan alasan.
              </div>
            </div>
            <form onSubmit={handleConfirmDelete} className="space-y-3">
              {!adminAuth?.pin && (
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    Masukkan PIN Operational Manager (8980)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value)}
                    placeholder="PIN Operational Manager"
                    className="w-full bg-[#12161f] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus Poin Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Photo Fullview Modal */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161b24] border border-slate-800 rounded-3xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Bukti Foto Pelanggaran</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-700 max-h-[70vh] flex items-center justify-center bg-black">
              <img
                src={previewPhotoModal}
                alt="Bukti Foto"
                className="w-full h-full object-contain max-h-[70vh]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
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
