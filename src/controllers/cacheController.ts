import { Request, Response } from 'express';
import { LRUCache } from '../lib/LRUCache';
import { User } from '../types';

export class CacheController {
  constructor(private cache: LRUCache<User>) {}

  clearCache(req: Request, res: Response): void {
    this.cache.clear();
    res.json({
      message: 'Cache cleared successfully',
    });
  }

  getCacheStatus(req: Request, res: Response): void {
    const stats = this.cache.getStats();
    res.json(stats);
  }
}
