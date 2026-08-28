# Migracion completa a Dokploy en VPS

## Objetivo

Mover el proyecto completo al VPS administrado con Dokploy:

- Base de datos: de NeonTech a PostgreSQL dentro del VPS.
- Backend: de Render a un contenedor Spring Boot en Dokploy.
- Frontend: de Cloudflare Pages a un contenedor Nginx en Dokploy.

La migracion debe hacerse por fases para evitar perdida de datos.

## Estado actual del proyecto

- Frontend: `frontend/`, Vite + React.
- Backend: `backend/`, Spring Boot + Java 21.
- Base de datos actual: PostgreSQL en NeonTech.
- Backend actual: Render.
- Frontend actual: Cloudflare Pages.
- Backend usa estas variables:
  - `DB_URL`
  - `DB_USER`
  - `DB_PASSWORD`
  - `JWT_SECRET`
  - `APP_CORS_ALLOWED_ORIGINS`
- Frontend usa esta variable en build:
  - `VITE_API_BASE_URL`

## Archivos agregados para Dokploy

- `docker-compose.dokploy.yml`: levanta PostgreSQL, backend y frontend.
- `frontend/Dockerfile`: compila Vite y sirve el build con Nginx.
- `frontend/nginx.conf`: sirve la SPA correctamente.
- `frontend/.dockerignore`: evita subir `node_modules`, `dist` y `.env`.

## Orden recomendado

1. Preparar dominios.
2. Crear el proyecto en Dokploy.
3. Crear la app Docker Compose usando `docker-compose.dokploy.yml`.
4. Configurar variables de entorno.
5. Levantar solo PostgreSQL o levantar todo sin trafico publico aun.
6. Migrar datos desde NeonTech al PostgreSQL del VPS.
7. Apuntar backend al PostgreSQL del VPS.
8. Publicar backend.
9. Reconstruir frontend con la URL del nuevo backend.
10. Publicar frontend.
11. Validar login, clientes, membresias, ventas y reportes.
12. Recién despues apagar Render/Cloudflare Pages si todo funciona.

## Dominios sugeridos

Usa subdominios separados:

- Frontend: `https://gym.episundc.pe`
- Backend/API: `https://api-gym.episundc.pe`

Tambien puedes usar otros nombres, pero deben ser consistentes en las variables.

## Variables en Dokploy

Configura estas variables en la app Docker Compose:

```env
POSTGRES_DB=gym_db
POSTGRES_USER=gym
POSTGRES_PASSWORD=CAMBIAR_POR_PASSWORD_LARGO

JWT_SECRET=CAMBIAR_POR_SECRETO_LARGO_DE_32_BYTES_O_MAS

VITE_API_BASE_URL=https://api-gym.episundc.pe
APP_CORS_ALLOWED_ORIGINS=https://gym.episundc.pe,https://mclub.pages.dev
```

Notas:

- `POSTGRES_PASSWORD` no debe ser `gym` en produccion.
- `JWT_SECRET` debe ser largo y estable. Si lo cambias, los usuarios tendran que iniciar sesion de nuevo.
- Mientras Cloudflare Pages siga activo, deja su dominio en `APP_CORS_ALLOWED_ORIGINS`.
- Cuando apagues Cloudflare Pages, puedes quitar ese origen.

## Configuracion en Dokploy

### Proyecto

1. Entra a Dokploy.
2. Abre `Projects`.
3. Crea o usa un proyecto para este sistema.
4. Crea una aplicacion tipo `Docker Compose`.
5. Conecta el repositorio Git.
6. Selecciona como compose file:

```txt
docker-compose.dokploy.yml
```

### Domains

Agrega dos dominios/rutas:

- Servicio `frontend`, puerto interno `80`, dominio `gym.episundc.pe`.
- Servicio `backend`, puerto interno `8082`, dominio `api-gym.episundc.pe`.

No expongas PostgreSQL publicamente.

## Migracion de base de datos desde NeonTech

### 1. Hacer ventana de mantenimiento

Antes de exportar la base de datos:

1. Avisa que el sistema entrara en mantenimiento.
2. Deten temporalmente el backend en Render o bloquea el acceso para evitar nuevas escrituras.
3. Verifica que nadie este registrando ventas, membresias o clientes.

