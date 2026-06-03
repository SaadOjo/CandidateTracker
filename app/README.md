# Candidate Tracker app

This is the production application.

The imported/Figma-aligned prototype is preserved in:

```txt
../reference-app/
```

Use `reference-app/` as the UI and terminology source of truth while rebuilding the real app here.

## Stack

Frontend:

```txt
Vite
React
TypeScript
React Router
Plain CSS
```

Backend:

```txt
Node.js
TypeScript
Fastify
Zod
Prisma
PostgreSQL
```

Auth direction:

```txt
Generic OIDC/JWT, compatible with Microsoft Entra ID / Active Directory
```

## Run frontend

```bash
npm install
npm run dev
```

## Run backend

```bash
docker compose up -d postgres
cd server
cp .env.example .env
npm install
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

## Build

```bash
npm run build
npm run build:server
```

See `STRUCTURE.md` for the folder/component structure.
