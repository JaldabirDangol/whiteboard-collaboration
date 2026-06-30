# Known Issues

## ✅ Fixed

### 1. `comments is not iterable` — Spread on nullable state

**Severity:** High (crash)
**Fix:** `frontend/src/lib/api.ts:462` — Added `body?.comments` optional chaining (was `body.comments`), and `Array.isArray` guard.

### 2. `Failed to create comment. The shape may not be saved yet.` — FK race condition + fundamental ID mismatch

**Severity:** High (all comments failed)
**Root cause:** Two issues:
- (a) `replaceBoardShapes` used `gen_random_uuid()` for new shapes, so `Shape.id` (DB-generated) never matched `Comment.shapeId` (client-side UUID from `crypto.randomUUID()`). The FK constraint added in migration `20260630121853` made EVERY comment fail with P2003.
- (b) Even if (a) didn't exist, the 500ms debounce on persist meant freshly-drawn shapes weren't in the DB yet when a user tried to comment.

**Fix:**
- `commentService.ts:createComment` — Now resolves client-side UUID to actual DB `Shape.id` before creating the comment. Tries direct `findUnique` (for new shapes where they match) then falls back to `data->>'id'` JSONB query (for older shapes). Retry loop (3 attempts with backoff) handles the race condition.
- `replaceBoardShapes` — Changed `gen_random_uuid()` to `shape.id` as fallback for new shapes' DB ID, so future shapes will match directly, eliminating the need for the fallback query.

### 3. Cascade-deleted comments are not broadcast via socket

**Severity:** Medium (stale UI)
**Fix:** `replaceBoardShapes` now returns orphaned comment IDs. Callers in `boardEvent.ts` emit `comment:removed` events for cascade-deleted comments.

### 4. Missing cascade deletes on User relations

**Severity:** Medium (cannot delete users without manual cleanup)
**Fix:** `BoardMember.userId` → `onDelete: Cascade` in schema. New migration `20260630165618_add_boardmember_user_cascade`. Rest left as-is — user deletion not implemented yet.

### 5. Comment badges render at (0,0) for unhandled shape types

**Severity:** Low (visual glitch)
**Fix:** `frontend/src/app/boards/[slug]/page.tsx:1370` — Added `default` case that positions at `(shape.x, shape.y)` for unhandled types.

### 6. Write amplification on every yjs:update

**Severity:** Medium (performance)
**Fix:** `replaceBoardShapes` now compares JSON of each incoming shape against existing data. Shapes whose data hasn't changed are skipped in the upsert. For a large board where 1 shape changes, only 1 row is upserted instead of all 1000.

### 7. Debounced persist creates race window for undo/redo with pending persists

**Severity:** Medium (data loss potential)
**Fix:** Undo/redo handlers in `boardEvent.ts` now flush current Y.Doc state to DB (with `forceSnapshot=true`) before clearing the pending timer, then proceed with snapshot restore. Preserves the snapshot chain for redo.

### 8. `getBoardComments` skip/take params never used from frontend

**Severity:** Low (technical debt)
**Fix:** Added `take=200` query param to `GET /api/comments/board/:boardId` in `frontend/src/lib/api.ts:452`.

### 9. No input size validation for comment content

**Severity:** Low (potential abuse)
**Fix:** `backend/src/controllers/comment/commentController.ts:31-33` — Added 5000 character max length check.

### 10. Socket-based comment:add bypasses POST /api/comments membership check

**Severity:** Medium (inconsistent auth)
**Fix:** `backend/src/socket/events/commentEvents.ts:15` — Changed from `canAccessBoard` to `canEditBoard` for `comment:add`. Also added 5000 char limit check.

### 11. No comment content sanitization

**Severity:** Low (display quirks)
**Fix:** Added regex normalization in render — `replace(/\s{3,}/g, " ")` and `replace(/\n{3,}/g, "\n\n")` to collapse excessive whitespace.

### 12. `Shape.data` field stores full shape object including `id`

**Severity:** Low (data integrity)
**Fix:** `replaceBoardShapes` now strips `id` before storing via `Object.fromEntries(Object.entries(shape).filter(...))`. `getBoardShapesFromDatabase` restores it from the row's own `id`. Eliminates duplicate bytes and the risk of drift.

### 13. `select: { id: true, data: true }` — `userId` not fetched in replaceBoardShapes

**Severity:** Medium (ownership drift)
**Fix:** `backend/src/controllers/boards/boardServices.ts:281` — Added `userId: true` to the `select` in `replaceBoardShapes`.

### 15. Socket WebSocket connection error on first load

**Severity:** Medium (delayed collaboration)
**Fix:** Added `"polling"` fallback transport: `transports: ["websocket", "polling"]` in `frontend/src/lib/board-socket.ts:22`.

---

## ✅ All issues resolved

### 14. `NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_SOCKET_URL` mismatch risk

**Severity:** Low (dev environment only)
**Status:** Won't fix — `NEXT_PUBLIC_SOCKET_URL` already takes priority. The `/api` stripping fallback is correct for the default dev setup where both run on the same port.
