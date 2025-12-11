const prisma = require('./prisma/client');

async function testStats() {
  try {
    const today = new Date('2025-10-20');
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('\n🔍 DIAGNOSTIC STATS pour le', today.toISOString().split('T')[0]);
    console.log('━'.repeat(80));

    // 1. Compter les employés
    const employes = await prisma.user.count({
      where: { role: 'employee' }
    });
    console.log(`\n👥 Employés (role='employee'): ${employes}`);

    // 2. Lister les employés
    const employesList = await prisma.user.findMany({
      where: { role: 'employee' },
      select: { id: true, nom: true, prenom: true, email: true }
    });
    employesList.forEach(e => {
      console.log(`   ${e.id}. ${e.prenom} ${e.nom} (${e.email})`);
    });

    // 3. Compter les pointages d'aujourd'hui
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        user: {
          select: { id: true, nom: true, prenom: true, email: true, role: true }
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`\n⏰ Pointages aujourd'hui: ${pointages.length}`);
    pointages.forEach(p => {
      const time = new Date(p.horodatage).toLocaleTimeString('fr-FR');
      console.log(`   ${p.user.prenom} ${p.user.nom}: ${p.type} à ${time}`);
    });

    // 4. Compter les employés uniques qui ont pointé
    const employesQuiOntPointe = new Set(
      pointages.map(p => p.userId)
    );
    console.log(`\n✅ Employés qui ont pointé: ${employesQuiOntPointe.size}`);
    employesQuiOntPointe.forEach(id => {
      const emp = employesList.find(e => e.id === id);
      console.log(`   ${emp.prenom} ${emp.nom}`);
    });

    // 5. Employés qui n'ont PAS pointé
    const employesNonPointes = employesList.filter(e => !employesQuiOntPointe.has(e.id));
    console.log(`\n❌ Employés NON pointés: ${employesNonPointes.length}`);
    employesNonPointes.forEach(e => {
      console.log(`   ${e.prenom} ${e.nom}`);
    });

    // 6. Vérifier les congés d'aujourd'hui
    const conges = await prisma.conge.findMany({
      where: {
        statut: 'validé',
        dateDebut: { lte: endOfDay },
        dateFin: { gte: startOfDay }
      },
      include: {
        user: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });
    console.log(`\n🏖️ Congés validés aujourd'hui: ${conges.length}`);
    conges.forEach(c => {
      console.log(`   ${c.user.prenom} ${c.user.nom}: ${c.type}`);
    });

    // 7. RÉSUMÉ FINAL
    const absencesNonPlanifiees = employesNonPointes.length - conges.length;
    const presencePct = employes > 0 ? Math.round((employesQuiOntPointe.size / employes) * 100) : 0;

    console.log('\n━'.repeat(80));
    console.log('📊 RÉSUMÉ');
    console.log('━'.repeat(80));
    console.log(`Effectif total: ${employes}`);
    console.log(`Présence: ${employesQuiOntPointe.size}/${employes} (${presencePct}%)`);
    console.log(`Non pointés: ${employesNonPointes.length}`);
    console.log(`En congé: ${conges.length}`);
    console.log(`Absences non planifiées: ${absencesNonPlanifiees}`);
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStats();
