import React, { useState, useEffect, useRef } from 'react';
import { UploadedImage } from '../types';
import { MoveHorizontal, RefreshCcw, Box } from 'lucide-react';

interface AvatarViewerProps {
  images: UploadedImage[];
  onRetake: () => void;
}

const AvatarViewer: React.FC<AvatarViewerProps> = ({ images, onRetake }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-rotate on mount
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging) {
        setActiveIndex((prev) => (prev + 1) % images.length);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [images.length, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    
    const delta = clientX - startX;
    const threshold = 50; // pixels to trigger change
    
    if (Math.abs(delta) > threshold) {
      if (delta > 0) {
        // Drag right -> Previous image (rotate left)
        setActiveIndex(prev => (prev - 1 + images.length) % images.length);
      } else {
        // Drag left -> Next image (rotate right)
        setActiveIndex(prev => (prev + 1) % images.length);
      }
      setStartX(clientX); // Reset start to prevent rapid spinning
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="w-full flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Box size={14} className="text-indigo-400" />
                3D Avatar Preview
            </span>
            <button 
                onClick={onRetake}
                className="text-xs text-zinc-500 hover:text-white underline"
            >
                Retake Scan
            </button>
        </div>

        <div 
            ref={containerRef}
            className="relative w-full aspect-[3/4] bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-xl overflow-hidden border border-zinc-700 cursor-grab active:cursor-grabbing shadow-2xl"
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleMouseUp}
        >
            {/* 3D Grid Floor Effect */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_bottom,transparent,black)] pointer-events-none" />

            {images.map((img, idx) => (
                <img 
                    key={img.id}
                    src={img.url}
                    alt={`Angle ${idx}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${idx === activeIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                />
            ))}

            {/* Interaction Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
                <MoveHorizontal size={14} className="text-white" />
                <span className="text-[10px] text-zinc-300">Drag to rotate</span>
            </div>

            {/* Scanning Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 animate-scan-line h-full w-full opacity-20 mix-blend-overlay" />
        </div>
        
        {/* Angle Indicators */}
        <div className="flex justify-center gap-2 mt-1">
            {images.map((_, idx) => (
                <div 
                    key={idx} 
                    className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-6 bg-indigo-500' : 'w-2 bg-zinc-700'}`}
                />
            ))}
        </div>
    </div>
  );
};

export default AvatarViewer;
