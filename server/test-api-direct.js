const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function testDirectAPI() {
  try {
    // Trouver un admin
    const admin = await prisma.user.findFirst({
      where: { 
        OR: [
          { role: 'ADMIN' },
          { email: 'test@admin.com' }
        ]
      }
    });
    
    if (!admin) {
      console.log('Aucun admin trouvé');
      return;
    }
    
    // Créer un token JWT pour l'admin
    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // Faire l'appel API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:5000/pointage/admin/pointages/jour/2025-08-21', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    
    if (response.status === 404) {
      console.log('Route non trouvée, essayons d\'autres routes...');
      // Test de base
      const testResponse = await fetch('http://localhost:5000/pointage/mes-pointages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Route mes-pointages:', testResponse.status);
      return;
    }
    
    const data = await response.json();
    console.log('Données reçues:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectAPI();
