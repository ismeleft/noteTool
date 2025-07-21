"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
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
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // 確保 textarea 有正確的值
      textareaRef.current.value = content;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isEditing, content]);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window);
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
    if (isResizing) return; // 調整大小時不允許拖拽

    const rect = noteRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // 調整大小處理
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing || isConnecting) return;

    setIsResizing(true);
    setResizeStartSize({ width: note.size.width, height: note.size.height });
    setResizeStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (isEditing || isConnecting) return;

    const touch = e.touches[0];
    setIsResizing(true);
    setResizeStartSize({ width: note.size.width, height: note.size.height });
    setResizeStartPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return;
    if (isConnecting) return;

    // 檢查是否點擊在 textarea 或輸入區域
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.contentEditable === "true") {
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
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };
        onUpdate({ position: newPosition });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStartPos.x;
        const deltaY = e.clientY - resizeStartPos.y;
        
        const newWidth = Math.max(100, resizeStartSize.width + deltaX); // 最小寬度 100px
        const newHeight = Math.max(80, resizeStartSize.height + deltaY); // 最小高度 80px
        
        onUpdate({ size: { width: newWidth, height: newHeight } });
      }
    },
    [isDragging, isResizing, dragOffset, resizeStartPos, resizeStartSize, onUpdate]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault(); // 防止頁面滾動
        const touch = e.touches[0];
        const newPosition = {
          x: touch.clientX - dragOffset.x,
          y: touch.clientY - dragOffset.y,
        };
        onUpdate({ position: newPosition });
      } else if (isResizing) {
        e.preventDefault(); // 防止頁面滾動
        const touch = e.touches[0];
        const deltaX = touch.clientX - resizeStartPos.x;
        const deltaY = touch.clientY - resizeStartPos.y;
        
        const newWidth = Math.max(100, resizeStartSize.width + deltaX); // 最小寬度 100px
        const newHeight = Math.max(80, resizeStartSize.height + deltaY); // 最小高度 80px
        
        onUpdate({ size: { width: newWidth, height: newHeight } });
      }
    },
    [isDragging, isResizing, dragOffset, resizeStartPos, resizeStartSize, onUpdate]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, isResizing, dragOffset, handleMouseMove, handleTouchMove]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  // 針對觸控裝置的雙擊處理
  const [lastTap, setLastTap] = useState(0);

  const handleContentSubmit = () => {
    const currentContent = textareaRef.current?.value || '';
    setContent(currentContent);
    onUpdate({ content: currentContent });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleContentSubmit();
    } else if (e.key === "Escape") {
      // 恢復原始內容
      if (textareaRef.current) {
        textareaRef.current.value = note.content;
      }
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
      } ${isConnectingFrom ? "ring-2 ring-green-500" : ""} ${
        isConnecting && !isConnectingFrom
          ? "ring-2 ring-yellow-400 cursor-crosshair"
          : ""
      } ${!isConnecting && (isDragging ? "cursor-grabbing" : isResizing ? "cursor-nw-resize" : "cursor-grab")} ${
        isTouchDevice ? "touch-none" : ""
      }`}
      style={{
        left: note.position.x,
        top: note.position.y,
        width: note.size.width,
        height: note.size.height,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full h-full rounded-lg shadow-xl border border-white/50 relative backdrop-blur-sm"
        style={{
          backgroundColor: note.color,
          boxShadow:
            "0 10px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5)",
        }}
      >
        {/* 控制按鈕 */}
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          {/* 響應式按鈕大小 */}
          {/* Markdown 切換按鈕 */}
          {!isEditing && (
            <button
              className={`${
                isTouchDevice ? "w-6 h-6 text-sm" : "w-4 h-4 text-xs"
              } rounded-full border border-gray-400 ${
                showMarkdown ? "bg-blue-100 text-blue-600" : "bg-white"
              } hover:bg-gray-100 flex items-center justify-center`}
              onClick={() => setShowMarkdown(!showMarkdown)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title={showMarkdown ? "顯示原始文字" : "顯示 Markdown"}
            >
              {showMarkdown ? (isTouchDevice ? "📝" : "📝") : (isTouchDevice ? "📄" : "📄")}
            </button>
          )}

          {/* 連線按鈕 */}
          {!isConnecting && (
            <button
              className={`${
                isTouchDevice ? "w-6 h-6 text-sm" : "w-4 h-4 text-xs"
              } rounded-full border border-gray-400 bg-white hover:bg-gray-100 flex items-center justify-center`}
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
              className={`${
                isTouchDevice ? "w-6 h-6 text-sm" : "w-4 h-4 text-xs"
              } rounded-full border border-gray-400 bg-white hover:bg-gray-100`}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              🎨
            </button>
            <div
              className={`absolute top-${
                isTouchDevice ? "7" : "5"
              } right-0 hidden group-hover:flex ${
                isTouchDevice ? "group-focus-within:flex" : ""
              } bg-white rounded shadow-lg p-1 gap-1 z-20`}
            >
              {STICKY_NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`${
                    isTouchDevice ? "w-6 h-6" : "w-4 h-4"
                  } rounded-full border border-gray-300 hover:scale-110`}
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
            className={`${
              isTouchDevice ? "w-6 h-6 text-sm" : "w-4 h-4 text-xs"
            } rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center`}
            onClick={handleDeleteClick}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>

        {/* 調整大小控制項 */}
        {isSelected && !isEditing && !isConnecting && (
          <div
            className={`absolute bottom-0 right-0 ${
              isTouchDevice ? "w-5 h-5" : "w-3 h-3"
            } cursor-nw-resize opacity-60 hover:opacity-100 z-10`}
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeTouchStart}
            style={{
              background: 'linear-gradient(-45deg, transparent 30%, #666 30%, #666 50%, transparent 50%)',
              borderBottomRightRadius: '6px',
            }}
            title="拖拽調整大小"
          />
        )}

        {/* 內容區域 */}
        <div className={`${isTouchDevice ? "p-3 pt-8" : "p-4 pt-6"} h-full`}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              defaultValue={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleContentSubmit}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              className={`w-full h-full resize-none border-none outline-none bg-transparent text-gray-800 ${
                isTouchDevice ? "text-base" : "text-sm"
              }`}
              placeholder={
                isTouchDevice
                  ? "支援 Markdown 語法：\n# 標題\n**粗體** *斜體*\n- 列表項目\n[連結](url)\n```程式碼```"
                  : "支援 Markdown 語法：# 標題 **粗體** *斜體* - 列表 [連結](url) ```程式碼```\n(Ctrl+Enter 儲存, Esc 取消)"
              }
              style={{
                touchAction: "manipulation",
                fontSize: isTouchDevice ? "16px" : undefined,
              }}
            />
          ) : (
            <div
              className={`w-full h-full cursor-text overflow-auto sticky-note-content ${
                isTouchDevice ? "text-base" : "text-sm"
              }`}
              onDoubleClick={handleDoubleClick}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.stopPropagation();
                // 處理雙擊編輯
                const now = Date.now();
                if (now - lastTap < 300) {
                  e.preventDefault(); // 防止觸發其他事件
                  setIsEditing(true);
                }
                setLastTap(now);
              }}
            >
              {note.content ? (
                showMarkdown ? (
                  <div className="markdown-content text-gray-800 h-full">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {note.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-gray-800 h-full overflow-auto sticky-note-content">
                    {note.content}
                  </div>
                )
              ) : (
                <div className="text-gray-500 italic text-center h-full flex flex-col items-center justify-center">
                  <div className="mb-1">
                    {isTouchDevice ? "點擊兩次編輯內容" : "雙擊編輯內容"}
                  </div>
                  <div className="text-xs opacity-75">
                    支援 Markdown 語法 📝
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
