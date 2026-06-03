# App structure

`reference-app/` remains the UI and terminology source of truth.

The production application lives here in `app/`.

## Top-level layout

```txt
app/
  src/                  frontend React app
  server/               backend API
  docker-compose.yml    local Postgres
```

## Frontend structure

```txt
src/
  app/                  app shell, router, providers
  pages/                route-level screens
  components/           reusable UI components shared by pages
  domain/               product enums/types/labels
  data/                 API client and repository layer
  auth/                 auth abstraction, later OIDC/JWT integration
```

Recommended rule:

```txt
pages compose features
components stay reusable
domain owns terminology
data owns API access
auth owns current user/role/session
```

## Backend structure

```txt
  server/
    src/
      server.ts           Fastify app entry
      auth.ts             auth service boundary; dev implementation now, OIDC/JWT later
      db.ts               Prisma client
      domain.ts           API validation schemas and enums
  prisma/
    schema.prisma       database model
    seed.ts             local seed data
```

As backend grows, split `server/src` into:

```txt
modules/
  projects/
  candidates/
  notes/
  contact-attempts/
  activity/
  auth/
```

Do not create those folders until needed.
