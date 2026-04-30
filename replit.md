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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Document Extractor app (`artifacts/doc-extractor` + `artifacts/api-server`)

Standalone React/Vite UI on port 21926 backed by an Express API on port 8080
(routed under `/api`). Lets users upload Form 7, Form 12, Aadhaar, or Bank
Passbook scans to Datalab, then saves the cleaned-up fields into a phone-keyed
profile in MongoDB (`apnaapp.users`).

- Secrets are loaded from a hard-coded `ecosystem.config.cjs` at the repo root
  (gitignored) — `MONGODB_URI`, `MONGODB_DB`, `DATALAB_API_KEY`.
- API endpoints:
  - `POST /api/extract`           submit a document; pass `profile_phone` to auto-save on completion.
  - `GET  /api/extract/:id`       poll status; on `complete`, response includes a `profile` object describing the save.
  - `GET  /api/profiles`          list profile summaries for the hamburger menu.
  - `GET  /api/profiles/by-section/:section` list profiles populated for a section.
  - `POST /api/profiles`          create (or fetch existing) profile by phone.
  - `GET/DELETE /api/profiles/:phone` read or delete a profile.
  - `PATCH/DELETE /api/profiles/:phone/:section` upsert / drop a single section.
- MongoDB sub-document mapping (`artifacts/api-server/src/lib/profiles.ts`):
  - `aadhar`   ← Datalab Aadhaar fields (matches existing `Aniket Sanjay Rane` doc shape).
  - `passbook` ← Datalab passbook fields (`bankName`, `cifNumber`, `ifsc`, `branchCode`, etc.).
  - `form7`    ← Form 7 ownership register (owners, area, encumbrances, mutations).
  - `form12`   ← Form 12 (`crop_entries` table → `cropEntries` array).
  - `form8a`   ← Form 8A khata utara — combined holdings register (`holdings` table of survey-number rows).
- Frontend routes (wouter):
  - `/`                    Home with hamburger drawer (`src/components/profile-menu.tsx`).
  - `/extract/:type`       Upload + view structured + Datalab block view; pre-binds `?profile_phone=` for auto-save.
  - `/profile/:phone`      Profile detail page (`src/pages/Profile.tsx`) — every saved section in one place, with re-upload and per-section delete.
