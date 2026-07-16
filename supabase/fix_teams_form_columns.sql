-- Compatibilidad del formulario de equipos NOVA Admin.
-- Corrige errores de schema cache como:
-- Could not find the 'away_colors' column of 'teams' in the schema cache.
-- No elimina ni renombra columnas existentes.

alter table public.teams add column if not exists coach text;
alter table public.teams add column if not exists category text;
alter table public.teams add column if not exists season text;
alter table public.teams add column if not exists crest_url text;
alter table public.teams add column if not exists roster_limit int not null default 18;
alter table public.teams add column if not exists home_colors text;
alter table public.teams add column if not exists away_colors text;
alter table public.teams add column if not exists social_url text;
alter table public.teams add column if not exists inscription_status text not null default 'active';

-- Si alguna base vieja tenia away_color en singular, conserva ese dato copiandolo
-- hacia el campo que usa la app actual: away_colors.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teams'
      and column_name = 'away_color'
  ) then
    execute 'update public.teams set away_colors = coalesce(away_colors, away_color) where away_colors is null';
  end if;
end $$;

create index if not exists teams_division_name_idx on public.teams (division_id, name);

-- Pide a PostgREST/Supabase recargar el schema cache.
notify pgrst, 'reload schema';
