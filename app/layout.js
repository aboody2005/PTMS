import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'react-hot-toast';
import { Plus_Jakarta_Sans, Cairo, Tajawal } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata = {
  title: 'PTMS – Pharmacy Training Management System',
  description: 'A modern platform for managing pharmacy student training, supervision, and reporting in Al-Hadba\'a University.',
  keywords: 'pharmacy training, student management, Iraq pharmacy, training system',
  icons: {
    icon: '/icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning className={`${plusJakartaSans.variable} ${cairo.variable} ${tajawal.variable}`}>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  style: { background: '#1c2128', color: '#e6edf3', border: '1px solid #30363d' },
                  success: { iconTheme: { primary: '#3fb950', secondary: '#1c2128' } },
                  error: { iconTheme: { primary: '#f85149', secondary: '#1c2128' } },
                }}
              />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
