create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'player' check (role in ('player', 'captain', 'admin', 'superadmin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
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
      and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role, full_name)
  values (new.id, new.email, 'player', new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.players add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.players add column if not exists email text;
alter table public.players add column if not exists phone text;
alter table public.players add column if not exists birth_date date;
alter table public.players add column if not exists requested_team_name text;
alter table public.players add column if not exists approval_status text not null default 'approved';

alter table public.user_profiles enable row level security;

drop policy if exists "public read players" on public.players;
drop policy if exists "public read approved players" on public.players;
drop policy if exists "players create own pending profile" on public.players;
drop policy if exists "players update own personal data" on public.players;
drop policy if exists "admin write players" on public.players;
drop policy if exists "users read own profile" on public.user_profiles;
drop policy if exists "users create own profile" on public.user_profiles;
drop policy if exists "users update own basic profile" on public.user_profiles;
drop policy if exists "admin manage user profiles" on public.user_profiles;

create policy "users read own profile" on public.user_profiles for select using (id = auth.uid() or public.is_admin());
create policy "users create own profile" on public.user_profiles for insert with check (id = auth.uid() and role = 'player');
create policy "admin manage user profiles" on public.user_profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "public read approved players" on public.players for select using (approval_status = 'approved' or auth_user_id = auth.uid() or public.is_admin());
create policy "players create own pending profile" on public.players for insert with check (auth_user_id = auth.uid() and approval_status = 'pending');
create policy "admin write players" on public.players for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin write league settings" on public.league_settings;
drop policy if exists "admin write divisions" on public.divisions;
drop policy if exists "admin write season history" on public.season_history;
drop policy if exists "admin write teams" on public.teams;
drop policy if exists "admin write matches" on public.matches;
drop policy if exists "admin write match events" on public.match_events;
drop policy if exists "admin write goals" on public.goals;
drop policy if exists "admin write match cards" on public.match_cards;
drop policy if exists "admin write sanctions" on public.sanctions;
drop policy if exists "admin write playoff matches" on public.playoff_matches;
drop policy if exists "admin write news" on public.news;
drop policy if exists "admin write gallery" on public.gallery;

create policy "admin write league settings" on public.league_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write divisions" on public.divisions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write season history" on public.season_history for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write teams" on public.teams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write matches" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match events" on public.match_events for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write goals" on public.goals for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write match cards" on public.match_cards for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write sanctions" on public.sanctions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write playoff matches" on public.playoff_matches for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write news" on public.news for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write gallery" on public.gallery for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "players upload own photos" on storage.objects;
drop policy if exists "admin upload player photos" on storage.objects;
create policy "players upload own photos" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'player-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admin upload player photos" on storage.objects for all using (public.is_admin() and bucket_id = 'player-photos') with check (public.is_admin() and bucket_id = 'player-photos');
