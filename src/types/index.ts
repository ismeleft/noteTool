export const STICKY_NOTE_COLORS = [
  '#FFE066', // 黃色
  '#FF9999', // 粉紅色
  '#99CCFF', // 藍色
  '#99FF99', // 綠色
  '#FFCC99', // 橘色
  '#CC99FF', // 紫色
  '#FFFFFF', // 白色
] as const;

export const THEME_COLORS = [
  '#3B82F6', // 藍色
  '#10B981', // 綠色
  '#F59E0B', // 黃色
  '#EF4444', // 紅色
  '#8B5CF6', // 紫色
  '#06B6D4', // 青色
  '#F97316', // 橘色
  '#84CC16', // 萊姆綠
] as const;

export type StickyNoteColor = typeof STICKY_NOTE_COLORS[number];
export type ThemeColor = typeof THEME_COLORS[number];

export interface Theme {
  id: string;
  name: string;
  description?: string;
  color: ThemeColor;
  createdAt: string;
  updatedAt: string;
}

export interface StickyNote {
  id: string;
  content: string;
  position: {
    x: number;
    y: number;
  };
  color: string;
  size: {
    width: number;
    height: number;
  };
  themeId: string | null;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface CanvasState {
  themes: Theme[];
  currentThemeId: string | null;
  notes: StickyNote[];
  connections: Connection[];
  selectedNoteId: string | null;
  isConnecting: boolean;
  connectingFromId: string | null;
  zoom: number;
  panOffset: {
    x: number;
    y: number;
  };
}