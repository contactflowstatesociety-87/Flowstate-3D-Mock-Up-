import React, { useRef } from 'react';
import type { Asset, WorkflowStep } from '../types';

interface CanvasProps {
  assets: Asset[];
  selectedAssetId?: string;
  onAssetClick?: (asset: Asset) => void;
  step: WorkflowStep;
}

const AssetItem: React.FC<{ asset: Asset; isSelected: boolean; onClick?: () => void; isGrid: boolean; onSaveFrame?: (videoEl: HTMLVideoElement) => void; }> = ({ asset, isSelected, onClick, isGrid, onSaveFrame }) => {
  const isVideo = asset.type === 'video';
  const src = isVideo ? asset.processedUrl : `data:${asset.originalFile.type || 'image/png'};base64,${asset.originalB64}`;
  const videoRef = useRef<HTMLVideoElement>(null);

  const selectionClass = isSelected ? 'ring-4 ring-primary' : 'ring-2 ring-transparent';
  const hoverClass = onClick ? 'hover:ring-primary cursor-pointer' : '';

  const handleSaveFrameClick = () => {
    if (videoRef.current && onSaveFrame) {
      onSaveFrame(videoRef.current);
    }
  };

  return (
    <div className="w-full h-full relative">
      {isVideo ? (
        <video ref={videoRef} src={src} controls autoPlay loop className="w-full h-full object-contain" />
      ) : (
        <img src={src} alt={asset.prompt || 'asset'} className={`w-full h-full object-contain transition-all duration-200 ${isGrid ? `${selectionClass} ${hoverClass} rounded-lg` : ''}`} onClick={onClick} />
      )}
      {isVideo && onSaveFrame && (
        <button
          onClick={handleSaveFrameClick}
          className="absolute bottom-4 right-4 bg-surface-dark/50 text-white px-3 py-2 rounded-lg text-sm hover:bg-opacity-75 transition-all flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 00-1 1v5.586L6.293 6.293a1 1 0 10-1.414 1.414l5 5a1 1 0 001.414 0l5-5a1 1 0 00-1.414-1.414L11 9.586V4a1 1 0 00-1-1z" /><path d="M3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
          Save Frame
        </button>
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

const Canvas: React.FC<CanvasProps> = ({ assets, selectedAssetId, onAssetClick, step }) => {
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
    <div className="flex-1 bg-surface-dark flex items-center justify-center rounded-lg relative p-4">
      {assets.length === 0 ? (
        <EmptyState step={step} />
      ) : isGrid ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {assets.map(asset => (
                <AssetItem key={asset.id} asset={asset} isSelected={asset.id === selectedAssetId} onClick={() => onAssetClick?.(asset)} isGrid={true} />
            ))}
        </div>
      ) : (
        <AssetItem asset={assets[0]} isSelected={assets[0].id === selectedAssetId} isGrid={false} onSaveFrame={handleSaveFrame} />
      )}
    </div>
  );
};

export default Canvas;