alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check check (
  role in (
    'viewer',
    'player',
    'captain',
    'admin',
    'superadmin',
    'league_president',
    'sports_coordinator',
    'division_admin',
    'referee',
    'venue_manager',
    'discipline',
    'treasury',
    'media'
  )
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

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check check (
  status in (
    'scheduled',
    'in_progress',
    'played',
    'official',
    'problem'
  )
);

alter table public.match_reports drop constraint if exists match_reports_status_check;
alter table public.match_reports add constraint match_reports_status_check check (
  status in (
    'draft',
    'finalized',
    'official',
    'correction_requested'
  )
);

create index if not exists matches_status_date_idx on public.matches (status, match_date);
create index if not exists match_reports_status_created_idx on public.match_reports (status, created_at desc);

drop policy if exists "match officials write lineups" on public.match_lineups;
drop policy if exists "match officials write reports" on public.match_reports;
drop policy if exists "match officials write roster" on public.match_roster;
drop policy if exists "match officials write events" on public.match_events;
drop policy if exists "match officials write goals" on public.goals;
drop policy if exists "match officials write cards" on public.match_cards;
drop policy if exists "match officials update matches" on public.matches;

create policy "match officials write lineups" on public.match_lineups for all using (public.can_capture_matches()) with check (public.can_capture_matches());
create policy "match officials write reports" on public.match_reports for all using (public.can_capture_matches()) with check (public.can_capture_matches());
create policy "match officials write roster" on public.match_roster for all using (public.can_capture_matches()) with check (public.can_capture_matches());
create policy "match officials write events" on public.match_events for all using (public.can_capture_matches()) with check (public.can_capture_matches());
create policy "match officials write goals" on public.goals for all using (public.can_capture_matches()) with check (public.can_capture_matches());
create policy "match officials write cards" on public.match_cards for all using (public.can_capture_matches()) with check (public.can_capture_matches());
create policy "match officials update matches" on public.matches for update using (public.can_capture_matches()) with check (public.can_capture_matches());
