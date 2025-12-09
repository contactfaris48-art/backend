export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  totalResponseTime: number;
  requestCount: number;
  averageResponseTime: number;
}

export interface CacheNode<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
}

export interface QueueTask {
  userId: number;
  resolve: (value: User) => void;
  reject: (error: Error) => void;
}

export interface RateLimitInfo {
  windowStart: number;
  count: number;
  burstStart: number;
  burstCount: number;
}

