alter table public.match_events add column if not exists related_player_id uuid references public.players(id) on delete set null;
alter table public.match_events add column if not exists event_type text;
alter table public.match_events add column if not exists detail text;

alter table public.match_events drop constraint if exists match_events_type_check;
alter table public.match_events add constraint match_events_type_check check (type in ('goal', 'assist', 'yellow_card', 'red_card', 'substitution', 'injury', 'mvp', 'observation'));

update public.match_events
set event_type = type
where event_type is null;

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_starter boolean not null default true,
  is_present boolean not null default true,
  captain boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table if not exists public.match_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  referee_name text,
  observations text,
  home_captain_signature text,
  away_captain_signature text,
  referee_signature text,
  pdf_url text,
  status text not null default 'draft' check (status in ('draft', 'finalized', 'official', 'correction_requested')),
  created_at timestamptz not null default now(),
  unique (match_id)
);

alter table public.match_reports add column if not exists report_data jsonb;

alter table public.match_lineups enable row level security;
alter table public.match_reports enable row level security;

drop policy if exists "public read match lineups" on public.match_lineups;
drop policy if exists "public read match reports" on public.match_reports;
drop policy if exists "admin write match lineups" on public.match_lineups;
drop policy if exists "admin write match reports" on public.match_reports;

create policy "public read match lineups" on public.match_lineups for select using (true);
create policy "public read match reports" on public.match_reports for select using (true);
create policy "admin write match lineups" on public.match_lineups for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match reports" on public.match_reports for all using (public.is_admin()) with check (public.is_admin());
