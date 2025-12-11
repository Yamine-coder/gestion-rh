/**
 * Script pour créer un shift 100% extra (uniquement heures supplémentaires)
 * Pour tester l'affichage frontend
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Trouver l'employé test
  const employe = await prisma.user.findFirst({
    where: { email: 'test.extra@restaurant.com' }
  });

  if (!employe) {
    console.log('❌ Employé test.extra@restaurant.com non trouvé');
    return;
  }

  console.log(`👤 Employé trouvé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);

  // Date d'aujourd'hui (9 décembre 2025) à minuit UTC
  const today = new Date('2025-12-09T00:00:00.000Z');

  const deleted = await prisma.shift.deleteMany({
    where: {
      employeId: employe.id,
      date: today
    }
  });
  console.log(`🗑️  ${deleted.count} ancien(s) shift(s) supprimé(s) pour le 9 décembre`);

  // Créer un shift 100% extra (20:00 - 00:00)
  const shift = await prisma.shift.create({
    data: {
      employeId: employe.id,
      date: today,  // 9 décembre 2025
      type: 'présence',
      segments: [
        {
          start: '20:00',
          end: '00:00',
          isExtra: true,  // <-- 100% extra
          commentaire: 'Heures supplémentaires service du soir'
        }
      ]
    }
  });

  console.log(`\n✅ Shift 100% EXTRA créé (ID: ${shift.id})`);
  console.log(`📅 Date: ${shift.date.toISOString().split('T')[0]}`);
  console.log(`⏰ Horaire: 20:00 → 00:00 (4h extra)`);
  console.log(`\n🎯 Comportement attendu sur le frontend:`);
  console.log(`   - Titre: "Heures supplémentaires"`);
  console.log(`   - Badge: "EXTRA"`);
  console.log(`   - Icône: ⚡ (Zap)`);
  console.log(`   - Jauge: Ambrée/dorée`);
  console.log(`   - Pas d'alerte de retard`);
  console.log(`\n👉 Connectez-vous avec: test.extra@restaurant.com / Test123!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
