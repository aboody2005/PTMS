'use client';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';

const MapInner = dynamic(() => import('@/components/MapInner'), { ssr: false });


const IRAQ_PLACES = [
  // NINEVEH sub-districts
  { ar: 'زمار',          en: 'Zammar',          latMin: 36.50, latMax: 36.66, lngMin: 42.54, lngMax: 42.72 },
  { ar: 'قيارة',         en: 'Qayyarah',        latMin: 35.73, latMax: 35.87, lngMin: 43.20, lngMax: 43.38 },
  { ar: 'تلكيف',         en: 'Telkef',          latMin: 36.46, latMax: 36.59, lngMin: 43.03, lngMax: 43.19 },
  { ar: 'بعشيقة',        en: 'Ba-ashiqa',       latMin: 36.46, latMax: 36.59, lngMin: 43.35, lngMax: 43.52 },
  { ar: 'الحمدانية',     en: 'Hamdaniyah',      latMin: 36.17, latMax: 36.31, lngMin: 43.40, lngMax: 43.60 },
  { ar: 'شيخان',         en: 'Shaykhan',        latMin: 36.58, latMax: 36.74, lngMin: 43.24, lngMax: 43.48 },
  { ar: 'الحضر',         en: 'Al-Hadr',         latMin: 35.50, latMax: 35.66, lngMin: 42.62, lngMax: 42.82 },
  { ar: 'البعاج',        en: 'Al-Baaj',         latMin: 35.97, latMax: 36.12, lngMin: 41.77, lngMax: 41.99 },
  { ar: 'ربيعة',         en: 'Rabiah',          latMin: 36.60, latMax: 36.78, lngMin: 42.00, lngMax: 42.22 },
  { ar: 'محلبية',        en: 'Mahlabia',        latMin: 36.20, latMax: 36.32, lngMin: 42.60, lngMax: 42.78 },
  { ar: 'بادوش',         en: 'Badush',          latMin: 36.36, latMax: 36.47, lngMin: 42.88, lngMax: 43.04 },
  { ar: 'سنجار',         en: 'Sinjar',          latMin: 36.27, latMax: 36.46, lngMin: 41.77, lngMax: 42.02 },
  { ar: 'تلعفر',         en: 'Tal Afar',        latMin: 36.32, latMax: 36.52, lngMin: 42.26, lngMax: 42.52 },
  { ar: 'الموصل',        en: 'Mosul',           latMin: 36.24, latMax: 36.48, lngMin: 43.04, lngMax: 43.25 },
  // DOHUK
  { ar: 'زاخو',          en: 'Zakho',           latMin: 37.06, latMax: 37.20, lngMin: 42.65, lngMax: 42.85 },
  { ar: 'عمادية',        en: 'Amadiyah',        latMin: 37.03, latMax: 37.17, lngMin: 43.44, lngMax: 43.59 },
  { ar: 'زركا',          en: 'Zerka',           latMin: 36.84, latMax: 36.94, lngMin: 42.89, lngMax: 42.98 },
  { ar: 'سميل',          en: 'Semel',           latMin: 36.80, latMax: 36.91, lngMin: 42.74, lngMax: 42.88 },
  { ar: 'عقرة',          en: 'Aqrah',           latMin: 36.70, latMax: 36.80, lngMin: 43.84, lngMax: 43.98 },
  { ar: 'دهوك',          en: 'Dohuk',           latMin: 36.82, latMax: 37.02, lngMin: 42.96, lngMax: 43.12 },
  // ERBIL
  { ar: 'شقلاوة',        en: 'Shaqlawa',        latMin: 36.36, latMax: 36.48, lngMin: 44.24, lngMax: 44.42 },
  { ar: 'كويسنجق',       en: 'Koisanjaq',       latMin: 36.02, latMax: 36.16, lngMin: 44.54, lngMax: 44.72 },
  { ar: 'خبات',          en: 'Khabat',          latMin: 36.17, latMax: 36.31, lngMin: 43.76, lngMax: 43.96 },
  { ar: 'مخمور',         en: 'Makhmur',         latMin: 35.71, latMax: 35.85, lngMin: 43.50, lngMax: 43.68 },
  { ar: 'سوران',         en: 'Soran',           latMin: 36.58, latMax: 36.72, lngMin: 44.44, lngMax: 44.64 },
  { ar: 'أربيل',         en: 'Erbil',           latMin: 36.12, latMax: 36.32, lngMin: 43.95, lngMax: 44.15 },
  // SULAYMANIYAH
  { ar: 'رانية',         en: 'Rania',           latMin: 36.21, latMax: 36.35, lngMin: 44.80, lngMax: 44.98 },
  { ar: 'دوكان',         en: 'Dokan',           latMin: 35.87, latMax: 36.01, lngMin: 44.88, lngMax: 45.06 },
  { ar: 'قلعة دزة',      en: 'Qala Diza',       latMin: 36.12, latMax: 36.24, lngMin: 45.06, lngMax: 45.22 },
  { ar: 'كلار',          en: 'Kalar',           latMin: 34.57, latMax: 34.70, lngMin: 45.24, lngMax: 45.42 },
  { ar: 'پنجوين',        en: 'Penjwen',         latMin: 35.56, latMax: 35.70, lngMin: 45.86, lngMax: 46.04 },
  { ar: 'حلبجة',         en: 'Halabja',         latMin: 35.13, latMax: 35.28, lngMin: 45.93, lngMax: 46.13 },
  { ar: 'السليمانية',    en: 'Sulaymaniyah',    latMin: 35.47, latMax: 35.65, lngMin: 45.36, lngMax: 45.54 },
  // KIRKUK
  { ar: 'الحويجة',       en: 'Hawija',          latMin: 35.30, latMax: 35.44, lngMin: 43.73, lngMax: 43.97 },
  { ar: 'داقوق',         en: 'Daquq',           latMin: 34.94, latMax: 35.08, lngMin: 44.22, lngMax: 44.46 },
  { ar: 'كركوك',         en: 'Kirkuk',          latMin: 35.38, latMax: 35.55, lngMin: 44.28, lngMax: 44.52 },
  // SALAH AD-DIN
  { ar: 'بيجي',          en: 'Baiji',           latMin: 34.87, latMax: 35.01, lngMin: 43.38, lngMax: 43.58 },
  { ar: 'الشرقاط',       en: 'Shirqat',         latMin: 35.44, latMax: 35.60, lngMin: 43.18, lngMax: 43.36 },
  { ar: 'بلد',           en: 'Balad',           latMin: 33.94, latMax: 34.08, lngMin: 43.82, lngMax: 44.02 },
  { ar: 'الدجيل',        en: 'Dujail',          latMin: 33.78, latMax: 33.92, lngMin: 44.14, lngMax: 44.34 },
  { ar: 'الضلوعية',      en: 'Dhuluyiah',       latMin: 33.75, latMax: 33.89, lngMin: 43.77, lngMax: 43.97 },
  { ar: 'يثرب',          en: 'Yathrib',         latMin: 33.92, latMax: 34.02, lngMin: 44.30, lngMax: 44.40 },
  { ar: 'العلم',         en: 'Al-Alam',         latMin: 34.65, latMax: 34.75, lngMin: 43.64, lngMax: 43.75 },
  { ar: 'تكريت',         en: 'Tikrit',          latMin: 34.46, latMax: 34.64, lngMin: 43.60, lngMax: 43.82 },
  { ar: 'سامراء',        en: 'Samarra',         latMin: 34.12, latMax: 34.30, lngMin: 43.78, lngMax: 44.00 },
  // ANBAR
  { ar: 'هيت',           en: 'Hit',             latMin: 33.58, latMax: 33.72, lngMin: 42.74, lngMax: 42.94 },
  { ar: 'حديثة',         en: 'Haditha',         latMin: 34.06, latMax: 34.20, lngMin: 42.28, lngMax: 42.48 },
  { ar: 'عانة',          en: 'Ana',             latMin: 34.41, latMax: 34.54, lngMin: 41.92, lngMax: 42.08 },
  { ar: 'راوة',          en: 'Rawah',           latMin: 34.43, latMax: 34.55, lngMin: 41.83, lngMax: 41.99 },
  { ar: 'القائم',        en: 'Al-Qaim',         latMin: 34.32, latMax: 34.46, lngMin: 40.98, lngMax: 41.18 },
  { ar: 'الكرمة',        en: 'Karma',           latMin: 33.38, latMax: 33.52, lngMin: 43.81, lngMax: 43.99 },
  { ar: 'أبو غريب',      en: 'Abu Ghraib',      latMin: 33.22, latMax: 33.36, lngMin: 43.96, lngMax: 44.15 },
  { ar: 'الرمادي',       en: 'Ramadi',          latMin: 33.32, latMax: 33.52, lngMin: 43.12, lngMax: 43.40 },
  { ar: 'الفلوجة',       en: 'Fallujah',        latMin: 33.28, latMax: 33.48, lngMin: 43.68, lngMax: 43.92 },
  // DIYALA
  { ar: 'المقدادية',     en: 'Muqdadiyah',      latMin: 33.90, latMax: 34.04, lngMin: 44.82, lngMax: 45.00 },
  { ar: 'خانقين',        en: 'Khanaqin',        latMin: 34.24, latMax: 34.38, lngMin: 45.32, lngMax: 45.50 },
  { ar: 'جلولاء',        en: 'Jalawla',         latMin: 34.21, latMax: 34.35, lngMin: 45.05, lngMax: 45.25 },
  { ar: 'قرة تبة',       en: 'Qara Tapa',       latMin: 34.40, latMax: 34.54, lngMin: 44.84, lngMax: 45.02 },
  { ar: 'الخالص',        en: 'Khalis',          latMin: 33.78, latMax: 33.88, lngMin: 44.45, lngMax: 44.58 },
  { ar: 'بعقوبة',        en: 'Baqubah',         latMin: 33.68, latMax: 33.84, lngMin: 44.55, lngMax: 44.73 },
  // BAGHDAD areas
  { ar: 'المدائن',       en: 'Madain',          latMin: 33.05, latMax: 33.15, lngMin: 44.52, lngMax: 44.65 },
  { ar: 'المحمودية',     en: 'Mahmudiyah',      latMin: 33.00, latMax: 33.14, lngMin: 44.28, lngMax: 44.46 },
  { ar: 'اللطيفية',      en: 'Latifiyah',       latMin: 32.93, latMax: 33.07, lngMin: 44.18, lngMax: 44.36 },
  { ar: 'اليوسفية',      en: 'Yusufiyah',       latMin: 32.99, latMax: 33.13, lngMin: 44.10, lngMax: 44.28 },
  { ar: 'الكاظمية',      en: 'Kadhimiyah',      latMin: 33.34, latMax: 33.42, lngMin: 44.29, lngMax: 44.37 },
  { ar: 'الكرادة',       en: 'Karrada',         latMin: 33.27, latMax: 33.33, lngMin: 44.39, lngMax: 44.47 },
  { ar: 'الأعظمية',      en: 'Adhamiyah',       latMin: 33.34, latMax: 33.41, lngMin: 44.37, lngMax: 44.45 },
  { ar: 'الدورة',        en: 'Dora',            latMin: 33.22, latMax: 33.29, lngMin: 44.33, lngMax: 44.46 },
  { ar: 'مدينة الصدر',   en: 'Sadr City',       latMin: 33.33, latMax: 33.42, lngMin: 44.45, lngMax: 44.56 },
  { ar: 'بغداد',         en: 'Baghdad',         latMin: 33.18, latMax: 33.48, lngMin: 44.22, lngMax: 44.57 },
  // WASIT
  { ar: 'النعمانية',     en: 'Numaniyah',       latMin: 32.47, latMax: 32.61, lngMin: 45.30, lngMax: 45.48 },
  { ar: 'الحي',          en: 'Al-Hayy',         latMin: 32.10, latMax: 32.24, lngMin: 45.95, lngMax: 46.13 },
  { ar: 'بدرة',          en: 'Badra',           latMin: 33.03, latMax: 33.17, lngMin: 45.92, lngMax: 46.11 },
  { ar: 'زرباطية',       en: 'Zurbatiyah',      latMin: 33.14, latMax: 33.28, lngMin: 46.16, lngMax: 46.34 },
  { ar: 'العزيزية',      en: 'Aziziyah',        latMin: 32.84, latMax: 32.98, lngMin: 45.00, lngMax: 45.18 },
  { ar: 'الكوت',         en: 'Kut',             latMin: 32.40, latMax: 32.56, lngMin: 45.74, lngMax: 45.92 },
  // BABIL
  { ar: 'المسيب',        en: 'Musayyib',        latMin: 32.71, latMax: 32.85, lngMin: 44.21, lngMax: 44.39 },
  { ar: 'المحاويل',      en: 'Mahawil',         latMin: 32.75, latMax: 32.89, lngMin: 44.46, lngMax: 44.62 },
  { ar: 'الهاشمية',      en: 'Hashimiyah',      latMin: 32.38, latMax: 32.52, lngMin: 44.55, lngMax: 44.73 },
  { ar: 'الإسكندرية',    en: 'Iskandariyah',    latMin: 32.84, latMax: 32.98, lngMin: 44.28, lngMax: 44.46 },
  { ar: 'القاسم',        en: 'Al-Qasim',        latMin: 32.56, latMax: 32.70, lngMin: 44.65, lngMax: 44.83 },
  { ar: 'الكفل',         en: 'Al-Kifl',         latMin: 32.18, latMax: 32.28, lngMin: 44.32, lngMax: 44.44 },
  { ar: 'جرف الصخر',     en: 'Jurf Al-Sakhr',   latMin: 32.80, latMax: 32.96, lngMin: 44.14, lngMax: 44.28 },
  { ar: 'النيل',         en: 'Al-Neel',         latMin: 32.55, latMax: 32.69, lngMin: 44.13, lngMax: 44.31 },
  { ar: 'الشوملي',       en: 'Shomali',         latMin: 32.24, latMax: 32.38, lngMin: 44.70, lngMax: 44.88 },
  { ar: 'الحلة',         en: 'Hilla',           latMin: 32.38, latMax: 32.56, lngMin: 44.33, lngMax: 44.51 },
  // KARBALA
  { ar: 'عين التمر',     en: 'Ain Al-Tamur',    latMin: 32.50, latMax: 32.62, lngMin: 43.40, lngMax: 43.56 },
  { ar: 'طويريج',        en: 'Tuwayrij',        latMin: 32.48, latMax: 32.58, lngMin: 44.15, lngMax: 44.28 },
  { ar: 'الحر',          en: 'Al-Hurr',         latMin: 32.58, latMax: 32.68, lngMin: 43.92, lngMax: 44.04 },
  { ar: 'كربلاء',        en: 'Karbala',         latMin: 32.52, latMax: 32.68, lngMin: 43.93, lngMax: 44.07 },
  // NAJAF
  { ar: 'الحيدرية',      en: 'Haydariyah',      latMin: 32.25, latMax: 32.38, lngMin: 44.20, lngMax: 44.34 },
  { ar: 'المشخاب',       en: 'Mishkhab',        latMin: 31.71, latMax: 31.85, lngMin: 44.40, lngMax: 44.58 },
  { ar: 'المناذرة',      en: 'Manadhira',       latMin: 31.92, latMax: 32.04, lngMin: 44.50, lngMax: 44.64 },
  { ar: 'الكوفة',        en: 'Kufa',            latMin: 31.96, latMax: 32.08, lngMin: 44.35, lngMax: 44.52 },
  { ar: 'النجف',         en: 'Najaf',           latMin: 31.88, latMax: 32.02, lngMin: 44.18, lngMax: 44.38 },
  // QADISIYYAH
  { ar: 'الشامية',       en: 'Shamiyah',        latMin: 31.90, latMax: 32.04, lngMin: 44.52, lngMax: 44.70 },
  { ar: 'عفك',           en: 'Afak',            latMin: 32.00, latMax: 32.14, lngMin: 45.16, lngMax: 45.34 },
  { ar: 'الحمزة',        en: 'Hamza',           latMin: 31.61, latMax: 31.75, lngMin: 44.86, lngMax: 45.04 },
  { ar: 'الدغارة',       en: 'Daghara',         latMin: 32.08, latMax: 32.18, lngMin: 44.88, lngMax: 44.98 },
  { ar: 'الديوانية',     en: 'Diwaniyah',       latMin: 31.93, latMax: 32.07, lngMin: 44.85, lngMax: 45.03 },
  // MUTHANNA
  { ar: 'الرميثة',       en: 'Rumaitha',        latMin: 31.46, latMax: 31.60, lngMin: 45.12, lngMax: 45.32 },
  { ar: 'الخضر',         en: 'Al-Khadhir',      latMin: 31.26, latMax: 31.40, lngMin: 45.82, lngMax: 46.02 },
  { ar: 'السماوة',       en: 'Samawa',          latMin: 31.24, latMax: 31.40, lngMin: 45.22, lngMax: 45.40 },
  // DHI QAR
  { ar: 'سوق الشيوخ',   en: 'Suq Al-Shuyukh',  latMin: 30.80, latMax: 30.94, lngMin: 46.35, lngMax: 46.53 },
  { ar: 'الجبايش',       en: 'Jabayish',        latMin: 31.08, latMax: 31.22, lngMin: 46.90, lngMax: 47.10 },
  { ar: 'الرفاعي',       en: 'Rifai',           latMin: 31.65, latMax: 31.77, lngMin: 46.04, lngMax: 46.16 },
  { ar: 'الشطرة',        en: 'Shatra',          latMin: 31.33, latMax: 31.47, lngMin: 46.08, lngMax: 46.26 },
  { ar: 'قلعة سكر',      en: 'Qalat Sukkar',    latMin: 31.80, latMax: 31.92, lngMin: 46.00, lngMax: 46.14 },
  { ar: 'الناصرية',      en: 'Nasiriyah',       latMin: 30.93, latMax: 31.07, lngMin: 46.18, lngMax: 46.38 },
  // MAYSAN
  { ar: 'المجر الكبير',  en: 'Majjar Al-Kabir', latMin: 31.52, latMax: 31.64, lngMin: 47.08, lngMax: 47.24 },
  { ar: 'قلعة صالح',     en: 'Qalat Salih',     latMin: 31.45, latMax: 31.59, lngMin: 47.18, lngMax: 47.36 },
  { ar: 'علي الغربي',    en: 'Ali Al-Gharbi',   latMin: 32.40, latMax: 32.54, lngMin: 46.60, lngMax: 46.78 },
  { ar: 'علي الشرقي',    en: 'Ali Al-Sharqi',   latMin: 32.05, latMax: 32.17, lngMin: 46.66, lngMax: 46.79 },
  { ar: 'العمارة',       en: 'Amarah',          latMin: 31.73, latMax: 31.87, lngMin: 46.98, lngMax: 47.18 },
  // BASRA
  { ar: 'الزبير',        en: 'Zubair',          latMin: 30.32, latMax: 30.46, lngMin: 47.62, lngMax: 47.80 },
  { ar: 'أبو الخصيب',    en: 'Abu Al-Khasib',   latMin: 30.38, latMax: 30.51, lngMin: 47.91, lngMax: 48.09 },
  { ar: 'الفاو',         en: 'Faw',             latMin: 29.87, latMax: 30.09, lngMin: 48.35, lngMax: 48.60 },
  { ar: 'القرنة',        en: 'Qurnah',          latMin: 30.94, latMax: 31.08, lngMin: 47.34, lngMax: 47.52 },
  { ar: 'الهارثة',       en: 'Hartha',          latMin: 30.53, latMax: 30.66, lngMin: 47.79, lngMax: 47.93 },
  { ar: 'أم قصر',        en: 'Umm Qasr',        latMin: 29.96, latMax: 30.10, lngMin: 47.84, lngMax: 48.02 },
  { ar: 'سفوان',         en: 'Safwan',          latMin: 30.02, latMax: 30.16, lngMin: 47.70, lngMax: 47.88 },
  { ar: 'البصرة',        en: 'Basra',           latMin: 30.44, latMax: 30.60, lngMin: 47.68, lngMax: 47.88 },
];

