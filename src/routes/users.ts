import { Router } from 'express';
import { UserController } from '../controllers/userController';

export function createUsersRouter(userController: UserController): Router {
  const router = Router();

  router.get('/:id', (req, res, next) => userController.getUserById(req, res, next));

  router.post('/', (req, res, next) => userController.createUser(req, res, next));

  return router;
}
