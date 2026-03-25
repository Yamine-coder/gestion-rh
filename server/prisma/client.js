// server/prisma/client.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV !== 'production' 
    ? ['warn', 'error'] 
    : ['error'],
  // Optimisation connexion pour Neon free tier
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=30&connect_timeout=15'
    }
  }
});

// Gestion gracieuse de la fermeture
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
