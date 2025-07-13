"use client";

import React from "react";
import { Connection, StickyNote } from "@/types";

interface ConnectionLineProps {
  connection: Connection;
  sourceNote: StickyNote;
  targetNote: StickyNote;
  onDelete: () => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  sourceNote,
  targetNote,
  onDelete,
}) => {
  // 計算便條紙的中心點
  const sourceCenter = {
    x: sourceNote.position.x + sourceNote.size.width / 2,
    y: sourceNote.position.y + sourceNote.size.height / 2,
  };

  const targetCenter = {
    x: targetNote.position.x + targetNote.size.width / 2,
    y: targetNote.position.y + targetNote.size.height / 2,
  };

  // 計算連接到邊緣的點
  const getEdgePoint = (
    fromCenter: { x: number; y: number },
    toCenter: { x: number; y: number },
    noteSize: { width: number; height: number },
    notePos: { x: number; y: number }
  ) => {
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    // 計算角度
    const angle = Math.atan2(dy, dx);

    // 便條紙的半寬和半高
    const halfWidth = noteSize.width / 2;
    const halfHeight = noteSize.height / 2;

    // 根據角度確定連接點
    const absAngle = Math.abs(angle);
    const centerX = notePos.x + halfWidth;
    const centerY = notePos.y + halfHeight;

    if (absAngle < Math.PI / 4) {
      // 右邊
      return { x: notePos.x + noteSize.width, y: centerY };
    } else if (absAngle > (3 * Math.PI) / 4) {
      // 左邊
      return { x: notePos.x, y: centerY };
    } else if (angle > 0) {
      // 下邊
      return { x: centerX, y: notePos.y + noteSize.height };
    } else {
      // 上邊
      return { x: centerX, y: notePos.y };
    }
  };

  const sourceEdge = getEdgePoint(
    sourceCenter,
    targetCenter,
    sourceNote.size,
    sourceNote.position
  );
  const targetEdge = getEdgePoint(
    targetCenter,
    sourceCenter,
    targetNote.size,
    targetNote.position
  );

  // 創建連接邊緣的路徑
  const createPath = () => {
    return `M ${sourceEdge.x} ${sourceEdge.y} L ${targetEdge.x} ${targetEdge.y}`;
  };

  // 計算線條中點用於放置刪除按鈕
  const midPoint = {
    x: (sourceEdge.x + targetEdge.x) / 2,
    y: (sourceEdge.y + targetEdge.y) / 2,
  };

  return (
    <g>
      {/* 箭頭定義 */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
        </marker>
      </defs>

      {/* 主要連線路徑 */}
      <path
        d={createPath()}
        style={{
          stroke: "#6B7280",
          strokeWidth: "1",
          fill: "none",
          cursor: "pointer",
        }}
        markerEnd={`url(#arrowhead-${connection.id})`}
        onMouseEnter={(e) => {
          e.currentTarget.style.stroke = "#3B82F6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.stroke = "#6B7280";
        }}
      />

      {/* 刪除按鈕（懸停時顯示） */}
      <g className="opacity-0 hover:opacity-100 transition-opacity">
        <circle
          cx={midPoint.x}
          cy={midPoint.y}
          r="8"
          fill="white"
          stroke="#EF4444"
          strokeWidth="2"
          className="cursor-pointer"
          onClick={onDelete}
        />
        <text
          x={midPoint.x}
          y={midPoint.y + 1}
          textAnchor="middle"
          className="text-xs fill-red-500 cursor-pointer select-none"
          onClick={onDelete}
        >
          ×
        </text>
      </g>
    </g>
  );
};
