// Script pour diagnostiquer le taux de pointage
const prisma = require('../prisma/client');

(async () => {
  try {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Fenêtre étendue (comme dans adminController)
    const finEtenduePointes = new Date(startOfToday);
    finEtenduePointes.setDate(finEtenduePointes.getDate() + 1);
    finEtenduePointes.setHours(6,0,0,0);

    console.log('=== DIAGNOSTIC TAUX DE POINTAGE ===');
    console.log('Fenêtre:', startOfToday.toISOString(), '->', finEtenduePointes.toISOString());

    // 1. Compter total employés
    const totalEmployes = await prisma.user.count({ where: { role: 'employee' } });
    console.log('Total employés:', totalEmployes);

    // 2. Compter pointages arrivee dans la fenêtre (comme adminController)
    const pointesAujourdHui = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: startOfToday, lte: finEtenduePointes },
        type: 'arrivee'
      },
      distinct: ['userId']
    });
    console.log('Pointages arrivée (distinct userId):', pointesAujourdHui.length);
    pointesAujourdHui.forEach(p => console.log(`  User ${p.userId} arrivé à ${p.horodatage.toISOString()}`));

    // 3. Calculer taux
    const taux = totalEmployes > 0 ? Math.round((pointesAujourdHui.length / totalEmployes) * 100) : 0;
    console.log(`Taux calculé: ${pointesAujourdHui.length}/${totalEmployes} = ${taux}%`);

    // 4. Vérifier s'il y a des pointages arrivee aujourd'hui (sans fenêtre étendue)
    const arriveeAujourdhuiStrict = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: startOfToday, lt: today },
        type: 'arrivee'
      },
      distinct: ['userId']
    });
    console.log('Pointages arrivée strictement aujourd\'hui:', arriveeAujourdhuiStrict.length);

    // 5. Lister tous les employés
    const employes = await prisma.user.findMany({
      where: { role: 'employee' },
      select: { id: true, email: true, nom: true, prenom: true }
    });
    console.log('Liste des employés:');
    employes.forEach(e => console.log(`  ID ${e.id}: ${e.email} (${e.prenom} ${e.nom})`));

  } catch (error) {
    console.error('Erreur diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
