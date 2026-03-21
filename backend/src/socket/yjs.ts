// backend/src/socket/yjs.ts
import * as Y from 'yjs'

const docs = new Map<string, Y.Doc>()

export function getYDoc(boardId: string) {
  if (!docs.has(boardId)) {
    const doc = new Y.Doc()
    docs.set(boardId, doc)
  }
  return docs.get(boardId)!
}