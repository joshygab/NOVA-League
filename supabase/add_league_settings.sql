create table if not exists public.league_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Liga Pro Futbol',
  short_name text not null default 'LP',
  tagline text default 'Fútbol competitivo',
  description text default 'Resultados, tabla, estadísticas, noticias y administración profesional para una liga moderna.',
  logo_url text,
  updated_at timestamptz not null default now()
);

insert into public.league_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.league_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'league_settings' and policyname = 'public read league settings'
  ) then
    create policy "public read league settings" on public.league_settings for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'league_settings' and policyname = 'admin write league settings'
  ) then
    create policy "admin write league settings" on public.league_settings
    for all using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('league-assets', 'league-assets', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'public read league assets'
  ) then
    create policy "public read league assets" on storage.objects
    for select using (bucket_id = 'league-assets');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'admin upload league assets'
  ) then
    create policy "admin upload league assets" on storage.objects
    for all using (auth.role() = 'authenticated' and bucket_id = 'league-assets')
    with check (auth.role() = 'authenticated' and bucket_id = 'league-assets');
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.league_settings;
exception
  when duplicate_object then null;
end $$;
