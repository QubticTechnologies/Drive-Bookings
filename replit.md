# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Zustand, Framer Motion, Lucide

## Product: DriveApp

A ride-hailing platform with two modes:

### Driver Mode
- Register vehicle details (make, model, year, plate, license number)
- Toggle availability status (available/busy/offline)
- View and accept/reject pending ride requests
- Start and complete rides
- View earnings/billing history

### Client Mode
- Request rides with pickup + drop-off locations
- Estimated fare shown before booking (base $3 + $1.50/km)
- Track ride status in real-time (pending → accepted → in_progress → completed)
- View detailed invoice when ride completes

## Fare Calculation
- Base fare: $3.00
- Rate: $1.50 per km
- Distance calculated server-side using Haversine formula from lat/lng coordinates

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── drive-app/          # React + Vite frontend (DriveApp)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema
- `drivers` — registered drivers with vehicle info, status, rating
- `rides` — ride bookings with pickup/dropoff coords, fare, status lifecycle
- `bills` — generated invoices when rides are completed

## API Routes
- `GET /api/healthz` — health check
- `POST /api/drivers` — register driver
- `GET /api/drivers` — list drivers (filter by status)
- `GET /api/drivers/:id` — get driver
- `PATCH /api/drivers/:id` — update driver status
- `POST /api/rides` — create ride request
- `GET /api/rides` — list rides (filter by driverId, status)
- `GET /api/rides/:id` — get ride
- `PATCH /api/rides/:id/status` — update ride status (accept/start/complete/cancel)
- `GET /api/rides/:id/billing` — get bill for a completed ride
- `GET /api/bills` — list all bills

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts`, `health.ts`, `drivers.ts`, `rides.ts`, `billing.ts`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `artifacts/drive-app` (`@workspace/drive-app`)

React + Vite frontend. Dark-mode ride-hailing UI with driver and client flows.

- Pages: `Home`, `driver/Register`, `driver/Dashboard`, `client/Book`, `client/Tracker`, `shared/Invoice`
- State: Zustand store (`use-session.ts`) for driver/client session persistence in localStorage
- UI: Custom components (Button, Input, Card, Badge) + Lucide icons

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/drivers.ts` — drivers table
- `src/schema/rides.ts` — rides table
- `src/schema/bills.ts` — bills/invoices table

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) and Orval config (`orval.config.ts`).

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Run scripts via `pnpm --filter @workspace/scripts run <script>`.
