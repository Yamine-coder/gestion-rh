const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugExportData() {
  console.log('\n🔍 DEBUG: Structure des données export\n');

  try {
    const dateDebut = new Date('2025-11-01T00:00:00.000Z');
    const dateFin = new Date('2025-11-30T23:59:59.999Z');

    // Tester avec Martin Pierre (ID: 49)
    const employe = await prisma.user.findUnique({
      where: { id: 49 },
      select: { id: true, nom: true, prenom: true }
    });

    console.log(`📋 Employé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);

    const shifts = await prisma.shift.findMany({
      where: {
        employeId: employe.id,
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });

    const conges = await prisma.conge.findMany({
      where: {
        userId: employe.id,
        statut: 'approuvé',
        OR: [{ dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }]
      }
    });

    console.log(`\n📦 ${shifts.length} shifts trouvés:`);
    shifts.forEach(s => {
      console.log(`   • ${new Date(s.date).toLocaleDateString('fr-FR')} - Type: ${s.type} - Motif: "${s.motif || 'aucun'}"`);
    });

    console.log(`\n📅 ${conges.length} congés approuvés:`);
    conges.forEach(c => {
      const debut = new Date(c.dateDebut).toLocaleDateString('fr-FR');
      const fin = new Date(c.dateFin).toLocaleDateString('fr-FR');
      console.log(`   • ${c.type}: ${debut} → ${fin}`);
    });

    // Map des congés
    const congesParJour = new Map();
    conges.forEach(conge => {
      let currentDate = new Date(conge.dateDebut);
      const endDate = new Date(conge.dateFin);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        congesParJour.set(dateKey, { type: conge.type });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    console.log(`\n📊 Simulation heuresParJour (comme dans statsRoutes):`);
    
    const heuresParJour = [];
    const joursTraites = new Set();

    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      joursTraites.add(dateKey);
      const congeJour = congesParJour.get(dateKey);

      if (shift.type === 'absence') {
        const motif = shift.motif || '';
        heuresParJour.push({
          jour: shift.date,
          type: 'absence',
          heuresPrevues: 7,
          heuresTravaillees: 0,
          details: motif ? {
            type: 'congé',
            congeType: motif
          } : (congeJour ? {
            type: 'congé',
            congeType: congeJour.type
          } : undefined)
        });
      }
    });

    // Fallback
    congesParJour.forEach((congeInfo, dateKey) => {
      if (!joursTraites.has(dateKey)) {
        const dateJour = new Date(dateKey + 'T12:00:00.000Z');
        if (dateJour >= dateDebut && dateJour <= dateFin) {
          heuresParJour.push({
            jour: dateJour,
            type: 'absence',
            heuresPrevues: 7,
            heuresTravaillees: 0,
            details: {
              type: 'congé',
              congeType: congeInfo.type
            }
          });
        }
      }
    });

    console.log(`\n✅ ${heuresParJour.length} jours dans heuresParJour:`);
    heuresParJour.forEach((j, idx) => {
      const dateFormatee = new Date(j.jour).toLocaleDateString('fr-FR');
      const congeType = j.details?.congeType || 'AUCUN';
      console.log(`   ${idx + 1}. ${dateFormatee} - Type: ${j.type} - CongeType: "${congeType}"`);
    });

    console.log(`\n🧮 Simulation classification (comme dans exportUtils):`);
    const datesCP = [];
    const datesRTT = [];
    const datesMaladie = [];
    const datesInjustifiees = [];
    let joursCP = 0;
    let joursRTT = 0;
    let joursMaladie = 0;

    heuresParJour.forEach((j) => {
      if (j.type === 'absence' || (j.heuresTravaillees === 0 && j.heuresPrevues > 0)) {
        const dateFormatee = new Date(j.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const congeType = j.details?.congeType || j.congeType || '';
        
        console.log(`   ➡️ ${dateFormatee} - congeType: "${congeType}"`);

        if (congeType.toLowerCase().includes('maladie')) {
          datesMaladie.push(dateFormatee);
          joursMaladie++;
          console.log(`      ✅ Classé: MALADIE`);
        } else if (congeType.toLowerCase().includes('rtt')) {
          datesRTT.push(dateFormatee);
          joursRTT++;
          console.log(`      ✅ Classé: RTT`);
        } else if (congeType.toLowerCase().includes('cp') || congeType.toLowerCase().includes('congé')) {
          datesCP.push(dateFormatee);
          joursCP++;
          console.log(`      ✅ Classé: CP`);
        } else if (!congeType) {
          datesInjustifiees.push(dateFormatee);
          console.log(`      ❌ Classé: INJUSTIFIÉE`);
        } else {
          datesCP.push(dateFormatee);
          joursCP++;
          console.log(`      ✅ Classé: CP (défaut)`);
        }
      }
    });

    console.log(`\n📊 RÉSULTATS FINAUX:`);
    console.log(`   • joursCP: ${joursCP} - Dates: ${datesCP.join(', ') || '-'}`);
    console.log(`   • joursRTT: ${joursRTT} - Dates: ${datesRTT.join(', ') || '-'}`);
    console.log(`   • joursMaladie: ${joursMaladie} - Dates: ${datesMaladie.join(', ') || '-'}`);
    console.log(`   • Injustifiées: ${datesInjustifiees.length} - Dates: ${datesInjustifiees.join(', ') || '-'}`);

    console.log(`\n${joursCP > 0 ? '✅ CP détectés correctement !' : '❌ PROBLÈME: CP = 0 alors que dates présentes'}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugExportData();
