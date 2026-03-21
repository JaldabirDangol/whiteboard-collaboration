// frontend/src/yjs/undo.ts
import * as Y from 'yjs'
import { doc, yShapes } from './doc'

export const LOCAL_ORIGIN = 'local-user'

export const undoManager = new Y.UndoManager(yShapes, {
  trackedOrigins: new Set([LOCAL_ORIGIN])
})