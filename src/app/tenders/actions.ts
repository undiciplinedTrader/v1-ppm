// In: src/app/tenders/actions.ts

// Diese Anweisung markiert alle exportierten Funktionen in dieser Datei
// als sichere Server Actions, die auf dem Server ausgeführt werden.
"use server";

import { createClient } from '@supabase/supabase-js';

export async function getSignedUrlForFile(filePath: string) {
  // Dieser Code wird garantiert nur auf dem Server ausgeführt.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Generiert eine URL, die für 60 Sekunden gültig ist
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 60); // 60 Sekunden Gültigkeit

  if (error) {
    console.error("Error creating signed URL:", error);
    return { error: "Konnte sichere URL nicht erstellen." };
  }

  return { url: data.signedUrl };
} 