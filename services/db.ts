
import type { User, Project } from '../types';

const DB_NAME = 'FlowstateDB';
const DB_VERSION = 1;
const USERS_STORE = 'users';
const PROJECTS_STORE = 'projects';

class Database {
  private db: IDBDatabase | null = null;
  private openRequest: Promise<IDBDatabase> | null = null;

  private async open(): Promise<IDBDatabase> {
    // If we have a valid open connection, use it
    if (this.db) {
      return this.db;
    }

    // If an open request is already in progress, return that promise to prevent multiple opens
    if (this.openRequest) {
      return this.openRequest;
    }

    this.openRequest = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("Database error:", (event.target as IDBOpenDBRequest).error);
        this.openRequest = null;
        reject((event.target as IDBOpenDBRequest).error);
      };

      request.onsuccess = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;

        // Handle connection closure (e.g., manual close or error)
        database.onclose = () => {
          console.warn("Database connection closed unexpectedly.");
          this.db = null;
          this.openRequest = null;
        };

        // Handle version changes (e.g., another tab upgrades the DB)
        database.onversionchange = () => {
          console.warn("Database version change detected. Closing connection.");
          database.close();
          this.db = null;
          this.openRequest = null;
        };

        this.db = database;
        this.openRequest = null;
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

    return this.openRequest;
  }

  // --- Generic Helpers ---

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    try {
      const db = await this.open();
      const transaction = db.transaction(storeName, mode);
      return transaction.objectStore(storeName);
    } catch (error: any) {
      // Retry logic: If connection is closing or invalid, reset and try once more
      const isClosing = error.message && error.message.includes('closing');
      const isInvalidState = error.name === 'InvalidStateError';
      
      if (isClosing || isInvalidState) {
        console.warn('Database connection stale. Re-opening and retrying transaction...');
        this.db = null;
        this.openRequest = null;
        
        const db = await this.open();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
      }
      throw error;
    }
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
    // We check existence in authService, but doubly robust here:
    // We simply use put() which overwrites if ID matches, or adds if new.
    // However, if email index unique constraint is violated, it throws.
    
    // For local guest mode, email isn't critical, but let's handle it.
    try {
        await this.put(USERS_STORE, user);
    } catch(e) {
        // If it fails (likely email constraint), check if it's the same ID.
        const existing = await this.getUserById(user.id);
        if (existing) return existing; // Already exists, just return it.
        throw e;
    }
    
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

  async getUserById(id: string): Promise<User & { passwordHash: string } | undefined> {
      // Return full user object including hash (internal use), callers strip it
      return this.get<User & { passwordHash: string }>(USERS_STORE, id);
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
