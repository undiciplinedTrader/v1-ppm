-- Create the document_chunks table
create table if not exists document_chunks (
    id bigint primary key generated always as identity,
    document_id bigint references documents(id) on delete cascade,
    tender_id bigint references tenders(id) on delete cascade,
    raw_content text not null,
    enriched_content text not null,
    chunk_type text not null,
    metadata jsonb not null default '{}',
    embedding vector(768),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index on the embedding column for similarity search
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create indexes for foreign keys and common queries
create index idx_document_chunks_document_id on document_chunks(document_id);
create index idx_document_chunks_tender_id on document_chunks(tender_id);
create index idx_document_chunks_chunk_type on document_chunks(chunk_type);

-- Enable Row Level Security
alter table document_chunks enable row level security;

-- Create RLS policies
create policy "Users can view document chunks they have access to"
    on document_chunks for select
    using (
        exists (
            select 1 from tenders t
            where t.id = document_chunks.tender_id
            and (
                t.created_by = auth.uid() 
                or exists (
                    select 1 from tender_collaborators tc
                    where tc.tender_id = t.id
                    and tc.user_id = auth.uid()
                )
            )
        )
    );

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create trigger to update updated_at
create trigger update_document_chunks_updated_at
    before update on document_chunks
    for each row
    execute function update_updated_at_column(); 