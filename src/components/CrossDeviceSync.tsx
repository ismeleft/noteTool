'use client';

import React, { useState } from 'react';

interface CrossDeviceSyncProps {
  onSyncFromDevice: (otherUserId: string) => Promise<void>;
  currentUserId: string | null;
  isOnline: boolean;
  isSyncing: boolean;
}

export const CrossDeviceSync: React.FC<CrossDeviceSyncProps> = ({
  onSyncFromDevice,
  currentUserId,
  isOnline,
  isSyncing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputUserId, setInputUserId] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSync = async () => {
    if (!inputUserId.trim()) {
      setErrorMessage('請輸入有效的裝置 ID');
      return;
    }

    if (inputUserId.trim() === currentUserId) {
      setErrorMessage('不能同步自己的資料');
      return;
    }

    setSyncStatus('syncing');
    setErrorMessage('');

    try {
      await onSyncFromDevice(inputUserId.trim());
      setSyncStatus('success');
      setInputUserId('');
      setTimeout(() => {
        setSyncStatus('idle');
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      setSyncStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '同步失敗');
    }
  };

  const copyCurrentId = () => {
    if (currentUserId) {
      navigator.clipboard.writeText(currentUserId);
      alert('目前裝置 ID 已複製');
    }
  };

  if (!isOnline) {
    return null;
  }

  return (
    <div className="relative">
      {/* 觸發按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        disabled={isSyncing}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        跨裝置同步
      </button>

      {/* 同步面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">跨裝置同步</h3>
            <p className="text-sm text-gray-600 mb-3">
              輸入另一個裝置的 ID 來同步便條紙資料。這會覆蓋目前裝置的所有資料。
            </p>
          </div>

          {/* 目前裝置ID */}
          <div className="mb-4 p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-600 mb-1">目前裝置 ID：</div>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono text-gray-800 break-all">
                {currentUserId || '未知'}
              </code>
              <button
                onClick={copyCurrentId}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
              >
                複製
              </button>
            </div>
          </div>

          {/* 輸入其他裝置ID */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              來源裝置 ID：
            </label>
            <input
              type="text"
              value={inputUserId}
              onChange={(e) => setInputUserId(e.target.value)}
              placeholder="貼上另一個裝置的 ID"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={syncStatus === 'syncing'}
            />
          </div>

          {/* 錯誤訊息 */}
          {errorMessage && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* 成功訊息 */}
          {syncStatus === 'success' && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✅ 同步成功！資料已更新
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing' || !inputUserId.trim()}
              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  同步中...
                </>
              ) : (
                '⚠️ 覆蓋並同步'
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              disabled={syncStatus === 'syncing'}
            >
              取消
            </button>
          </div>

          {/* 警告說明 */}
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>注意：</strong>此操作會完全覆蓋目前裝置的所有便條紙、主題和連線資料。請確保已備份重要資料。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};