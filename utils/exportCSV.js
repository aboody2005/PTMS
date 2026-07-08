import Papa from 'papaparse';
import { format } from 'date-fns';
import { formatTimeOnly12h } from './date';

export function exportReportsCSV(reports, filename = 'student_reports', locale = 'en') {
  const isAr = locale === 'ar';
  let csvContent = '';

  if (isAr) {
    csvContent += `"المرحلة الثالثة (الناجحين الى المرحلة الرابعة)"\n`;
    csvContent += `"ت","اسم الطالب","رقم هاتف الطالب","اسم الصيدلية","عنوان الصيدلية"\n`;
    reports.forEach((r, idx) => {
      const name     = r.student.name || '';
      const phone    = r.student.phone || '';
      const pharmacy = r.student.pharmacyName || '';
      const address  = r.student.city && r.student.location
        ? `${r.student.city} — ${r.student.location}`
        : r.student.city || r.student.location || '';
      csvContent += `"${idx + 1}","${name.replace(/"/g, '""')}","${phone.replace(/"/g, '""')}","${pharmacy.replace(/"/g, '""')}","${address.replace(/"/g, '""')}"\n`;
    });
  } else {
    csvContent += `"Third Stage (Rising to Fourth Stage)"\n`;
    csvContent += `"No.","Student Name","Student Phone","Pharmacy Name","Exact Address / Location"\n`;
    reports.forEach((r, idx) => {
      const name     = r.student.name || '';
      const phone    = r.student.phone || '';
      const pharmacy = r.student.pharmacyName || '';
      const address  = r.student.city && r.student.location
        ? `${r.student.city} — ${r.student.location}`
        : r.student.city || r.student.location || '';
      csvContent += `"${idx + 1}","${name.replace(/"/g, '""')}","${phone.replace(/"/g, '""')}","${pharmacy.replace(/"/g, '""')}","${address.replace(/"/g, '""')}"\n`;
    });
  }

  downloadCSV(csvContent, `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
}

/* ─────────────────────────────────────────────────────────
   Styled Excel export matching the original HTML design:
   - 18pt Arial font
   - Blue header rows (#0B57D0) with white bold text
   - All cells with thin black borders
   - Column widths matching original (A narrow, B–E wide)
   - Row heights: title 50pt, header 40pt, data 35pt
   - RTL view for Arabic
   - Sheet 1: registered students + optional teacher summary
   - Sheet 2: unregistered students (if any)
───────────────────────────────────────────────────────── */
export async function exportReportsExcel(
  reports,
  filename = 'student_reports',
  locale = 'en',
  unregisteredList = null,
  teacherName = ''
) {
  const isAr = locale === 'ar';
  const ExcelJS = (await import('exceljs')).default;

  let finalFilename = filename;
  if (
    isAr &&
    (filename === 'student_reports' ||
      filename === 'تقرير_الترشيح_الكامل' ||
      filename === 'تقرير_تدريب_الطلاب')
  ) {
    finalFilename = 'التدريب الصيفي كلية الصيدلة مرحلة رابعة';
  }

  // ── Fetch unregistered list ───────────────────────────
  let unregisteredStudents = [];
  if (unregisteredList !== null) {
    unregisteredStudents = unregisteredList;
  } else {
    try {
      const res = await fetch('/api/official-students');
      if (res.ok) {
        const data = await res.json();
        const all  = data.students || [];
        unregisteredStudents = all.filter(s => !s.is_registered);
      }
    } catch (err) {
      console.error('Error fetching unregistered students:', err);
    }
  }

  // ── Sort ──────────────────────────────────────────────
  const sortedReports = [...reports].sort((a, b) =>
    (a.student?.name || '').localeCompare(
      b.student?.name || '',
      isAr ? 'ar' : 'en',
      { sensitivity: 'accent' }
    )
  );

  // ── Style helpers ─────────────────────────────────────
  const BLUE       = { argb: 'FF0B57D0' };
  const WHITE      = { argb: 'FFFFFFFF' };
  const BLACK      = { argb: 'FF000000' };
  const FONT_SIZE  = 18;
  const FONT_NAME  = 'Arial';

  const thinBorder = {
    top:    { style: 'thin', color: BLACK },
    left:   { style: 'thin', color: BLACK },
    bottom: { style: 'thin', color: BLACK },
    right:  { style: 'thin', color: BLACK },
  };

  const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: BLUE };
  const headerFont  = { name: FONT_NAME, size: FONT_SIZE, bold: true, color: WHITE };
  const dataFont    = { name: FONT_NAME, size: FONT_SIZE, bold: false, color: BLACK };
  const centerAlign = { horizontal: 'center', vertical: 'middle' };

  function applyHeaderStyle(cell, isWrap = false) {
    cell.fill      = headerFill;
    cell.font      = headerFont;
    cell.border    = thinBorder;
    cell.alignment = isWrap
      ? { horizontal: 'center', vertical: 'middle', wrapText: true }
      : centerAlign;
  }

  function applyDataStyle(cell, isPhone = false, isWrap = false) {
    cell.font      = dataFont;
    cell.border    = thinBorder;
    cell.alignment = isWrap
      ? { horizontal: 'center', vertical: 'middle', wrapText: true }
      : centerAlign;
    if (isPhone) cell.numFmt = '@'; // keep phone as text
  }

  // ── Column definitions ────────────────────────────────
  const colWidths = [
    { width: 6.43 },
    { width: 49 },
    { width: 25.86 },
    { width: 45 },
    { width: 64 },
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'PTMS';
  wb.modified = new Date();

  // ══════════════════════════════════════════════════════
  // SHEET 1 — Student Data
  // ══════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet(isAr ? 'الطلبة المسجلون' : 'Registered', {
    views: [{ rightToLeft: isAr }],
    pageSetup: { paperSize: 9, orientation: 'landscape', scale: 70 } // paperSize 9 = A4, landscape, 70% scale
  });

  // Column widths
  ws1.columns = colWidths;

  const title = isAr
    ? 'المرحلة الثالثة (الناجحين الى المرحلة الرابعة)'
    : 'Third Stage (Rising to Fourth Stage)';

  const headers = isAr
    ? ['ت', 'اسم الطالب', 'رقم هاتف الطالب', 'اسم الصيدلية', 'عنوان الصيدلية']
    : ['No.', 'Student Name', 'Student Phone', 'Pharmacy Name', 'Exact Address / Location'];

  // ── Title banner row (merged A1:E1) ────────────────────
  const titleRow = ws1.addRow([title, '', '', '', '']);
  titleRow.height = 50;
  ws1.mergeCells(`A1:E1`);
  for (let c = 1; c <= 5; c++) {
    const cell = titleRow.getCell(c);
    applyHeaderStyle(cell);
    cell.alignment = { ...centerAlign, wrapText: true };
  }

  // ── Header row ─────────────────────────────────────────
  const headerRow = ws1.addRow(headers);
  headerRow.height = 40;
  for (let c = 1; c <= 5; c++) {
    applyHeaderStyle(headerRow.getCell(c), c === 4 || c === 5);
  }

  // ── Data rows ──────────────────────────────────────────
  sortedReports.forEach((r, idx) => {
    const address = r.student.city && r.student.location
      ? `${r.student.city} — ${r.student.location}`
      : r.student.city || r.student.location || '';

    const row = ws1.addRow([
      String(idx + 1),
      r.student.name        || '',
      r.student.phone       || '',
      r.student.pharmacyName || '',
      address,
    ]);
    row.eachCell((cell, colNum) => {
      const isWrap = colNum === 4 || colNum === 5;
      const isTextFormat = colNum === 1 || colNum === 3;
      applyDataStyle(cell, isTextFormat, isWrap);
    });
  });

  // ── Teacher summary (optional) ─────────────────────────
  if (teacherName) {
    ws1.addRow([]); // spacer
    const labelRow = ws1.addRow(
      isAr
        ? ['', 'الدكتور المشرف', 'عدد الطلاب', '', '']
        : ['', 'Supervisor', 'No. of Students', '', '']
    );
    labelRow.height = 40;
    [2, 3].forEach(c => applyHeaderStyle(labelRow.getCell(c)));

    const valRow = ws1.addRow(['', teacherName, reports.length, '', '']);
    valRow.height = 40;
    [2, 3].forEach(c => applyDataStyle(valRow.getCell(c)));
  }

  // ── Unregistered Students (under the main table on same sheet) ──
  if (unregisteredStudents.length > 0) {
    const RED = { argb: 'FF9E0B0B' };

    // Add 4 empty spacer rows
    for (let k = 0; k < 4; k++) {
      const spacerRow = ws1.addRow([]);
      spacerRow.height = 25;
    }

    const secondTitle = isAr ? 'الطلبة الغير متدربين' : 'Unregistered Students';
    const startRowIndex = ws1.lastRow.number + 1;

    // Add title row for unregistered table (A & B merged)
    const titleRow2 = ws1.addRow([secondTitle, '', '', '', '']);
    titleRow2.height = 50;
    ws1.mergeCells(`A${startRowIndex}:B${startRowIndex}`);

    for (let c = 1; c <= 2; c++) {
      const cell = titleRow2.getCell(c);
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: RED };
      cell.font      = { name: FONT_NAME, size: FONT_SIZE, bold: true, color: WHITE };
      cell.border    = thinBorder;
      cell.alignment = centerAlign;
    }

    // Headers row: ت and اسم الطالب
    const nextRowIndex = ws1.lastRow.number + 1;
    const hRow2 = ws1.addRow(isAr ? ['ت', 'اسم الطالب', '', '', ''] : ['No.', 'Student Name', '', '', '']);
    hRow2.height = 40;

    [1, 2].forEach(colIndex => {
      const cell = hRow2.getCell(colIndex);
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: RED };
      cell.font      = { name: FONT_NAME, size: FONT_SIZE, bold: true, color: WHITE };
      cell.border    = thinBorder;
      cell.alignment = centerAlign;
    });

    // Unregistered data rows
    const sortedUnreg = [...unregisteredStudents].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', isAr ? 'ar' : 'en', { sensitivity: 'accent' })
    );

    sortedUnreg.forEach((s, idx) => {
      const row = ws1.addRow([String(idx + 1), s.name || '', '', '', '']);
      applyDataStyle(row.getCell(1), true); // col A formatted as Text
      applyDataStyle(row.getCell(2), false);
    });
  }

  // ── Write file ────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = `${finalFilename}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportVisitsCSV(visits, studentName, locale = 'en') {
  const isAr = locale === 'ar';

  const rows = visits.map((v) => {
    if (isAr) {
      return {
        'اسم المشرف':  v.teacherName || '',
        'اسم الطالب':  v.studentName || studentName || '',
        'التاريخ':     format(new Date(v.visitedAt), 'dd/MM/yyyy'),
        'الوقت':       formatTimeOnly12h(v.visitedAt, 'ar'),
        'ملاحظات':     v.notes || '',
        'الحالة':      'تمت الزيارة',
      };
    } else {
      return {
        'Teacher Name': v.teacherName || '',
        'Student Name': v.studentName || studentName || '',
        'Date':         format(new Date(v.visitedAt), 'dd/MM/yyyy'),
        'Time':         formatTimeOnly12h(v.visitedAt, 'en'),
        'Notes':        v.notes || '',
        'Status':       v.status || 'visited',
      };
    }
  });

  const csv = Papa.unparse(rows);
  downloadCSV(csv, `visits_${(studentName || 'report').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
