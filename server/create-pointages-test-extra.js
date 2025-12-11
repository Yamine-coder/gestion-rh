/**
 * Créer des pointages de test pour simuler du travail sur le shift extra
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employeId = 114;
  const today = new Date('2025-12-09T00:00:00.000Z');
  const tomorrow = new Date('2025-12-10T00:00:00.000Z');
  
  // Supprimer les anciens pointages de test pour aujourd'hui
  const deleted = await prisma.pointage.deleteMany({
    where: { 
      userId: employeId, 
      horodatage: { 
        gte: today,
        lt: tomorrow
      } 
    }
  });
  console.log(`🗑️  ${deleted.count} ancien(s) pointage(s) supprimé(s)`);
  
  // Créer pointage arrivée à 20:00
  const arrivee = await prisma.pointage.create({
    data: {
      userId: employeId,
      type: 'arrivee',
      horodatage: new Date('2025-12-09T20:00:00.000Z')
    }
  });
  console.log(`✅ Arrivée créée (ID: ${arrivee.id}) - 20:00`);
  
  // Créer pointage départ à 22:30 (2h30 de travail)
  const depart = await prisma.pointage.create({
    data: {
      userId: employeId,
      type: 'depart',
      horodatage: new Date('2025-12-09T22:30:00.000Z')
    }
  });
  console.log(`✅ Départ créé (ID: ${depart.id}) - 22:30`);
  
  console.log('');
  console.log('📊 Résultat attendu:');
  console.log('   - Temps travaillé: 2h30');
  console.log('   - Jauge: ~62% (2.5h / 4h)');
  console.log('   - Premier: 20:00');
  console.log('   - Dernier: 22:30');
  console.log('   - Écart: -1.5h (reste 1h30 à faire)');
  console.log('');
  console.log('👉 Rafraîchissez la page de pointage (F5)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
