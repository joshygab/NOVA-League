# Liga Pro Futbol

App web profesional para una liga de fútbol con React, Vite, Tailwind CSS, Supabase Auth, Supabase Realtime y despliegue en Vercel.

## Funciones

- Zona pública: home, tabla general, resultados, calendario, equipos, jugadores, goleadores, asistencias, tarjetas, noticias y galería.
- Zona privada `/admin`: login con Supabase Auth y dashboard para administrar equipos, jugadores, partidos, resultados, eventos y noticias.
- Estadísticas individuales: goleadores, asistencias, MVP, disciplina, sanciones y perfil completo de jugador.
- Playoffs automáticos: top 4 a semifinales, bracket público, resultados con penales y campeón.
- Tabla pública `/goleadores` calculada desde la tabla `goals`.
- Tabla general calculada automáticamente desde partidos jugados.
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
5. En Database > Replication confirma que las tablas estén activas para Realtime.

Si ya habías creado la base con una versión anterior, crea una copia de seguridad y aplica los cambios nuevos de `supabase/schema.sql`: columnas `captain`, `category` y `season` en `teams`; `age` en `players`; `venue`, `mvp_player_id` y `observations` en `matches`; y tablas `goals`, `match_cards`, `sanctions` y `playoff_matches`.

## Vercel

1. Sube el proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

Vercel usará `npm run build`. El archivo `vercel.json` ya redirige las rutas de React Router a `index.html`.
