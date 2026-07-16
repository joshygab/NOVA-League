create table if not exists public.captain_attendance (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  captain_player_id uuid references public.players(id) on delete set null,
  status text not null default 'confirmed' check (status in ('confirmed', 'doubt', 'out')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

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

create table if not exists public.clarification_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  subject text not null,
  explanation text not null,
  evidence_url text,
  status text not null default 'received' check (status in ('received', 'in_review', 'needs_info', 'approved', 'rejected', 'closed')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.captain_attendance enable row level security;
alter table public.clarification_requests enable row level security;
alter table public.venues enable row level security;
alter table public.referees enable row level security;
alter table public.match_assignments enable row level security;

drop policy if exists "team captains read attendance" on public.captain_attendance;
drop policy if exists "team captains write attendance" on public.captain_attendance;
drop policy if exists "team captains create clarifications" on public.clarification_requests;
drop policy if exists "team captains read clarifications" on public.clarification_requests;
drop policy if exists "admin manage clarifications" on public.clarification_requests;
drop policy if exists "public read venues" on public.venues;
drop policy if exists "admin read referees" on public.referees;
drop policy if exists "admin read match assignments" on public.match_assignments;
drop policy if exists "admin write venues" on public.venues;
drop policy if exists "admin write referees" on public.referees;
drop policy if exists "admin write match assignments" on public.match_assignments;

create policy "team captains read attendance" on public.captain_attendance for select using (true);
create policy "team captains write attendance" on public.captain_attendance for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "team captains create clarifications" on public.clarification_requests for insert with check (auth.role() = 'authenticated');
create policy "team captains read clarifications" on public.clarification_requests for select using (auth.role() = 'authenticated' or public.is_admin());
create policy "admin manage clarifications" on public.clarification_requests for all using (public.is_admin()) with check (public.is_admin());
create policy "public read venues" on public.venues for select using (status = 'active' or public.is_admin());
create policy "admin read referees" on public.referees for select using (public.is_admin());
create policy "admin read match assignments" on public.match_assignments for select using (public.is_admin());
create policy "admin write venues" on public.venues for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write referees" on public.referees for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match assignments" on public.match_assignments for all using (public.is_admin()) with check (public.is_admin());

create index if not exists captain_attendance_match_team_idx on public.captain_attendance (match_id, team_id);
create index if not exists clarification_requests_team_status_idx on public.clarification_requests (team_id, status, created_at desc);
