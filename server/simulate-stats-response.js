const prisma = require('./prisma/client');

async function simulateStatsController() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

    // Mêmes requêtes que dans statsController.js ligne 13-24
    const [users, pointagesToday, congesAll] = await Promise.all([
      prisma.user.findMany({ where: { role: 'employee' }, select: { id:true, email:true, nom:true, prenom:true } }),
      prisma.pointage.findMany({
        where: { horodatage: { gte: todayStart, lte: todayEnd } },
        select: { id:true, userId:true, horodatage:true, type:true }
      }),
      prisma.conge.findMany({
        where: { dateFin: { gte: todayStart } },
        select: { id:true, type:true, statut:true, dateDebut:true, dateFin:true, userId:true }
      })
    ]);

    const employes = users.length;
    const presentSet = new Set(pointagesToday.map(p => p.userId));
    const pointes = presentSet.size;

    // Congés actifs aujourd'hui
    const congesApprouves = congesAll.filter(c => c.statut === 'Approuvé');
    const congesActifsAujourdHui = congesApprouves.filter(c => c.dateDebut <= todayEnd && c.dateFin >= todayStart);
    const employesEnCongeAujourdHuiSet = new Set(congesActifsAujourdHui.map(c => c.userId));

    // Ligne 39 du statsController.js
    const absents = Math.max(0, employes - pointes - employesEnCongeAujourdHuiSet.size);

    console.log('=== SIMULATION DU STATSCONTROLLER ===\n');
    console.log('📊 Ce que le controller calcule:\n');
    console.log('  employes:', employes);
    console.log('  pointes:', pointes);
    console.log('  employesEnCongeAujourdHuiSet.size:', employesEnCongeAujourdHuiSet.size);
    console.log('  absents (calcul):', absents, '= employes(' + employes + ') - pointes(' + pointes + ') - enConge(' + employesEnCongeAujourdHuiSet.size + ')');
    
    console.log('\n📤 Ce que l\'API va renvoyer:\n');
    console.log(JSON.stringify({
      employes,
      pointes,
      absents,
      enCongeAujourdHui: employesEnCongeAujourdHuiSet.size
    }, null, 2));
    
    console.log('\n✅ VÉRIFICATION:');
    if (absents === employes && pointes === 0 && employesEnCongeAujourdHuiSet.size === 0) {
      console.log('   ✓ Calcul correct: tous les employés sont absents non planifiés');
    } else {
      console.log('   Détails:');
      console.log('   - Employés qui ont pointé:', pointes);
      console.log('   - Employés en congé:', employesEnCongeAujourdHuiSet.size);
      console.log('   - Employés absents sans justification:', absents);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

simulateStatsController();
