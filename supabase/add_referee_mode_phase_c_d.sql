-- NOVA Referee Mode - Fases C y D
-- Realtime enfocado para Match Center y campos de soporte offline/conflictos.

alter table public.match_events add column if not exists client_event_id text;
alter table public.match_events add column if not exists device_id text;
alter table public.match_events add column if not exists sync_status text not null default 'synced';
alter table public.match_events add column if not exists is_voided boolean not null default false;
alter table public.match_events add column if not exists void_reason text;
alter table public.match_events add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists match_events_client_event_key on public.match_events (client_event_id) where client_event_id is not null;
create index if not exists match_events_live_match_idx on public.match_events (match_id, is_voided, match_second);
create index if not exists matches_live_public_idx on public.matches (status, last_live_update_at desc);

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
