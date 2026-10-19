# Frontend (React + Vite)

Aplicación de finanzas personales (cuentas, movimientos, tarjetas, préstamos, presupuestos). Consume la API `expenses-api`, que vive en su propio repositorio.

## Requisitos

- Node.js 22 (ver `.nvmrc`)
- npm

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # opcional: ajusta VITE_API_URL
npm run dev
```

Abre `http://localhost:5173`. Si `VITE_API_URL` no está definida, la app usa `http://localhost:8000` en localhost. Reinicia `npm run dev` después de cambiar `.env.local`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run check` | Typecheck + lint + tests |
| `npm run build` | Typecheck y build de producción en `dist/` |
| `npm test` | Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Estructura

```
src/
  main.tsx         Punto de entrada: tema, validación de entorno, error boundary
  App.tsx          Shell: login, navegación, cierre de sesión
  session.tsx      Contexto de sesión (csrf_token, usuario)
  api.ts           Único wrapper de fetch
  resources/       Un módulo por recurso de la API (accountsApi, cardsApi, ...)
  components/      Vistas y componentes por módulo
  hooks/           useForm, useModal
  utils/           Formato de dinero y fechas; aritmética decimal exacta
```

Las guías para agentes y desarrolladores (convenciones, cómo agregar una vista, decisiones pendientes) están en `AGENTS.md`.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_API_URL` | No | URL base de la API, sin `/` al final. Si está vacía, se deriva del host actual. |

Las variables `VITE_*` se incluyen en el JavaScript público. No pongas secretos en ellas.

## Build de producción

```bash
npm run build
```

Genera los estáticos en `dist/`.

## Docker

Imagen multi-stage: compila con Node 22 y sirve los estáticos con nginx en el puerto 80. `VITE_API_URL` se inyecta en tiempo de build:

```bash
docker build --build-arg VITE_API_URL=https://expenses-api.lan.rpamplona.com -t expenses-frontend .
```

El `docker-compose.yml` mencionado en versiones anteriores de esta guía no está en este repositorio.
