# Gym Manager

Aplicación web para gestión de gimnasios: clientes, membresías, productos y dashboard de movimientos.

## Estructura

- `frontend/` — React + Vite + shadcn/ui
- `backend/` — Spring Boot + JPA + JWT

## Requisitos

- Node.js 18+
- Java 21
- Maven

## Inicio rápido

### Backend (puerto 8082)

```bash
cd backend
mvn spring-boot:run
```

Por defecto usa H2 en memoria. Para PostgreSQL:

```bash
export DB_URL=jdbc:postgresql://localhost:5433/gym_db
export DB_USER=gym
export DB_PASSWORD=gym
mvn spring-boot:run
```

### Frontend (puerto 5174)

```bash
cd frontend
npm install
npm run dev
```

Credenciales por defecto: `admin` / `admin123`

## Módulos

1. **Dashboard** — Estadísticas y movimientos recientes (ventas de membresías y productos)
2. **Clientes y membresías** — CRUD de clientes, planes y asignación de membresías
3. **Productos** — Catálogo, stock y registro de ventas
