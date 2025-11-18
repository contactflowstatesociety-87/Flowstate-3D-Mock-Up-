import React from 'react';
import type { Project } from '../types';

interface ProjectsModalProps {
  projects: Project[];
  onLoad: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onClose: () => void;
}

const ProjectsModal: React.FC<ProjectsModalProps> = ({ projects, onLoad, onDelete, onClose }) => {
  return (
    <div className="fixed inset-0 bg-surface-dark/75 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light rounded-lg shadow-xl p-6 max-w-2xl w-full border border-surface-lighter flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-text">My Projects</h2>
          <button onClick={onClose} className="text-text-subtle hover:text-text">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto pr-2">
          {projects.length === 0 ? (
            <p className="text-text-subtle text-center py-8">You have no saved projects.</p>
          ) : (
            <ul className="space-y-3">
              {projects.map(project => (
                <li key={project.id} className="bg-surface-lighter/50 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-text">{project.name}</p>
                    <p className="text-sm text-text-subtle">Last saved: {new Date(project.lastSaved).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onLoad(project)}
                      className="bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => onDelete(project.id)}
                      className="bg-brand-red text-white p-2 rounded-full hover:bg-brand-red-hover transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsModal;
