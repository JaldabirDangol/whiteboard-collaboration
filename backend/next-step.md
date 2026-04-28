# Next Steps — Backend Implementation

## Status: What's Already Done
- ✅ Real-time board collaboration (Yjs CRDT sync, board:join/leave/undo/redo, yjs:update)
- ✅ Board object socket events (board:draw, board:update-object, board:delete-object)
- ✅ Presence events (presence:join/leave/cursorMove, online/offline tracking)
- ✅ Chat socket events (chat:send → chat:receive, chat:delete → chat:deleted)
- ✅ RBAC middleware (checkBoardAccess with role hierarchy)
- ✅ Board CRUD REST API (create, get, delete, join, share, member management)
- ✅ Board Object CRUD REST API (POST/PATCH/DELETE /boards/:id/objects)
- ✅ Snapshots REST API (GET /boards/:id/snapshots)
- ✅ Message CRUD REST API + real-time fanout
- ✅ Prisma schema (User, Board, BoardMember, Shape, Snapshot, Message, Comment, Asset, AuditLog, BoardSettings)

## What's Missing (from readme spec)

### 1. File & Media Upload System (Section 5 of spec)
The Prisma schema already has the `Asset` model but there is NO upload controller, 
no upload route, and no file storage integration.

**Need to implement:**
- `POST /api/upload` — accept image files (PNG, JPG, SVG), store locally (or S3/Cloudinary later)
- `GET /api/files/:id` — serve uploaded files
- Multer middleware for multipart form handling
- Asset service (create, get, delete)
- Uploaded files become board objects of type `image`

### 2. Audit Logging (Section 6 + schema already exists)
The `AuditLog` model exists in Prisma but is never written to.

**Need to implement:**
- AuditLog service to record key actions (board created, object added/deleted, member joined, etc.)
- Integrate into existing controllers/socket events
- GET /api/boards/:id/logs endpoint for admins

### 3. Board Settings Endpoint
The `BoardSettings` model exists but has no controller/routes.

**Need to implement:**
- GET /api/boards/:id/settings
- PATCH /api/boards/:id/settings (admin only)
- Public board access toggle + optional password

## Implementation Order
1. File upload system (most impactful missing feature)
2. Audit logging service + integration
3. Board settings endpoints
