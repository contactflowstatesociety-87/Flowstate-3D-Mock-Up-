import type { User } from '../types';

const USERS_KEY = 'virtual_threads_users';
const SESSION_KEY = 'virtual_threads_session';

// In a real app, this would be a secure hash. For this demo, it's a simple simulation.
const fakeHash = (password: string) => `hashed_${password}_secret`;

const getUsers = (): User[] => {
  try {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error("Error parsing users from localStorage", error);
    return [];
  }
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const register = async (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();
      if (users.some(user => user.email === email)) {
        return reject(new Error("User with this email already exists."));
      }
      const newUser: User = { id: `user-${Date.now()}`, email };
      // In a real app, you would store the hashed password, not the user object directly like this.
      const userRecord = { ...newUser, passwordHash: fakeHash(password) };
      saveUsers([...users, userRecord]);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
      resolve(newUser);
    }, 500);
  });
};

export const login = async (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();
      const userRecord = users.find((user: any) => user.email === email && user.passwordHash === fakeHash(password));
      if (userRecord) {
        const user: User = { id: userRecord.id, email: userRecord.email };
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        resolve(user);
      } else {
        reject(new Error("Invalid email or password."));
      }
    }, 500);
  });
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error("Error parsing session from localStorage", error);
    return null;
  }
};