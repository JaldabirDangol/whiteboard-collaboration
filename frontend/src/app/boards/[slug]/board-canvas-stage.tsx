"use client";

import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { Node as KonvaNode } from "konva/lib/Node";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import type { KonvaEventObject } from "konva/lib/Node";
import { Arrow, Circle, Ellipse, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { BoardShape, ImageShape, LaserStroke, RectShape } from "./board-types";
import BoardImageShape from "./board-image-shape";
import DraftShapeRenderer from "./draft-shape-renderer";

type CanvasStageProps = {
  stageSize: { width: number; height: number };
  stageRef: React.RefObject<KonvaStage | null>;
  viewport: { x: number; y: number };
  zoom: number;
  renderedShapes: BoardShape[];
  canEditBoard: boolean;
  selectedShapeIds: Set<string>;
  selectedShapeIdsRef: React.RefObject<Set<string>>;
  shapeRefs: React.RefObject<Map<string, KonvaNode>>;
  transformerRef: React.RefObject<KonvaTransformer | null>;
  handlePointerDown: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handlePointerMove: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handlePointerUp: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleWheel: (e: KonvaEventObject<WheelEvent>) => void;
  handleShapeSelect: (id: string, shiftKey: boolean) => void;
  isShapeSelected: (id: string) => boolean;
  handleTransformEnd: () => void;
  normalizeRect: (shape: RectShape) => RectShape;
  updateShapePosition: (id: string, x: number, y: number) => void;
  updateShapesLocally: (fn: (prev: BoardShape[]) => BoardShape[]) => void;
  marqueeRect: { x: number; y: number; width: number; height: number } | null;
  commentCounts: Record<string, number> | undefined | null;
  setSelectedShapeIds: (ids: Set<string>) => void;
  setRightPanelTab: (tab: "chat" | "comments" | null) => void;
  remoteDraftShapes: Map<string, { id: string; type: string; [key: string]: unknown }>;
  laserStrokes: LaserStroke[];
  remoteLaserStrokes: LaserStroke[];
  remoteCursors: Record<string, { userId: string; x: number; y: number }>;
  cursorLabelByUserId: Record<string, string>;
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  spawnTextarea: (id: string, text?: string, position?: { x: number; y: number; fontSize: number; fontFamily: string; color: string }) => void;
};

export default function BoardCanvasStage({
  stageSize,
  stageRef,
  viewport,
  zoom,
  renderedShapes,
  canEditBoard,
  selectedShapeIds,
  selectedShapeIdsRef,
  shapeRefs,
  transformerRef,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
  handleShapeSelect,
  isShapeSelected,
  handleTransformEnd,
  normalizeRect,
  updateShapePosition,
  updateShapesLocally,
  marqueeRect,
  commentCounts,
  setSelectedShapeIds,
  setRightPanelTab,
  remoteDraftShapes,
  laserStrokes,
  remoteLaserStrokes,
  remoteCursors,
  cursorLabelByUserId,
  editingTextId,
  setEditingTextId,
  spawnTextarea,
}: CanvasStageProps) {
  return (
    <Stage
      ref={stageRef}
      style={{ touchAction: "none" }}
      width={stageSize.width}
      height={stageSize.height}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={stageSize.width}
          height={stageSize.height}
          fill="white"
          listening={false}
        />
        <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
          {renderedShapes.map((shape) => {
            if (shape.type === "line") {
              const isArrow = shape.tool === "arrow";
              const arrowLen = Math.hypot(shape.points[2] - shape.points[0], shape.points[3] - shape.points[1]);
              return isArrow ? (
                <Arrow
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  pointerLength={Math.max(8, Math.min(arrowLen * 0.15, 30))}
                  pointerWidth={Math.max(6, Math.min(arrowLen * 0.1, 24))}
                  fill={shape.color}
                  lineCap="round"
                  lineJoin="round"
                  draggable={canEditBoard}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleShapeSelect(shape.id, e.evt.shiftKey);
                  }}
                  onTap={() => handleShapeSelect(shape.id, false)}
                  onDragEnd={(event) => {
                    if (!canEditBoard) return;
                    const pos = event.target.position();
                    updateShapesLocally((prev) =>
                      prev.map((s) => {
                        if (s.id !== shape.id || s.type !== "line") return s;
                        return { ...s, points: s.points.map((p, i) => p + (i % 2 === 0 ? pos.x : pos.y)) };
                      })
                    );
                    event.target.position({ x: 0, y: 0 });
                  }}
                  shadowEnabled={isShapeSelected(shape.id)}
                  shadowColor="#6366f1"
                  shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                />
              ) : (
                <Line
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={canEditBoard}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleShapeSelect(shape.id, e.evt.shiftKey);
                  }}
                  onTap={() => handleShapeSelect(shape.id, false)}
                  onDragEnd={(event) => {
                    if (!canEditBoard) return;
                    const pos = event.target.position();
                    updateShapesLocally((prev) =>
                      prev.map((s) => {
                        if (s.id !== shape.id || s.type !== "line") return s;
                        return { ...s, points: s.points.map((p, i) => p + (i % 2 === 0 ? pos.x : pos.y)) };
                      })
                    );
                    event.target.position({ x: 0, y: 0 });
                  }}
                  shadowEnabled={isShapeSelected(shape.id)}
                  shadowColor="#6366f1"
                  shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                  globalCompositeOperation={shape.tool === "eraser" ? "destination-out" : "source-over"}
                />
              );
            }

            if (shape.type === "rectangle") {
              const rect = normalizeRect(shape);
              return (
                <Rect
                  key={shape.id}
                  id={shape.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  stroke={rect.color}
                  strokeWidth={rect.strokeWidth}
                  fill={rect.fill || "transparent"}
                  draggable={canEditBoard}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleShapeSelect(shape.id, e.evt.shiftKey);
                  }}
                  onTap={() => handleShapeSelect(shape.id, false)}
                  onDragEnd={(event) => {
                    if (!canEditBoard) return;
                    const pos = event.target.position();
                    updateShapePosition(shape.id, pos.x, pos.y);
                  }}
                  shadowEnabled={isShapeSelected(shape.id)}
                  shadowColor="#6366f1"
                  shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                  ref={(node) => {
                    if (node) shapeRefs.current.set(shape.id, node);
                    else shapeRefs.current.delete(shape.id);
                  }}
                />
              );
            }

            if (shape.type === "image") {
              return (
                <BoardImageShape
                  key={shape.id}
                  shape={shape as unknown as ImageShape}
                  draggable={canEditBoard}
                  selected={isShapeSelected(shape.id)}
                  onSelect={(shiftKey) => handleShapeSelect(shape.id, shiftKey)}
                  onDragEnd={(x, y) => updateShapePosition(shape.id, x, y)}
                  getShapeNode={(node) => {
                    if (node) shapeRefs.current.set(shape.id, node as never);
                    else shapeRefs.current.delete(shape.id);
                  }}
                />
              );
            }

            if (shape.type === "circle") {
              return (
                <Circle
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill || "transparent"}
                  draggable={canEditBoard}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleShapeSelect(shape.id, e.evt.shiftKey);
                  }}
                  onTap={() => handleShapeSelect(shape.id, false)}
                  onDragEnd={(event) => {
                    if (!canEditBoard) return;
                    const pos = event.target.position();
                    updateShapePosition(shape.id, pos.x, pos.y);
                  }}
                  shadowEnabled={isShapeSelected(shape.id)}
                  shadowColor="#6366f1"
                  shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                  ref={(node) => {
                    if (node) shapeRefs.current.set(shape.id, node);
                    else shapeRefs.current.delete(shape.id);
                  }}
                />
              );
            }

            if (shape.type === "ellipse") {
              return (
                <Ellipse
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  radiusX={shape.radiusX}
                  radiusY={shape.radiusY}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill || "transparent"}
                  draggable={canEditBoard}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleShapeSelect(shape.id, e.evt.shiftKey);
                  }}
                  onTap={() => handleShapeSelect(shape.id, false)}
                  onDragEnd={(event) => {
                    if (!canEditBoard) return;
                    const pos = event.target.position();
                    updateShapePosition(shape.id, pos.x, pos.y);
                  }}
                  shadowEnabled={isShapeSelected(shape.id)}
                  shadowColor="#6366f1"
                  shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                  ref={(node) => {
                    if (node) shapeRefs.current.set(shape.id, node);
                    else shapeRefs.current.delete(shape.id);
                  }}
                />
              );
            }

            if (shape.type === "text") {
              return (
                <Text
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  text={shape.text}
                  fontSize={shape.fontSize}
                  fontFamily={shape.fontFamily || "Arial"}
                  fill={shape.color}
                  draggable={canEditBoard && editingTextId !== shape.id}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleShapeSelect(shape.id, e.evt.shiftKey);
                  }}
                  onTap={() => handleShapeSelect(shape.id, false)}
                  onDblClick={() => {
                    setEditingTextId(shape.id);
                    spawnTextarea(shape.id, shape.text);
                  }}
                  onDragEnd={(event) => {
                    if (!canEditBoard) return;
                    const pos = event.target.position();
                    updateShapePosition(shape.id, pos.x, pos.y);
                  }}
                  shadowEnabled={isShapeSelected(shape.id)}
                  shadowColor="#6366f1"
                  shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                  ref={(node) => {
                    if (node) shapeRefs.current.set(shape.id, node);
                    else shapeRefs.current.delete(shape.id);
                  }}
                />
              );
            }

            return null;
          })}
          {canEditBoard && selectedShapeIds.size > 0 && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              keepRatio={false}
              enabledAnchors={[
                "top-left", "top-center", "top-right",
                "middle-left", "middle-right",
                "bottom-left", "bottom-center", "bottom-right",
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 10 || newBox.height < 10) return oldBox;
                return newBox;
              }}
              onTransformEnd={handleTransformEnd}
            />
          )}
          {marqueeRect && (
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.width}
              height={marqueeRect.height}
              stroke="#6366f1"
              strokeWidth={1 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              fill="rgba(99, 102, 241, 0.08)"
              listening={false}
            />
          )}
          {commentCounts ? renderedShapes.map((shape) => {
            const count = commentCounts[shape.id];
            if (!count) return null;
            let bx = 0, by = 0;
            switch (shape.type) {
              case "rectangle": bx = shape.x + shape.width; by = shape.y; break;
              case "circle": bx = shape.x + shape.radius; by = shape.y - shape.radius; break;
              case "ellipse": bx = shape.x + shape.radiusX; by = shape.y - shape.radiusY; break;
              case "line": {
                const pts = shape.points;
                let mx = -Infinity, my = -Infinity;
                for (let i = 0; i < pts.length; i += 2) {
                  if (pts[i] > mx) mx = pts[i];
                  if (pts[i + 1] > my) my = pts[i + 1];
                }
                bx = mx; by = my;
                break;
              }
              case "text": bx = shape.x + 40; by = shape.y - 6; break;
              case "image": bx = shape.x + shape.width; by = shape.y; break;
              default: { const s = shape as { x?: number; y?: number }; bx = s.x ?? 0; by = s.y ?? 0; }
            }
            return (
              <Group
                key={`badge-${shape.id}`}
                x={bx}
                y={by}
                onClick={() => {
                  setSelectedShapeIds(new Set([shape.id]));
                  setRightPanelTab("comments");
                }}
                onTap={() => {
                  setSelectedShapeIds(new Set([shape.id]));
                  setRightPanelTab("comments");
                }}
                style={{ cursor: "pointer" }}
              >
                <Circle radius={9} fill="#6366f1" stroke="#fff" strokeWidth={2} />
                <Text
                  x={-9} y={-7}
                  width={18} height={14}
                  text={String(count)}
                  fontSize={10}
                  fontStyle="bold"
                  fill="#fff"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          }) : null}
        </Group>
      </Layer>

      <Layer listening={false}>
        <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
          {Array.from(remoteDraftShapes.values()).map((draft) => (
            <DraftShapeRenderer key={draft.id} shape={draft as never} />
          ))}
        </Group>
      </Layer>

      <Layer listening={false}>
        <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
          {[...laserStrokes, ...remoteLaserStrokes].map((stroke) => (
            <Line
              key={stroke.id}
              points={stroke.points}
              stroke={stroke.color}
              strokeWidth={stroke.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              opacity={0.85}
            />
          ))}
        </Group>
      </Layer>

      <Layer listening={false}>
        <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
          {Object.values(remoteCursors).map((cursor) => (
            <Group key={cursor.userId}>
              <Circle x={cursor.x} y={cursor.y} radius={5} fill="#4f46e5" />
              <Text
                x={cursor.x + 10}
                y={cursor.y - 12}
                text={cursorLabelByUserId[cursor.userId] ?? "Unknown user"}
                fontSize={11}
                fill="#312e81"
              />
            </Group>
          ))}
        </Group>
      </Layer>
    </Stage>
  );
}
