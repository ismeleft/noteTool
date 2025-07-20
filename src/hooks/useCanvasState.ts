'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StickyNote, Connection, CanvasState, Theme, STICKY_NOTE_COLORS } from '@/types';
import { saveToLocalStorage, loadFromLocalStorage } from '@/utils/localStorage';

export const useCanvasState = () => {
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

  // 載入初始資料
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      // 為舊資料遷移：如果便條紙沒有themeId，設為null
      const migratedNotes = savedData.notes?.map((note: StickyNote & { themeId?: string | null }) => ({
        ...note,
        themeId: note.themeId || null,
      })) || [];

      setState(prev => ({
        ...prev,
        themes: savedData.themes || [],
        currentThemeId: savedData.currentThemeId || null,
        notes: migratedNotes,
        connections: savedData.connections || [],
      }));
    }
  }, []);

  // 自動儲存
  useEffect(() => {
    // 只有在有資料時才儲存，避免初始載入時覆蓋資料
    if (state.notes.length > 0 || state.connections.length > 0 || state.themes.length > 0) {
      saveToLocalStorage({
        themes: state.themes,
        currentThemeId: state.currentThemeId,
        notes: state.notes,
        connections: state.connections,
      });
    }
  }, [state.themes, state.currentThemeId, state.notes, state.connections]);

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
      // 避免重複連線和自己連自己
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
      // 如果已經不在連線模式，直接返回
      if (!prev.isConnecting || !prev.connectingFromId) {
        return prev;
      }
      
      // 不能連接自己
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
      notes: state.notes,
      connections: state.connections,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(dataToExport, null, 2);
  }, [state.notes, state.connections]);

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
      zoom: Math.min(prev.zoom * 1.2, 3), // 最大3倍
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.1), // 最小0.1倍
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

    // 計算所有便條紙的邊界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    state.notes.forEach(note => {
      minX = Math.min(minX, note.position.x);
      minY = Math.min(minY, note.position.y);
      maxX = Math.max(maxX, note.position.x + note.size.width);
      maxY = Math.max(maxY, note.position.y + note.size.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 加上邊距
    const padding = 100;
    const scaleX = (containerWidth - padding * 2) / contentWidth;
    const scaleY = (containerHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1); // 不超過100%

    // 計算居中偏移
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
      // 刪除屬於此主題的所有便條紙和相關連線
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
      return state.notes; // 顯示所有便條紙
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

  return {
    state: {
      ...state,
      currentNotes: getCurrentThemeNotes(),
      currentConnections: getCurrentThemeConnections(),
    },
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
    },
  };
};