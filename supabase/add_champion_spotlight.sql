create table if not exists public.champion_spotlight (
  id int primary key default 1 check (id = 1),
  is_active boolean not null default false,
  display_mode text not null default 'home_section' check (display_mode in ('home_section', 'entry_presentation')),
  tournament_name text not null default 'NOVA Champions Cup',
  season_label text,
  champion_team_id uuid references public.teams(id) on delete set null,
  champion_photo_url text,
  message_title text,
  message_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.champion_spotlight (id, is_active, display_mode, tournament_name, season_label, message_title, message_body)
values (1, false, 'home_section', 'NOVA Champions Cup', extract(year from now())::text, '¡Felicidades, campeones!', 'Han conquistado la gloria de NOVA.')
on conflict (id) do nothing;

create table if not exists public.champion_history (
  id uuid primary key default gen_random_uuid(),
  tournament_name text not null,
  season_label text,
  champion_team_id uuid references public.teams(id) on delete set null,
  champion_photo_url text,
  message_title text,
  message_body text,
  created_at timestamptz not null default now()
);

alter table public.champion_spotlight enable row level security;
alter table public.champion_history enable row level security;

drop policy if exists "public read champion spotlight" on public.champion_spotlight;
drop policy if exists "admin write champion spotlight" on public.champion_spotlight;
drop policy if exists "public read champion history" on public.champion_history;
drop policy if exists "admin write champion history" on public.champion_history;

create policy "public read champion spotlight" on public.champion_spotlight for select using (true);
create policy "admin write champion spotlight" on public.champion_spotlight for all using (public.is_admin()) with check (public.is_admin());
create policy "public read champion history" on public.champion_history for select using (true);
create policy "admin write champion history" on public.champion_history for all using (public.is_admin()) with check (public.is_admin());
