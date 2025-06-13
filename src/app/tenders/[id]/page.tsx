// In: src/app/tenders/[id]/page.tsx

import { createClient } from '@supabase/supabase-js';
import TenderDetailView from '@/components/tender-detail-client-view';

async function getTenderById(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // NEUE ABFRAGE: Wir sagen Supabase, es soll den Tender UND
  // alle zugehörigen 'documents' aus der anderen Tabelle mitladen.
  const { data: tender, error } = await supabase
    .from('tenders')
    .select(`
      *,
      documents (
        id,
        file_name,
        file_size,
        storage_path
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching tender:', error);
    return null;
  }

  return tender;
}

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const tender = await getTenderById(params.id);

  if (!tender) {
    return <div>Ausschreibung nicht gefunden.</div>;
  }

  return <TenderDetailView tender={tender} />;
}