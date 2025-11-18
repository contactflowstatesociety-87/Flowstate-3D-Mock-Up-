
import React from 'react';

interface Props {
  onGenerate: () => void;
  onEdit: () => void;
  onDownloadAll: () => void;
  isLoading: boolean;
  hasUploadedAssets: boolean;
  hasGeneratedLays: boolean;
  hasSelectedFlatLay: boolean;
}

const Step2FlatLay: React.FC<Props> = ({ onGenerate, onEdit, onDownloadAll, isLoading, hasUploadedAssets, hasGeneratedLays, hasSelectedFlatLay }) => {
  return (
    <>
      <p className="text-text-subtle text-sm">
        Our AI will convert your photo into a 4K studio quality flat lay, preserving every detail while cleaning up the background.
      </p>
      <button
        onClick={onGenerate}
        disabled={isLoading || !hasUploadedAssets}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-lightest disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Generating...' : (hasGeneratedLays ? 'Regenerate Flat Lays' : 'Generate Flat Lays')}
      </button>

      {hasGeneratedLays && (
        <div className="space-y-3 pt-4 border-t border-surface-lighter">
           <p className="text-sm font-semibold text-text">Actions</p>
           
           <button
              onClick={onDownloadAll}
              className="w-full bg-surface-lighter text-text font-medium py-2 rounded-lg hover:bg-surface-lightest transition-colors flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download All 4 Options
           </button>
           
           {hasSelectedFlatLay ? (
               <button
                onClick={onEdit}
                className="w-full bg-brand-green text-white font-medium py-2 rounded-lg hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
               >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                   </svg>
                   Edit / Fix Selected
               </button>
           ) : (
               <p className="text-xs text-text-subtle text-center italic">Select an image on the right to Edit or Fix it.</p>
           )}
        </div>
      )}
    </>
  );
};

export default Step2FlatLay;
