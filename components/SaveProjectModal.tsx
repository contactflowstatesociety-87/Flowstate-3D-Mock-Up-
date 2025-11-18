import React, { useState, useEffect } from 'react';

interface SaveProjectModalProps {
  projectName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

const SaveProjectModal: React.FC<SaveProjectModalProps> = ({ projectName, onSave, onClose }) => {
  const [name, setName] = useState(projectName);

  useEffect(() => {
    setName(projectName);
  }, [projectName]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-surface-dark/75 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light rounded-lg shadow-xl p-6 max-w-md w-full border border-surface-lighter">
        <h2 className="text-2xl font-bold text-text mb-4">Save Project</h2>
        <p className="text-text-subtle mb-6">Give your project a name to save your progress.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Summer Collection Mockups"
          className="w-full px-3 py-2 border border-surface-lighter bg-surface text-text placeholder-text-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-text-subtle hover:bg-surface-lighter">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-6 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveProjectModal;