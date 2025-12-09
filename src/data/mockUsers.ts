import { User } from '../types';

const mockUsers: Record<number, User> = {
  1: { id: 1, name: 'John Doe', email: 'john@example.com' },
  2: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  3: { id: 3, name: 'Alice Johnson', email: 'alice@example.com' },
};

export function getUserById(id: number): User | null {
  return mockUsers[id] || null;
}

export function userExists(id: number): boolean {
  return id in mockUsers;
}

export function createUser(name: string, email: string): User {
  const maxId = Math.max(...Object.keys(mockUsers).map(Number), 0);
  const newId = maxId + 1;

  const newUser: User = {
    id: newId,
    name,
    email,
  };

  mockUsers[newId] = newUser;
  return newUser;
}

export function getAllUsers(): User[] {
  return Object.values(mockUsers);
}
