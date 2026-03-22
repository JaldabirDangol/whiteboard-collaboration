import * as Y from 'yjs';
import { Server, Socket } from 'socket.io';

// Map to store documents for different boards/rooms
const docs = new Map<string, Y.Doc>();

export const setupYjs = (io: Server, socket: Socket) => {
  const roomId = socket.handshake.query.roomId as string;
  if (!roomId) return;

  // Initialize or get the Y.Doc for this specific room
  if (!docs.has(roomId)) {
    docs.set(roomId, new Y.Doc());
  }
  const doc = docs.get(roomId)!;

  // When a client sends an update (delta), apply it to the server doc 
  // and broadcast it to everyone else in the room
  socket.on('yjs-update', (update: Uint8Array) => {
    Y.applyUpdate(doc, update);
    socket.to(roomId).emit('yjs-update', update);
  });

  // Send the current full state to the newly connected user
  const state = Y.encodeStateAsUpdate(doc);
  socket.emit('yjs-update', state);
};

export const getYDoc = (boardId: string): Y.Doc => {
  if (!docs.has(boardId)) {
    docs.set(boardId, new Y.Doc());
  }
  return docs.get(boardId)!;
};