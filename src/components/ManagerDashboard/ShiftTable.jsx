import React from 'react';
import { Wifi, WifiOff, MapPin, Eye, AlertTriangle, CheckCircle, Clock, Coffee } from 'lucide-react';
import { formatWitaTimeOnly, formatWitaDateOnly, formatDuration } from '../../utils/time';

export default function ShiftTable({ shifts = [], onInspectPhoto }) {
  if (shifts.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
        <Clock className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-300">No shift records matching your filter</h3>
        <p className="text-xs text-slate-500 mt-1">Try switching date range or division.</p>
      </div>
    );
  }

  const renderFlagBadges = (flags = []) => {
    if (!flags || flags.length === 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <CheckCircle className="w-2.5 h-2.5" />
          <span>Clean</span>
        </span>
      );
    }

    const flagLabels = {
      'FLAG: Late Check-In (>10m Grace)': { text: 'Late (>10m Grace)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      'FLAG: Unverified Network': { text: 'Unverified Network', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      FLAG_UNVERIFIED_NETWORK: { text: 'Unverified Network', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      'FLAG: Break Exceeded 1 Hour': { text: 'Break > 1 Hr', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      'FLAG: Break Past Allowed Window': { text: 'Late Break Window', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      FLAG_MISSING_CHECKOUT: { text: 'Missing Out (>12h)', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_EARLY_CHECKOUT: { text: 'Early Check-Out', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      FLAG_NETWORK_MISMATCH: { text: 'Network Mismatch', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
      FLAG_OFF_NETWORK: { text: 'Off-Network Attempt', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
      FLAG_OUTSIDE_GEOFENCE: { text: 'Outside Geofence', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' }
    };

    return (
      <div className="flex flex-wrap gap-1">
        {flags.map((f, idx) => {
          const conf = flagLabels[f] || { text: f.replace('FLAG_', '').replace('FLAG: ', ''), color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
          return (
            <span
              key={idx}
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${conf.color}`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>{conf.text}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-3">Date</th>
              <th className="py-3.5 px-3">Staff Name</th>
              <th className="py-3.5 px-3">Outlet & Division</th>
              <th className="py-3.5 px-3">In Time</th>
              <th className="py-3.5 px-2 text-center">In Photo</th>
              <th className="py-3.5 px-3">1-Hr Break</th>
              <th className="py-3.5 px-3">Out Time</th>
              <th className="py-3.5 px-2 text-center">Out Photo</th>
              <th className="py-3.5 px-2">Duration</th>
              <th className="py-3.5 px-2">Wi-Fi</th>
              <th className="py-3.5 px-2">Distance</th>
              <th className="py-3.5 px-3">Status Flags</th>
              <th className="py-3.5 px-2 text-right">Inspect</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-medium">
            {shifts.map((shift) => {
              const hasFlags = shift.flags && shift.flags.length > 0;
              const isWifiPass = shift.checkin_wifi_pass === 1;

              return (
                <tr
                  key={shift.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    hasFlags ? 'bg-amber-950/5' : ''
                  }`}
                >
                  {/* Date */}
                  <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                    {formatWitaDateOnly(shift.checkin_time)}
                  </td>

                  {/* Staff Name & ID */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-white">{shift.staff_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{shift.staff_id}</div>
                  </td>

                  {/* Outlet & Division */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-200">
                      {shift.staff_venue === 'JP Karaoke' ? '🎤 JP Karaoke' : '🐱 LuckyCat'}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      {shift.staff_division || shift.staff_role}
                    </div>
                  </td>

                  {/* In Time */}
                  <td className="py-3 px-3 font-mono text-emerald-400 whitespace-nowrap">
                    {formatWitaTimeOnly(shift.checkin_time)}
                  </td>

                  {/* In Photo */}
                  <td className="py-3 px-2 text-center">
                    {shift.checkin_photo ? (
                      <button
                        onClick={() => onInspectPhoto(shift, 'in')}
                        className="group relative inline-block rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 transition shadow-sm"
                        title="View Check-In Photo"
                      >
                        <img
                          src={shift.checkin_photo}
                          alt="Check-in Selfie"
                          className="w-9 h-9 object-cover group-hover:scale-110 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-3 h-3 text-white" />
                        </div>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">-</span>
                    )}
                  </td>

                  {/* Break Status / Duration */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {shift.staff_venue === 'JP Karaoke' ? (
                      <span className="text-[10px] text-slate-500 font-mono">No Break (JP)</span>
                    ) : shift.break_status === 'ON_BREAK' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                        On Break
                      </span>
                    ) : shift.break_duration_minutes != null ? (
                      <div>
                        <span className="font-mono text-sky-400 font-bold">
                          {shift.break_duration_minutes}m break
                        </span>
                        {shift.break_end_photo && (
                          <button
                            onClick={() => onInspectPhoto(shift, 'break')}
                            className="ml-1 text-[10px] text-sky-300 hover:underline inline-flex items-center"
                          >
                            <Coffee className="w-2.5 h-2.5 mr-0.5" /> Photo
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">Not Taken</span>
                    )}
                  </td>

                  {/* Out Time */}
                  <td className="py-3 px-3 font-mono whitespace-nowrap">
                    {shift.checkout_time ? (
                      <span className="text-indigo-400">{formatWitaTimeOnly(shift.checkout_time)}</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                  </td>

                  {/* Out Photo */}
                  <td className="py-3 px-2 text-center">
                    {shift.checkout_photo ? (
                      <button
                        onClick={() => onInspectPhoto(shift, 'out')}
                        className="group relative inline-block rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition shadow-sm"
                        title="View Check-Out Photo"
                      >
                        <img
                          src={shift.checkout_photo}
                          alt="Checkout Selfie"
                          className="w-9 h-9 object-cover group-hover:scale-110 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-3 h-3 text-white" />
                        </div>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">-</span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-2 whitespace-nowrap font-mono text-slate-300">
                    {formatDuration(shift.duration_minutes)}
                  </td>

                  {/* Wi-Fi Match Pass/Fail */}
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                        isWifiPass
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {isWifiPass ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                      <span>{isWifiPass ? 'PASS' : 'FAIL'}</span>
                    </span>
                  </td>

                  {/* GPS Distance */}
                  <td className="py-3 px-2 whitespace-nowrap font-mono text-[10px]">
                    <span
                      className={shift.checkin_distance > 150 ? 'text-rose-400 font-bold' : 'text-slate-300'}
                    >
                      {shift.checkin_distance != null ? `${shift.checkin_distance}m` : '-'}
                    </span>
                  </td>

                  {/* Flags */}
                  <td className="py-3 px-3 max-w-xs">{renderFlagBadges(shift.flags)}</td>

                  {/* Inspect Button */}
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => onInspectPhoto(shift, shift.checkout_photo ? 'out' : 'in')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Inspect shift details"
                    >
                      <Eye className="w-3.5 h-3.5" />
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
