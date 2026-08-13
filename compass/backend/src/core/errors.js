export class AppError extends Error {
  constructor(message, { statusCode = 400, code = "BAD_REQUEST", details } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} not found: ${id}`, { statusCode: 404, code: "NOT_FOUND" });
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, { statusCode: 422, code: "VALIDATION_ERROR", details });
  }
}

// Centralized error handler — every module throws AppError subclasses and
// lets this shape the response, instead of each route hand-rolling status
// codes. Keeps the module layer free of HTTP concerns.
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } });
}
