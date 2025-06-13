// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OpenAI } from 'https://esm.sh/openai@4'
import { getDocument } from 'https://esm.sh/pdf-parse@1.1.1/lib/pdf.js/v1.10.100/build/pdf.js'

console.log("Hello from Functions!")

// Helfer-Funktion für das robuste Chunking
function chunkText({ text, chunkSize, chunkOverlap }: { text: string, chunkSize: number, chunkOverlap: number }) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - chunkOverlap;
  }
  return chunks;
}

// Hilfsfunktion zur Textbereinigung
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')           // Mehrfache Leerzeichen zu einem
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Füge Leerzeichen zwischen camelCase ein
    .replace(/\b([A-Z]+)([A-Z])([a-z])/g, '$1 $2$3')  // Füge Leerzeichen zwischen ABCdef ein
    .replace(/([a-z])(\d)/g, '$1 $2')  // Füge Leerzeichen zwischen Text und Zahlen ein
    .replace(/(\d)([a-z])/g, '$1 $2')  // Füge Leerzeichen zwischen Zahlen und Text ein
    .replace(/\b(Tel|Fax|E-Mail|Tel\.)\b\s*:?\s*/gi, '$1: ')  // Standardisiere Kontaktbezeichner
    .replace(/\s*\*\s*/g, ' * ')    // Standardisiere Sternchen
    .replace(/\s*-\s*/g, '-')       // Standardisiere Bindestriche
    .replace(/\s*,\s*/g, ', ')      // Standardisiere Kommas
    .replace(/\s*\.\s*/g, '. ')     // Standardisiere Punkte
    .replace(/\s*:\s*/g, ': ')      // Standardisiere Doppelpunkte
    .replace(/\s+/g, ' ')           // Nochmal mehrfache Leerzeichen zu einem
    .trim();
}

// Sichere Chunking-Funktion
function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  try {
    // Sicherheitsprüfungen
    if (!text || typeof text !== 'string') {
      console.warn('[Chunking] Ungültiger Text eingegeben:', text);
      return [];
    }

    // Parameter validieren
    maxChunkSize = Math.max(100, Math.min(maxChunkSize, 8000));  // Zwischen 100 und 8000 Zeichen
    overlap = Math.max(50, Math.min(overlap, maxChunkSize / 2));  // Mindestens 50, maximal die Hälfte der Chunk-Größe

    // Text bereinigen
    const normalizedText = cleanText(text);
    
    // Wenn der Text zu kurz ist, gib ihn direkt zurück
    if (normalizedText.length <= maxChunkSize) {
      return normalizedText.length >= 20 ? [normalizedText] : [];
    }

    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < normalizedText.length) {
      // Bestimme das Ende des aktuellen Chunks
      let endPosition = Math.min(currentPosition + maxChunkSize, normalizedText.length);
      
      // Wenn wir nicht am Ende sind, finde einen geeigneten Breakpoint
      if (endPosition < normalizedText.length) {
        // Suche nach dem letzten Satzende im aktuellen Fenster
        const window = normalizedText.slice(currentPosition, endPosition);
        const lastSentence = window.match(/.*[.!?]\s+[A-Z]/g);
        
        if (lastSentence) {
          // Nimm den letzten gefundenen Satz
          const lastMatch = lastSentence[lastSentence.length - 1];
          endPosition = currentPosition + lastMatch.length;
        } else {
          // Fallback: Suche nach dem letzten Leerzeichen
          const lastSpace = normalizedText.lastIndexOf(' ', endPosition);
          if (lastSpace > currentPosition) {
            endPosition = lastSpace;
          }
        }
      }

      // Extrahiere den Chunk
      const chunk = normalizedText.slice(currentPosition, endPosition).trim();
      
      // Füge nur gültige Chunks hinzu
      if (chunk && chunk.length >= 20) {
        chunks.push(chunk);
      }

      // Bewege die Position weiter, berücksichtige Überlappung
      currentPosition = endPosition;
      if (currentPosition < normalizedText.length) {
        currentPosition = Math.max(endPosition - overlap, currentPosition + 1);
      }

      // Sicherheitscheck: Verhindere Endlosschleifen
      if (chunks.length > 1000) {
        console.warn('[Chunking] Zu viele Chunks erstellt, breche ab...');
        break;
      }
    }

    return chunks;

  } catch (error) {
    console.error('[Chunking] Kritischer Fehler:', error);
    // Fallback: Teile den Text in grobe Chunks auf
    const roughChunks = text.match(/.{1,1000}/g) || [];
    return roughChunks.filter(chunk => chunk.length >= 20);
  }
}

// Die Haupt-Funktion unserer Edge Function
// Sie wird aufgerufen, wenn unsere API sie anstößt.
Deno.serve(async (req) => {
  const data = {
    message: "Hello from Supabase Edge Function!",
    timestamp: new Date().toISOString()
  };

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-document' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
