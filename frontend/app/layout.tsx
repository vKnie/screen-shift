// app/layout.tsx
'use client';

import "./globals.css";
import Sidebar from './components/Sidebar';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  const isScreenPage = pathname.startsWith('/screens/');

  return (
    <html lang="fr">
      <body className="flex min-h-screen">

        {!isScreenPage && <Sidebar />}
        <div className={`flex-1 ${isScreenPage ? '' : 'ml-64'} p-11 px-20`}>
          {children}
        </div>
      </body>
    </html>
  );
}
