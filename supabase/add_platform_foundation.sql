create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  starts_at date,
  ends_at date,
  status text not null default 'draft' check (status in ('draft', 'active', 'finished', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.seasons (name, slug, status)
values (extract(year from now())::text, extract(year from now())::text, 'active')
on conflict (slug) do nothing;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete set null,
  name text not null,
  slug text not null,
  competition_type text not null default 'league' check (competition_type in ('league', 'cup', 'playoff', 'champions', 'friendly', 'other')),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, slug)
);

insert into public.competitions (season_id, name, slug, competition_type, is_active)
select id, 'NOVA League', 'nova-league', 'league', true
from public.seasons
where status = 'active'
order by created_at desc
limit 1
on conflict (season_id, slug) do nothing;

insert into public.competitions (season_id, name, slug, competition_type, is_active)
select id, 'NOVA Champions Cup', 'nova-champions-cup', 'champions', false
from public.seasons
where status = 'active'
order by created_at desc
limit 1
on conflict (season_id, slug) do nothing;

create table if not exists public.module_settings (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  is_enabled boolean not null default false,
  status text not null default 'coming_soon' check (status in ('coming_soon', 'enabled', 'disabled', 'hidden')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.module_settings (module_key, is_enabled, status)
values
  ('match_center_v2', false, 'hidden'),
  ('referee_mode', false, 'hidden'),
  ('finance', false, 'hidden'),
  ('captain_zone', false, 'hidden'),
  ('offline_mode', false, 'hidden')
on conflict (module_key) do nothing;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  module text not null,
  entity_table text,
  entity_id text,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_module_created_idx on public.audit_logs (module, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_table, entity_id);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id, created_at desc);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  map_url text,
  capacity int,
  photo_url text,
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  authorized_divisions uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_assignments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  referee_id uuid references public.referees(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  assignment_status text not null default 'pending' check (assignment_status in ('pending', 'accepted', 'declined', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id)
);

alter table public.seasons enable row level security;
alter table public.competitions enable row level security;
alter table public.module_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.venues enable row level security;
alter table public.referees enable row level security;
alter table public.match_assignments enable row level security;

drop policy if exists "public read seasons" on public.seasons;
drop policy if exists "public read active competitions" on public.competitions;
drop policy if exists "public read enabled module settings" on public.module_settings;
drop policy if exists "admin read audit logs" on public.audit_logs;
drop policy if exists "public read venues" on public.venues;
drop policy if exists "admin read referees" on public.referees;
drop policy if exists "admin read match assignments" on public.match_assignments;
drop policy if exists "admin write seasons" on public.seasons;
drop policy if exists "admin write competitions" on public.competitions;
drop policy if exists "admin write module settings" on public.module_settings;
drop policy if exists "admin write audit logs" on public.audit_logs;
drop policy if exists "admin write venues" on public.venues;
drop policy if exists "admin write referees" on public.referees;
drop policy if exists "admin write match assignments" on public.match_assignments;

create policy "public read seasons" on public.seasons for select using (true);
create policy "public read active competitions" on public.competitions for select using (is_active or public.is_admin());
create policy "public read enabled module settings" on public.module_settings for select using (is_enabled or public.is_admin());
create policy "admin read audit logs" on public.audit_logs for select using (public.is_admin());
create policy "public read venues" on public.venues for select using (status = 'active' or public.is_admin());
create policy "admin read referees" on public.referees for select using (public.is_admin());
create policy "admin read match assignments" on public.match_assignments for select using (public.is_admin());

create policy "admin write seasons" on public.seasons for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write competitions" on public.competitions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write module settings" on public.module_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write audit logs" on public.audit_logs for insert with check (public.is_admin());
create policy "admin write venues" on public.venues for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write referees" on public.referees for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match assignments" on public.match_assignments for all using (public.is_admin()) with check (public.is_admin());
