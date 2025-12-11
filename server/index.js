// server/index.js
console.log('🔰 [ENTRY] index.js chargé');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
console.log('🟡 [BOOT] Requiring shiftRoutes...');
const shiftRoutes = require("./routes/shiftRoutes");
console.log('🟢 [BOOT] shiftRoutes loaded');

// Import des routes
console.log('🟡 [BOOT] Requiring authRoutes...');
const authRoutes = require('./routes/authRoutes');
console.log('🟢 [BOOT] authRoutes loaded');
console.log('🟡 [BOOT] Requiring userRoutes...');
const userRoutes = require('./routes/userRoutes');
console.log('🟢 [BOOT] userRoutes loaded');
console.log('🟡 [BOOT] Requiring pointageRoutes...');
const pointageRoutes = require('./routes/pointageRoutes');
console.log('🟢 [BOOT] pointageRoutes loaded');
console.log('🟡 [BOOT] Requiring congeRoutes...');
const congeRoutes = require('./routes/congeRoutes');
console.log('🟢 [BOOT] congeRoutes loaded');
console.log('🟡 [BOOT] Requiring adminRoutes...');
const adminRoutes = require('./routes/adminRoutes');
console.log('🟢 [BOOT] adminRoutes loaded');
console.log('🟡 [BOOT] Requiring comparisonRoutes...');
const comparisonRoutes = require('./routes/comparisonRoutes');
console.log('🟢 [BOOT] comparisonRoutes loaded');
console.log('🟡 [BOOT] Requiring rapportRoutes...');
const rapportRoutes = require('./routes/rapportRoutes');
console.log('🟢 [BOOT] rapportRoutes loaded');
console.log('🟡 [BOOT] Requiring statsRoutes...');
const statsRoutes = require('./routes/statsRoutes');
console.log('🟢 [BOOT] statsRoutes loaded');
console.log('🟡 [BOOT] Requiring anomaliesRoutes...');
const anomaliesRoutes = require('./routes/anomaliesRoutes');
console.log('🟢 [BOOT] anomaliesRoutes loaded');
console.log('🟡 [BOOT] Requiring navigoRoutes...');
const navigoRoutes = require('./routes/navigoRoutes');
console.log('🟢 [BOOT] navigoRoutes loaded');
console.log('🟡 [BOOT] Requiring modificationsRoutes...');
const modificationsRoutes = require('./routes/modificationsRoutes');
console.log('🟢 [BOOT] modificationsRoutes loaded');
console.log('🟡 [BOOT] Requiring profilRoutes...');
const profilRoutes = require('./routes/profilRoutes');
console.log('🟢 [BOOT] profilRoutes loaded');
console.log('🟡 [BOOT] Requiring documentsRoutes...');
const documentsRoutes = require('./routes/documentsRoutes');
console.log('🟢 [BOOT] documentsRoutes loaded');
console.log('🟡 [BOOT] Requiring notificationsRoutes...');
const notificationsRoutes = require('./routes/notificationsRoutes');
console.log('🟢 [BOOT] notificationsRoutes loaded');
console.log('🟡 [BOOT] Requiring paiementExtrasRoutes...');
const paiementExtrasRoutes = require('./routes/paiementExtrasRoutes');
console.log('🟢 [BOOT] paiementExtrasRoutes loaded');
console.log('🟡 [BOOT] Requiring alertesRoutes...');
const alertesRoutes = require('./routes/alertesRoutes');
console.log('🟢 [BOOT] alertesRoutes loaded');
console.log('🟡 [BOOT] Requiring remplacementRoutes...');
const remplacementRoutes = require('./routes/remplacementRoutes');
console.log('🟢 [BOOT] remplacementRoutes loaded');
console.log('🟡 [BOOT] Requiring consignesRoutes...');
const consignesRoutes = require('./routes/consignesRoutes');
console.log('🟢 [BOOT] consignesRoutes loaded');
console.log('🟡 [BOOT] Requiring fichesPosteRoutes...');
const fichesPosteRoutes = require('./routes/fichesPosteRoutes');
console.log('🟢 [BOOT] fichesPosteRoutes loaded');

// Import du scheduler d'anomalies temps réel
const anomalyScheduler = require('./services/anomalyScheduler');
console.log('🟢 [BOOT] anomalyScheduler loaded');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globaux
app.use(cors());
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
