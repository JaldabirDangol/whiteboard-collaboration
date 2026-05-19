import * as Y from 'yjs';

const docs = new Map<string, Y.Doc>();

export const getYDoc = (boardId: string): Y.Doc => {
  if (!docs.has(boardId)) {
    docs.set(boardId, new Y.Doc());
  }
  return docs.get(boardId)!;
};