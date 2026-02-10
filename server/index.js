// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');

// Import des routes
const shiftRoutes = require("./routes/shiftRoutes");
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const pointageRoutes = require('./routes/pointageRoutes');
const congeRoutes = require('./routes/congeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const comparisonRoutes = require('./routes/comparisonRoutes');
const rapportRoutes = require('./routes/rapportRoutes');
const statsRoutes = require('./routes/statsRoutes');
const anomaliesRoutes = require('./routes/anomaliesRoutes');
const navigoRoutes = require('./routes/navigoRoutes');
const modificationsRoutes = require('./routes/modificationsRoutes');
const profilRoutes = require('./routes/profilRoutes');
const documentsRoutes = require('./routes/documentsRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const paiementExtrasRoutes = require('./routes/paiementExtrasRoutes');
const alertesRoutes = require('./routes/alertesRoutes');
const remplacementRoutes = require('./routes/remplacementRoutes');
const consignesRoutes = require('./routes/consignesRoutes');
const fichesPosteRoutes = require('./routes/fichesPosteRoutes');
const scoringRoutes = require('./routes/scoring');
const eventsRoutes = require('./routes/eventsRoutes');
const avisRoutes = require('./routes/avisRoutes');
const notificationsConfigRoutes = require('./routes/notificationsConfigRoutes');
const memoRoutes = require('./routes/memoRoutes');

// Import du scheduler d'anomalies temps réel
const anomalyScheduler = require('./services/anomalyScheduler');

// Import des crons
const avisAlertCron = require('./cron/avisAlertCron');
const { startAnomaliesCron } = require('./cron/anomaliesCron');
const { startScoringCron } = require('./cron/scoringCron');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration CORS pour production
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (apps mobiles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Accepter les origines explicites + le projet Vercel spécifique
    const isVercelProject = process.env.VERCEL_PROJECT_SLUG 
      ? origin.includes(process.env.VERCEL_PROJECT_SLUG) && origin.endsWith('.vercel.app')
      : false; // Pas de fallback permissif — VERCEL_PROJECT_SLUG requis en prod
    
    if (allowedOrigins.includes(origin) || isVercelProject) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('CORS bloqué pour origin:', origin);
        callback(null, true); // Permissif en dev
      } else {
        callback(new Error('Origin non autorisée par CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middlewares globaux
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));

// Rate limiting global (protection contre les abus)
const rateLimit = require('express-rate-limit');
const isDev = process.env.NODE_ENV !== 'production';
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 1000, // Généreux en dev, 1000 en prod (app mono-restaurant)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes.' },
  skip: (req) => req.path === '/health' || req.path.includes('/notifications/stream')
});
const apiSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 60, // 60 en prod pour les endpoints sensibles
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes sur cette ressource.' }
});
app.use(globalLimiter);
app.use('/api/stats/export', apiSensitiveLimiter);
app.use('/api/memo', apiSensitiveLimiter);
app.use('/api/notifications-config', apiSensitiveLimiter);

// Augmenter la limite pour les créations en masse de shifts
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));

// Servir les fichiers statiques (uploads) - protégé par auth
const path = require('path');
const { authMiddleware } = require('./middlewares/authMiddleware');
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, 'uploads')));

// Routes principales
app.use('/auth', authRoutes);           // Login / signup
app.use('/user', userRoutes);           // Profil utilisateur (ex : /user/profile)
app.use('/pointage', pointageRoutes);   // Pointage (arrivée, départ, historique)
app.use('/conges', congeRoutes);        // Demandes de congés
app.use('/admin', adminRoutes);         // Routes d'administration
app.use("/shifts", shiftRoutes);
app.use("/api/comparison", comparisonRoutes); // Comparaison planning vs réalité
app.use("/api/rapports", rapportRoutes);   // Rapports de présence/absence
app.use("/api/stats", statsRoutes);    // Statistiques détaillées et rapports employés
app.use("/api/anomalies", anomaliesRoutes); // Gestion des anomalies
app.use("/api/navigo", navigoRoutes); // Gestion des justificatifs Navigo
app.use("/api/modifications", modificationsRoutes); // Modifications employés et demandes de validation
app.use("/api/profil", profilRoutes); // Upload photo de profil
app.use("/api/documents", documentsRoutes); // Upload documents administratifs (domicile, RIB, Navigo)
app.use("/api/notifications", notificationsRoutes); // Notifications employés
app.use("/api/paiements-extras", paiementExtrasRoutes); // Paiements extras / heures sup en espèces
app.use("/api/alertes", alertesRoutes); // Alertes temps réel retards/absences
app.use("/api/remplacements", remplacementRoutes); // Système de remplacement entre employés
app.use("/api/consignes", consignesRoutes); // Consignes du jour + stats ponctualité
app.use("/api/fiches-poste", fichesPosteRoutes); // Fiches de poste PDF par catégorie
app.use("/api/scoring", scoringRoutes); // Système de scoring/points employés
app.use("/api/events", eventsRoutes); // Matchs de foot + événements locaux
app.use("/api/avis", avisRoutes); // Avis Google du restaurant
app.use("/api/notifications-config", notificationsConfigRoutes); // Config notifications email
app.use("/api/memo", memoRoutes); // Rappels mémo par email

// Route de health check (avant le error handler)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Global Express error handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err.message);
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erreur serveur interne' 
    : err.message;
  res.status(err.status || 500).json({ message });
});

// Lancement du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur backend lancé sur port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  
  // Démarrage du scheduler d'anomalies temps réel
  anomalyScheduler.start();
  
  // Démarrage des alertes email pour les avis négatifs
  avisAlertCron.startCronJobs();
  
  // Démarrage du cron pour le récap anomalies
  startAnomaliesCron();

  // Démarrage du cron scoring (bonus hebdo + malus 48h)
  startScoringCron();
});

// Process-level crash diagnostics
process.on('unhandledRejection', (reason, promise) => {
  console.error('[PROCESS] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[PROCESS] Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Graceful shutdown: fermer les connexions DB proprement
const gracefulShutdown = async (signal) => {
  console.log(`[PROCESS] ${signal} reçu, fermeture propre...`);
  try {
    const pool = require('./db/pool');
    await pool.end();
    const prisma = require('./prisma/client');
    await prisma.$disconnect();
  } catch (e) { /* ignore */ }
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Diagnostics de fin de vie du process
process.on('beforeExit', (code) => {
  if (code !== 0) console.log('[PROCESS] beforeExit code:', code);
});
process.on('exit', (code) => {
  if (code !== 0) console.log('[PROCESS] exit code:', code);
});
