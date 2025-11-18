
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
  const [brushSize, setBrushSize] = useState(10);

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && containerRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      img.onload = () => {
        // Calculate aspect ratio to fit in modal
        const maxWidth = containerRef.current!.clientWidth;
        const maxHeight = window.innerHeight * 0.5; // Max height 50vh
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
      };
    }
  }, [imageUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor; // Eraser paints white (or we could use destination-out)
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    // Note: For the AI, painting white is often better than transparency for "erasing" imperfections on a white/grey background.
    // If we wanted true transparency, we'd use ctx.globalCompositeOperation = 'destination-out'.
    // Given we are editing a flat lay on a background, painting over it is safer.
    
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

  return (
    <div className="fixed inset-0 bg-surface-dark/90 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light rounded-lg shadow-2xl w-full max-w-3xl border border-surface-lighter flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-surface-lighter flex justify-between items-center">
          <h2 className="text-xl font-bold text-text">Editor & Eraser Tool</h2>
          <button onClick={onClose} className="text-text-subtle hover:text-text">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex-grow overflow-auto flex flex-col items-center justify-center bg-surface-dark/50 relative" ref={containerRef}>
           <canvas 
             ref={canvasRef} 
             onMouseDown={startDrawing}
             onMouseMove={draw}
             onMouseUp={stopDrawing}
             onMouseLeave={stopDrawing}
             className="border border-surface-lighter shadow-sm cursor-crosshair bg-white"
           />
        </div>

        <div className="p-4 bg-surface-light border-t border-surface-lighter space-y-4">
           {/* Toolbar */}
           <div className="flex items-center gap-4">
              <div className="flex bg-surface-lighter rounded-md p-1">
                  <button 
                    onClick={() => setTool('brush')}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${tool === 'brush' ? 'bg-surface-light shadow text-primary' : 'text-text-subtle hover:text-text'}`}
                  >
                    Brush
                  </button>
                  <button 
                    onClick={() => setTool('eraser')}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${tool === 'eraser' ? 'bg-surface-light shadow text-primary' : 'text-text-subtle hover:text-text'}`}
                  >
                    Eraser
                  </button>
              </div>
              
              {tool === 'brush' && (
                  <div className="flex gap-2">
                      <button onClick={() => setBrushColor('#EF4444')} className={`w-6 h-6 rounded-full bg-red-500 ring-2 ${brushColor === '#EF4444' ? 'ring-white' : 'ring-transparent'}`} />
                      <button onClick={() => setBrushColor('#10B981')} className={`w-6 h-6 rounded-full bg-green-500 ring-2 ${brushColor === '#10B981' ? 'ring-white' : 'ring-transparent'}`} />
                      <button onClick={() => setBrushColor('#3B82F6')} className={`w-6 h-6 rounded-full bg-blue-500 ring-2 ${brushColor === '#3B82F6' ? 'ring-white' : 'ring-transparent'}`} />
                      <button onClick={() => setBrushColor('#000000')} className={`w-6 h-6 rounded-full bg-black ring-2 ${brushColor === '#000000' ? 'ring-white' : 'ring-transparent'}`} />
                  </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                 <span className="text-xs text-text-subtle">Size:</span>
                 <input 
                    type="range" 
                    min="1" max="50" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-24"
                 />
              </div>
           </div>

           {/* Prompt Input */}
           <div>
              <label className="block text-sm font-medium text-text mb-1">Instruction</label>
              <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Remove the red mark, change logo color to blue..."
                    className="flex-grow px-3 py-2 bg-surface-lighter rounded-md border border-transparent focus:border-primary focus:outline-none text-text"
                  />
                  <button 
                    onClick={handleApply}
                    className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors"
                  >
                    Apply Changes
                  </button>
              </div>
              <p className="text-xs text-text-subtle mt-1">
                  Use the brush/eraser to mark areas, then describe what you want to happen.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ImageEditorModal;
