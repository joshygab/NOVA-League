create table if not exists public.playoff_settings (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete cascade,
  is_active boolean not null default false,
  status text not null default 'coming_soon' check (status in ('coming_soon', 'active', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id)
);

insert into public.playoff_settings (division_id, is_active, status)
select id, false, 'coming_soon'
from public.divisions
on conflict (division_id) do nothing;

alter table public.playoff_settings enable row level security;

drop policy if exists "public read playoff settings" on public.playoff_settings;
drop policy if exists "admin write playoff settings" on public.playoff_settings;

create policy "public read playoff settings" on public.playoff_settings for select using (true);
create policy "admin write playoff settings" on public.playoff_settings for all using (public.is_admin()) with check (public.is_admin());
