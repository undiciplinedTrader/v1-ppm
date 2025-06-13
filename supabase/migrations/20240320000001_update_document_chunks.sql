-- Umbenennen der content Spalte zu raw_content
ALTER TABLE document_chunks RENAME COLUMN content TO raw_content;

-- Neue Spalten hinzufügen
ALTER TABLE document_chunks 
  ADD COLUMN enriched_content TEXT,
  ADD COLUMN chunk_type TEXT,
  ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Initialisiere enriched_content mit raw_content für bestehende Einträge
UPDATE document_chunks SET enriched_content = raw_content;

-- Setze enriched_content als NOT NULL
ALTER TABLE document_chunks 
  ALTER COLUMN enriched_content SET NOT NULL,
  ALTER COLUMN chunk_type SET NOT NULL DEFAULT 'paragraph';

-- Erstelle Indizes für die neuen Spalten
CREATE INDEX IF NOT EXISTS document_chunks_chunk_type_idx ON document_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS document_chunks_metadata_idx ON document_chunks USING gin(metadata);

-- Kommentare für die Spalten hinzufügen
COMMENT ON COLUMN document_chunks.raw_content IS 'Der ursprüngliche, unveränderte Textinhalt des Chunks';
COMMENT ON COLUMN document_chunks.enriched_content IS 'Der mit Metadaten angereicherte Text, der für das Embedding verwendet wird';
COMMENT ON COLUMN document_chunks.chunk_type IS 'Art des Chunks (z.B. paragraph, table_row, list_item)';
COMMENT ON COLUMN document_chunks.metadata IS 'Strukturierte Metadaten wie Seitenzahl und übergeordnete Überschriften'; 