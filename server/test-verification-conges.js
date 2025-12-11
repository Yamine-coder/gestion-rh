const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierCongesDetail() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  VÉRIFICATION DÉTAILLÉE DES CONGÉS APPROUVÉS               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const dateDebut = new Date('2025-11-01T00:00:00.000Z');
    const dateFin = new Date('2025-11-30T23:59:59.999Z');

    // 1. Vérifier les congés approuvés
    console.log('📋 ÉTAPE 1: Congés approuvés en novembre 2025\n');
    
    const conges = await prisma.conge.findMany({
      where: {
        statut: 'approuvé',
        OR: [
          { dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }
        ]
      },
      select: {
        id: true,
        userId: true,
        type: true,
        statut: true,
        dateDebut: true,
        dateFin: true,
        user: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    console.log(`✅ ${conges.length} congés approuvés trouvés\n`);

    if (conges.length === 0) {
      console.log('⚠️  AUCUN CONGÉ APPROUVÉ en novembre !');
      console.log('   Les dates d\'absences seront TOUTES en "Abs. Injustifiées"\n');
      
      // Vérifier s'il y a des congés avec d'autres statuts
      const autresConges = await prisma.conge.findMany({
        where: {
          OR: [
            { dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }
          ]
        },
        select: { id: true, userId: true, type: true, statut: true, dateDebut: true, dateFin: true }
      });

      console.log(`📊 Total congés (tous statuts): ${autresConges.length}`);
      
      const parStatut = {};
      autresConges.forEach(c => {
        parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
      });

      console.log('\n📋 Répartition par statut:');
      Object.entries(parStatut).forEach(([statut, count]) => {
        const icon = statut === 'approuvé' ? '✅' : '⏸️';
        console.log(`   ${icon} ${statut}: ${count} congés`);
      });

      console.log('\n💡 SOLUTION: Approuver les congés pour qu\'ils apparaissent dans les bonnes colonnes !');
      
      return;
    }

    // Afficher chaque congé en détail
    conges.forEach((conge, index) => {
      console.log(`\n┌─────────────────────────────────────────────────────────┐`);
      console.log(`│ CONGÉ #${index + 1} - ID: ${conge.id}`.padEnd(58) + '│');
      console.log(`└─────────────────────────────────────────────────────────┘`);
      console.log(`   👤 Employé: ${conge.user.nom} ${conge.user.prenom} (ID: ${conge.userId})`);
      console.log(`   📅 Type: ${conge.type}`);
      console.log(`   📆 Dates: ${new Date(conge.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(conge.dateFin).toLocaleDateString('fr-FR')}`);
      console.log(`   ✅ Statut: ${conge.statut}`);

      // Calculer les jours
      const debut = new Date(conge.dateDebut);
      const fin = new Date(conge.dateFin);
      const jours = [];
      let current = new Date(debut);
      
      while (current <= fin) {
        jours.push(current.toLocaleDateString('fr-FR'));
        current.setDate(current.getDate() + 1);
      }

      console.log(`   🗓️  Jours couverts (${jours.length}): ${jours.join(', ')}`);
    });

    // 2. Vérifier les shifts pour ces employés sur ces dates
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ÉTAPE 2: Shifts planifiés sur les dates de congés');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const conge of conges) {
      // Créer la map des jours de congé
      const joursConge = new Set();
      let current = new Date(conge.dateDebut);
      const fin = new Date(conge.dateFin);
      
      while (current <= fin) {
        joursConge.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // Chercher les shifts
      const shifts = await prisma.shift.findMany({
        where: {
          employeId: conge.userId,
          date: { gte: conge.dateDebut, lte: conge.dateFin }
        },
        orderBy: { date: 'asc' }
      });

      console.log(`\n${conge.user.nom} ${conge.user.prenom}:`);
      console.log(`   Congé: ${conge.type} (${joursConge.size} jours)`);
      console.log(`   Shifts planifiés: ${shifts.length}`);

      if (shifts.length === 0) {
        console.log('   ⚠️  PROBLÈME: Aucun shift planifié = congé n\'apparaîtra PAS dans le rapport !');
        console.log('      Le rapport ne traite QUE les jours avec shift planifié.');
      } else {
        console.log('   ✅ Shifts trouvés:');
        shifts.forEach(shift => {
          const dateKey = shift.date.toISOString().split('T')[0];
          const estConge = joursConge.has(dateKey);
          const icon = estConge ? '✅' : '⚠️';
          console.log(`      ${icon} ${new Date(shift.date).toLocaleDateString('fr-FR')} - ${shift.type}`);
        });
      }

      // Vérifier les pointages
      const pointages = await prisma.pointage.findMany({
        where: {
          userId: conge.userId,
          horodatage: { gte: conge.dateDebut, lte: conge.dateFin }
        }
      });

      if (pointages.length > 0) {
        console.log(`   ⚠️  ALERTE: ${pointages.length} pointages sur les jours de congé !`);
      } else {
        console.log(`   ✅ Aucun pointage (normal pour un congé)`);
      }
    }

    // 3. SIMULATION DU RAPPORT POUR UN EMPLOYÉ AVEC CONGÉ
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 ÉTAPE 3: SIMULATION DU TRAITEMENT DANS LE RAPPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (conges.length > 0) {
      const premierConge = conges[0];
      const employeId = premierConge.userId;

      console.log(`Test avec: ${premierConge.user.nom} ${premierConge.user.prenom}\n`);

      // Récupérer TOUS les shifts de novembre
      const shifts = await prisma.shift.findMany({
        where: {
          employeId: employeId,
          date: { gte: dateDebut, lte: dateFin }
        },
        orderBy: { date: 'asc' }
      });

      // Créer la map des congés par jour (comme dans le rapport)
      const congesEmploye = await prisma.conge.findMany({
        where: {
          userId: employeId,
          statut: 'approuvé',
          OR: [{ dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }]
        }
      });

      const congesParJour = new Map();
      congesEmploye.forEach(conge => {
        let current = new Date(conge.dateDebut);
        const fin = new Date(conge.dateFin);
        
        while (current <= fin) {
          const dateKey = current.toISOString().split('T')[0];
          congesParJour.set(dateKey, { type: conge.type });
          current.setDate(current.getDate() + 1);
        }
      });

      console.log(`📋 Map congés créée: ${congesParJour.size} jours avec congé`);
      console.log(`📋 Shifts à traiter: ${shifts.length}\n`);

      // Simuler le traitement
      const datesCP = [];
      const datesRTT = [];
      const datesMaladie = [];
      const datesInjustifiees = [];

      shifts.forEach(shift => {
        const dateKey = shift.date.toISOString().split('T')[0];
        const dateFormatee = new Date(shift.date).toLocaleDateString('fr-FR');
        const congeJour = congesParJour.get(dateKey);

        if (shift.type === 'présence') {
          console.log(`   📅 ${dateFormatee}:`);
          
          if (congeJour) {
            const congeType = congeJour.type || '';
            console.log(`      ✅ Congé détecté: "${congeType}"`);
            console.log(`      🔍 Test classification:`);
            console.log(`         - Contains "maladie": ${congeType.toLowerCase().includes('maladie')}`);
            console.log(`         - Contains "rtt": ${congeType.toLowerCase().includes('rtt')}`);
            console.log(`         - Contains "cp": ${congeType.toLowerCase().includes('cp')}`);
            console.log(`         - Contains "congé": ${congeType.toLowerCase().includes('congé')}`);
            
            if (congeType.toLowerCase().includes('maladie')) {
              datesMaladie.push(dateFormatee);
              console.log(`      → Classé: MALADIE ✅`);
            } else if (congeType.toLowerCase().includes('rtt')) {
              datesRTT.push(dateFormatee);
              console.log(`      → Classé: RTT ✅`);
            } else if (congeType.toLowerCase().includes('cp') || congeType.toLowerCase().includes('congé')) {
              datesCP.push(dateFormatee);
              console.log(`      → Classé: CP ✅`);
            } else {
              console.log(`      ⚠️  Type inconnu, classé par défaut: CP`);
              datesCP.push(dateFormatee);
            }
          } else {
            console.log(`      ❌ Pas de congé → ABS. INJUSTIFIÉE`);
            datesInjustifiees.push(dateFormatee);
          }
        }
      });

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 RÉSULTAT DE LA CLASSIFICATION:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log(`   Dates CP: ${datesCP.length > 0 ? datesCP.join(', ') : '-'}`);
      console.log(`   Dates RTT: ${datesRTT.length > 0 ? datesRTT.join(', ') : '-'}`);
      console.log(`   Dates Maladie: ${datesMaladie.length > 0 ? datesMaladie.join(', ') : '-'}`);
      console.log(`   Dates Abs. Injust.: ${datesInjustifiees.length > 0 ? datesInjustifiees.join(', ') : '-'}`);

      const totalDates = datesCP.length + datesRTT.length + datesMaladie.length + datesInjustifiees.length;
      console.log(`\n   Total dates traitées: ${totalDates}`);
      console.log(`   Congés correctement classés: ${datesCP.length + datesRTT.length + datesMaladie.length}`);

      if (datesCP.length + datesRTT.length + datesMaladie.length > 0) {
        console.log('\n   ✅ LES CONGÉS SONT BIEN PRIS EN COMPTE !');
      } else if (datesInjustifiees.length > 0) {
        console.log('\n   ⚠️  Toutes les absences sont injustifiées !');
        console.log('      Vérifier que les congés sont bien approuvés.');
      }
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

verifierCongesDetail();
