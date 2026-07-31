# Gym Manager

Aplicación web para gestión de gimnasios: clientes, membresías, productos y dashboard de movimientos.

## Estructura

- `frontend/` — React + Vite + shadcn/ui
- `backend/` — Spring Boot + JPA + JWT

## Requisitos

- Node.js 18+
- Java 21
- Maven
- Docker y Docker Compose, recomendado para PostgreSQL local persistente

## Inicio rápido

### PostgreSQL persistente con Docker

Esta es la forma recomendada para que los datos no se pierdan al reiniciar el backend.

```bash
docker compose up -d
```

El contenedor usa un volumen llamado `gym_postgres_data`. Mientras no borres ese volumen,
los clientes, ventas, membresías y productos se conservan aunque apagues y vuelvas a levantar.

Para conectar el backend local a ese PostgreSQL:

```bash
cd backend
mvn spring-boot:run
```

El backend tambien esta dockerizado, pero no arranca por defecto. Si quieres levantar
PostgreSQL y backend juntos con Docker:

```bash
docker compose --profile backend up -d
```

No uses `docker compose down -v` salvo que quieras borrar la base de datos local.

### Backend (puerto 8082)

```bash
cd backend
mvn spring-boot:run
```

Por defecto usa PostgreSQL local en `localhost:5434`, pensado para el `docker compose` de este repo.
Si necesitas conectar otra base de datos:

```bash
export DB_URL=jdbc:postgresql://localhost:5434/gym_db
export DB_USER=gym
export DB_PASSWORD=gym
mvn spring-boot:run
```

> En producción no uses H2. Configura siempre PostgreSQL con `DB_URL`, `DB_USER` y `DB_PASSWORD`.

### Frontend (puerto 5174)

```bash
cd frontend
npm install
npm run dev
```

Credenciales por defecto: `admin` / `admin123`

## Despliegue en nube con Supabase

Supabase se usa como PostgreSQL administrado. El backend y frontend se despliegan en otros servicios.

1. Crea un proyecto en Supabase y copia los datos de conexión PostgreSQL.
2. Sube el backend a Railway, Render, Fly.io o un VPS.
3. Configura estas variables en el servicio del backend:

```bash
DB_URL=jdbc:postgresql://HOST:5432/postgres
DB_USER=postgres
DB_PASSWORD=tu_password_de_supabase
JWT_SECRET=una_clave_larga_y_segura
APP_CORS_ALLOWED_ORIGINS=https://tu-frontend.com
```

4. Sube el frontend a Vercel, Cloudflare Pages, Netlify o Render Static.
5. Configura el frontend con la URL pública del backend:

```bash
VITE_API_BASE_URL=https://tu-backend.com
```

## Módulos

1. **Dashboard** — Estadísticas y movimientos recientes (ventas de membresías y productos)
2. **Clientes y membresías** — CRUD de clientes, planes y asignación de membresías
3. **Productos** — Catálogo, stock y registro de ventas
