'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StickyNote, Connection, CanvasState, Theme, STICKY_NOTE_COLORS } from '@/types';
import { saveToLocalStorage, loadFromLocalStorage } from '@/utils/localStorage';
import { useFirebaseSync } from './useFirebaseSync';

export const useCanvasStateWithSync = () => {
  const [state, setState] = useState<CanvasState>({
    themes: [],
    currentThemeId: null,
    notes: [],
    connections: [],
    selectedNoteId: null,
    isConnecting: false,
    connectingFromId: null,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  });

  const { 
    syncState, 
    isInitialized, 
    syncToCloud, 
    loadFromCloud, 
    checkForChanges, 
    forceSync, 
    toggleOnlineMode, 
    getUserId,
    setupRealtimeSync,
    syncFromOtherDevice,
  } = useFirebaseSync();

  const isFirstLoad = useRef(true);
  const isSyncingData = useRef(false);

  // 同步數據到雲端的包裝函數
  const syncData = useCallback(async (currentState: CanvasState) => {
    if (isSyncingData.current) return;
    
    const syncData = {
      themes: currentState.themes,
      currentThemeId: currentState.currentThemeId,
      notes: currentState.notes,
      connections: currentState.connections,
    };

    if (checkForChanges(syncData)) {
      await syncToCloud(syncData);
    }
  }, [syncToCloud, checkForChanges]);

  // 載入初始資料
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isInitialized || !isFirstLoad.current) return;

      try {
        // 優先從雲端載入
        const cloudData = await loadFromCloud();
        
        if (cloudData && ((cloudData.notes && cloudData.notes.length > 0) || (cloudData.themes && cloudData.themes.length > 0))) {
          // 使用雲端數據
          setState(prev => ({
            ...prev,
            ...cloudData,
          }));
          console.log('已載入雲端數據');
        } else {
          // 使用本地數據
          const localData = loadFromLocalStorage();
          if (localData) {
            const migratedNotes = localData.notes?.map((note: StickyNote & { themeId?: string | null }) => ({
              ...note,
              themeId: note.themeId || null,
            })) || [];

            setState(prev => ({
              ...prev,
              themes: localData.themes || [],
              currentThemeId: localData.currentThemeId || null,
              notes: migratedNotes,
              connections: localData.connections || [],
            }));

            // 如果有本地數據且在線，同步到雲端
            if (syncState.isOnline && (migratedNotes.length > 0 || (localData.themes && localData.themes.length > 0))) {
              setTimeout(() => {
                syncToCloud({
                  themes: localData.themes || [],
                  currentThemeId: localData.currentThemeId || null,
                  notes: migratedNotes,
                  connections: localData.connections || [],
                });
              }, 1000);
            }
            
            console.log('已載入本地數據');
          }
        }
      } catch (error) {
        console.error('載入初始數據失敗:', error);
      }

      isFirstLoad.current = false;
    };

    loadInitialData();
  }, [isInitialized, loadFromCloud, syncState.isOnline, syncToCloud]);

  // 設置即時同步
  useEffect(() => {
    if (!isInitialized || isFirstLoad.current) return;

    const unsubscribe = setupRealtimeSync((cloudData) => {
      if (isSyncingData.current) return;
      
      isSyncingData.current = true;
      setState(prev => ({
        ...prev,
        ...cloudData,
        // 保持本地UI狀態
        selectedNoteId: prev.selectedNoteId,
        isConnecting: prev.isConnecting,
        connectingFromId: prev.connectingFromId,
        zoom: prev.zoom,
        panOffset: prev.panOffset,
      }));
      
      setTimeout(() => {
        isSyncingData.current = false;
      }, 100);
    });

    return unsubscribe;
  }, [isInitialized, setupRealtimeSync]);

  // 自動保存到本地和雲端
  useEffect(() => {
    if (isFirstLoad.current || isSyncingData.current) return;

    // 保存到本地存儲
    if (state.notes.length > 0 || state.connections.length > 0 || state.themes.length > 0) {
      saveToLocalStorage({
        themes: state.themes,
        currentThemeId: state.currentThemeId,
        notes: state.notes,
        connections: state.connections,
      });
    }

    // 延遲同步到雲端（避免頻繁同步）
    const syncTimer = setTimeout(() => {
      if (!isSyncingData.current) {
        syncData(state);
      }
    }, 2000);

    return () => clearTimeout(syncTimer);
  }, [state.themes, state.currentThemeId, state.notes, state.connections, state, syncData]);

  // Canvas操作函數（保持原有邏輯）
  const addNote = useCallback((position: { x: number; y: number }) => {
    const newNote: StickyNote = {
      id: uuidv4(),
      content: '',
      position,
      color: STICKY_NOTE_COLORS[0],
      size: { width: 200, height: 150 },
      themeId: state.currentThemeId || null,
    };

    setState(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
      selectedNoteId: newNote.id,
    }));
  }, [state.currentThemeId]);

  const updateNote = useCallback((id: string, updates: Partial<StickyNote>) => {
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === id ? { ...note, ...updates } : note
      ),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(note => note.id !== id),
      connections: prev.connections.filter(
        conn => conn.sourceId !== id && conn.targetId !== id
      ),
      selectedNoteId: prev.selectedNoteId === id ? null : prev.selectedNoteId,
    }));
  }, []);

  const addConnection = useCallback((sourceId: string, targetId: string) => {
    setState(prev => {
      if (sourceId === targetId) return prev;
      
      const existingConnection = prev.connections.find(
        conn => 
          (conn.sourceId === sourceId && conn.targetId === targetId) ||
          (conn.sourceId === targetId && conn.targetId === sourceId)
      );
      
      if (existingConnection) return prev;

      const newConnection: Connection = {
        id: uuidv4(),
        sourceId,
        targetId,
      };

      return {
        ...prev,
        connections: [...prev.connections, newConnection],
        isConnecting: false,
        connectingFromId: null,
      };
    });
  }, []);

  const deleteConnection = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== id),
    }));
  }, []);

  const selectNote = useCallback((id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedNoteId: id,
    }));
  }, []);

  const startConnecting = useCallback((fromId: string) => {
    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectingFromId: fromId,
    }));
  }, []);

  const cancelConnecting = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnecting: false,
      connectingFromId: null,
    }));
  }, []);

  const tryConnect = useCallback((toId: string) => {
    setState(prev => {
      if (!prev.isConnecting || !prev.connectingFromId) {
        return prev;
      }
      
      if (prev.connectingFromId === toId) {
        return prev;
      }
      
      const existingConnection = prev.connections.find(
        conn => 
          (conn.sourceId === prev.connectingFromId && conn.targetId === toId) ||
          (conn.sourceId === toId && conn.targetId === prev.connectingFromId)
      );
      
      if (existingConnection) {
        return {
          ...prev,
          isConnecting: false,
          connectingFromId: null,
        };
      }

      const newConnection: Connection = {
        id: uuidv4(),
        sourceId: prev.connectingFromId,
        targetId: toId,
      };

      return {
        ...prev,
        connections: [...prev.connections, newConnection],
        isConnecting: false,
        connectingFromId: null,
      };
    });
  }, []);

  const clearAllData = useCallback(() => {
    setState({
      themes: [],
      currentThemeId: null,
      notes: [],
      connections: [],
      selectedNoteId: null,
      isConnecting: false,
      connectingFromId: null,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    });
  }, []);

  const exportData = useCallback(() => {
    const dataToExport = {
      themes: state.themes,
      currentThemeId: state.currentThemeId,
      notes: state.notes,
      connections: state.connections,
      exportedAt: new Date().toISOString(),
      userId: getUserId(),
    };
    return JSON.stringify(dataToExport, null, 2);
  }, [state.themes, state.currentThemeId, state.notes, state.connections, getUserId]);

  const importData = useCallback((jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.notes && data.connections) {
        setState(prev => ({
          ...prev,
          themes: data.themes || [],
          currentThemeId: data.currentThemeId || null,
          notes: data.notes,
          connections: data.connections,
          selectedNoteId: null,
          isConnecting: false,
          connectingFromId: null,
          zoom: 1,
          panOffset: { x: 0, y: 0 },
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('匯入資料失敗:', error);
      return false;
    }
  }, []);

  // 縮放功能
  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 3),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.1),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(3, zoom)),
    }));
  }, []);

  const setPanOffset = useCallback((offset: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      panOffset: offset,
    }));
  }, []);

  const fitToView = useCallback((containerWidth: number, containerHeight: number) => {
    if (state.notes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    state.notes.forEach(note => {
      minX = Math.min(minX, note.position.x);
      minY = Math.min(minY, note.position.y);
      maxX = Math.max(maxX, note.position.x + note.size.width);
      maxY = Math.max(maxY, note.position.y + note.size.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const padding = 100;
    const scaleX = (containerWidth - padding * 2) / contentWidth;
    const scaleY = (containerHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);

    const centerX = (containerWidth - contentWidth * newZoom) / 2;
    const centerY = (containerHeight - contentHeight * newZoom) / 2;
    const offsetX = centerX - minX * newZoom;
    const offsetY = centerY - minY * newZoom;

    setState(prev => ({
      ...prev,
      zoom: newZoom,
      panOffset: { x: offsetX, y: offsetY },
    }));
  }, [state.notes]);

  // 主題相關操作
  const createTheme = useCallback((theme: Theme) => {
    setState(prev => ({
      ...prev,
      themes: [...prev.themes, theme],
    }));
  }, []);

  const updateTheme = useCallback((updatedTheme: Theme) => {
    setState(prev => ({
      ...prev,
      themes: prev.themes.map(theme =>
        theme.id === updatedTheme.id ? updatedTheme : theme
      ),
    }));
  }, []);

  const deleteTheme = useCallback((themeId: string) => {
    setState(prev => ({
      ...prev,
      themes: prev.themes.filter(theme => theme.id !== themeId),
      currentThemeId: prev.currentThemeId === themeId ? null : prev.currentThemeId,
      notes: prev.notes.filter(note => note.themeId !== themeId),
      connections: prev.connections.filter(conn => {
        const sourceNote = prev.notes.find(note => note.id === conn.sourceId);
        const targetNote = prev.notes.find(note => note.id === conn.targetId);
        return sourceNote?.themeId !== themeId && targetNote?.themeId !== themeId;
      }),
    }));
  }, []);

  const selectTheme = useCallback((themeId: string | null) => {
    setState(prev => ({
      ...prev,
      currentThemeId: themeId,
      selectedNoteId: null,
      isConnecting: false,
      connectingFromId: null,
    }));
  }, []);

  // 獲取當前主題的便條紙
  const getCurrentThemeNotes = useCallback(() => {
    if (state.currentThemeId === null) {
      return state.notes;
    }
    return state.notes.filter(note => note.themeId === state.currentThemeId);
  }, [state.notes, state.currentThemeId]);

  // 獲取當前主題的連線
  const getCurrentThemeConnections = useCallback(() => {
    const currentNotes = getCurrentThemeNotes();
    const currentNoteIds = new Set(currentNotes.map(note => note.id));
    
    return state.connections.filter(conn =>
      currentNoteIds.has(conn.sourceId) && currentNoteIds.has(conn.targetId)
    );
  }, [state.connections, getCurrentThemeNotes]);

  // 跨裝置同步功能
  const handleCrossDeviceSync = useCallback(async (otherUserId: string) => {
    try {
      const syncedData = await syncFromOtherDevice(otherUserId);
      
      // 更新本地狀態
      setState(prev => ({
        ...prev,
        themes: syncedData.themes,
        currentThemeId: syncedData.currentThemeId,
        notes: syncedData.notes,
        connections: syncedData.connections,
        // 重置 UI 狀態
        selectedNoteId: null,
        isConnecting: false,
        connectingFromId: null,
      }));

      console.log('跨裝置同步完成，本地狀態已更新');
    } catch (error) {
      console.error('跨裝置同步失敗:', error);
      throw error;
    }
  }, [syncFromOtherDevice]);

  return {
    state: {
      ...state,
      currentNotes: getCurrentThemeNotes(),
      currentConnections: getCurrentThemeConnections(),
    },
    syncState,
    actions: {
      addNote,
      updateNote,
      deleteNote,
      addConnection,
      deleteConnection,
      selectNote,
      startConnecting,
      cancelConnecting,
      tryConnect,
      clearAllData,
      exportData,
      importData,
      zoomIn,
      zoomOut,
      resetZoom,
      setZoom,
      setPanOffset,
      fitToView,
      createTheme,
      updateTheme,
      deleteTheme,
      selectTheme,
      forceSync: () => forceSync({
        themes: state.themes,
        currentThemeId: state.currentThemeId,
        notes: state.notes,
        connections: state.connections,
      }),
      toggleOnlineMode,
      getUserId,
      syncFromOtherDevice: handleCrossDeviceSync,
    },
  };
};