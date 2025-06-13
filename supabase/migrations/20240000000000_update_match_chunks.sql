-- Alte Funktion löschen
DROP FUNCTION IF EXISTS match_document_chunks;

-- Neue Funktion erstellen
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_tender_id bigint,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 15
)
RETURNS TABLE (
  id bigint,
  tender_id bigint,
  document_id bigint,
  raw_content text,
  enriched_content text,
  chunk_type text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.tender_id,
    chunks.document_id,
    chunks.raw_content,
    chunks.enriched_content,
    chunks.chunk_type,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks chunks
  WHERE chunks.tender_id = match_tender_id
    AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$; 