const _SORTED = [...IRAQ_PLACES].sort((a, b) =>
  (a.latMax-a.latMin)*(a.lngMax-a.lngMin) - (b.latMax-b.latMin)*(b.lngMax-b.lngMin)
);

function detectCity(lat, lng) {
  if (!lat || !lng) return null;
  const la = Number(lat), lo = Number(lng);
  for (const p of _SORTED) {
    if (la >= p.latMin && la <= p.latMax && lo >= p.lngMin && lo <= p.lngMax)
      return { ar: p.ar, en: p.en };
  }
  return null;
}


export default function GpsAuditPage() {
  const { locale } = useTranslation();
  const ar = locale === 'ar';

  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterGps, setFilterGps]   = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [sortOrder, setSortOrder]   = useState('asc');
  const [mapStudent, setMapStudent]  = useState(null);
  const [isMobile, setIsMobile]     = useState(false);
  const [exporting, setExporting]   = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles!user_id(id, name, email, phone, gender)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStudents(data || []);
    } catch {
      toast.error(ar ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enriched = useMemo(() =>
    students.map(s => ({
      ...s,
      _profile: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
      _city: detectCity(s.latitude, s.longitude),
      _hasGps: !!(s.latitude && s.longitude),
    })), [students]);

  const cityOptions = useMemo(() => {
    const seen = new Map();
    enriched.forEach(s => {
      if (s._city && !seen.has(s._city.en)) seen.set(s._city.en, s._city);
    });
    return Array.from(seen.values()).sort((a, b) =>
      (ar ? a.ar : a.en).localeCompare(ar ? b.ar : b.en, ar ? 'ar' : 'en')
    );
  }, [enriched, ar]);

  const filtered = useMemo(() => {
    let r = enriched;
    if (filterGps === 'has_gps') r = r.filter(s => s._hasGps);
    else if (filterGps === 'no_gps') r = r.filter(s => !s._hasGps);
    if (filterCity) r = r.filter(s => s._city?.en === filterCity);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(s =>
        s._profile?.name?.toLowerCase().includes(q) ||
        s._profile?.phone?.includes(q) ||
        s.pharmacy_name?.toLowerCase().includes(q) ||
        s._city?.ar?.includes(q) ||
        s._city?.en?.toLowerCase().includes(q)
      );
    }
    return [...r].sort((a, b) => {
      const cmp = (a._profile?.name || '').localeCompare(b._profile?.name || '', 'ar', { sensitivity: 'accent' });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [enriched, filterGps, filterCity, search, sortOrder]);

  const withGps    = enriched.filter(s => s._hasGps).length;
  const withoutGps = enriched.length - withGps;

  const handleExport = async () => {
    if (!filtered.length) return toast.error(ar ? 'لا توجد بيانات للتصدير' : 'No data to export');
    setExporting(true);
    try {
      const headers = ar
        ? ['#', 'اسم الطالب', 'الهاتف', 'اسم الصيدلية', 'القضاء/الناحية/القرية', 'خط العرض', 'خط الطول', 'رابط الخريطة']
        : ['#', 'Student Name', 'Phone', 'Pharmacy', 'District/Sub-district/Village', 'Latitude', 'Longitude', 'Map Link'];
      const rows = filtered.map((s, i) => [
        i + 1,
        s._profile?.name || '',
        s._profile?.phone || '',
        s.pharmacy_name || '',
        s._city ? (ar ? s._city.ar : s._city.en) : (ar ? 'غير معروفة' : 'Unknown'),
        s._hasGps ? Number(s.latitude) : '',
        s._hasGps ? Number(s.longitude) : '',
        s._hasGps ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}` : '',
      ]);
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 50 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, ar ? 'تدقيق المواقع' : 'GPS Audit');
      XLSX.writeFile(wb, `gps_audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(ar ? 'تم التصدير بنجاح ✓' : 'Exported successfully ✓');
    } catch (err) {
      console.error(err);
      toast.error(ar ? 'فشل التصدير' : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const CityBadge = ({ city }) => !city
    ? <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
    : <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '2px 9px', fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {ar ? city.ar : city.en}
      </span>;

  const CoordBadge = ({ value, color, bg }) => value
    ? <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color, background: bg, padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>{Number(value).toFixed(6)}</span>
    : <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.78rem' }}>⚠ {ar ? 'غير محدد' : 'Not set'}</span>;

  const btnFilter = (key, label) => (
    <button
      key={key}
      onClick={() => setFilterGps(key)}
      style={{
        padding: '6px 14px', borderRadius: 8,
        border: filterGps === key ? 'none' : '1px solid var(--border)',
        background: filterGps === key ? 'var(--accent)' : 'var(--surface)',
        color: filterGps === key ? '#fff' : 'var(--text-secondary)',
        fontWeight: filterGps === key ? 700 : 400,
        cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  return (
    <div style={{ direction: ar ? 'rtl' : 'ltr' }}>

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', width: 42, height: 42, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>📍</span>
            {ar ? 'تدقيق المواقع' : 'GPS Location Audit'}
          </h1>
          <p className="text-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>
            {ar ? 'إحداثيات GPS لجميع الطلبة مع الكشف التلقائي عن المدينة' : 'GPS coordinates with automatic Iraqi city detection'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { icon: '👥', label: ar ? 'إجمالي الطلبة' : 'Total Students', value: enriched.length, color: 'var(--accent)', bg: 'var(--accent-dim)', key: 'all' },
          { icon: '📍', label: ar ? 'لديهم GPS' : 'Has GPS', value: withGps, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', key: 'has_gps' },
          { icon: '❌', label: ar ? 'بدون GPS' : 'No GPS', value: withoutGps, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', key: 'no_gps' },
          { icon: '🗺️', label: ar ? 'الأقضية والنواحي والقرى' : 'Districts & Villages', value: cityOptions.length, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', key: null },
        ].map(({ icon, label, value, color, bg, key }) => (
          <div key={label} className="stat-card"
            onClick={() => key && setFilterGps(p => p === key ? 'all' : key)}
            style={{ cursor: key ? 'pointer' : 'default', outline: key && filterGps === key ? `2px solid ${color}` : '2px solid transparent', transition: 'outline 0.15s' }}>
            <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="stat-info">
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
              <h3 style={{ margin: 0, color }}>{value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: '1 1 200px' }}>
          <span className="search-icon">🔍</span>
          <input className="form-control" placeholder={ar ? 'بحث باسم الطالب أو الصيدلية...' : 'Search by name or pharmacy...'}
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingInlineStart: 36 }} />
        </div>

        <select className="form-control" style={{ width: 220 }} value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          <option value="">{ar ? '🗺️ الأقضية والنواحي والقرى' : '🗺️ Districts & Villages'}</option>
          {cityOptions.map(c => <option key={c.en} value={c.en}>{ar ? c.ar : c.en}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {btnFilter('all',     ar ? 'الكل'      : 'All')}
          {btnFilter('has_gps', ar ? 'لديهم GPS' : 'Has GPS')}
          {btnFilter('no_gps',  ar ? 'بدون GPS'  : 'No GPS')}
        </div>

        <select className="form-control" style={{ width: 170 }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
          <option value="asc">{ar ? 'الاسم: أ — ي' : 'Name: A — Z'}</option>
          <option value="desc">{ar ? 'الاسم: ي — أ' : 'Name: Z — A'}</option>
        </select>

        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>{loading ? '⏳' : '🔄'} {ar ? 'تحديث' : 'Refresh'}</button>

        <button className="btn btn-sm" onClick={handleExport} disabled={exporting || !filtered.length}
          style={{ background: 'linear-gradient(135deg,#22863a,#2ea043)', borderColor: '#22863a', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {exporting ? '⏳' : '📥'} {ar ? 'تصدير Excel' : 'Export Excel'}
        </button>
      </div>

      {(filterCity || filterGps !== 'all' || search) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>{ar ? 'الفلاتر النشطة:' : 'Active filters:'}</span>
          {filterCity && (
            <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '2px 10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              🗺️ {ar ? cityOptions.find(c => c.en === filterCity)?.ar : filterCity}
              <button onClick={() => setFilterCity('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 0 }}>✕</button>
            </span>
          )}
          <span style={{ marginInlineStart: 'auto', fontWeight: 600, color: 'var(--accent)' }}>
            {ar ? `${filtered.length} نتيجة` : `${filtered.length} results`}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ height: 220 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card flex-center" style={{ flexDirection: 'column', padding: '60px 20px', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>🔍</span>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>{ar ? 'لا توجد نتائج' : 'No results found'}</p>
        </div>
      ) : isMobile ? (
        <div>
          {filtered.map((s, idx) => (
            <div key={s.id} style={{ background: 'var(--bg-card, #1a1f2e)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>#{idx + 1}</span>
                  <strong style={{ fontSize: '0.95rem' }}>{s._profile?.name || '—'}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {s._profile?.phone && <div>{s._profile.phone}</div>}
                    {s.pharmacy_name && <div>{s.pharmacy_name}</div>}
                  </div>
                </div>
                <span style={{ background: s._hasGps ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: s._hasGps ? '#22c55e' : '#ef4444', border: `1px solid ${s._hasGps ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {s._hasGps ? '📍 GPS' : (ar ? '❌ لا يوجد GPS' : '❌ No GPS')}
                </span>
              </div>
              <div style={{ marginBottom: 8 }}><CityBadge city={s._city} /></div>
              <div style={{ background: 'var(--surface-alt, rgba(0,0,0,0.1))', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                {s._hasGps ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{ar ? 'خط العرض: ' : 'Lat: '}</span><span style={{ fontWeight: 700, color: '#6366f1' }}>{Number(s.latitude).toFixed(6)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{ar ? 'خط الطول: ' : 'Lng: '}</span><span style={{ fontWeight: 700, color: '#8b5cf6' }}>{Number(s.longitude).toFixed(6)}</span></div>
                  </div>
                ) : <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.78rem' }}>⚠ {ar ? 'لم يتم تحديد الموقع' : 'Location not set'}</span>}
              </div>
              {s._hasGps && (
                <button className="btn btn-secondary btn-sm" onClick={() => setMapStudent(s)}
                  style={{ width: '100%', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.4)', color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  🗺️ {ar ? 'عرض الموقع' : 'View Location'}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, width: '100%', overflowX: 'auto' }}>
          <table style={{ tableLayout: 'fixed', width: '100%', minWidth: 1050, borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 42 }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr>
                {['#', ar ? 'اسم الطالب ↕' : 'Student Name ↕', ar ? 'الهاتف' : 'Phone', ar ? 'اسم الصيدلية' : 'Pharmacy', ar ? 'القضاء/الناحية/القرية' : 'District/Sub-district/Village', ar ? 'خط العرض (Lat)' : 'Latitude', ar ? 'خط الطول (Lng)' : 'Longitude', ar ? 'الموقع' : 'Location']
                  .map(h => <th key={h} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id} style={{ verticalAlign: 'middle' }}>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-word' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: s._hasGps ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)', color: s._hasGps ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                        {s._profile?.name?.charAt(0) || '?'}
                      </div>
                      <span style={{ wordBreak: 'break-word' }}>{s._profile?.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s._profile?.phone || '—'}</td>
                  <td style={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>{s.pharmacy_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td><CityBadge city={s._city} /></td>
                  <td><CoordBadge value={s._hasGps ? s.latitude : null} color="#6366f1" bg="rgba(99,102,241,0.08)" /></td>
                  <td><CoordBadge value={s._hasGps ? s.longitude : null} color="#8b5cf6" bg="rgba(139,92,246,0.08)" /></td>
                  <td>
                    {s._hasGps ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => setMapStudent(s)}
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.4)', color: '#6366f1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                        🗺️ {ar ? 'عرض الموقع' : 'View Location'}
                      </button>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 14 }}>
          {ar ? `إجمالي: ${filtered.length} طالب` : `Total: ${filtered.length} student(s)`}
        </p>
      )}

      {mapStudent && (() => {
        const p = mapStudent._profile;
        return (
          <div className="modal-overlay" onClick={() => setMapStudent(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', width: 36, height: 36, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>📍</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{ar ? 'موقع الطالب' : 'Student Location'} — {p?.name || '—'}</h4>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                      {mapStudent.pharmacy_name && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🏥 {mapStudent.pharmacy_name}</span>}
                      {mapStudent._city && (
                        <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                          🏙️ {ar ? mapStudent._city.ar : mapStudent._city.en}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="btn btn-icon btn-secondary" onClick={() => setMapStudent(null)}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 20px', background: 'var(--surface-alt, rgba(0,0,0,0.05))', borderBottom: '1px solid var(--border)', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ar ? 'خط العرض' : 'Latitude'}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 800, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '6px 14px', borderRadius: 8 }}>{Number(mapStudent.latitude).toFixed(6)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', paddingTop: 20 }}>×</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ar ? 'خط الطول' : 'Longitude'}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 800, color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '6px 14px', borderRadius: 8 }}>{Number(mapStudent.longitude).toFixed(6)}</div>
                </div>
              </div>

              <div className="modal-body" style={{ display: 'block' }}>
                <MapInner lat={mapStudent.latitude} lng={mapStudent.longitude} />
              </div>

              <div className="modal-footer">
                <a href={`https://www.google.com/maps?q=${mapStudent.latitude},${mapStudent.longitude}`} target="_blank" rel="noreferrer"
                  className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  🌍 {ar ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                </a>
                <button className="btn btn-primary" onClick={() => setMapStudent(null)}>{ar ? 'إغلاق' : 'Close'}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
