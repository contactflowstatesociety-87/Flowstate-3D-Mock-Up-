import React from 'react';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-surface-dark/80 flex flex-col items-center justify-center z-50 text-white">
      <div className="w-16 h-16 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
      <p className="mt-6 text-lg font-semibold tracking-wide text-center px-4">{message}</p>
    </div>
  );
};

export default Loader;