import { Request, Response, NextFunction } from 'express';
import { LRUCache } from '../lib/LRUCache';
import { User } from '../types';

export function responseTimeMiddleware(cache: LRUCache<User>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      cache.recordResponseTime(duration);
    });

    next();
  };
}
