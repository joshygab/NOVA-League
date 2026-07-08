create table if not exists public.nova_champions_settings (
  id int primary key default 1 check (id = 1),
  is_active boolean not null default false,
  status text not null default 'coming_soon' check (status in ('coming_soon', 'active', 'finished')),
  season_id text,
  format int not null default 8 check (format in (4, 8, 16)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nova_champions_settings drop constraint if exists nova_champions_settings_format_check;
alter table public.nova_champions_settings add constraint nova_champions_settings_format_check check (format in (8, 16, 32));

insert into public.nova_champions_settings (id, is_active, status, season_id, format)
values (1, false, 'coming_soon', extract(year from now())::text, 8)
on conflict (id) do nothing;

create table if not exists public.nova_champions_qualified_teams (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id text not null,
  qualification_method text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (team_id, season_id)
);

create table if not exists public.nova_champions_matches (
  id uuid primary key default gen_random_uuid(),
  season_id text not null,
  round text not null check (round in ('round_of_16', 'quarterfinal', 'semifinal', 'final')),
  match_order int not null default 1,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_score int,
  away_score int,
  home_penalties int,
  away_penalties int,
  winner_team_id uuid references public.teams(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'played', 'finalized')),
  match_date timestamptz,
  venue text,
  mvp_player_id uuid references public.players(id) on delete set null,
  best_goalkeeper_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (season_id, round, match_order)
);

alter table public.nova_champions_matches drop constraint if exists nova_champions_matches_round_check;
alter table public.nova_champions_matches add constraint nova_champions_matches_round_check check (round in ('round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'));

create table if not exists public.nova_champions_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.nova_champions_matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  team_id uuid references public.teams(id) on delete cascade,
  stat_type text not null check (stat_type in ('goal', 'assist', 'yellow_card', 'red_card', 'mvp', 'clean_sheet')),
  minute int,
  value int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.nova_champions_champions_history (
  id uuid primary key default gen_random_uuid(),
  season_id text not null,
  champion_team_id uuid references public.teams(id) on delete set null,
  runner_up_team_id uuid references public.teams(id) on delete set null,
  final_score text,
  final_mvp_player_id uuid references public.players(id) on delete set null,
  top_scorer_player_id uuid references public.players(id) on delete set null,
  best_goalkeeper_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.nova_champions_settings enable row level security;
alter table public.nova_champions_qualified_teams enable row level security;
alter table public.nova_champions_matches enable row level security;
alter table public.nova_champions_stats enable row level security;
alter table public.nova_champions_champions_history enable row level security;

drop policy if exists "public read nova champions settings" on public.nova_champions_settings;
drop policy if exists "public read nova champions qualified" on public.nova_champions_qualified_teams;
drop policy if exists "public read nova champions matches" on public.nova_champions_matches;
drop policy if exists "public read nova champions stats" on public.nova_champions_stats;
drop policy if exists "public read nova champions history" on public.nova_champions_champions_history;
drop policy if exists "admin write nova champions settings" on public.nova_champions_settings;
drop policy if exists "admin write nova champions qualified" on public.nova_champions_qualified_teams;
drop policy if exists "admin write nova champions matches" on public.nova_champions_matches;
drop policy if exists "admin write nova champions stats" on public.nova_champions_stats;
drop policy if exists "admin write nova champions history" on public.nova_champions_champions_history;

create policy "public read nova champions settings" on public.nova_champions_settings for select using (true);
create policy "public read nova champions qualified" on public.nova_champions_qualified_teams for select using (true);
create policy "public read nova champions matches" on public.nova_champions_matches for select using (true);
create policy "public read nova champions stats" on public.nova_champions_stats for select using (true);
create policy "public read nova champions history" on public.nova_champions_champions_history for select using (true);

create policy "admin write nova champions settings" on public.nova_champions_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write nova champions qualified" on public.nova_champions_qualified_teams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write nova champions matches" on public.nova_champions_matches for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write nova champions stats" on public.nova_champions_stats for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write nova champions history" on public.nova_champions_champions_history for all using (public.is_admin()) with check (public.is_admin());
