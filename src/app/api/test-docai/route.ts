import { NextResponse } from 'next/server';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // Überprüfe Umgebungsvariablen
    const envCheck = {
      GOOGLE_CLOUD_PROJECT_ID: {
        status: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'Vorhanden' : 'Fehlt',
        value: process.env.GOOGLE_CLOUD_PROJECT_ID
      },
      GOOGLE_DOCUMENT_AI_PROCESSOR_ID: {
        status: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID ? 'Vorhanden' : 'Fehlt',
        value: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
      }
    };

    // Versuche die Credentials-Datei zu lesen
    let credentials;
    try {
      const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    } catch (e: any) {
      return NextResponse.json({
        message: 'Fehler beim Lesen der Credentials-Datei',
        error: e.message,
        success: false
      }, { status: 400 });
    }

    // Überprüfe Credentials
    const credentialsDetails = {
      hasType: !!credentials.type,
      hasProjectId: !!credentials.project_id,
      hasPrivateKey: !!credentials.private_key,
      type: credentials.type,
      projectIdMatch: credentials.project_id === process.env.GOOGLE_CLOUD_PROJECT_ID
    };

    if (!credentialsDetails.hasType || !credentialsDetails.hasProjectId || !credentialsDetails.hasPrivateKey) {
      return NextResponse.json({
        message: 'Ungültige Credentials',
        credentialsDetails,
        success: false
      }, { status: 400 });
    }

    // Document AI Client initialisieren
    const documentAiClient = new DocumentProcessorServiceClient({
      credentials: credentials,
      apiEndpoint: 'eu-documentai.googleapis.com'
    });

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = 'eu';
    const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

    if (!projectId || !processorId) {
      return NextResponse.json({
        message: 'Projekt-ID oder Processor-ID fehlt',
        environmentCheck: envCheck,
        success: false
      }, { status: 400 });
    }

    // Generiere ein einfaches PDF mit einem Formular
    const pdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<<>>/Contents 4 0 R>>\nendobj\n4 0 obj\n<</Length 51>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Name: Test User) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000192 00000 n\ntrailer\n<</Size 5/Root 1 0 R>>\nstartxref\n292\n%%EOF'
    ).toString('base64');

    // Debug-Informationen sammeln
    const processorName = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    const debugInfo = {
      processorName,
      projectId,
      location,
      processorId,
      pdfSize: pdfContent.length,
      apiEndpoint: 'eu-documentai.googleapis.com'
    };

    // Dokument verarbeiten
    const request = {
      name: processorName,
      rawDocument: {
        content: pdfContent,
        mimeType: 'application/pdf',
      }
    };

    console.log('Sende Anfrage an Document AI:', JSON.stringify(debugInfo, null, 2));

    const [result] = await documentAiClient.processDocument(request);
    const { document } = result;

    return NextResponse.json({ 
      message: 'Document AI Form Parser Verbindung erfolgreich!',
      environmentCheck: envCheck,
      debugInfo,
      documentText: document?.text,
      formFields: document?.pages?.[0]?.formFields?.map(field => ({
        name: field.fieldName?.textAnchor?.content,
        value: field.fieldValue?.textAnchor?.content
      })),
      success: true 
    });

  } catch (error: any) {
    console.error('[Document AI Test Error]', error);
    return NextResponse.json({ 
      message: `Fehler bei der Document AI Verbindung: ${error.message}`,
      error: error.stack,
      debugInfo: {
        processorName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/eu/processors/${process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID}`,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        location: 'eu',
        processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
        apiEndpoint: 'eu-documentai.googleapis.com'
      },
      success: false 
    }, { 
      status: 500 
    });
  }
} 