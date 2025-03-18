import { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { userService } from '../services/userService';
import { validateUser } from '../validators/userValidator';

/**
 * Create a new user
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const userData = req.body;
  
  // Validate user data
  const validationError = validateUser(userData);
  if (validationError) {
    throw new AppError(`Invalid user data: ${validationError}`, 400);
  }
  
  const newUser = await userService.createUser(userData);
  
  res.status(201).json({
    status: 'success',
    data: {
      user: newUser
    }
  });
});

/**
 * Get user by ID
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  
  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400);
  }
  
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});
