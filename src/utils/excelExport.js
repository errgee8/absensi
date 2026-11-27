import ExcelJS from 'exceljs';
import { formatWitaTimeOnly, formatWitaDateOnly, formatWitaDateTime, formatDuration } from './time.js';
import { resolveShift } from './shiftResolver.js';

/**
 * Maps standard English/ISO weekday to Indonesian abbreviation.
 */
function getIndonesianShortDay(dateObj) {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return days[dateObj.getDay()] || '';
}

/**
 * Extracts WITA date and time components from an ISO timestamp.
 */
function getWitaComponents(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';

  const dayMap = {
    Mon: 'Sen',
    Tue: 'Sel',
    Wed: 'Rab',
    Thu: 'Kam',
    Fri: 'Jum',
    Sat: 'Sab',
    Sun: 'Min'
  };
  const indoDay = dayMap[weekday] || weekday;

  const curH = parseInt(hour, 10);
  const curM = parseInt(minute, 10);

  return {
    dayName: indoDay,
    dateStr: `${day}/${month}`,
    fullDateStr: `${day}/${month}/${year}`,
    ymd: `${year}-${month}-${day}`,
    timeStr: `${hour}:${minute}`,
    hour: curH,
    minute: curM,
    totalMinutes: curH * 60 + curM
  };
}

/**
 * Formats an executive KPI metric card cell.
 */
function formatKpiCard(worksheet, cellRef, label, value, bgArgb, textArgb) {
  const cell = worksheet.getCell(cellRef);
  cell.value = `${label}: ${value}`;
  cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: textArgb } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };
}

