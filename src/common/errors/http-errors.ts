import { AppError } from './app-error';

/**
 * Concrete error subclasses. Each maps to an HTTP status code and
 * a machine-readable error code.
 *
 * Error codes (e.g. 'USER_NOT_FOUND') are what your frontend and
 * API consumers switch on — NOT the message string, which can change.
 * This is a contract, so treat codes as stable identifiers.
 */

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, `${resource.toUpperCase().replace(' ', '_')}_NOT_FOUND`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    // isOperational = false — this is a programmer mistake, not a user error
    super(message, 500, 'INTERNAL_SERVER_ERROR', false);
  }
}
