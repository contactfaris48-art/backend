import { CacheNode, CacheStats } from '../types';
import { config } from '../config';

export class LRUCache<T> {
  private cache: Map<string, CacheNode<T>>;
  private head: CacheNode<T> | null;
  private tail: CacheNode<T> | null;
  private maxSize: number;
  private stats: Omit<CacheStats, 'averageResponseTime'>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.head = null;
    this.tail = null;
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      totalResponseTime: 0,
      requestCount: 0,
    };
    this.cleanupInterval = null;
    this.startCleanup();
  }

  get(key: string): T | null {
    const node = this.cache.get(key);

    if (!node) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > node.expiresAt) {
      this.removeNode(node);
      this.stats.misses++;
      return null;
    }

    this.moveToFront(node);
    this.stats.hits++;
    return node.value;
  }

  set(key: string, value: T, ttl: number = config.cache.ttl): void {
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!;
      node.value = value;
      node.expiresAt = Date.now() + ttl;
      this.moveToFront(node);
      return;
    }

    if (this.stats.size >= this.maxSize) {
      this.evictLRU();
    }

    const newNode: CacheNode<T> = {
      key,
      value,
      expiresAt: Date.now() + ttl,
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = newNode;
    } else {
      this.tail = newNode;
    }

    this.head = newNode;
    this.cache.set(key, newNode);
    this.stats.size++;
  }

  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    if (Date.now() > node.expiresAt) {
      this.removeNode(node);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    this.removeNode(node);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.stats.size = 0;
  }

  getStats(): CacheStats {
    const averageResponseTime =
      this.stats.requestCount > 0
        ? this.stats.totalResponseTime / this.stats.requestCount
        : 0;

    return {
      ...this.stats,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    };
  }

  recordResponseTime(duration: number): void {
    this.stats.totalResponseTime += duration;
    this.stats.requestCount++;
  }

  private moveToFront(node: CacheNode<T>): void {
    if (node === this.head) return;

    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
  }

  private evictLRU(): void {
    if (!this.tail) return;
    this.removeNode(this.tail);
  }

  private removeNode(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.cache.delete(node.key);
    this.stats.size--;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, config.cache.cleanupInterval);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, node] of this.cache.entries()) {
      if (now > node.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
      }
    });
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
