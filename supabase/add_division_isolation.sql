alter table public.divisions add column if not exists slug text;
alter table public.divisions add column if not exists description text;
alter table public.divisions add column if not exists season_id text;
alter table public.divisions add column if not exists active boolean not null default true;

update public.divisions
set slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null;

create unique index if not exists divisions_slug_key on public.divisions(slug);

alter table public.players add column if not exists division_id uuid references public.divisions(id) on delete restrict;
alter table public.matches add column if not exists division_id uuid references public.divisions(id) on delete restrict;
alter table public.goals add column if not exists division_id uuid references public.divisions(id) on delete restrict;
alter table public.match_events add column if not exists division_id uuid references public.divisions(id) on delete restrict;
alter table public.match_cards add column if not exists division_id uuid references public.divisions(id) on delete restrict;
alter table public.sanctions add column if not exists division_id uuid references public.divisions(id) on delete restrict;
alter table public.playoff_matches add column if not exists division_id uuid references public.divisions(id) on delete restrict;

update public.players p
set division_id = t.division_id
from public.teams t
where p.team_id = t.id
  and p.division_id is null;

update public.matches m
set division_id = t.division_id
from public.teams t
where m.home_team_id = t.id
  and m.division_id is null;

update public.goals g
set division_id = m.division_id
from public.matches m
where g.match_id = m.id
  and g.division_id is null;

update public.match_events e
set division_id = m.division_id
from public.matches m
where e.match_id = m.id
  and e.division_id is null;

update public.match_cards c
set division_id = m.division_id
from public.matches m
where c.match_id = m.id
  and c.division_id is null;

update public.sanctions s
set division_id = t.division_id
from public.teams t
where s.team_id = t.id
  and s.division_id is null;

update public.sanctions s
set division_id = t.division_id
from public.players p
join public.teams t on t.id = p.team_id
where s.player_id = p.id
  and s.division_id is null;

update public.playoff_matches p
set division_id = t.division_id
from public.teams t
where p.home_team_id = t.id
  and p.division_id is null;

alter table public.playoff_matches drop constraint if exists playoff_matches_stage_slot_key;
drop index if exists playoff_matches_division_stage_slot_key;
create unique index if not exists playoff_matches_division_stage_slot_key on public.playoff_matches(division_id, stage, slot);

-- Ejecuta estas validaciones cuando hayas confirmado que no quedan datos antiguos sin división:
-- alter table public.matches alter column division_id set not null;
-- alter table public.playoff_matches alter column division_id set not null;
