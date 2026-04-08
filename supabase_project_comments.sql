-- Comentários simples por tópico, sem login
create extension if not exists pgcrypto;

create table if not exists public.project_topic_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null,
  author_name text not null check (char_length(author_name) between 1 and 40),
  author_color text not null default '#8b5cf6',
  comment_text text not null check (char_length(comment_text) between 1 and 3000),
  created_at timestamptz not null default now()
);

alter table public.project_topic_comments enable row level security;

drop policy if exists "public can read topic comments" on public.project_topic_comments;
create policy "public can read topic comments"
on public.project_topic_comments
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert topic comments" on public.project_topic_comments;
create policy "public can insert topic comments"
on public.project_topic_comments
for insert
to anon, authenticated
with check (true);
