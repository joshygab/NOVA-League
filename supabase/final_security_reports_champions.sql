-- NOVA League hardening: permisos finales, actas versionadas y Champions avanzada.
-- Migracion incremental: no borra datos ni elimina columnas existentes.

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

create or replace function public.can_manage_discipline()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_league_role(array['admin', 'superadmin', 'league_president', 'sports_coordinator', 'discipline']);
$$;

create or replace function public.can_manage_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_league_role(array['admin', 'superadmin', 'league_president', 'treasury']);
$$;

alter table public.match_reports add column if not exists folio text;
alter table public.match_reports add column if not exists version int not null default 1;
alter table public.match_reports add column if not exists verification_code text;
alter table public.match_reports add column if not exists finalized_at timestamptz;
alter table public.match_reports add column if not exists officialized_at timestamptz;

create unique index if not exists match_reports_folio_key on public.match_reports (folio) where folio is not null;
create index if not exists match_reports_match_status_idx on public.match_reports (match_id, status);

create or replace function public.sync_match_report_official_fields()
returns trigger
language plpgsql
as $$
begin
  new.folio = coalesce(new.folio, new.report_data->>'folio');
  new.verification_code = coalesce(new.verification_code, new.report_data->>'verification_code');
  new.version = coalesce((new.report_data->>'version')::int, new.version, 1);
  new.finalized_at = coalesce(new.finalized_at, nullif(new.report_data->>'finalized_at', '')::timestamptz);
  new.officialized_at = coalesce(new.officialized_at, nullif(new.report_data->>'officialized_at', '')::timestamptz);
  return new;
end;
$$;

drop trigger if exists sync_match_report_official_fields on public.match_reports;
create trigger sync_match_report_official_fields
before insert or update on public.match_reports
for each row execute function public.sync_match_report_official_fields();

create table if not exists public.match_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.match_reports(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  version int not null,
  status text,
  report_snapshot jsonb not null default '{}'::jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now()
);

create index if not exists match_report_versions_report_idx on public.match_report_versions (report_id, version desc);
alter table public.match_report_versions enable row level security;

alter table public.nova_champions_settings add column if not exists draw_mode text not null default 'ranking' check (draw_mode in ('ranking', 'random'));
alter table public.nova_champions_settings add column if not exists groups_enabled boolean not null default false;
alter table public.nova_champions_settings add column if not exists draw_confirmed_at timestamptz;
alter table public.nova_champions_qualified_teams add column if not exists pot int;
alter table public.nova_champions_qualified_teams add column if not exists group_name text;
alter table public.nova_champions_matches add column if not exists group_name text;
alter table public.nova_champions_matches add column if not exists bracket_slot text;

drop policy if exists "public read match report versions" on public.match_report_versions;
drop policy if exists "match officials write report versions" on public.match_report_versions;
create policy "public read match report versions" on public.match_report_versions for select using (true);
create policy "match officials write report versions" on public.match_report_versions for insert with check (public.can_capture_matches());

do $$
begin
  if to_regclass('public.sanctions') is not null then
    drop policy if exists "discipline manage sanctions" on public.sanctions;
    create policy "discipline manage sanctions" on public.sanctions for all
    using (public.can_manage_discipline())
    with check (public.can_manage_discipline());
  end if;
end $$;

do $$
begin
  if to_regclass('public.finance_entries') is not null then
    drop policy if exists "treasury manage finance" on public.finance_entries;
    create policy "treasury manage finance" on public.finance_entries for all
    using (public.can_manage_finance())
    with check (public.can_manage_finance());

    drop policy if exists "captains read own finance" on public.finance_entries;
    create policy "captains read own finance" on public.finance_entries
    for select
    using (
      public.can_manage_finance()
      or exists (
        select 1
        from public.players p
        where p.user_id = auth.uid()
          and p.team_id = finance_entries.team_id
      )
    );
  end if;
end $$;

do $$
begin
  if to_regclass('public.news') is not null then
    drop policy if exists "media manage news" on public.news;
    create policy "media manage news" on public.news for all
    using (public.has_league_role(array['admin', 'superadmin', 'league_president', 'media']))
    with check (public.has_league_role(array['admin', 'superadmin', 'league_president', 'media']));
  end if;
end $$;

do $$
begin
  if to_regclass('public.audit_logs') is not null then
    drop policy if exists "superadmin read full audit" on public.audit_logs;
    create policy "superadmin read full audit" on public.audit_logs
    for select
    using (public.has_league_role(array['superadmin', 'league_president']));
  end if;
end $$;
