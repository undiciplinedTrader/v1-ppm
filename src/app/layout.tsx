// In: src/app/layout.tsx (Ein robusterer Versuch)

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import Sidebar from "@/components/sidebar";

export const metadata: Metadata = {
  title: "PM-Tool Pro",
  description: "Dein professionelles PM-Tool für Planungsbüros",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${GeistSans.className} bg-slate-50`}>
        {/* Die Sidebar ist 'fixed' und kümmert sich um ihre eigene Positionierung. */}
        <Sidebar />
        
        {/* Der Hauptinhalt bekommt jetzt einen linken Abstand (margin-left),
          der exakt so breit ist wie unsere Sidebar (w-64 = 16rem = ml-64).
          Dadurch startet der Inhalt erst rechts neben der Sidebar.
        */}
        <main className="ml-64 p-8">
            {children}
        </main>
      </body>
    </html>
  );
}