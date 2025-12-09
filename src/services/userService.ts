import { User } from '../types';
import { getUserById, userExists, createUser as createUserInStore } from '../data/mockUsers';
import { LRUCache } from '../lib/LRUCache';
import { AsyncQueue } from '../lib/AsyncQueue';

export class UserService {
  private cache: LRUCache<User>;
  private queue: AsyncQueue;
  private inFlightRequests: Map<number, Promise<User>>;

  constructor(cache: LRUCache<User>, queue: AsyncQueue) {
    this.cache = cache;
    this.queue = queue;
    this.inFlightRequests = new Map();
  }

  async getUserById(id: number): Promise<User> {
    const cached = this.cache.get(`user:${id}`);
    if (cached) {
      return cached;
    }

    const inFlight = this.inFlightRequests.get(id);
    if (inFlight) {
      return inFlight;
    }

    const promise = this.fetchUser(id);
    this.inFlightRequests.set(id, promise);

    try {
      const user = await promise;
      return user;
    } finally {
      this.inFlightRequests.delete(id);
    }
  }

  private async fetchUser(id: number): Promise<User> {
    if (!userExists(id)) {
      throw new Error(`User with ID ${id} not found`);
    }

    const user = await this.queue.enqueue(id);

    this.cache.set(`user:${id}`, user);

    return user;
  }

  createUser(name: string, email: string): User {
    const newUser = createUserInStore(name, email);
    this.cache.set(`user:${newUser.id}`, newUser);
    return newUser;
  }
}