function formatMinutesShort(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h}j ${rem}m`;
  if (h > 0) return `${h}j`;
  return `${rem}m`;
}

/**
 * Builds a dedicated Payroll Recap sheet for a venue (JP Karaoke or LuckyCat),
 * grouped by division, displaying all staff month-to-date with late, leave, overtime (with reason), and points.
 */
function buildVenuePayrollSheet({
  workbook,
  sheetName,
  venueTitle,
  theme,
  staffList = [],
  shifts = [],
  leaveRequests = [],
  dayAdjustments = [],
  overtimeLogs = [],
  staffPointTotals = [],
  schedules = [],
  periodStart = '',
  periodEnd = '',
  exportTimestamp = ''
}) {
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const monthPrefix = periodStart ? periodStart.substring(0, 7) : '';

  // Calculate staff metrics
  const staffMetrics = staffList.map((staff) => {
    const staffKeys = new Set(
      [staff.id, staff.uuid, staff.legacy_code]
        .filter(Boolean)
        .map((k) => String(k).trim().toUpperCase())
    );
    const staffNameLower = (staff.name || '').trim().toLowerCase();

    const matchesStaff = (record) => {
      const candidates = [record.staff_id, record.staff_uuid, record.legacy_code]
        .filter(Boolean)
        .map((k) => String(k).trim().toUpperCase());
      if (candidates.some((c) => staffKeys.has(c))) return true;
      return staffNameLower && (record.staff_name || '').trim().toLowerCase() === staffNameLower;
    };

    // 1. Completed shifts only
    const staffShifts = shifts.filter((s) => {
      const isCompleted = s.status === 'COMPLETED' || (s.checkout_time && s.status !== 'IN_PROGRESS' && s.status !== 'ON_DUTY');
      return matchesStaff(s) && isCompleted && s.checkin_time;
    });

    const actualWorkDays = staffShifts.length;
    const manualAdjSum = (dayAdjustments || [])
      .filter((a) => matchesStaff(a))
      .reduce((acc, a) => acc + Number(a.adjustment_days || 0), 0);
    const totalHariKerja = Math.min(31, Math.max(0, actualWorkDays + manualAdjSum));
    const isMgmt = (staff.division || '').toLowerCase().includes('management');

    // 2. Late check-in occurrences & total late minutes
    const lateOccurrences = [];
    let totalLateMinutes = 0;

    staffShifts.forEach((s) => {
      const inWita = getWitaComponents(s.checkin_time);
      if (!inWita) return;

      let parsedNotes = {};
      try {
        parsedNotes = typeof s.notes === 'string' ? JSON.parse(s.notes || '{}') : (s.notes || {});
      } catch {
        parsedNotes = {};
      }
      const explicitSchedStart = parsedNotes?.scheduled_start || null;

      const resolved = resolveShift(
        {
          ...s,
          scheduled_start: explicitSchedStart || undefined,
          scheduled_end: parsedNotes?.scheduled_end || undefined,
          staff_venue: s.staff_venue || staff.venue,
          staff_division: s.staff_division || staff.division,
          staff_role: s.staff_role || staff.role
        },
        schedules
      );
      const schedStart =
        explicitSchedStart ||
        (resolved?.startTime && resolved.startTime !== '-' ? resolved.startTime : null) ||
        s.scheduled_start ||
        staff.shift_start ||
        '13:00';
      let isLate = false;
      let lateMinutes = 0;

      if (!isMgmt && schedStart && schedStart.includes(':') && schedStart !== '00:00' && schedStart !== 'FLEXIBLE' && resolved?.shiftNumber !== 99) {
        const [sh, sm] = schedStart.split(':').map(Number);
        const schedM = sh * 60 + sm;
        let diff = inWita.totalMinutes - schedM;
        if (diff < -720) diff += 1440;
        if (diff > 720) diff -= 1440;
        if (diff > 10) {
          isLate = true;
          lateMinutes = diff;
        }
      }

      let flagsArr = [];
      try {
        flagsArr = Array.isArray(s.flags) ? s.flags : JSON.parse(s.flags || '[]');
      } catch {
        flagsArr = [];
      }

      const isAcc = s.late_status === 'APPROVED' || flagsArr.includes('FLAG_LATE_EXCUSED');
      const isPartial = s.late_status === 'PARTIAL_APPROVED' || flagsArr.includes('FLAG_LATE_PARTIAL');

      if (!isAcc && (flagsArr.some((f) => String(f).toLowerCase().includes('late') && !String(f).includes('EXCUSED')) || isPartial || isLate)) {
        isLate = true;
        if (lateMinutes === 0) lateMinutes = 15;
        if (isPartial) {
          const remM = s.late_remaining_minutes != null ? s.late_remaining_minutes : Math.max(0, lateMinutes - (s.late_excused_minutes || 0));
          lateMinutes = remM;
        }
      } else if (isAcc) {
        isLate = false;
      }

      if (isLate && lateMinutes > 0) {
        totalLateMinutes += lateMinutes;
        lateOccurrences.push({
          date: inWita.dateStr,
          minutes: lateMinutes,
          text: isPartial
            ? `• ${inWita.dayName}, ${inWita.dateStr}: ${lateMinutes}m (Sisa Partial, Toleransi ${s.late_excused_minutes || 0}m)`
            : `• ${inWita.dayName}, ${inWita.dateStr}: ${lateMinutes}m (Masuk ${inWita.timeStr})`
        });
      }
    });

    // 3. Approved Leave / Sakit / Cuti
    let totalIzinDays = 0;
    const leaveDetails = [];

    (leaveRequests || []).forEach((req) => {
      if (!matchesStaff(req)) return;
      if (req.status !== 'APPROVED') return;

      const startInMonth = !monthPrefix || (req.start_date || '').startsWith(monthPrefix);
      const endInMonth = !monthPrefix || (req.end_date || '').startsWith(monthPrefix);
      if (!startInMonth && !endInMonth) return;

      const days = Number(req.requested_days || req.days || 1);
      const kind = req.category === 'SAKIT' ? 'Sakit' : req.type === 'CUTI' ? 'Cuti' : (req.category === 'IZIN_PULANG_AWAL' ? 'Pulang Awal' : 'Izin');
      if (req.category === 'EARLY_DEPARTURE') return;

      totalIzinDays += days;
      const dateLabel = req.end_date && req.end_date !== req.start_date
        ? `${formatWitaDateOnly(req.start_date)}–${formatWitaDateOnly(req.end_date)}`
        : formatWitaDateOnly(req.start_date);
      leaveDetails.push(`• ${dateLabel}: ${kind} (${days} hr)`);
    });

    // 4. Approved / Partial Overtime Logs (including staff's written reason!)
    let totalOvertimeMinutes = 0;
    const overtimeDetails = [];

    (overtimeLogs || []).forEach((ot) => {
      if (!matchesStaff(ot)) return;
      if (ot.status !== 'APPROVED' && ot.status !== 'PARTIAL') return;
      if (monthPrefix && !String(ot.overtime_date || '').startsWith(monthPrefix)) return;

      const mins = Number(ot.approved_minutes || 0);
      if (mins <= 0) return;

      totalOvertimeMinutes += mins;
      const dParts = String(ot.overtime_date || '').split('-');
      const shortDate = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}` : ot.overtime_date;
      const timeRange = `${ot.start_time_hm || ''}${ot.end_time_hm ? `–${ot.end_time_hm}` : ''}`;
      const accLabel = ot.status === 'PARTIAL' ? `ACC Partial ${formatMinutesShort(mins)}` : `ACC Penuh ${formatMinutesShort(mins)}`;
      const reasonTxt = ot.reason ? ` — "${ot.reason}"` : '';
      overtimeDetails.push(`• ${shortDate} (${timeRange}) [${accLabel}]${reasonTxt}`);
    });

    // 5. Total Points (0 if none)
    const ptEntry = (staffPointTotals || []).find((p) => matchesStaff(p));
    const totalPoints = Number(ptEntry?.total_points ?? 0);

    // Status Payroll indicator
    let statusLabel = '🟢 BERSIH';
    let statusBg = 'FFDCFCE7';
    let statusText = 'FF166534';
    if (totalPoints >= 50 || totalLateMinutes > 30) {
      statusLabel = totalPoints >= 50 ? '🔴 PERLU CEK POIN' : '🔴 TELAT TINGGI';
      statusBg = 'FFFEE2E2';
      statusText = 'FF991B1B';
    } else if (totalLateMinutes > 0 || totalPoints > 0) {
      statusLabel = totalPoints > 0 && totalLateMinutes > 0
        ? '🟡 TELAT & POIN'
        : totalPoints > 0
        ? '🟠 ADA POIN'
        : '🟡 TELAT RINGAN';
      statusBg = 'FFFEF3C7';
      statusText = 'FF92400E';
    }

    return {
      staff,
      staffCode: staff.legacy_code || staff.id || '-',
      division: staff.division || 'Umum',
      role: staff.role || staff.division || '-',
      actualWorkDays,
      manualAdjSum,
      totalHariKerja,
      totalLateMinutes,
      lateOccurrences,
      totalIzinDays,
      leaveDetails,
      totalOvertimeMinutes,
      overtimeDetails,
      totalPoints,
      statusLabel,
      statusBg,
      statusText
    };
  });

  // Calculate Overall Venue Stats for KPI Cards
  const totalStaffCount = staffMetrics.length;
  const venueTotalHariKerja = staffMetrics.reduce((sum, s) => sum + s.totalHariKerja, 0);
  const venueTotalLateMinutes = staffMetrics.reduce((sum, s) => sum + s.totalLateMinutes, 0);
  const venueTotalOvertimeMinutes = staffMetrics.reduce((sum, s) => sum + s.totalOvertimeMinutes, 0);
  const venueTotalIzin = staffMetrics.reduce((sum, s) => sum + s.totalIzinDays, 0);

  // 1. BANNER TITLE ROW (Row 1)
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${venueTitle} — REKAPITULASI ABSENSI & PERHITUNGAN GAJI`;
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.primaryArgb } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  // 2. SUBTITLE & METADATA (Row 2)
  worksheet.mergeCells('A2:M2');
  const subCell = worksheet.getCell('A2');
  const startFmt = periodStart ? formatWitaDateOnly(periodStart) : '-';
  const endFmt = periodEnd ? formatWitaDateOnly(periodEnd) : '-';
  const cleanExportTime = String(exportTimestamp || '').replace(/\s*WITA\s*$/i, '') + ' WITA';
  subCell.value = `Periode: ${startFmt} s/d ${endFmt}  |  Exported: ${cleanExportTime}  |  Termasuk: Hari Kerja, Menit Telat, Izin, Lembur ACC (+Alasan), & Total Poin`;
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.secondaryArgb } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // 3. STATS SUMMARY KPI CARDS (Row 4)
  worksheet.getRow(3).height = 10;

  worksheet.mergeCells('A4:B4');
  formatKpiCard(worksheet, 'A4', 'TOTAL KARYAWAN', `${totalStaffCount} Orang`, 'FFF1F5F9', 'FF0F172A');

  worksheet.mergeCells('C4:E4');
  formatKpiCard(worksheet, 'C4', 'TOTAL HARI KERJA', `${venueTotalHariKerja} Hari`, 'FFD1FAE5', 'FF065F46');

  worksheet.mergeCells('F4:G4');
  formatKpiCard(
    worksheet,
    'F4',
    'TOTAL MENIT TELAT',
    `${venueTotalLateMinutes} mnt`,
    venueTotalLateMinutes > 0 ? 'FFFEE2E2' : 'FFDCFCE7',
    venueTotalLateMinutes > 0 ? 'FF991B1B' : 'FF166534'
  );

  worksheet.mergeCells('H4:I4');
  formatKpiCard(worksheet, 'H4', 'TOTAL IZIN / CUTI', `${venueTotalIzin} Hari`, 'FFE0F2FE', 'FF075985');

  worksheet.mergeCells('J4:M4');
  formatKpiCard(
    worksheet,
    'J4',
    'TOTAL LEMBUR (ACC)',
    `${formatMinutesShort(venueTotalOvertimeMinutes)} (${venueTotalOvertimeMinutes} mnt)`,
    'FFEDE9FE',
    'FF5B21B6'
  );
  worksheet.getRow(4).height = 26;

  worksheet.getRow(5).height = 12;

  // 4. TABLE COLUMNS HEADER (Row 6)
  const columns = [
    { key: 'no', header: 'No.', width: 6 },
    { key: 'staff_id', header: 'ID Staff', width: 14 },
    { key: 'name', header: 'Nama Staff', width: 24 },
    { key: 'role', header: 'Jabatan / Divisi', width: 22 },
    { key: 'work_days', header: 'Hari Kerja', width: 15 },
    { key: 'late_mins', header: 'Total Telat (Menit)', width: 17 },
    { key: 'late_detail', header: 'Detail Tanggal & Menit Telat', width: 42 },
    { key: 'izin_count', header: 'Jml Izin / Cuti', width: 15 },
    { key: 'izin_detail', header: 'Detail Tanggal Izin', width: 36 },
    { key: 'ot_total', header: 'Total Lembur (ACC)', width: 19 },
    { key: 'ot_detail', header: 'Detail Lembur & Alasan Staff', width: 48 },
    { key: 'points', header: 'Total Poin', width: 13 },
    { key: 'status', header: 'Status Payroll', width: 18 }
  ];

  const headerRow = worksheet.getRow(6);
  headerRow.height = 30;

  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.headerArgb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Group staff metrics by Division
  const divisionMap = new Map();
  staffMetrics.forEach((item) => {
    const div = item.division || 'Lainnya';
    if (!divisionMap.has(div)) divisionMap.set(div, []);
    divisionMap.get(div).push(item);
  });

  let currentRowIdx = 7;
  let globalStaffNumber = 1;

  for (const [divisionName, divStaffList] of divisionMap.entries()) {
    // 5. DIVISION GROUP BANNER ROW
    worksheet.mergeCells(`A${currentRowIdx}:M${currentRowIdx}`);
    const divBanner = worksheet.getCell(`A${currentRowIdx}`);
    divBanner.value = `📁 DIVISI: ${divisionName.toUpperCase()} (${divStaffList.length} Karyawan)`;
    divBanner.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    divBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.divisionBannerArgb } };
    divBanner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(currentRowIdx).height = 25;
    currentRowIdx++;

    let divTotalHariKerja = 0;
    let divTotalLateMins = 0;
    let divTotalIzin = 0;
    let divTotalOvertimeMins = 0;
    let divTotalPoints = 0;

    divStaffList.forEach((metric, sIdx) => {
      const row = worksheet.getRow(currentRowIdx);
      const isEven = sIdx % 2 === 0;
      const baseBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      divTotalHariKerja += metric.totalHariKerja;
      divTotalLateMins += metric.totalLateMinutes;
      divTotalIzin += metric.totalIzinDays;
      divTotalOvertimeMins += metric.totalOvertimeMinutes;
      divTotalPoints += metric.totalPoints;

      const lateText = metric.lateOccurrences.length > 0
        ? metric.lateOccurrences.map((o) => o.text).join('\n')
        : '✓ Tepat Waktu';

      const izinText = metric.leaveDetails.length > 0
        ? metric.leaveDetails.join('\n')
        : '-';

      const otText = metric.overtimeDetails.length > 0
        ? metric.overtimeDetails.join('\n')
        : '-';

      const lineCount = Math.max(
        metric.lateOccurrences.length,
        metric.leaveDetails.length,
        metric.overtimeDetails.length,
        1
      );
      row.height = Math.max(26, lineCount * 17 + 8);

      const workDaysText = metric.manualAdjSum !== 0
        ? `${metric.totalHariKerja} Hari (${metric.actualWorkDays}${metric.manualAdjSum > 0 ? '+' : ''}${metric.manualAdjSum})`
        : `${metric.totalHariKerja} Hari`;

      const otTotalText = metric.totalOvertimeMinutes > 0
        ? `${formatMinutesShort(metric.totalOvertimeMinutes)} (${metric.totalOvertimeMinutes}m)`
        : '0';

      row.values = [
        globalStaffNumber++,
        metric.staffCode,
        metric.staff.name || '-',
        metric.role,
        workDaysText,
        `${metric.totalLateMinutes} mnt`,
        lateText,
        metric.totalIzinDays > 0 ? `${metric.totalIzinDays} Hari` : '0',
        izinText,
        otTotalText,
        otText,
        metric.totalPoints,
        metric.statusLabel
      ];

      for (let c = 1; c <= 13; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };

        if (c === 2) {
          cell.font = { name: 'Consolas', size: 9, color: { argb: 'FF475569' } };
        }
        if (c === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        }
        if (c === 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
        // Col 5: Hari Kerja
        if (c === 5 && metric.totalHariKerja > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF166534' } };
        }
        // Col 6: Total Telat (Menit) Color Code
        if (c === 6) {
          if (metric.totalLateMinutes === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF166534' } };
          } else if (metric.totalLateMinutes <= 30) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
          }
        }
        // Col 7: Detail Telat
        if (c === 7) {
          cell.alignment = { vertical: 'middle', horizontal: metric.lateOccurrences.length > 0 ? 'left' : 'center', wrapText: true, indent: metric.lateOccurrences.length > 0 ? 1 : 0 };
          cell.font = { name: 'Segoe UI', size: 9, color: { argb: metric.lateOccurrences.length > 0 ? 'FF991B1B' : 'FF166534' } };
        }
        // Col 8: Jml Izin Color Code
        if (c === 8 && metric.totalIzinDays > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF075985' } };
        }
        // Col 9: Detail Izin
        if (c === 9) {
          cell.alignment = { vertical: 'middle', horizontal: metric.leaveDetails.length > 0 ? 'left' : 'center', wrapText: true, indent: metric.leaveDetails.length > 0 ? 1 : 0 };
        }
        // Col 10: Total Lembur ACC Color Code
        if (c === 10 && metric.totalOvertimeMinutes > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF5B21B6' } };
        }
        // Col 11: Detail Lembur & Alasan Staff
        if (c === 11) {
          cell.alignment = { vertical: 'middle', horizontal: metric.overtimeDetails.length > 0 ? 'left' : 'center', wrapText: true, indent: metric.overtimeDetails.length > 0 ? 1 : 0 };
          if (metric.overtimeDetails.length > 0) {
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF4C1D95' } };
          }
        }
        // Col 12: Total Poin Color Code (0 = Green, 1-49 = Orange, >=50 = Red)
        if (c === 12) {
          if (metric.totalPoints === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF166534' } };
          } else if (metric.totalPoints < 50) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF9A3412' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
          }
        }
        // Col 13: Status Payroll
        if (c === 13) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: metric.statusBg } };
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: metric.statusText } };
        }
      }

      currentRowIdx++;
    });

    // 6. DIVISION SUBTOTAL ROW
    worksheet.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
    const subtotalLabel = worksheet.getCell(`A${currentRowIdx}`);
    subtotalLabel.value = `SUBTOTAL ${divisionName.toUpperCase()} (${divStaffList.length} Orang)`;
    subtotalLabel.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    subtotalLabel.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    const subtotalRow = worksheet.getRow(currentRowIdx);
    subtotalRow.height = 24;

    const subtotalValues = {
      5: `${divTotalHariKerja} Hari`,
      6: `${divTotalLateMins} mnt`,
      7: '-',
      8: `${divTotalIzin} Hari`,
      9: '-',
      10: divTotalOvertimeMins > 0 ? formatMinutesShort(divTotalOvertimeMins) : '0',
      11: '-',
      12: divTotalPoints,
      13: '-'
    };

    for (let c = 1; c <= 13; c++) {
      const cell = subtotalRow.getCell(c);
      if (c >= 5 && subtotalValues[c] !== undefined) {
        cell.value = subtotalValues[c];
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'double', color: { argb: 'FF64748B' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    currentRowIdx++;
  }

  // 7. VENUE GRAND TOTAL ROW
  worksheet.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
  const grandLabel = worksheet.getCell(`A${currentRowIdx}`);
  grandLabel.value = `GRAND TOTAL ${venueTitle} (${totalStaffCount} Orang)`;
  grandLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  grandLabel.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

  const grandRow = worksheet.getRow(currentRowIdx);
  grandRow.height = 28;

  const venueTotalPoints = staffMetrics.reduce((s, m) => s + m.totalPoints, 0);
  const grandValues = {
    5: `${venueTotalHariKerja} Hari`,
    6: `${venueTotalLateMinutes} mnt`,
    7: '-',
    8: `${venueTotalIzin} Hari`,
    9: '-',
    10: venueTotalOvertimeMinutes > 0 ? formatMinutesShort(venueTotalOvertimeMinutes) : '0',
    11: '-',
    12: venueTotalPoints,
    13: '-'
  };

  for (let c = 1; c <= 13; c++) {
    const cell = grandRow.getCell(c);
    if (c >= 5 && grandValues[c] !== undefined) {
      cell.value = grandValues[c];
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.primaryArgb } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  }

  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });
}

/**
 * Builds the Detail Completed Shifts sheet (strictly excluding on-process / uncompleted shifts).
 */
function buildCompletedShiftsDetailSheet({ workbook, shifts = [], exportTimestamp = '' }) {
  const worksheet = workbook.addWorksheet('Rincian Shift Selesai', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  // Filter strictly completed shifts
  const completedShifts = shifts.filter(
    (s) =>
      (s.status === 'COMPLETED' || (s.checkout_time && s.status !== 'IN_PROGRESS' && s.status !== 'ON_DUTY')) &&
      s.checkin_time
  );

  // 1. BANNER TITLE ROW (Row 1)
  worksheet.mergeCells('A1:N1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'RINCIAN SELURUH SHIFT SELESAI (AUDIT & CROSS-CHECK GAJI)';
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 34;

  // 2. SUBTITLE (Row 2)
  worksheet.mergeCells('A2:N2');
  const subCell = worksheet.getCell('A2');
  const cleanExportTime = String(exportTimestamp || '').replace(/\s*WITA\s*$/i, '') + ' WITA';
  subCell.value = `Exported: ${cleanExportTime}  |  Total Shift Selesai: ${completedShifts.length} Record  |  Shift Aktif/Sedang Berjalan (On-Process) Tidak Dicantumkan`;
  subCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 10;

  // 3. TABLE HEADERS (Row 4)
  const columns = [
    { key: 'no', header: 'No.', width: 6 },
    { key: 'date', header: 'Tanggal', width: 14 },
    { key: 'venue', header: 'Outlet / Venue', width: 16 },
    { key: 'division', header: 'Divisi / Bagian', width: 20 },
    { key: 'shift', header: 'Shift & Jadwal', width: 18 },
    { key: 'staff_name', header: 'Nama Karyawan', width: 26 },
    { key: 'checkin_time', header: 'Jam Masuk', width: 15 },
    { key: 'break_start_time', header: 'Mulai Istirahat', width: 16 },
    { key: 'break_end_time', header: 'Selesai Istirahat', width: 16 },
    { key: 'break_duration', header: 'Durasi Istirahat', width: 16 },
    { key: 'checkout_time', header: 'Jam Pulang', width: 15 },
    { key: 'work_duration', header: 'Durasi Kerja', width: 15 },
    { key: 'status', header: 'Status Shift', width: 16 },
    { key: 'flags', header: 'Audit Flags & Catatan', width: 36 }
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;

  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Populate data rows (Row 5 onward)
  completedShifts.forEach((shift, index) => {
    const rowNumber = 5 + index;
    const row = worksheet.getRow(rowNumber);
    row.height = 24;

    const isEven = index % 2 === 0;
    const baseBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    const isJP = (shift.staff_venue || shift.venue || '').toLowerCase().includes('jp');
    const venueText = shift.staff_venue || shift.venue || (isJP ? 'JP Karaoke' : 'LuckyCat');

    const flagsArr = Array.isArray(shift.flags) ? shift.flags : [];
    const hasFlags = flagsArr.length > 0;
    const flagText = hasFlags ? flagsArr.join(', ') : '✓ NORMAL';

    const breakDurationText = shift.break_duration_minutes
      ? `${shift.break_duration_minutes} Menit`
      : '-';

    const workDurationText = shift.duration_minutes
      ? formatDuration(shift.duration_minutes)
      : '-';

    const shiftInfo = resolveShift(shift);

    row.values = [
      index + 1,
      shift.date || (shift.checkin_time ? formatWitaDateOnly(shift.checkin_time) : '-'),
      venueText,
      shift.staff_division || shift.division || '-',
      `${shiftInfo.badgeLabel} (${shiftInfo.timeRange})`,
      shift.staff_name || '-',
      shift.checkin_time ? formatWitaTimeOnly(shift.checkin_time) : '-',
      shift.break_start_time ? formatWitaTimeOnly(shift.break_start_time) : '-',
      shift.break_end_time ? formatWitaTimeOnly(shift.break_end_time) : '-',
      breakDurationText,
      shift.checkout_time ? formatWitaTimeOnly(shift.checkout_time) : '-',
      workDurationText,
      'COMPLETED',
      flagText
    ];

    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBgColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (c === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      }

      if (c === 3) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isJP ? 'FFF3E8FF' : 'FFFEF3C7' }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: true,
          color: { argb: isJP ? 'FF6B21A8' : 'FF92400E' }
        };
      }

      if (c === 13) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
      }

      if (c === 14) {
        cell.alignment = { vertical: 'middle', horizontal: hasFlags ? 'left' : 'center', indent: hasFlags ? 1 : 0 };
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: hasFlags,
          color: { argb: hasFlags ? 'FF9F1239' : 'FF166534' }
        };
      }
    }
  });

  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });
}

/**
 * Builds the Detail Lateness sheet with dates, times, minutes late, reason, and manager review status.
 */
function buildLatenessDetailSheet({ workbook, shifts = [], allStaff = [], exportTimestamp = '' }) {
  const worksheet = workbook.addWorksheet('Rincian Log Keterlambatan', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  // Filter shifts that were late
  const lateShifts = [];
  shifts.forEach((s) => {
    if (!s.checkin_time) return;
    const inWita = getWitaComponents(s.checkin_time);
    if (!inWita) return;

    const matchedStaff = (allStaff || []).find(
      (st) =>
        String(st.id) === String(s.staff_id) ||
        (st.uuid && String(st.uuid) === String(s.staff_id)) ||
        (st.name || '').trim().toLowerCase() === (s.staff_name || '').trim().toLowerCase()
    );

    const isMgmt = (matchedStaff?.division || s.staff_division || s.division || '').toLowerCase().includes('management');
    const schedStart = s.scheduled_start || matchedStaff?.shift_start || '13:00';
    let isLate = false;
    let lateMinutes = 0;

    if (!isMgmt && schedStart && schedStart.includes(':') && schedStart !== '00:00' && schedStart !== 'FLEXIBLE') {
      const [sh, sm] = schedStart.split(':').map(Number);
      const schedM = sh * 60 + sm;
      let diff = inWita.totalMinutes - schedM;
      if (diff < -720) diff += 1440;
      if (diff > 720) diff -= 1440;
      if (diff > 10) {
        isLate = true;
        lateMinutes = diff;
      }
    }

    let flagsArr = [];
    try {
      flagsArr = Array.isArray(s.flags) ? s.flags : JSON.parse(s.flags || '[]');
    } catch {
      flagsArr = [];
    }

    const isAcc = flagsArr.some((f) => String(f).includes('LATE_APPROVED')) || flagsArr.includes('FLAG_LATE_EXCUSED') || s.late_status === 'APPROVED' || s.late_excused === 1;
    const isPartial = flagsArr.includes('FLAG_LATE_PARTIAL') || s.late_status === 'PARTIAL_APPROVED';
    const isRejected = flagsArr.some((f) => String(f).includes('LATE_REJECTED')) || s.late_status === 'REJECTED';

    const hasLateFlag = flagsArr.some((f) => String(f).toLowerCase().includes('late') && !String(f).includes('EXCUSED')) || isPartial;
    if (hasLateFlag) {
      isLate = true;
      if (lateMinutes === 0) lateMinutes = 15;
    }

    if (isLate) {
      const origMinutes = s.late_original_minutes || lateMinutes;
      const effectiveLateMinutes = isPartial && s.late_remaining_minutes != null ? s.late_remaining_minutes : lateMinutes;
      const statusText = isAcc
        ? 'Di-ACC Manajer'
        : isPartial
        ? `ACC Sebagian (Toleransi ${s.late_excused_minutes || 0}m)`
        : isRejected
        ? 'Ditolak'
        : 'Menunggu Review';

      lateShifts.push({
        shift: s,
        inWita,
        schedStart,
        lateMinutes: effectiveLateMinutes,
        originalLateMinutes: origMinutes,
        statusText,
        isAcc,
        isPartial,
        isRejected,
        staffName: s.staff_name || matchedStaff?.name || '-',
        venue: s.staff_venue || s.venue || matchedStaff?.venue || '-',
        division: s.staff_division || s.division || matchedStaff?.division || '-',
        reason: s.late_reason || s.notes || 'Tidak ada alasan tertulis',
        reviewer: s.late_reviewed_by || s.reviewed_by || '-'
      });
    }
  });

  // Sort by checkin time descending
  lateShifts.sort((a, b) => new Date(b.shift.checkin_time).getTime() - new Date(a.shift.checkin_time).getTime());

  // 1. Title Banner
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'RINCIAN LOG KETERLAMBATAN STAFF (DETAIL TANGGAL, JAM & ALASAN)';
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Red 800
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 34;

  // 2. Subtitle
  worksheet.mergeCells('A2:K2');
  const subCell = worksheet.getCell('A2');
  const cleanExportTime = String(exportTimestamp || '').replace(/\s*WITA\s*$/i, '') + ' WITA';
  subCell.value = `Exported: ${cleanExportTime}  |  Total Kejadian Telat (>10 Menit Grace Period): ${lateShifts.length} Kejadian  |  Acuan Evaluasi Gaji & Disiplin`;
  subCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FFFEE2E2' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F1D1D' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 10;

  // 3. Headers
  const columns = [
    { key: 'no', header: 'No.', width: 6 },
    { key: 'date', header: 'Hari & Tanggal', width: 20 },
    { key: 'staff_name', header: 'Nama Karyawan', width: 26 },
    { key: 'venue', header: 'Outlet / Venue', width: 16 },
    { key: 'division', header: 'Divisi / Bagian', width: 22 },
    { key: 'sched_start', header: 'Jadwal Masuk', width: 15 },
    { key: 'actual_in', header: 'Jam Masuk', width: 17 },
    { key: 'late_minutes', header: 'Keterlambatan', width: 16 },
    { key: 'reason', header: 'Alasan Tertulis Karyawan', width: 42 },
    { key: 'status', header: 'Status Review', width: 18 },
    { key: 'reviewer', header: 'Reviewer / Manajer', width: 20 }
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F1D1D' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // 4. Data Rows
  lateShifts.forEach((item, index) => {
    const rowIdx = index + 5;
    const row = worksheet.getRow(rowIdx);
    row.height = 24;

    const isEven = index % 2 === 0;
    const baseBg = isEven ? 'FFFFFFFF' : 'FFFDF2F2';

    row.values = [
      index + 1,
      `${item.inWita.dayName}, ${item.inWita.fullDateStr}`,
      item.staffName,
      item.venue,
      item.division,
      item.schedStart ? `${item.schedStart} WITA` : '-',
      item.shift.checkin_time ? `${item.inWita.timeStr} WITA` : '-',
      item.isPartial
        ? `+${item.lateMinutes}m (dari ${item.originalLateMinutes}m, ACC ${item.shift?.late_excused_minutes || 0}m)`
        : `+${item.lateMinutes} Menit`,
      `"${item.reason}"`,
      item.statusText,
      item.reviewer
    ];

    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (c === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      }
      if (c === 8) {
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
      }
      if (c === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF334155' } };
      }
      if (c === 10) {
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: true,
          color: { argb: item.isAcc ? 'FF166534' : item.isRejected ? 'FF991B1B' : 'FFB45309' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: item.isAcc ? 'FFDCFCE7' : item.isRejected ? 'FFFEE2E2' : 'FFFEF3C7' }
        };
      }
    }
  });

  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });
}

/**
 * Builds the Detail Leave & Cuti Requests sheet with category, date range, requested days, reason, and manager approval notes.
 */
function buildLeaveRequestsDetailSheet({ workbook, leaveRequests = [], exportTimestamp = '' }) {
  const worksheet = workbook.addWorksheet('Rincian Izin & Cuti', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const list = [...(leaveRequests || [])].sort(
    (a, b) => new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime()
  );

  // 1. Title Banner
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'RINCIAN SELURUH PENGAJUAN IZIN & CUTI KARYAWAN (AUDIT HRD & GAJI)';
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } }; // Purple 900
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 34;

  // 2. Subtitle
  worksheet.mergeCells('A2:L2');
  const subCell = worksheet.getCell('A2');
  const cleanExportTime = String(exportTimestamp || '').replace(/\s*WITA\s*$/i, '') + ' WITA';
  subCell.value = `Exported: ${cleanExportTime}  |  Total Pengajuan: ${list.length} Data  |  Termasuk Cuti, Sakit, Izin Biasa & Izin Pulang Awal`;
  subCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FFF3E8FF' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 10;

  // 3. Headers
  const columns = [
    { key: 'no', header: 'No.', width: 6 },
    { key: 'staff_name', header: 'Nama Karyawan', width: 26 },
    { key: 'venue', header: 'Outlet / Venue', width: 16 },
    { key: 'division', header: 'Divisi / Bagian', width: 22 },
    { key: 'category', header: 'Jenis / Kategori', width: 20 },
    { key: 'period', header: 'Periode Tanggal', width: 28 },
    { key: 'days', header: 'Jumlah Hari', width: 14 },
    { key: 'reason', header: 'Alasan Pengajuan', width: 40 },
    { key: 'status', header: 'Status Review', width: 18 },
    { key: 'approved_days', header: 'Hari Di-ACC', width: 14 },
    { key: 'reviewer', header: 'Di-Review Oleh', width: 20 },
    { key: 'notes', header: 'Catatan Manajer', width: 34 }
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  list.forEach((req, index) => {
    const rowIdx = index + 5;
    const row = worksheet.getRow(rowIdx);
    row.height = 24;

    const isEven = index % 2 === 0;
    const baseBg = isEven ? 'FFFFFFFF' : 'FFFAF5FF';

    const isApproved = req.status === 'APPROVED';
    const isAdjusted = req.status === 'ADJUSTED';
    const isRejected = req.status === 'REJECTED';

    const statusLabel = isApproved
      ? 'Disetujui Penuh'
      : isAdjusted
      ? 'ACC Parsial'
      : isRejected
      ? 'Ditolak'
      : 'Menunggu Review';

    const categoryLabel =
      req.category === 'SAKIT'
        ? 'Sakit (Surat Dokter)'
        : req.type === 'CUTI'
        ? 'Cuti Tahunan'
        : req.category === 'IZIN_PULANG_AWAL'
        ? `Izin Pulang Awal (${req.departure_time || '-'})`
        : 'Izin Tidak Masuk';

    const periodStr =
      req.category === 'IZIN_PULANG_AWAL'
        ? formatWitaDateOnly(req.start_date)
        : `${formatWitaDateOnly(req.start_date)} s/d ${formatWitaDateOnly(req.end_date)}`;

    row.values = [
      index + 1,
      req.staff_name || '-',
      req.staff_venue || '-',
      req.staff_division || '-',
      categoryLabel,
      periodStr,
      `${req.requested_days || 1} Hari`,
      `"${req.reason || '-'}"`,
      statusLabel,
      isApproved ? `${req.requested_days || 1} Hari` : isAdjusted ? `${req.approved_days || 1} Hari` : '0 Hari',
      req.reviewed_by || '-',
      req.manager_notes || '-'
    ];

    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (c === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      }
      if (c === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF334155' } };
      }
      if (c === 9) {
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: true,
          color: {
            argb: isApproved ? 'FF166534' : isAdjusted ? 'FF1E40AF' : isRejected ? 'FF991B1B' : 'FFB45309'
          }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: isApproved ? 'FFDCFCE7' : isAdjusted ? 'FFDBEAFE' : isRejected ? 'FFFEE2E2' : 'FFFEF3C7'
          }
        };
      }
    }
  });

  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });
}

/**
 * Main export function: Generates the Executive Month-to-Date Payroll & Attendance Report
 * - Sheet 1: Rekap Gaji JP Karaoke (All JP Staff grouped by Division, month-to-date)
 * - Sheet 2: Rekap Gaji LuckyCat (All LuckyCat Staff grouped by Division, month-to-date)
 * - Sheet 3: Rincian Log Keterlambatan (Detailed dates, times, minutes late, reason, manager review status)
 * - Sheet 4: Rincian Izin & Cuti (Detailed leave requests, category, dates, days, written reason, review status)
 * - Sheet 5: Rincian Shift Selesai (Completed shifts log month-to-date, strictly no in-progress)
 */
export async function exportMonthlyPayrollReport({
  shifts = [],
  allStaff = [],
  leaveRequests = [],
  dayAdjustments = [],
  overtimeLogs = [],
  staffPointTotals = [],
  schedules = [],
  periodStart = '',
  periodEnd = '',
  exportTimestamp = ''
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JP Karaoke & LuckyCat Management System';
  workbook.lastModifiedBy = 'Payroll & Operational Manager Audit';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Filter completed shifts strictly
  const completedShifts = (shifts || []).filter(
    (s) =>
      (s.status === 'COMPLETED' || (s.checkout_time && s.status !== 'IN_PROGRESS' && s.status !== 'ON_DUTY')) &&
      s.checkin_time
  );

  // Separate staff by Venue
  const jpStaff = (allStaff || []).filter((s) => (s.venue || '').toLowerCase().includes('jp'));
  const lcStaff = (allStaff || []).filter((s) => !(s.venue || '').toLowerCase().includes('jp'));

  // Sort staff within division
  const divisionOrderJP = ['Server and Cashier', 'Cleaning Service', 'Storage Staff', 'Management'];
  const divisionOrderLC = ['Bar, Cashier, and Server', 'Kitchen', 'Cleaning Service', 'Management'];

  const sortStaffByDivision = (staffList, orderList) => {
    return [...staffList].sort((a, b) => {
      const idxA = orderList.findIndex((d) => (a.division || '').toLowerCase().includes(d.toLowerCase()));
      const idxB = orderList.findIndex((d) => (b.division || '').toLowerCase().includes(d.toLowerCase()));
      const sortA = idxA === -1 ? 99 : idxA;
      const sortB = idxB === -1 ? 99 : idxB;
      if (sortA !== sortB) return sortA - sortB;
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const sortedJpStaff = sortStaffByDivision(jpStaff, divisionOrderJP);
  const sortedLcStaff = sortStaffByDivision(lcStaff, divisionOrderLC);

  // Sheet 1: Rekap Gaji JP Karaoke
  buildVenuePayrollSheet({
    workbook,
    sheetName: 'Rekap Gaji JP Karaoke',
    venueTitle: 'JP KARAOKE',
    theme: {
      primaryArgb: 'FF0F172A', // Slate 900
      secondaryArgb: 'FF1E293B', // Slate 800
      headerArgb: 'FF1E3A8A', // Deep Blue
      divisionBannerArgb: 'FF2563EB' // Royal Blue
    },
    staffList: sortedJpStaff,
    shifts: completedShifts,
    leaveRequests,
    dayAdjustments,
    overtimeLogs,
    staffPointTotals,
    schedules,
    periodStart,
    periodEnd,
    exportTimestamp
  });

  // Sheet 2: Rekap Gaji LuckyCat
  buildVenuePayrollSheet({
    workbook,
    sheetName: 'Rekap Gaji LuckyCat',
    venueTitle: 'LUCKYCAT',
    theme: {
      primaryArgb: 'FF78350F', // Warm Amber 900
      secondaryArgb: 'FF451A03', // Dark Amber 950
      headerArgb: 'FFB45309', // Amber 700
      divisionBannerArgb: 'FF1E293B' // Slate 800
    },
    staffList: sortedLcStaff,
    shifts: completedShifts,
    leaveRequests,
    dayAdjustments,
    overtimeLogs,
    staffPointTotals,
    schedules,
    periodStart,
    periodEnd,
    exportTimestamp
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  if (typeof window !== 'undefined' && window.URL && window.document) {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const periodLabel = periodStart && periodEnd ? `${periodStart}_sd_${periodEnd}` : 'Bulan_Berjalan';
    const filename = `Rekap_Gaji_Absensi_JPLC_${periodLabel}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return buffer;
}

/**
 * Backward compatibility alias for single-view timesheet export
 */
export async function exportTimesheetToExcel({ shifts = [], venueName = 'JP Karaoke & Lucky Cat Outlets' }) {
  // If shifts were passed, we delegate to exportMonthlyPayrollReport or default export
  return exportMonthlyPayrollReport({
    shifts,
    allStaff: [],
    leaveRequests: [],
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    exportTimestamp: formatWitaDateTime(new Date().toISOString())
  });
}
