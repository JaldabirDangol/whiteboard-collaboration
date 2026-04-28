🧠 Collaborative Whiteboard Backend – Detailed Implementation Spec
1. Real-Time Board Collaboration
1.1 boardEvent.ts (WebSocket / Socket.IO Layer)

Fully implement real-time synchronization of board state across clients.

Responsibilities:
Handle client connections per board (boardId room).
Broadcast all drawing operations in real time.
Ensure operations are conflict-free and ordered.
Events to Implement:

Client → Server:

board:draw

Payload:

{
  boardId: string;
  userId: string;
  type: 'line' | 'rect' | 'circle' | 'text' | 'image';
  data: object; // shape-specific data (points, dimensions, etc.)
  objectId: string;
}
board:update-object
board:delete-object
board:undo
board:redo

Server → Clients:

board:draw:broadcast
board:update-object:broadcast
board:delete-object:broadcast
board:history:update
Implementation Notes:
Use CRDT via Yjs + y-socket.io (or syjs if already chosen) for conflict resolution.
Maintain a shared Y.Doc per board.
Store:
Shapes as Y.Map
Drawing order as Y.Array
Persist updates periodically or on debounce.
Undo/Redo:
Use Y.UndoManager
Scope per user OR per board (configurable)
Emit updates after undo/redo operations
1.2 presenceEvents.ts

Track and broadcast user presence in real time.

Responsibilities:
Track users joining/leaving a board
Maintain active user list
Broadcast cursor movement and user state
Events:

Client → Server:

presence:join
presence:leave

presence:cursor

{
  boardId: string;
  userId: string;
  x: number;
  y: number;
}

Server → Clients:

presence:update-users
presence:cursor:broadcast
Presence Store:
Use in-memory store (Redis recommended for scaling)

Structure:

{
  boardId: {
    userId: {
      cursor: { x, y },
      status: 'online' | 'idle'
    }
  }
}
2. Complete Board & Object CRUD
Backend Services
Entities:
Board
BoardObject (shape, text, image)
BoardVersion (snapshots)
APIs:

Board:

POST /boards → create board
GET /boards/:id
DELETE /boards/:id

Objects:

POST /boards/:id/objects
PATCH /boards/:id/objects/:objectId
DELETE /boards/:id/objects/:objectId
Object Schema:
{
  id: string;
  boardId: string;
  type: 'shape' | 'text' | 'image';
  data: object;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
Versioning / Snapshots
Strategy:
Store periodic snapshots OR incremental diffs from Yjs
Snapshot Model:
{
  id: string;
  boardId: string;
  state: Buffer; // serialized Y.Doc
  createdAt: Date;
}
Use Cases:
Undo fallback
Time travel
Restore board state
3. Chat & Commenting System
messageController + Socket Integration
Features:
Board-specific chat rooms
Real-time messaging
Persistent message storage
Events:

Client → Server:

chat:send

{
  boardId: string;
  userId: string;
  message: string;
}

Server → Clients:

chat:receive
REST API:
GET /boards/:id/messages
POST /boards/:id/messages
Message Schema:
{
  id: string;
  boardId: string;
  userId: string;
  content: string;
  createdAt: Date;
}
Optional Enhancements:
Threaded comments on objects
Mentions (@user)
Reactions
4. Access Control (RBAC)
Roles:
admin
editor
viewer
Permissions Matrix:
Action	Admin	Editor	Viewer
View board	✅	✅	✅
Edit objects	✅	✅	❌
Delete objects	✅	✅	❌
Manage users	✅	❌	❌
Chat	✅	✅	✅
Middleware

Implement middleware:

checkBoardAccess(roleRequired: Role)

Usage:

router.post('/boards/:id/objects', checkBoardAccess('editor'), handler)
Storage:
BoardMembership table:
{
  userId: string;
  boardId: string;
  role: 'admin' | 'editor' | 'viewer';
}
5. File & Media Support
Uploads
Features:
Image upload (PNG, JPG, SVG)
PDF import (convert to images/pages)
Stickers/icons
API:
POST /upload
GET /files/:id
Storage Options:
Amazon S3
Cloudinary
Processing:
Generate thumbnails
Optimize images
Convert PDFs → images
Board Integration:
Uploaded files become BoardObject of type image
6. Background Jobs (Optional but Recommended)
Queue System:
BullMQ + Redis
Jobs:
1. Export Board
Input: boardId
Output: PNG / PDF

Steps:

Load Yjs state
Render via headless canvas (e.g., node-canvas)
Upload result to storage
2. AI Features (Optional)
Shape recognition
Auto-alignment
Smart suggestions
3. Notifications
User mentions
Board shared events
Architecture Summary
Stack:
Backend: Node.js + TypeScript
Realtime: Socket.IO
CRDT: Yjs
DB: PostgreSQL / MongoDB
Cache/Queue: Redis
Storage: S3 / Cloudinary
Key Design Principles
Event-driven architecture
CRDT-first state management
Separation of concerns (events vs persistence)
Horizontal scalability (Redis adapter for sockets)