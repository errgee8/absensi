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

/**
 * Builds a dedicated Payroll Recap sheet for a venue (JP Karaoke or LuckyCat),
 * grouped by division, displaying all staff month-to-date with late & early checkout logs.
 */
function buildVenuePayrollSheet({
  workbook,
  sheetName,
  venueTitle,
  theme,
  staffList = [],
  shifts = [],
  leaveRequests = [],
  periodStart = '',
  periodEnd = '',
  exportTimestamp = ''
}) {
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  // Calculate staff metrics
  const staffMetrics = staffList.map((staff) => {
    // 1. Completed shifts only (strictly exclude IN_PROGRESS or open shifts)
    const staffShifts = shifts.filter((s) => {
      const matchId = String(s.staff_id) === String(staff.id) || (staff.uuid && String(s.staff_id) === String(staff.uuid));
      const matchName = (s.staff_name || '').trim().toLowerCase() === (staff.name || '').trim().toLowerCase();
      const isCompleted = s.status === 'COMPLETED' || (s.checkout_time && s.status !== 'IN_PROGRESS' && s.status !== 'ON_DUTY');
      return (matchId || matchName) && isCompleted && s.checkin_time;
    });

    const totalHariKerja = staffShifts.length;
    const isMgmt = (staff.division || '').toLowerCase().includes('management');

    // 2. Late check-in occurrences
    const lateOccurrences = [];
    staffShifts.forEach((s) => {
      const inWita = getWitaComponents(s.checkin_time);
      if (!inWita) return;

      const schedStart = s.scheduled_start || staff.shift_start || '13:00';
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

      if (flagsArr.some((f) => String(f).toLowerCase().includes('late') && !String(f).includes('EXCUSED'))) {
        isLate = true;
        if (lateMinutes === 0) lateMinutes = 15;
      }

      if (isLate) {
        lateOccurrences.push({
          date: inWita.dateStr,
          text: `• ${inWita.dayName}, ${inWita.dateStr} jam ${inWita.timeStr} (Telat ${lateMinutes}m)`
        });
      }
    });

    // 3. Early checkout occurrences
    const earlyOccurrences = [];
    staffShifts.forEach((s) => {
      if (!s.checkout_time) return;
      const outWita = getWitaComponents(s.checkout_time);
      if (!outWita) return;

      const schedStart = s.scheduled_start || staff.shift_start || '13:00';
      const schedEnd = s.scheduled_end || staff.shift_end;
      let isEarly = false;
      let earlyMinutes = 0;

      if (!isMgmt && schedEnd && schedEnd.includes(':') && !s.is_flexible_checkout) {
        const [eh, em] = schedEnd.split(':').map(Number);
        const schedEndM = eh * 60 + em;
        const [sh, sm] = schedStart.split(':').map(Number);
        const isOvernight = schedEndM < (sh * 60 + sm);

        let diff = 0;
        if (!isOvernight) {
          const effectiveOut = outWita.totalMinutes < (sh * 60 + sm) ? outWita.totalMinutes + 1440 : outWita.totalMinutes;
          diff = schedEndM - effectiveOut;
        } else {
          const adjOut = outWita.totalMinutes >= 720 ? outWita.totalMinutes - 1440 : outWita.totalMinutes;
          diff = schedEndM - adjOut;
        }

        if (diff > 10) {
          isEarly = true;
          earlyMinutes = diff;
        }
      }

      let flagsArr = [];
      try {
        flagsArr = Array.isArray(s.flags) ? s.flags : JSON.parse(s.flags || '[]');
      } catch {
        flagsArr = [];
      }

      const hasEarlyFlag = flagsArr.some((f) => String(f).includes('EARLY_CHECKOUT'));
      const isEarlyAcc =
        flagsArr.some((f) => String(f).includes('EARLY_CHECKOUT_APPROVED')) ||
        (s.notes && String(s.notes).toLowerCase().includes('approved'));

      if (hasEarlyFlag) {
        isEarly = true;
        if (earlyMinutes === 0) earlyMinutes = 30;
      }

      if (isEarly) {
        const h = Math.floor(earlyMinutes / 60);
        const m = earlyMinutes % 60;
        const durStr = h > 0 ? (m > 0 ? `${h}j ${m}m` : `${h}j`) : `${m}m`;
        const statusStr = isEarlyAcc ? 'Di-ACC' : 'Tanpa Izin/Menunggu ACC';
        earlyOccurrences.push({
          date: outWita.dateStr,
          text: `• ${outWita.dayName}, ${outWita.dateStr} jam ${outWita.timeStr} (Kurang ${durStr} - ${statusStr})`
        });
      }
    });

    // 4. Approved Leave / Sakit / Cuti
    let totalIzinAcc = 0;
    let totalSakitAcc = 0;
    let totalCutiAcc = 0;
    const leaveNotes = [];

    const monthPrefix = periodStart ? periodStart.substring(0, 7) : '';

    (leaveRequests || []).forEach((req) => {
      const matchStaff =
        String(req.staff_id) === String(staff.id) ||
        (staff.uuid && String(req.staff_id) === String(staff.uuid)) ||
        (req.staff_name || '').trim().toLowerCase() === (staff.name || '').trim().toLowerCase();

      if (!matchStaff) return;
      if (req.status !== 'APPROVED') return;

      // Check if dates overlap with current month
      const startInMonth = (req.start_date || '').startsWith(monthPrefix);
      const endInMonth = (req.end_date || '').startsWith(monthPrefix);
      if (!startInMonth && !endInMonth) return;

      const days = Number(req.requested_days || req.days || 1);

      if (req.category === 'SAKIT') {
        totalSakitAcc += days;
        leaveNotes.push(`Sakit (${days} hr): ${req.start_date}`);
      } else if (req.type === 'CUTI') {
        totalCutiAcc += days;
        leaveNotes.push(`Cuti (${days} hr): ${req.start_date}`);
      } else if (req.type === 'IZIN' && req.category !== 'EARLY_DEPARTURE') {
        totalIzinAcc += days;
        leaveNotes.push(`Izin (${days} hr): ${req.start_date}`);
      }
    });

    const totalTidakMasuk = totalIzinAcc + totalSakitAcc + totalCutiAcc;

    return {
      staff,
      division: staff.division || 'Umum',
      totalHariKerja,
      lateCount: lateOccurrences.length,
      lateOccurrences,
      earlyCount: earlyOccurrences.length,
      earlyOccurrences,
      totalIzinAcc,
      totalSakitAcc,
      totalCutiAcc,
      totalTidakMasuk,
      leaveNotes
    };
  });

  // Calculate Overall Venue Stats for KPI Cards
  const totalStaffCount = staffMetrics.length;
  const venueTotalHariKerja = staffMetrics.reduce((sum, s) => sum + s.totalHariKerja, 0);
  const venueTotalTelat = staffMetrics.reduce((sum, s) => sum + s.lateCount, 0);
  const venueTotalPulangCepat = staffMetrics.reduce((sum, s) => sum + s.earlyCount, 0);
  const venueTotalTidakMasuk = staffMetrics.reduce((sum, s) => sum + s.totalTidakMasuk, 0);

  // 1. BANNER TITLE ROW (Row 1)
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${venueTitle} — REKAPITULASI ABSENSI & PENGHITUNGAN GAJI`;
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
  subCell.value = `Periode: ${startFmt} s/d ${endFmt} (S.d Saat Export)  |  Exported: ${cleanExportTime}  |  Status Data: Shift Selesai Saja (On-Process Dikecualikan)`;
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.secondaryArgb } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // 3. STATS SUMMARY KPI CARDS (Row 4)
  worksheet.getRow(3).height = 10; // spacing

  worksheet.mergeCells('A4:B4');
  formatKpiCard(worksheet, 'A4', 'TOTAL KARYAWAN', `${totalStaffCount} Orang`, 'FFF1F5F9', 'FF0F172A');

  worksheet.mergeCells('C4:D4');
  formatKpiCard(worksheet, 'C4', 'TOTAL HARI KERJA', `${venueTotalHariKerja} Shift`, 'FFD1FAE5', 'FF065F46');

  worksheet.mergeCells('E4:F4');
  formatKpiCard(
    worksheet,
    'E4',
    'TOTAL TERLAMBAT',
    `${venueTotalTelat}x Kejadian`,
    venueTotalTelat > 0 ? 'FFFFE4E6' : 'FFDCFCE7',
    venueTotalTelat > 0 ? 'FF9F1239' : 'FF166534'
  );

  worksheet.mergeCells('G4:H4');
  formatKpiCard(
    worksheet,
    'G4',
    'PULANG CEPAT',
    `${venueTotalPulangCepat}x Kejadian`,
    venueTotalPulangCepat > 0 ? 'FFFEF3C7' : 'FFDCFCE7',
    venueTotalPulangCepat > 0 ? 'FF92400E' : 'FF166534'
  );

  worksheet.mergeCells('I4:M4');
  formatKpiCard(worksheet, 'I4', 'TOTAL TIDAK MASUK (IZIN/SAKIT/CUTI ACC)', `${venueTotalTidakMasuk} Hari`, 'FFF3E8FF', 'FF6B21A8');
  worksheet.getRow(4).height = 26;

  worksheet.getRow(5).height = 12; // spacing

  // 4. TABLE COLUMNS HEADER (Row 6)
  const columns = [
    { key: 'no', header: 'No.', width: 6 },
    { key: 'name', header: 'Nama Karyawan', width: 28 },
    { key: 'division', header: 'Divisi / Bagian', width: 22 },
    { key: 'work_days', header: 'Total Hari Kerja', width: 17 },
    { key: 'late_count', header: 'Frekuensi Telat', width: 17 },
    { key: 'late_detail', header: 'Rincian Keterlambatan (Hari & Jam)', width: 44 },
    { key: 'early_count', header: 'Frekuensi Pulang Cepat', width: 20 },
    { key: 'early_detail', header: 'Rincian Pulang Cepat (Hari & Jam)', width: 44 },
    { key: 'izin_count', header: 'Total Izin (ACC)', width: 15 },
    { key: 'sakit_count', header: 'Total Sakit (ACC)', width: 15 },
    { key: 'cuti_count', header: 'Total Cuti (ACC)', width: 15 },
    { key: 'absent_count', header: 'Total Tidak Masuk', width: 18 },
    { key: 'notes', header: 'Catatan & Keterangan', width: 34 }
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
    if (!divisionMap.has(div)) {
      divisionMap.set(div, []);
    }
    divisionMap.get(div).push(item);
  });

  let currentRowIdx = 7;
  let globalStaffNumber = 1;

  for (const [divisionName, divStaffList] of divisionMap.entries()) {
    // 5. DIVISION GROUP BANNER ROW
    worksheet.mergeCells(`A${currentRowIdx}:M${currentRowIdx}`);
    const divBanner = worksheet.getCell(`A${currentRowIdx}`);
    divBanner.value = `📁 DIVISI: ${divisionName.toUpperCase()} (${divStaffList.length} Karyawan Terdaftar)`;
    divBanner.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    divBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.divisionBannerArgb } };
    divBanner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(currentRowIdx).height = 25;
    currentRowIdx++;

    let divTotalHariKerja = 0;
    let divTotalTelat = 0;
    let divTotalPulangCepat = 0;
    let divTotalIzin = 0;
    let divTotalSakit = 0;
    let divTotalCuti = 0;
    let divTotalTidakMasuk = 0;

    // Staff Data Rows
    divStaffList.forEach((metric, sIdx) => {
      const row = worksheet.getRow(currentRowIdx);
      const isEven = sIdx % 2 === 0;
      const baseBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      divTotalHariKerja += metric.totalHariKerja;
      divTotalTelat += metric.lateCount;
      divTotalPulangCepat += metric.earlyCount;
      divTotalIzin += metric.totalIzinAcc;
      divTotalSakit += metric.totalSakitAcc;
      divTotalCuti += metric.totalCutiAcc;
      divTotalTidakMasuk += metric.totalTidakMasuk;

      // Late text formatting
      const lateText =
        metric.lateOccurrences.length > 0
          ? metric.lateOccurrences.map((o) => o.text).join('\n')
          : '✓ Tepat Waktu';

      // Early checkout text formatting
      const earlyText =
        metric.earlyOccurrences.length > 0
          ? metric.earlyOccurrences.map((o) => o.text).join('\n')
          : '✓ Normal';

      // Notes text
      const notesText = metric.leaveNotes.length > 0 ? metric.leaveNotes.join('; ') : '-';

      // Dynamic row height based on line count in late/early details
      const lineCount = Math.max(metric.lateOccurrences.length, metric.earlyOccurrences.length, 1);
      row.height = Math.max(26, lineCount * 17 + 8);

      row.values = [
        globalStaffNumber++,
        metric.staff.name || '-',
        metric.division,
        metric.totalHariKerja > 0 ? `${metric.totalHariKerja} Hari` : '0',
        metric.lateCount > 0 ? `${metric.lateCount}x` : '0',
        lateText,
        metric.earlyCount > 0 ? `${metric.earlyCount}x` : '0',
        earlyText,
        metric.totalIzinAcc > 0 ? `${metric.totalIzinAcc} Hari` : '0',
        metric.totalSakitAcc > 0 ? `${metric.totalSakitAcc} Hari` : '0',
        metric.totalCutiAcc > 0 ? `${metric.totalCutiAcc} Hari` : '0',
        metric.totalTidakMasuk > 0 ? `${metric.totalTidakMasuk} Hari` : '0',
        notesText
      ];

      // Styling each cell in the row
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

        // Column 2: Nama Karyawan
        if (c === 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        }

        // Column 4: Total Hari Kerja (Soft green / blue highlight)
        if (c === 4 && metric.totalHariKerja > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0369A1' } };
        }

        // Column 5: Frekuensi Telat (Soft red highlight if > 0)
        if (c === 5) {
          if (metric.lateCount > 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF9F1239' } };
          }
        }

        // Column 6: Rincian Telat (Wrap text)
        if (c === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          if (metric.lateCount > 0) {
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF9F1239' } };
          } else {
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF166534' } };
          }
        }

        // Column 7: Frekuensi Pulang Cepat (Soft amber highlight if > 0)
        if (c === 7) {
          if (metric.earlyCount > 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
          }
        }

        // Column 8: Rincian Pulang Cepat (Wrap text)
        if (c === 8) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          if (metric.earlyCount > 0) {
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF92400E' } };
          } else {
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF166534' } };
          }
        }

        // Column 12: Total Tidak Masuk (Soft purple highlight if > 0)
        if (c === 12 && metric.totalTidakMasuk > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF6B21A8' } };
        }

        // Column 13: Notes
        if (c === 13) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };
        }
      }

      currentRowIdx++;
    });

    // 6. DIVISION SUBTOTAL ROW
    worksheet.mergeCells(`A${currentRowIdx}:C${currentRowIdx}`);
    const subtotalLabel = worksheet.getCell(`A${currentRowIdx}`);
    subtotalLabel.value = `SUBTOTAL ${divisionName.toUpperCase()} (${divStaffList.length} Orang)`;
    subtotalLabel.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    subtotalLabel.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    const subtotalRow = worksheet.getRow(currentRowIdx);
    subtotalRow.height = 24;

    const subtotalValues = {
      4: `${divTotalHariKerja} Hari`,
      5: `${divTotalTelat}x`,
      6: '-',
      7: `${divTotalPulangCepat}x`,
      8: '-',
      9: `${divTotalIzin} Hari`,
      10: `${divTotalSakit} Hari`,
      11: `${divTotalCuti} Hari`,
      12: `${divTotalTidakMasuk} Hari`,
      13: '-'
    };

    for (let c = 1; c <= 13; c++) {
      const cell = subtotalRow.getCell(c);
      if (c >= 4 && subtotalValues[c]) {
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
  worksheet.mergeCells(`A${currentRowIdx}:C${currentRowIdx}`);
  const grandLabel = worksheet.getCell(`A${currentRowIdx}`);
  grandLabel.value = `GRAND TOTAL REKAPITULASI ${venueTitle} (${totalStaffCount} Orang)`;
  grandLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  grandLabel.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

  const grandRow = worksheet.getRow(currentRowIdx);
  grandRow.height = 28;

  const grandValues = {
    4: `${venueTotalHariKerja} Hari`,
    5: `${venueTotalTelat}x`,
    6: '-',
    7: `${venueTotalPulangCepat}x`,
    8: '-',
    9: `${staffMetrics.reduce((s, m) => s + m.totalIzinAcc, 0)} Hari`,
    10: `${staffMetrics.reduce((s, m) => s + m.totalSakitAcc, 0)} Hari`,
    11: `${staffMetrics.reduce((s, m) => s + m.totalCutiAcc, 0)} Hari`,
    12: `${venueTotalTidakMasuk} Hari`,
    13: '-'
  };

  for (let c = 1; c <= 13; c++) {
    const cell = grandRow.getCell(c);
    if (c >= 4 && grandValues[c]) {
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

  // Apply explicit column widths
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
 * Main export function: Generates the Executive Month-to-Date Payroll & Attendance Report
 * - Sheet 1: Rekap Gaji JP Karaoke (All JP Staff grouped by Division, month-to-date)
 * - Sheet 2: Rekap Gaji LuckyCat (All LuckyCat Staff grouped by Division, month-to-date)
 * - Sheet 3: Rincian Shift Selesai (Completed shifts log month-to-date, strictly no in-progress)
 */
export async function exportMonthlyPayrollReport({
  shifts = [],
  allStaff = [],
  leaveRequests = [],
  periodStart = '',
  periodEnd = '',
  exportTimestamp = ''
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JP Karaoke & LuckyCat Management System';
  workbook.lastModifiedBy = 'Payroll & General Manager Audit';
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
  const divisionOrderLC = ['Bar, Cashier, and Server', 'Kitchen', 'Management'];

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
      primaryArgb: 'FF064E3B', // Emerald 900
      secondaryArgb: 'FF065F46', // Emerald 800
      headerArgb: 'FF047857', // Forest Emerald
      divisionBannerArgb: 'FF059669' // Vibrant Emerald
    },
    staffList: sortedLcStaff,
    shifts: completedShifts,
    leaveRequests,
    periodStart,
    periodEnd,
    exportTimestamp
  });

  // Sheet 3: Rincian Shift Selesai
  buildCompletedShiftsDetailSheet({
    workbook,
    shifts: completedShifts,
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
