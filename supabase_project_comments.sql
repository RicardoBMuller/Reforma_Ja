create extension if not exists pgcrypto;

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_color text not null default '#8b5cf6',
  comment_text text not null,
  created_at timestamptz not null default now()
);

alter table public.project_comments enable row level security;

-- Leitura pública para o site de apresentação
create policy if not exists "public can read project comments"
on public.project_comments
for select
using (true);

-- Inserção pública para colaboração simples durante a apresentação
create policy if not exists "public can insert project comments"
on public.project_comments
for insert
with check (true);
