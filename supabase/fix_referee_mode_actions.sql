-- Correccion incremental para registrar acciones desde Modo Arbitro.
-- Ejecuta este archivo si goles, tarjetas o cambios fallan por columnas, constraints o permisos RLS.

alter table public.matches add column if not exists current_period text not null default 'scheduled';
alter table public.matches add column if not exists live_started_at timestamptz;
alter table public.matches add column if not exists live_paused_at timestamptz;
alter table public.matches add column if not exists live_accumulated_seconds int not null default 0;
alter table public.matches add column if not exists stoppage_seconds int not null default 0;
alter table public.matches add column if not exists home_score_live int not null default 0;
alter table public.matches add column if not exists away_score_live int not null default 0;
alter table public.matches add column if not exists last_live_update_at timestamptz;
alter table public.matches add column if not exists live_version int not null default 1;

alter table public.match_events add column if not exists client_event_id text;
alter table public.match_events add column if not exists related_player_id uuid references public.players(id) on delete set null;
alter table public.match_events add column if not exists secondary_player_id uuid references public.players(id) on delete set null;
alter table public.match_events add column if not exists event_type text;
alter table public.match_events add column if not exists detail text;
alter table public.match_events add column if not exists period text;
alter table public.match_events add column if not exists match_second int not null default 0;
alter table public.match_events add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.match_events add column if not exists device_id text;
alter table public.match_events add column if not exists sync_status text not null default 'synced';
alter table public.match_events add column if not exists is_voided boolean not null default false;
alter table public.match_events add column if not exists void_reason text;
alter table public.match_events add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists match_events_client_event_key on public.match_events (client_event_id) where client_event_id is not null;
create index if not exists match_events_live_match_idx on public.match_events (match_id, is_voided, match_second);
create index if not exists matches_live_status_idx on public.matches (status, last_live_update_at desc);

alter table public.match_events drop constraint if exists match_events_type_check;
alter table public.match_events add constraint match_events_type_check check (
  type in (
    'goal',
    'assist',
    'yellow_card',
    'red_card',
    'substitution',
    'foul',
    'injury',
    'mvp',
    'observation',
    'penalty_missed',
    'penalty_saved',
    'incident'
  )
);

alter table public.goals drop constraint if exists goals_goal_type_check;
alter table public.goals add constraint goals_goal_type_check check (
  goal_type in ('open_play', 'penalty', 'free_kick', 'header', 'own_goal')
);

alter table public.match_cards drop constraint if exists match_cards_type_check;
alter table public.match_cards add constraint match_cards_type_check check (
  type in ('yellow', 'red', 'double_yellow')
);

create or replace function public.has_league_role(allowed_roles text[])
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
      and role = any(allowed_roles)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_league_role(array['admin', 'superadmin', 'league_president', 'sports_coordinator', 'division_admin']);
$$;

create or replace function public.can_capture_matches()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_league_role(array['admin', 'superadmin', 'league_president', 'sports_coordinator', 'division_admin', 'referee']);
$$;

drop policy if exists "match officials write events" on public.match_events;
drop policy if exists "match officials write goals" on public.goals;
drop policy if exists "match officials write cards" on public.match_cards;
drop policy if exists "match officials update matches" on public.matches;

create policy "match officials write events" on public.match_events
for all
using (public.can_capture_matches())
with check (public.can_capture_matches());

create policy "match officials write goals" on public.goals
for all
using (public.can_capture_matches())
with check (public.can_capture_matches());

create policy "match officials write cards" on public.match_cards
for all
using (public.can_capture_matches())
with check (public.can_capture_matches());

create policy "match officials update matches" on public.matches
for update
using (public.can_capture_matches())
with check (public.can_capture_matches());

do $$
begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.match_events;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
