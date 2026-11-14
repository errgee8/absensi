import React, { useState } from 'react';
import {
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Coffee,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { formatWitaTimeOnly, formatWitaDateOnly, formatDuration } from '../../utils/time';
import { resolveShift } from '../../utils/shiftResolver';

export default function ShiftTable({
  shifts = [],
  schedules = [],
  onInspectPhoto,
  onReviewLate,
  readersSet,
  hasActiveAnnouncement,
  density = 'compact'
}) {
  const [expandedRows, setExpandedRows] = useState({});
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('shift_view_mode');
      if (saved) return saved;
      return 'cards'; // Default to 'cards' so it immediately fits without horizontal scrolling
    } catch {
      return 'cards';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('shift_view_mode', mode);
    } catch {}
  };

  const toggleRow = (shiftId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [shiftId]: !prev[shiftId]
    }));
  };

  if (shifts.length === 0) {
    return (
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-12 text-center shadow-lg">
        <Clock className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-100">Tidak ada riwayat shift yang cocok dengan filter</h3>
        <p className="text-xs text-slate-400 font-bold mt-1">Coba ganti filter tanggal, shift, venue, atau divisi.</p>
      </div>
    );
  }

  // Detect actionable follow-ups for each staff/shift
  const getStaffActionItems = (shift) => {
    const actions = [];
    const flags = shift.flags || [];

    const isLateApproved = shift?.late_status === 'APPROVED' || flags.includes('FLAG_LATE_EXCUSED');
    const isLatePending = shift?.late_status === 'PENDING_REVIEW' || (flags.some(f => String(f).includes('Late Check-In')) && !shift?.late_status);

    if (isLatePending) {
      actions.push({
        type: 'LATE_REVIEW',
        label: 'Review Telat',
        severity: 'warning',
        description: 'Alasan & foto bukti keterlambatan menunggu persetujuan (ACC/Tolak) oleh manajer.'
      });
    }

    if (shift.face_recog_status === 'MISMATCH') {
      actions.push({
        type: 'FACE_MISMATCH',
        label: 'Wajah Beda',
        severity: 'danger',
        description: 'Sistem mendeteksi foto selfie masuk tidak cocok dengan biometrik referensi.'
      });
    }

    if (shift.break_status === 'ON_BREAK' && flags.some(f => String(f).includes('Break Exceeded'))) {
      actions.push({
        type: 'OVERDUE_BREAK',
        label: 'Break > 1 Jam',
        severity: 'warning',
        description: 'Durasi istirahat staf telah melebihi batas toleransi 60 menit.'
      });
    }

    if (hasActiveAnnouncement && !readersSet?.has(String(shift.staff_id))) {
      actions.push({
        type: 'UNREAD_ANNOUNCEMENT',
        label: 'Belum Baca',
        severity: 'info',
        description: 'Staf belum membaca pengumuman resmi dari management.'
      });
    }

    return actions;
  };

  const renderFlagBadges = (flags = [], shift = null) => {
    const isLateApproved = shift?.late_status === 'APPROVED' || flags?.includes('FLAG_LATE_EXCUSED');
    const isLatePending = shift?.late_status === 'PENDING_REVIEW' || (flags?.some(f => String(f).includes('Late Check-In')) && !shift?.late_status);
    const isLateRejected = shift?.late_status === 'REJECTED';

    const nonLateFlags = (flags || []).filter(f => {
      if (isLateApproved && (f === 'FLAG_LATE_EXCUSED' || String(f).includes('Late Check-In'))) return false;
      if ((isLatePending || isLateRejected) && String(f).includes('Late Check-In')) return false;
      return true;
    });

    if (nonLateFlags.length === 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle className="w-2.5 h-2.5 text-emerald-400 stroke-[2.5]" />
          <span>Clean</span>
        </span>
      );
    }

    const flagLabels = {
      FLAG_FACE_MISMATCH: { text: 'Wajah Tidak Cocok', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      'FLAG: Late Check-In (>10m Grace)': { text: 'Late (>10m Grace)', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_LATE_EXCUSED: { text: 'Late Di-ACC', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
      'FLAG: Unverified Network': { text: 'Unverified Network', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_UNVERIFIED_NETWORK: { text: 'Unverified Network', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      'FLAG: Break Exceeded 1 Hour': { text: 'Break > 1 Jam', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      'FLAG: Break Past Allowed Window': { text: 'Late Break Window', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      FLAG_MISSING_CHECKOUT: { text: 'Lupa Check-Out', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_EARLY_CHECKOUT: { text: 'Early Check-Out', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      FLAG_NETWORK_MISMATCH: { text: 'Network Mismatch', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
      FLAG_OFF_NETWORK: { text: 'Off-Network', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_OUTSIDE_GEOFENCE: { text: 'Di Luar Geofence', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
      'FLAG_GPS_IMPRECISE (Perkiraan BTS)': { text: 'Sinyal BTS (±Cellular)', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
    };

    return (
      <div className="flex flex-wrap gap-1">
        {nonLateFlags.map((f, idx) => {
          const conf = flagLabels[f] || {
            text: f.replace('FLAG_', '').replace('FLAG: ', ''),
            color: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          };
          return (
            <span
              key={idx}
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border ${conf.color}`}
            >
              <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>{conf.text}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const renderFaceRecogBadge = (shift) => {
    const status = shift.face_recog_status;
    const sim = shift.face_recog_similarity;

    if (status === 'MATCH') {
      return (
        <span
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          title={`Biometrik cocok: ${sim}% kemiripan`}
        >
          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400 stroke-[2.5]" />
          <span>Lolos {sim != null ? `(${sim}%)` : '✓'}</span>
        </span>
      );
    }

    if (status === 'MISMATCH') {
      return (
        <span
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30"
          title={`Catatan: Wajah selfie tidak cocok (${sim != null ? `${sim}%` : 'Rendah'})`}
        >
          <ShieldAlert className="w-2.5 h-2.5 text-rose-400 stroke-[2.5]" />
          <span>Beda Wajah {sim != null ? `(${sim}%)` : '✕'}</span>
        </span>
      );
    }

    if (status === 'NO_REFERENCE') {
      return (
        <span
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60"
          title="Staff belum mendaftarkan biometrik wajah resmi"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          <span>No Ref Wajah</span>
        </span>
      );
    }

    return null;
  };

  const renderLateReviewBadge = (shift) => {
    const flags = shift.flags || [];
    const isLateApproved = shift?.late_status === 'APPROVED' || flags.includes('FLAG_LATE_EXCUSED');
    const isLatePending = shift?.late_status === 'PENDING_REVIEW' || (flags.some(f => String(f).includes('Late Check-In')) && !shift?.late_status);
    const isLateRejected = shift?.late_status === 'REJECTED';
    const isLate = flags.some(f => String(f).includes('Late') || String(f).includes('LATE')) || shift.late_status;

    if (!isLate && !isLateApproved && !isLatePending && !isLateRejected) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-400 bg-slate-800/50 border border-slate-700/50">
          <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
          <span>Tepat Waktu</span>
        </span>
      );
    }

    if (isLateApproved) {
      return (
        <div className="flex flex-col items-start">
          <button
            type="button"
            onClick={() => onReviewLate?.(shift)}
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 transition cursor-pointer"
            title={shift?.late_reviewed_by ? `Di-ACC oleh ${shift.late_reviewed_by}. Klik untuk lihat/ubah.` : 'Di-ACC. Klik untuk detail.'}
          >
            <CheckCircle className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Di-ACC ✓</span>
          </button>
          {shift?.late_reviewed_by && (
            <span className="text-[8.5px] font-bold text-slate-400 truncate max-w-[90px]" title={shift.late_reviewed_by}>
              oleh {shift.late_reviewed_by}
            </span>
          )}
        </div>
      );
    }

    if (isLatePending) {
      return (
        <button
          type="button"
          onClick={() => onReviewLate?.(shift)}
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-black border bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border-amber-400 transition cursor-pointer shadow-sm animate-pulse"
          title="Klik untuk melihat alasan & foto bukti telat, lalu ACC / Tolak"
        >
          <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
          <span>Review ⏳</span>
        </button>
      );
    }

    if (isLateRejected) {
      return (
        <div className="flex flex-col items-start">
          <button
            type="button"
            onClick={() => onReviewLate?.(shift)}
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 transition cursor-pointer"
            title={shift?.late_reviewed_by ? `Ditolak oleh ${shift.late_reviewed_by}. Klik untuk lihat/ubah.` : 'Ditolak. Klik untuk detail.'}
          >
            <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Ditolak ✕</span>
          </button>
          {shift?.late_reviewed_by && (
            <span className="text-[8.5px] font-bold text-slate-400 truncate max-w-[90px]" title={shift.late_reviewed_by}>
              oleh {shift.late_reviewed_by}
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  // Reusable Expanded Content: 4 Rekap Cards (Poin, Hari Kerja, Telat, Aksi)
  const renderExpandedContent = (shift, actionItems) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black uppercase text-indigo-300 tracking-wider">
            Kartu Rekap Staff &amp; Panduan Tindakan:
          </span>
          <span className="text-xs font-bold text-white font-mono">
            {shift.staff_name} ({shift.staff_id})
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          Outlet: {shift.staff_venue} &bull; Divisi: {shift.staff_division || shift.staff_role}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Jumlah Point */}
        <div className="bg-[#181e2b] p-3.5 rounded-2xl border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Jumlah Poin</span>
            <Award className={`w-4 h-4 ${
              (shift.active_points_total || 0) > 0
                ? 'text-emerald-400'
                : (shift.active_points_total || 0) < 0
                ? 'text-rose-400'
                : 'text-slate-400'
            }`} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-2xl font-black font-mono ${
              (shift.active_points_total || 0) > 0
                ? 'text-emerald-400'
                : (shift.active_points_total || 0) < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}>
              {(shift.active_points_total || 0) > 0
                ? `+${shift.active_points_total}`
                : (shift.active_points_total || 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Total Poin</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">
            {(shift.active_points_total || 0) > 0
              ? 'Apresiasi & poin plus aktif staff.'
              : (shift.active_points_total || 0) < 0
              ? 'Akumulasi pengurangan poin sanksi berjalan.'
              : 'Staff tertib tanpa catatan poin.'}
          </p>
        </div>

        {/* Card 2: Hari Kerja Bulan Ini */}
        <div className="bg-[#181e2b] p-3.5 rounded-2xl border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Hari Kerja Bulan Ini</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black font-mono text-blue-300">
              {shift.monthly_work_days || 1}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Hari Kehadiran</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">
            Total shift kerja terdata pada bulan {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}.
          </p>
        </div>

        {/* Card 3: Total Keterlambatan */}
        <div className="bg-[#181e2b] p-3.5 rounded-2xl border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Keterlambatan</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-2xl font-black font-mono ${
              (shift.monthly_late_count || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {shift.monthly_late_count || 0}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Kali Telat</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">
            Akumulasi frekuensi check-in melebihi batas jadwal bulan ini.
          </p>
        </div>

        {/* Card 4: Aksi yang Harus Diambil */}
        <div className={`p-3.5 rounded-2xl border shadow-md flex flex-col justify-between ${
          actionItems.length > 0
            ? 'bg-amber-950/30 border-amber-500/40'
            : 'bg-emerald-950/20 border-emerald-500/30'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                actionItems.length > 0 ? 'text-amber-300' : 'text-emerald-300'
              }`}>
                Aksi yang Harus Diambil
              </span>
              <AlertCircle className={`w-4 h-4 ${
                actionItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`} />
            </div>

            {actionItems.length > 0 ? (
              <div className="space-y-1.5 mb-2">
                {actionItems.map((act, i) => (
                  <div key={i} className="text-[10px] text-slate-200 font-bold flex items-start space-x-1.5">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{act.label}: <span className="font-normal text-slate-300">{act.description}</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-300 font-medium leading-tight mb-2">
                ✓ Status Tertib — Tidak ada tindakan perbaikan yang diperlukan untuk shift ini.
              </p>
            )}
          </div>

          {/* Interactive Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {actionItems.some(a => a.type === 'LATE_REVIEW') && (
              <button
                type="button"
                onClick={() => onReviewLate?.(shift)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm transition cursor-pointer flex items-center space-x-1"
              >
                <Clock className="w-3 h-3" />
                <span>Review Alasan Telat ➔</span>
              </button>
            )}

            {shift.face_recog_status === 'MISMATCH' && (
              <button
                type="button"
                onClick={() => onInspectPhoto?.(shift, 'in')}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-black text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center space-x-1"
              >
                <Eye className="w-3 h-3" />
                <span>Periksa Foto Wajah ➔</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onInspectPhoto?.(shift, shift.checkout_photo ? 'out' : 'in')}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center space-x-1"
            >
              <Eye className="w-3 h-3" />
              <span>Buka Audit Lengkap ➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const isCompact = density === 'compact';
  const cellPy = isCompact ? 'py-2.5' : 'py-3.5';

  return (
    <div className="bg-[#161b24] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      
      {/* Top Toolbar: Record Count & View Switcher (Fit Cards vs Traditional Table) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#12161f] border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-black text-slate-200">
            Daftar Riwayat Shift
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-indigo-300 border border-slate-700">
            {shifts.length} Baris
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-[#181e2b] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleSetViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilan Kartu Fit Layar (Tanpa Perlu Scroll Kanan-Kiri)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kartu Fit (No Scroll)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilan Tabel Kolom Tradisional"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabel Kolom</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: FIT CARDS (100% Fit Width, Zero Horizontal Scroll) */}
      {viewMode === 'cards' ? (
        <div className="p-3 sm:p-4 space-y-3">
          {shifts.map((shift) => {
            const hasFlags = shift.flags && shift.flags.length > 0;
            const shiftInfo = resolveShift(shift, schedules);
            const isActive = !shift.checkout_time || shift.status === 'IN_PROGRESS' || shift.status === 'ON_DUTY' || shift.status === 'ON_BREAK';
            const actionItems = getStaffActionItems(shift);
            const isExpanded = Boolean(expandedRows[shift.id]);

            return (
              <div
                key={shift.id}
                className={`bg-[#181e2b] border rounded-2xl p-3.5 sm:p-4 space-y-3 transition shadow-md hover:border-slate-700 ${
                  hasFlags ? 'border-amber-500/30' : 'border-slate-800'
                } ${isExpanded ? 'ring-1 ring-indigo-500/40 bg-[#161b27]' : ''}`}
              >
                {/* 1. Top Header: Tanggal & Jadwal Shift */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-mono text-slate-100 font-bold text-xs">
                      {formatWitaDateOnly(shift.shift_date || shift.date || shift.checkin_time)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700">
                      {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black border ${shiftInfo.badgeClass}`}>
                      <span className="w-1.5 h-1.5 rounded-full mr-1 bg-current opacity-70"></span>
                      {shiftInfo.badgeLabel} ({shiftInfo.timeRange})
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Aktif Bertugas</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Staff Profile & Quick Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    {shift.staff_profile_photo_url ? (
                      <img
                        src={shift.staff_profile_photo_url}
                        alt={shift.staff_name}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-700 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-300 shrink-0">
                        {shift.staff_name ? shift.staff_name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                        <span className="font-black text-white text-sm truncate">{shift.staff_name}</span>
                        {shift.mood_emoji && (
                          <span
                            className="inline-flex items-center justify-center text-xs px-1 py-0.2 rounded bg-slate-800 border border-slate-700 shadow-xs shrink-0"
                            title={`Mood: ${shift.mood_emoji}`}
                          >
                            {shift.mood_emoji}
                          </span>
                        )}
                        {/* Action badges */}
                        {actionItems.map((action, aIdx) => (
                          <span
                            key={aIdx}
                            className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-md text-[9px] font-black border ${
                              action.severity === 'danger'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : action.severity === 'warning'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}
                            title={action.description}
                          >
                            <span>{action.severity === 'danger' ? '⚠️' : action.severity === 'warning' ? '⏳' : '📢'}</span>
                            <span>{action.label}</span>
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-blue-400 font-bold flex items-center space-x-1.5 mt-0.5">
                        <span>{shift.staff_division || shift.staff_role}</span>
                        <span className="text-slate-500 font-mono font-medium">({shift.staff_id})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onInspectPhoto?.(shift, shift.checkout_photo ? 'out' : 'in')}
                      className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition shadow-xs cursor-pointer"
                      title="Buka audit lengkap shift"
                    >
                      <Eye className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRow(shift.id)}
                      className={`p-2 rounded-xl transition cursor-pointer flex items-center space-x-1 text-xs font-bold ${
                        isExpanded
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title={isExpanded ? 'Tutup Detail' : 'Buka Detail Rekap'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. Three-Column Attendance Grid (Fit 100% width, no overflow) */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#12161f] rounded-2xl border border-slate-800/80 text-center">
                  
                  {/* Col 1: Masuk */}
                  <div className="flex flex-col items-center justify-between space-y-1">
                    <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                      Masuk
                    </span>
                    <span className="font-mono text-emerald-300 font-black text-xs">
                      {formatWitaTimeOnly(shift.checkin_time)}
                    </span>
                    {shift.checkin_photo ? (
                      <button
                        type="button"
                        onClick={() => onInspectPhoto?.(shift, 'in')}
                        className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 transition shadow-xs bg-slate-900 cursor-pointer"
                        title="Lihat Foto Selfie Masuk"
                      >
                        <img
                          src={shift.checkin_photo}
                          alt="Check-in Selfie"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="w-8 h-8 sm:w-9 sm:h-9 object-cover group-hover:scale-110 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-3 h-3 text-white stroke-[2.5]" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                        -
                      </div>
                    )}
                    <div className="mt-0.5">
                      {renderFaceRecogBadge(shift)}
                    </div>
                  </div>

                  {/* Col 2: Istirahat */}
                  <div className="flex flex-col items-center justify-between space-y-1 border-x border-slate-800/80 px-1">
                    <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider">
                      Istirahat
                    </span>
                    {shift.staff_division === 'Management' ? (
                      <span className="text-[9px] text-blue-400 font-bold">Fleksibel</span>
                    ) : shift.staff_venue === 'JP Karaoke' ? (
                      <span className="text-[9px] text-slate-500 font-bold">No Break</span>
                    ) : shift.break_status === 'ON_BREAK' ? (
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                        Break ({formatWitaTimeOnly(shift.break_start_time)})
                      </span>
                    ) : shift.break_duration_minutes != null || shift.break_end_time ? (
                      <div className="leading-tight text-center">
                        <span className="font-mono text-sky-300 font-black text-xs">
                          {shift.break_duration_minutes != null ? `${shift.break_duration_minutes}m` : 'Selesai'}
                        </span>
                        {shift.break_end_time && (
                          <div className="text-[8.5px] font-mono text-slate-400">
                            {formatWitaTimeOnly(shift.break_end_time)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-bold">Belum</span>
                    )}

                    {(shift.break_start_photo || shift.break_end_photo) ? (
                      <div className="flex items-center space-x-1">
                        {shift.break_start_photo && (
                          <button
                            type="button"
                            onClick={() => onInspectPhoto?.(shift, 'break_start')}
                            className="group relative rounded overflow-hidden border border-slate-700 hover:border-sky-500 transition shadow-xs bg-slate-900 cursor-pointer"
                            title="Foto Mulai Istirahat (Before)"
                          >
                            <img
                              src={shift.break_start_photo}
                              alt="Break Start"
                              className="w-6 h-6 object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[6px] text-sky-200 text-center font-bold">
                              Bef
                            </span>
                          </button>
                        )}
                        {shift.break_end_photo && (
                          <button
                            type="button"
                            onClick={() => onInspectPhoto?.(shift, 'break_end')}
                            className="group relative rounded overflow-hidden border border-slate-700 hover:border-sky-500 transition shadow-xs bg-slate-900 cursor-pointer"
                            title="Foto Selesai Istirahat (After)"
                          >
                            <img
                              src={shift.break_end_photo}
                              alt="Break End"
                              className="w-6 h-6 object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[6px] text-emerald-200 text-center font-bold">
                              Aft
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                        -
                      </div>
                    )}
                  </div>

                  {/* Col 3: Pulang */}
                  <div className="flex flex-col items-center justify-between space-y-1">
                    <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">
                      Pulang
                    </span>
                    {shift.checkout_time ? (
                      <span className="text-indigo-300 font-mono font-black text-xs">
                        {formatWitaTimeOnly(shift.checkout_time)}
                      </span>
                    ) : (
                      <span className="px-1 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Bertugas
                      </span>
                    )}

                    {shift.checkout_photo ? (
                      <button
                        type="button"
                        onClick={() => onInspectPhoto?.(shift, 'out')}
                        className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition shadow-xs bg-slate-900 cursor-pointer"
                        title="Lihat Foto Selfie Pulang"
                      >
                        <img
                          src={shift.checkout_photo}
                          alt="Checkout Selfie"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="w-8 h-8 sm:w-9 sm:h-9 object-cover group-hover:scale-110 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-3 h-3 text-white stroke-[2.5]" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                        -
                      </div>
                    )}
                  </div>

                </div>

                {/* 4. Bottom Info Strip: Durasi, GPS, Late Review, Flags */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center space-x-3 text-slate-300 font-bold">
                    <span className="flex items-center space-x-1 font-mono text-[11px]">
                      <span>⏱️</span>
                      <span>
                        {isActive && (!shift.duration_minutes || shift.duration_minutes === 0)
                          ? 'Berjalan'
                          : formatDuration(shift.duration_minutes)}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1 font-mono text-[11px]">
                      <span>📍</span>
                      <span className={shift.checkin_distance > 150 ? 'text-rose-400 font-black' : 'text-slate-300'}>
                        {shift.checkin_distance != null ? `${shift.checkin_distance}m` : '-'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {renderLateReviewBadge(shift)}
                    {renderFlagBadges(shift.flags, shift)}
                  </div>
                </div>

                {/* 5. Expanded Accordion: 4 Rekap Cards & Action Items */}
                {isExpanded && (
                  <div className="pt-3 border-t border-indigo-500/30 space-y-3 animate-fade-in">
                    {renderExpandedContent(shift, actionItems)}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: TRADITIONAL DESKTOP TABLE */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200 border-collapse">
            <thead className="bg-[#12161f] text-slate-300 uppercase text-[10px] tracking-wider font-black border-b border-slate-800">
              <tr>
                <th className="py-3 px-2 w-7 text-center"></th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Staff &amp; Aksi</th>
                <th className="py-3 px-3">Outlet &amp; Divisi</th>
                <th className="py-3 px-3">Jadwal Shift</th>
                <th className="py-3 px-3">Masuk &amp; Face Recog</th>
                <th className="py-3 px-3">Istirahat</th>
                <th className="py-3 px-3">Pulang</th>
                <th className="py-3 px-2">Durasi &amp; GPS</th>
                <th className="py-3 px-3">Late Review</th>
                <th className="py-3 px-3">Status / Anomali</th>
                <th className="py-3 px-2 text-right">Detail</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70 font-bold">
              {shifts.map((shift) => {
                const hasFlags = shift.flags && shift.flags.length > 0;
                const shiftInfo = resolveShift(shift, schedules);
                const isActive = !shift.checkout_time || shift.status === 'IN_PROGRESS' || shift.status === 'ON_DUTY' || shift.status === 'ON_BREAK';
                const actionItems = getStaffActionItems(shift);
                const isExpanded = Boolean(expandedRows[shift.id]);

                return (
                  <React.Fragment key={shift.id}>
                    <tr
                      className={`hover:bg-slate-800/40 transition-colors ${
                        hasFlags ? 'bg-amber-500/5' : ''
                      } ${isExpanded ? 'bg-indigo-950/20' : ''}`}
                    >
                      {/* Expand/Collapse Chevron Button */}
                      <td className={`${cellPy} px-2 text-center`}>
                        <button
                          type="button"
                          onClick={() => toggleRow(shift.id)}
                          className={`p-1 rounded-lg transition cursor-pointer ${
                            isExpanded
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                          title={isExpanded ? 'Tutup Detail Kartu' : 'Buka Detail Kartu (Poin, Hari Kerja, Aksi)'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className={`${cellPy} px-3 font-mono text-slate-100 font-bold whitespace-nowrap`}>
                        {formatWitaDateOnly(shift.shift_date || shift.date || shift.checkin_time)}
                      </td>

                      {/* Staff Name, Action Badges, Real Photo & Mood */}
                      <td className={`${cellPy} px-3 whitespace-nowrap`}>
                        <div className="flex items-center space-x-2.5">
                          {shift.staff_profile_photo_url ? (
                            <img
                              src={shift.staff_profile_photo_url}
                              alt={shift.staff_name}
                              className={`${isCompact ? 'w-7 h-7' : 'w-8 h-8'} rounded-xl object-cover border border-slate-700 shrink-0 shadow-xs`}
                            />
                          ) : (
                            <div className={`${isCompact ? 'w-7 h-7' : 'w-8 h-8'} rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0`}>
                              {shift.staff_name ? shift.staff_name.slice(0, 2).toUpperCase() : 'ST'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <span className="font-black text-slate-100 text-sm">{shift.staff_name}</span>
                              {shift.mood_emoji && (
                                <span
                                  className="inline-flex items-center justify-center text-xs px-1 py-0.2 rounded bg-slate-800/90 border border-slate-700/70 shadow-xs cursor-default shrink-0"
                                  title={`Mood staff hari ini: ${shift.mood_emoji}`}
                                >
                                  {shift.mood_emoji}
                                </span>
                              )}

                              {/* Prominent Action Badges next to Staff Name */}
                              {actionItems.map((action, aIdx) => (
                                <span
                                  key={aIdx}
                                  className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-md text-[9px] font-black border ${
                                    action.severity === 'danger'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : action.severity === 'warning'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  }`}
                                  title={action.description}
                                >
                                  <span>{action.severity === 'danger' ? '⚠️' : action.severity === 'warning' ? '⏳' : '📢'}</span>
                                  <span>{action.label}</span>
                                </span>
                              ))}

                              {/* Clean announcement badge if already read */}
                              {hasActiveAnnouncement && readersSet?.has(String(shift.staff_id)) && (
                                <span
                                  title="Sudah membaca pengumuman management ✓"
                                  className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[8px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                >
                                  <CheckCircle className="w-2.5 h-2.5 text-emerald-400 stroke-[2.5]" />
                                  <span>Paham ✓</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold">{shift.staff_id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Outlet & Division */}
                      <td className={`${cellPy} px-3 whitespace-nowrap`}>
                        <div className="font-black text-slate-200">
                          {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                        </div>
                        <div className="text-[10px] text-blue-400 font-black">
                          {shift.staff_division || shift.staff_role}
                        </div>
                      </td>

                      {/* Shift Indicator & Schedule */}
                      <td className={`${cellPy} px-3 whitespace-nowrap`}>
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black border ${shiftInfo.badgeClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full mr-1 bg-current opacity-70"></span>
                            {shiftInfo.badgeLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            🕒 {shiftInfo.timeRange}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span>Sedang Berjalan</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Masuk & Face Recog Status */}
                      <td className={`${cellPy} px-3 whitespace-nowrap`}>
                        <div className="flex items-center space-x-2">
                          {shift.checkin_photo ? (
                            <button
                              type="button"
                              onClick={() => onInspectPhoto(shift, 'in')}
                              className="group relative inline-block rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-500 transition shadow-sm bg-slate-900 shrink-0 cursor-pointer"
                              title="Lihat Foto Selfie Masuk"
                            >
                              <img
                                src={shift.checkin_photo}
                                alt="Check-in Selfie"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                className={`${isCompact ? 'w-8 h-8' : 'w-10 h-10'} object-cover group-hover:scale-110 transition duration-200`}
                              />
                              <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                              </div>
                            </button>
                          ) : (
                            <div className={`${isCompact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0`}>
                              -
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-emerald-400 font-black text-xs">
                              {formatWitaTimeOnly(shift.checkin_time)}
                            </span>
                            {renderFaceRecogBadge(shift)}
                          </div>
                        </div>
                      </td>

                      {/* Istirahat */}
                      <td className={`${cellPy} px-3 whitespace-nowrap`}>
                        {shift.staff_division === 'Management' ? (
                          <span className="text-[10px] text-blue-400 font-mono font-black">Fleksibel (Mgmt)</span>
                        ) : shift.staff_venue === 'JP Karaoke' ? (
                          <span className="text-[10px] text-slate-500 font-mono font-bold">No Break (JP)</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-[10px]">
                              {shift.break_status === 'ON_BREAK' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                                  Sedang Break ({formatWitaTimeOnly(shift.break_start_time)})
                                </span>
                              ) : shift.break_duration_minutes != null || shift.break_end_time ? (
                                <div className="leading-tight">
                                  <span className="font-mono text-sky-300 font-black">
                                    Selesai {shift.break_duration_minutes != null ? `${shift.break_duration_minutes}m` : ''}
                                  </span>
                                  {shift.break_end_time && (
                                    <div className="text-[9px] font-mono text-slate-400">
                                      jam {formatWitaTimeOnly(shift.break_end_time)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono font-bold">Belum Diambil</span>
                              )}
                            </div>

                            {(shift.break_start_photo || shift.break_end_photo) && (
                              <div className="flex items-center space-x-1.5 pt-0.5">
                                {shift.break_start_photo && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectPhoto(shift, 'break_start')}
                                    className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-sky-500 transition shadow-xs bg-slate-900 cursor-pointer"
                                    title="Lihat Foto Mulai Istirahat (Before)"
                                  >
                                    <img
                                      src={shift.break_start_photo}
                                      alt="Break Start"
                                      className="w-6 h-6 object-cover group-hover:scale-110 transition duration-200"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[6.5px] text-sky-200 text-center font-bold">
                                      Before
                                    </span>
                                  </button>
                                )}
                                {shift.break_end_photo && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectPhoto(shift, 'break_end')}
                                    className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-sky-500 transition shadow-xs bg-slate-900 cursor-pointer"
                                    title="Lihat Foto Selesai Istirahat (After)"
                                  >
                                    <img
                                      src={shift.break_end_photo}
                                      alt="Break End"
                                      className="w-6 h-6 object-cover group-hover:scale-110 transition duration-200"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[6.5px] text-emerald-200 text-center font-bold">
                                      After
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Pulang */}
                      <td className={`${cellPy} px-3 whitespace-nowrap`}>
                        <div className="flex items-center space-x-2">
                          {shift.checkout_photo ? (
                            <button
                              type="button"
                              onClick={() => onInspectPhoto(shift, 'out')}
                              className="group relative inline-block rounded-xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition shadow-sm bg-slate-900 shrink-0 cursor-pointer"
                              title="Lihat Foto Selfie Pulang"
                            >
                              <img
                                src={shift.checkout_photo}
                                alt="Checkout Selfie"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                className={`${isCompact ? 'w-8 h-8' : 'w-10 h-10'} object-cover group-hover:scale-110 transition duration-200`}
                              />
                              <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                              </div>
                            </button>
                          ) : (
                            <div className={`${isCompact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0`}>
                              -
                            </div>
                          )}
                          <div>
                            {shift.checkout_time ? (
                              <span className="text-indigo-300 font-mono font-black text-xs">
                                {formatWitaTimeOnly(shift.checkout_time)}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Aktif Bertugas
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Durasi Kerja & Jarak GPS */}
                      <td className={`${cellPy} px-2 whitespace-nowrap`}>
                        <div className="font-mono text-slate-200 font-bold text-xs flex items-center space-x-1">
                          <span className="text-[11px]">⏱️</span>
                          <span>
                            {isActive && (!shift.duration_minutes || shift.duration_minutes === 0)
                              ? 'Berjalan'
                              : formatDuration(shift.duration_minutes)}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono mt-0.5 flex items-center space-x-1">
                          <span>📍</span>
                          <span className={shift.checkin_distance > 150 ? 'text-rose-400 font-black' : 'text-slate-300 font-semibold'}>
                            {shift.checkin_distance != null ? `${shift.checkin_distance}m` : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Late Review */}
                      <td className={`${cellPy} px-3 whitespace-nowrap`}>
                        {renderLateReviewBadge(shift)}
                      </td>

                      {/* Flags / Anomali */}
                      <td className={`${cellPy} px-3 max-w-xs`}>
                        {renderFlagBadges(shift.flags, shift)}
                      </td>

                      {/* Inspect Detail Button */}
                      <td className={`${cellPy} px-2 text-right`}>
                        <button
                          type="button"
                          onClick={() => onInspectPhoto(shift, shift.checkout_photo ? 'out' : 'in')}
                          className="p-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition shadow-xs cursor-pointer"
                          title="Buka audit lengkap shift"
                        >
                          <Eye className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED ROW */}
                    {isExpanded && (
                      <tr className="bg-[#121620] border-y border-indigo-500/40 animate-fade-in">
                        <td colSpan={12} className="p-4 sm:p-5">
                          {renderExpandedContent(shift, actionItems)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
