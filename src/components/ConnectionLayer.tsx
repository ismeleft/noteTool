'use client';

import React from 'react';
import { ConnectionLine } from './ConnectionLine';
import { Connection, StickyNote } from '@/types';

interface ConnectionLayerProps {
  connections: Connection[];
  notes: StickyNote[];
  onDeleteConnection: (id: string) => void;
}

export const ConnectionLayer: React.FC<ConnectionLayerProps> = ({
  connections,
  notes,
  onDeleteConnection,
}) => {
  // 創建便條紙 ID 到便條紙對象的映射
  const noteMap = React.useMemo(() => {
    return notes.reduce((map, note) => {
      map[note.id] = note;
      return map;
    }, {} as Record<string, StickyNote>);
  }, [notes]);


  return (
    <svg 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: 1,
        width: '100vw',
        height: '100vh'
      }}
    >
      {connections.map(connection => {
        const sourceNote = noteMap[connection.sourceId];
        const targetNote = noteMap[connection.targetId];
        
        // 如果源或目標便條紙不存在，跳過此連線
        if (!sourceNote || !targetNote) {
          return null;
        }
        
        return (
          <g key={connection.id} className="pointer-events-auto">
            <ConnectionLine
              connection={connection}
              sourceNote={sourceNote}
              targetNote={targetNote}
              onDelete={() => onDeleteConnection(connection.id)}
            />
          </g>
        );
      })}
    </svg>
  );
};