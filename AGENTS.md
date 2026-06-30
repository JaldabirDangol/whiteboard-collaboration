# Whiteboard Collaboration

Two independent packages (`frontend/`, `backend/`), each with its own `pnpm-lock.yaml` and `pnpm-workspace.yaml`. **No shared packages.**

## Commands

```bash
pnpm dev              # starts both dev servers concurrently
pnpm dev:frontend     # pnpm --dir frontend run dev
pnpm dev:backend      # pnpm --dir backend run dev
```

| Package  | Dev server    | Build         | Lint        |
|----------|---------------|---------------|-------------|
| frontend | `pnpm dev`    | `pnpm build`  | `pnpm lint` |
| backend  | `pnpm dev` (tsx watch) | `pnpm build` (tsup) | — |

**No tests exist in this repo** (no test framework, no test files).

## Backend setup order

```bash
docker compose up -d          # Postgres (:5433)
pnpm db:generate              # Prisma client
pnpm db:migrate               # Migrations
pnpm dev                      # tsx watch src/index.ts (:3050)
```

Prisma 7 — uses `prisma.config.ts` (not datasource block in schema).  
Postinstall hook auto-runs `prisma generate`.

## Environment

- **Backend**: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (required at startup — server crashes if missing). `PORT` defaults to `3050`.
- **Frontend**: `NEXT_PUBLIC_API_URL` (used as REST base + socket URL fallback). Defaults to `http://localhost:3050/api`.

## Architecture notes

- **Yjs**: One `Y.Doc` per board, stored in a process-level `Map<string, Y.Doc>`. Board shapes live in `Y.Map("board")` key `"shapes"` as a JSON string.

- **RBAC**: Socket and REST both check `ADMIN`/`EDITOR`/`VIEWER` roles. VIEWER is forced select-only on canvas.
- **Undo/redo**: Server-side `Y.UndoManager` per board; full state emitted on `board:state` after operation.
- **Auth**: JWT in httpOnly cookie (`token`), 1h expiry. Socket auth reads cookie / `Authorization` header / `handshake.auth.token`.
- **REST client**: All API calls go through `frontend/src/lib/api.ts` (no raw fetch from components).

## Conventions

- **Imports**: `@/` path alias in both packages (maps to `src/`).
- **shadcn/ui**: Uses `radix-nova` style, primitives in `frontend/src/components/ui/`.
- **Tailwind v4**: PostCSS with `@tailwindcss/postcss` (no `tailwind.config.ts`).
- **Canvas**: Konva `Stage` → `Layer` → shape components — no React DOM for drawing.
- **Shape dedup**: Always dedupe shape arrays by `shape.id` before rendering (React key collisions).
- **DB migrations**: 5 applied. Latest: `20260630165618_add_boardmember_user_cascade`.
- **Socket transport**: `["websocket", "polling"]` — polling fallback prevents WS upgrade failures on first load.
- **Comment sanitization**: Frontend collapses `\s{3,}` → `" "` and `\n{3,}` → `"\n\n"` at render time.
- **Undo/redo persist flush**: Both handlers flush pending Y.Doc state to DB (`forceSnapshot=true`) before snapshot restore, preserving redo chain.
- **BoardMember.userId**: `onDelete: Cascade` — membership auto-deleted when user is removed.
- **Socket event naming**: `namespace:action` pattern (e.g. `board:join`, `presence:cursorMove`).

## Fixed debt

- Write amplification: `replaceBoardShapes` skips unchanged shapes (compares serialized JSON before upserting)
- FK mismatch: `Comment.shapeId` vs `Shape.id` — client-side UUIDs now used as DB IDs; `commentService` resolves via `findUnique` then `data->>'id'` fallback
- Redundant `id` in `Shape.data`: stripped on write, restored on read

See `frontend/CLAUDE.md` for full architecture reference (344 lines).

## graphify

`/graphify` builds a persistent knowledge graph from any path. Output lands in `graphify-out/`.

| Command | What it does |
|---------|-------------|
| `/graphify` | Full pipeline on current dir |
| `/graphify <path>` | Full pipeline on specific path |
| `/graphify <path> --update` | Re-extract only new/changed files |
| `/graphify query "<question>"` | BFS traversal on the graph |
| `/graphify query "<question>" --dfs` | DFS trace follow one path |
| `/graphify path "A" "B"` | Shortest path between two concepts |
| `/graphify explain "Node"` | Explain a node and its connections |

Outputs: `graphify-out/graph.html` (interactive), `graph.json` (raw data), `GRAPH_REPORT.md` (audit report).
