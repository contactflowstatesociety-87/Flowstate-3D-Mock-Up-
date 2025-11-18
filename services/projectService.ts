import type { Project } from '../types';

const PROJECTS_KEY = 'virtual_threads_projects';

const getProjects = (): Project[] => {
    try {
        const projects = localStorage.getItem(PROJECTS_KEY);
        return projects ? JSON.parse(projects) : [];
    } catch (e) {
        console.error("Failed to parse projects from localStorage", e);
        return [];
    }
};

const saveAllProjects = (projects: Project[]) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    return new Promise((resolve) => {
        const allProjects = getProjects();
        const userProjects = allProjects.filter(p => p.userId === userId);
        resolve(userProjects);
    });
};

export const saveProject = async (project: Project): Promise<Project> => {
    return new Promise((resolve) => {
        const allProjects = getProjects();
        const existingIndex = allProjects.findIndex(p => p.id === project.id);

        if (existingIndex > -1) {
            allProjects[existingIndex] = project;
        } else {
            allProjects.push(project);
        }
        saveAllProjects(allProjects);
        resolve(project);
    });
};

export const loadProject = async (projectId: string): Promise<Project | null> => {
     return new Promise((resolve) => {
        const allProjects = getProjects();
        const project = allProjects.find(p => p.id === projectId) || null;
        resolve(project);
    });
};

export const deleteProject = async (projectId: string): Promise<void> => {
    return new Promise((resolve) => {
        let allProjects = getProjects();
        allProjects = allProjects.filter(p => p.id !== projectId);
        saveAllProjects(allProjects);
        resolve();
    });
};