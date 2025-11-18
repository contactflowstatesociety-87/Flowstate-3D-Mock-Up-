
import React, { useRef } from 'react';

interface Props {
  onFilesUploaded: (files: File[]) => void;
  isLoading: boolean;
}

const Step1Upload: React.FC<Props> = ({ onFilesUploaded, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesUploaded(Array.from(event.target.files));
      // Reset the input value to allow re-uploading the same file.
      event.target.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <p className="text-text-subtle text-sm">
        Upload your product design. For best results, use a high-quality image with a transparent or simple background.
      </p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple={false} // For now, the flow works best with one primary image
      />
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-lightest disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        Upload Image
      </button>
      <p className="text-xs text-text-subtle/80 text-center">This will start the creation process.</p>
    </>
  );
};

export default Step1Upload;