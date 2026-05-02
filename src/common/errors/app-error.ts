/**
 * AppError is the base class for all application-level errors.
 *
 * Why extend Error? Because Express's global error handler receives
 * an `unknown` — we use `instanceof AppError` to distinguish our
 * intentional errors (404, 400, 403) from unexpected crashes.
 *
 * Why `isOperational`? Operational errors are expected failure cases
 * (user not found, invalid input). Non-operational errors are programmer
 * mistakes (null pointer, type error). We log them differently and —
 * in extreme cases — restart the process on non-operational errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    // Restore prototype chain — required when extending built-in classes in TS
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture a clean stack trace (excludes the AppError constructor itself)
    Error.captureStackTrace(this, this.constructor);
  }
}
