// Nettoyer les employés de test avec données corrompues
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nettoyerDonneesTest() {
  console.log('🧹 NETTOYAGE DES DONNÉES DE TEST CORROMPUES\n');
  console.log('='.repeat(80));

  try {
    // Trouver TestHoraires avec données invalides
    const testHoraires = await prisma.user.findFirst({
      where: { email: 'test.horaires@restaurant.com' },
      include: {
        shifts: true,
        pointages: true
      }
    });

    if (testHoraires) {
      console.log(`\n❌ Employé trouvé: ${testHoraires.nom} ${testHoraires.prenom}`);
      console.log(`   Shifts: ${testHoraires.shifts.length}`);
      console.log(`   Pointages: ${testHoraires.pointages.length}`);

      // Vérifier les segments invalides
      const shiftsInvalides = testHoraires.shifts.filter(s => {
        if (!s.segments || !Array.isArray(s.segments)) return false;
        return s.segments.some(seg => {
          if (!seg.start || !seg.end) return false;
          const [startH, startM] = seg.start.split(':').map(Number);
          const [endH, endM] = seg.end.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          const diff = endMinutes - startMinutes;
          // Si négatif mais pas un shift de nuit logique
          return diff < 0 && (startH < 18 || endH > 6);
        });
      });

      console.log(`   Shifts invalides: ${shiftsInvalides.length}\n`);

      if (shiftsInvalides.length > 0) {
        console.log('   Détails des shifts invalides:');
        shiftsInvalides.forEach(s => {
          console.log(`      ${s.date.toISOString().split('T')[0]}: ${JSON.stringify(s.segments)}`);
        });
      }

      // Supprimer l'employé de test corrompu
      console.log(`\n🗑️  Suppression de l'employé de test corrompu...`);
      
      await prisma.pointage.deleteMany({
        where: { userId: testHoraires.id }
      });
      
      await prisma.shift.deleteMany({
        where: { employeId: testHoraires.id }
      });
      
      await prisma.user.delete({
        where: { id: testHoraires.id }
      });

      console.log(`   ✅ Employé supprimé\n`);
    } else {
      console.log('\n✅ Aucun employé TestHoraires trouvé\n');
    }

    // Vérifier tous les shifts pour segments invalides
    console.log('🔍 Vérification de tous les shifts...\n');
    
    const shifts = await prisma.shift.findMany({
      include: {
        employe: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });

    const shiftsProblematiques = [];
    
    shifts.forEach(shift => {
      if (shift.segments && Array.isArray(shift.segments)) {
        shift.segments.forEach(segment => {
          if (segment.start && segment.end) {
            const [startH, startM] = segment.start.split(':').map(Number);
            const [endH, endM] = segment.end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            let diffMinutes = endMinutes - startMinutes;
            
            // Shift de nuit légitime
            if (diffMinutes < 0 && startH >= 18 && endH <= 6) {
              diffMinutes += 24 * 60;
            }
            
            // Heures négatives ou > 12h
            if (diffMinutes < 0 || diffMinutes > 12 * 60) {
              shiftsProblematiques.push({
                employe: `${shift.employe.nom} ${shift.employe.prenom}`,
                date: shift.date.toISOString().split('T')[0],
                segment: `${segment.start}-${segment.end}`,
                heures: (diffMinutes / 60).toFixed(2)
              });
            }
          }
        });
      }
    });

    if (shiftsProblematiques.length > 0) {
      console.log(`⚠️  ${shiftsProblematiques.length} segment(s) problématique(s) trouvé(s):\n`);
      shiftsProblematiques.forEach(p => {
        console.log(`   - ${p.employe} (${p.date}): ${p.segment} = ${p.heures}h`);
      });
      console.log('\n   Ces segments doivent être corrigés manuellement.\n');
    } else {
      console.log('✅ Tous les shifts ont des segments valides\n');
    }

    console.log('='.repeat(80));
    console.log('\n✅ NETTOYAGE TERMINÉ\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

nettoyerDonneesTest();
