import { CanvasState } from '@/types';

const STORAGE_KEY = 'sticky-notes-app-data';

export const saveToLocalStorage = (state: Pick<CanvasState, 'notes' | 'connections' | 'themes' | 'currentThemeId'>) => {
  try {
    const dataToSave = {
      notes: state.notes,
      connections: state.connections,
      themes: state.themes,
      currentThemeId: state.currentThemeId,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('儲存資料失敗:', error);
  }
};

export const loadFromLocalStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const data = JSON.parse(saved);
    return {
      notes: data.notes || [],
      connections: data.connections || [],
      themes: data.themes || [],
      currentThemeId: data.currentThemeId || null,
      savedAt: data.savedAt,
    };
  } catch (error) {
    console.error('載入資料失敗:', error);
    return null;
  }
};

export const clearLocalStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清除資料失敗:', error);
  }
};