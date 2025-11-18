import React from 'react';
import type { Asset } from '../types';

interface MediaPreviewModalProps {
  asset: Asset;
  onClose: () => void;
  onDownload: (asset: Asset) => void;
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ asset, onClose, onDownload }) => {
  const isVideo = asset.type === 'video';
  const src = isVideo ? asset.processedUrl : `data:${asset.originalFile.type};base64,${asset.originalB64}`;

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="absolute top-4 right-4 flex gap-4 z-10">
        <button 
            onClick={() => onDownload(asset)}
            className="bg-surface-light/20 hover:bg-surface-light/40 text-white p-3 rounded-full backdrop-blur-sm transition-all"
            title="Download Asset"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        </button>
        <button 
            onClick={onClose}
            className="bg-surface-light/20 hover:bg-surface-light/40 text-white p-3 rounded-full backdrop-blur-sm transition-all"
            title="Close Preview"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden p-4">
        {isVideo ? (
             <video 
                src={src} 
                controls 
                autoPlay 
                loop 
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
             />
        ) : (
            <img 
                src={src} 
                alt="Preview" 
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            />
        )}
      </div>
      <div className="text-white/50 text-sm mt-4 font-mono">
          {asset.originalFile.name}
      </div>
    </div>
  );
};

export default MediaPreviewModal;