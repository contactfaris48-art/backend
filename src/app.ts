import express, { Express } from 'express';
import cors from 'cors';
import { LRUCache } from './lib/LRUCache';
import { AsyncQueue } from './lib/AsyncQueue';
import { UserService } from './services/userService';
import { UserController } from './controllers/userController';
import { CacheController } from './controllers/cacheController';
import { User } from './types';
import { getUserById } from './data/mockUsers';
import { rateLimiter } from './middleware/rateLimiter';
import { responseTimeMiddleware } from './middleware/responseTime';
import { errorHandler } from './middleware/errorHandler';
import { createUsersRouter } from './routes/users';
import { createCacheRouter } from './routes/cache';

export function createApp(): Express {
  const app = express();

  const cache = new LRUCache<User>(100);
  const queue = new AsyncQueue(
    async (userId: number) => {
      const user = getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      return user;
    },
    3
  );

  const userService = new UserService(cache, queue);
  const userController = new UserController(userService);
  const cacheController = new CacheController(cache);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(responseTimeMiddleware(cache));
  app.use(rateLimiter);

  app.use('/users', createUsersRouter(userController));
  app.use('/cache', createCacheRouter(cacheController));
  app.get('/cache-status', (req, res) => cacheController.getCacheStatus(req, res));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
