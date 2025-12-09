import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { AppError } from '../middleware/errorHandler';

export class UserController {
  constructor(private userService: UserService) {}

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        throw new AppError('Invalid user ID', 400);
      }

      const user = await this.userService.getUserById(id);
      res.json(user);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else if (error instanceof Error && error.message.includes('not found')) {
        next(new AppError(`User with ID ${req.params.id} not found`, 404));
      } else {
        next(error);
      }
    }
  }

  createUser(req: Request, res: Response, next: NextFunction): void {
    try {
      const { name, email } = req.body;

      if (!name || !email) {
        throw new AppError('Name and email are required', 400);
      }

      const newUser = this.userService.createUser(name, email);
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  }
}
