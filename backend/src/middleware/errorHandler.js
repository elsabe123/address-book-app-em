/**
 * Centralized error-handling middleware. Anything that reaches here is an
 * unexpected error (validation and not-found cases are handled directly in
 * the routes) — respond with a generic 500 and never leak internals
 * (stack traces, file paths, etc.) to the client.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error', details: [] });
}

/** 404 fallback for routes that don't match any known endpoint. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', details: [] });
}
