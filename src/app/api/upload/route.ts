// In: src/app/api/upload/route.ts

// --- Imports der Werkzeuge ---
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// Hilfsfunktion für die Chunk-Erstellung
const createChunk = (section: string, metadata: any, tenderId: number, documentId: number) => ({
  raw_content: section,
  enriched_content: `[Typ: ${metadata.section_type}] [Seite: ${metadata.page_number}] ${
    metadata.is_requirement ? '[ANFORDERUNG] ' : ''}${
    metadata.is_deadline ? '[FRIST] ' : ''}${
    metadata.has_numbers ? '[KENNZAHL] ' : ''}${section}`,
  chunk_type: metadata.section_type,
  metadata: metadata,
  tender_id: tenderId,
  document_id: documentId
});

// Hilfsfunktion für die Metadaten-Erstellung
const createMetadata = (section: string, isHeader: boolean, containsKeyTerms: boolean, pageNumber: number, sectionIndex: number) => ({
  page_number: pageNumber,
  section_type: isHeader ? 'header' : 
                containsKeyTerms ? 'key_section' : 
                'content',
  section_index: sectionIndex,
  is_requirement: /(?:muss|erforderlich|mindestens|zwingend|notwendig)/i.test(section),
  is_deadline: /(?:Frist|Termin|bis zum|spätestens)/i.test(section),
  has_numbers: /\d+(?:[.,]\d+)?(?:\s*(?:€|EUR|Euro|m²|qm|Prozent|%))?/.test(section)
});

// --- Die Haupt-API-Funktion ---
export async function POST(request: Request) {
  console.log('\n--- [API Upload V3] Anfrage erhalten ---');
  try {
    // 1. Daten aus der Anfrage holen
    const formData = await request.formData();
    const tenderId = formData.get('tenderId') as string | null;
    const files = formData.getAll('documents') as File[];

    if (!files || files.length === 0 || !tenderId) {
      throw new Error("Keine Dateien oder Tender-ID erhalten.");
    }

    // 2. Clients initialisieren
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const docAIClient = new DocumentProcessorServiceClient({
      apiEndpoint: 'eu-documentai.googleapis.com',
      projectId: process.env.GOOGLE_PROJECT_ID
    });
    
    const processorName = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/eu/processors/${process.env.DOC_AI_PROCESSOR_ID}`;

    // 3. Dateien verarbeiten
    for (const file of files) {
      console.log(`Verarbeite Datei: ${file.name} (Typ: ${file.type}, Größe: ${file.size} bytes)`);
      
      // Datei in Buffer umwandeln
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}-${file.name}`;

      // Datei speichern
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, fileBuffer, { contentType: file.type });
      
      if (uploadError) throw uploadError;

      // Metadaten speichern
      const { data: documentEntry, error: docError } = await supabase
        .from('documents')
        .insert({ 
          tender_id: parseInt(tenderId), 
          file_name: file.name, 
          file_type: file.type, 
          file_size: file.size, 
          storage_path: uploadData.path 
        })
        .select()
        .single();
      
      if (docError) throw docError;

      // Document AI verarbeiten
      const [result] = await docAIClient.processDocument({
        name: processorName,
        rawDocument: { 
          content: fileBuffer.toString('base64'), 
          mimeType: file.type 
        }
      });

      if (!result.document?.text) {
        throw new Error("Document AI konnte keinen Text extrahieren.");
      }

      // Text in Chunks aufteilen
      const sections = result.document.text.split(/(?=\n\s*\d+[\.)]\s+|(?:\n|^)\s*§\s*\d+|(?:\n|^)Artikel\s+\d+|\n\s*[A-Z][A-Z\s]+(?:\n|$))/g);
      const chunksToEmbed = [];

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (section.length < 50) continue;

        const isHeader = /^(?:\d+[\.)]\s+|§\s*\d+|Artikel\s+\d+|[A-Z][A-Z\s]+$)/.test(section);
        const containsKeyTerms = /(?:Vergabe|Ausschreibung|Leistung|Anforderung|Qualifikation|Frist|Termin|Unterlagen|Angebot|Nachweise|Referenzen|Kosten|Budget|Zeitplan|Projektumfang)/i.test(section);
        const maxChunkSize = isHeader ? 200 : containsKeyTerms ? 800 : 1500;

        if (section.length > maxChunkSize) {
          const subSections = section.split(/(?<=[.!?])\s+(?=[A-Z])|(?=\n\s*[a-z]\)\s+|\n\s*-\s+)/g);
          let currentChunk = '';

          for (const subSection of subSections) {
            if ((currentChunk + subSection).length <= maxChunkSize) {
              currentChunk += (currentChunk ? ' ' : '') + subSection;
            } else {
              if (currentChunk) {
                const metadata = createMetadata(
                  currentChunk, 
                  isHeader, 
                  containsKeyTerms, 
                  result.document.pages?.find(page => page.layout?.textAnchor?.content?.includes(currentChunk))?.pageNumber || 1,
                  i
                );
                chunksToEmbed.push(createChunk(currentChunk, metadata, parseInt(tenderId), documentEntry.id));
              }
              currentChunk = subSection;
            }
          }

          if (currentChunk) {
            const metadata = createMetadata(
              currentChunk, 
              isHeader, 
              containsKeyTerms,
              result.document.pages?.find(page => page.layout?.textAnchor?.content?.includes(currentChunk))?.pageNumber || 1,
              i
            );
            chunksToEmbed.push(createChunk(currentChunk, metadata, parseInt(tenderId), documentEntry.id));
          }
        } else {
          const metadata = createMetadata(
            section, 
            isHeader, 
            containsKeyTerms,
            result.document.pages?.find(page => page.layout?.textAnchor?.content?.includes(section))?.pageNumber || 1,
            i
          );
          chunksToEmbed.push(createChunk(section, metadata, parseInt(tenderId), documentEntry.id));
        }
      }

      // Embeddings erstellen und speichern
      if (chunksToEmbed.length > 0) {
        const chunksToInsert = await Promise.all(
          chunksToEmbed.map(async (chunk) => {
            const response = await embeddingModel.embedContent(chunk.enriched_content);
            return {
              ...chunk,
              embedding: Array.from(response.embedding.values)
            };
          })
        );

        const { error: insertError } = await supabase.from('document_chunks').insert(chunksToInsert);
        if (insertError) throw insertError;
      }
    }
    
    return NextResponse.json({ message: `${files.length} Datei(en) erfolgreich verarbeitet und indiziert!` });

  } catch (error: any) {
    console.error('[API Upload Error]', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}