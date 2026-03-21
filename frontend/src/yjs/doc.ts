import * as Y from 'yjs'
import { io } from 'socket.io-client'

export const socket = io('http://localhost:5000')

export const doc = new Y.Doc()
export const yShapes = doc.getArray('shapes')

const boardId = 'board-1'

// Join board
socket.emit('board:join', boardId)