// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

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
const externalApisRoutes = require('./routes/externalApisRoutes');

// Import du scheduler d'anomalies temps réel
const anomalyScheduler = require('./services/anomalyScheduler');

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
    
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS bloqué pour origin:', origin);
      callback(null, true); // En prod, on peut être plus strict
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middlewares globaux
app.use(cors(corsOptions));
// Augmenter la limite pour les créations en masse de shifts
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Servir les fichiers statiques (uploads)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use("/api/external", externalApisRoutes); // APIs externes (météo, matchs, fériés)

// Global Express error handler (placed before health/debug for catching async next(err))
app.use((err, req, res, next) => {
  console.error('🛑 [GLOBAL ERROR] Unhandled error middleware:', err);
  res.status(err.status || 500).json({ message: 'Erreur serveur interne', error: err.message });
});

// 🧪 Route de health check pour les tests
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serveur backend fonctionnel',
    timestamp: new Date().toISOString(),
    emailTestMode: process.env.EMAIL_PASSWORD === 'test-mode-disabled'
  });
});

// 🔍 Route de debug pour tester les routes stats
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        method: Object.keys(middleware.route.methods)[0].toUpperCase()
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.toString() + handler.route.path,
            method: Object.keys(handler.route.methods)[0].toUpperCase()
          });
        }
      });
    }
  });
  res.json({
    message: 'Routes disponibles',
    routes: routes.slice(0, 20), // Limiter pour éviter l'overflow
    statsRoutesLoaded: !!require('./routes/statsRoutes')
  });
});

// Lancement du serveur
console.log('🟡 [BOOT] Initialisation express terminée, démarrage écoute...');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur backend lancé sur http://0.0.0.0:${PORT}`);
  console.log(`🌐 Accessible depuis le réseau sur http://192.168.1.94:${PORT}`);
  
  // Démarrage du scheduler d'anomalies temps réel
  anomalyScheduler.start();
  console.log('⏰ [SCHEDULER] Détection automatique des anomalies activée');
});

// Process-level crash diagnostics
process.on('unhandledRejection', (reason, promise) => {
  console.error('🛑 [PROCESS] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🛑 [PROCESS] Uncaught Exception:', err);
});

// Optional heartbeat (temporary for debugging)
if (process.env.ENABLE_HEARTBEAT === 'true') {
  setInterval(() => {
    console.log('💓 Heartbeat: process alive', new Date().toISOString());
  }, 30000);
}

// Diagnostics de fin de vie du process
process.on('beforeExit', (code) => {
  console.log('⏳ [PROCESS] beforeExit déclenché avec code:', code);
});
process.on('exit', (code) => {
  console.log('🔚 [PROCESS] exit déclenché avec code:', code);
});
