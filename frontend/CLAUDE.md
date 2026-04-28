@AGENTS.md

# Whiteboard Collaboration — Architecture Guide

## Overview

Real-time collaborative whiteboard application. Users create boards, draw shapes (pen, rectangle, circle, eraser), see each other's cursors, chat, and manage board membership with roles.

**Monorepo structure:** Two independent packages — `frontend/` (Next.js) and `backend/` (Express). No shared packages. Each has its own `pnpm-lock.yaml`.

---

## Tech Stack

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| State (client) | Zustand |
| State (server) | TanStack React Query |
| Canvas | Konva + react-konva |
| Realtime | socket.io-client + Yjs |
| Styling | Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Icons | lucide-react |
| Toasts | sonner |
| Animations | motion (landing page only) |

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js, Express 5 (ESM) |
| Language | TypeScript (strict, noUncheckedIndexedAccess) |
| Database | PostgreSQL via Prisma 7 |
| Realtime | Socket.IO + Yjs |
| Auth | JWT (httpOnly cookie) + bcryptjs |
| Infra | Docker Compose (Postgres + Redis) |

---

## Project Structure

### Frontend (`frontend/`)

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (fonts, Providers, Toaster)
│   ├── page.tsx                  # Landing page (/)
│   ├── globals.css               # Tailwind theme tokens, CSS variables
│   ├── (auth)/
│   │   ├── login/page.tsx        # /login
│   │   └── signup/page.tsx       # /signup
│   └── boards/
│       ├── page.tsx              # /boards (dashboard)
│       └── [slug]/               # /boards/:slug (canvas)
│           ├── page.tsx          # Board page — canvas, panels, socket
│           ├── board-top-bar.tsx
│           ├── board-right-panel.tsx
│           ├── board-mobile-chat.tsx
│           ├── board-types.ts        # Shape type definitions
│           ├── board-shape-utils.ts   # Shape normalization/dedup
│           ├── board-profile-utils.ts # User avatar/color helpers
│           ├── use-board-realtime.ts  # Socket + Yjs hook
│           └── use-board-canvas-interactions.ts  # Draw/select/pan/zoom
├── components/
│   ├── providers.tsx             # QueryClient + user bootstrap
│   ├── navbar.tsx                # App navigation bar
│   ├── canvas/
│   │   ├── header.tsx            # Tool bar on canvas page
│   │   └── chat.tsx              # Realtime chat component
│   ├── boards/
│   │   ├── boardCard.tsx
│   │   ├── boardGrid.tsx
│   │   ├── boardSearch.tsx
│   │   └── sidebar.tsx
│   └── ui/                       # shadcn/ui primitives (Button, Card, Dialog)
├── store/
│   ├── useToolStore.tsx          # Selected tool, color, strokeWidth
│   └── useUserStore.tsx          # Auth user state, fetchCurrentUser
├── lib/
│   ├── api.ts                    # REST API client (all endpoints)
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
└── constant/
    └── index.ts                  # API_URL base
```

### Backend (`backend/`)

```
src/
├── index.ts                      # Entry: Express app, Socket.IO, route mounting
├── controllers/
│   ├── auth/authController.ts    # signup, login, logout
│   ├── boards/
│   │   ├── boardController.ts    # CRUD, join, share
│   │   └── boardServices.ts     # DB queries, shape persistence
│   ├── message/
│   │   ├── messageController.ts  # send, list, delete + socket fanout
│   │   └── messageService.ts
│   └── user/
│       ├── userController.ts     # (currently unused)
│       └── userServices.ts       # (currently unused)
├── routes/
│   ├── authRoutes.ts             # POST /api/auth/signup, login, logout
│   ├── me.ts                     # GET /api/auth/me
│   ├── boardRoutes.ts            # /api/boards/* (all protected)
│   ├── messageRoute.ts           # /api/messages/* (protected)
│   └── userRoutes.ts             # /api/users (protected, mostly unused)
├── socket/
│   ├── index.ts                  # Socket.IO init, middleware, event registration
│   ├── yjs.ts                    # Y.Doc management (getYDoc, per-board Map)
│   ├── boardAccess.ts            # canAccessBoard, canEditBoard role checks
│   ├── events/
│   │   ├── boardEvent.ts         # board:join, yjs:update, undo/redo, leave
│   │   └── presenceEvents.ts    # cursor relay, online/offline, user list
│   └── middleware/
│       └── socketAuth.ts         # JWT from cookie/header/handshake
├── middleware/
│   └── authMiddleware.ts         # HTTP JWT cookie verification
├── lib/
│   └── prisma.ts                 # Prisma client singleton
└── types/
    └── express.d.ts              # req.user type augmentation
