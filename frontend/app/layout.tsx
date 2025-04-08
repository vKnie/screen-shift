// app/layout.tsx

import "./globals.css";
import Sidebar from './components/Sidebar';

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64 p-11 px-20">
          {children}
        </div>
      </body>
    </html>
  );
}
