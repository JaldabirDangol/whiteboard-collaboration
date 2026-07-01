import * as Y from 'yjs';
import { LRUCache } from '@/utils/lru-cache.js';

const MAX_ACTIVE_BOARDS = 50;

const docs = new LRUCache<string, Y.Doc>(MAX_ACTIVE_BOARDS, (boardId, doc) => {
  doc.destroy();
});

export const getYDoc = (boardId: string): Y.Doc => {
  let doc = docs.get(boardId);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(boardId, doc);
  }
  return doc;
};

export const destroyYDoc = (boardId: string): void => {
  const doc = docs.get(boardId);
  if (doc) {
    doc.destroy();
    docs.delete(boardId);
  }
};

export const getActiveBoardIds = (): string[] => docs.keys();

export const getActiveBoardCount = (): number => docs.size;