Esto es importante porque si exportas Neon mientras el sistema sigue en uso, puedes perder cambios hechos despues del dump.

### 2. Exportar NeonTech

Desde una maquina que tenga `pg_dump`:

```bash
pg_dump --no-owner --no-acl "$NEON_DATABASE_URL" > /tmp/gym_neon.sql
```

Donde `NEON_DATABASE_URL` es la URL PostgreSQL de Neon, normalmente con `sslmode=require`.

Ejemplo de formato:

```txt
postgresql://usuario:password@host.neon.tech/dbname?sslmode=require
```

No pegues esa URL en chats ni commits porque contiene credenciales.

### 3. Restaurar en PostgreSQL del VPS

En el VPS, identifica el contenedor PostgreSQL:

```bash
docker ps
```

Luego restaura el dump en una base vacia:

```bash
cat /tmp/gym_neon.sql | docker exec -i NOMBRE_CONTENEDOR_POSTGRES psql -U gym -d gym_db
```

Si el backend ya creo tablas vacias antes de restaurar, limpia primero la base en el contenedor PostgreSQL:

```bash
docker exec -it NOMBRE_CONTENEDOR_POSTGRES psql -U gym -d gym_db
```

Dentro de `psql`:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Despues vuelve a ejecutar el restore.

## Validacion despues del restore

En el contenedor PostgreSQL:

```bash
docker exec -it NOMBRE_CONTENEDOR_POSTGRES psql -U gym -d gym_db
```

Consultas minimas:

```sql
\dt
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM membership_plans;
SELECT COUNT(*) FROM client_memberships;
SELECT COUNT(*) FROM movements;
```

Los nombres exactos de tablas pueden variar si Hibernate los genero con otro formato. Si una consulta falla, usar `\dt` para ver los nombres reales.

## Deploy final

Cuando la base ya este restaurada:

1. Despliega el compose completo en Dokploy.
2. Verifica que `backend` arranque sin errores.
3. Abre `https://api-gym.episundc.pe/api/health` si existe endpoint de health.
4. Abre `https://gym.episundc.pe`.
5. Prueba login.
6. Revisa clientes, planes, productos, ventas, caja y reportes.
7. Registra una operacion pequena de prueba.
8. Confirma que la operacion aparece en la base del VPS.

## DNS

En tu proveedor DNS o Cloudflare:

- `gym.episundc.pe` debe apuntar al VPS.
- `api-gym.episundc.pe` debe apuntar al VPS.

Normalmente se usa un registro `A` hacia la IP publica del VPS.

Si usas Cloudflare proxy naranja, verifica que WebSocket/no aplica y TLS funcione correctamente. Para empezar, DNS only puede ser mas simple mientras validas.

## Backups

Despues de migrar, configura backups automaticos. Como minimo:

- Backup diario de PostgreSQL.
- Retencion de varios dias.
- Copia fuera del VPS si es posible.

Comando base para backup manual:

```bash
docker exec NOMBRE_CONTENEDOR_POSTGRES pg_dump -U gym -d gym_db --no-owner --no-acl > gym_backup.sql
```

No confies solo en el volumen Docker. El volumen sirve para persistencia, pero no reemplaza backups.

## Riesgos importantes

- No expongas el puerto `5432` de PostgreSQL a internet.
- No uses passwords de ejemplo.
- No borres NeonTech hasta validar varios dias de operacion en el VPS.
- Si cambias `JWT_SECRET`, las sesiones actuales dejan de servir.
- El frontend debe recompilarse cuando cambie `VITE_API_BASE_URL`.
- `spring.jpa.hibernate.ddl-auto=update` ayuda a arrancar, pero a futuro conviene usar migraciones formales con Flyway o Liquibase.

## Plan de rollback

Antes de apagar servicios antiguos:

1. Mantener NeonTech activo.
2. Mantener Render activo.
3. Mantener Cloudflare Pages activo.
4. Si algo falla en Dokploy, volver el DNS/frontend a la URL anterior.
5. Revisar que no haya escrituras nuevas en el VPS antes de volver atras.

El rollback es mucho mas facil si haces una ventana de mantenimiento y evitas uso simultaneo en ambas bases.
