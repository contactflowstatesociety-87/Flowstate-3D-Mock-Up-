
import type { User, Project } from '../types';

const DB_NAME = 'FlowstateDB';
const DB_VERSION = 1;
const USERS_STORE = 'users';
const PROJECTS_STORE = 'projects';

class Database {
  private db: IDBDatabase | null = null;

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("Database error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db!);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create Users Store
        if (!db.objectStoreNames.contains(USERS_STORE)) {
          const userStore = db.createObjectStore(USERS_STORE, { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // Create Projects Store
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          projectStore.createIndex('userId', 'userId', { unique: false });
          projectStore.createIndex('lastSaved', 'lastSaved', { unique: false });
        }
      };
    });
  }

  // --- Generic Helpers ---

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.open();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
    const store = await this.getStore(storeName, 'readonly');
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async put<T>(storeName: string, value: T): Promise<T> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async delete(storeName: string, key: string): Promise<void> {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- User Operations ---

  async createUser(user: User & { passwordHash: string }): Promise<User> {
    // Check email uniqueness
    const store = await this.getStore(USERS_STORE, 'readonly');
    const index = store.index('email');
    const existing = await new Promise<any>((resolve) => {
        const req = index.get(user.email);
        req.onsuccess = () => resolve(req.result);
    });
    
    if (existing) throw new Error("User with this email already exists.");

    await this.put(USERS_STORE, user);
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async getUserByEmail(email: string): Promise<User & { passwordHash: string } | undefined> {
    const store = await this.getStore(USERS_STORE, 'readonly');
    const index = store.index('email');
    return new Promise((resolve, reject) => {
      const request = index.get(email);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserById(id: string): Promise<User | undefined> {
      const user = await this.get<User & { passwordHash: string }>(USERS_STORE, id);
      if (!user) return undefined;
      const { passwordHash, ...safeUser } = user;
      return safeUser;
  }

  // --- Project Operations ---

  async saveProject(project: Project): Promise<Project> {
    return this.put(PROJECTS_STORE, project);
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return this.getAllByIndex(PROJECTS_STORE, 'userId', userId);
  }

  async getProjectById(projectId: string): Promise<Project | undefined> {
    return this.get(PROJECTS_STORE, projectId);
  }
  
  async deleteProject(projectId: string): Promise<void> {
      return this.delete(PROJECTS_STORE, projectId);
  }
}

export const db = new Database();
