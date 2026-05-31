'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Pointer, Pencil, Square, Circle, Eraser, Trash2, Undo, Redo, ZoomIn, ZoomOut, 
  Download, Layers, Type, SquareDot, Palette, Grab, X, Sparkles, Check, HelpCircle
} from 'lucide-react';

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
  const [tool, setTool] = useState<'select' | 'pan' | 'pencil' | 'rect' | 'circle' | 'text' | 'sticky' | 'eraser'>('pencil');
  const [color, setColor] = useState('#06B6D4'); // Electric Cyan default
  const [stickyBg, setStickyBg] = useState('#fbbf24'); // Yellow default for sticky notes
  const [lineWidth, setLineWidth] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([]);

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

  // Multiplayer cursor positions (simulated drifting)
  const [remoteCursors, setRemoteCursors] = useState<MultiplayerCursor[]>([
    { id: '1', name: 'Sarah (UX)', color: '#ec4899', x: 250, y: 180, role: 'Designer' },
    { id: '2', name: 'Alex (Tech)', color: '#10b981', x: 500, y: 350, role: 'Developer' }
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drift remote cursors to represent active multiplayer presence
  useEffect(() => {
    let animationFrameId: number;
    let angle = 0;

    const drift = () => {
      angle += 0.02;
      setRemoteCursors(prev => prev.map((cursor, idx) => {
        const speed = idx === 0 ? 0.8 : 1.2;
        const dx = Math.sin(angle * speed) * 1.5;
        const dy = Math.cos(angle * speed) * 1.5;
        return {
          ...cursor,
          x: cursor.x + dx,
          y: cursor.y + dy
        };
      }));
      animationFrameId = requestAnimationFrame(drift);
    };

    drift();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Hydrate drawings from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem('cs_whiteboard_elements');
    if (saved) {
      try {
        setElements(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load whiteboard elements', e);
      }
    }
  }, []);

  // Save changes helper
  const saveElements = (newElements: DrawingElement[]) => {
    setElements(newElements);
    localStorage.setItem('cs_whiteboard_elements', JSON.stringify(newElements));
  };

  // Clear all elements
  const handleClear = () => {
    setUndoStack(prev => [...prev, [...elements]]);
    setRedoStack([]);
    saveElements([]);
  };

  // Undo/Redo logic
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, [...elements]]);
    setElements(previous);
    localStorage.setItem('cs_whiteboard_elements', JSON.stringify(previous));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, [...elements]]);
    setElements(nextState);
    localStorage.setItem('cs_whiteboard_elements', JSON.stringify(nextState));
  };

  // Canvas drawing effect
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset dimensions to cover container
    canvas.width = canvas.parentElement?.clientWidth || 1000;
    canvas.height = canvas.parentElement?.clientHeight || 650;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // 1. Apply zoom scale (centered around screen center or origin)
    ctx.scale(zoom / 100, zoom / 100);
    // 2. Apply translation pan offsets
    ctx.translate(panX, panY);

    // Render drawings
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

  // Pointer event start handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // Pan canvas behavior
    if (tool === 'pan' || e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Eraser behavior: delete clicked element
    if (tool === 'eraser') {
      setUndoStack(prev => [...prev, [...elements]]);
      const threshold = 15;
      const filtered = elements.filter(el => {
        // Distance check
        if (el.type === 'freehand' && el.points) {
          return !el.points.some(p => Math.hypot(p.x - coords.x, p.y - coords.y) < threshold);
        }
        if (el.type === 'rect' || el.type === 'circle') {
          const w = el.width || 0;
          const h = el.height || 0;
          // check box range
          const minX = Math.min(el.x, el.x + w);
          const maxX = Math.max(el.x, el.x + w);
          const minY = Math.min(el.y, el.y + h);
          const maxY = Math.max(el.y, el.y + h);
          return !(coords.x >= minX - threshold && coords.x <= maxX + threshold && coords.y >= minY - threshold && coords.y <= maxY + threshold);
        }
        if (el.type === 'text' || el.type === 'sticky') {
          const size = el.type === 'sticky' ? 140 : 100;
          return !(coords.x >= el.x && coords.x <= el.x + size && coords.y >= el.y && coords.y <= el.y + size);
        }
        return true;
      });
      if (filtered.length !== elements.length) {
        setRedoStack([]);
        saveElements(filtered);
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
    setUndoStack(prev => [...prev, [...elements]]);
    setRedoStack([]);

    if (tool === 'pencil') {
      const newEl: DrawingElement = {
        id: `el-${Date.now()}`,
        type: 'freehand',
        points: [{ x: coords.x, y: coords.y }],
        x: coords.x,
        y: coords.y,
        color,
        lineWidth
      };
      setElements(prev => [...prev, newEl]);
      setActiveElement(newEl);
    } else if (tool === 'rect' || tool === 'circle') {
      const newEl: DrawingElement = {
        id: `el-${Date.now()}`,
        type: tool,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        color,
        lineWidth
      };
      setElements(prev => [...prev, newEl]);
      setActiveElement(newEl);
    }
  };

  // Pointer move handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

    setElements(prev => prev.map(el => {
      if (el.id === activeElement.id) {
        if (el.type === 'freehand' && el.points) {
          return { ...el, points: [...el.points, { x: coords.x, y: coords.y }] };
        } else if (el.type === 'rect' || el.type === 'circle') {
          return { ...el, width: coords.x - el.x, height: coords.y - el.y };
        }
      }
      return el;
    }));
  };

  // Pointer end
  const handlePointerUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setActiveElement(null);
    localStorage.setItem('cs_whiteboard_elements', JSON.stringify(elements));
  };

  // Complete adding text or sticky note
  const handleConfirmTextModal = () => {
    if (!modalInputVal.trim()) {
      setTextModalOpen(false);
      return;
    }

    const newEl: DrawingElement = {
      id: `el-${Date.now()}`,
      type: modalTextType,
      x: modalCoords.x,
      y: modalCoords.y,
      color: modalTextType === 'sticky' ? '#0F172A' : color, // dark text on sticky
      stickyColor: modalTextType === 'sticky' ? stickyBg : undefined,
      lineWidth: 2,
      text: modalInputVal.trim()
    };

    setUndoStack(prev => [...prev, [...elements]]);
    setRedoStack([]);
    saveElements([...elements, newEl]);
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
    <div className="flex flex-col h-full w-full border border-slate-900 bg-slate-950/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl relative select-none">
      
      {/* Top Options Bar */}
      <div className="p-4 border-b border-slate-900/60 bg-slate-950/70 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Collaborative Canvas</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Multiplayer Vector Workspace</p>
          </div>
        </div>

        {/* Undo/Redo & Zoom Panel */}
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-850 px-3 py-1.5 rounded-2xl">
          <button 
            onClick={handleUndo} 
            disabled={undoStack.length === 0}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          
          <span className="w-px h-4 bg-slate-850 mx-1" />
          
          <button 
            onClick={() => setZoom(prev => Math.max(25, prev - 10))} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-450 font-bold w-12 text-center select-none">
            {zoom}%
          </span>
          <button 
            onClick={() => setZoom(prev => Math.min(300, prev + 10))} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-slate-850 mx-1" />

          <button 
            onClick={handleDownloadImage}
            className="p-1 hover:bg-slate-850 rounded-lg text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors"
            title="Download PNG snapshot"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Vector Grid Stage */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-slate-950 overflow-hidden"
        style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
      >
        {/* Subtle dark infinite dot pattern background */}
        <div 
          className="absolute inset-0 z-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)]"
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
                  className="absolute text-xs font-bold leading-tight px-1 py-0.5 rounded pointer-events-auto select-text selection:bg-cyan-500/30 text-left cursor-text"
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
                  className="absolute w-[130px] h-[130px] rounded-2xl shadow-2xl p-3 text-[11px] font-bold text-left pointer-events-auto select-text selection:bg-slate-900/30 flex flex-col justify-between cursor-move"
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
            <div className="bg-slate-900/80 border border-slate-850 px-6 py-3.5 rounded-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-black tracking-widest text-slate-350 uppercase">
                The canvas is yours. Select a tool to begin.
              </span>
            </div>
          </div>
        )}

        {/* Floating Creative Toolbar Pane */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-950/85 border border-slate-850 p-2 rounded-2xl shadow-2xl flex flex-col gap-1.5 z-20 backdrop-blur-md">
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
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                    : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
              </button>
            );
          })}

          <span className="h-px bg-slate-850 my-1" />

          {/* Wipe Eraser */}
          <button
            onClick={() => setTool('eraser')}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
              tool === 'eraser' 
                ? 'bg-rose-500 border-rose-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]' 
                : 'border-transparent text-slate-500 hover:text-rose-400 hover:bg-slate-900'
            }`}
            title="Eraser (click element to erase)"
          >
            <Eraser className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={handleClear}
            disabled={elements.length === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-450 hover:bg-rose-950/20 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
            title="Clear all workspace drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Customizers Belt (Bottom Pane) */}
        {['pencil', 'rect', 'circle', 'text'].includes(tool) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-850 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 z-20 backdrop-blur-md">
            <Palette className="w-3.5 h-3.5 text-slate-550 shrink-0" />
            
            {/* Colors Palette selectors */}
            {['#06B6D4', '#818CF8', '#10B981', '#F43F5E', '#FBBF24', '#F8FAFC'].map(col => {
              const isSelected = color === col;
              return (
                <button
                  key={col}
                  onClick={() => setColor(col)}
                  className={`w-4.5 h-4.5 rounded-full transition-all cursor-pointer hover:scale-115 ${
                    isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: col }}
                />
              );
            })}

            <span className="w-px h-5 bg-slate-850 mx-1" />

            {/* Stroke Width control slider */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Width</span>
              <input 
                type="range" 
                min="1" 
                max="12" 
                value={lineWidth}
                onChange={e => setLineWidth(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-850 rounded-full appearance-none cursor-pointer accent-cyan-400" 
              />
              <span className="text-[9px] font-mono text-slate-400 w-3.5 font-bold">{lineWidth}</span>
            </div>
          </div>
        )}

        {/* Sticky notes color customizer palette */}
        {tool === 'sticky' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-850 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 z-20 backdrop-blur-md">
            <Palette className="w-3.5 h-3.5 text-slate-550 shrink-0" />
            
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
                    isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg' : 'opacity-80'
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
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-30 flex items-center justify-center animate-fadeIn p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-2xl w-full max-w-sm relative">
            
            <button 
              onClick={() => setTextModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              {modalTextType === 'sticky' ? (
                <>
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Add Sticky Note
                </>
              ) : (
                <>
                  <Type className="w-3.5 h-3.5 text-cyan-400" />
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
              className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-700 outline-none resize-none transition-all font-outfit"
            />

            {modalTextType === 'sticky' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">Note Theme:</span>
                <div className="flex gap-1">
                  {['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#c084fc'].map(bg => (
                    <button
                      key={bg}
                      onClick={() => setStickyBg(bg)}
                      className={`w-4 h-4 rounded-full border border-black/10 transition-transform ${
                        stickyBg === bg ? 'scale-115 ring-1 ring-white/50' : ''
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
                className="flex-1 py-2 rounded-xl border border-slate-850 hover:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTextModal}
                disabled={!modalInputVal.trim()}
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-[10px] font-black uppercase tracking-wider text-slate-950 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-lg shadow-cyan-550/10 flex items-center justify-center gap-1"
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
