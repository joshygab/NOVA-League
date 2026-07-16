alter table public.news add column if not exists category text not null default 'noticia';

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  entry_type text not null default 'charge' check (entry_type in ('charge', 'payment', 'expense')),
  concept text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  due_date date,
  paid_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  notification_type text not null default 'general',
  audience text not null default 'public' check (audience in ('public', 'teams', 'captains', 'admins')),
  team_id uuid references public.teams(id) on delete set null,
  publish_at timestamptz not null default now(),
  requires_ack boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.nova_champions_qualified_teams add column if not exists pot int;
alter table public.nova_champions_qualified_teams add column if not exists group_name text;
alter table public.nova_champions_matches add column if not exists group_name text;

alter table public.finance_entries enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "admin manage finance entries" on public.finance_entries;
drop policy if exists "public read published notifications" on public.notifications;
drop policy if exists "admin manage notifications" on public.notifications;

create policy "admin manage finance entries" on public.finance_entries for all using (public.is_admin() or public.has_league_role(array['treasury'])) with check (public.is_admin() or public.has_league_role(array['treasury']));
create policy "public read published notifications" on public.notifications for select using (status = 'published' and audience = 'public');
create policy "admin manage notifications" on public.notifications for all using (public.is_admin() or public.has_league_role(array['media'])) with check (public.is_admin() or public.has_league_role(array['media']));

create index if not exists finance_entries_team_status_idx on public.finance_entries (team_id, status, due_date);
create index if not exists notifications_status_publish_idx on public.notifications (status, publish_at desc);
