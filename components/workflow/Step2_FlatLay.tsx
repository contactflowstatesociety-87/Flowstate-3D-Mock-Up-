
import React from 'react';

interface Props {
  onGenerate: () => void;
  onEdit: () => void;
  onDownloadAll: () => void;
  onNext: () => void;
  isLoading: boolean;
  hasUploadedAssets: boolean;
  hasGeneratedLays: boolean;
  selectedCount: number;
}

const Step2FlatLay: React.FC<Props> = ({ onGenerate, onEdit, onDownloadAll, onNext, isLoading, hasUploadedAssets, hasGeneratedLays, selectedCount }) => {
  return (
    <>
      <p className="text-text-subtle text-sm leading-relaxed">
        Our AI will convert your photo into a 4K studio quality flat lay, preserving every detail while cleaning up the background.
      </p>
      <button
        onClick={onGenerate}
        disabled={isLoading || !hasUploadedAssets}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:text-text-subtle disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/10"
      >
        {isLoading ? 'Generating...' : (hasGeneratedLays ? 'Regenerate Assets' : 'Generate Assets')}
      </button>

      {hasGeneratedLays && (
        <div className="space-y-3 pt-6 border-t border-surface-light">
           <p className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">Actions</p>
           
           <button
              onClick={onDownloadAll}
              className="w-full bg-surface-light text-text font-medium py-2.5 rounded-lg hover:bg-surface-lighter transition-colors flex items-center justify-center gap-2 border border-surface-lighter"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download All Options
           </button>
           
           {selectedCount === 1 ? (
               <button
                onClick={onEdit}
                className="w-full bg-brand-green text-white font-medium py-2.5 rounded-lg hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-green/10"
               >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                   </svg>
                   Edit / Fix Selected
               </button>
           ) : (
               <div className="text-xs text-text-subtle text-center italic p-2.5 border border-dashed border-surface-light rounded-lg">
                   {selectedCount === 0 ? "Select an image to enable editing." : "Select only one image to edit."}
               </div>
           )}

            <button
                onClick={onNext}
                disabled={selectedCount === 0}
                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:text-text-subtle disabled:cursor-not-allowed transition-all mt-4 shadow-lg shadow-primary/20"
            >
                Next: Create Animation {selectedCount > 0 ? `(${selectedCount})` : ''} &rarr;
            </button>
        </div>
      )}
    </>
  );
};

export default Step2FlatLay;
