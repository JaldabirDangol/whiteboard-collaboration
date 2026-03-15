1. Real-Time Board Collaboration

Implement boardEvent.ts fully:

Broadcast drawing updates (lines, shapes, text) to all connected clients on a board.

Handle undo/redo via sockets if you want live state consistency.

Integrate presenceEvents.ts fully:

Track users joining/leaving boards.

Broadcast live cursor positions and online/offline status.

2. Complete Board & Object CRUD

Backend services for:

Creating/updating/deleting shapes, text boxes, images on a board.

Storing board snapshots for undo/redo or version history.

3. Chat & Commenting

Integrate messageController + socket events:

Ensure messages are stored and broadcast in real time.

Support board-specific chat rooms.

4. Access Control

Complete role-based logic:

Editor/viewer/admin per board.

Middleware to check permissions on each board operation.

5. File & Media Support

Image uploads, PDF imports, stickers/icons.

Endpoints for attachments and optional background tasks (e.g., exporting boards).

6. Background Jobs (Optional)

Task queues (BullMQ + Redis) for:

Exporting boards as images/PDF.

AI-assisted shape recognition or notifications.


