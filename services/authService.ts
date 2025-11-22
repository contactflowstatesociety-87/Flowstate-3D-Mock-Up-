
import type { User } from '../types';
import { db } from './db';

const SESSION_KEY = 'virtual_threads_session_id';

// Simple hash for demo security (in production, use a real backend with bcrypt)
const fakeHash = async (password: string) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const register = async (email: string, password: string): Promise<User> => {
    const passwordHash = await fakeHash(password);
    const newUser = {
        id: `user-${Date.now()}`,
        email,
        passwordHash
    };
    
    const savedUser = await db.createUser(newUser);
    localStorage.setItem(SESSION_KEY, savedUser.id);
    return savedUser;
};

export const login = async (email: string, password: string): Promise<User> => {
    const userRecord = await db.getUserByEmail(email);
    const inputHash = await fakeHash(password);

    if (userRecord && userRecord.passwordHash === inputHash) {
        const { passwordHash, ...safeUser } = userRecord;
        localStorage.setItem(SESSION_KEY, safeUser.id);
        return safeUser;
    } else {
        throw new Error("Invalid email or password.");
    }
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    
    const user = await db.getUserById(userId);
    return user || null;
  } catch (error) {
    console.error("Error checking session", error);
    return null;
  }
};
