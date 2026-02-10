/**
 * 🛡️ Middleware de validation Zod
 * Valide req.body, req.query ou req.params selon le schéma fourni
 */
const { z } = require('zod');

/**
 * Crée un middleware Express qui valide req.body avec un schéma Zod
 * @param {z.ZodSchema} schema - Schéma Zod
 * @returns {Function} middleware Express
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(i => i.message);
    return res.status(400).json({ error: errors[0], details: errors });
  }
  req.body = result.data; // Données nettoyées et typées
  next();
};

/**
 * Crée un middleware Express qui valide req.params
 */
const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: 'Paramètres invalides' });
  }
  next();
};

/**
 * Crée un middleware Express qui valide req.query
 */
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: 'Paramètres de requête invalides' });
  }
  req.query = result.data;
  next();
};

// =====================================================
// SCHEMAS DE VALIDATION
// =====================================================

const schemas = {
  // Auth
  signup: z.object({
    email: z.string().email('Email invalide').max(255),
    password: z.string().min(1, 'Mot de passe requis'),
    prenom: z.string().min(1, 'Prénom requis').max(100).optional(),
    nom: z.string().min(1, 'Nom requis').max(100).optional()
  }),

  login: z.object({
    email: z.string().email('Email invalide').max(255),
    password: z.string().min(1, 'Mot de passe requis')
  }),

  resetDemande: z.object({
    email: z.string().email('Email invalide').max(255)
  }),

  resetToken: z.object({
    token: z.string().min(1, 'Token requis'),
    nouveauMotDePasse: z.string().min(1, 'Nouveau mot de passe requis')
  }),

  onboarding: z.object({
    nouveauMotDePasse: z.string().min(1, 'Nouveau mot de passe requis')
  }),

  // Params communs
  idParam: z.object({
    id: z.string().regex(/^\d+$/, 'ID invalide')
  })
};

module.exports = { validateBody, validateParams, validateQuery, schemas };
