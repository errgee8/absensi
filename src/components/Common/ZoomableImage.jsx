import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Maximize2 } from 'lucide-react';

export default function ZoomableImage({
  src,
  alt = 'Foto',
  className = '',
  maxHeight = 'max-h-[75vh]',
  minScale = 1,
  maxScale = 5,
  initialScale = 1
}) {
  const [scale, setScale] = useState(initialScale);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const touchDistanceRef = useRef(null);

  // Reset scale & position when src changes
  useEffect(() => {
    setScale(initialScale);
    setPosition({ x: 0, y: 0 });
  }, [src, initialScale]);

  // Handle native wheel zoom with passive: false to properly prevent window scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomStep = 0.25;
      const direction = e.deltaY < 0 ? 1 : -1;
      
      setScale((prevScale) => {
        const nextScale = Math.min(maxScale, Math.max(minScale, Number((prevScale + direction * zoomStep).toFixed(2))));
        if (nextScale === minScale) {
          setPosition({ x: 0, y: 0 });
        }
        return nextScale;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [minScale, maxScale]);

  // Mouse Drag / Pan handlers
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Pinch & Pan handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Two fingers pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      // One finger pan
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistanceRef.current != null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchDistanceRef.current;
      touchDistanceRef.current = dist;

      setScale((prevScale) => {
        const nextScale = Math.min(maxScale, Math.max(minScale, Number((prevScale + delta * 0.01).toFixed(2))));
        if (nextScale === minScale) {
          setPosition({ x: 0, y: 0 });
        }
        return nextScale;
      });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsDragging(false);
  };

  // Double click toggles between 1x and 2.5x
  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const zoomIn = (e) => {
    e?.stopPropagation();
    setScale((prev) => Math.min(maxScale, Number((prev + 0.5).toFixed(2))));
  };

  const zoomOut = (e) => {
    e?.stopPropagation();
    setScale((prev) => {
      const next = Math.max(minScale, Number((prev - 0.5).toFixed(2)));
      if (next === minScale) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const resetZoom = (e) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none bg-slate-950 flex items-center justify-center rounded-2xl group ${className}`}
      style={{ touchAction: scale > 1 ? 'none' : 'auto' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      {/* Target Image with 2D Transform */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`w-auto h-auto ${maxHeight} object-contain transition-transform duration-75 ease-out ${
          scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        }`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center'
        }}
      />

      {/* Floating Zoom Controls Overlay */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/20 text-white shadow-xl z-10 transition-opacity">
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= minScale}
          className="p-1 rounded-full hover:bg-white/20 active:bg-white/30 disabled:opacity-30 transition"
          title="Zoom Out (Scroll Down)"
        >
          <ZoomOut className="w-4 h-4 stroke-[2.5]" />
        </button>

        <span className="text-[11px] font-mono font-black min-w-[42px] text-center text-amber-300">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= maxScale}
          className="p-1 rounded-full hover:bg-white/20 active:bg-white/30 disabled:opacity-30 transition"
          title="Zoom In (Scroll Up)"
        >
          <ZoomIn className="w-4 h-4 stroke-[2.5]" />
        </button>

        {scale > 1 && (
          <button
            type="button"
            onClick={resetZoom}
            className="p-1 ml-1 rounded-full hover:bg-white/20 active:bg-white/30 transition text-emerald-400"
            title="Reset Zoom (100%)"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Helper Tag / Hint */}
      <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-slate-300 border border-white/10 pointer-events-none opacity-85">
        <Move className="w-3 h-3 text-amber-300" />
        <span>Scroll wheel untuk Zoom In/Out {scale > 1 && '• Drag untuk geser'}</span>
      </div>
    </div>
  );
}
