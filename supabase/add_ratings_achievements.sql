alter table public.match_events add column if not exists assist_player_id uuid references public.players(id) on delete set null;
alter table public.match_events add column if not exists card_type text;
alter table public.match_events add column if not exists reason text;

create table if not exists public.player_ratings (
  player_id uuid primary key references public.players(id) on delete cascade,
  overall int not null default 50,
  pace int not null default 50,
  shooting int not null default 50,
  passing int not null default 50,
  defending int not null default 50,
  physical int not null default 50,
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  condition_key text not null
);

insert into public.achievements (id, name, description, icon, condition_key)
values
  ('debut', 'Debut NOVA', 'Primer partido jugado', '🥇', 'played_1'),
  ('first_goal', 'Primer Gol NOVA', 'Anota su primer gol', '⚽', 'goal_1'),
  ('hat_trick', 'Hat-Trick', '3 goles en un mismo partido', '🔥', 'hat_trick'),
  ('first_assist', 'Primer Asistencia', 'Registra su primera asistencia', '🎯', 'assist_1'),
  ('crack', 'Crack NOVA', '5 MVP ganados', '⭐', 'mvp_5'),
  ('scoring_streak', 'Racha Goleadora', 'Anota en 5 partidos consecutivos', '🔥', 'scoring_streak_5'),
  ('wall', 'Muro Defensivo', '5 porterías en cero', '🧱', 'clean_sheet_5'),
  ('legend', 'Leyenda NOVA', '100 partidos jugados', '👑', 'played_100'),
  ('fair_play', 'Fair Play', '10 partidos sin tarjetas', '🏅', 'fair_play_10')
on conflict (id) do nothing;

create table if not exists public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (player_id, achievement_id)
);

alter table public.player_ratings enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;

drop policy if exists "public read player ratings" on public.player_ratings;
drop policy if exists "public read achievements" on public.achievements;
drop policy if exists "public read player achievements" on public.player_achievements;
drop policy if exists "admin write player ratings" on public.player_ratings;
drop policy if exists "admin write achievements" on public.achievements;
drop policy if exists "admin write player achievements" on public.player_achievements;

create policy "public read player ratings" on public.player_ratings for select using (true);
create policy "public read achievements" on public.achievements for select using (true);
create policy "public read player achievements" on public.player_achievements for select using (true);
create policy "admin write player ratings" on public.player_ratings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write achievements" on public.achievements for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write player achievements" on public.player_achievements for all using (public.is_admin()) with check (public.is_admin());
