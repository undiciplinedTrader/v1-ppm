// In: src/app/tenders/new/page.tsx

// 1. WICHTIG: Wir markieren diese Seite als Client Component,
//    weil wir den useState-Hook für die Formular-Eingaben benötigen.
"use client";

// --- IMPORTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from '@supabase/supabase-js';
import Link from "next/link";
import { useRouter } from "next/navigation"; // Der neue Router aus 'next/navigation'
import { useState } from "react";

// --- DIE SEITEN-KOMPONENTE ---
export default function NewTenderPage() {
  // Wir benutzen den Router, um später weiterzuleiten
  const router = useRouter();

  // Lokaler State für die Formularfelder (läuft nur im Browser)
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Die Funktion, die beim Abschicken des Formulars aufgerufen wird
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Standard-Formular-Verhalten unterbinden
    setIsSubmitting(true); // Button deaktivieren, um Doppel-Klicks zu verhindern

    // Daten an unsere neue Server Action senden
    try {
      const response = await fetch('/api/tenders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, client }),
      });

      if (!response.ok) {
        throw new Error('Server-Antwort war nicht ok.');
      }
      
      alert('Ausschreibung erfolgreich erstellt!');
      router.push('/tenders'); // Zurück zur Übersichtsseite

    } catch (error) {
      console.error("Fehler beim Erstellen der Ausschreibung:", error);
      alert('Ein Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false); // Button wieder aktivieren
    }
  };

  // Das JSX für die Anzeige
  return (
    <div>
      <Link href="/tenders" className="mb-6 block text-slate-600 hover:underline">
        &larr; Zurück zur Übersicht
      </Link>
      <h1 className="text-4xl font-bold">Neue Ausschreibung anlegen</h1>
      
      <div className="mt-8 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-8 shadow">
          {/* Titel */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="title">Titel der Ausschreibung</Label>
            <Input 
              type="text" 
              id="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Neubau einer Grundschule" required />
          </div>

          {/* Auftraggeber */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="client">Auftraggeber</Label>
            <Input 
              type="text" 
              id="client" 
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="z.B. Stadt Musterstadt" required />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Speichert...' : 'Ausschreibung speichern'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}