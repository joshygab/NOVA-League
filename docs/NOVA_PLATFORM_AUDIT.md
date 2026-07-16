# NOVA League Platform Audit

Fecha de auditoria: 2026-07-16

## Diagnostico breve

NOVA League es una app React + Vite con Tailwind, Supabase Auth, Supabase Database/Storage y rutas separadas para app publica y administracion.

El proyecto compila correctamente con `npm run build`.

La plataforma ya tiene una base importante:

- App publica con inicio, divisiones, tabla, partidos, equipos, jugadores, goleadores, estadisticas, historial, playoffs, NOVA Champions Cup, NOVA ID, registro y login.
- App admin en `/admin` protegida por `AdminRoute`.
- Supabase Auth con sesion persistente y roles basicos: `viewer`, `player`, `captain`, `admin`, `superadmin`.
- Divisiones aisladas mediante `division_id` en equipos, jugadores, partidos, eventos, sanciones, playoffs y estadisticas.
- NOVA Champions Cup separada en tablas propias.
- Acta digital, lineups, match reports, escaner NOVA ID y Modo Campeon ya iniciados.

## Tecnologias detectadas

- React 18
- Vite 5
- React Router
- Tailwind CSS
- Supabase JS v2
- Supabase Auth
- Supabase Realtime
- Supabase Storage
- Framer Motion
- Lucide React
- html5-qrcode

## Rutas principales

Publicas:

- `/`
- `/divisiones`
- `/tabla`
- `/calendario`
- `/partidos`
- `/partidos/:id`
- `/match/:matchId`
- `/playoffs`
- `/nova-champions`
- `/equipos`
- `/equipos/:id`
- `/jugadores`
- `/jugadores/:id`
- `/goleadores`
- `/estadisticas`
- `/historial`
- `/noticias`
- `/registro`
- `/login`
- `/perfil`
- `/nova-id`
- `/nova-id/:novaId`

Admin:

- `/admin/login`
- `/admin`

## Funciones que deben preservarse

- Inicio publico y Modo Campeon.
- DivisionTabs y filtrado por division.
- Tabla por division.
- Goleadores y estadisticas existentes.
- Registro/login de jugadores.
- Perfil de jugador.
- NOVA ID y escaner.
- Admin dashboard.
- Gestion de equipos, jugadores, divisiones, partidos y sanciones.
- Acta digital y captura de eventos.
- Playoffs por division.
- NOVA Champions Cup separada de liga regular.
- RLS y roles actuales.

## Riesgos detectados

- `matches.status` en schema base solo acepta `scheduled` y `played`; fases futuras necesitan estados como `live`, `review`, `official`, etc. Debe ampliarse con migracion no destructiva antes de usar nuevos estados.
- La tabla general global `calculateStandings` existe y puede mezclar divisiones si se usa sin filtro. Las paginas criticas ya usan `divisionTables`, pero futuras pantallas deben filtrar siempre por `division_id` o `competition_id`.
- AdminDashboard es un archivo grande con muchas responsabilidades. Conviene extraer modulos por fase, no reescribirlo completo.
- La seguridad fina por roles todavia depende principalmente de `is_admin()` para escritura. Fases futuras deben agregar permisos por modulo sin romper admin/superadmin.
- Acta digital ya guarda eventos, pero aun no hay flujo formal `en revision -> oficial`; cambiarlo requiere migracion de estados y compatibilidad con `played`.
- `html5-qrcode` aumenta el bundle; conviene cargarlo de forma diferida mas adelante si el rendimiento inicial baja.
- Existen migraciones incrementales y `schema.sql`; hay que mantener ambas fuentes sincronizadas.

## Modelo de datos recomendado

Sin renombrar tablas actuales, agregar tablas puente y metadatos:

- `seasons`: temporadas.
- `competitions`: liga regular, copa, playoffs, champions, torneos especiales.
- `audit_logs`: bitacora de acciones.
- `venues`: canchas.
- `referees`: arbitros.
- `match_assignments`: arbitros/cancha asignados a partidos.
- `match_review_versions`: versiones de actas/resultados.
- `module_settings`: feature flags por modulo.

Regla:

- Lo existente sigue funcionando.
- Los nuevos registros deportivos deben poder apuntar a `season_id` y `competition_id`.
- Para liga regular, `division_id` sigue siendo obligatorio donde corresponda.
- NOVA Champions Cup conserva sus tablas propias y no alimenta tabla regular.

## Orden recomendado

1. Fase 0: auditoria, compilacion base, documentacion, migraciones no destructivas.
2. Fase 1: temporadas, competencias, bitacora y feature flags sin cambiar UI publica.
3. Fase 2: ordenar Admin en modulos y centro de control.
4. Fase 3: Match Center y modo arbitro mejorado, oculto por feature flag hasta estar estable.
5. Fase 4: flujo de revision y oficializacion de actas/resultados.
6. Fase 5: permisos reales por rol y RLS granular.

## Archivos que se modificaran primero

- `docs/NOVA_PLATFORM_AUDIT.md`
- `supabase/add_platform_foundation.sql`
- `supabase/schema.sql`

Despues, cuando la base este aplicada y estable:

- `src/lib/adminApi.js`
- `src/lib/data.js`
- `src/lib/useLeagueData.js`
- `src/pages/admin/AdminDashboard.jsx`
- Componentes nuevos bajo `src/pages/admin/` o `src/components/admin/`

## Primera fase pequena y comprobable

Crear migracion incremental no destructiva con:

- Temporadas.
- Competencias.
- Configuracion de modulos.
- Bitacora.
- Canchas.
- Arbitros.
- Asignaciones de partido.

Criterio de aceptacion:

- `npm run build` pasa.
- No cambia ningun flujo visible.
- No se elimina ninguna tabla/columna.
- La migracion puede ejecutarse en Supabase sin borrar datos.

## Fase 1A implementada

Se agrego bitacora interna para acciones administrativas criticas en `src/lib/adminApi.js`.

Acciones cubiertas:

- Crear/editar equipos.
- Crear/editar divisiones.
- Cambiar configuracion de liga.
- Cambiar Modo Campeon.
- Crear/editar jugadores.
- Aprobar, rechazar y asignar jugadores.
- Crear/editar partidos.
- Crear/editar eventos, goles y tarjetas.
- Borrar registros desde admin.
- Generar semifinales de playoffs.
- Editar partidos de playoffs.
- Crear/editar sanciones.
- Crear/editar noticias.
- Configurar NOVA Champions Cup.
- Clasificar o quitar equipos de NOVA Champions Cup.
- Crear/editar partidos de NOVA Champions Cup.
- Generar bracket de NOVA Champions Cup.
- Registrar estadisticas de copa.
- Guardar alineaciones y actas.
- Registrar eventos del acta digital.
- Eliminar eventos del acta digital.
- Finalizar partido desde acta digital.
- Confirmar asistencia con NOVA ID.

La bitacora es tolerante a migraciones pendientes: si `audit_logs` todavia no existe en Supabase, la accion principal no se bloquea.

Pendiente de una fase posterior:

- Crear vista admin "Acciones recientes" cargada solo para administradores.
- Permitir filtrar bitacora por usuario, modulo, fecha y entidad.
- Agregar campo obligatorio de motivo en acciones delicadas como cambio de resultado oficial.
- Mover flujos de resultado a `en revision -> oficial`.
