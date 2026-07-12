'use client';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTranslation } from '@/context/LanguageContext';

export default function StudentDistribution() {
  const { locale, t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [checkedStudents, setCheckedStudents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const getStudentMonth = (s) => {
    if (!s.startDate) return 'not_set';
    try {
      const month = new Date(s.startDate).getMonth();
      if (month === 6) return 'july';
      if (month === 7) return 'august';
    } catch {}
    if (s.startDate.includes('-07-')) return 'july';
    if (s.startDate.includes('-08-')) return 'august';
    return 'other';
  };

  const filteredStudents = useMemo(() => {
    if (!monthFilter) return students;
    return students.filter((s) => getStudentMonth(s) === monthFilter);
  }, [students, monthFilter]);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, lRes] = await Promise.all([
        api.teachers.list(),
        api.students.list({ limit: 10000 }),
        api.locations.list({ all: true }),
      ]);
      setTeachers(tRes.teachers || []);
      setStudents(sRes.students || []);
      setLocations(lRes.locations || []);
      return { teachers: tRes.teachers || [], students: sRes.students || [] };
    } catch (err) {
      toast.error(locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper functions to get IDs
  const getStudentLocationId = (s) => {
    if (!s.locationId) return '';
    if (typeof s.locationId === 'object') return String(s.locationId._id || '');
    return String(s.locationId);
  };

  const getStudentTeacherId = (s) => {
    if (!s.teacherId) return '';
    if (typeof s.teacherId === 'object') return String(s.teacherId._id || '');
    return String(s.teacherId);
  };

  // Count how many students are in each pharmacy
  const studentCountByPharmacy = useMemo(() => {
    const counts = {};
    filteredStudents.forEach((s) => {
      const locId = getStudentLocationId(s);
      if (locId) {
        counts[locId] = (counts[locId] || 0) + 1;
      }
    });
    return counts;
  }, [filteredStudents]);

  // Group locations by city
  const locationsByCity = useMemo(() => {
    const groups = {};
    locations.forEach((loc) => {
      if (!loc.isActive) return;

      // If monthFilter is selected, only show locations with students in this month
      if (monthFilter) {
        const studentCount = studentCountByPharmacy[loc._id] || 0;
        if (studentCount === 0) return;
      }

      const city = loc.city || (locale === 'ar' ? 'غير محدد' : 'Unspecified');
      if (!groups[city]) groups[city] = [];
      groups[city].push(loc);
    });
    return groups;
  }, [locations, locale, monthFilter, studentCountByPharmacy]);

  // Compute stats for each teacher (how many students assigned to them)
  const teacherStats = useMemo(() => {
    const stats = {};
    filteredStudents.forEach((s) => {
      const tId = getStudentTeacherId(s);
      if (tId) {
        stats[tId] = (stats[tId] || 0) + 1;
      }
    });
    return stats;
  }, [filteredStudents]);

  // Handle teacher selection
  const selectTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    // Find all students currently assigned to this teacher and check them
    const prechecked = new Set();
    filteredStudents.forEach((s) => {
      if (getStudentTeacherId(s) === teacher._id) {
        prechecked.add(s._id);
      }
    });
    setCheckedStudents(prechecked);
  };

  const handleMonthFilterChange = (val) => {
    setMonthFilter(val);
    if (selectedTeacher) {
      const prechecked = new Set();
      const nextFiltered = val 
        ? students.filter((s) => getStudentMonth(s) === val) 
        : students;
      nextFiltered.forEach((s) => {
        if (getStudentTeacherId(s) === selectedTeacher._id) {
          prechecked.add(s._id);
        }
      });
      setCheckedStudents(prechecked);
    } else {
      setCheckedStudents(new Set());
    }
  };

  // Toggle single student selection
  const handleToggleStudent = (studentId) => {
    setCheckedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Toggle all eligible students in a pharmacy
  const handleTogglePharmacy = (eligibleStudents) => {
    const allChecked = eligibleStudents.every((s) => checkedStudents.has(s._id));
    setCheckedStudents((prev) => {
      const next = new Set(prev);
      eligibleStudents.forEach((s) => {
        if (allChecked) {
          next.delete(s._id);
        } else {
          next.add(s._id);
        }
      });
      return next;
    });
  };

  // Toggle all eligible students in a city
  const handleToggleCity = (cityPharmacies) => {
    // Collect all eligible students in this city
    const cityEligibleStudents = [];
    cityPharmacies.forEach((loc) => {
      const locStudents = filteredStudents.filter((s) => getStudentLocationId(s) === loc._id);
      const eligible = locStudents.filter(
        (s) => !getStudentTeacherId(s) || getStudentTeacherId(s) === selectedTeacher._id
      );
      cityEligibleStudents.push(...eligible);
    });

    const allChecked = cityEligibleStudents.every((s) => checkedStudents.has(s._id));
    setCheckedStudents((prev) => {
      const next = new Set(prev);
      cityEligibleStudents.forEach((s) => {
        if (allChecked) {
          next.delete(s._id);
        } else {
          next.add(s._id);
        }
      });
      return next;
    });
  };

  // Release student from their current teacher (unassign)
  const handleReleaseStudent = async (studentId, studentName, currentTeacherName) => {
    const confirmMsg = locale === 'ar'
      ? `هل أنت متأكد من إلغاء تعيين الطالب ${studentName} من المشرف ${currentTeacherName || 'السابق'}؟`
      : `Are you sure you want to unassign ${studentName} from supervisor ${currentTeacherName || 'previous'}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.students.update(studentId, { teacherId: null });
      toast.success(
        locale === 'ar'
          ? `تم إلغاء تعيين الطالب ${studentName} بنجاح.`
          : `Successfully unassigned ${studentName}.`
      );
      const data = await loadData();
      if (selectedTeacher) {
        const latestTeachers = data?.teachers || teachers;
        const latestStudents = data?.students || students;
        const updatedTeacher = latestTeachers.find(t => t._id === selectedTeacher._id) || selectedTeacher;
        setSelectedTeacher(updatedTeacher);

        const prechecked = new Set();
        const nextFiltered = monthFilter 
          ? latestStudents.filter((s) => getStudentMonth(s) === monthFilter) 
          : latestStudents;
        nextFiltered.forEach((s) => {
          if (getStudentTeacherId(s) === updatedTeacher._id) {
            prechecked.add(s._id);
          }
        });
        setCheckedStudents(prechecked);
      }
    } catch (err) {
      toast.error(locale === 'ar' ? 'فشل إلغاء تعيين الطالب' : 'Failed to unassign student');
    }
  };

  // Save the student assignment distribution
  const handleApplyDistribution = async () => {
    if (!selectedTeacher) return;

    const updates = [];
    
    filteredStudents.forEach((s) => {
      const currentTeacherId = getStudentTeacherId(s);

      // Eligible student check (unassigned or currently assigned to this teacher)
      const isEligible = !currentTeacherId || currentTeacherId === selectedTeacher._id;

      if (isEligible) {
        if (checkedStudents.has(s._id)) {
          // If not currently assigned, assign them
          if (currentTeacherId !== selectedTeacher._id) {
            updates.push({ studentId: s._id, teacherId: selectedTeacher._id });
          }
        } else {
          // If currently assigned but now unchecked, unassign them
          if (currentTeacherId === selectedTeacher._id) {
            updates.push({ studentId: s._id, teacherId: null });
          }
        }
      }
    });

    if (updates.length === 0) {
      toast(locale === 'ar' ? 'لم يتم إجراء أي تغييرات.' : 'No changes were made.', { icon: 'ℹ️' });
      return;
    }

    const confirmMsg = locale === 'ar'
      ? `سيتم تحديث تعيين ${updates.length} طالب للمشرف ${selectedTeacher.name}. هل أنت متأكد؟`
      : `This will update the assignment of ${updates.length} student(s) for supervisor ${selectedTeacher.name}. Are you sure?`;

    if (!window.confirm(confirmMsg)) return;

    setApplying(true);
    try {
      // Execute all updates in parallel
      await Promise.all(
        updates.map((upd) => api.students.update(upd.studentId, { teacherId: upd.teacherId }))
      );

      toast.success(
        locale === 'ar'
          ? `✅ تم تطبيق التوزيع بنجاح! تم تحديث ${updates.length} طالب.`
          : `✅ Distribution applied successfully! Updated ${updates.length} student(s).`
      );

      // Reload data to reflect changes
      const data = await loadData();

      // Refresh selection state with updated data
      const latestTeachers = data?.teachers || teachers;
      const latestStudents = data?.students || students;
      const updatedTeacher = latestTeachers.find(t => t._id === selectedTeacher._id) || selectedTeacher;
      setSelectedTeacher(updatedTeacher);

      const prechecked = new Set();
      const nextFiltered = monthFilter 
        ? latestStudents.filter((s) => getStudentMonth(s) === monthFilter) 
        : latestStudents;
      nextFiltered.forEach((s) => {
        if (getStudentTeacherId(s) === updatedTeacher._id) {
          prechecked.add(s._id);
        }
      });
      setCheckedStudents(prechecked);
    } catch (err) {
      toast.error(locale === 'ar' ? 'حدث خطأ أثناء حفظ التوزيع' : 'An error occurred while saving distribution');
    } finally {
      setApplying(false);
    }
  };

  // Filter teachers list by search input
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) =>
      t.name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.profile?.specialty?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.profile?.department?.toLowerCase().includes(teacherSearch.toLowerCase())
    );
  }, [teachers, teacherSearch]);

  // Compute list of students currently checked to be assigned to this teacher
  const affectedStudentsList = useMemo(() => {
    if (!selectedTeacher) return [];
    return filteredStudents.filter((s) => checkedStudents.has(s._id));
  }, [filteredStudents, selectedTeacher, checkedStudents]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '400px' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>{t('sideDistribution')}</h1>
          <p className="text-muted">
            {locale === 'ar'
              ? 'توزيع وتعيين المشرفين الأكاديميين على الطلاب بشكل جماعي بناءً على مواقع صيدليات التدريب.'
              : 'Bulk assign academic supervisors to students based on training pharmacy locations.'}
          </p>
        </div>

        {/* Month Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
            {locale === 'ar' ? 'شهر التدريب:' : 'Training Month:'}
          </label>
          <select 
            className="form-control" 
            style={{ width: 200 }} 
            value={monthFilter} 
            onChange={(e) => handleMonthFilterChange(e.target.value)}
          >
            <option value="">{locale === 'ar' ? 'كل شهور التدريب' : 'All Training Months'}</option>
            <option value="july">{locale === 'ar' ? 'شهر السابع' : 'July (Month 7)'}</option>
            <option value="august">{locale === 'ar' ? 'شهر الثامن' : 'August (Month 8)'}</option>
          </select>
        </div>
      </div>

      {/* Teachers Table Panel (Top / Full-Width) */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>{locale === 'ar' ? 'قائمة المشرفين' : 'Supervisors List'}</h3>
          
          {/* Search bar */}
          <div className="search-bar" style={{ maxWidth: '300px', width: '100%' }}>
            <span className="search-icon">🔍</span>
            <input
              className="form-control"
              placeholder={locale === 'ar' ? 'البحث عن مشرف...' : 'Search supervisor...'}
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              style={{ paddingInlineStart: '36px' }}
            />
          </div>
        </div>

        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                <th style={{ textAlign: 'center' }}>{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                <th style={{ textAlign: 'center' }}>{locale === 'ar' ? 'القسم' : 'Department'}</th>
                <th style={{ textAlign: 'center' }}>{locale === 'ar' ? 'التخصص' : 'Specialty'}</th>
                <th style={{ width: '150px', textAlign: 'center' }}>{locale === 'ar' ? 'الطلاب المعينون' : 'Assigned Students'}</th>
                <th style={{ width: '150px', textAlign: 'center' }}>{locale === 'ar' ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    {locale === 'ar' ? 'لا يوجد مشرفين مطابقين للبحث.' : 'No matching supervisors.'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => {
                  const isSelected = selectedTeacher?._id === teacher._id;
                  const assignedCount = teacherStats[teacher._id] || 0;
                  return (
                    <tr
                      key={teacher._id}
                      onClick={() => selectTeacher(teacher)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--bg-hover)' : 'transparent',
                        outline: isSelected ? '2px solid var(--accent)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <td className="text-muted" style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>👨‍🏫 {teacher.name}</td>
                      <td style={{ textAlign: 'center' }}>{teacher.profile?.department || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{teacher.profile?.specialty || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="badge"
                          style={{
                            background: assignedCount > 0 ? 'var(--accent-dim)' : 'var(--border)',
                            color: assignedCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
                            fontWeight: 700
                          }}
                        >
                          {assignedCount} {locale === 'ar' ? 'طالب' : 'students'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ minWidth: '80px' }}
                        >
                          {isSelected ? (locale === 'ar' ? 'محدد' : 'Selected') : (locale === 'ar' ? 'تحديد' : 'Select')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Locations Selection Panel (Bottom / Full-Width when selected) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {!selectedTeacher ? (
          <div className="card flex-center" style={{ padding: '60px 24px', textAlign: 'center', minHeight: '200px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔄</div>
            <h4>{t('distribSelectTeacherPrompt')}</h4>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '6px', maxWidth: '400px' }}>
              {locale === 'ar'
                ? 'اختر مشرفاً من الجدول أعلاه لعرض وتوزيع الصيدليات والمواقع الطلابية الخاصة به.'
                : 'Select a supervisor from the table above to manage and distribute their student pharmacies and locations.'}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Selected Teacher Info Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              borderLeft: '4px solid var(--accent)'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'var(--accent-dim)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.2rem'
              }}>
                {selectedTeacher.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: 0 }}>
                  {locale === 'ar' ? `توزيع الصيدليات للمشرف: ${selectedTeacher.name}` : `Distribution for Supervisor: ${selectedTeacher.name}`}
                </h4>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                  {selectedTeacher.profile?.department || (locale === 'ar' ? 'لا يوجد قسم' : 'No department')}
                </p>
              </div>
            </div>

            {/* Locations List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                {t('distribLocations')}
              </h3>

              {Object.keys(locationsByCity).length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '32px' }}>
                  {locale === 'ar' ? 'لا توجد مواقع نشطة مضافة في النظام.' : 'No active locations in the system.'}
                </p>
              ) : (
                Object.keys(locationsByCity).sort().map((city) => {
                  const cityPharmacies = locationsByCity[city];
                  
                  // Extract all eligible students across this entire city
                  const cityEligibleStudents = [];
                  cityPharmacies.forEach((loc) => {
                    const locStudents = filteredStudents.filter((s) => getStudentLocationId(s) === loc._id);
                    const eligible = locStudents.filter(
                      (s) => !getStudentTeacherId(s) || getStudentTeacherId(s) === selectedTeacher._id
                    );
                    cityEligibleStudents.push(...eligible);
                  });

                  const allCityChecked = cityEligibleStudents.length > 0 && cityEligibleStudents.every((s) => checkedStudents.has(s._id));
                  const someCityChecked = cityEligibleStudents.some((s) => checkedStudents.has(s._id)) && !allCityChecked;

                  // Count checked students in this city
                  const cityCheckedCount = cityEligibleStudents.filter((s) => checkedStudents.has(s._id)).length;

                  return (
                    <div
                      key={city}
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        background: 'var(--bg-secondary)',
                        marginBottom: '10px'
                      }}
                    >
                      {/* City Header */}
                      <div
                        style={{
                          padding: '12px 16px',
                          background: 'var(--bg-hover)',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontWeight: 700, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={allCityChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = someCityChecked;
                            }}
                            onChange={() => handleToggleCity(cityPharmacies)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                          />
                          <span>📍 {city}</span>
                        </label>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {cityCheckedCount} {locale === 'ar' ? 'طالب محدد' : 'students selected'}
                        </span>
                      </div>

                      {/* Pharmacies List */}
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {cityPharmacies.map((loc) => {
                          const studentCount = studentCountByPharmacy[loc._id] || 0;
                          const locStudents = filteredStudents.filter(s => getStudentLocationId(s) === loc._id);

                          const eligibleStudents = locStudents.filter(
                            (s) => !getStudentTeacherId(s) || getStudentTeacherId(s) === selectedTeacher._id
                          );
                          const isPharmacyChecked = eligibleStudents.length > 0 && eligibleStudents.every(s => checkedStudents.has(s._id));
                          const isPharmacySomeChecked = eligibleStudents.some(s => checkedStudents.has(s._id)) && !isPharmacyChecked;

                          return (
                            <div
                              key={loc._id}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: isPharmacyChecked ? 'rgba(0, 210, 196, 0.03)' : 'transparent',
                                border: isPharmacyChecked ? '1px solid var(--accent)' : '1px solid transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={isPharmacyChecked}
                                    ref={(el) => {
                                      if (el) el.indeterminate = isPharmacySomeChecked;
                                    }}
                                    onChange={() => handleTogglePharmacy(eligibleStudents)}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                                  />
                                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    🏥 {loc.name} {loc.region ? `(${loc.region})` : ''}
                                  </span>
                                </label>

                                <span
                                  className="badge"
                                  style={{
                                    background: studentCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-hover)',
                                    color: studentCount > 0 ? 'var(--green)' : 'var(--text-muted)',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {studentCount} {locale === 'ar' ? 'طالب' : 'students'}
                                </span>
                              </div>

                              {/* Student Checklist list (visible for all students in this pharmacy) */}
                              {locStudents.length > 0 && (
                                <div
                                  style={{
                                    marginInlineStart: '24px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px dashed var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                  }}
                                >
                                  {locStudents.map((st) => {
                                    const stTeacherId = getStudentTeacherId(st);
                                    const stTeacherName = st.teacherId?.name || st.teacherId || '';
                                    const isSelfAssigned = stTeacherId === selectedTeacher._id;
                                    const isEligible = !stTeacherId || isSelfAssigned;

                                    let statusText = '';
                                    if (isSelfAssigned) {
                                      statusText = locale === 'ar' ? 'معين لديك' : 'Assigned to you';
                                    } else if (stTeacherId) {
                                      statusText = locale === 'ar' ? `معين لـ ${stTeacherName}` : `Assigned to ${stTeacherName}`;
                                    } else {
                                      statusText = locale === 'ar' ? 'غير معين' : 'Unassigned';
                                    }

                                    return (
                                      <div
                                        key={st._id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '2px 0',
                                          opacity: isEligible ? 1 : 0.8
                                        }}
                                      >
                                        <label
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            margin: 0,
                                            cursor: isEligible ? 'pointer' : 'default',
                                            flex: 1,
                                            minWidth: 0
                                          }}
                                        >
                                          {isEligible ? (
                                            <input
                                              type="checkbox"
                                              checked={checkedStudents.has(st._id)}
                                              onChange={() => handleToggleStudent(st._id)}
                                              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                                            />
                                          ) : (
                                            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔒</span>
                                          )}
                                          
                                          {/* Font size is set to 0.95rem and bold for better readability */}
                                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            🎓 {st.userId?.name || '—'} {st.pharmacyName ? `(${st.pharmacyName})` : ''}
                                          </span>
                                        </label>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{
                                            fontWeight: 600,
                                            fontSize: '0.8rem',
                                            color: isSelfAssigned ? 'var(--accent)' : stTeacherId ? 'var(--yellow)' : 'var(--text-muted)'
                                          }}>
                                            {statusText}
                                          </span>
                                          {stTeacherId && !isSelfAssigned && (
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-danger"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleReleaseStudent(st._id, st.userId?.name, stTeacherName);
                                              }}
                                              style={{
                                                fontSize: '0.68rem',
                                                padding: '2px 6px',
                                                height: 'auto',
                                                lineHeight: 1
                                              }}
                                            >
                                              {locale === 'ar' ? 'إلغاء التعيين القديم' : 'Release Old'}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Affected Students List Preview */}
            <div style={{
              marginTop: '12px',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{ marginBottom: '8px' }}>📋 {t('distribAffectedStudents')}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {locale === 'ar'
                  ? `سيتم ربط ${affectedStudentsList.length} طالب بالمشرف المختار (الطلاب المحددون فقط).`
                  : `${affectedStudentsList.length} student(s) will be assigned to the selected supervisor (selected students only).`}
              </p>
              {affectedStudentsList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {affectedStudentsList.map((st) => (
                    <span
                      key={st._id}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontWeight: 500
                      }}
                    >
                      👤 {st.userId?.name} {st.pharmacyName ? `(${st.pharmacyName})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => selectTeacher(selectedTeacher)}
                disabled={applying}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplyDistribution}
                disabled={applying || checkedStudents.size === 0}
                style={{ minWidth: '150px' }}
              >
                {applying ? (locale === 'ar' ? '⏳ جاري الحفظ...' : '⏳ Applying...') : t('distribSaveBtn')}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
