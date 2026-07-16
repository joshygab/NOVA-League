-- NOVA Referee Mode - Fase B
-- Eventos provisionales, marcador en vivo y anulacion logica sin afectar estadisticas oficiales.

alter table public.match_events add column if not exists client_event_id text;
alter table public.match_events add column if not exists secondary_player_id uuid references public.players(id) on delete set null;
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

alter table public.match_events drop constraint if exists match_events_type_check;
alter table public.match_events add constraint match_events_type_check check (
  type in (
    'goal',
    'assist',
    'yellow_card',
    'second_yellow',
    'red_card',
    'staff_card',
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

drop policy if exists "referee write assigned events" on public.match_events;
create policy "referee write assigned events" on public.match_events
for all
using (public.can_referee_match(match_id))
with check (public.can_referee_match(match_id));

do $$
begin
  alter publication supabase_realtime add table public.match_events;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
