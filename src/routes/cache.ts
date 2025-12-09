import { Router } from 'express';
import { CacheController } from '../controllers/cacheController';

export function createCacheRouter(cacheController: CacheController): Router {
  const router = Router();

  router.delete('/', (req, res) => cacheController.clearCache(req, res));

  return router;
}
