import React from 'react';
import { formatWitaDateOnly, formatWitaTimeOnly, formatDuration, formatWitaDateTime } from '../../utils/time';
import { resolveShift } from '../../utils/shiftResolver';

export default function PrintableTimesheet({ shifts = [], venueName = 'JP Karaoke & LuckyCat Outlets' }) {
  const generatedTime = formatWitaDateTime(new Date().toISOString());

  return (
    <div className="print-only">
      {/* Official A4 Timesheet Header */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {venueName}
            </h1>
            <h2 style={{ fontSize: '11pt', fontWeight: '600', margin: '0', color: '#1e293b' }}>
              Official Staff Daily Shift, Attendance & Break Audit Ledger
            </h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt' }}>
            <div><strong>Generated:</strong> {generatedTime}</div>
            <div><strong>Biometric Security:</strong> Watermarked & GPS Verified</div>
          </div>
        </div>
      </div>

      {/* Structured Timesheet Table */}
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '75px' }}>Date</th>
            <th>Staff Name & ID</th>
            <th>Outlet & Division</th>
            <th style={{ width: '70px' }}>Shift</th>
            <th style={{ width: '80px' }}>In (WITA)</th>
            <th style={{ width: '75px' }}>1-Hr Break</th>
            <th style={{ width: '80px' }}>Out (WITA)</th>
            <th style={{ width: '65px' }}>Total Dur</th>
            <th style={{ width: '60px' }}>GPS Dist</th>
            <th>Audit & Anomaly Flags</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((s) => {
            const hasFlags = s.flags && s.flags.length > 0;
            const shiftInfo = resolveShift(s);
            return (
              <tr key={s.id}>
                <td>{formatWitaDateOnly(s.shift_date || s.date || s.checkin_time)}</td>
                <td>
                  <strong>{s.staff_name}</strong>
                  <div style={{ fontSize: '8pt', color: '#475569' }}>{s.staff_id}</div>
                </td>
                <td>
                  <strong>{s.staff_venue || 'JP'}</strong>
                  <div style={{ fontSize: '8pt', color: '#475569' }}>{s.staff_division || s.staff_role}</div>
                </td>
                <td>
                  <strong>{shiftInfo.badgeLabel}</strong>
                  <div style={{ fontSize: '7.5pt', color: '#64748b' }}>{shiftInfo.timeRange}</div>
                </td>
                <td>{formatWitaTimeOnly(s.checkin_time)}</td>
                <td>
                  {s.staff_venue === 'JP Karaoke'
                    ? '-'
                    : s.break_duration_minutes != null
                    ? `${s.break_duration_minutes}m`
                    : 'None'}
                </td>
                <td>{s.checkout_time ? formatWitaTimeOnly(s.checkout_time) : 'IN PROGRESS'}</td>
                <td>{formatDuration(s.duration_minutes)}</td>
                <td>{s.checkin_distance != null ? `${s.checkin_distance}m` : '-'}</td>
                <td>
                  {hasFlags ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {s.flags.map((f, i) => (
                        <span key={i} className="print-badge">
                          {f.replace('FLAG_', '').replace('FLAG: ', '')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>NORMAL</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Manager Sign-Off Section */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '10pt', pageBreakInside: 'avoid' }}>
        <div style={{ width: '220px', borderTop: '1px solid #000', paddingTop: '6px', textAlign: 'center' }}>
          <strong>Shift Supervisor</strong><br />
          <span style={{ fontSize: '8.5pt', color: '#475569' }}>Prepared & Verified</span>
        </div>
        <div style={{ width: '220px', borderTop: '1px solid #000', paddingTop: '6px', textAlign: 'center' }}>
          <strong>HR / Operations Manager</strong><br />
          <span style={{ fontSize: '8.5pt', color: '#475569' }}>Audited</span>
        </div>
        <div style={{ width: '220px', borderTop: '1px solid #000', paddingTop: '6px', textAlign: 'center' }}>
          <strong>Operational Manager</strong><br />
          <span style={{ fontSize: '8.5pt', color: '#475569' }}>Approved</span>
        </div>
      </div>
    </div>
  );
}
