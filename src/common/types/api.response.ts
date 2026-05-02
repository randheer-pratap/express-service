/**
 * Every API response has this shape. Consumers can always
 * check `success` before touching `data`.
 *
 * Success:  { success: true,  data: T,    meta?: {...} }
 * Error:    { success: false, error: {...}              }
 */

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string; // correlation ID — ties error back to a specific request
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Factory helpers — use these in controllers instead of
 * hand-rolling the response shape every time.
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details ? { details } : {}), ...(requestId ? { requestId } : {}) },
  };
}
