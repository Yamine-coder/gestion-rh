/**
 * Wrapper async pour les routes Express.
 * Attrape automatiquement les erreurs des fonctions async
 * et les transmet au global error handler via next(err).
 * 
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
