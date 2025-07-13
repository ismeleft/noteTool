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
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface CanvasState {
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

export const STICKY_NOTE_COLORS = [
  '#FFE066', // 黃色
  '#FF9999', // 粉紅色
  '#99CCFF', // 藍色
  '#99FF99', // 綠色
  '#FFCC99', // 橘色
  '#CC99FF', // 紫色
  '#FFFFFF', // 白色
] as const;

export type StickyNoteColor = typeof STICKY_NOTE_COLORS[number];