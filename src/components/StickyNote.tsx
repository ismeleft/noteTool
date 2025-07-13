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
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isEditing, content]);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return;
    if (isConnecting) return;
    
    // 檢查是否點擊在 textarea 或輸入區域
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const rect = noteRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
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

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // 防止頁面滾動

      const touch = e.touches[0];
      const newPosition = {
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y,
      };

      onUpdate({ position: newPosition });
    },
    [isDragging, dragOffset, onUpdate]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset, handleMouseMove, handleTouchMove]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  // 針對觸控裝置的雙擊處理
  const [lastTap, setLastTap] = useState(0);
  const handleTouchTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setIsEditing(true);
    }
    setLastTap(now);
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

  // 處理中文輸入法組字
  const [isComposing, setIsComposing] = useState(false);
  
  const handleCompositionStart = () => {
    setIsComposing(true);
  };
  
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    setContent(e.currentTarget.value);
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
      } ${isTouchDevice ? 'touch-none' : ''}`}
      style={{
        left: note.position.x,
        top: note.position.y,
        width: note.size.width,
        height: note.size.height,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onTouchEnd={() => {
        // 只有在不是編輯模式時才處理雙擊
        if (!isEditing) {
          handleTouchTap();
        }
      }}
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
          {/* 響應式按鈕大小 */}
          {/* 連線按鈕 */}
          {!isConnecting && (
            <button
              className={`${isTouchDevice ? 'w-6 h-6 text-sm' : 'w-4 h-4 text-xs'} rounded-full border border-gray-400 bg-white hover:bg-gray-100 flex items-center justify-center`}
              onClick={onStartConnect}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title="開始連線"
            >
              🔗
            </button>
          )}
          
          {/* 顏色選擇器 */}
          <div className="relative group">
            <button
              className={`${isTouchDevice ? 'w-6 h-6 text-sm' : 'w-4 h-4 text-xs'} rounded-full border border-gray-400 bg-white hover:bg-gray-100`}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              🎨
            </button>
            <div className={`absolute top-${isTouchDevice ? '7' : '5'} right-0 hidden group-hover:flex ${isTouchDevice ? 'group-focus-within:flex' : ''} bg-white rounded shadow-lg p-1 gap-1 z-20`}>
              {STICKY_NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`${isTouchDevice ? 'w-6 h-6' : 'w-4 h-4'} rounded-full border border-gray-300 hover:scale-110`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ))}
            </div>
          </div>

          {/* 刪除按鈕 */}
          <button
            className={`${isTouchDevice ? 'w-6 h-6 text-sm' : 'w-4 h-4 text-xs'} rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center`}
            onClick={handleDeleteClick}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>

        {/* 內容區域 */}
        <div className={`${isTouchDevice ? 'p-3 pt-8' : 'p-4 pt-6'} h-full`}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                if (!isComposing) {
                  setContent(e.target.value);
                }
              }}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onBlur={handleContentSubmit}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className={`w-full h-full resize-none border-none outline-none bg-transparent text-gray-700 ${isTouchDevice ? 'text-base' : 'text-sm'}`}
              placeholder={isTouchDevice ? "點擊編輯內容..." : "輸入內容... (Ctrl+Enter 儲存, Esc 取消)"}
              style={{ touchAction: 'manipulation' }}
            />
          ) : (
            <div
              className={`w-full h-full cursor-text whitespace-pre-wrap text-gray-700 ${isTouchDevice ? 'text-base' : 'text-sm'}`}
              onDoubleClick={handleDoubleClick}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.stopPropagation();
                // 處理雙擊編輯
                const now = Date.now();
                if (now - lastTap < 300) {
                  setIsEditing(true);
                }
                setLastTap(now);
              }}
            >
              {note.content || (isTouchDevice ? "點擊兩次編輯內容..." : "雙擊編輯內容...")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
