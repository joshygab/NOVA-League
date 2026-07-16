-- NOVA Referee Mode - Fase A
-- Incremental y compatible: agrega campos sin borrar datos ni reemplazar acta actual.

alter table public.matches add column if not exists current_period text not null default 'scheduled';
alter table public.matches add column if not exists live_started_at timestamptz;
alter table public.matches add column if not exists live_paused_at timestamptz;
alter table public.matches add column if not exists live_accumulated_seconds int not null default 0;
alter table public.matches add column if not exists stoppage_seconds int not null default 0;
alter table public.matches add column if not exists home_score_live int not null default 0;
alter table public.matches add column if not exists away_score_live int not null default 0;
alter table public.matches add column if not exists last_live_update_at timestamptz;
alter table public.matches add column if not exists live_version int not null default 1;
alter table public.matches add column if not exists referee_access_code text;

alter table public.match_lineups add column if not exists is_goalkeeper boolean not null default false;
alter table public.match_lineups add column if not exists entered_at int;
alter table public.match_lineups add column if not exists left_at int;
alter table public.match_lineups add column if not exists status text not null default 'available';

alter table public.match_roster add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.match_roster add column if not exists attendance_status text not null default 'present';
alter table public.match_roster add column if not exists check_in_method text not null default 'manual';
alter table public.match_roster add column if not exists checked_in_by uuid references auth.users(id) on delete set null;
alter table public.match_roster add column if not exists credential_id uuid;
alter table public.match_roster add column if not exists device_id text;
alter table public.match_roster add column if not exists validation_result text not null default 'approved';
alter table public.match_roster add column if not exists rejection_reason text;
alter table public.match_roster add column if not exists sync_status text not null default 'synced';

create unique index if not exists match_roster_match_player_key on public.match_roster (match_id, player_id);
create index if not exists matches_live_status_idx on public.matches (status, last_live_update_at desc);
create index if not exists match_roster_match_team_idx on public.match_roster (match_id, team_id);

create table if not exists public.player_credentials (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  public_token_hash text not null unique,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now()
);

alter table public.player_credentials enable row level security;

create or replace function public.can_referee_match(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.match_assignments ma
      join public.referees r on r.id = ma.referee_id
      where ma.match_id = target_match_id
        and (
          r.user_id = auth.uid()
          or lower(r.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
        )
    );
$$;

drop policy if exists "referee read assigned matches" on public.matches;
create policy "referee read assigned matches" on public.matches
for select
using (true);

drop policy if exists "referee update live assigned matches" on public.matches;
create policy "referee update live assigned matches" on public.matches
for update
using (public.can_referee_match(id))
with check (public.can_referee_match(id));

drop policy if exists "referee write assigned roster" on public.match_roster;
create policy "referee write assigned roster" on public.match_roster
for all
using (public.can_referee_match(match_id))
with check (public.can_referee_match(match_id));

drop policy if exists "referee write assigned lineups" on public.match_lineups;
create policy "referee write assigned lineups" on public.match_lineups
for all
using (public.can_referee_match(match_id))
with check (public.can_referee_match(match_id));

drop policy if exists "admin manage player credentials" on public.player_credentials;
drop policy if exists "referee read active player credentials" on public.player_credentials;
create policy "admin manage player credentials" on public.player_credentials
for all
using (public.is_admin())
with check (public.is_admin());

create policy "referee read active player credentials" on public.player_credentials
for select
using (status = 'active' and public.can_capture_matches());

do $$
begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.match_roster;
exception when duplicate_object then null;
end $$;
