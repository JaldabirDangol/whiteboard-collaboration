import * as Y from 'yjs';

const docs = new Map<string, Y.Doc>();

export const getYDoc = (boardId: string): Y.Doc => {
  if (!docs.has(boardId)) {
    docs.set(boardId, new Y.Doc());
  }
  return docs.get(boardId)!;
};

export const destroyYDoc = (boardId: string): void => {
  const doc = docs.get(boardId);
  if (doc) {
    doc.destroy();
    docs.delete(boardId);
  }
};

export const getActiveBoardIds = (): string[] => Array.from(docs.keys());

export const getActiveBoardCount = (): number => docs.size;