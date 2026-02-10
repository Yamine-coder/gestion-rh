// server/prisma/client.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV !== 'production' 
    ? ['warn', 'error'] 
    : ['error'],
});

module.exports = prisma;
