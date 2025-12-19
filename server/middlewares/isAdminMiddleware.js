// server/middlewares/isAdminMiddleware.js

const isAdmin = (req, res, next) => {
    // Normaliser le rôle en minuscule pour comparaison
    const role = req.user.role?.toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
  };
  
  module.exports = isAdmin;
  