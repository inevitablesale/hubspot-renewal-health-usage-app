import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { ApiResponse } from '../types';

/**
 * Validation middleware to check for validation errors from express-validator
 */
export function validateRequest(
  req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err: ExpressValidationError) => {
      if (err.type === 'field') {
        return `${err.path}: ${err.msg}`;
      }
      return err.msg;
    });
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: errorMessages.join(', ')
    });
    return;
  }
  next();
}

/**
 * Simple API key authentication middleware
 */
export function authenticateApiKey(
  req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    // If no API key is configured, skip authentication
    next();
    return;
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
    return;
  }

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse<null>>,
  _next: NextFunction
): void {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
}
