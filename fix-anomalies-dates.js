// Script pour corriger les dates des anomalies - avec timezone correcte
const prisma = require('./server/prisma/client');

async function fixDates() {
  try {
    // Forcer la date du 4 décembre 2025
    const today = new Date('2025-12-04T12:00:00.000Z');
    
    console.log('📅 Date cible:', today.toISOString().split('T')[0]);
    
    // Mettre à jour les 3 anomalies "du jour" pour Marco (ID 93)
    const typesToday = ['retard_modere', 'heures_sup_a_valider', 'depart_anticipe'];
    
    for (const type of typesToday) {
      const updated = await prisma.anomalie.updateMany({
        where: {
          employeId: 93,
          type: type,
          description: { contains: '[TEST-EMPLOYE]' }
        },
        data: {
          date: today
        }
      });
      console.log(`✅ ${type}: ${updated.count} mise(s) à jour`);
    }
    
    // Vérifier avec la même date
    const startOfDay = new Date('2025-12-04T00:00:00.000Z');
    const endOfDay = new Date('2025-12-05T00:00:00.000Z');
    
    const anomaliesAujourdhui = await prisma.anomalie.findMany({
      where: {
        employeId: 93,
        date: {
          gte: startOfDay,
          lt: endOfDay
        },
        statut: { not: 'obsolete' }
      }
    });
    
    console.log('\n📊 Anomalies pour le 4 décembre:', anomaliesAujourdhui.length);
    anomaliesAujourdhui.forEach(a => {
      console.log(`   - ${a.type} (${a.gravite}) - ${a.statut}`);
      console.log(`     Date en base: ${a.date.toISOString()}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDates();
