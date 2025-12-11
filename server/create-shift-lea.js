const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createShiftLeaToday() {
  try {
    console.log('🔌 Connexion à la base de données...');
    
    // Trouver Léa Garcia
    const lea = await prisma.user.findFirst({
      where: { 
        prenom: 'Léa',
        nom: 'Garcia'
      }
    });
    
    if (!lea) {
      console.log('❌ Léa Garcia non trouvée');
      await prisma.$disconnect();
      process.exit(1);
    }
    
    console.log(`👤 Léa Garcia trouvée - ID: ${lea.id}`);
    
    // Date du 29 novembre 2025
    const today = new Date('2025-11-29T00:00:00.000Z');
    console.log('📅 Date:', today.toISOString().split('T')[0]);
    
    // Supprimer les shifts existants pour aujourd'hui
    const deleted = await prisma.shift.deleteMany({
      where: {
        employeId: lea.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
    console.log(`🗑️ ${deleted.count} ancien(s) shift(s) supprimé(s)`);
    
    // Créer un nouveau shift avec deux créneaux
    const shift = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: today,
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ]
      }
    });
    
    console.log('✅ Shift créé pour le 29/11/2025!');
    console.log('   🌅 Matin: 09:00 → 13:00 (4h)');
    console.log('   🌆 Après-midi: 14:00 → 18:00 (4h)');
    console.log('   📋 ID shift:', shift.id);
    
    // Supprimer les pointages existants
    const deletedPointages = await prisma.pointage.deleteMany({
      where: {
        userId: lea.id,
        horodatage: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
    console.log(`🗑️ ${deletedPointages.count} ancien(s) pointage(s) supprimé(s)`);
    
    // Créer des pointages avec retards et heures sup
    const horodatageBase = '2025-11-29T';
    
    await prisma.pointage.create({
      data: {
        userId: lea.id,
        type: 'arrivee',
        horodatage: new Date(horodatageBase + '09:15:00.000Z')
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: lea.id,
        type: 'depart',
        horodatage: new Date(horodatageBase + '13:05:00.000Z')
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: lea.id,
        type: 'arrivee',
        horodatage: new Date(horodatageBase + '14:10:00.000Z')
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: lea.id,
        type: 'depart',
        horodatage: new Date(horodatageBase + '18:20:00.000Z')
      }
    });
    
    console.log('✅ Pointages créés:');
    console.log('   🔴 Matin: 09:15 → 13:05 (prévu 09:00-13:00)');
    console.log('      ⏰ Retard de 15min à l\'arrivée');
    console.log('      ⚠️ Départ 5min plus tôt');
    console.log('');
    console.log('   🔴 Après-midi: 14:10 → 18:20 (prévu 14:00-18:00)');
    console.log('      ⏰ Retard de 10min');
    console.log('      ⭐ Heures sup de 20min');
    
    await prisma.$disconnect();
    console.log('\n🎯 Maintenant active le bouton "Comparaison" dans le planning!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createShiftLeaToday();
