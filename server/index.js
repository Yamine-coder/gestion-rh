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

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globaux
app.use(cors());
app.use(bodyParser.json());

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
