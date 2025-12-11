// Test spécifique du calcul des retards avec timezone
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testerRetards() {
  console.log('🔍 TEST SPÉCIFIQUE: CALCUL DES RETARDS\n');
  console.log('='.repeat(80));

  try {
    const employe = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (!employe) {
      console.log('❌ Employé de test non trouvé');
      return;
    }

    // Récupérer un jour avec retard connu (5 nov - retard 15min)
    const shift = await prisma.shift.findFirst({
      where: {
        employeId: employe.id,
        date: new Date('2025-11-05T00:00:00Z')
      }
    });

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date('2025-11-05T00:00:00Z'),
          lte: new Date('2025-11-05T23:59:59Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`\n📅 Jour testé: 5 novembre 2025`);
    console.log(`Shift prévu: ${shift.segments[0].start} - ${shift.segments[0].end}\n`);

    console.log('Pointages:');
    pointages.forEach(p => {
      const date = new Date(p.horodatage);
      console.log(`  ${p.type}: ${date.toISOString()} (UTC)`);
      console.log(`           ${date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} (Paris)`);
      console.log(`           getHours(): ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`);
    });

    // Test avec la fonction actuelle
    const premiereArrivee = pointages.find(p => 
      p.type === 'arrivee' || p.type === 'arrivée' || p.type === 'ENTRÉE'
    );

    if (premiereArrivee) {
      const [prevuH, prevuM] = shift.segments[0].start.split(':').map(Number);
      const minutesPrevues = prevuH * 60 + prevuM;

      const heureArrivee = new Date(premiereArrivee.horodatage);
      const minutesReelles = heureArrivee.getHours() * 60 + heureArrivee.getMinutes();

      let retardMinutes = minutesReelles - minutesPrevues;
      if (retardMinutes < -12 * 60) {
        retardMinutes += 24 * 60;
      }

      console.log(`\n📊 CALCUL DU RETARD:`);
      console.log(`   Heure prévue: ${shift.segments[0].start} = ${minutesPrevues} minutes`);
      console.log(`   Heure réelle (getHours): ${heureArrivee.getHours()}:${heureArrivee.getMinutes().toString().padStart(2, '0')} = ${minutesReelles} minutes`);
      console.log(`   Retard calculé: ${Math.max(0, retardMinutes)} minutes`);
      console.log(`   Attendu: 15 minutes`);

      if (Math.max(0, retardMinutes) === 15) {
        console.log('\n   ✅ CALCUL CORRECT');
      } else {
        console.log('\n   ❌ ERREUR DE CALCUL');
        console.log(`\n   🔍 PROBLÈME POTENTIEL:`);
        console.log(`   - Les pointages sont en UTC: ${premiereArrivee.horodatage.toISOString()}`);
        console.log(`   - getHours() retourne l'heure locale du serveur`);
        console.log(`   - Décalage timezone possible!`);
        
        // Solution: utiliser getUTCHours
        const minutesReellesUTC = heureArrivee.getUTCHours() * 60 + heureArrivee.getUTCMinutes();
        let retardMinutesUTC = minutesReellesUTC - minutesPrevues;
        if (retardMinutesUTC < -12 * 60) {
          retardMinutesUTC += 24 * 60;
        }
        
        console.log(`\n   🔧 SOLUTION: Utiliser getUTCHours()`);
        console.log(`   Heure UTC: ${heureArrivee.getUTCHours()}:${heureArrivee.getUTCMinutes().toString().padStart(2, '0')}`);
        console.log(`   Retard avec UTC: ${Math.max(0, retardMinutesUTC)} minutes`);
      }
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testerRetards();
