type Tool = "pen" | "rectangle" | "circle" | "ellipse" | "line" | "arrow" | "text" | "eraser" | "laser" | "select";

type ActivityEvent = {
  selected?: number;
  moving?: boolean;
  resizing?: boolean;
  rotating?: boolean;
  text?: string;
};

export function describeActivity(tool: Tool, event: ActivityEvent = {}): string {
  if (tool === "pen") return "Sketching a freehand diagram";
  if (tool === "rectangle") return "Drawing a rectangle";
  if (tool === "circle") return "Drawing a circle";
  if (tool === "ellipse") return "Drawing an ellipse";
  if (tool === "line") return "Drawing a straight line";
  if (tool === "arrow") return "Drawing an arrow";
  if (tool === "eraser") return "Erasing shapes";
  if (tool === "laser") return "Pointing with the laser";
  if (tool === "text") {
    if (event.text) return `Typing '${event.text}'`;
    return "Adding text";
  }
  if (tool === "select") {
    if (event.moving) {
      const count = event.selected ?? 0;
      return count > 1 ? "Moving selected objects" : "Moving a shape";
    }
    if (event.resizing) return "Resizing a shape";
    if (event.rotating) {
      const count = event.selected ?? 0;
      return count > 1 ? "Rotating selected objects" : "Rotating a shape";
    }
    if (event.selected && event.selected > 0) {
      return `Selected ${event.selected} shape${event.selected > 1 ? "s" : ""}`;
    }
    return "Selecting shapes";
  }
  return "Editing the canvas";
}

export function describeActivityFromAction(action: string, metadata?: Record<string, unknown>): string {
  const metaType = metadata?.type as string | undefined;
  const created = metadata?.created as number | undefined;
  const updated = metadata?.updated as number | undefined;
  const deleted = metadata?.deleted as number | undefined;
  const createdTypes = metadata?.createdTypes as string[] | undefined;
  const updatedTypes = metadata?.updatedTypes as string[] | undefined;
  const deletedTypes = metadata?.deletedTypes as string[] | undefined;

  const allSameType = (types: string[] | undefined, count: number | undefined) =>
    types && types.length === count && count > 0 && types.every(t => t === types[0]);

  const shapeTypeLabel = (type: string): string => {
    const t = type.toLowerCase();
    if (t === "rectangle") return "rectangle";
    if (t === "circle") return "circle";
    if (t === "ellipse") return "ellipse";
    if (t === "line") return "line";
    if (t === "arrow") return "arrow";
    if (t === "image") return "image";
    if (t === "text") return "text";
    if (t === "draw" || t === "pen") return "drawing";
    return "shape";
  };

  if (action === "object.created") {
    const total = created ?? 0;
    if (total > 1) {
      if (allSameType(createdTypes, total)) {
        return `Drew ${total} ${shapeTypeLabel(createdTypes![0])}${total > 1 ? "s" : ""}`;
      }
      return `Added ${total} shapes`;
    }
    if (metaType) return `Drew a ${shapeTypeLabel(metaType)}`;
    return "Added a shape";
  }

  if (action === "object.updated") {
    const total = updated ?? 0;
    if (total > 1) {
      if (allSameType(updatedTypes, total)) {
        return `Updated ${total} ${shapeTypeLabel(updatedTypes![0])}${total > 1 ? "s" : ""}`;
      }
      return `Updated ${total} shapes`;
    }
    if (metaType) return `Updated a ${shapeTypeLabel(metaType)}`;
    return "Updated a shape";
  }

  if (action === "object.deleted") {
    const total = deleted ?? 0;
    if (total > 1) {
      if (allSameType(deletedTypes, total)) {
        return `Removed ${total} ${shapeTypeLabel(deletedTypes![0])}${total > 1 ? "s" : ""}`;
      }
      return `Removed ${total} shapes`;
    }
    return "Removed a shape";
  }

  if (action === "board.created") return "Created the board";
  if (action === "board.joined") return "Joined the board";
  if (action === "board.shared") return "Shared the board";
  if (action === "board.deleted") return "Deleted the board";
  if (action === "board:undo") return "Undid last action";
  if (action === "board:redo") return "Redid last action";
  if (action === "snapshot:restore") return "Restored a snapshot";
  if (action === "comment.created") return metaType ? `Commented on a ${shapeTypeLabel(metaType)}` : "Commented on a shape";
  if (action === "comment.deleted") return metaType ? `Deleted a comment on a ${shapeTypeLabel(metaType)}` : "Deleted a comment on a shape";

  return action;
}
