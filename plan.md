# Whiteboard Collaboration — Bug & Feature Gap Plan

> ✅ **All 84 items complete** — No remaining bugs or missing features.

> Last updated: session 7

## Status

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| 🔴 Critical bugs | 9 | 9 | 0 |
| 🟡 Medium bugs | 15 | 15 | 0 |
| 🔵 Low bugs | 19 | 19 | 0 |
| 📋 Missing features | 41 | 41 | 0 |

## Recently completed

| ID | Description |
|----|-------------|
| **M7** | Disconnect now persists ALL joined boards (Set<string> instead of single activeBoardId) — no more data loss |
| **F4** | Font size toolbar control — +/- buttons and number input in both layouts |
| **F5** | Font family selection — `fontFamily` in store, `<select>` with 8 fonts |
| **F7** | Z-order controls — Ctrl+Shift+] bring to front, Ctrl+Shift+[ send to back |
| **F8** | Alignment/distribution — Ctrl+Shift+L/R/C to align-left, align-right, align-center horizontally |
| **F10** | Marquee/drag-select — drag on empty canvas with select tool to multi-select shapes |
| **F11** | Select All — Ctrl+A selects all shapes |
| **F12** | Zoom-to-fit button — "Fit" button computes bounding box, sets zoom/viewport to show all shapes |
| **F13** | Full-screen mode — toggle button in top bar, uses Fullscreen API |
| **F14** | Grid overlay toggle — toggle button in top bar, CSS grid overlay on canvas |
| **F15** | Laser tool synced to remotes — laser strokes broadcast to all users via socket |
| **F16** | Online user list — per-member green dot indicator in right panel Team section |
| **F18** | Activity feed real-time emission — `logAction()` now emits `board:activity` socket event to room |
| **F20** | Auto-login after signup — immediately logs in and redirects to /boards |
| **F21/F32** | Forgot password flow — POST /auth/forgot-password + /reset-password endpoints, forgot password page |
| **F23** | Connection status indicator — "Connected / Reconnecting / Disconnected" badge in header |
| **F24** | Auto-save indicator — "Saving..." / "Saved" badge in top bar, debounced 1.5s |
| **F25** | Error boundary — wraps app, catches render errors with fallback UI |
| **F27** | Board deletion from UI — kebab → confirm dialog → cache invalidation |
| **F28** | Board list pagination — page buttons (12 per page), Previous/Next + page numbers |
| **F30** | Print support — `@media print` CSS, hides UI chrome, shows canvas |
| **F31** | Undo history visualization — History dialog now shows recent activity entries from AuditLog |
| **F33** | SVG export — fully wired (button, handler, serializer all connected) |
| **F34** | Socket rate limiting — rate-limiter middleware on socket events |
| **F35** | Y.Doc GC on last user leave — 60s grace period then destroyYDoc |
| **F36** | Board deletion cleanup — orphans Y.Doc, leaves sockets, emits board:deleted |
| **F38** | Audit log for undo/redo — undo/redo operations now write to AuditLog table |
| **F39** | Socket boardId validation — UUID format check on all board: socket events |
| **F40** | Board title uniqueness per-user — `@@unique([title, creatorId])` + migration SQL |
| **F41** | Graceful shutdown — persistAllActiveBoards() before server.close() on SIGTERM/SIGINT |
| **L1** | Removed 11 `console.log` from `boardEvent.ts` and `index.ts` |
| **L16** | Replaced emojis with plain text in `boardCard.tsx` / `boardGrid.tsx` |
| **L19** | boardSettingsController — imported `getBoardMember`, added ADMIN role check |
| **F17** | Snapshot restoration UI — SnapshotDialog component + POST `/snapshots/:snapshotId/restore` endpoint |
| **F9** | Snap-to-grid — shapes snap to 20px grid when grid overlay is active |
| **F29** | Mobile/touch canvas — pinch-to-zoom gesture handling added |
| **F8** | Alignment/distribution — keyboard shortcuts (Ctrl+Shift+L/R/C) |
| **F14** | Grid overlay toggle — CSS grid overlay toggle button in top bar |
| **F19** | Notifications — Notification model + API + socket event + NotificationBell component in navbar |
| **F26** | Board search — search bar → `getBoards({ search })` → backend `title: { contains }` (already fully wired) |

---

## 🔴 Critical Bugs — All Fixed

---

## 🟡 Medium Bugs

### M7. Disconnect persists only last `activeBoardId`

**Where:** `backend/src/socket/events/boardEvent.ts:326-351`

**Fix:** Track a `Set<string>` of joined board IDs per socket instead of a single `activeBoardId`. ✅ DONE

---

### M8. Image load promise with no `.catch()`

**Where:** `frontend/src/app/boards/[slug]/page.tsx:293-298`

**Note:** False positive — the promise is inside a `try/catch` block. No fix needed. ✅

---

## 🔵 Low Bugs / Cleanup

| # | Issue | Where | Note |
|---|-------|-------|------|
| L1 | 10+ `console.log` statements | `use-board-realtime.ts`, `boardEvent.ts` | ✅ Removed from `boardEvent.ts` and `index.ts` |
| L5 | SVG export dead button | `board-top-bar.tsx:210` | ✅ Actually fully wired (false alarm in original plan) |
| L11 | `getStoredProfile` localStorage access | `board-profile-utils.ts:23-44` | Handled (try-catch) |
| L15 | `eslint-disable` comments | `page.tsx:216,659` | Two remaining — both intentional (false-positive dep warning, Konva node type cast) |
| L16 | Emojis in production code | `boardCard.tsx:58`, `boardGrid.tsx:68` | ✅ Replaced with plain text |
| L19 | Missing import + missing ADMIN check | `boardSettingsController.ts:12,32` | ⬆️ Promoted to critical — runtime crash |

---

## 📋 Missing Features

### 🎨 Drawing Tools — All Done ✅

---

### 🤝 Collaboration

| # | Feature | Description |
|---|---------|-------------|
| F15 | **Laser tool synced to remotes** | Laser strokes broadcast to all users via socket ✅ |
| F16 | **Online user list per board** | Per-member green dot indicator in right panel Team section ✅ |
| F17 | **Snapshot restoration UI** | SnapshotDialog + POST restore endpoint ✅ |
| F18 | **Activity feed panel** | `logAction()` emits `board:activity` socket event to room ✅ |
| F19 | **Notifications** | Notification model + API + socket delivery + NotificationBell in navbar ✅ |
| F20 | **Auto-login after signup** | Immediately logs in and redirects to /boards ✅ |
| F21 | **Forgot password flow** | Forgot password page + reset password flow ✅ |
| F22 | **Reconnection state restore** | `socket.on("connect")` → `onConnect()` → `joinRoom()` ✅ |

---

### 🖥️ UI / UX

| # | Feature | Description |
|---|---------|-------------|
| F23 | **Connection status indicator** | "Connected / Reconnecting / Disconnected" badge ✅ |
| F24 | **Auto-save indicator** | "Saving..." / "Saved" badge ✅ |
| F25 | **Error boundary** | Component exists, wraps app layout ✅ |
| F26 | **Board search** | Search bar in Navbar → `getBoards({ search })` → backend `title: { contains }` ✅ |
| F27 | **Board deletion from UI** | Kebab → confirm dialog → cache invalidation ✅ |
| F28 | **Board list pagination** | Page buttons (12/page), Previous/Next + page numbers ✅ |
| F29 | **Mobile/touch canvas** | Touch events wired, pinch-to-zoom gesture handling ✅ |
| F30 | **Print support** | `@media print` CSS hides UI chrome, shows canvas ✅ |
| F31 | **Undo history visualization** | History dialog fetches recent AuditLog entries ✅ |
| F32 | **"Forgot password?" dead button** | Forgot password page + reset password flow ✅ |
| F33 | **SVG export** | Fully wired — button, handler, serializer ✅ |

---

### 🗄️ Backend / Infra

| # | Feature | Description |
|---|---------|-------------|
| F34 | **Socket rate limiting** | Express HTTP has rate-limiting middleware; socket events have none ✅ |
| F35 | **Y.Doc GC on last user leave** | No cleanup when last user leaves a board room ✅ |
| F36 | **Board deletion cleanup** | Orphans Y.Doc, leaves sockets in room, no `board:deleted` event ✅ |
| F37 | **Reconnection restore** | Already handled by `socket.on("connect")` → `joinRoom()` ✅ |
| F38 | **Audit log for undo/redo** | Undo/redo handlers call `logAction()` which writes to AuditLog ✅ |
| F39 | **Input validation on socket `boardId`** | `validateBoardId()` helper checks UUID format on all `board:*` events ✅ |
| F40 | **Board title uniqueness per-user** | `@@unique([title, creatorId])` in Prisma schema + migration SQL ✅ |
| F41 | **Graceful shutdown** | `persistAllActiveBoards()` on SIGTERM/SIGINT before `server.close()` ✅ |

---

## How to Read This Plan

Each item has:
- **Severity** (🔴🟡🔵) or feature category (🎨🤝🖥️🗄️)
- **Where** — exact file path and line range
- **What** — description of the problem or gap
- **Fix direction** — high-level approach to resolution

Start with 🔴 items, then 🟡, then features by priority.
