
import type { User } from '../types';
import { db } from './db';

const SESSION_KEY = 'virtual_threads_session_id';

export const initializeSession = async (): Promise<User> => {
    let userId = localStorage.getItem(SESSION_KEY);
    
    // If no session exists, create a new persistent ID
    if (!userId) {
        userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(SESSION_KEY, userId);
    }

    // Try to get existing user record
    let user = await db.getUserById(userId);

    // If user record is missing (first time or DB cleared), create it
    if (!user) {
        const newUser: User & { passwordHash: string } = {
            id: userId,
            email: 'Designer', // Default display name
            passwordHash: '' // Not used for local auth
        };
        try {
            await db.createUser(newUser);
            user = newUser;
        } catch (e) {
            // If create fails (e.g., race condition), try getting again
            user = await db.getUserById(userId);
            if (!user) throw e;
        }
    }

    const { passwordHash, ...safeUser } = user!;
    return safeUser;
};

export const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
};

export const getCurrentUser = async (): Promise<User | null> => {
  return initializeSession();
};
