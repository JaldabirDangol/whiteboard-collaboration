// frontend/src/yjs/sync.ts

import * as Y from 'yjs'
import { doc } from './doc'
import { io } from 'socket.io-client'

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!)

const boardId = 'your-board-id' // pass dynamically in real app

// ---------------------------
// 1. SEND updates to server
// ---------------------------
doc.on('update', (update: Uint8Array, origin: any) => {
  if (origin !== 'remote') {
    socket.emit('yjs:update', {
      boardId,
      update
    })
  }
})

// ---------------------------
// 2. RECEIVE updates from server
// ---------------------------
socket.on('yjs:update', (update: Uint8Array) => {
  Y.applyUpdate(doc, update, 'remote')
})

// ---------------------------
// 3. INITIAL STATE
// ---------------------------
socket.on('board:init', ({ yjsState }) => {
  Y.applyUpdate(doc, yjsState, 'remote')
})