prisma/
├── schema.prisma                 # Database schema
└── migrations/
```

---

## Database Schema

### Models

- **User** — id, email (unique), name?, password?, timestamps
- **Board** — id, title (unique), thumbnailUrl?, timestamps
- **BoardMember** — join table (userId + boardId unique), role enum
- **Shape** — boardId, userId, type enum, data (JSON), timestamps
- **Snapshot** — boardId, version, data (JSON) — versioned Yjs state
- **Message** — boardId, userId, content, timestamps
- **Comment** — shapeId, userId, content, timestamps
- **Asset** — boardId, url, type enum, uploadedBy, timestamps
- **AuditLog** — boardId, userId, action, metadata (JSON)?, timestamps
- **BoardSettings** — 1:1 with Board, isPublic, password?, timestamps

### Enums

- **Role**: `ADMIN`, `EDITOR`, `VIEWER`
- **ShapeType**: `RECTANGLE`, `CIRCLE`, `LINE`, `ARROW`, `TEXT`, `DRAW`, `IMAGE`
- **AssetType**: `IMAGE`, `PDF`, `VIDEO`, `FILE`

---

## API Routes

### Auth (public)
| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/auth/signup` | signup |
| POST | `/api/auth/login` | login (sets httpOnly JWT cookie) |
| POST | `/api/auth/logout` | logout (clears cookie) |

