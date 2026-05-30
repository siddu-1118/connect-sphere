'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Pointer, Pencil, Square, Circle, Eraser, Trash2, Undo, Redo, ZoomIn, ZoomOut, 
  Sparkles, Download, Layers, Type, SquareDot, Palette, AlertCircle 
} from 'lucide-react';
import Button from '../../../components/ui/Button';

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
}

export default function WhiteboardPage() {
  const [tool, setTool] = useState<'select' | 'pencil' | 'rect' | 'circle' | 'text' | 'sticky'>('pencil');
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([]);
  
  // Interactive drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeElement, setActiveElement] = useState<DrawingElement | null>(null);

  // Text inputs & sticky notes lists
  const [stickyContent, setStickyContent] = useState('');
  const [textInputContent, setTextInputContent] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear canvas
  const handleClear = () => {
    saveHistory();
    setElements([]);
  };

  // History tracking for undo/redo
  const saveHistory = () => {
    setUndoStack(prev => [...prev, [...elements]]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setElements(previous);
  };

  // Re-draw elements to HTML5 canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth || 1000;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    // Draw grid background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale for Zoom
    ctx.save();
    ctx.scale(zoom / 100, zoom / 100);

    // Render elements
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
  }, [elements, zoom]);

  // Pointer event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Account for zoom scaling
    const scale = 100 / zoom;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;

    setIsDrawing(true);
    saveHistory();

    if (tool === 'pencil') {
      const newEl: DrawingElement = {
        id: `el-${Date.now()}`,
        type: 'freehand',
        points: [{ x, y }],
        x,
        y,
        color,
        lineWidth
      };
      setElements(prev => [...prev, newEl]);
      setActiveElement(newEl);
    } else if (tool === 'rect') {
      const newEl: DrawingElement = {
        id: `el-${Date.now()}`,
        type: 'rect',
        x,
        y,
        width: 0,
        height: 0,
        color,
        lineWidth
      };
      setElements(prev => [...prev, newEl]);
      setActiveElement(newEl);
    } else if (tool === 'circle') {
      const newEl: DrawingElement = {
        id: `el-${Date.now()}`,
        type: 'circle',
        x,
        y,
        width: 0,
        height: 0,
        color,
        lineWidth
      };
      setElements(prev => [...prev, newEl]);
      setActiveElement(newEl);
    } else if (tool === 'text') {
      const textVal = prompt('Enter your text:') || '';
      if (textVal.trim()) {
        const newEl: DrawingElement = {
          id: `el-${Date.now()}`,
          type: 'text',
          x,
          y,
          color,
          lineWidth,
          text: textVal
        };
        setElements(prev => [...prev, newEl]);
      }
      setIsDrawing(false);
    } else if (tool === 'sticky') {
      const stickyText = prompt('Enter sticky note content:') || '';
      if (stickyText.trim()) {
        const newEl: DrawingElement = {
          id: `el-${Date.now()}`,
          type: 'sticky',
          x,
          y,
          color,
          lineWidth,
          text: stickyText
        };
        setElements(prev => [...prev, newEl]);
      }
      setIsDrawing(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeElement) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const scale = 100 / zoom;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;

    setElements(prev => prev.map(el => {
      if (el.id === activeElement.id) {
        if (el.type === 'freehand' && el.points) {
          return { ...el, points: [...el.points, { x, y }] };
        } else if (el.type === 'rect' || el.type === 'circle') {
          return { ...el, width: x - el.x, height: y - el.y };
        }
      }
      return el;
    }));
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setActiveElement(null);
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `connectsphere-whiteboard-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Elements start as a clean state without preset mock data

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] md:h-[calc(100vh-100px)] border border-slate-900 bg-slate-950/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl relative select-none">
      
      {/* Top Controls Overlay bar */}
      <div className="p-4 border-b border-slate-900/60 bg-slate-950/60 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Infinite Vector Canvas</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Multiplayer Collaboration Sandbox</p>
          </div>
        </div>

        {/* Undo/Redo & Zoom Controls */}
        <div className="flex items-center gap-2.5 bg-slate-900/40 border border-slate-850 px-3 py-1.5 rounded-2xl">
          <button 
            onClick={handleUndo} 
            disabled={undoStack.length === 0}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          
          <span className="w-px h-4 bg-slate-800" />
          
          <button 
            onClick={() => setZoom(prev => Math.max(50, prev - 10))} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-[10px] font-mono text-slate-400 font-bold w-12 text-center select-none">
            {zoom}%
          </span>
          
          <button 
            onClick={() => setZoom(prev => Math.min(200, prev + 10))} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-slate-800" />

          <button 
            onClick={handleDownloadImage}
            className="p-1 hover:bg-slate-800 rounded-lg text-emerald-400 hover:text-emerald-300 cursor-pointer"
            title="Download PNG snapshot"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Whiteboard draw area grid */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-slate-950/70 overflow-hidden cursor-crosshair bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:20px_20px]"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 z-0"
        />

        {/* Text overlays rendered as absolute HTML divs for premium aesthetic */}
        <div className="absolute inset-0 pointer-events-none scale-100 z-10" style={{ transform: `scale(${zoom/100})`, transformOrigin: '0 0' }}>
          {elements.map(el => {
            if (el.type === 'text') {
              return (
                <div
                  key={el.id}
                  className="absolute text-sm font-bold text-white px-2 py-1 select-text pointer-events-auto"
                  style={{ left: el.x, top: el.y, color: el.color }}
                >
                  {el.text}
                </div>
              );
            }
            if (el.type === 'sticky') {
              return (
                <div
                  key={el.id}
                  className="absolute w-40 aspect-square rounded-2xl shadow-xl p-4.5 text-xs text-slate-950 font-bold select-text pointer-events-auto flex flex-col justify-between"
                  style={{ 
                    left: el.x, 
                    top: el.y, 
                    backgroundColor: el.color === '#3b82f6' ? '#fbbf24' : el.color // Fallback sticky color
                  }}
                >
                  <p className="leading-snug">{el.text}</p>
                  <div className="text-[9px] text-slate-800/60 uppercase tracking-widest font-black pt-2 border-t border-slate-950/10">Sticky Note</div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Floating Tool belt (Left Pane) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-950/85 border border-slate-850 p-2 rounded-2xl shadow-2xl flex flex-col gap-2 z-20 backdrop-blur-md">
          {[
            { id: 'select', icon: Pointer, label: 'Select pointer' },
            { id: 'pencil', icon: Pencil, label: 'Freehand pencil' },
            { id: 'rect', icon: Square, label: 'Rectangle outline' },
            { id: 'circle', icon: SquareDot, label: 'Ellipse circle' },
            { id: 'text', icon: Type, label: 'Add text' },
            { id: 'sticky', icon: Layers, label: 'Sticky note card' }
          ].map(toolItem => {
            const Icon = toolItem.icon;
            const isSelected = tool === toolItem.id;
            return (
              <button
                key={toolItem.id}
                onClick={() => setTool(toolItem.id as any)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={toolItem.label}
              >
                <Icon className="w-4.5 h-4.5" />
              </button>
            );
          })}

          <span className="h-px bg-slate-850 my-1" />

          {/* Eraser / Wipe */}
          <button
            onClick={handleClear}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all cursor-pointer"
            title="Clear entire canvas"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Floating Color belt (Bottom Pane) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-850 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 z-20 backdrop-blur-md">
          <Palette className="w-4 h-4 text-slate-500 shrink-0" />
          
          {/* Colors */}
          {['#3b82f6', '#10b981', '#ef4444', '#a855f7', '#fbbf24', '#f8fafc'].map(col => {
            const isSelected = color === col;
            return (
              <button
                key={col}
                onClick={() => setColor(col)}
                className={`w-5 h-5 rounded-full border transition-transform cursor-pointer hover:scale-110 ${
                  isSelected ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                }`}
                style={{ backgroundColor: col }}
              />
            );
          })}

          <span className="w-px h-5 bg-slate-850" />

          {/* Stroke Width Slider */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Width</span>
            <input 
              type="range" 
              min="2" 
              max="15" 
              value={lineWidth}
              onChange={e => setLineWidth(parseInt(e.target.value))}
              className="w-16 h-1 bg-slate-850 rounded-full appearance-none cursor-pointer accent-blue-500" 
            />
            <span className="text-[10px] font-mono text-slate-400 w-4 font-bold">{lineWidth}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
