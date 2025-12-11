const prisma = require('./prisma/client');

async function analyserVraiesAbsences() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('=== ANALYSE COMPLÈTE - VRAIE SITUATION ===\n');
    console.log('📅 Date:', today.toLocaleDateString('fr-FR'), '\n');
    
    // 1. Tous les employés
    const employees = await prisma.user.findMany({ 
      where: { role: 'employee' } 
    });
    console.log('👥 TOTAL EMPLOYÉS:', employees.length);
    
    // 2. Pointages aujourd'hui
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: today, lt: tomorrow }
      },
      include: { user: { select: { nom: true, prenom: true } } }
    });
    const pointesIds = [...new Set(pointages.map(p => p.userId))];
    console.log('✅ ONT POINTÉ:', pointesIds.length);
    if (pointesIds.length > 0) {
      pointages.forEach(p => {
        console.log(`   - ${p.user?.prenom} ${p.user?.nom} à ${p.horodatage.toLocaleTimeString('fr-FR')}`);
      });
    }
    
    // 3. Congés actifs aujourd'hui
    const conges = await prisma.conge.findMany({
      where: {
        dateDebut: { lte: tomorrow },
        dateFin: { gte: today },
        statut: 'Approuvé'
      },
      include: { user: { select: { nom: true, prenom: true } } }
    });
    const congesIds = conges.map(c => c.userId);
    console.log('\n🏖️  EN CONGÉ APPROUVÉ:', congesIds.length);
    conges.forEach(c => {
      console.log(`   - ${c.user.prenom} ${c.user.nom} (${c.type}) du ${new Date(c.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(c.dateFin).toLocaleDateString('fr-FR')}`);
    });
    
    // 4. Qui n'a PAS pointé?
    const nonPointes = employees.filter(e => !pointesIds.includes(e.id));
    console.log('\n❌ N\'ONT PAS POINTÉ:', nonPointes.length);
    
    // 5. Parmi ceux qui n'ont pas pointé, lesquels sont en congé?
    let absencesJustifiees = 0;
    let absencesNonPlanifiees = 0;
    
    console.log('\n🔍 DÉTAIL DES NON-POINTEURS:\n');
    nonPointes.forEach((e, idx) => {
      const enConge = congesIds.includes(e.id);
      if (enConge) {
        absencesJustifiees++;
        console.log(`   ${idx + 1}. ${e.prenom} ${e.nom} - ✅ EN CONGÉ (justifié)`);
      } else {
        absencesNonPlanifiees++;
        console.log(`   ${idx + 1}. ${e.prenom} ${e.nom} - ⚠️  ABSENCE NON PLANIFIÉE (devait travailler)`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ FINAL:\n');
    console.log(`   Total employés:             ${employees.length}`);
    console.log(`   Ont pointé:                 ${pointesIds.length}`);
    console.log(`   En congé (justifiés):       ${absencesJustifiees}`);
    console.log(`   Absences non planifiées:    ${absencesNonPlanifiees}`);
    console.log(`   ─────────────────────────────────`);
    console.log(`   TOTAL absents:              ${nonPointes.length} (${absencesJustifiees} + ${absencesNonPlanifiees})`);
    console.log('='.repeat(60));
    
    console.log('\n💡 EXPLICATION DE L\'AFFICHAGE:\n');
    console.log(`   Le dashboard devrait afficher:`);
    console.log(`   • "Absents totaux: ${nonPointes.length}"`);
    console.log(`   • Détail: "${absencesJustifiees} congés + ${absencesNonPlanifiees} non planif."`);
    console.log(`   • "Absences non planifiées: ${absencesNonPlanifiees}" (ceux qui DEVAIENT travailler)\n`);
    
    if (absencesNonPlanifiees !== nonPointes.length) {
      console.log(`   ⚠️  IMPORTANT: Les "${absencesNonPlanifiees} absences non planifiées"`);
      console.log(`   sont différentes des "${nonPointes.length} personnes absentes"`);
      console.log(`   car ${absencesJustifiees} personne(s) sont en congé approuvé!\n`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

analyserVraiesAbsences();
