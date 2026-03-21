import { doc, yShapes } from './doc'
import { LOCAL_ORIGIN } from './undo'

export function addShape(shape) {
  doc.transact(() => {
    yShapes.push([shape])
  }, LOCAL_ORIGIN)
}

export function updateShape(index:number, newShape) {
  doc.transact(() => {
    yShapes.delete(index)
    yShapes.insert(index, [newShape])
  }, LOCAL_ORIGIN)
}

export function deleteShape(index:number) {
  doc.transact(() => {
    yShapes.delete(index)
  }, LOCAL_ORIGIN)
}