"use client";

import React from "react";

interface SyncStatusProps {
  syncState: {
    isOnline: boolean;
    isSyncing: boolean;
    lastSynced: Date | null;
    syncError: string | null;
    hasUnsavedChanges: boolean;
  };
  onForceSync: () => void;
  onToggleOnlineMode: () => void;
  getUserId: () => string | null;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  syncState,
  onForceSync,
  onToggleOnlineMode,
  getUserId,
}) => {
  const formatLastSynced = (date: Date | null) => {
    if (!date) return '從未同步';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  };

  const getStatusIcon = () => {
    if (syncState.isSyncing) return '🔄';
    if (!syncState.isOnline) return '⚠️';
    if (syncState.syncError) return '❌';
    if (syncState.hasUnsavedChanges) return '📝';
    return '✅';
  };

  const getStatusText = () => {
    if (syncState.isSyncing) return '同步中...';
    if (!syncState.isOnline) return '離線模式';
    if (syncState.syncError) return '同步錯誤';
    if (syncState.hasUnsavedChanges) return '有未保存更改';
    return '已同步';
  };

  const getStatusColor = () => {
    if (syncState.isSyncing) return 'text-blue-600 bg-blue-50';
    if (!syncState.isOnline) return 'text-orange-600 bg-orange-50';
    if (syncState.syncError) return 'text-red-600 bg-red-50';
    if (syncState.hasUnsavedChanges) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <div className="flex flex-col">
            <span className={`text-sm font-medium px-2 py-1 rounded ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {syncState.lastSynced && (
              <span className="text-xs text-gray-500 mt-1">
                最後同步: {formatLastSynced(syncState.lastSynced)}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          {/* 手動同步按鈕 */}
          <button
            onClick={onForceSync}
            disabled={syncState.isSyncing || !syncState.isOnline}
            className={`px-3 py-1 text-xs rounded ${
              syncState.isSyncing || !syncState.isOnline
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title="手動同步"
          >
            {syncState.isSyncing ? '同步中' : '同步'}
          </button>
          
          {/* 線上/離線切換 */}
          <button
            onClick={onToggleOnlineMode}
            className={`px-3 py-1 text-xs rounded ${
              syncState.isOnline
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
            title={syncState.isOnline ? '切換到離線模式' : '切換到線上模式'}
          >
            {syncState.isOnline ? '線上' : '離線'}
          </button>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {syncState.syncError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {syncState.syncError}
        </div>
      )}

      {/* 用戶ID（用於分享） */}
      {syncState.isOnline && getUserId() && (
        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">分享ID:</div>
          <div className="flex items-center justify-between">
            <code className="text-xs font-mono text-gray-800 bg-white px-2 py-1 rounded border">
              {getUserId()?.slice(0, 8)}...
            </code>
            <button
              onClick={() => {
                const userId = getUserId();
                if (userId) {
                  navigator.clipboard.writeText(userId);
                  alert('用戶ID已複製到剪貼板');
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              複製
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            分享此ID給其他人，讓他們查看您的便條紙
          </div>
        </div>
      )}
    </div>
  );
};