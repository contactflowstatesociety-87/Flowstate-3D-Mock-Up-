
import type { Project } from '../types';
import { db } from './db';

export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    return await db.getProjectsByUserId(userId);
};

export const saveProject = async (project: Project): Promise<Project> => {
    return await db.saveProject(project);
};

export const loadProject = async (projectId: string): Promise<Project | null> => {
     const project = await db.getProjectById(projectId);
     return project || null;
};

export const deleteProject = async (projectId: string): Promise<void> => {
    return await db.deleteProject(projectId);
};
