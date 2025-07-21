'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { firebaseService, UserData } from '@/services/firebaseService';
import { CanvasState } from '@/types';

interface FirebaseSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSynced: Date | null;
  syncError: string | null;
  hasUnsavedChanges: boolean;
}

export const useFirebaseSync = () => {
  const [syncState, setSyncState] = useState<FirebaseSyncState>({
    isOnline: false,
    isSyncing: false,
    lastSynced: null,
    syncError: null,
    hasUnsavedChanges: false,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const lastSyncData = useRef<string>('');
  const pendingChanges = useRef<boolean>(false);

  // 初始化 Firebase 連接
  const initializeFirebase = useCallback(async () => {
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }));
      
      console.log('正在初始化 Firebase 連接...');
      
      // 嘗試匿名登入
      await firebaseService.signInAnonymously();
      
      setSyncState(prev => ({ 
        ...prev, 
        isOnline: true, 
        isSyncing: false,
        lastSynced: new Date(),
        syncError: null,
      }));
      setIsInitialized(true);
      
      console.log('Firebase 初始化成功，已切換為線上模式');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Firebase 初始化失敗，自動切換為離線模式:', errorMessage);
      
      // 判斷錯誤類型並提供相應的提示
      let friendlyMessage = '應用程式將在離線模式下運行';
      if (errorMessage?.includes('網路')) {
        friendlyMessage = '網路連線問題，應用程式將在離線模式下運行';
      } else if (errorMessage?.includes('Firebase')) {
        friendlyMessage = 'Firebase 服務暫時無法使用，應用程式將在離線模式下運行';
      }
      
      setSyncState(prev => ({ 
        ...prev, 
        isOnline: false, 
        isSyncing: false,
        syncError: friendlyMessage,
      }));
      setIsInitialized(true);
      
      // 在離線模式下仍然可以正常使用應用程式
      console.log('應用程式已準備就緒（離線模式）');
    }
  }, []);

  // 同步數據到雲端
  const syncToCloud = useCallback(async (data: Omit<CanvasState, 'zoom' | 'panOffset' | 'selectedNoteId' | 'isConnecting' | 'connectingFromId' | 'currentNotes' | 'currentConnections'>) => {
    if (!syncState.isOnline || syncState.isSyncing) {
      pendingChanges.current = true;
      return;
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }));

      const userData: Omit<UserData, 'lastModified' | 'userId'> = {
        themes: data.themes,
        currentThemeId: data.currentThemeId,
        notes: data.notes,
        connections: data.connections,
      };

      await firebaseService.saveUserData(userData);

      // 記錄最後同步的數據
      lastSyncData.current = JSON.stringify(userData);
      pendingChanges.current = false;

      setSyncState(prev => ({ 
        ...prev, 
        isSyncing: false,
        lastSynced: new Date(),
        hasUnsavedChanges: false,
      }));

      console.log('數據同步成功');
    } catch (error) {
      console.error('同步失敗:', error);
      setSyncState(prev => ({ 
        ...prev, 
        isSyncing: false,
        syncError: '同步失敗，數據已保存在本地',
        hasUnsavedChanges: true,
      }));
      pendingChanges.current = true;
    }
  }, [syncState.isOnline, syncState.isSyncing]);

  // 從雲端加載數據
  const loadFromCloud = useCallback(async (): Promise<Partial<CanvasState> | null> => {
    if (!syncState.isOnline) {
      return null;
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }));

      const userData = await firebaseService.loadUserData();
      
      setSyncState(prev => ({ 
        ...prev, 
        isSyncing: false,
        lastSynced: new Date(),
      }));

      if (userData) {
        // 記錄加載的數據
        lastSyncData.current = JSON.stringify({
          themes: userData.themes,
          currentThemeId: userData.currentThemeId,
          notes: userData.notes,
          connections: userData.connections,
        });

        return {
          themes: userData.themes,
          currentThemeId: userData.currentThemeId,
          notes: userData.notes,
          connections: userData.connections,
        };
      }

      return null;
    } catch (error) {
      console.error('從雲端加載失敗:', error);
      setSyncState(prev => ({ 
        ...prev, 
        isSyncing: false,
        syncError: '加載失敗，使用本地數據',
      }));
      return null;
    }
  }, [syncState.isOnline]);

  // 檢查是否有待同步的更改
  const checkForChanges = useCallback((data: Omit<CanvasState, 'zoom' | 'panOffset' | 'selectedNoteId' | 'isConnecting' | 'connectingFromId' | 'currentNotes' | 'currentConnections'>) => {
    const currentDataString = JSON.stringify({
      themes: data.themes,
      currentThemeId: data.currentThemeId,
      notes: data.notes,
      connections: data.connections,
    });

    const hasChanges = currentDataString !== lastSyncData.current;
    
    setSyncState(prev => ({ 
      ...prev, 
      hasUnsavedChanges: hasChanges || pendingChanges.current,
    }));

    return hasChanges;
  }, []);

  // 強制同步
  const forceSync = useCallback(async (data: Omit<CanvasState, 'zoom' | 'panOffset' | 'selectedNoteId' | 'isConnecting' | 'connectingFromId' | 'currentNotes' | 'currentConnections'>) => {
    if (syncState.isOnline) {
      await syncToCloud(data);
    }
  }, [syncState.isOnline, syncToCloud]);

  // 切換線上/離線模式
  const toggleOnlineMode = useCallback(async () => {
    try {
      if (syncState.isOnline) {
        await firebaseService.disableNetwork();
        setSyncState(prev => ({ ...prev, isOnline: false }));
      } else {
        await firebaseService.enableNetwork();
        await initializeFirebase();
      }
    } catch (error) {
      console.error('切換網絡模式失敗:', error);
    }
  }, [syncState.isOnline, initializeFirebase]);

  // 獲取用戶ID（用於分享）
  const getUserId = useCallback(() => {
    return firebaseService.getUserId();
  }, []);

  // 手動重試連線
  const retryConnection = useCallback(async () => {
    if (syncState.isSyncing) return;
    
    console.log('用戶手動重試 Firebase 連線...');
    await initializeFirebase();
  }, [initializeFirebase, syncState.isSyncing]);

  // 初始化
  useEffect(() => {
    initializeFirebase();
  }, [initializeFirebase]);

  // 網絡狀態監聽
  useEffect(() => {
    const handleOnline = () => {
      if (isInitialized) {
        initializeFirebase();
      }
    };

    const handleOffline = () => {
      setSyncState(prev => ({ 
        ...prev, 
        isOnline: false,
        syncError: '網絡連接已斷開，使用離線模式',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInitialized, initializeFirebase]);

  // 設置即時同步監聽
  const setupRealtimeSync = useCallback((onDataReceived: (data: Partial<CanvasState>) => void) => {
    if (!syncState.isOnline) {
      return () => {};
    }

    return firebaseService.subscribeToUserData((userData) => {
      if (userData) {
        const newDataString = JSON.stringify({
          themes: userData.themes,
          currentThemeId: userData.currentThemeId,
          notes: userData.notes,
          connections: userData.connections,
        });

        // 只有當數據真的不同時才更新
        if (newDataString !== lastSyncData.current) {
          lastSyncData.current = newDataString;
          onDataReceived({
            themes: userData.themes,
            currentThemeId: userData.currentThemeId,
            notes: userData.notes,
            connections: userData.connections,
          });

          setSyncState(prev => ({ 
            ...prev,
            lastSynced: new Date(),
            hasUnsavedChanges: false,
          }));
        }
      }
    });
  }, [syncState.isOnline]);

  return {
    syncState,
    isInitialized,
    syncToCloud,
    loadFromCloud,
    checkForChanges,
    forceSync,
    toggleOnlineMode,
    getUserId,
    setupRealtimeSync,
    retryConnection,
  };
};