create extension if not exists "pgcrypto";

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'player' check (role in ('viewer', 'player', 'captain', 'admin', 'superadmin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role, full_name)
  values (new.id, new.email, 'player', new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table public.league_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'NOVA League',
  short_name text not null default 'NOVA',
  tagline text default 'Liga competitiva de fútbol',
  description text default 'Divisiones, calendario, tabla, estadísticas y registro de jugadores en una plataforma conectada.',
  logo_url text,
  updated_at timestamptz not null default now()
);

insert into public.league_settings (id)
values (1)
on conflict (id) do nothing;

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  season_id text,
  active boolean not null default true,
  level int not null unique,
  promotion_slots int not null default 0,
  relegation_slots int not null default 0,
  championship_slots int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.divisions (name, level, promotion_slots, relegation_slots, championship_slots)
values
  ('Primera División', 1, 0, 1, 4),
  ('Segunda División', 2, 1, 1, 2),
  ('Tercera División', 3, 1, 0, 2)
on conflict (level) do nothing;

create table public.season_history (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  champions jsonb not null default '[]'::jsonb,
  promoted jsonb not null default '[]'::jsonb,
  relegated jsonb not null default '[]'::jsonb,
  final_tables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  division_id uuid references public.divisions(id) on delete set null,
  name text not null,
  city text,
  founded int,
  captain text,
  category text,
  season text,
  crest_url text,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  division_id uuid references public.divisions(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  name text not null,
  email text,
  phone text,
  birth_date date,
  requested_team_name text,
  position text,
  number int,
  age int,
  photo_url text,
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete restrict,
  round int not null,
  match_date timestamptz not null,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  home_score int,
  away_score int,
  venue text,
  mvp_player_id uuid references public.players(id) on delete set null,
  observations text,
  status text not null default 'scheduled' check (status in ('scheduled', 'played')),
  created_at timestamptz not null default now()
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  division_id uuid references public.divisions(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  type text not null check (type in ('goal', 'assist')),
  minute int not null check (minute >= 0 and minute <= 130),
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  division_id uuid references public.divisions(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  minute int not null check (minute >= 0 and minute <= 130),
  goal_type text not null default 'open_play' check (goal_type in ('open_play', 'penalty', 'free_kick', 'header', 'own_goal')),
  assist_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.match_cards (
  id uuid primary key default gen_random_uuid(),
  division_id uuid references public.divisions(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  type text not null check (type in ('yellow', 'red', 'double_yellow')),
  minute int not null check (minute >= 0 and minute <= 130),
  reason text,
  created_at timestamptz not null default now()
);

create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  division_id uuid references public.divisions(id) on delete restrict,
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  sanction_type text not null,
  reason text not null,
  suspended_matches int not null default 0,
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'served', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.playoff_matches (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete restrict,
  stage text not null check (stage in ('semifinal', 'final', 'third_place')),
  slot int not null,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  home_seed int,
  away_seed int,
  match_date timestamptz,
  venue text,
  home_score int,
  away_score int,
  home_penalties int,
  away_penalties int,
  winner_team_id uuid references public.teams(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'played', 'finalized')),
  mvp_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (division_id, stage, slot)
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text,
  cover_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.league_settings enable row level security;
alter table public.divisions enable row level security;
alter table public.season_history enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.goals enable row level security;
alter table public.match_cards enable row level security;
alter table public.sanctions enable row level security;
alter table public.playoff_matches enable row level security;
alter table public.news enable row level security;
alter table public.gallery enable row level security;

create policy "users read own profile" on public.user_profiles for select using (id = auth.uid() or public.is_admin());
create policy "users create own profile" on public.user_profiles for insert with check (id = auth.uid() and role = 'player');
create policy "admin manage user profiles" on public.user_profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "public read league settings" on public.league_settings for select using (true);
create policy "public read divisions" on public.divisions for select using (true);
create policy "public read season history" on public.season_history for select using (true);
create policy "public read teams" on public.teams for select using (true);
create policy "public read approved players" on public.players for select using (approval_status = 'approved' or auth_user_id = auth.uid() or public.is_admin());
create policy "public read matches" on public.matches for select using (true);
create policy "public read match events" on public.match_events for select using (true);
create policy "public read goals" on public.goals for select using (true);
create policy "public read match cards" on public.match_cards for select using (true);
create policy "public read sanctions" on public.sanctions for select using (true);
create policy "public read playoff matches" on public.playoff_matches for select using (true);
create policy "public read news" on public.news for select using (true);
create policy "public read gallery" on public.gallery for select using (true);

create policy "players create own pending profile" on public.players for insert with check (auth_user_id = auth.uid() and approval_status = 'pending' and team_id is not null);
create policy "admin write league settings" on public.league_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write divisions" on public.divisions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write season history" on public.season_history for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write teams" on public.teams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write players" on public.players for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write matches" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match events" on public.match_events for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write goals" on public.goals for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match cards" on public.match_cards for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write sanctions" on public.sanctions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write playoff matches" on public.playoff_matches for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write news" on public.news for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write gallery" on public.gallery for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('league-assets', 'league-assets', true),
  ('team-crests', 'team-crests', true),
  ('player-photos', 'player-photos', true),
  ('news-covers', 'news-covers', true),
  ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "public read league assets" on storage.objects for select using (bucket_id = 'league-assets');
create policy "public read team crests" on storage.objects for select using (bucket_id = 'team-crests');
create policy "public read player photos" on storage.objects for select using (bucket_id = 'player-photos');
create policy "public read news covers" on storage.objects for select using (bucket_id = 'news-covers');
create policy "public read gallery images" on storage.objects for select using (bucket_id = 'gallery');

create policy "admin upload league assets" on storage.objects for all using (auth.role() = 'authenticated' and bucket_id = 'league-assets') with check (auth.role() = 'authenticated' and bucket_id = 'league-assets');
create policy "admin upload team crests" on storage.objects for all using (auth.role() = 'authenticated' and bucket_id = 'team-crests') with check (auth.role() = 'authenticated' and bucket_id = 'team-crests');
create policy "players upload own photos" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'player-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admin upload player photos" on storage.objects for all using (public.is_admin() and bucket_id = 'player-photos') with check (public.is_admin() and bucket_id = 'player-photos');
create policy "admin upload news covers" on storage.objects for all using (auth.role() = 'authenticated' and bucket_id = 'news-covers') with check (auth.role() = 'authenticated' and bucket_id = 'news-covers');
create policy "admin upload gallery images" on storage.objects for all using (auth.role() = 'authenticated' and bucket_id = 'gallery') with check (auth.role() = 'authenticated' and bucket_id = 'gallery');

alter publication supabase_realtime add table public.league_settings;
alter publication supabase_realtime add table public.user_profiles;
alter publication supabase_realtime add table public.divisions;
alter publication supabase_realtime add table public.season_history;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_events;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.match_cards;
alter publication supabase_realtime add table public.sanctions;
alter publication supabase_realtime add table public.playoff_matches;
alter publication supabase_realtime add table public.news;
alter publication supabase_realtime add table public.gallery;
