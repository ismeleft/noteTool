'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StickyNote, Connection, CanvasState, STICKY_NOTE_COLORS } from '@/types';
import { saveToLocalStorage, loadFromLocalStorage } from '@/utils/localStorage';

export const useCanvasState = () => {
  const [state, setState] = useState<CanvasState>({
    notes: [],
    connections: [],
    selectedNoteId: null,
    isConnecting: false,
    connectingFromId: null,
  });

  // 載入初始資料
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      setState(prev => ({
        ...prev,
        notes: savedData.notes,
        connections: savedData.connections,
      }));
    }
  }, []);

  // 自動儲存
  useEffect(() => {
    // 只有在有資料時才儲存，避免初始載入時覆蓋資料
    if (state.notes.length > 0 || state.connections.length > 0) {
      saveToLocalStorage({
        notes: state.notes,
        connections: state.connections,
      });
    }
  }, [state.notes, state.connections]);

  const addNote = useCallback((position: { x: number; y: number }) => {
    const newNote: StickyNote = {
      id: uuidv4(),
      content: '',
      position,
      color: STICKY_NOTE_COLORS[0],
      size: { width: 200, height: 150 },
    };

    setState(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
      selectedNoteId: newNote.id,
    }));
  }, []);

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
      notes: [],
      connections: [],
      selectedNoteId: null,
      isConnecting: false,
      connectingFromId: null,
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
          notes: data.notes,
          connections: data.connections,
          selectedNoteId: null,
          isConnecting: false,
          connectingFromId: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('匯入資料失敗:', error);
      return false;
    }
  }, []);

  return {
    state,
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
    },
  };
};