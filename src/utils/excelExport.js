import ExcelJS from 'exceljs';
import { formatWitaTimeOnly, formatWitaDateOnly, formatWitaDateTime, formatDuration } from './time';

/**
 * Generates an executive, color-coded, professionally styled Excel (.xlsx) file
 * for Staff Attendance & Shift Audit Timesheets.
 */
export async function exportTimesheetToExcel({ shifts = [], venueName = 'JP Karaoke & Lucky Cat Outlets' }) {
  if (!shifts || shifts.length === 0) {
    alert('Tidak ada data absensi untuk diekspor.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JP & LuckyCat Attendance System';
  workbook.lastModifiedBy = 'Manager Audit';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Rekap Absensi', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  // Calculate Summary Statistics
  const totalShifts = shifts.length;
  const onDutyCount = shifts.filter((s) => s.status === 'IN_PROGRESS' || s.status === 'ON_DUTY').length;
  const onBreakCount = shifts.filter((s) => s.break_status === 'ON_BREAK').length;
  const completedCount = shifts.filter((s) => s.status === 'COMPLETED').length;
  const flaggedCount = shifts.filter((s) => Array.isArray(s.flags) && s.flags.length > 0).length;

  // 1. BANNER TITLE ROW (Row 1)
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'JP KARAOKE & LUCKY CAT — REKAP & AUDIT OPERASIONAL ABSENSI';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Deep slate / navy
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  // 2. SUBTITLE & METADATA (Row 2)
  worksheet.mergeCells('A2:M2');
  const subCell = worksheet.getCell('A2');
  const nowWita = formatWitaDateTime(new Date().toISOString());
  subCell.value = `Tanggal Export: ${nowWita} WITA  |  Total Shift: ${totalShifts} Rekord  |  Zona Waktu: WITA (Asia/Makassar)`;
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // 3. STATS SUMMARY ROW (Row 4)
  worksheet.getRow(3).height = 10; // spacing

  // Helper to format KPI cards
  const formatKpiCard = (cellRef, label, value, bgArgb, textArgb) => {
    const cell = worksheet.getCell(cellRef);
    cell.value = `${label}: ${value}`;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: textArgb } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  };

  worksheet.mergeCells('A4:B4');
  formatKpiCard('A4', 'TOTAL SHIFT', totalShifts, 'FFF1F5F9', 'FF0F172A');

  worksheet.mergeCells('C4:D4');
  formatKpiCard('C4', 'AKTIF BERTUGAS', onDutyCount, 'FFD1FAE5', 'FF065F46');

  worksheet.mergeCells('E4:F4');
  formatKpiCard('E4', 'SEDANG ISTIRAHAT', onBreakCount, 'FFE0F2FE', 'FF0369A1');

  worksheet.mergeCells('G4:I4');
  formatKpiCard('G4', 'SELESAI (COMPLETED)', completedCount, 'FFF3E8FF', 'FF6B21A8');

  worksheet.mergeCells('J4:M4');
  formatKpiCard(
    'J4',
    'FLAG ANOMALI / TELAT',
    flaggedCount,
    flaggedCount > 0 ? 'FFFFE4E6' : 'FFDCFCE7',
    flaggedCount > 0 ? 'FF9F1239' : 'FF166534'
  );
  worksheet.getRow(4).height = 26;

  worksheet.getRow(5).height = 12; // spacing

  // 4. TABLE HEADERS (Row 6)
  const columns = [
    { key: 'no', header: 'No.', width: 6 },
    { key: 'date', header: 'Tanggal', width: 14 },
    { key: 'venue', header: 'Outlet / Venue', width: 16 },
    { key: 'division', header: 'Divisi / Bagian', width: 18 },
    { key: 'staff_name', header: 'Nama Karyawan', width: 26 },
    { key: 'checkin_time', header: 'Jam Masuk', width: 15 },
    { key: 'break_start_time', header: 'Mulai Istirahat', width: 16 },
    { key: 'break_end_time', header: 'Selesai Istirahat', width: 16 },
    { key: 'break_duration', header: 'Durasi Istirahat', width: 16 },
    { key: 'checkout_time', header: 'Jam Pulang', width: 15 },
    { key: 'work_duration', header: 'Durasi Kerja', width: 15 },
    { key: 'status', header: 'Status Shift', width: 16 },
    { key: 'flags', header: 'Audit Flags & Catatan', width: 34 }
  ];

  const headerRow = worksheet.getRow(6);
  headerRow.height = 28;

  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF064E3B' } // Deep executive emerald
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF047857' } },
      left: { style: 'thin', color: { argb: 'FF065F46' } },
      bottom: { style: 'medium', color: { argb: 'FF047857' } },
      right: { style: 'thin', color: { argb: 'FF065F46' } }
    };
  });

  // 5. POPULATE DATA ROWS (Row 7 onward)
  shifts.forEach((shift, index) => {
    const rowNumber = 7 + index;
    const row = worksheet.getRow(rowNumber);
    row.height = 24;

    const isEven = index % 2 === 0;
    const baseBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Clean zebra striping

    // Venue color pill
    const isJP = (shift.staff_venue || shift.venue || '').toLowerCase().includes('jp');
    const venueText = shift.staff_venue || shift.venue || '-';

    // Status format
    let statusLabel = 'ON DUTY';
    let statusBg = 'FFD1FAE5'; // Soft green
    let statusText = 'FF065F46';
    if (shift.break_status === 'ON_BREAK') {
      statusLabel = 'ON BREAK';
      statusBg = 'FFE0F2FE'; // Soft sky blue
      statusText = 'FF0369A1';
    } else if (shift.status === 'COMPLETED') {
      statusLabel = 'COMPLETED';
      statusBg = 'FFF1F5F9'; // Soft slate
      statusText = 'FF475569';
    }

    // Flags format
    const flagsArr = Array.isArray(shift.flags) ? shift.flags : [];
    const hasFlags = flagsArr.length > 0;
    const flagText = hasFlags ? flagsArr.join(', ') : '✓ NORMAL';
    const flagBg = hasFlags ? 'FFFFE4E6' : 'FFDCFCE7';
    const flagColor = hasFlags ? 'FF9F1239' : 'FF166534';

    // Break duration text
    const breakDurationText = shift.break_duration_minutes
      ? `${shift.break_duration_minutes} Menit`
      : shift.break_start_time
      ? 'Sedang Berjalan'
      : '-';

    // Work duration text
    const workDurationText = shift.duration_minutes
      ? formatDuration(shift.duration_minutes)
      : shift.checkin_time && !shift.checkout_time
      ? 'Sedang Bertugas'
      : '-';

    // Insert row values
    row.values = [
      index + 1,
      shift.date || (shift.checkin_time ? formatWitaDateOnly(shift.checkin_time) : '-'),
      venueText,
      shift.staff_division || shift.division || '-',
      shift.staff_name || '-',
      shift.checkin_time ? formatWitaTimeOnly(shift.checkin_time) : '-',
      shift.break_start_time ? formatWitaTimeOnly(shift.break_start_time) : '-',
      shift.break_end_time ? formatWitaTimeOnly(shift.break_end_time) : '-',
      breakDurationText,
      shift.checkout_time ? formatWitaTimeOnly(shift.checkout_time) : '-',
      workDurationText,
      statusLabel,
      flagText
    ];

    // Style each cell in the row
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

      // Specific alignments
      if (c === 5) {
        // Staff Name left-aligned & bold
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      }

      if (c === 3) {
        // Venue tag color
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isJP ? 'FFF3E8FF' : 'FFFEF3C7' }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 9.5,
          bold: true,
          color: { argb: isJP ? 'FF6B21A8' : 'FF92400E' }
        };
      }

      if (c === 12) {
        // Status Column
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: statusText } };
      }

      if (c === 13) {
        // Flags Column
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: flagBg } };
        cell.font = { name: 'Segoe UI', size: 9.5, bold: hasFlags, color: { argb: flagColor } };
        cell.alignment = { vertical: 'middle', horizontal: hasFlags ? 'left' : 'center', indent: hasFlags ? 1 : 0 };
      }
    }
  });

  // Apply explicit auto-fit column widths
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const nowStr = new Date().toISOString().split('T')[0];
  const filename = `Rekap_Absensi_JPLC_${nowStr}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
