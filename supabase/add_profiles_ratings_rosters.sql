create table if not exists public.team_of_week (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  round int not null,
  slot text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_label, round, slot)
);

create table if not exists public.roster_movements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  from_team_id uuid references public.teams(id) on delete set null,
  to_team_id uuid references public.teams(id) on delete set null,
  movement_type text not null default 'alta' check (movement_type in ('alta', 'baja', 'transferencia', 'cesion')),
  reason text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.teams add column if not exists roster_limit int not null default 18;
alter table public.teams add column if not exists coach text;
alter table public.teams add column if not exists home_colors text;
alter table public.teams add column if not exists away_colors text;
alter table public.teams add column if not exists social_url text;
alter table public.teams add column if not exists inscription_status text not null default 'active';

alter table public.team_of_week enable row level security;
alter table public.roster_movements enable row level security;

drop policy if exists "public read team of week" on public.team_of_week;
drop policy if exists "admin write team of week" on public.team_of_week;
drop policy if exists "admin read roster movements" on public.roster_movements;
drop policy if exists "admin write roster movements" on public.roster_movements;

create policy "public read team of week" on public.team_of_week for select using (true);
create policy "admin write team of week" on public.team_of_week for all using (public.is_admin()) with check (public.is_admin());
create policy "admin read roster movements" on public.roster_movements for select using (public.is_admin());
create policy "admin write roster movements" on public.roster_movements for all using (public.is_admin()) with check (public.is_admin());

create index if not exists team_of_week_round_idx on public.team_of_week (season_label, round);
create index if not exists roster_movements_player_idx on public.roster_movements (player_id, created_at desc);
