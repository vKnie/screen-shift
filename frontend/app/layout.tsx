'use client';

import { Source_Sans_3 } from 'next/font/google';

import { useState, useEffect } from 'react';
import "./globals.css";
import Sidebar from './components/Sidebar';
import { usePathname } from 'next/navigation';

const sourceSansPro = Source_Sans_3({
  weight: ['300', '400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans-pro',
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [language, setLanguage] = useState('fr');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const isScreenPage = pathname.startsWith('/screens/');

  return (
    <html lang={language} className={`${sourceSansPro.variable}`}>
      <body className="flex min-h-screen">
        {!isScreenPage && <Sidebar onLanguageChange={handleLanguageChange} />}
        <div className={`flex-1 ${isScreenPage ? '' : 'ml-64'} p-11 px-20`}>
          {children}
        </div>
      </body>
    </html>
  );
}
