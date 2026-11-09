import React from 'react';
import { Eye, AlertTriangle, CheckCircle, Clock, Coffee, MapPin } from 'lucide-react';
import { formatWitaTimeOnly, formatWitaDateOnly, formatDuration } from '../../utils/time';
import { resolveShift } from '../../utils/shiftResolver';

export default function ShiftTable({ shifts = [], schedules = [], onInspectPhoto }) {
  if (shifts.length === 0) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-12 text-center shadow-sm">
        <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-950">Tidak ada riwayat shift yang cocok dengan filter</h3>
        <p className="text-xs text-slate-700 font-bold mt-1">Coba ganti filter tanggal, shift, venue, atau divisi.</p>
      </div>
    );
  }

  const renderFlagBadges = (flags = [], shift = null) => {
    const isLateApproved = shift?.late_status === 'APPROVED' || flags?.includes('FLAG_LATE_EXCUSED');
    const isLatePending = shift?.late_status === 'PENDING_REVIEW' || (flags?.some(f => String(f).includes('Late Check-In')) && !shift?.late_status);
    const isLateRejected = shift?.late_status === 'REJECTED';

    if ((!flags || flags.length === 0) && !isLateApproved && !isLatePending && !isLateRejected) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
          <CheckCircle className="w-2.5 h-2.5 text-emerald-700 stroke-[2.5]" />
          <span>Clean</span>
        </span>
      );
    }

    const flagLabels = {
      'FLAG: Late Check-In (>10m Grace)': { text: 'Late (>10m Grace)', color: 'bg-rose-100 text-rose-950 border-rose-300' },
      FLAG_LATE_EXCUSED: { text: 'Late Di-ACC (Dimaafkan)', color: 'bg-emerald-100 text-emerald-950 border-emerald-300' },
      'FLAG: Unverified Network': { text: 'Unverified Network', color: 'bg-rose-100 text-rose-950 border-rose-300' },
      FLAG_UNVERIFIED_NETWORK: { text: 'Unverified Network', color: 'bg-rose-100 text-rose-950 border-rose-300' },
      'FLAG: Break Exceeded 1 Hour': { text: 'Break > 1 Hr', color: 'bg-amber-100 text-amber-950 border-amber-300' },
      'FLAG: Break Past Allowed Window': { text: 'Late Break Window', color: 'bg-amber-100 text-amber-950 border-amber-300' },
      FLAG_MISSING_CHECKOUT: { text: 'Missing Out (>12h)', color: 'bg-rose-100 text-rose-950 border-rose-300' },
      FLAG_EARLY_CHECKOUT: { text: 'Early Check-Out', color: 'bg-amber-100 text-amber-950 border-amber-300' },
      FLAG_NETWORK_MISMATCH: { text: 'Network Mismatch', color: 'bg-purple-100 text-purple-950 border-purple-300' },
      FLAG_OFF_NETWORK: { text: 'Off-Network Attempt', color: 'bg-rose-100 text-rose-950 border-rose-300' },
      FLAG_OUTSIDE_GEOFENCE: { text: 'Outside Geofence', color: 'bg-orange-100 text-orange-950 border-orange-300' }
    };

    return (
      <div className="flex flex-wrap gap-1">
        {/* Special Late Justification status badge */}
        {isLateApproved && (
          <span
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border bg-emerald-100 text-emerald-950 border-emerald-300"
            title={shift?.late_reviewed_by ? `Di-ACC oleh ${shift.late_reviewed_by}` : 'Di-ACC'}
          >
            <CheckCircle className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Late Di-ACC ✓</span>
          </span>
        )}
        {!isLateApproved && isLatePending && (
          <span
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border bg-amber-100 text-amber-950 border-amber-400 animate-pulse"
            title="Keterlambatan belum direview management"
          >
            <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Late: Perlu Review ⏳</span>
          </span>
        )}
        {!isLateApproved && isLateRejected && (
          <span
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border bg-rose-100 text-rose-950 border-rose-300"
            title={shift?.late_reviewed_by ? `Ditolak oleh ${shift.late_reviewed_by}` : 'Ditolak'}
          >
            <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Late Ditolak ✕</span>
          </span>
        )}

        {flags?.map((f, idx) => {
          // If late is approved/excused, don't show the red late penalty badge again
          if (isLateApproved && (f === 'FLAG_LATE_EXCUSED' || String(f).includes('Late Check-In'))) {
            return null;
          }
          if ((isLatePending || isLateRejected) && String(f).includes('Late Check-In')) {
            // Already represented by our specialized late badge above
            return null;
          }

          const conf = flagLabels[f] || {
            text: f.replace('FLAG_', '').replace('FLAG: ', ''),
            color: 'bg-amber-100 text-amber-950 border-amber-300'
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

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-900 border-collapse">
          <thead className="bg-slate-100 text-slate-950 uppercase text-[10px] tracking-wider font-black border-b-2 border-slate-200">
            <tr>
              <th className="py-3.5 px-3">Tanggal</th>
              <th className="py-3.5 px-3">Nama Staff</th>
              <th className="py-3.5 px-3">Outlet &amp; Divisi</th>
              <th className="py-3.5 px-3">Indikator Shift</th>
              <th className="py-3.5 px-3">Masuk</th>
              <th className="py-3.5 px-2 text-center">Foto Masuk</th>
              <th className="py-3.5 px-3">Istirahat</th>
              <th className="py-3.5 px-3">Pulang</th>
              <th className="py-3.5 px-2 text-center">Foto Pulang</th>
              <th className="py-3.5 px-2">Durasi</th>
              <th className="py-3.5 px-2">Jarak GPS</th>
              <th className="py-3.5 px-3">Status / Anomali</th>
              <th className="py-3.5 px-2 text-right">Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y-2 divide-slate-100 font-bold">
            {shifts.map((shift) => {
              const hasFlags = shift.flags && shift.flags.length > 0;
              const shiftInfo = resolveShift(shift, schedules);
              const isActive = !shift.checkout_time || shift.status === 'IN_PROGRESS' || shift.status === 'ON_DUTY' || shift.status === 'ON_BREAK';

              return (
                <tr
                  key={shift.id}
                  className={`hover:bg-blue-50/40 transition-colors ${
                    hasFlags ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* Date */}
                  <td className="py-3 px-3 font-mono text-slate-950 font-bold whitespace-nowrap">
                    {formatWitaDateOnly(shift.shift_date || shift.date || shift.checkin_time)}
                  </td>

                  {/* Staff Name & ID */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-black text-slate-950 text-sm">{shift.staff_name}</div>
                    <div className="text-[10px] text-slate-600 font-mono font-bold">{shift.staff_id}</div>
                  </td>

                  {/* Outlet & Division */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-black text-slate-950">
                      {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                    </div>
                    <div className="text-[10px] text-blue-800 font-black">
                      {shift.staff_division || shift.staff_role}
                    </div>
                  </td>

                  {/* Shift Indicator (New Column!) */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-black border shadow-xs ${shiftInfo.badgeClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
                        {shiftInfo.badgeLabel}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 font-bold">
                        🕒 {shiftInfo.timeRange}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>Sedang Berjalan</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* In Time */}
                  <td className="py-3 px-3 font-mono text-emerald-800 font-black whitespace-nowrap">
                    {formatWitaTimeOnly(shift.checkin_time)}
                  </td>

                  {/* In Photo */}
                  <td className="py-3 px-2 text-center">
                    {shift.checkin_photo ? (
                      <button
                        onClick={() => onInspectPhoto(shift, 'in')}
                        className="group relative inline-block rounded-xl overflow-hidden border-2 border-slate-300 hover:border-blue-600 transition shadow-sm"
                        title="Lihat Foto Masuk"
                      >
                        <img
                          src={shift.checkin_photo}
                          alt="Check-in Selfie"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="w-10 h-10 object-cover group-hover:scale-110 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        </div>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Break Status / Duration */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {shift.staff_division === 'Management' ? (
                      <span className="text-[10px] text-blue-800 font-mono font-black">Fleksibel (Mgmt)</span>
                    ) : shift.staff_venue === 'JP Karaoke' ? (
                      <span className="text-[10px] text-slate-500 font-mono font-bold">No Break (JP)</span>
                    ) : shift.break_status === 'ON_BREAK' ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-sky-100 text-sky-950 border border-sky-300 animate-pulse">
                        Sedang Istirahat
                      </span>
                    ) : shift.break_duration_minutes != null ? (
                      <div>
                        <span className="font-mono text-sky-900 font-black">
                          {shift.break_duration_minutes}m istirahat
                        </span>
                        {shift.break_end_photo && (
                          <button
                            onClick={() => onInspectPhoto(shift, 'break')}
                            className="ml-1 text-[10px] text-blue-700 hover:underline inline-flex items-center font-bold"
                          >
                            <Coffee className="w-2.5 h-2.5 mr-0.5 stroke-[2.5]" /> Foto
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono font-bold">Belum Diambil</span>
                    )}
                  </td>

                  {/* Out Time */}
                  <td className="py-3 px-3 font-mono whitespace-nowrap">
                    {shift.checkout_time ? (
                      <span className="text-indigo-900 font-black">{formatWitaTimeOnly(shift.checkout_time)}</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                        Aktif Bertugas
                      </span>
                    )}
                  </td>

                  {/* Out Photo */}
                  <td className="py-3 px-2 text-center">
                    {shift.checkout_photo ? (
                      <button
                        onClick={() => onInspectPhoto(shift, 'out')}
                        className="group relative inline-block rounded-xl overflow-hidden border-2 border-slate-300 hover:border-blue-600 transition shadow-sm"
                        title="Lihat Foto Pulang"
                      >
                        <img
                          src={shift.checkout_photo}
                          alt="Checkout Selfie"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="w-10 h-10 object-cover group-hover:scale-110 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        </div>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-2 whitespace-nowrap font-mono text-slate-950 font-bold">
                    {formatDuration(shift.duration_minutes)}
                  </td>

                  {/* GPS Distance */}
                  <td className="py-3 px-2 whitespace-nowrap font-mono text-[10px] font-bold">
                    <span
                      className={shift.checkin_distance > 150 ? 'text-rose-700 font-black' : 'text-slate-950'}
                    >
                      {shift.checkin_distance != null ? `${shift.checkin_distance}m` : '-'}
                    </span>
                  </td>

                  {/* Flags */}
                  <td className="py-3 px-3 max-w-xs">{renderFlagBadges(shift.flags, shift)}</td>

                  {/* Inspect Button */}
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => onInspectPhoto(shift, shift.checkout_photo ? 'out' : 'in')}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition shadow-sm"
                      title="Lihat detail audit shift"
                    >
                      <Eye className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
