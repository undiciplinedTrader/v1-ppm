-- Create the document_fields table
create table if not exists document_fields (
  id bigint primary key generated always as identity,
  document_id bigint references documents(id) on delete cascade,
  field_name text not null,
  field_value text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for better query performance
create index if not exists document_fields_document_id_idx on document_fields(document_id);
create index if not exists document_fields_field_name_idx on document_fields(field_name);

-- Enable Row Level Security
alter table document_fields enable row level security;

-- Add RLS policies
create policy "Users can view document fields"
  on document_fields for select
  using (true);

create policy "Service role can insert document fields"
  on document_fields for insert
  using (true)
  with check (true);

-- Add updated_at trigger
create trigger set_updated_at
  before update on document_fields
  for each row
  execute function update_updated_at_column(); 