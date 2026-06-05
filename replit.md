# Duollance HR Template Hub

An internal tool for Duollance's HR and growth team to manage, search, and reuse message templates for client acquisition outreach.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/hr-templates run dev` — run the frontend (port 24906)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, Wouter, Tailwind CSS, Shadcn UI
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/categories.ts` — Categories table
- `lib/db/src/schema/templates.ts` — Templates table
- `artifacts/api-server/src/routes/` — categories.ts, templates.ts, stats.ts
- `artifacts/hr-templates/src/` — React frontend

## Architecture decisions

- OpenAPI-first: all API contracts defined in `lib/api-spec/openapi.yaml` before any code
- Templates store channels as a Postgres `text[]` array for flexible multi-channel tagging
- Usage count incremented via dedicated `/templates/:id/use` endpoint (called on every copy)
- Stats endpoint aggregates channel and category breakdowns server-side for dashboard performance

## Product

- **Template Library** — Browse 14 pre-loaded templates across 6 categories, searchable and filterable by category, channel, and favorites
- **One-click Copy** — Copies full template content to clipboard and increments usage counter
- **Favorites** — Star any template for quick access
- **Dashboard** — Stats overview: total templates, categories, uses, favorites, channel and category breakdowns
- **Categories** — Manage template categories with color coding
- **New Template** — Create templates with title, content (supports `{variable}` placeholders), category, and channel tags

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm --filter @workspace/db run push` must be run after any schema changes
- Re-run codegen after any changes to `lib/api-spec/openapi.yaml`
- Body schema component names in OpenAPI must NOT match `<OperationIdPascal>Body` (Orval collision)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
