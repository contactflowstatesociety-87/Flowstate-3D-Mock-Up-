import React from 'react';

interface Props {
  onGenerate: () => void;
  isLoading: boolean;
  hasUploadedAssets: boolean;
  hasGeneratedLays: boolean;
}

const Step2FlatLay: React.FC<Props> = ({ onGenerate, isLoading, hasUploadedAssets, hasGeneratedLays }) => {
  return (
    <>
      <p className="text-text-subtle text-sm">
        Our AI will generate 4 ultra-realistic, 4K flat lay options from your uploaded design.
      </p>
      <button
        onClick={onGenerate}
        disabled={isLoading || !hasUploadedAssets || hasGeneratedLays}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-lightest disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Generating...' : 'Generate Flat Lays'}
      </button>
      {hasGeneratedLays && (
        <div className="text-center text-sm text-brand-green-light bg-brand-green/10 p-3 rounded-md">
            <p className="font-semibold">Success!</p>
            <p className="text-text-subtle">Click on your favorite flat lay in the canvas to select it and proceed to the next step.</p>
        </div>
      )}
    </>
  );
};

export default Step2FlatLay;