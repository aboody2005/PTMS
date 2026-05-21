import jsPDF from 'jspdf';

export async function exportReportPDF(reports, title = 'Student Training Report', locale = 'en') {
  // Dynamically import html2canvas to ensure it only runs on the client side
  const html2canvas = (await import('html2canvas')).default;

  // Create temporary container for off-screen rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1120px'; // Wide landscape layout
  container.style.background = '#ffffff';
  container.style.color = '#1f2937';
  container.style.fontFamily = "'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  container.style.direction = locale === 'ar' ? 'rtl' : 'ltr';
  container.style.padding = '40px';

  const isAr = locale === 'ar';
  
  // Header section
  const headerHtml = `
    <div style="border-bottom: 3px solid #00d4ff; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; direction: ${isAr ? 'rtl' : 'ltr'};">
      <div>
        <h1 style="margin: 0; font-size: 26px; color: #0d1117; font-weight: 700;">
          ${isAr ? 'منصة إدارة التدريب الميداني' : 'Pharmacy Training Management System'}
        </h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
          ${isAr ? 'تقرير تدريب الطلاب والمشرفين' : 'Field Supervisor Training Reports'}
        </p>
      </div>
      <div style="text-align: ${isAr ? 'left' : 'right'};">
        <span style="font-size: 26px; font-weight: 800; color: #00d4ff; letter-spacing: 1px;">PTMS</span>
      </div>
    </div>
  `;

  // Info Cards / Metadata
  const now = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
  
  const statsHtml = `
    <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; direction: ${isAr ? 'rtl' : 'ltr'};">
      <div>
        <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #111827; font-weight: 600;">${title}</h2>
        <div style="font-size: 13px; color: #4b5563;">
          <span><strong>${isAr ? 'تاريخ التصدير' : 'Export Date'}:</strong> ${now}</span>
        </div>
      </div>
      <div style="display: flex; gap: 15px;">
        <div style="background: #f3f4f6; padding: 10px 18px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">${isAr ? 'إجمالي الطلاب' : 'Total Students'}</div>
          <div style="font-size: 20px; font-weight: 700; color: #111827;">${reports.length}</div>
        </div>
        <div style="background: #f3f4f6; padding: 10px 18px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">${isAr ? 'إجمالي الزيارات' : 'Total Visits'}</div>
          <div style="font-size: 20px; font-weight: 700; color: #111827;">
            ${reports.reduce((acc, curr) => acc + (curr.visitCount || 0), 0)}
          </div>
        </div>
      </div>
    </div>
  `;

  // Table Structure
  const rowsHtml = reports.map((r, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 1 ? 'background-color: #f9fafb;' : ''}">
      <td style="padding: 14px 10px; font-size: 13px; text-align: center; color: #6b7280; font-weight: 500;">${i + 1}</td>
      <td style="padding: 14px 10px; font-size: 13px; font-weight: 600; color: #111827; text-align: ${isAr ? 'right' : 'left'};">
        <div>${r.student.name || '-'}</div>
        ${r.student.email ? `<div style="font-size: 11px; color: #6b7280; font-weight: 400; margin-top: 2px;">${r.student.email}</div>` : ''}
      </td>
      <td style="padding: 14px 10px; font-size: 13px; color: #374151; text-align: ${isAr ? 'right' : 'left'};">${r.student.university || '-'}</td>
      <td style="padding: 14px 10px; font-size: 13px; color: #374151; text-align: ${isAr ? 'right' : 'left'};">${r.student.pharmacyName || '-'}</td>
      <td style="padding: 14px 10px; font-size: 13px; color: #4b5563; text-align: ${isAr ? 'right' : 'left'};">
        ${r.student.location ? `${r.student.location}, ${r.student.city}` : '-'}
      </td>
      <td style="padding: 14px 10px; font-size: 13px; color: #374151; text-align: ${isAr ? 'right' : 'left'};">
        ${r.student.teacher || (isAr ? 'غير معين' : 'Unassigned')}
      </td>
      <td style="padding: 14px 10px; font-size: 12px; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 11px;
          ${r.student.status === 'completed' 
            ? 'background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe;' 
            : 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' }">
          ${r.student.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'نشط' : 'Active')}
        </span>
      </td>
      <td style="padding: 14px 10px; font-size: 13px; text-align: center; font-weight: 700; color: #111827;">${r.visitCount}</td>
      <td style="padding: 14px 10px; font-size: 13px; text-align: center; color: #4b5563;">
        ${r.lastVisit ? new Date(r.lastVisit).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : (isAr ? 'لا يوجد' : 'None')}
      </td>
    </tr>
  `).join('');

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; text-align: ${isAr ? 'right' : 'left'}; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-top: 10px;">
      <thead>
        <tr style="background: #0d1117; color: #00d4ff; border-bottom: 2px solid #e5e7eb;">
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 45px;">#</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'الطالب' : 'Student'}</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'الجامعة' : 'University'}</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'الصيدلية' : 'Pharmacy'}</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'العنوان' : 'Location'}</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'المشرف' : 'Supervisor'}</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 90px;">${isAr ? 'الحالة' : 'Status'}</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 70px;">${isAr ? 'الزيارات' : 'Visits'}</th>
          <th style="padding: 14px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 110px;">${isAr ? 'آخر زيارة' : 'Last Visit'}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  container.innerHTML = headerHtml + statsHtml + tableHtml;
  document.body.appendChild(container);

  try {
    // Generate high resolution canvas representation
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2] // Map exactly to container size
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Failed to export report PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportVisitsPDF(visits, studentName, locale = 'en') {
  const html2canvas = (await import('html2canvas')).default;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px'; // Portrait layout width
  container.style.background = '#ffffff';
  container.style.color = '#1f2937';
  container.style.fontFamily = "'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  container.style.direction = locale === 'ar' ? 'rtl' : 'ltr';
  container.style.padding = '40px';

  const isAr = locale === 'ar';
  
  const headerHtml = `
    <div style="border-bottom: 3px solid #00d4ff; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; direction: ${isAr ? 'rtl' : 'ltr'};">
      <div>
        <h1 style="margin: 0; font-size: 24px; color: #0d1117; font-weight: 700;">
          ${isAr ? 'سجل زيارات المشرف' : 'Field Visits Log'}
        </h1>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">
          ${isAr ? `تاريخ الزيارات للطالب: ${studentName}` : `Visit history records for: ${studentName}`}
        </p>
      </div>
      <div>
        <span style="font-size: 22px; font-weight: 800; color: #00d4ff; letter-spacing: 1px;">PTMS</span>
      </div>
    </div>
  `;

  const now = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
  
  const statsHtml = `
    <div style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; direction: ${isAr ? 'rtl' : 'ltr'}; font-size: 13px; color: #4b5563;">
      <div>
        <strong>${isAr ? 'تاريخ التصدير' : 'Export Date'}:</strong> ${now}
      </div>
      <div style="background: #f3f4f6; padding: 6px 14px; border-radius: 6px; font-weight: bold; color: #111827;">
        ${isAr ? `الزيارات: ${visits.length}` : `Visits: ${visits.length}`}
      </div>
    </div>
  `;

  const rowsHtml = visits.map((v, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 1 ? 'background-color: #f9fafb;' : ''}">
      <td style="padding: 12px 10px; font-size: 13px; text-align: center; color: #6b7280;">${i + 1}</td>
      <td style="padding: 12px 10px; font-size: 13px; font-weight: 600; color: #111827; text-align: ${isAr ? 'right' : 'left'};">${v.teacherName || '-'}</td>
      <td style="padding: 12px 10px; font-size: 13px; text-align: center; color: #374151;">
        ${new Date(v.visitedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
      </td>
      <td style="padding: 12px 10px; font-size: 13px; text-align: center; color: #374151;">
        ${new Date(v.visitedAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td style="padding: 12px 10px; font-size: 13px; color: #4b5563; text-align: ${isAr ? 'right' : 'left'};">${v.notes || '-'}</td>
      <td style="padding: 12px 10px; font-size: 12px; text-align: center;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 600; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px;">
          ${isAr ? 'تمت الزيارة' : (v.status || 'Visited')}
        </span>
      </td>
    </tr>
  `).join('');

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; text-align: ${isAr ? 'right' : 'left'}; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #0d1117; color: #00d4ff; border-bottom: 2px solid #e5e7eb;">
          <th style="padding: 12px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 45px;">#</th>
          <th style="padding: 12px 10px; font-size: 13px; font-weight: 700; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'المشرف' : 'Supervisor'}</th>
          <th style="padding: 12px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 110px;">${isAr ? 'التاريخ' : 'Date'}</th>
          <th style="padding: 12px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 90px;">${isAr ? 'الوقت' : 'Time'}</th>
          <th style="padding: 12px 10px; font-size: 13px; font-weight: 700; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'ملاحظات' : 'Notes'}</th>
          <th style="padding: 12px 10px; font-size: 13px; font-weight: 700; text-align: center; width: 100px;">${isAr ? 'الحالة' : 'Status'}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  container.innerHTML = headerHtml + statsHtml + tableHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`visits_${studentName.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Failed to export visits PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
}
