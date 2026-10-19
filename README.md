# Frontend (React + Vite)

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. La app llama a la API en
`http://localhost:8000` por defecto; usa `VITE_API_URL` para otra URL
(copia `.env.example` a `.env.local`).

## Build de producción

```bash
npm run build
```

Genera los estáticos en `dist/`.

## Docker

Imagen multi-stage: compila con Node y sirve los estáticos con nginx.
`VITE_API_URL` se inyecta en tiempo de build:

```bash
docker build --build-arg VITE_API_URL=https://expenses-api.lan.rpamplona.com -t expenses-frontend .
```

En el despliegue completo, la orquestación la hace `docker-compose.yml`
en la raíz del repositorio.
