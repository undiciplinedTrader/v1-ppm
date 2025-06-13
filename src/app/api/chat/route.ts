// In: src/app/api/chat/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Typdefinition für die Chunks aus der Datenbank
interface DocumentChunk {
  raw_content: string;
  enriched_content: string;
  page_number: number;
  similarity?: number;
  chunk_type: string;
  metadata: {
    is_requirement: boolean;
    is_deadline: boolean;
    has_numbers: boolean;
    section_type: string;
  };
}

// Typdefinitionen für bessere Wartbarkeit
interface ChatResponse {
  content: string;
  error?: string;
}

// Ausgelagertes Prompt Template als Funktion
const createChatPrompt = (contextText: string, message: string) => `Du bist ein hilfreicher Assistent für Planungsbüros. Deine Aufgabe ist es, Fragen zu Ausschreibungsdokumenten zu beantworten.

WICHTIGE REGELN:
1. Basiere deine Antwort NUR auf dem bereitgestellten Kontext.
2. Wenn die Information im Kontext vorhanden ist, gib IMMER die Seitenzahl(en) an.
3. Wenn die Information NICHT im Kontext zu finden ist, antworte mit "Diese Information konnte ich im Dokument nicht finden."
4. Sei präzise und fachlich korrekt.
5. Wenn mehrere relevante Stellen gefunden wurden, fasse sie zusammen und zitiere alle Quellen.
6. Bei Kontaktinformationen gib ALLE gefundenen Details an.
7. Achte besonders auf Abschnitte mit den Markierungen [ANFORDERUNG], [FRIST] oder [KENNZAHL].

**Formatierungsregeln:**
- Formatiere deine Antwort immer in klarem und gut lesbarem **GitHub Flavored Markdown**.
- Nutze Aufzählungszeichen ('- ') für Listen von Fakten.
- Nutze nummerierte Listen ('1. ') für schrittweise Anleitungen oder Prozesse.
- Hebe Schlüsselbegriffe oder wichtige Ergebnisse mit Fettdruck hervor ('**wichtig**').
- Formuliere immer in ganzen, professionellen Sätzen.
- Trenne Absätze mit zwei absätzen

**Quellen-Regel:**
- Fasse am ENDE deiner Antwort ALLE verwendeten Quellen in einem separaten Abschnitt zusammen.
- Formatiere den Abschnitt exakt so: "Quellen: [Dateiname, Seite X], [Dateiname, Seite Y]".

Kontext aus dem Ausschreibungsdokument:
${contextText}

Frage: ${message}

Antworte in einem professionellen, sachlichen Ton und beziehe dich explizit auf die Quellen.`;

// Die POST-Funktion, die vom Frontend aufgerufen wird
export async function POST(request: Request) {
  try {
    // 1. User-Frage und Tender-ID aus der Anfrage auslesen
    const { message, tenderId } = await request.json();
    if (!message || !tenderId) {
      return NextResponse.json<ChatResponse>({ 
        content: 'Nachricht und Tender-ID sind erforderlich.',
        error: 'MISSING_PARAMETERS' 
      }, { status: 400 });
    }

    console.log(`[Chat API] Verarbeite Anfrage: "${message}" für Tender ${tenderId}`);

    // 2. Clients für Google AI und Supabase initialisieren
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    });
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. User-Frage in einen Vektor umwandeln (Embedding)
    const embeddingResponse = await embeddingModel.embedContent(message);
    const queryEmbedding = Array.from(embeddingResponse.embedding.values);

    // Direkte Textsuche für bestimmte Arten von Fragen
    let directMatches: any[] = [];
    if (message.toLowerCase().includes('mail') || 
        message.toLowerCase().includes('email') || 
        message.toLowerCase().includes('kontakt') ||
        message.toLowerCase().includes('telefon') ||
        message.toLowerCase().includes('nummer') ||
        message.toLowerCase().includes('adresse')) {
      console.log('[Chat API] Führe zusätzliche direkte Textsuche durch...');
      const { data: textMatches, error: textError } = await supabase
        .from('document_chunks')
        .select('raw_content, enriched_content, metadata')
        .eq('tender_id', tenderId)
        .or(`raw_content.ilike.%E-Mail%,raw_content.ilike.%Tel%,raw_content.ilike.%@%,raw_content.ilike.%Kontakt%`)
        .order('metadata->page_number');

      if (!textError && textMatches) {
        directMatches = textMatches;
        console.log(`[Chat API] Direkte Textsuche fand ${textMatches.length} Treffer`);
      }
    }

    // Vektorsuche durchführen
    console.log('[Chat API] Führe Vektorsuche durch...');
    const { data: chunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_tender_id: tenderId,
      match_threshold: 0.3,
      match_count: 15,
    });

    if (rpcError) {
      console.error('[Chat API] Supabase RPC Error:', rpcError);
      throw rpcError;
    }

    // Kombiniere und dedupliziere die Ergebnisse
    const allChunks = [...(chunks || []), ...directMatches];
    const uniqueChunksMap = new Map(allChunks.map(chunk => [chunk.raw_content, chunk]));
    const uniqueChunks = Array.from(uniqueChunksMap.values());

    console.log(`[Chat API] Gefunden: ${uniqueChunks.length} unique Chunks`);

    if (uniqueChunks.length === 0) {
      console.log('[Chat API] Keine relevanten Chunks gefunden');
      return NextResponse.json<ChatResponse>({ 
        content: "Diese Information konnte ich im Dokument nicht finden. Bitte stellen Sie Ihre Frage anders oder fragen Sie nach einem anderen Aspekt der Ausschreibung."
      });
    }

    // Debug-Logging der gefundenen Chunks
    uniqueChunks.forEach((chunk, index) => {
      console.log(`[Chat API] Chunk ${index + 1} (Typ: ${chunk.metadata?.section_type || 'unbekannt'}):`);
      console.log(chunk.raw_content);
      console.log('---');
    });

    // Optimierte Kontext-Erstellung mit Array.map
    const contextText = uniqueChunks
      .map(chunk => {
        const { metadata = {} } = chunk;
        const contextMarkers = [
          metadata.is_requirement && '[ANFORDERUNG]',
          metadata.is_deadline && '[FRIST]',
          metadata.has_numbers && '[KENNZAHL]',
          `[Typ: ${metadata.section_type || 'unbekannt'}]`,
          `[Seite: ${metadata.page_number || '?'}]`
        ].filter(Boolean).join(' ');

        return `${contextMarkers}\n${chunk.raw_content}`;
      })
      .join('\n\n---\n\n');

    // Generiere den Prompt mit dem Template
    const prompt = createChatPrompt(contextText, message);

    // 7. Die Anfrage an das Gemini-Modell senden
    console.log('[Chat API] Sende Anfrage an Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdownResponse = response.text();
    
    console.log('[Chat API] Antwort erhalten:', markdownResponse);

    // 8. Die Antwort an das Frontend zurücksenden
    return NextResponse.json<ChatResponse>({ content: markdownResponse });

  } catch (error: any) {
    console.error('[Chat API Error]', error);
    return NextResponse.json<ChatResponse>({ 
      content: `Ein Fehler ist aufgetreten: ${error.message}`,
      error: 'INTERNAL_SERVER_ERROR' 
    }, { status: 500 });
  }
}