// In: src/app/tenders/page.tsx

// WERKZEUGE IMPORTIEREN
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Unser Button von shadcn

// DATEN-TYPEN DEFINIEREN (Gute Praxis mit TypeScript)
// Wir beschreiben, wie ein einzelner 'Tender' aussieht.
interface Tender {
  id: number;
  title: string;
  client: string;
  deadline: string;
}

// DIE SEITEN-KOMPONENTE (ALS ASYNC SERVER COMPONENT)
// Das 'async' Schlüsselwort ist die Magie hier. Es erlaubt uns, 'await' zu benutzen.
export default async function TendersPage() {
  
  // 1. DATEN HOLEN (DIREKT IN DER KOMPONENTE)
  // Dieser Code läuft nur auf dem Server.
  // Er wartet hier auf die Daten von Supabase, bevor der Rest der Seite gebaut wird.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Sicher, da dies eine Server Component ist
  );
  const { data: tenders, error } = await supabase.from('tenders').select('*');

  // Einfaches Error-Handling für den Fall, dass die Datenbank nicht erreichbar ist
  if (error || !tenders) {
    return <p className="text-red-500">Fehler beim Laden der Ausschreibungen.</p>;
  }

  // 2. DAS JSX ZUR ANZEIGE DER DATEN
  // Dieser Teil wird an den Browser geschickt, nachdem die Daten geladen wurden.
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Ausschreibungen</h1>
          <p className="mt-2 text-slate-600">
            Eine dynamische Liste aus der Supabase-Datenbank.
          </p>
        </div>
        <Link href="/tenders/new">
          <Button>+ Neue Ausschreibung</Button>
        </Link>
      </div>
      
      
<div className="mt-8 space-y-4">

  {tenders.map((tender: Tender) => (
    // DIESEN LINK-WRAPPER HINZUFÜGEN
    <Link key={tender.id} href={`/tenders/${tender.id}`} className="block">
      <div className="rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg hover:scale-[1.01]">
        <h3 className="text-xl font-bold">{tender.title}</h3>
        <p className="text-slate-700">Auftraggeber: {tender.client}</p>
        <p className="text-slate-500">
          Frist: {new Date(tender.deadline).toLocaleDateString('de-DE')}
        </p>
      </div>
    </Link>
  ))}
</div>
    </div>
  );
}