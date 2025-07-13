'use client';

import React from 'react';
import { StickyNote } from './StickyNote';
import { ConnectionLayer } from './ConnectionLayer';
import { useCanvasState } from '@/hooks/useCanvasState';

export const Canvas: React.FC = () => {
  const { state, actions } = useCanvasState();

  const handleExport = () => {
    const data = actions.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sticky-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (actions.importData(content)) {
            alert('資料匯入成功！');
          } else {
            alert('資料格式錯誤，匯入失敗！');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClearAll = () => {
    if (confirm('確定要清除所有便條紙和連線嗎？此操作無法復原。')) {
      actions.clearAllData();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isCanvasOrBackground = 
      target === e.currentTarget || 
      (target.className && 
       typeof target.className === 'string' && 
       target.className.includes('pointer-events-none')) ||
      (target.className && 
       typeof target.className === 'object' && 
       target.className.baseVal && 
       target.className.baseVal.includes('pointer-events-none'));
    
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
    const target = e.target as HTMLElement;
    const isCanvasOrBackground = 
      target === e.currentTarget || 
      (target.className && 
       typeof target.className === 'string' && 
       target.className.includes('pointer-events-none')) ||
      (target.className && 
       typeof target.className === 'object' && 
       target.className.baseVal && 
       target.className.baseVal.includes('pointer-events-none'));
    
    if (isCanvasOrBackground) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left - 100, // 置中便條紙
        y: e.clientY - rect.top - 75,
      };
      actions.addNote(position);
    }
  };

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 工具列 */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 z-20 flex flex-wrap gap-2 border border-white/20">
        <button
          onClick={() => actions.addNote({ x: 100, y: 100 })}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          新增便條紙
        </button>
        <button
          onClick={() => state.isConnecting ? actions.cancelConnecting() : null}
          className={`px-4 py-2 rounded ${
            state.isConnecting 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!state.isConnecting}
        >
          {state.isConnecting ? '取消連線' : '連線模式'}
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
      </div>

      {/* 使用說明 */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-20 text-sm max-w-xs border border-white/20">
        <h3 className="font-bold mb-2">使用說明：</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 雙擊畫布新增便條紙</li>
          <li>• 拖拽便條紙移動位置</li>
          <li>• 雙擊便條紙編輯內容</li>
          <li>• 點擊🎨更換顏色</li>
          <li>• 點擊🔗開始連線模式</li>
          <li>• 懸停連線可刪除</li>
          <li>• 📥匯出 📤匯入 🗑️清除</li>
          <li>• 資料自動儲存到本機</li>
        </ul>
        
        {/* 資料統計 */}
        <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
          便條紙: {state.notes.length} | 連線: {state.connections.length}
        </div>
      </div>

      {/* 畫布 */}
      <div
        className="w-full h-screen overflow-hidden cursor-crosshair"
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
      >
        {/* 背景格線 */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
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
  );
};