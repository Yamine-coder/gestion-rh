// Créer un admin de test

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Supprimer l'ancien admin de test s'il existe
    await prisma.user.deleteMany({
      where: { email: 'test@admin.com' }
    });
    
    // Créer le nouvel admin
    const admin = await prisma.user.create({
      data: {
        email: 'test@admin.com',
        password: hashedPassword,
        nom: 'Test',
        prenom: 'Admin',
        role: 'admin'
      }
    });
    
    console.log('✅ Admin de test créé:', {
      id: admin.id,
      email: admin.email,
      password: 'test123'
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAdmin();
