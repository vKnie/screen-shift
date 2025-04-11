'use client';

import { useState, useEffect } from 'react';
import "./globals.css";
import Sidebar from './components/Sidebar';
import { usePathname } from 'next/navigation';

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
    <html lang={language}>
      <body className="flex min-h-screen">
        {!isScreenPage && <Sidebar onLanguageChange={handleLanguageChange} />}
        <div className={`flex-1 ${isScreenPage ? '' : 'ml-64'} p-11 px-20`}>
          {children}
        </div>
      </body>
    </html>
  );
}
