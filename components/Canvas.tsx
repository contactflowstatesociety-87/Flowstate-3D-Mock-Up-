
import React, { useRef } from 'react';
import type { Asset, WorkflowStep } from '../types';

interface CanvasProps {
  assets: Asset[];
  selectedAssetIds?: string[]; // Changed to array
  onAssetClick?: (asset: Asset) => void; // Primary action (Select)
  onPreview?: (asset: Asset) => void; // Secondary action (View Large)
  onDownload?: (asset: Asset) => void; // Tertiary action (Download)
  step: WorkflowStep;
}

const AssetItem: React.FC<{ 
    asset: Asset; 
    isSelected: boolean; 
    onPrimaryClick?: () => void; 
    onPreview?: () => void;
    onDownload?: () => void;
    isGrid: boolean; 
    onSaveFrame?: (videoEl: HTMLVideoElement) => void; 
}> = ({ asset, isSelected, onPrimaryClick, onPreview, onDownload, isGrid, onSaveFrame }) => {
  const isVideo = asset.type === 'video';
  const src = isVideo ? asset.processedUrl : `data:${asset.originalFile.type || 'image/png'};base64,${asset.originalB64}`;
  const videoRef = useRef<HTMLVideoElement>(null);

  const selectionClass = isSelected ? 'ring-4 ring-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'ring-1 ring-surface-lighter hover:ring-primary/50';
  
  const handleSaveFrameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current && onSaveFrame) {
      onSaveFrame(videoRef.current);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onPreview?.();
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownload?.();
  };

  return (
    <div 
        className={`relative group ${isGrid ? 'w-full h-64' : 'w-full h-full'} rounded-lg overflow-hidden bg-surface-light/30 transition-all duration-200 ${isGrid ? selectionClass : ''}`}
        onClick={onPrimaryClick || onPreview} // Fallback to preview if no primary action
    >
      {isVideo ? (
        <video ref={videoRef} src={src} controls muted loop className="w-full h-full object-contain" />
      ) : (
        <img src={src} alt={asset.prompt || 'asset'} className="w-full h-full object-contain" />
      )}

      {/* Overlay Controls - Visible on Hover */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 pointer-events-none">
          <div className="pointer-events-auto flex gap-2">
            {onPreview && (
                <button 
                    onClick={handlePreviewClick}
                    className="bg-surface-light/90 hover:bg-white text-surface-dark p-2 rounded-full shadow-lg transform hover:scale-110 transition-all"
                    title="Preview Full Screen"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                </button>
            )}
             {onDownload && (
                <button 
                    onClick={handleDownloadClick}
                    className="bg-surface-light/90 hover:bg-white text-surface-dark p-2 rounded-full shadow-lg transform hover:scale-110 transition-all"
                    title="Download"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            )}
          </div>
      </div>

      {/* Existing Save Frame Button for Video */}
      {isVideo && onSaveFrame && (
        <button
          onClick={handleSaveFrameClick}
          className="absolute bottom-2 right-2 bg-surface-dark/70 text-white px-2 py-1 rounded text-xs hover:bg-opacity-90 transition-all flex items-center gap-1 z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 00-1 1v5.586L6.293 6.293a1 1 0 10-1.414 1.414l5 5a1 1 0 001.414 0l5-5a1 1 0 00-1.414-1.414L11 9.586V4a1 1 0 00-1-1z" /><path d="M3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
          Frame
        </button>
      )}
      
      {/* Selection Badge */}
      {isSelected && isGrid && (
          <div className="absolute top-2 left-2 bg-primary text-white rounded-full p-1 shadow-md z-10">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
               </svg>
          </div>
      )}
      
      {/* Label Badge */}
      {asset.label && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate text-center">
            {asset.label}
        </div>
      )}
    </div>
  );
};


const EmptyState: React.FC<{ step: WorkflowStep }> = ({ step }) => {
    let title = "Your creation will appear here.";
    let message = "Follow the steps on the left to begin.";

    if (step === 'upload') {
        title = "Start Your Project";
        message = "Upload one or more product images to get started."
    } else if (step === 'flatlay' ) {
        title = "Ready to Generate";
        message = "Your uploaded image is ready. Click 'Generate Flat Lays' to create 4 unique options."
    }

    return (
        <div className="text-center text-text-subtle">
            <svg className="mx-auto h-24 w-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <p className="mt-4 text-xl font-semibold">{title}</p>
            <p className="mt-1 text-sm">{message}</p>
        </div>
    );
}

const Canvas: React.FC<CanvasProps> = ({ assets, selectedAssetIds, onAssetClick, onPreview, onDownload, step }) => {
  const isGrid = assets.length > 1;

  const handleSaveFrame = (videoEl: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    
    const link = document.createElement('a');
    link.download = `frame-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex-1 bg-surface-dark flex items-center justify-center rounded-lg relative p-4 overflow-hidden">
      {assets.length === 0 ? (
        <EmptyState step={step} />
      ) : isGrid ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full overflow-y-auto p-2">
            {assets.map(asset => (
                <AssetItem 
                    key={asset.id} 
                    asset={asset} 
                    isSelected={selectedAssetIds?.includes(asset.id) || false} 
                    onPrimaryClick={onAssetClick ? () => onAssetClick(asset) : undefined} 
                    onPreview={onPreview ? () => onPreview(asset) : undefined}
                    onDownload={onDownload ? () => onDownload(asset) : undefined}
                    isGrid={true} 
                    onSaveFrame={handleSaveFrame}
                />
            ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
            <AssetItem 
                asset={assets[0]} 
                isSelected={selectedAssetIds?.includes(assets[0].id) || false} 
                isGrid={false} 
                onSaveFrame={handleSaveFrame}
                onPreview={onPreview ? () => onPreview(assets[0]) : undefined}
                onDownload={onDownload ? () => onDownload(assets[0]) : undefined}
            />
        </div>
      )}
    </div>
  );
};

export default Canvas;
