// server/server-stable.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const shiftRoutes = require("./routes/shiftRoutes");

// Import des routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const pointageRoutes = require('./routes/pointageRoutes');
const congeRoutes = require('./routes/congeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const comparisonRoutes = require('./routes/comparisonRoutes');
const rapportRoutes = require('./routes/rapportRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globaux
app.use(cors());
app.use(bodyParser.json());

// Middleware de gestion d'erreur global
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
  });
});

// Routes principales
app.use('/auth', authRoutes);           
app.use('/user', userRoutes);           
app.use('/pointage', pointageRoutes);   
app.use('/conges', congeRoutes);        
app.use('/admin', adminRoutes);         
app.use("/shifts", shiftRoutes);
app.use("/api/comparison", comparisonRoutes); 
app.use("/api/rapports", rapportRoutes);   
app.use("/api/stats", statsRoutes);    

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serveur backend fonctionnel',
    timestamp: new Date().toISOString(),
    env: {
      JWT_SECRET: process.env.JWT_SECRET ? 'Défini' : 'NON DÉFINI',
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
});

// Gestion d'erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});

// Lancement du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur backend stable lancé sur http://0.0.0.0:${PORT}`);
  console.log(`🌐 Accessible depuis le réseau sur http://192.168.1.94:${PORT}`);
  console.log(`🔑 JWT_SECRET: ${process.env.JWT_SECRET ? 'Configuré ✅' : 'MANQUANT ❌'}`);
});
