"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { StickyNote as StickyNoteType, STICKY_NOTE_COLORS } from "@/types";

interface StickyNoteProps {
  note: StickyNoteType;
  isSelected: boolean;
  isConnecting: boolean;
  isConnectingFrom: boolean;
  onUpdate: (updates: Partial<StickyNoteType>) => void;
  onSelect: () => void;
  onDelete: () => void;
  onStartConnect: () => void;
  onTryConnect: () => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isSelected,
  isConnecting,
  isConnectingFrom,
  onUpdate,
  onSelect,
  onDelete,
  onStartConnect,
  onTryConnect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isEditing, content]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 如果正在連線模式且不是源便條紙，嘗試連接
    if (isConnecting && !isConnectingFrom) {
      onTryConnect();
      return;
    }
    
    // 如果不在連線模式，正常選擇
    if (!isConnecting) {
      onSelect();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    if (isConnecting) return; // 連線模式下不允許拖拽

    const rect = noteRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      };

      onUpdate({ position: newPosition });
    },
    [isDragging, dragOffset, onUpdate]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, handleMouseMove]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleContentSubmit = () => {
    onUpdate({ content });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleContentSubmit();
    } else if (e.key === "Escape") {
      setContent(note.content);
      setIsEditing(false);
    }
  };

  const handleColorChange = (color: string) => {
    onUpdate({ color });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      ref={noteRef}
      className={`absolute select-none ${
        isSelected ? "ring-2 ring-blue-500" : ""
      } ${
        isConnectingFrom ? "ring-2 ring-green-500" : ""
      } ${
        isConnecting && !isConnectingFrom ? "ring-2 ring-yellow-400 cursor-crosshair" : ""
      } ${
        !isConnecting && (isDragging ? "cursor-grabbing" : "cursor-grab")
      }`}
      style={{
        left: note.position.x,
        top: note.position.y,
        width: note.size.width,
        height: note.size.height,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="w-full h-full rounded-lg shadow-xl border border-white/50 relative backdrop-blur-sm"
        style={{ 
          backgroundColor: note.color,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5)'
        }}
      >
        {/* 控制按鈕 */}
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          {/* 連線按鈕 */}
          {!isConnecting && (
            <button
              className="w-4 h-4 rounded-full border border-gray-400 bg-white hover:bg-gray-100 text-xs flex items-center justify-center"
              onClick={onStartConnect}
              onMouseDown={(e) => e.stopPropagation()}
              title="開始連線"
            >
              🔗
            </button>
          )}
          
          {/* 顏色選擇器 */}
          <div className="relative group">
            <button
              className="w-4 h-4 rounded-full border border-gray-400 bg-white hover:bg-gray-100 text-xs"
              onMouseDown={(e) => e.stopPropagation()}
            >
              🎨
            </button>
            <div className="absolute top-5 right-0 hidden group-hover:flex bg-white rounded shadow-lg p-1 gap-1 z-20">
              {STICKY_NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-4 h-4 rounded-full border border-gray-300 hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ))}
            </div>
          </div>

          {/* 刪除按鈕 */}
          <button
            className="w-4 h-4 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 flex items-center justify-center"
            onClick={handleDeleteClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-4 pt-6 h-full">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleContentSubmit}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-700"
              placeholder="輸入內容... (Ctrl+Enter 儲存, Esc 取消)"
            />
          ) : (
            <div
              className="w-full h-full cursor-text whitespace-pre-wrap text-gray-700"
              onDoubleClick={handleDoubleClick}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {note.content || "雙擊編輯內容..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
