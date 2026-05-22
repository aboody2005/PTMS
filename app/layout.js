import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'PTMS – Pharmacy Training Management System',
  description: 'A modern platform for managing pharmacy student training, supervision, and reporting in Iraq.',
  keywords: 'pharmacy training, student management, Iraq pharmacy, training system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet" />
      </head>
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
