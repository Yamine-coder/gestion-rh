// server/middlewares/isAdminMiddleware.js

/**
 * Middleware admin unifié — autorise admin ET manager
 * Remplace l'ancien isAdmin (admin-only) pour cohérence avec adminMiddleware
 */
const isAdmin = (req, res, next) => {
    // Normaliser le rôle en minuscule pour comparaison
    const role = req.user?.role?.toLowerCase();
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
  };
  
  module.exports = isAdmin;
  