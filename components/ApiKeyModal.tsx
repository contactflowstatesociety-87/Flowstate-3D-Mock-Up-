import React from 'react';

interface ApiKeyModalProps {
  onSelectKey: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSelectKey }) => {
  return (
    <div className="fixed inset-0 bg-surface-dark/75 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light rounded-lg shadow-xl p-8 max-w-md w-full border border-surface-lighter">
        <h2 className="text-2xl font-bold mb-4 text-text">API Key Required for Video Generation</h2>
        <p className="text-text-subtle mb-6">
          To use the advanced video generation features powered by Veo, you need to select an API key. This will associate usage with your project.
        </p>
        <p className="text-text-subtle mb-6 text-sm">
          For more information on billing, please visit the{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-light hover:underline"
          >
            official documentation
          </a>.
        </p>
        <button
          onClick={onSelectKey}
          className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover transition-colors text-lg"
        >
          Select API Key
        </button>
      </div>
    </div>
  );
};

export default ApiKeyModal;