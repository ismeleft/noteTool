"use client";

import React, { useRef } from "react";
import { StickyNote } from "./StickyNote";
import { ConnectionLayer } from "./ConnectionLayer";
import { useCanvasState } from "@/hooks/useCanvasState";

export const Canvas: React.FC = () => {
  const { state, actions } = useCanvasState();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  // 將鼠標座標轉換為畫布座標
  const screenToCanvas = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const x = (screenX - rect.left - state.panOffset.x) / state.zoom;
    const y = (screenY - rect.top - state.panOffset.y) / state.zoom;
    return { x, y };
  };

  // 滾輪縮放
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, state.zoom * delta));

      // 以鼠標位置為中心縮放
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 計算縮放後的偏移調整
        const zoomRatio = newZoom / state.zoom;
        const newOffsetX = mouseX - (mouseX - state.panOffset.x) * zoomRatio;
        const newOffsetY = mouseY - (mouseY - state.panOffset.y) * zoomRatio;

        actions.setZoom(newZoom);
        actions.setPanOffset({ x: newOffsetX, y: newOffsetY });
      }
    }
  };

  const handleExport = () => {
    const data = actions.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sticky-notes-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (actions.importData(content)) {
            alert("資料匯入成功！");
          } else {
            alert("資料格式錯誤，匯入失敗！");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClearAll = () => {
    if (confirm("確定要清除所有便條紙和連線嗎？此操作無法復原。")) {
      actions.clearAllData();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | SVGElement;

    const getClassName = (element: HTMLElement | SVGElement): string => {
      if ("className" in element) {
        if (typeof element.className === "string") {
          return element.className;
        } else if (element.className && "baseVal" in element.className) {
          return (element.className as { baseVal: string }).baseVal;
        }
      }
      return "";
    };

    const className = getClassName(target);
    const isCanvasOrBackground =
      target === e.currentTarget || className.includes("pointer-events-none");

    if (isCanvasOrBackground) {
      actions.selectNote(null);
      // 如果正在連線模式，取消連線
      if (state.isConnecting) {
        actions.cancelConnecting();
      }
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // 檢查是否直接點擊畫布或背景格線
    const target = e.target as HTMLElement | SVGElement;

    const getClassName = (element: HTMLElement | SVGElement): string => {
      if ("className" in element) {
        if (typeof element.className === "string") {
          return element.className;
        } else if (element.className && "baseVal" in element.className) {
          return (element.className as { baseVal: string }).baseVal;
        }
      }
      return "";
    };

    const className = getClassName(target);
    const isCanvasOrBackground =
      target === e.currentTarget || className.includes("pointer-events-none");

    if (isCanvasOrBackground) {
      const canvasPosition = screenToCanvas(e.clientX, e.clientY);
      const position = {
        x: canvasPosition.x - 100, // 置中便條紙
        y: canvasPosition.y - 75,
      };
      actions.addNote(position);
    }
  };

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 桌面版工具列 */}
      <div className="hidden lg:flex absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 z-20 flex-wrap gap-2 border border-white/20">
        <button
          onClick={() => actions.addNote({ x: 100, y: 100 })}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          新增便條紙
        </button>
        <button
          onClick={() =>
            state.isConnecting ? actions.cancelConnecting() : null
          }
          className={`px-4 py-2 rounded ${
            state.isConnecting
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!state.isConnecting}
        >
          {state.isConnecting ? "取消連線" : "連線模式"}
        </button>

        {/* 資料管理按鈕 */}
        <div className="border-l border-gray-300 pl-2 flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            title="匯出資料"
          >
            📥 匯出
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
            title="匯入資料"
          >
            📤 匯入
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            title="清除所有資料"
          >
            🗑️ 清除
          </button>
        </div>

        {/* 縮放控制 */}
        <div className="border-l border-gray-300 pl-2 flex gap-1">
          <button
            onClick={actions.zoomOut}
            className="px-2 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            title="縮小 (Ctrl+滾輪)"
          >
            🔍－
          </button>
          <div className="px-2 py-2 bg-gray-100 rounded text-sm min-w-[3rem] text-center">
            {Math.round(state.zoom * 100)}%
          </div>
          <button
            onClick={actions.zoomIn}
            className="px-2 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            title="放大 (Ctrl+滾輪)"
          >
            🔍＋
          </button>
          <button
            onClick={() => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) {
                actions.fitToView(rect.width, rect.height);
              }
            }}
            className="px-2 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
            title="適應視圖"
          >
            📐
          </button>
          <button
            onClick={actions.resetZoom}
            className="px-2 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            title="重置縮放"
          >
            🏠
          </button>
        </div>
      </div>

      {/* 行動版選單按鈕 */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-30 border border-white/20"
      >
        <div className="w-5 h-5 flex flex-col justify-center space-y-1">
          <div className={`h-0.5 bg-gray-600 rounded transition-transform ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
          <div className={`h-0.5 bg-gray-600 rounded transition-opacity ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
          <div className={`h-0.5 bg-gray-600 rounded transition-transform ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
        </div>
      </button>

      {/* 行動版選單 */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-20 border border-white/20">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => {
                actions.addNote({ x: 100, y: 100 });
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              ➕ 新增
            </button>
            <button
              onClick={() => {
                if (state.isConnecting) actions.cancelConnecting();
                setIsMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded text-sm ${
                state.isConnecting
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-300 text-gray-500"
              }`}
              disabled={!state.isConnecting}
            >
              {state.isConnecting ? "❌ 取消連線" : "🔗 連線模式"}
            </button>
          </div>

          {/* 縮放控制 - 行動版 */}
          <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded">
            <button
              onClick={actions.zoomOut}
              className="px-3 py-2 bg-gray-500 text-white rounded text-sm"
            >
              🔍－
            </button>
            <span className="text-sm font-medium">
              {Math.round(state.zoom * 100)}%
            </span>
            <button
              onClick={actions.zoomIn}
              className="px-3 py-2 bg-gray-500 text-white rounded text-sm"
            >
              🔍＋
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) actions.fitToView(rect.width, rect.height);
                setIsMobileMenuOpen(false);
              }}
              className="px-2 py-2 bg-purple-500 text-white rounded text-sm"
            >
              📐 適應視圖
            </button>
            <button
              onClick={() => {
                actions.resetZoom();
                setIsMobileMenuOpen(false);
              }}
              className="px-2 py-2 bg-blue-500 text-white rounded text-sm"
            >
              🏠 重置
            </button>
          </div>

          {/* 資料管理 - 行動版 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                handleExport();
                setIsMobileMenuOpen(false);
              }}
              className="px-2 py-2 bg-green-500 text-white rounded text-sm"
            >
              📥 匯出
            </button>
            <button
              onClick={() => {
                handleImport();
                setIsMobileMenuOpen(false);
              }}
              className="px-2 py-2 bg-orange-500 text-white rounded text-sm"
            >
              📤 匯入
            </button>
            <button
              onClick={() => {
                handleClearAll();
                setIsMobileMenuOpen(false);
              }}
              className="px-2 py-2 bg-red-500 text-white rounded text-sm"
            >
              🗑️ 清除
            </button>
          </div>

          {/* 統計資訊 - 行動版 */}
          <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 text-center">
            便條紙: {state.notes.length} | 連線: {state.connections.length}
          </div>
        </div>
      )}

      {/* 行動版說明按鈕 */}
      <button
        onClick={() => setIsHelpOpen(!isHelpOpen)}
        className="lg:hidden absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-30 border border-white/20"
      >
        ❓
      </button>

      {/* 桌面版使用說明 */}
      <div className="hidden lg:block absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-20 text-sm max-w-xs border border-white/20">
        <h3 className="font-bold mb-2">使用說明：</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 雙擊畫布新增便條紙</li>
          <li>• 拖拽便條紙移動位置</li>
          <li>• 雙擊便條紙編輯內容</li>
          <li>• 點擊🎨更換顏色</li>
          <li>• 點擊🔗開始連線模式</li>
          <li>• 懸停連線可刪除</li>
          <li>• Ctrl+滾輪縮放視圖</li>
          <li>• 📐適應視圖 🏠重置縮放</li>
          <li>• 📥匯出 📤匯入 🗑️清除</li>
        </ul>

        {/* 資料統計 */}
        <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
          便條紙: {state.notes.length} | 連線: {state.connections.length}
        </div>
      </div>

      {/* 行動版使用說明 */}
      {isHelpOpen && (
        <div className="lg:hidden absolute top-16 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-20 border border-white/20">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">使用說明</h3>
            <button
              onClick={() => setIsHelpOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 雙擊畫布新增便條紙</li>
            <li>• 拖拽便條紙移動位置</li>
            <li>• 雙擊便條紙編輯內容</li>
            <li>• 點擊🎨更換顏色</li>
            <li>• 點擊🔗開始連線模式</li>
            <li>• 雙指縮放或使用縮放按鈕</li>
            <li>• 使用漢堡選單存取所有功能</li>
          </ul>
        </div>
      )}

      {/* 畫布 */}
      <div
        ref={canvasRef}
        className="w-full h-screen overflow-hidden cursor-crosshair"
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onWheel={handleWheel}
      >
        {/* 可縮放的內容容器 */}
        <div
          style={{
            transform: `translate(${state.panOffset.x}px, ${state.panOffset.y}px) scale(${state.zoom})`,
            transformOrigin: "0 0",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {/* 背景格線 */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${20 / state.zoom}px ${20 / state.zoom}px`,
              width: `${100 / state.zoom}vw`,
              height: `${100 / state.zoom}vh`,
            }}
          />

          {/* 連線層 */}
          <ConnectionLayer
            connections={state.connections}
            notes={state.notes}
            onDeleteConnection={actions.deleteConnection}
          />

          {/* 便條紙 */}
          {state.notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              isSelected={state.selectedNoteId === note.id}
              isConnecting={state.isConnecting}
              isConnectingFrom={state.connectingFromId === note.id}
              onUpdate={(updates) => actions.updateNote(note.id, updates)}
              onSelect={() => {
                if (!state.isConnecting) {
                  actions.selectNote(note.id);
                }
              }}
              onDelete={() => actions.deleteNote(note.id)}
              onStartConnect={() => actions.startConnecting(note.id)}
              onTryConnect={() => actions.tryConnect(note.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
