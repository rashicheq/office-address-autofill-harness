// Express doesn't forward rejected promises to error middleware on its own —
// every async route handler gets wrapped in this rather than repeating
// try/catch in each module.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
