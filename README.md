# NOVA League

Plataforma para liga de fútbol con dos aplicaciones conectadas dentro del mismo proyecto:

- `NOVA League`: app pública para jugadores, equipos y público general.
- `NOVA Admin`: app privada para administradores en `/admin`.

Ambas apps leen la misma fuente de datos. En local funciona con datos demo; en producción queda preparada para Supabase Auth, Database, Storage y Realtime.

## Funciones

- Zona pública: inicio, divisiones, tabla, calendario, partidos, equipos, jugadores, goleadores, estadísticas, historial, registro y login de jugadores.
- Registro de jugadores con correo, contraseña, equipo existente, posición, número, edad y foto opcional.
- Perfil privado `/perfil` con equipo, escudo, datos del jugador y estadísticas calculadas automáticamente.
- Los registros quedan pendientes hasta que un administrador los aprueba.
- Zona privada `/admin`: login de administrador y dashboard separado para administrar la liga.
- Aprobación/rechazo de jugadores y asignación a equipos.
- Gestión de equipos, jugadores, divisiones, partidos, resultados, goles, asistencias, tarjetas, sanciones, noticias y tabla.
- Estadísticas individuales: goleadores, asistencias, MVP, disciplina, sanciones y perfil completo de jugador.
- Playoffs automáticos: top 4 a semifinales, bracket público, resultados con penales y campeón.
- Tabla pública `/goleadores` calculada desde la tabla `goals`.
- Divisiones: tablas independientes, zonas de ascenso/descenso/campeonato e historial de temporadas.
- Tabla general calculada automáticamente desde partidos jugados.
- Cierre de temporada con campeón por división, tabla final, ascendidos, descendidos y reinicio de estadísticas de temporada.
- Realtime: los cambios en Supabase actualizan la app sin recargar.
- Diseño oscuro responsive con navegación inferior en móvil.

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

En `.env` agrega:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Supabase

1. Crea un proyecto en Supabase.
2. Abre SQL Editor.
3. Ejecuta el archivo `supabase/schema.sql`.
4. En Authentication crea el usuario administrador con email y contraseña.
5. En SQL Editor asigna el rol admin al usuario creado:

```sql
insert into public.user_profiles (id, email, role, full_name)
select id, email, 'admin', coalesce(raw_user_meta_data ->> 'full_name', email)
from auth.users
where email = 'admin@gmail.com'
on conflict (id) do update set role = 'admin';
```

6. En Authentication confirma si quieres registro inmediato. Para que el registro cree cuenta y perfil en un solo paso desde la app, desactiva la confirmación obligatoria por email o usa un flujo servidor/Edge Function.
7. En Database > Replication confirma que las tablas estén activas para Realtime.

Si ya habías creado la base con una versión anterior, crea una copia de seguridad y aplica los cambios nuevos de `supabase/schema.sql`: columnas `captain`, `category` y `season` en `teams`; `age` en `players`; `venue`, `mvp_player_id` y `observations` en `matches`; y tablas `goals`, `match_cards`, `sanctions` y `playoff_matches`.

Para una base ya creada, puedes aplicar solo los incrementales necesarios desde SQL Editor:

- `supabase/add_league_settings.sql`
- `supabase/add_divisions.sql`
- `supabase/add_player_auth.sql`

## Rutas principales

- App pública: `/`
- Calendario: `/calendario`
- Registro de jugador: `/registro`
- Login de jugador: `/login`
- Perfil del jugador: `/perfil`
- NOVA Admin: `/admin`
- Login admin: `/admin/login`

## Vercel

1. Sube el proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

Vercel usará `npm run build`. El archivo `vercel.json` ya redirige las rutas de React Router a `index.html`.
