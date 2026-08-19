# Instrucciones

## Objetivo
Dejar el frontend alineado con npm y desplegarlo en Cloudflare Pages como espejo del frontend actual de Netlify.

## Contexto del proyecto
- Frontend: `frontend/` con Vite y React
- Backend: `backend/` en Render
- Base de datos: NeonTech
- Deploy actual del frontend: Netlify
- Deploy objetivo del frontend: Cloudflare Pages

## Cambios necesarios
1. Mantener npm como gestor del frontend.
2. En Cloudflare Pages usar `frontend` como root directory.
3. Configurar el build command como `npm run build`.
4. Configurar el output directory como `dist`.
5. Agregar la variable de entorno `VITE_API_BASE_URL` con la URL pública del backend en Render.
6. Agregar el dominio de Cloudflare Pages en `APP_CORS_ALLOWED_ORIGINS` del backend.
7. Hacer deploy con cache limpio si Cloudflare reutiliza una instalación vieja.

## Problema detectado
Cloudflare Pages intentó instalar dependencias con pnpm porque en el repo existe un lockfile de pnpm. Eso generó conflictos con `node_modules` en el build.

## Limpieza recomendada
- Conservar `frontend/package-lock.json`
- Eliminar `frontend/pnpm-lock.yaml`
- Eliminar `frontend/pnpm-workspace.yaml` si no se usa un workspace pnpm

## Configuración esperada en Cloudflare Pages
- Root directory: `frontend`
- Framework preset: `React (Vite)` o equivalente
- Build command: `npm run build`
- Build output directory: `dist`
- Variable: `VITE_API_BASE_URL=https://<backend-render-url>`

## Configuración esperada en backend
En `APP_CORS_ALLOWED_ORIGINS` incluir el dominio de Pages, por ejemplo:
- `https://mclub.pages.dev`

Si existe dominio propio, añadirlo también separado por coma.

## Verificación
- El frontend construye con npm sin errores
- Cloudflare Pages no intenta usar pnpm
- El login y las llamadas al API funcionan desde el dominio nuevo
- El backend acepta el origen de Cloudflare Pages
