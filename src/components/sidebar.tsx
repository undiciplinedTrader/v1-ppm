// In: src/components/sidebar.tsx

import Link from 'next/link';

export default function Sidebar() {
  return (
    // HINZUGEFÜGT: "fixed h-screen"
    // 'fixed' nimmt die Sidebar aus dem normalen Fluss und klebt sie am Fenster fest.
    // 'h-screen' gibt ihr die volle Höhe des Bildschirms.
    <aside className="fixed h-screen w-64 bg-white p-6 shadow-lg">
      <div className="mb-12 text-2xl font-bold text-slate-900">10x Akquise</div>
      <nav>
        <ul>
          <li className="mb-5">
            <Link href="/" className="text-lg text-slate-700 hover:text-slate-900 font-medium">
              Dashboard
            </Link>
          </li>
          <li className="mb-5">
            <Link href="/tenders" className="text-lg text-slate-700 hover:text-slate-900 font-medium">
              Ausschreibungen
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}