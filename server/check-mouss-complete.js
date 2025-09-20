const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMoussComplete24() {
  try {
    console.log('🔍 Vérification COMPLÈTE des données pour test@Mouss.com le 24 août 2025...\n');

    // 1. Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);

    const targetDate = '2025-08-24';
    const targetDateObj = new Date(targetDate);

    // 2. TOUS les congés (peu importe le statut)
    console.log(`\n🏖️ TOUS les congés (tous statuts):`);
    
    const tousConges = await prisma.conge.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            dateDebut: { lte: targetDateObj },
            dateFin: { gte: targetDateObj }
          },
          {
            dateDebut: targetDateObj
          },
          {
            dateFin: targetDateObj
          }
        ]
      },
      orderBy: { dateDebut: 'asc' }
    });

    if (tousConges.length > 0) {
      tousConges.forEach((conge, index) => {
        console.log(`   ${index + 1}. ${conge.type} (${conge.statut})`);
        console.log(`      Dates: ${conge.dateDebut.toLocaleDateString('fr-FR')} → ${conge.dateFin.toLocaleDateString('fr-FR')}`);
        console.log(`      Motif: ${conge.motif || 'N/A'}`);
        console.log(`      ID: ${conge.id}`);
        console.log('');
      });
    } else {
      console.log('   Aucun congé trouvé');
    }

    // 3. TOUS les shifts (tous types)
    console.log(`\n📋 TOUS les shifts (tous types):`);
    
    const tousShifts = await prisma.shift.findMany({
      where: {
        employeId: user.id,
        date: targetDateObj
      }
    });

    if (tousShifts.length > 0) {
      tousShifts.forEach((shift, index) => {
        console.log(`   ${index + 1}. Type: ${shift.type}`);
        console.log(`      Motif: ${shift.motif || 'N/A'}`);
        console.log(`      Commentaire: ${shift.commentaire || 'N/A'}`);
        console.log(`      ID: ${shift.id}`);
        console.log(`      Date: ${shift.date}`);
        
        // Afficher les segments s'ils existent (format JSON)
        if (shift.segments) {
          console.log(`      Segments: ${JSON.stringify(shift.segments, null, 6)}`);
        }
        console.log('');
      });
    } else {
      console.log('   Aucun shift trouvé');
    }

    // 4. Vérifier les dates proches (±2 jours)
    console.log(`\n📅 Vérification des dates proches (22-26 août):`);
    
    const dateDebut = new Date('2025-08-22');
    const dateFin = new Date('2025-08-26');
    
    const congesProches = await prisma.conge.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            dateDebut: { gte: dateDebut, lte: dateFin }
          },
          {
            dateFin: { gte: dateDebut, lte: dateFin }
          },
          {
            dateDebut: { lte: dateDebut },
            dateFin: { gte: dateFin }
          }
        ]
      },
      orderBy: { dateDebut: 'asc' }
    });

    if (congesProches.length > 0) {
      console.log('   Congés sur la période:');
      congesProches.forEach((conge, index) => {
        console.log(`     ${index + 1}. ${conge.type} (${conge.statut}) - ${conge.dateDebut.toLocaleDateString('fr-FR')} → ${conge.dateFin.toLocaleDateString('fr-FR')}`);
      });
    } else {
      console.log('   Aucun congé sur la période');
    }

    const shiftsProches = await prisma.shift.findMany({
      where: {
        employeId: user.id,
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });

    if (shiftsProches.length > 0) {
      console.log('   Shifts sur la période:');
      shiftsProches.forEach((shift, index) => {
        console.log(`     ${index + 1}. ${shift.date.toLocaleDateString('fr-FR')} - ${shift.type} (${shift.motif || 'N/A'})`);
      });
    } else {
      console.log('   Aucun shift sur la période');
    }

    // 5. Rechercher par motif "repos" ou "Journée de repos"
    console.log(`\n🔍 Recherche par mots-clés "repos", "journée":`);
    
    const congesRepos = await prisma.conge.findMany({
      where: {
        userId: user.id,
        OR: [
          { type: { contains: 'repos', mode: 'insensitive' } },
          { motif: { contains: 'repos', mode: 'insensitive' } },
          { type: { contains: 'journée', mode: 'insensitive' } },
          { motif: { contains: 'journée', mode: 'insensitive' } }
        ]
      }
    });

    const shiftsRepos = await prisma.shift.findMany({
      where: {
        employeId: user.id,
        OR: [
          { type: { contains: 'repos', mode: 'insensitive' } },
          { motif: { contains: 'repos', mode: 'insensitive' } },
          { type: { contains: 'journée', mode: 'insensitive' } },
          { motif: { contains: 'journée', mode: 'insensitive' } },
          { commentaire: { contains: 'repos', mode: 'insensitive' } },
          { commentaire: { contains: 'journée', mode: 'insensitive' } }
        ]
      }
    });

    if (congesRepos.length > 0) {
      console.log('   Congés avec "repos/journée":');
      congesRepos.forEach((conge, index) => {
        console.log(`     ${index + 1}. ${conge.type} - ${conge.dateDebut.toLocaleDateString('fr-FR')} → ${conge.dateFin.toLocaleDateString('fr-FR')} (${conge.statut})`);
      });
    }

    if (shiftsRepos.length > 0) {
      console.log('   Shifts avec "repos/journée":');
      shiftsRepos.forEach((shift, index) => {
        console.log(`     ${index + 1}. ${shift.date.toLocaleDateString('fr-FR')} - ${shift.type} (${shift.motif})`);
      });
    }

    if (congesRepos.length === 0 && shiftsRepos.length === 0) {
      console.log('   Aucun résultat trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMoussComplete24();
