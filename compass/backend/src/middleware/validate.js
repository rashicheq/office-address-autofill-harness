import { ValidationError } from "../core/errors.js";

// Usage: router.post("/", validate({ body: schema }), handler)
// Validated data is written back onto req[part] so handlers always see the
// parsed/coerced shape, never the raw request.
export function validate(schemas) {
  return (req, res, next) => {
    for (const part of Object.keys(schemas)) {
      const result = schemas[part].safeParse(req[part]);
      if (!result.success) {
        return next(new ValidationError(`Invalid ${part}`, result.error.flatten()));
      }
      req[part] = result.data;
    }
    next();
  };
}
