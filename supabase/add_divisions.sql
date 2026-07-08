create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level int not null unique,
  promotion_slots int not null default 0,
  relegation_slots int not null default 0,
  championship_slots int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.divisions (name, level, promotion_slots, relegation_slots, championship_slots)
values
  ('Primera División', 1, 0, 1, 4),
  ('Segunda División', 2, 1, 1, 2),
  ('Tercera División', 3, 1, 0, 2)
on conflict (level) do nothing;

alter table public.teams
add column if not exists division_id uuid references public.divisions(id) on delete set null;

update public.teams
set division_id = (select id from public.divisions order by level limit 1)
where division_id is null;

create table if not exists public.season_history (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  champions jsonb not null default '[]'::jsonb,
  promoted jsonb not null default '[]'::jsonb,
  relegated jsonb not null default '[]'::jsonb,
  final_tables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.divisions enable row level security;
alter table public.season_history enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'divisions' and policyname = 'public read divisions') then
    create policy "public read divisions" on public.divisions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'season_history' and policyname = 'public read season history') then
    create policy "public read season history" on public.season_history for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'divisions' and policyname = 'admin write divisions') then
    create policy "admin write divisions" on public.divisions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'season_history' and policyname = 'admin write season history') then
    create policy "admin write season history" on public.season_history for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.divisions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.season_history;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
