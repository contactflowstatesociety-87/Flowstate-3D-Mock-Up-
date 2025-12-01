
import React, { useRef, useState, useEffect } from 'react';

interface ImageEditorModalProps {
  imageUrl: string;
  onSave: (modifiedImageBase64: string, prompt: string) => void;
  onClose: () => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageUrl, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [prompt, setPrompt] = useState('');
  const [brushColor, setBrushColor] = useState('#EF4444'); // Default Red
  const [brushSize, setBrushSize] = useState(20);
  const [zoom, setZoom] = useState(1);

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && containerRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      img.onload = () => {
        // Calculate aspect ratio to fit in modal initially (Reset Zoom)
        // We set internal resolution to match the image, display size is handled via CSS/style
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Initial fit logic could go here if we wanted to set an initial zoom < 1 for huge images
        // For now, we rely on the container's max-height/width and 100% display style logic if needed
        // But for zoom to work best, we'll control width/height style explicitly based on zoom
      };
    }
  }, [imageUrl]);

  const getPointerPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getPointerPos(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getPointerPos(e);

    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor; 
    ctx.lineWidth = brushSize; // This is in internal pixels. Visual size scales with zoom.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // For eraser, we can just paint white if the background is assumed to be the image.
    // If we were dealing with layers, we'd use 'destination-out'.
    // Painting white over the image is effectively "erasing the red markup" to restore the base (if base is white) 
    // OR it acts as a white markup. 
    // Since the prompt instructs the AI to ignore "markup lines", painting white is treated as markup too.
    // Ideally, "Erase" should restore the original image pixels, but we don't have layers here.
    // So "Eraser" acts as a "White Brush". 
    // To make it distinct, maybe we stick to just painting over.
    
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.closePath();
        setIsDrawing(false);
    }
  };

  const handleApply = () => {
    if (!prompt.trim()) {
        alert("Please describe what you want to change in the Prompt box.");
        return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        onSave(base64, prompt);
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.1));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 bg-surface-dark/95 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] border border-surface-lighter flex flex-col">
        
        <div className="p-4 border-b border-surface-lighter flex justify-between items-center bg-surface-light rounded-t-lg z-10">
          <div>
              <h2 className="text-xl font-bold text-text">Markup & Edit Tool</h2>
              <p className="text-xs text-text-subtle">Highlight areas to fix, zoom in for details.</p>
          </div>
          <button onClick={onClose} className="text-text-subtle hover:text-text p-2 hover:bg-surface-lighter rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Canvas Container with Scroll */}
        <div className="flex-grow overflow-auto bg-surface-dark/50 relative flex items-center justify-center p-8" ref={containerRef}>
           {/* We use inline styles for width/height to control display size (Zoom) independent of resolution */}
           <canvas 
             ref={canvasRef} 
             onMouseDown={startDrawing}
             onMouseMove={draw}
             onMouseUp={stopDrawing}
             onMouseLeave={stopDrawing}
             style={{ 
                 width: canvasRef.current ? canvasRef.current.width * zoom : 'auto', 
                 height: canvasRef.current ? canvasRef.current.height * zoom : 'auto',
                 maxWidth: 'none', // Allow overflow for scrolling
                 maxHeight: 'none'
             }}
             className="border border-surface-lighter shadow-lg cursor-crosshair bg-white block"
           />
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-surface-light border-t border-surface-lighter">
           <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
               
               {/* Left Controls: Zoom & Tools */}
               <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                   {/* Zoom Controls */}
                   <div className="flex items-center gap-1 bg-surface-lighter rounded-lg p-1">
                        <button onClick={handleZoomOut} className="p-2 hover:bg-surface-light rounded text-text" title="Zoom Out">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                        </button>
                        <span className="text-xs font-mono w-12 text-center text-text">{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className="p-2 hover:bg-surface-light rounded text-text" title="Zoom In">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <button onClick={handleResetZoom} className="p-2 hover:bg-surface-light rounded text-text ml-1" title="Reset Zoom">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        </button>
                   </div>

                   <div className="w-px h-10 bg-surface-lighter hidden sm:block"></div>

                   {/* Brush Tools */}
                   <div className="flex items-center gap-4">
                      <div className="flex bg-surface-lighter rounded-lg p-1">
                          <button 
                            onClick={() => setTool('brush')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tool === 'brush' ? 'bg-primary text-white shadow-sm' : 'text-text-subtle hover:text-text'}`}
                          >
                            Brush
                          </button>
                          <button 
                            onClick={() => setTool('eraser')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tool === 'eraser' ? 'bg-primary text-white shadow-sm' : 'text-text-subtle hover:text-text'}`}
                          >
                            Eraser
                          </button>
                      </div>
                      
                      {tool === 'brush' && (
                          <div className="flex gap-1">
                              <button onClick={() => setBrushColor('#EF4444')} className={`w-6 h-6 rounded-full bg-red-500 ring-2 ring-offset-1 ring-offset-surface-light ${brushColor === '#EF4444' ? 'ring-text' : 'ring-transparent'}`} />
                              <button onClick={() => setBrushColor('#10B981')} className={`w-6 h-6 rounded-full bg-green-500 ring-2 ring-offset-1 ring-offset-surface-light ${brushColor === '#10B981' ? 'ring-text' : 'ring-transparent'}`} />
                              <button onClick={() => setBrushColor('#3B82F6')} className={`w-6 h-6 rounded-full bg-blue-500 ring-2 ring-offset-1 ring-offset-surface-light ${brushColor === '#3B82F6' ? 'ring-text' : 'ring-transparent'}`} />
                          </div>
                      )}

                      <div className="flex flex-col justify-center w-24">
                         <div className="flex justify-between text-[10px] text-text-subtle mb-1">
                             <span>Size</span>
                             <span>{brushSize}px</span>
                         </div>
                         <input 
                            type="range" 
                            min="1" max="100" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-full h-1 bg-surface-lighter rounded-lg appearance-none cursor-pointer accent-primary"
                         />
                      </div>
                   </div>
               </div>
               
               {/* Right Controls: Prompt & Action */}
               <div className="w-full lg:w-1/2 flex flex-col gap-2">
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the fix (e.g. Remove logo, change color to black...)"
                        className="flex-grow px-4 py-2 bg-surface-lighter rounded-lg border border-transparent focus:border-primary focus:outline-none text-text placeholder-text-subtle"
                      />
                      <button 
                        onClick={handleApply}
                        className="px-6 py-2 bg-brand-green text-white font-bold rounded-lg hover:bg-brand-green-dark transition-colors shadow-lg shadow-brand-green/20 whitespace-nowrap"
                      >
                        Apply Fix
                      </button>
                  </div>
                  <p className="text-xs text-text-subtle">
                      <span className="font-bold text-brand-red">Note:</span> The red areas will be regenerated based on your prompt. All other areas will remain 100% identical.
                  </p>
               </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ImageEditorModal;
