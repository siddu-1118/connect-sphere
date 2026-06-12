'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Pointer, Pencil, Square, Circle, Eraser, Trash2, Undo, Redo, ZoomIn, ZoomOut, 
  Download, Layers, Type, SquareDot, Palette, Grab, X, Sparkles, Check, HelpCircle
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { supabase } from '@/lib/supabaseClient';
import * as Y from 'yjs';

interface DrawingElement {
  id: string;
  type: 'freehand' | 'rect' | 'circle' | 'text' | 'sticky';
  points?: { x: number; y: number }[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  lineWidth: number;
  text?: string;
  stickyColor?: string;
}

interface MultiplayerCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  role: string;
}

export default function Whiteboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const params = useParams();
  const roomId = (params?.id as string) || 'lobby';
  const userId = user?.id || `user-${Math.random().toString(36).substring(2, 9)}`;
  const userName = user?.name || 'Collaborator';

  const [tool, setTool] = useState<'select' | 'pan' | 'pencil' | 'rect' | 'circle' | 'text' | 'sticky' | 'eraser'>('pencil');
  const [color, setColor] = useState('#4F46E5'); // Indigo default
  const [stickyBg, setStickyBg] = useState('#fbbf24'); // Yellow default for sticky notes
  const [lineWidth, setLineWidth] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [elements, setElements] = useState<DrawingElement[]>([]);

  // Interactive drawing/dragging states
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeElement, setActiveElement] = useState<DrawingElement | null>(null);

  // Custom dialogue state (replaces prompt)
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [modalTextType, setModalTextType] = useState<'text' | 'sticky'>('text');
  const [modalInputVal, setModalInputVal] = useState('');
  const [modalCoords, setModalCoords] = useState({ x: 0, y: 0 });

  // Multiplayer cursor positions (Presence)
  const [remoteCursors, setRemoteCursors] = useState<MultiplayerCursor[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Yjs document references
  const ydocRef = useRef<Y.Doc | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Generate local user's cursor color
  const [localCursorColor] = useState(() => {
    const colors = ['#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  });

  // 1. Initialize Collaborative Whiteboard CRDT (Yjs) & connect via Socket.IO
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const yElements = ydoc.getArray<DrawingElement>('elements');
    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    // Local Yjs array observe
    const handleObserve = () => {
      setElements(yElements.toArray());
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };
    yElements.observe(handleObserve);

    undoManager.on('stack-item-added', () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    });
    undoManager.on('stack-item-popped', () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    });

    // Handle updates (broadcast to signaling server)
    const handleYjsUpdate = (update: Uint8Array, origin: any) => {
      if (origin === 'socket') return; // do not send back what we received
      if (socket) {
        socket.emit('whiteboard-update', {
          roomId,
          update: Buffer.from(update),
        });
      }
    };
    ydoc.on('update', handleYjsUpdate);

    if (socket) {
      // Sync on join
      const handleSync = (update: ArrayBuffer) => {
        try {
          Y.applyUpdate(ydoc, new Uint8Array(update), 'socket');
          setElements(yElements.toArray());
        } catch (e) {
          console.error('Error applying initial sync:', e);
        }
      };

      // Apply increments
      const handleUpdate = (update: ArrayBuffer) => {
        try {
          Y.applyUpdate(ydoc, new Uint8Array(update), 'socket');
          setElements(yElements.toArray());
        } catch (e) {
          console.error('Error applying whiteboard update:', e);
        }
      };

      socket.on('whiteboard-sync', handleSync);
      socket.on('whiteboard-update', handleUpdate);

      // Trigger server initial sync request
      socket.emit('whiteboard-sync-request', { roomId });

      return () => {
        socket.off('whiteboard-sync', handleSync);
        socket.off('whiteboard-update', handleUpdate);
        ydoc.off('update', handleYjsUpdate);
        yElements.unobserve(handleObserve);
        undoManager.destroy();
        ydoc.destroy();
      };
    }

    return () => {
      ydoc.off('update', handleYjsUpdate);
      yElements.unobserve(handleObserve);
      undoManager.destroy();
      ydoc.destroy();
    };
  }, [socket, roomId]);

  // 2. Initialize Multiplayer Cursors (Supabase Presence)
  useEffect(() => {
    if (!supabase) return;
    
    console.log(`🔌 Initializing Supabase Presence for whiteboard: presence:${roomId}`);
    const presenceChannel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    const handleSync = () => {
      const state = presenceChannel.presenceState();
      const cursors: MultiplayerCursor[] = [];
      Object.keys(state).forEach((key) => {
        if (key !== userId) {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const latest = presences[presences.length - 1];
            if (typeof latest.x === 'number' && typeof latest.y === 'number') {
              cursors.push({
                id: key,
                name: latest.name || 'Anonymous',
                color: latest.color || '#cccccc',
                x: latest.x,
                y: latest.y,
                role: latest.role || 'Collaborator',
              });
            }
          }
        }
      });
      setRemoteCursors(cursors);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, handleSync)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            name: userName,
            color: localCursorColor,
            role: 'Collaborator',
            x: 0,
            y: 0,
          });
        }
      });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [roomId, userId, userName, localCursorColor]);

  // Clear all elements via Yjs
  const handleClear = () => {
    const ydoc = ydocRef.current;
    if (ydoc) {
      const yElements = ydoc.getArray<DrawingElement>('elements');
      ydoc.transact(() => {
        if (yElements.length > 0) {
          yElements.delete(0, yElements.length);
        }
      });
    }
  };

  // Undo/Redo logic using local UndoManager
  const handleUndo = () => {
    if (undoManagerRef.current && undoManagerRef.current.canUndo()) {
      undoManagerRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (undoManagerRef.current && undoManagerRef.current.canRedo()) {
      undoManagerRef.current.redo();
    }
  };

  // Canvas drawing effect
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 1000;
    canvas.height = canvas.parentElement?.clientHeight || 650;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.scale(zoom / 100, zoom / 100);
    ctx.translate(panX, panY);

    elements.forEach(el => {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'freehand' && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
      } else if (el.type === 'circle') {
        ctx.beginPath();
        const rx = (el.width || 0) / 2;
        const ry = (el.height || 0) / 2;
        ctx.ellipse(el.x + rx, el.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [elements, zoom, panX, panY]);

  // Trigger redraw on window resize or elements change
  useEffect(() => {
    redrawCanvas();
    window.addEventListener('resize', redrawCanvas);
    return () => window.removeEventListener('resize', redrawCanvas);
  }, [redrawCanvas]);

  // Helper: screen coordinates to canvas space conversion
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: sx / (zoom / 100) - panX,
      y: sy / (zoom / 100) - panY
    };
  };

  // Broadcast local cursor positions
  const trackCursor = useCallback((clientX: number, clientY: number) => {
    if (!supabase) return;
    const coords = getCanvasCoords(clientX, clientY);
    const presenceChannel = supabase.channel(`presence:${roomId}`);
    presenceChannel.track({
      name: userName,
      color: localCursorColor,
      role: 'Collaborator',
      x: coords.x,
      y: coords.y,
    }).catch(() => {});
  }, [roomId, userName, localCursorColor, zoom, panX, panY]);

  // Pointer event start handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // Pan canvas behavior
    if (tool === 'pan' || e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Eraser behavior: delete clicked element in Yjs array
    if (tool === 'eraser') {
      const threshold = 15;
      const ydoc = ydocRef.current;
      if (ydoc) {
        const yElements = ydoc.getArray<DrawingElement>('elements');
        const elementsArr = yElements.toArray();
        const indicesToDelete: number[] = [];

        elementsArr.forEach((el, idx) => {
          if (el.type === 'freehand' && el.points) {
            if (el.points.some(p => Math.hypot(p.x - coords.x, p.y - coords.y) < threshold)) {
              indicesToDelete.push(idx);
            }
          } else if (el.type === 'rect' || el.type === 'circle') {
            const w = el.width || 0;
            const h = el.height || 0;
            const minX = Math.min(el.x, el.x + w);
            const maxX = Math.max(el.x, el.x + w);
            const minY = Math.min(el.y, el.y + h);
            const maxY = Math.max(el.y, el.y + h);
            if (coords.x >= minX - threshold && coords.x <= maxX + threshold && coords.y >= minY - threshold && coords.y <= maxY + threshold) {
              indicesToDelete.push(idx);
            }
          } else if (el.type === 'text' || el.type === 'sticky') {
            const size = el.type === 'sticky' ? 140 : 100;
            if (coords.x >= el.x && coords.x <= el.x + size && coords.y >= el.y && coords.y <= el.y + size) {
              indicesToDelete.push(idx);
            }
          }
        });

        if (indicesToDelete.length > 0) {
          ydoc.transact(() => {
            indicesToDelete.sort((a, b) => b - a).forEach((idx) => {
              yElements.delete(idx, 1);
            });
          });
        }
      }
      return;
    }

    // Text & Sticky note placements (custom text input overlays instead of prompts)
    if (tool === 'text' || tool === 'sticky') {
      setModalCoords(coords);
      setModalTextType(tool);
      setModalInputVal('');
      setTextModalOpen(true);
      return;
    }

    // Drawing elements start
    setIsDrawing(true);

    const entropy = Math.random().toString(36).substring(2, 6);
    const elementId = `el-${Date.now()}-${entropy}`;

    if (tool === 'pencil') {
      const newEl: DrawingElement = {
        id: elementId,
        type: 'freehand',
        points: [{ x: coords.x, y: coords.y }],
        x: coords.x,
        y: coords.y,
        color,
        lineWidth
      };
      if (ydocRef.current) {
        ydocRef.current.getArray<DrawingElement>('elements').push([newEl]);
      }
      setActiveElement(newEl);
    } else if (tool === 'rect' || tool === 'circle') {
      const newEl: DrawingElement = {
        id: elementId,
        type: tool,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        color,
        lineWidth
      };
      if (ydocRef.current) {
        ydocRef.current.getArray<DrawingElement>('elements').push([newEl]);
      }
      setActiveElement(newEl);
    }
  };

  // Pointer move handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Broadcast cursor position
    trackCursor(e.clientX, e.clientY);

    if (isPanning) {
      const dx = (e.clientX - dragStart.x) / (zoom / 100);
      const dy = (e.clientY - dragStart.y) / (zoom / 100);
      setPanX(prev => prev + dx);
      setPanY(prev => prev + dy);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing || !activeElement) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);

    const ydoc = ydocRef.current;
    if (ydoc) {
      const yElements = ydoc.getArray<DrawingElement>('elements');
      const idx = yElements.toArray().findIndex(el => el.id === activeElement.id);
      if (idx !== -1) {
        const el = yElements.get(idx);
        let updatedEl: DrawingElement;
        if (el.type === 'freehand' && el.points) {
          updatedEl = { ...el, points: [...el.points, { x: coords.x, y: coords.y }] };
        } else {
          updatedEl = { ...el, width: coords.x - el.x, height: coords.y - el.y };
        }
        ydoc.transact(() => {
          yElements.delete(idx, 1);
          yElements.insert(idx, [updatedEl]);
        });
      }
    }
  };

  // Pointer end
  const handlePointerUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setActiveElement(null);
  };

  // Complete adding text or sticky note
  const handleConfirmTextModal = () => {
    if (!modalInputVal.trim()) {
      setTextModalOpen(false);
      return;
    }

    const entropy = Math.random().toString(36).substring(2, 6);
    const newEl: DrawingElement = {
      id: `el-${Date.now()}-${entropy}`,
      type: modalTextType,
      x: modalCoords.x,
      y: modalCoords.y,
      color: modalTextType === 'sticky' ? '#0F172A' : color, // dark text on sticky
      stickyColor: modalTextType === 'sticky' ? stickyBg : undefined,
      lineWidth: 2,
      text: modalInputVal.trim()
    };

    if (ydocRef.current) {
      ydocRef.current.getArray<DrawingElement>('elements').push([newEl]);
    }
    setTextModalOpen(false);
    setModalInputVal('');
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `aeromeet-canvas-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col h-full w-full border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-sm relative select-none">
      
      {/* Top Options Bar */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Collaborative Canvas</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Multiplayer Vector Workspace</p>
          </div>
        </div>

        {/* Undo/Redo & Zoom Panel */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
          <button 
            onClick={handleUndo} 
            disabled={!canUndo}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={!canRedo}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          
          <span className="w-px h-4 bg-slate-200 mx-1" />
          
          <button 
            onClick={() => setZoom(prev => Math.max(25, prev - 10))} 
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-650 font-bold w-12 text-center select-none">
            {zoom}%
          </span>
          <button 
            onClick={() => setZoom(prev => Math.min(300, prev + 10))} 
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-slate-200 mx-1" />

          <button 
            onClick={handleDownloadImage}
            className="p-1 hover:bg-slate-100 rounded-lg text-indigo-650 hover:text-indigo-700 cursor-pointer transition-colors"
            title="Download PNG snapshot"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Vector Grid Stage */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-[#F8FAFC] overflow-hidden"
        style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
      >
        {/* Subtle light infinite dot pattern background */}
        <div 
          className="absolute inset-0 z-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)]"
          style={{ 
            backgroundSize: `${24 * (zoom / 100)}px ${24 * (zoom / 100)}px`,
            backgroundPosition: `${panX * (zoom / 100)}px ${panY * (zoom / 100)}px`
          }}
        />

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 z-0"
        />

        {/* DOM Overlays: Text boxes & Sticky notes (placed in scaled/panned space) */}
        <div 
          className="absolute inset-0 pointer-events-none select-none z-10 origin-top-left"
          style={{ transform: `scale(${zoom / 100}) translate(${panX}px, ${panY}px)` }}
        >
          {elements.map(el => {
            if (el.type === 'text') {
              return (
                <div
                  key={el.id}
                  className="absolute text-xs font-bold leading-tight px-1 py-0.5 rounded pointer-events-auto select-text selection:bg-indigo-500/30 text-left cursor-text"
                  style={{ left: el.x, top: el.y, color: el.color, fontSize: '14px', maxWidth: '300px' }}
                >
                  {el.text}
                </div>
              );
            }
            if (el.type === 'sticky') {
              return (
                <div
                  key={el.id}
                  className="absolute w-[130px] h-[130px] rounded-2xl shadow-lg p-3 text-[11px] font-bold text-left pointer-events-auto select-text selection:bg-slate-900/10 flex flex-col justify-between cursor-move"
                  style={{ 
                    left: el.x, 
                    top: el.y, 
                    backgroundColor: el.stickyColor || '#fbbf24',
                    color: '#090D16'
                  }}
                >
                  <p className="leading-snug break-words overflow-y-auto scrollbar-thin flex-1 pr-0.5">{el.text}</p>
                  <div className="text-[7.5px] text-slate-900/40 uppercase tracking-widest font-black pt-1 border-t border-slate-950/5 shrink-0 mt-1 select-none">
                    Sticky Note
                  </div>
                </div>
              );
            }
            return null;
          })}

          {/* Multiplayer Drifting cursors rendering */}
          {remoteCursors.map(cursor => (
            <div 
              key={cursor.id}
              className="absolute pointer-events-none transition-all duration-75 flex flex-col items-start"
              style={{ left: cursor.x, top: cursor.y }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 4L20 10.5L12 12L10.5 20L4 4Z" fill={cursor.color} stroke="#090D16" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <div 
                className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider shadow-md backdrop-blur-md"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </div>
            </div>
          ))}
        </div>
        {/* Empty State Label */}
        {elements.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="bg-white/95 border border-slate-200 shadow-sm px-6 py-3.5 rounded-2xl flex items-center gap-3 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                The canvas is yours. Select a tool to begin.
              </span>
            </div>
          </div>
        )}

        {/* Floating Creative Toolbar Pane */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 border border-slate-200 p-2 rounded-2xl shadow-lg flex flex-col gap-1.5 z-20 backdrop-blur-xs">
          {[
            { id: 'select', icon: Pointer, label: 'Select Cursor' },
            { id: 'pan', icon: Grab, label: 'Grab Pan Space' },
            { id: 'pencil', icon: Pencil, label: 'Pencil Tool' },
            { id: 'rect', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: Circle, label: 'Circle' },
            { id: 'text', icon: Type, label: 'Text Box' },
            { id: 'sticky', icon: Layers, label: 'Sticky Note' }
          ].map(item => {
            const Icon = item.icon;
            const isSelected = tool === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTool(item.id as any)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                  isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-[0_2px_8px_rgba(79,70,229,0.35)]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
              </button>
            );
          })}

          <span className="h-px bg-slate-200 my-1" />

          {/* Wipe Eraser */}
          <button
            onClick={() => setTool('eraser')}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
              tool === 'eraser' 
                ? 'bg-rose-600 border-rose-600 text-white font-bold shadow-[0_2px_8px_rgba(225,29,72,0.35)]' 
                : 'border-transparent text-slate-500 hover:text-rose-600 hover:bg-rose-50'
            }`}
            title="Eraser (click element to erase)"
          >
            <Eraser className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={handleClear}
            disabled={elements.length === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
            title="Clear all workspace drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Customizers Belt (Bottom Pane) */}
        {['pencil', 'rect', 'circle', 'text'].includes(tool) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 border border-slate-200 px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-3 z-20 backdrop-blur-xs">
            <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            
            {/* Colors Palette selectors - updated to premium options */}
            {['#4F46E5', '#3B82F6', '#10B981', '#EF4444', '#FBBF24', '#0F172A'].map(col => {
              const isSelected = color === col;
              return (
                <button
                  key={col}
                  onClick={() => setColor(col)}
                  className={`w-4.5 h-4.5 rounded-full transition-all cursor-pointer hover:scale-115 ${
                    isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white scale-110 shadow-lg' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: col }}
                />
              );
            })}

            <span className="w-px h-5 bg-slate-200 mx-1" />

            {/* Stroke Width control slider */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Width</span>
              <input 
                type="range" 
                min="1" 
                max="12" 
                value={lineWidth}
                onChange={e => setLineWidth(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" 
              />
              <span className="text-[9px] font-mono text-slate-600 w-3.5 font-bold">{lineWidth}</span>
            </div>
          </div>
        )}

        {/* Sticky notes color customizer palette */}
        {tool === 'sticky' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 border border-slate-200 px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-3 z-20 backdrop-blur-xs">
            <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            
            {/* Soft sticky note background options */}
            {[
              { hex: '#fbbf24', name: 'Amber' },
              { hex: '#f472b6', name: 'Rose' },
              { hex: '#60a5fa', name: 'Blue' },
              { hex: '#34d399', name: 'Green' },
              { hex: '#c084fc', name: 'Purple' }
            ].map(col => {
              const isSelected = stickyBg === col.hex;
              return (
                <button
                  key={col.hex}
                  onClick={() => setStickyBg(col.hex)}
                  className={`w-4.5 h-4.5 rounded-lg transition-all cursor-pointer hover:scale-115 ${
                    isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white scale-110 shadow-lg' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                />
              );
            })}
          </div>
        )}

      </div>

      {/* CUSTOM DIALOG POPUP: NO BROWSER PROMPT ALLOWED */}
      {textModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-30 flex items-center justify-center animate-fadeIn p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl w-full max-w-sm relative">
            
            <button 
              onClick={() => setTextModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              {modalTextType === 'sticky' ? (
                <>
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  Add Sticky Note
                </>
              ) : (
                <>
                  <Type className="w-3.5 h-3.5 text-indigo-600" />
                  Add Text Element
                </>
              )}
            </h3>

            <textarea
              autoFocus
              rows={3}
              value={modalInputVal}
              onChange={e => setModalInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleConfirmTextModal();
                }
              }}
              placeholder={modalTextType === 'sticky' ? "Type sticky note thoughts..." : "Type text element content..."}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none resize-none transition-all font-outfit"
            />

            {modalTextType === 'sticky' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Note Theme:</span>
                <div className="flex gap-1">
                  {['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#c084fc'].map(bg => (
                    <button
                      key={bg}
                      onClick={() => setStickyBg(bg)}
                      className={`w-4 h-4 rounded-full border border-black/10 transition-transform ${
                        stickyBg === bg ? 'scale-115 ring-2 ring-indigo-600 ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: bg }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setTextModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTextModal}
                disabled={!modalInputVal.trim()}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1"
              >
                <Check size={11} className="stroke-[3]" />
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
