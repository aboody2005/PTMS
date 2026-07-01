import Papa from 'papaparse';
import { format } from 'date-fns';
import { formatDateTime12h, formatTimeOnly12h } from './date';

export function exportReportsCSV(reports, filename = 'student_reports', locale = 'en') {
  const isAr = locale === 'ar';
  let csvContent = '';

  if (isAr) {
    // Arabic Excel layout matching the screenshot
    csvContent += `"المرحلة الثالثة (الناجحين الى المرحلة الرابعة)"\n`;
    csvContent += `"ت","اسم الطالب","رقم هاتف الطالب","اسم الصيدلية","عنوان الصيدلية"\n`;

    reports.forEach((r, idx) => {
      const name = r.student.name || '';
      const phone = r.student.phone || '';
      const pharmacy = r.student.pharmacyName || '';
      const address = r.student.city && r.student.location
        ? `${r.student.city} — ${r.student.location}`
        : r.student.city || r.student.location || '';

      csvContent += `"${idx + 1}","${name.replace(/"/g, '""')}","${phone.replace(/"/g, '""')}","${pharmacy.replace(/"/g, '""')}","${address.replace(/"/g, '""')}"\n`;
    });
  } else {
    // English layout with equivalent columns
    csvContent += `"Third Stage (Rising to Fourth Stage)"\n`;
    csvContent += `"No.","Student Name","Student Phone","Pharmacy Name","Exact Address / Location"\n`;

    reports.forEach((r, idx) => {
      const name = r.student.name || '';
      const phone = r.student.phone || '';
      const pharmacy = r.student.pharmacyName || '';
      const address = r.student.city && r.student.location
        ? `${r.student.city} — ${r.student.location}`
        : r.student.city || r.student.location || '';

      csvContent += `"${idx + 1}","${name.replace(/"/g, '""')}","${phone.replace(/"/g, '""')}","${pharmacy.replace(/"/g, '""')}","${address.replace(/"/g, '""')}"\n`;
    });
  }

  downloadCSV(csvContent, `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
}

export async function exportReportsExcel(reports, filename = 'student_reports', locale = 'en') {
  const isAr = locale === 'ar';

  let finalFilename = filename;
  if (isAr && (filename === 'student_reports' || filename === 'تقرير_الترشيح_الكامل' || filename === 'تقرير_تدريب_الطلاب')) {
    finalFilename = 'التدريب الصيفي كلية الصيدلة مرحلة رابعة';
  }

  // Fetch unregistered students list
  let unregisteredStudents = [];
  try {
    const res = await fetch('/api/official-students');
    if (res.ok) {
      const data = await res.json();
      const allOfficial = data.students || [];
      unregisteredStudents = allOfficial.filter(s => !s.is_registered);
    }
  } catch (err) {
    console.error('Error fetching unregistered students:', err);
  }

  const title = isAr
    ? 'المرحلة الثالثة (الناجحين الى المرحلة الرابعة)'
    : 'Third Stage (Rising to Fourth Stage)';

  const headers = isAr
    ? ['ت', 'اسم الطالب', 'رقم هاتف الطالب', 'اسم الصيدلية', 'عنوان الصيدلية']
    : ['No.', 'Student Name', 'Student Phone', 'Pharmacy Name', 'Exact Address / Location'];

  const rowsHtml = reports.map((r, idx) => {
    const name = r.student.name || '&nbsp;';
    const phone = r.student.phone || '&nbsp;';
    const pharmacy = r.student.pharmacyName || '&nbsp;';
    const address = r.student.city && r.student.location
      ? `${r.student.city} — ${r.student.location}`
      : r.student.city || r.student.location || '&nbsp;';

    return `
      <tr style="height: 35px;">
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; padding: 4px; vertical-align: middle;">${idx + 1}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; padding: 4px; vertical-align: middle;">${name}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; padding: 4px; vertical-align: middle; mso-number-format:'\\@';">${phone}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; padding: 4px; vertical-align: middle;">${pharmacy}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; padding: 4px; vertical-align: middle;">${address}</td>
      </tr>
    `;
  }).join('');

  // Generate rows for unregistered students table
  let unregisteredRowsHtml = '';
  if (unregisteredStudents.length > 0) {
    unregisteredRowsHtml += `
      <tr style="height: 25px;"><td colspan="5" style="border: none;">&nbsp;</td></tr>
      <tr style="height: 25px;"><td colspan="5" style="border: none;">&nbsp;</td></tr>
      <tr style="height: 25px;"><td colspan="5" style="border: none;">&nbsp;</td></tr>
      <tr style="height: 25px;"><td colspan="5" style="border: none;">&nbsp;</td></tr>
    `;

    const secondTableTitle = isAr ? 'الطلبة الغير متدربين' : 'Unregistered Students';
    unregisteredRowsHtml += `
      <tr style="height: 50px;">
        <th colspan="2" style="border: 1px solid #000000; background-color: #9E0B0B; color: #ffffff; text-align: center; font-size: 18pt; font-family: Arial, sans-serif; font-weight: bold; vertical-align: middle;">
          ${secondTableTitle}
        </th>
        <td colspan="3" style="border: none;"></td>
      </tr>
    `;

    const secondHeaders = isAr ? ['ت', 'اسم الطالب'] : ['No.', 'Student Name'];
    unregisteredRowsHtml += `
      <tr style="height: 40px;">
        <th style="border: 1px solid #000000; background-color: #9E0B0B; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; font-weight: bold; color: #ffffff; padding: 6px; vertical-align: middle;">${secondHeaders[0]}</th>
        <th style="border: 1px solid #000000; background-color: #9E0B0B; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; font-weight: bold; color: #ffffff; padding: 6px; vertical-align: middle;">${secondHeaders[1]}</th>
        <td colspan="3" style="border: none;"></td>
      </tr>
    `;

    unregisteredStudents.forEach((student, idx) => {
      unregisteredRowsHtml += `
        <tr style="height: 35px;">
          <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; padding: 4px; vertical-align: middle;">${idx + 1}</td>
          <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; padding: 4px; vertical-align: middle;">${student.name}</td>
          <td colspan="3" style="border: none;"></td>
        </tr>
      `;
    });
  }

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          mso-page-orientation: landscape;
        }
        table {
          font-family: Arial, sans-serif;
          font-size: 18pt;
          border-collapse: collapse;
        }
        td, th {
          font-family: Arial, sans-serif;
          font-size: 18pt;
          white-space: nowrap;
        }
      </style>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sheet1</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
                ${isAr ? '<x:DisplayRightToLeft/>' : ''}
                <x:PageSetup>
                  <x:Layout x:Orientation="Landscape"/>
                </x:PageSetup>
                <x:Print>
                  <x:ValidPrinterInfo/>
                  <x:Scale>74</x:Scale>
                  <x:PaperSizeIndex>9</x:PaperSizeIndex>
                </x:Print>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    </head>
    <body style="direction: ${isAr ? 'rtl' : 'ltr'}; font-family: Arial, sans-serif;">
      <table style="table-layout: fixed; border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 18pt;">
        <colgroup>
          <col style="mso-width-source:userset; mso-width-alt:1866; width:47pt" width="63">
          <col style="mso-width-source:userset; mso-width-alt:12726; width:302pt" width="403">
          <col style="mso-width-source:userset; mso-width-alt:6802; width:163pt" width="218">
          <col style="mso-width-source:userset; mso-width-alt:11702; width:278pt" width="371">
          <col style="mso-width-source:userset; mso-width-alt:11702; width:278pt" width="371">
        </colgroup>
        <!-- Title Banner -->
        <tr style="height: 50px;">
          <th colspan="5" style="border: 1px solid #000000; background-color: #0B57D0; color: #ffffff; text-align: center; font-size: 18pt; font-family: Arial, sans-serif; font-weight: bold; vertical-align: middle;">
            ${title}
          </th>
        </tr>
        <!-- Headers -->
        <tr style="height: 40px;">
          ${headers.map(h => `<th style="border: 1px solid #000000; background-color: #0B57D0; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; font-weight: bold; color: #ffffff; padding: 6px; vertical-align: middle;">${h}</th>`).join('')}
        </tr>
        <!-- Data Rows -->
        ${rowsHtml}
        <!-- Unregistered Rows -->
        ${unregisteredRowsHtml}
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${finalFilename}_${format(new Date(), 'yyyyMMdd')}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportVisitsCSV(visits, studentName, locale = 'en') {
  const isAr = locale === 'ar';

  const rows = visits.map((v) => {
    if (isAr) {
      return {
        'اسم المشرف': v.teacherName || '',
        'اسم الطالب': v.studentName || studentName || '',
        'التاريخ': format(new Date(v.visitedAt), 'dd/MM/yyyy'),
        'الوقت': formatTimeOnly12h(v.visitedAt, 'ar'),
        'ملاحظات': v.notes || '',
        'الحالة': 'تمت الزيارة',
      };
    } else {
      return {
        'Teacher Name': v.teacherName || '',
        'Student Name': v.studentName || studentName || '',
        'Date': format(new Date(v.visitedAt), 'dd/MM/yyyy'),
        'Time': formatTimeOnly12h(v.visitedAt, 'en'),
        'Notes': v.notes || '',
        'Status': v.status || 'visited',
      };
    }
  });

  const csv = Papa.unparse(rows);
  downloadCSV(csv, `visits_${(studentName || 'report').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
