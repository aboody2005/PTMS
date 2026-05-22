'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    // Navbar & Footer
    brandName: 'PTMS',
    brandDesc: 'Pharmacy Training Management System',
    navHome: 'Home',
    navAbout: 'About',
    navFeatures: 'Features',
    navContact: 'Contact',
    navLogin: 'Login',
    navRegister: 'Register',
    navDashboard: 'Dashboard',
    navLogout: 'Logout',
    allRightsReserved: 'All rights reserved.',
    iraqGov: 'Republic of Iraq – Pharmacy Training Platform',

    // Landing Page
    heroTitle: 'Transforming Pharmacy Training in Iraq',
    heroSubtitle: 'A modern, integrated platform for students, academic supervisors, and training pharmacies to connect, track hours, and verify progress.',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    aboutTitle: 'About the System',
    aboutText1: 'The Pharmacy Training Management System (PTMS) is a state-of-the-art solution designed to digitize and streamline the mandatory training process for pharmacy students in Iraq.',
    aboutText2: 'Under university guidance, students can select their pharmacy location, map their GPS coordinates, and submit reports. Academic teachers can assign, review, and visually supervise students using interactive maps and report validation.',
    featureTitle: 'Key Features',
    featureStudentProfile: 'Student Profiles',
    featureStudentProfileDesc: 'Manage training start/end dates, upload profile image, and track assignment status.',
    featureGpsLocation: 'GPS & Map Selection',
    featureGpsLocationDesc: 'Pin exact training pharmacy coordinates using Google Maps integrations.',
    featureSupervisor: 'Supervisor Portal',
    featureSupervisorDesc: 'Teachers can visually track student locations, schedule visits, and review reports.',
    featureAdminPanel: 'Centralized Administration',
    featureAdminPanelDesc: 'Manage users, seed training pharmacies, generate password reset tokens, and pull statistics.',
    contactTitle: 'Contact Us',
    contactSubtitle: 'Have any questions or need technical support? Get in touch with us.',
    contactName: 'Full Name',
    contactEmail: 'Email Address',
    contactMessage: 'Message',
    contactSubmit: 'Send Message',
    contactSuccess: 'Your message has been sent successfully!',

    // Auth Pages
    loginTitle: 'Sign In',
    loginSubtitle: 'Welcome back! Please enter your details.',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    fullNameLabel: 'Full Name',
    phoneLabel: 'Phone Number',
    genderLabel: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    genderSelect: 'Select Gender',
    pharmacyLocationLabel: 'Pharmacy Location',
    pharmacyLocationSelect: 'Select Pharmacy Location',
    registerTitle: 'Create Account',
    registerSubtitle: 'Join the pharmacy training platform',
    forgotPasswordLink: 'Forgot password?',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    signUpNow: 'Sign up',
    signInNow: 'Sign in',
    resetTokenLabel: 'Enter Reset Token',
    newPasswordLabel: 'New Password',
    submitBtn: 'Submit',

    // Dashboard General
    welcomeBack: 'Welcome back,',
    roleStudent: 'Student',
    roleTeacher: 'Teacher',
    roleAdmin: 'Administrator',
    myProfile: 'My Profile',
    activeTraining: 'Active Training',
    completedHours: 'Completed',
    totalStudents: 'Total Students',
    totalTeachers: 'Total Teachers',
    totalLocations: 'Total Locations',
    totalVisits: 'Total Visits',
    loading: 'Loading...',
    saving: 'Saving...',
    saveSettings: 'Save Settings',
    saveProfile: 'Save Profile',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    actions: 'Actions',
    searchPlaceholder: 'Search...',

    // Sidebar Items
    sideDashboard: 'Dashboard',
    sideMyProfile: 'My Profile',
    sideMyStudents: 'My Students',
    sideReports: 'Reports',
    sideUsers: 'User Management',
    sideAssignments: 'Assignments',
    sideLocations: 'Locations',

    // Profile Page
    personalInfo: 'Personal Information',
    trainingInfo: 'Training Information',
    universityLabel: 'University',
    hardcodedUniversity: 'جامعة الحدباء',
    pharmacyNameLabel: 'Training Pharmacy Name',
    startDateLabel: 'Start Date',
    endDateLabel: 'End Date',
    gpsLocation: 'GPS Location',
    gpsHint: 'Click on the map to pin your pharmacy\'s exact GPS location.',
    changePhoto: 'Change Photo',
    photoHint: 'JPG, PNG up to 2MB',
    passwordPlaceholder: '••••••••',
    passwordHint: 'Leave blank to keep current',

    // Location Modal / Page
    addLocation: 'Add Location',
    editLocation: 'Edit Location',
    addPharmacyLocation: 'Add New Pharmacy Location',
    cityLabel: 'City',
    regionLabel: 'Region',
    cityPlaceholder: 'e.g. Mosul',
    regionPlaceholder: 'e.g. Al-Zuhour',
    cantFindLocationBtn: "Can't find your location? Add New Location",
    addAndSelectBtn: 'Add & Select Location',

    // Teacher Student View & Visits
    assignedStudents: 'Assigned Students',
    studentName: 'Student Name',
    phone: 'Phone',
    visitStatus: 'Visit Status',
    viewOnMap: 'View on Map',
    logVisit: 'Log Visit',
    notVisited: 'Not Visited',
    visited: 'Visited',
    visitDate: 'Visit Date',
    notes: 'Notes/Feedback',
    logVisitTitle: 'Log Visit for',
    studentProfileTitle: "Student Profile",

    // Admin Pages
    userMgmt: 'User Management',
    roleFilter: 'All Roles',
    addUser: 'Add User',
    resetTokenBtn: 'Reset Token',
    generateToken: 'Generate Password Reset Token',
    tokenHelp: 'Share this token with the user so they can reset their password on the login screen.',
    copyToken: 'Copy Token',
    generatedTokenLabel: 'Generated Token',
    assignmentsTitle: 'Assignments',
    assignTeacher: 'Assign Teacher',
    statusLabel: 'Status',
    reportStatus: 'Status',
    reportApproved: 'Approved',
    reportRejected: 'Rejected',
    approve: 'Approve',
    reject: 'Reject',
    addReport: 'Submit Daily Report',
    reportTitle: 'Report Title',
    reportContent: 'Daily Log / Summary',
    noReportsYet: 'No training reports logged yet.',
    noStudentsYet: 'No students assigned yet.',
    notificationsTitle: 'Notifications',
    markAllRead: 'Mark all read',
    noNotificationsYet: 'No notifications yet',
    filterByLocation: 'Filter by Location',
    allLocations: 'All Locations',
    searchAddress: 'Search Address',
    locating: 'Locating...',
    locationFound: 'Location found!',
    addressSearchPlaceholder: 'Type a pharmacy name or street address...',
    pharmacyLocation: 'Pharmacy Location',
  },
  ar: {
    // Navbar & Footer
    brandName: 'نظام PTMS',
    brandDesc: 'نظام إدارة التدريب الصيدلاني',
    navHome: 'الرئيسية',
    navAbout: 'عن النظام',
    navFeatures: 'الميزات',
    navContact: 'اتصل بنا',
    navLogin: 'تسجيل الدخول',
    navRegister: 'إنشاء حساب',
    navDashboard: 'لوحة التحكم',
    navLogout: 'تسجيل الخروج',
    allRightsReserved: 'جميع الحقوق محفوظة.',
    iraqGov: 'جمهورية العراق – منصة التدريب الصيدلاني',

    // Landing Page
    heroTitle: 'تطوير التدريب الصيدلاني في العراق',
    heroSubtitle: 'منصة حديثة ومتكاملة لربط الطلاب، المشرفين الأكاديميين، والصيدليات التدريبية وتتبع الساعات والتحقق من التقدم.',
    getStarted: 'ابدأ الآن',
    learnMore: 'اقرأ المزيد',
    aboutTitle: 'حول النظام',
    aboutText1: 'نظام إدارة التدريب الصيدلاني (PTMS) هو حل متطور مصمم لرقمنة وتبسيط عملية التدريب الإلزامية لطلاب الصيدلة في العراق.',
    aboutText2: 'تحت إشراف الجامعة، يمكن للطلاب اختيار موقع صيدليتهم وتحديد إحداثيات الـ GPS وتقديم التقارير اليومية. كما يمكن للمشرفين الأكاديميين تعيين الطلاب ومراجعة أدائهم والإشراف عليهم مرئياً عبر خرائط تفاعلية.',
    featureTitle: 'الميزات الرئيسية',
    featureStudentProfile: 'ملفات الطلاب',
    featureStudentProfileDesc: 'إدارة تواريخ بدء وانتهاء التدريب، تحميل صورة الملف الشخصي ومتابعة حالة التعيين.',
    featureGpsLocation: 'تحديد الموقع الجغرافي (GPS)',
    featureGpsLocationDesc: 'تثبيت إحداثيات الصيدلية التدريبية بدقة متناهية باستخدام خرائط جوجل.',
    featureSupervisor: 'بوابة المشرف الأكاديمي',
    featureSupervisorDesc: 'تتبع مواقع الطلاب جغرافياً، جدولة الزيارات، ومراجعة وتقييم التقارير اليومية.',
    featureAdminPanel: 'الإدارة المركزية',
    featureAdminPanelDesc: 'إدارة المستخدمين، إدخال الصيدليات المعتمدة، توليد رموز إعادة تعيين كلمة المرور، واستخراج الإحصائيات.',
    contactTitle: 'اتصل بنا',
    contactSubtitle: 'لديك أي استفسار أو تحتاج إلى دعم فني؟ تواصل معنا مباشرة.',
    contactName: 'الاسم الكامل',
    contactEmail: 'البريد الإلكتروني',
    contactMessage: 'نص الرسالة',
    contactSubmit: 'إرسال الرسالة',
    contactSuccess: 'تم إرسال رسالتك بنجاح!',

    // Auth Pages
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'مرحباً بك مجدداً! يرجى إدخال بياناتك.',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    fullNameLabel: 'الاسم الكامل',
    phoneLabel: 'رقم الهاتف',
    genderLabel: 'الجنس',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
    genderOther: 'أخرى',
    genderSelect: 'اختر الجنس',
    pharmacyLocationLabel: 'موقع الصيدلية',
    pharmacyLocationSelect: 'اختر موقع الصيدلية',
    registerTitle: 'إنشاء حساب جديد',
    registerSubtitle: 'انضم إلى منصة التدريب الصيدلاني',
    forgotPasswordLink: 'نسيت كلمة المرور؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
    signUpNow: 'سجل الآن',
    signInNow: 'سجل دخولك',
    resetTokenLabel: 'أدخل رمز إعادة التعيين',
    newPasswordLabel: 'كلمة المرور الجديدة',
    submitBtn: 'إرسال',

    // Dashboard General
    welcomeBack: 'مرحباً بك مجدداً،',
    roleStudent: 'طالب',
    roleTeacher: 'مشرف أكاديمي',
    roleAdmin: 'مدير النظام',
    myProfile: 'ملفي الشخصي',
    activeTraining: 'تدريب نشط',
    completedHours: 'مكتمل',
    totalStudents: 'إجمالي الطلاب',
    totalTeachers: 'إجمالي المشرفين',
    totalLocations: 'إجمالي المواقع',
    totalVisits: 'إجمالي الزيارات',
    loading: 'جاري التحميل...',
    saving: 'جاري الحفظ...',
    saveSettings: 'حفظ الإعدادات',
    saveProfile: 'حفظ الملف الشخصي',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    actions: 'الإجراءات',
    searchPlaceholder: 'بحث...',

    // Sidebar Items
    sideDashboard: 'لوحة التحكم',
    sideMyProfile: 'ملفي الشخصي',
    sideMyStudents: 'طلابي',
    sideReports: 'التقارير',
    sideUsers: 'إدارة المستخدمين',
    sideAssignments: 'التعيينات والربط',
    sideLocations: 'مواقع الصيدليات',

    // Profile Page
    personalInfo: 'المعلومات الشخصية',
    trainingInfo: 'معلومات التدريب',
    universityLabel: 'الجامعة',
    hardcodedUniversity: 'جامعة الحدباء',
    pharmacyNameLabel: 'اسم صيدلية التدريب',
    startDateLabel: 'تاريخ البدء',
    endDateLabel: 'تاريخ الانتهاء',
    gpsLocation: 'الموقع الجغرافي (GPS)',
    gpsHint: 'انقر على الخريطة لتثبيت الإحداثيات الجغرافية الدقيقة للصيدلية.',
    changePhoto: 'تغيير الصورة',
    photoHint: 'صيغ JPG، PNG حتى 2 ميغابايت',
    passwordPlaceholder: '••••••••',
    passwordHint: 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية',

    // Location Modal / Page
    addLocation: 'إضافة موقع',
    editLocation: 'تعديل موقع',
    addPharmacyLocation: 'إضافة موقع صيدلية جديد',
    cityLabel: 'المدينة',
    regionLabel: 'المنطقة',
    cityPlaceholder: 'مثال: الموصل',
    regionPlaceholder: 'مثال: الزهور',
    cantFindLocationBtn: 'لا تجد موقعك؟ أضف موقعاً جديداً',
    addAndSelectBtn: 'إضافة وتحديد الموقع',

    // Teacher Student View & Visits
    assignedStudents: 'الطلاب المعينون',
    studentName: 'اسم الطالب',
    phone: 'رقم الهاتف',
    visitStatus: 'حالة الزيارة',
    viewOnMap: 'عرض على الخريطة',
    logVisit: 'تسجيل زيارة',
    notVisited: 'لم يتم زيارته',
    visited: 'تمت الزيارة',
    visitDate: 'تاريخ الزيارة',
    notes: 'ملاحظات وتوجيهات',
    logVisitTitle: 'سجل زيارة لـ',
    studentProfileTitle: 'ملف الطالب الشخصي',

    // Admin Pages
    userMgmt: 'إدارة المستخدمين',
    roleFilter: 'جميع الأدوار',
    addUser: 'إضافة مستخدم',
    resetTokenBtn: 'إعادة تعيين الرمز',
    generateToken: 'توليد رمز إعادة تعيين كلمة المرور',
    tokenHelp: 'شارك هذا الرمز مع المستخدم ليتمكن من إعادة تعيين كلمة المرور الخاصة به في شاشة الدخول.',
    copyToken: 'نسخ الرمز',
    generatedTokenLabel: 'الرمز المولد',
    assignmentsTitle: 'تعيينات الطلاب والمشرفين',
    assignTeacher: 'تعيين مشرف',
    statusLabel: 'الحالة',
    reportStatus: 'الحالة',
    reportApproved: 'مقبول',
    reportRejected: 'مرفوض',
    approve: 'موافقة',
    reject: 'رفض',
    addReport: 'تقديم تقرير يومي',
    reportTitle: 'عنوان التقرير',
    reportContent: 'ملخص النشاط اليومي الصيدلاني',
    noReportsYet: 'لم يتم تسجيل أي تقارير تدريبية بعد.',
    noStudentsYet: 'لا يوجد طلاب معينين حالياً.',
    notificationsTitle: 'الإشعارات',
    markAllRead: 'تحديد الكل كمقروء',
    noNotificationsYet: 'لا توجد إشعارات بعد.',
    filterByLocation: 'تصفية حسب الموقع',
    allLocations: 'جميع المواقع',
    searchAddress: 'بحث عن عنوان',
    locating: 'جاري تحديد الموقع...',
    locationFound: 'تم العثور على الموقع!',
    addressSearchPlaceholder: 'اكتب اسم الصيدلية أو الشارع...',
    pharmacyLocation: 'موقع الصيدلية',
  }
};

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('ptms_lang');
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    localStorage.setItem('ptms_lang', locale);
    
    // Set custom font for Arabic
    if (locale === 'ar') {
      document.body.style.fontFamily = "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif";
    } else {
      document.body.style.fontFamily = '';
    }
  }, [locale]);

  const toggleLanguage = () => {
    setLocale(p => p === 'en' ? 'ar' : 'en');
  };

  const t = (key) => {
    return translations[locale][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
