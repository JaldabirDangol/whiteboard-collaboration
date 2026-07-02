"use client";

import { Image as KonvaImage } from "react-konva";
import { useImageElement } from "./use-image-element";
import type { ImageShape } from "./board-types";

type Props = {
  shape: ImageShape;
  draggable: boolean;
  selected: boolean;
  onSelect: (shiftKey: boolean) => void;
  onDragEnd: (x: number, y: number) => void;
  getShapeNode: (node: unknown) => void;
};

export default function BoardImageShape({ shape, draggable, selected, onSelect, onDragEnd, getShapeNode }: Props) {
  const image = useImageElement(shape.url);

  return (
    <KonvaImage
      id={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      image={image || undefined}
      stroke={selected ? "#6366f1" : "transparent"}
      strokeWidth={selected ? 2 : 0}
      draggable={draggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e.evt.shiftKey);
      }}
      onTap={() => onSelect(false)}
      onDragEnd={(event) => {
        if (!draggable) return;
        const pos = event.target.position();
        onDragEnd(pos.x, pos.y);
      }}
      shadowEnabled={selected}
      shadowColor="#6366f1"
      shadowBlur={selected ? 8 : 0}
      ref={(node) => getShapeNode(node)}
    />
  );
}