### Protected (require JWT cookie)
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/auth/me` | current user |
| POST | `/api/boards/create` | createBoard |
| GET | `/api/boards/user` | getBoardsForUser |
| GET | `/api/boards/:id` | getBoard |
| GET | `/api/boards/:id/shapes` | getBoardShapes |
| POST | `/api/boards/:id/join` | joinBoard |
| POST | `/api/boards/:id/share` | shareBoard |
| PUT | `/api/boards/:id` | updateBoardMember |
| DELETE | `/api/boards/:id` | deleteBoard |
| GET | `/api/messages/board/:boardId` | getMessagesByBoard |
| POST | `/api/messages/` | sendMessage |
| DELETE | `/api/messages/:id` | deleteMessage |

---

## Socket.IO Events

### Board Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `board:join` | client → server | Join board room, receive initial Yjs state |
| `board:init` | server → client | Full Yjs state on join |
| `board:leave` | client → server | Leave board room |
| `board:userJoined` | server → room | Broadcast user joined |
| `board:userLeft` | server → room | Broadcast user left |
| `yjs:update` | bidirectional | Incremental Yjs delta sync |
| `board:undo` | client → server | Undo via Y.UndoManager |
| `board:redo` | client → server | Redo via Y.UndoManager |
| `board:state` | server → room | Full state after undo/redo |
| `board:forbidden` | server → client | Access denied |

### Presence Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `presence:join` | client → server | Announce online |
| `presence:leave` | client → server | Announce offline |
| `presence:state` | server → client | Current online user IDs |
| `presence:userOnline` | server → room | User came online |
| `presence:userOffline` | server → room | User went offline |
| `presence:cursorMove` | bidirectional | Relay cursor position |

### Chat Events (fanout from REST)
| Event | Direction | Description |
|-------|-----------|-------------|
| `messageSent` | server → room | New message broadcast |
| `messageDeleted` | server → room | Deleted message broadcast |

---

## Authentication Flow

1. **Signup** → POST `/api/auth/signup` → redirect to `/login`
2. **Login** → POST `/api/auth/login` → JWT set as `httpOnly` cookie (`token`), 1h expiry
3. **Bootstrap** → `Providers` component calls `fetchCurrentUser` → GET `/api/auth/me`
4. **Route guard** → Board pages check Zustand user state, redirect to `/login` if null
5. **Socket auth** → Token extracted from cookie / `Authorization` header / `handshake.auth.token`
6. **Logout** → POST `/api/auth/logout` → clear cookie, clear Zustand + React Query cache → redirect `/login`

---

## Realtime Collaboration Architecture

### Yjs Integration
- One `Y.Doc` per board, stored in process-level `Map<string, Y.Doc>` on server
- Board content lives in `Y.Map("board")` → shapes stored as JSON string under key `"shapes"`
- On `board:join`: server hydrates Y.Doc from DB snapshot if needed, sends full state via `board:init`
- On `yjs:update`: server applies delta, broadcasts to peers, persists Snapshot + replaces Shape rows
- Undo/redo: server-side `Y.UndoManager` per board, emits `board:state` with full state

### Cursor/Presence
- `presence:cursorMove` relays `{x, y, userId, userName}` to all peers in room
- Server tracks per-board connection count per user (supports multi-tab)
- Remote cursors rendered on overlay Konva layer with user labels

---

## Canvas Implementation

- **Rendering**: Konva `Stage` → `Layer` → shape components (`Line`, `Rect`, `Circle`)
- **Shape model**: Discriminated union — `line | rectangle | circle` (frontend types)
- **Tools**: pen, eraser, rectangle, circle, select (drag existing shapes)
- **Navigation**: spacebar/middle-mouse pan, wheel pan, Ctrl+wheel zoom (0.5–2x range)
- **Shape normalization**: `normalizeShapesForClient()` dedupes by `shape.id`, coerces legacy payloads
- **Export**: PNG (stage.toDataURL) and JSON (shape array)
- **Import**: JSON with normalization and validation
- **Permissions**: edit gated by board role (ADMIN/EDITOR), VIEWER forced to select-only

---

## State Management Patterns

| Concern | Solution | Location |
|---------|----------|----------|
| Auth/user | Zustand | `useUserStore` |
| Drawing tool | Zustand | `useToolStore` |
| Board data, shapes | React Query | Board page queries/mutations |
| Canvas shapes (live) | Local state + Yjs sync | Board page + `use-board-realtime` |
| Socket events | Local hook state | `use-board-realtime`, chat component |

---

## Styling Conventions

- Tailwind v4 with CSS variable design tokens (light/dark themes in `globals.css`)
- shadcn/ui primitives in `src/components/ui/` — use these for buttons, cards, dialogs
- Use `cn()` from `src/lib/utils.ts` for conditional class merging
- Neutral/slate palette for chrome, indigo accent for collaboration features
- Canvas background: radial dot pattern

---

## Development Commands

### Frontend
```bash
cd frontend
pnpm install
pnpm dev          # Next.js dev server
pnpm build        # Production build
pnpm lint         # ESLint
```

### Backend
```bash
cd backend
pnpm install
docker compose up -d   # Start Postgres + Redis
pnpm db:generate       # Generate Prisma client
pnpm db:migrate        # Run migrations
pnpm dev               # tsx watch
pnpm build             # tsc compile
```

---

## Environment Variables

### Backend
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for signing/verifying JWTs
- `FRONTEND_URL` — Allowed CORS origin
- `PORT` — Server port (default 3000)
- `NODE_ENV` — `production` for secure cookies

### Frontend
- `API_URL` — Backend REST base URL (used in `src/constant/index.ts`)
- `NEXT_PUBLIC_API_URL` — Backend URL for socket connections
- `NEXT_PUBLIC_SOCKET_URL` — Socket.IO URL (if different from API)

---

## Coding Conventions

- **Imports**: Use `@/` path alias (maps to `src/`)
- **Components**: `"use client"` directive at boundaries needing browser APIs
- **API calls**: Centralize in `src/lib/api.ts` — do not make raw fetch calls from components
- **UI primitives**: Use shadcn components from `src/components/ui/` — do not create one-off styled elements
- **Types**: Keep board/shape types in `board-types.ts` inside the route folder
- **Services**: Backend uses controller/service split — controllers handle HTTP, services handle DB
- **Socket events**: Follow existing event naming (`namespace:action` pattern)
- **Error responses**: Return `{ error: string }` JSON with appropriate HTTP status codes
- **Role checks**: Always verify board membership and role before mutations (REST and socket)
- **Shape dedup**: Always dedupe shape arrays by `shape.id` before rendering to avoid React key collisions

---

## Known Issues / Technical Debt

1. **Dual socket connections** — Board page creates one socket for canvas realtime, chat component creates another. Should be unified.
2. **Env var inconsistency** — REST uses `API_URL`, sockets use `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SOCKET_URL`. Standardize.
3. **Write amplification** — Every `yjs:update` persists snapshot + rewrites all shapes. Add debouncing/batching.
4. **Message auth gap** — Message endpoints don't verify board membership before read/write.
5. **Email normalization** — Login lowercases email, signup doesn't. Normalize on signup.
6. **Unused code** — `user/` controller/services not wired. `setupYjs()` in `yjs.ts` unused. Redis present but not used.
7. **Shape type gap** — Backend service only maps rectangle/circle/line/draw; schema supports arrow/text/image.
8. **Empty component** — `src/components/header.tsx` is empty.
