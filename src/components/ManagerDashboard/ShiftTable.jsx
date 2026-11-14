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
  AlertCircle
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
        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle className="w-2 h-2 text-emerald-400 stroke-[2.5]" />
          <span>Clean</span>
        </span>
      );
    }

    const flagLabels = {
      FLAG_FACE_MISMATCH: { text: 'Beda Wajah', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      'FLAG: Late Check-In (>10m Grace)': { text: 'Telat', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_LATE_EXCUSED: { text: 'ACC Telat', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
      'FLAG: Unverified Network': { text: 'Unverified Net', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_UNVERIFIED_NETWORK: { text: 'Unverified Net', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      'FLAG: Break Exceeded 1 Hour': { text: 'Break >1 Jam', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      'FLAG: Break Past Allowed Window': { text: 'Late Window', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      FLAG_MISSING_CHECKOUT: { text: 'Lupa Checkout', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_EARLY_CHECKOUT: { text: 'Early Checkout', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      FLAG_NETWORK_MISMATCH: { text: 'Net Mismatch', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
      FLAG_OFF_NETWORK: { text: 'Off-Net', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_OUTSIDE_GEOFENCE: { text: 'Luar Area', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
      'FLAG_GPS_IMPRECISE (Perkiraan BTS)': { text: 'Sinyal BTS', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
    };

    return (
      <div className="flex flex-wrap gap-0.5">
        {nonLateFlags.map((f, idx) => {
          const conf = flagLabels[f] || {
            text: f.replace('FLAG_', '').replace('FLAG: ', ''),
            color: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          };
          return (
            <span
              key={idx}
              className={`inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[8px] font-bold border ${conf.color}`}
            >
              <AlertTriangle className="w-2 h-2 stroke-[2.5]" />
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
          className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[8px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          title={`Biometrik cocok: ${sim}% kemiripan`}
        >
          <ShieldCheck className="w-2 h-2 text-emerald-400 stroke-[2.5]" />
          <span>Lolos {sim != null ? `${sim}%` : '✓'}</span>
        </span>
      );
    }

    if (status === 'MISMATCH') {
      return (
        <span
          className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30"
          title={`Wajah selfie tidak cocok (${sim != null ? `${sim}%` : 'Rendah'})`}
        >
          <ShieldAlert className="w-2 h-2 text-rose-400 stroke-[2.5]" />
          <span>Beda {sim != null ? `${sim}%` : '✕'}</span>
        </span>
      );
    }

    if (status === 'NO_REFERENCE') {
      return (
        <span
          className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[7.5px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60"
          title="Staff belum mendaftarkan biometrik wajah resmi"
        >
          <span>No Ref</span>
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
        <span className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold text-slate-400 bg-slate-800/50 border border-slate-700/50">
          <CheckCircle className="w-2 h-2 text-emerald-400" />
          <span>Tepat</span>
        </span>
      );
    }

    if (isLateApproved) {
      return (
        <div className="flex flex-col items-start leading-tight">
          <button
            type="button"
            onClick={() => onReviewLate?.(shift)}
            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-black border bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 transition cursor-pointer"
            title={shift?.late_reviewed_by ? `Di-ACC oleh ${shift.late_reviewed_by}. Klik untuk lihat/ubah.` : 'Di-ACC. Klik untuk detail.'}
          >
            <CheckCircle className="w-2 h-2 stroke-[2.5]" />
            <span>Di-ACC ✓</span>
          </button>
        </div>
      );
    }

    if (isLatePending) {
      return (
        <button
          type="button"
          onClick={() => onReviewLate?.(shift)}
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8.5px] font-black border bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 transition cursor-pointer shadow-xs animate-pulse"
          title="Klik untuk melihat alasan & foto bukti telat, lalu ACC / Tolak"
        >
          <Clock className="w-2 h-2 stroke-[2.5]" />
          <span>Review ⏳</span>
        </button>
      );
    }

    if (isLateRejected) {
      return (
        <div className="flex flex-col items-start leading-tight">
          <button
            type="button"
            onClick={() => onReviewLate?.(shift)}
            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-black border bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 transition cursor-pointer"
            title={shift?.late_reviewed_by ? `Ditolak oleh ${shift.late_reviewed_by}. Klik untuk lihat/ubah.` : 'Ditolak. Klik untuk detail.'}
          >
            <AlertTriangle className="w-2 h-2 stroke-[2.5]" />
            <span>Tolak ✕</span>
          </button>
        </div>
      );
    }

    return null;
  };

  const isCompact = density === 'compact';
  const cellPy = isCompact ? 'py-1.5' : 'py-2.5';

  return (
    <div className="bg-[#161b24] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-200 border-collapse table-auto">
          <thead className="bg-[#12161f] text-slate-300 uppercase text-[9px] tracking-wider font-black border-b border-slate-800">
            <tr>
              <th className="py-2 px-1 w-6 text-center"></th>
              <th className="py-2 px-1.5 whitespace-nowrap">Tgl</th>
              <th className="py-2 px-1.5">Staff &amp; Aksi</th>
              <th className="py-2 px-1.5">Outlet/Divisi</th>
              <th className="py-2 px-1.5 whitespace-nowrap">Shift</th>
              <th className="py-2 px-1.5">Masuk</th>
              <th className="py-2 px-1.5">Istirahat</th>
              <th className="py-2 px-1.5">Pulang</th>
              <th className="py-2 px-1 whitespace-nowrap">Durasi/GPS</th>
              <th className="py-2 px-1.5 whitespace-nowrap">Review</th>
              <th className="py-2 px-1.5">Anomali</th>
              <th className="py-2 px-1 text-right w-7"></th>
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
                    {/* Expand/Collapse Button */}
                    <td className={`${cellPy} px-1 text-center`}>
                      <button
                        type="button"
                        onClick={() => toggleRow(shift.id)}
                        className={`p-0.5 rounded transition cursor-pointer ${
                          isExpanded
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title={isExpanded ? 'Tutup Detail Kartu' : 'Buka Detail Kartu (Poin, Hari Kerja, Aksi)'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 stroke-[2.5]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 stroke-[2.5]" />
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className={`${cellPy} px-1.5 font-mono text-slate-100 font-bold text-[10.5px] whitespace-nowrap leading-tight`}>
                      {formatWitaDateOnly(shift.shift_date || shift.date || shift.checkin_time)}
                    </td>

                    {/* Staff Name, Action Badges, Real Photo & Mood */}
                    <td className={`${cellPy} px-1.5`}>
                      <div className="flex items-center space-x-1.5">
                        {shift.staff_profile_photo_url ? (
                          <img
                            src={shift.staff_profile_photo_url}
                            alt={shift.staff_name}
                            className="w-6 h-6 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0">
                            {shift.staff_name ? shift.staff_name.slice(0, 2).toUpperCase() : 'ST'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1 flex-wrap gap-y-0.5">
                            <span className="font-black text-slate-100 text-[11px] truncate max-w-[100px] leading-tight">
                              {shift.staff_name}
                            </span>
                            {shift.mood_emoji && (
                              <span
                                className="text-[9px] px-0.5 rounded bg-slate-800/90 border border-slate-700/70 shrink-0"
                                title={`Mood: ${shift.mood_emoji}`}
                              >
                                {shift.mood_emoji}
                              </span>
                            )}
                          </div>
                          
                          {/* Action badges under name to save horizontal width */}
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {actionItems.map((action, aIdx) => (
                              <span
                                key={aIdx}
                                className={`inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[7.5px] font-black border ${
                                  action.severity === 'danger'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : action.severity === 'warning'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                }`}
                                title={action.description}
                              >
                                <span>{action.label}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Outlet & Division */}
                    <td className={`${cellPy} px-1.5 leading-tight`}>
                      <div className="font-black text-slate-200 text-[10px] whitespace-nowrap">
                        {shift.staff_venue === 'JP Karaoke' ? '🎤 JP' : '🐱 LuckyCat'}
                      </div>
                      <div className="text-[8.5px] text-blue-400 font-bold truncate max-w-[90px]" title={shift.staff_division || shift.staff_role}>
                        {shift.staff_division || shift.staff_role}
                      </div>
                    </td>

                    {/* Shift Indicator & Schedule */}
                    <td className={`${cellPy} px-1.5 leading-tight whitespace-nowrap`}>
                      <div className="flex flex-col gap-0.5 items-start">
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-black border ${shiftInfo.badgeClass}`}>
                          {shiftInfo.badgeLabel}
                        </span>
                        <span className="text-[8.5px] font-mono text-slate-400">
                          {shiftInfo.timeRange}
                        </span>
                      </div>
                    </td>

                    {/* Masuk & Face Recog Status */}
                    <td className={`${cellPy} px-1.5 leading-tight`}>
                      <div className="flex items-center space-x-1">
                        {shift.checkin_photo ? (
                          <button
                            type="button"
                            onClick={() => onInspectPhoto(shift, 'in')}
                            className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 transition shadow-xs bg-slate-900 shrink-0 cursor-pointer"
                            title="Lihat Foto Selfie Masuk"
                          >
                            <img
                              src={shift.checkin_photo}
                              alt="Check-in"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="w-6 h-6 object-cover"
                            />
                            <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-2.5 h-2.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[8px] text-slate-500 font-mono shrink-0">
                            -
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-emerald-400 font-black text-[10.5px]">
                            {formatWitaTimeOnly(shift.checkin_time)}
                          </span>
                          {renderFaceRecogBadge(shift)}
                        </div>
                      </div>
                    </td>

                    {/* Istirahat */}
                    <td className={`${cellPy} px-1.5 leading-tight`}>
                      {shift.staff_division === 'Management' ? (
                        <span className="text-[9px] text-blue-400 font-bold">Fleksibel</span>
                      ) : shift.staff_venue === 'JP Karaoke' ? (
                        <span className="text-[9px] text-slate-500">No Break</span>
                      ) : (
                        <div className="space-y-0.5">
                          {shift.break_status === 'ON_BREAK' ? (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse whitespace-nowrap">
                              Break {formatWitaTimeOnly(shift.break_start_time)}
                            </span>
                          ) : shift.break_duration_minutes != null || shift.break_end_time ? (
                            <div className="leading-tight">
                              <span className="font-mono text-sky-300 font-black text-[9.5px]">
                                {shift.break_duration_minutes != null ? `${shift.break_duration_minutes}m` : 'Selesai'}
                              </span>
                              {shift.break_end_time && (
                                <span className="text-[8px] font-mono text-slate-400 ml-1">
                                  ({formatWitaTimeOnly(shift.break_end_time)})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[8.5px] text-slate-500">Belum</span>
                          )}

                          {(shift.break_start_photo || shift.break_end_photo) && (
                            <div className="flex items-center space-x-1 pt-0.5">
                              {shift.break_start_photo && (
                                <button
                                  type="button"
                                  onClick={() => onInspectPhoto(shift, 'break_start')}
                                  className="rounded overflow-hidden border border-slate-700 hover:border-sky-500 bg-slate-900 cursor-pointer"
                                  title="Foto Mulai Istirahat"
                                >
                                  <img
                                    src={shift.break_start_photo}
                                    alt="Before"
                                    className="w-5 h-5 object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                </button>
                              )}
                              {shift.break_end_photo && (
                                <button
                                  type="button"
                                  onClick={() => onInspectPhoto(shift, 'break_end')}
                                  className="rounded overflow-hidden border border-slate-700 hover:border-sky-500 bg-slate-900 cursor-pointer"
                                  title="Foto Selesai Istirahat"
                                >
                                  <img
                                    src={shift.break_end_photo}
                                    alt="After"
                                    className="w-5 h-5 object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Pulang */}
                    <td className={`${cellPy} px-1.5 leading-tight`}>
                      <div className="flex items-center space-x-1">
                        {shift.checkout_photo ? (
                          <button
                            type="button"
                            onClick={() => onInspectPhoto(shift, 'out')}
                            className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition shadow-xs bg-slate-900 shrink-0 cursor-pointer"
                            title="Lihat Foto Selfie Pulang"
                          >
                            <img
                              src={shift.checkout_photo}
                              alt="Checkout"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="w-6 h-6 object-cover"
                            />
                            <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-2.5 h-2.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[8px] text-slate-500 font-mono shrink-0">
                            -
                          </div>
                        )}
                        <div>
                          {shift.checkout_time ? (
                            <span className="text-indigo-300 font-mono font-black text-[10.5px]">
                              {formatWitaTimeOnly(shift.checkout_time)}
                            </span>
                          ) : (
                            <span className="inline-block px-1 py-0.2 rounded text-[7.5px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                              Aktif
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Durasi Kerja & Jarak GPS */}
                    <td className={`${cellPy} px-1 leading-tight whitespace-nowrap`}>
                      <div className="font-mono text-slate-200 font-bold text-[10px]">
                        {isActive && (!shift.duration_minutes || shift.duration_minutes === 0)
                          ? 'Jalan'
                          : formatDuration(shift.duration_minutes)}
                      </div>
                      <div className="text-[8.5px] font-mono mt-0.5">
                        <span className={shift.checkin_distance > 150 ? 'text-rose-400 font-black' : 'text-slate-400'}>
                          {shift.checkin_distance != null ? `${shift.checkin_distance}m` : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Late Review */}
                    <td className={`${cellPy} px-1.5 whitespace-nowrap`}>
                      {renderLateReviewBadge(shift)}
                    </td>

                    {/* Flags / Anomali */}
                    <td className={`${cellPy} px-1.5`}>
                      {renderFlagBadges(shift.flags, shift)}
                    </td>

                    {/* Detail Button */}
                    <td className={`${cellPy} px-1 text-right`}>
                      <button
                        type="button"
                        onClick={() => onInspectPhoto(shift, shift.checkout_photo ? 'out' : 'in')}
                        className="p-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition cursor-pointer"
                        title="Buka audit lengkap shift"
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </td>
                  </tr>

                  {/* EXPANDED ROW: Full Staff KPI Cards & Actions */}
                  {isExpanded && (
                    <tr className="bg-[#121620] border-y border-indigo-500/40 animate-fade-in">
                      <td colSpan={12} className="p-3 sm:p-4">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-black uppercase text-indigo-300 tracking-wider">
                                Rekap Staff &amp; Panduan Tindakan:
                              </span>
                              <span className="text-[11px] font-bold text-white font-mono">
                                {shift.staff_name} ({shift.staff_id})
                              </span>
                            </div>
                            <span className="text-[9.5px] text-slate-400">
                              {shift.staff_venue} &bull; {shift.staff_division || shift.staff_role}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            {/* Card 1: Jumlah Point */}
                            <div className="bg-[#181e2b] p-3 rounded-xl border border-slate-700/80 shadow-md">
                              <div className="flex items-center justify-between text-slate-400 mb-0.5">
                                <span className="text-[9px] font-black uppercase tracking-wider">Jumlah Poin</span>
                                <Award className={`w-3.5 h-3.5 ${
                                  (shift.active_points_total || 0) > 0
                                    ? 'text-emerald-400'
                                    : (shift.active_points_total || 0) < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }`} />
                              </div>
                              <div className="flex items-baseline space-x-1">
                                <span className={`text-xl font-black font-mono ${
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
                                <span className="text-[9px] text-slate-400 font-bold">Poin</span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">
                                {(shift.active_points_total || 0) > 0
                                  ? 'Apresiasi & poin plus aktif staff.'
                                  : (shift.active_points_total || 0) < 0
                                  ? 'Akumulasi sanksi berjalan.'
                                  : 'Staff tertib tanpa catatan poin.'}
                              </p>
                            </div>

                            {/* Card 2: Hari Kerja */}
                            <div className="bg-[#181e2b] p-3 rounded-xl border border-slate-700/80 shadow-md">
                              <div className="flex items-center justify-between text-slate-400 mb-0.5">
                                <span className="text-[9px] font-black uppercase tracking-wider">Hari Kerja</span>
                                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                              <div className="flex items-baseline space-x-1">
                                <span className="text-xl font-black font-mono text-blue-300">
                                  {shift.monthly_work_days || 1}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">Hari Kehadiran</span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">
                                Shift kerja terdata bulan ini.
                              </p>
                            </div>

                            {/* Card 3: Total Keterlambatan */}
                            <div className="bg-[#181e2b] p-3 rounded-xl border border-slate-700/80 shadow-md">
                              <div className="flex items-center justify-between text-slate-400 mb-0.5">
                                <span className="text-[9px] font-black uppercase tracking-wider">Total Telat</span>
                                <Clock className="w-3.5 h-3.5 text-rose-400" />
                              </div>
                              <div className="flex items-baseline space-x-1">
                                <span className={`text-xl font-black font-mono ${
                                  (shift.monthly_late_count || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                  {shift.monthly_late_count || 0}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">Kali Telat</span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">
                                Akumulasi keterlambatan bulan ini.
                              </p>
                            </div>

                            {/* Card 4: Aksi yang Harus Diambil */}
                            <div className={`p-3 rounded-xl border shadow-md flex flex-col justify-between ${
                              actionItems.length > 0
                                ? 'bg-amber-950/30 border-amber-500/40'
                                : 'bg-emerald-950/20 border-emerald-500/30'
                            }`}>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                                    actionItems.length > 0 ? 'text-amber-300' : 'text-emerald-300'
                                  }`}>
                                    Aksi Tindak Lanjut
                                  </span>
                                  <AlertCircle className={`w-3.5 h-3.5 ${
                                    actionItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'
                                  }`} />
                                </div>

                                {actionItems.length > 0 ? (
                                  <div className="space-y-1 mb-1.5">
                                    {actionItems.map((act, i) => (
                                      <div key={i} className="text-[9px] text-slate-200 font-bold flex items-start space-x-1">
                                        <span className="text-amber-400">•</span>
                                        <span>{act.label}: <span className="font-normal text-slate-300">{act.description}</span></span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-emerald-300 font-medium leading-tight mb-1.5">
                                    ✓ Tertib — Tidak ada tindakan yang diperlukan.
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1 pt-1">
                                {actionItems.some(a => a.type === 'LATE_REVIEW') && (
                                  <button
                                    type="button"
                                    onClick={() => onReviewLate?.(shift)}
                                    className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center space-x-1"
                                  >
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>Review Telat</span>
                                  </button>
                                )}

                                {shift.face_recog_status === 'MISMATCH' && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectPhoto?.(shift, 'in')}
                                    className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-black text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center space-x-1"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                    <span>Cek Wajah</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onInspectPhoto?.(shift, shift.checkout_photo ? 'out' : 'in')}
                                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-wider transition cursor-pointer shadow-xs flex items-center space-x-1"
                                >
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>Audit ➔</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
