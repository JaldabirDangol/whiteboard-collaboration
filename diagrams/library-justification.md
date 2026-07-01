# Library Justification (for Chapter 2: Background Study)

## Yjs — Conflict-Free Replicated Data Type (CRDT)

Yjs provides the real-time collaboration foundation. Rather than building a custom CRDT from scratch — which is a multi-year research problem comparable to implementing a distributed database consensus protocol — Yjs offers a battle-tested implementation with Y.Map, Y.Array, and Y.UndoManager primitives. The library handles the fundamental complexity of decentralized conflict resolution: when two users concurrently edit the same board, Yjs mathematically ensures all peers converge to the same state without a central server arbitrating conflicts. Building an equivalent CRDT engine would require deep expertise in vector clocks, interleaving avoidance, and garbage collection of tombstones — scope well beyond a semester project. Yjs is the industry standard, used by Excalidraw, Matrix, and Notea.

## Socket.IO — Real-time Bidirectional Communication

Socket.IO is chosen over raw WebSocket for three reasons. First, automatic fallback to HTTP long-polling ensures the application works through restrictive firewalls and proxy servers where WebSocket upgrade requests fail. Second, its room abstraction maps naturally to board-scoped broadcasting — `io.to(boardId).emit(...)` replaces manual subscription management. Third, built-in heartbeat (ping/pong) and reconnection handling eliminates the need to implement connection recovery logic. The application requires multiplexed event channels (cursor positions, shape updates, chat messages, comments) on a single connection; Socket.IO's event-based namespace cleanly separates these concerns without custom message routing.

## Konva + react-konva — Declarative Canvas Rendering

HTML5 Canvas 2D API is imperative — developers manually manage draw cycles, hit detection, and transform matrices. Konva provides a retained-mode scene graph on top of Canvas, enabling React-style declarative rendering where shapes are components that update independently. react-konva bridges Konva with React's virtual DOM, so shape creation, update, and deletion follow React's lifecycle instead of requiring manual `draw()` calls. The alternative — building a custom scene graph with dirty-rect tracking, z-ordering, event dispatch, and transform stacks — would be a significant graphics programming project in itself. Konva's built-in support for drag-and-drop, transformers, and layer compositing would each require hundreds of lines of custom code.

## Prisma — Type-Safe Database Access

Prisma provides generated type definitions from the schema, eliminating an entire class of runtime errors from malformed SQL queries. Its migration system tracks schema versions declaratively — each migration is a timestamped file — making team collaboration on database changes predictable. The `$transaction` API with retry logic handles concurrent shape persistence without manual locking. Raw SQL drivers (pg) would require handwritten migration scripts, manual result mapping, and ad-hoc transaction management — each a source of bugs in a schema with 11 related tables and composite unique constraints.

## Next.js — Full-Stack React Framework

Next.js provides file-based routing, server-side rendering for the landing page, and client-side navigation for the board workspace. Its App Router pattern (`app/boards/[slug]/page.tsx`) maps URL structure directly to component hierarchy. The alternative — configuring Webpack, React Router, code splitting, and asset optimization manually — adds weeks of boilerplate with no direct benefit to the application's core collaborative whiteboard functionality.

## Why Not Build These From Scratch?

The course requirement states: *"students should be able to write their own program modules rather than relying on predefined APIs or Plugins except in some unavoidable circumstances."* The libraries above fall under "unavoidable circumstances" because:

1. **CRDT consensus**: Implementing a correct CRDT is an active research area with known pitfalls (interleaving anomalies, state explosion). Yjs encapsulates ~15 person-years of development.
2. **Real-time transport**: Raw WebSocket lacks reconnection, fallback, and room management. Adding these reliably requires protocol-level expertise.
3. **Canvas scene graph**: Konva's event delegation, transform math, and dirty-rect optimization mirror what a game engine provides — duplicating this for a drawing application is disproportionate effort.
4. **ORM**: Prisma's value is type safety against the schema. Without it, every query is a potential crash point.

The **custom algorithms** (LRU Cache, Quadtree, Sliding-Window Rate Limiter, Shape Diffing with JSON string comparison, AABB Intersection System) are all written from scratch and constitute the original technical contribution of this project.
