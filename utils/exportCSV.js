import Papa from 'papaparse';
import { format } from 'date-fns';

export function exportReportsCSV(reports, filename = 'student_reports', locale = 'en') {
  const isAr = locale === 'ar';

  const rows = reports.map((r) => {
    if (isAr) {
      let statusVal = r.student.status || '';
      if (statusVal === 'active') statusVal = 'نشط';
      else if (statusVal === 'completed') statusVal = 'مكتمل';

      let genderVal = r.student.gender || '';
      if (genderVal === 'male') genderVal = 'ذكر';
      else if (genderVal === 'female') genderVal = 'أنثى';

      return {
        'اسم الطالب': r.student.name || '',
        'البريد الإلكتروني': r.student.email || '',
        'رقم الهاتف': r.student.phone || '',
        'الجنس': genderVal,
        'الجامعة': r.student.university || '',
        'صيدلية التدريب': r.student.pharmacyName || '',
        'الموقع': r.student.location || '',
        'المدينة': r.student.city || '',
        'خط العرض': r.student.latitude || '',
        'خط الطول': r.student.longitude || '',
        'المشرف المعين': r.student.teacher || 'غير معين',
        'الحالة': statusVal,
        'تاريخ البدء': r.student.startDate ? format(new Date(r.student.startDate), 'dd/MM/yyyy') : '',
        'تاريخ الانتهاء': r.student.endDate ? format(new Date(r.student.endDate), 'dd/MM/yyyy') : '',
        'إجمالي الزيارات': r.visitCount,
        'آخر زيارة': r.lastVisit ? format(new Date(r.lastVisit), 'dd/MM/yyyy HH:mm') : 'لا يوجد',
      };
    } else {
      return {
        'Student Name': r.student.name || '',
        'Email': r.student.email || '',
        'Phone': r.student.phone || '',
        'Gender': r.student.gender || '',
        'University': r.student.university || '',
        'Training Pharmacy': r.student.pharmacyName || '',
        'Location': r.student.location || '',
        'City': r.student.city || '',
        'Latitude': r.student.latitude || '',
        'Longitude': r.student.longitude || '',
        'Assigned Teacher': r.student.teacher || 'Unassigned',
        'Status': r.student.status || '',
        'Start Date': r.student.startDate ? format(new Date(r.student.startDate), 'dd/MM/yyyy') : '',
        'End Date': r.student.endDate ? format(new Date(r.student.endDate), 'dd/MM/yyyy') : '',
        'Total Visits': r.visitCount,
        'Last Visit': r.lastVisit ? format(new Date(r.lastVisit), 'dd/MM/yyyy HH:mm') : 'None',
      };
    }
  });

  const csv = Papa.unparse(rows);
  downloadCSV(csv, `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
}

export function exportVisitsCSV(visits, studentName, locale = 'en') {
  const isAr = locale === 'ar';

  const rows = visits.map((v) => {
    if (isAr) {
      return {
        'اسم المشرف': v.teacherName || '',
        'اسم الطالب': v.studentName || studentName || '',
        'التاريخ': format(new Date(v.visitedAt), 'dd/MM/yyyy'),
        'الوقت': format(new Date(v.visitedAt), 'HH:mm'),
        'ملاحظات': v.notes || '',
        'الحالة': 'تمت الزيارة',
      };
    } else {
      return {
        'Teacher Name': v.teacherName || '',
        'Student Name': v.studentName || studentName || '',
        'Date': format(new Date(v.visitedAt), 'dd/MM/yyyy'),
        'Time': format(new Date(v.visitedAt), 'HH:mm'),
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
