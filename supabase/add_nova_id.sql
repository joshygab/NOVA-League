alter table public.players add column if not exists nova_id text;
alter table public.players add column if not exists status text not null default 'active' check (status in ('active', 'injured', 'suspended'));
alter table public.players add column if not exists qr_code text;

with numbered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.players
  where nova_id is null
)
update public.players p
set nova_id = 'NVL-' || lpad(numbered.rn::text, 6, '0')
from numbered
where p.id = numbered.id;

create unique index if not exists players_nova_id_key on public.players(nova_id);

create table if not exists public.player_stats (
  player_id uuid primary key references public.players(id) on delete cascade,
  partidos int not null default 0,
  goles int not null default 0,
  asistencias int not null default 0,
  mvp int not null default 0,
  amarillas int not null default 0,
  rojas int not null default 0,
  porterias_cero int not null default 0
);

create table if not exists public.match_roster (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  unique (match_id, player_id)
);

alter table public.player_stats enable row level security;
alter table public.match_roster enable row level security;

drop policy if exists "public read player stats" on public.player_stats;
drop policy if exists "public read match roster" on public.match_roster;
drop policy if exists "admin write player stats" on public.player_stats;
drop policy if exists "admin write match roster" on public.match_roster;

create policy "public read player stats" on public.player_stats for select using (true);
create policy "public read match roster" on public.match_roster for select using (true);
create policy "admin write player stats" on public.player_stats for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match roster" on public.match_roster for all using (public.is_admin()) with check (public.is_admin());
