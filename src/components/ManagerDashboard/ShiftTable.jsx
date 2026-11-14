import React from 'react';
import { Eye, AlertTriangle, CheckCircle, Clock, Coffee, MapPin, ShieldCheck, ShieldAlert, LogIn, LogOut } from 'lucide-react';
import { formatWitaTimeOnly, formatWitaDateOnly, formatDuration } from '../../utils/time';
import { resolveShift } from '../../utils/shiftResolver';

export default function ShiftTable({ shifts = [], schedules = [], onInspectPhoto, onReviewLate, readersSet, hasActiveAnnouncement }) {
  if (shifts.length === 0) {
    return (
      <div className="bg-[#161b24] border border-slate-800 rounded-3xl p-12 text-center shadow-lg">
        <Clock className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-100">Tidak ada riwayat shift yang cocok dengan filter</h3>
        <p className="text-xs text-slate-400 font-bold mt-1">Coba ganti filter tanggal, shift, venue, atau divisi.</p>
      </div>
    );
  }

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
          title="Staff belum mengatur foto profil asli di aplikasi"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          <span>No Profil Ref</span>
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

  return (
    <div className="bg-[#161b24] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-200 border-collapse">
          <thead className="bg-[#12161f] text-slate-300 uppercase text-[10px] tracking-wider font-black border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-3">Tanggal</th>
              <th className="py-3.5 px-3">Staff &amp; Mood</th>
              <th className="py-3.5 px-3">Outlet &amp; Divisi</th>
              <th className="py-3.5 px-3">Jadwal Shift</th>
              <th className="py-3.5 px-3">Masuk &amp; Face Recog</th>
              <th className="py-3.5 px-3">Istirahat (Before / After)</th>
              <th className="py-3.5 px-3">Pulang</th>
              <th className="py-3.5 px-2">Durasi &amp; Jarak GPS</th>
              <th className="py-3.5 px-3">Late Review</th>
              <th className="py-3.5 px-3">Status / Anomali</th>
              <th className="py-3.5 px-2 text-right">Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/70 font-bold">
            {shifts.map((shift) => {
              const hasFlags = shift.flags && shift.flags.length > 0;
              const shiftInfo = resolveShift(shift, schedules);
              const isActive = !shift.checkout_time || shift.status === 'IN_PROGRESS' || shift.status === 'ON_DUTY' || shift.status === 'ON_BREAK';

              return (
                <tr
                  key={shift.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    hasFlags ? 'bg-amber-500/5' : ''
                  }`}
                >
                  {/* Date */}
                  <td className="py-3 px-3 font-mono text-slate-100 font-bold whitespace-nowrap">
                    {formatWitaDateOnly(shift.shift_date || shift.date || shift.checkin_time)}
                  </td>

                  {/* Staff Name, Real Photo, Mood & Announcement */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2.5">
                      {shift.staff_profile_photo_url ? (
                        <img
                          src={shift.staff_profile_photo_url}
                          alt={shift.staff_name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-black text-slate-400 shrink-0">
                          {shift.staff_name ? shift.staff_name.slice(0, 2).toUpperCase() : 'ST'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-black text-slate-100 text-sm">{shift.staff_name}</span>
                          {shift.mood_emoji && (
                            <span
                              className="inline-flex items-center justify-center text-sm px-1.5 py-0.2 rounded-lg bg-slate-800/90 border border-slate-700/70 shadow-xs cursor-default shrink-0"
                              title={`Mood staff hari ini: ${shift.mood_emoji}`}
                            >
                              {shift.mood_emoji}
                            </span>
                          )}
                          {hasActiveAnnouncement && (
                            readersSet?.has(String(shift.staff_id)) ? (
                              <span
                                title="Sudah membaca pengumuman management ✓"
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              >
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-400 stroke-[2.5]" />
                                <span>Paham ✓</span>
                              </span>
                            ) : (
                              <span
                                title="Belum membaca pengumuman management"
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-400 stroke-[2.5]" />
                                <span>Belum Baca</span>
                              </span>
                            )
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono font-bold">{shift.staff_id}</div>
                      </div>
                    </div>
                  </td>

                  {/* Outlet & Division */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-black text-slate-200">
                      {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                    </div>
                    <div className="text-[10px] text-blue-400 font-black">
                      {shift.staff_division || shift.staff_role}
                    </div>
                  </td>

                  {/* Shift Indicator & Schedule */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-black border ${shiftInfo.badgeClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
                        {shiftInfo.badgeLabel}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        🕒 {shiftInfo.timeRange}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Sedang Berjalan</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Masuk & Face Recog Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2.5">
                      {shift.checkin_photo ? (
                        <button
                          type="button"
                          onClick={() => onInspectPhoto(shift, 'in')}
                          className="group relative inline-block rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-500 transition shadow-sm bg-slate-900 shrink-0"
                          title="Lihat Foto Selfie Masuk"
                        >
                          <img
                            src={shift.checkin_photo}
                            alt="Check-in Selfie"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="w-10 h-10 object-cover group-hover:scale-110 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0">
                          -
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-emerald-400 font-black text-xs">
                          {formatWitaTimeOnly(shift.checkin_time)}
                        </span>
                        {renderFaceRecogBadge(shift)}
                      </div>
                    </div>
                  </td>

                  {/* Istirahat (Status, Jam Selesai & Foto Before/After) */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {shift.staff_division === 'Management' ? (
                      <span className="text-[10px] text-blue-400 font-mono font-black">Fleksibel (Mgmt)</span>
                    ) : shift.staff_venue === 'JP Karaoke' ? (
                      <span className="text-[10px] text-slate-500 font-mono font-bold">No Break (JP)</span>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Break Status & Time */}
                        <div className="text-[11px]">
                          {shift.break_status === 'ON_BREAK' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                              Sedang Break ({formatWitaTimeOnly(shift.break_start_time)})
                            </span>
                          ) : shift.break_duration_minutes != null || shift.break_end_time ? (
                            <div className="leading-tight">
                              <span className="font-mono text-sky-300 font-black">
                                Selesai {shift.break_duration_minutes != null ? `${shift.break_duration_minutes}m` : ''}
                              </span>
                              {shift.break_end_time && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  jam {formatWitaTimeOnly(shift.break_end_time)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono font-bold">Belum Diambil</span>
                          )}
                        </div>

                        {/* Foto Before (Mulai) & After (Selesai) Break */}
                        {(shift.break_start_photo || shift.break_end_photo) && (
                          <div className="flex items-center space-x-2 pt-0.5">
                            {/* Before Photo */}
                            {shift.break_start_photo && (
                              <button
                                type="button"
                                onClick={() => onInspectPhoto(shift, 'break_start')}
                                className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-sky-500 transition shadow-xs bg-slate-900"
                                title="Lihat Foto Mulai Istirahat (Before)"
                              >
                                <img
                                  src={shift.break_start_photo}
                                  alt="Break Start"
                                  className="w-7 h-7 object-cover group-hover:scale-110 transition duration-200"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[7px] text-sky-200 text-center font-bold">
                                  Before
                                </span>
                              </button>
                            )}

                            {/* After Photo */}
                            {shift.break_end_photo && (
                              <button
                                type="button"
                                onClick={() => onInspectPhoto(shift, 'break_end')}
                                className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-sky-500 transition shadow-xs bg-slate-900"
                                title="Lihat Foto Selesai Istirahat (After)"
                              >
                                <img
                                  src={shift.break_end_photo}
                                  alt="Break End"
                                  className="w-7 h-7 object-cover group-hover:scale-110 transition duration-200"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[7px] text-emerald-200 text-center font-bold">
                                  After
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Pulang (Check-Out Time & Photo) */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2.5">
                      {shift.checkout_photo ? (
                        <button
                          type="button"
                          onClick={() => onInspectPhoto(shift, 'out')}
                          className="group relative inline-block rounded-xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition shadow-sm bg-slate-900 shrink-0"
                          title="Lihat Foto Selfie Pulang"
                        >
                          <img
                            src={shift.checkout_photo}
                            alt="Checkout Selfie"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="w-10 h-10 object-cover group-hover:scale-110 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0">
                          -
                        </div>
                      )}
                      <div>
                        {shift.checkout_time ? (
                          <span className="text-indigo-300 font-mono font-black text-xs">
                            {formatWitaTimeOnly(shift.checkout_time)}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Aktif Bertugas
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Durasi Kerja & Jarak GPS (Dibuat sangat jelas & tidak ambigu) */}
                  <td className="py-3 px-2 whitespace-nowrap">
                    <div className="font-mono text-slate-200 font-bold text-xs flex items-center space-x-1">
                      <span className="text-[11px]">⏱️</span>
                      <span>
                        {isActive && (!shift.duration_minutes || shift.duration_minutes === 0)
                          ? 'Sedang Berjalan'
                          : formatDuration(shift.duration_minutes)}
                      </span>
                    </div>
                    <div className="text-[10.5px] font-mono mt-1 flex items-center space-x-1">
                      <span>📍</span>
                      <span className={shift.checkin_distance > 150 ? 'text-rose-400 font-black' : 'text-slate-300 font-semibold'}>
                        {shift.checkin_distance != null ? `${shift.checkin_distance} meter` : '-'}
                      </span>
                    </div>
                  </td>

                  {/* Late Review */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {renderLateReviewBadge(shift)}
                  </td>

                  {/* Flags / Anomali */}
                  <td className="py-3 px-3 max-w-xs">{renderFlagBadges(shift.flags, shift)}</td>

                  {/* Inspect Detail Button */}
                  <td className="py-3 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectPhoto(shift, shift.checkout_photo ? 'out' : 'in')}
                      className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition shadow-xs cursor-pointer"
                      title="Buka audit lengkap shift"
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
