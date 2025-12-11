const prisma = require('./prisma/client');

async function checkEmployes() {
  try {
    console.log('📊 VÉRIFICATION DES EMPLOYÉS ET POINTAGES\n');
    
    const today = new Date('2025-10-21');
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Tous les employés
    const employes = await prisma.user.findMany({
      where: { role: 'employee' },
      select: { id: true, email: true, nom: true, prenom: true },
      orderBy: { id: 'asc' }
    });
    
    console.log(`👥 TOTAL EMPLOYÉS (role='employee'): ${employes.length}\n`);
    
    // Pointages du jour
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        user: {
          select: { id: true, email: true, nom: true, prenom: true, role: true }
        }
      },
      orderBy: { userId: 'asc' }
    });
    
    console.log(`⏱️  TOTAL POINTAGES AUJOURD'HUI: ${pointages.length}\n`);
    
    // Grouper les pointages par employé
    const pointagesParEmploye = {};
    pointages.forEach(p => {
      if (!pointagesParEmploye[p.userId]) {
        pointagesParEmploye[p.userId] = [];
      }
      pointagesParEmploye[p.userId].push(p);
    });
    
    // Employés distincts ayant pointé
    const employesQuiOntPointe = new Set(pointages.map(p => p.userId));
    
    console.log(`✅ EMPLOYÉS QUI ONT POINTÉ: ${employesQuiOntPointe.size}\n`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Liste détaillée
    employes.forEach(emp => {
      const nom = emp.nom && emp.prenom ? `${emp.prenom} ${emp.nom}` : emp.email;
      const aPointe = employesQuiOntPointe.has(emp.id);
      const pointagesEmp = pointagesParEmploye[emp.id] || [];
      
      if (aPointe) {
        console.log(`✅ ${nom} (ID: ${emp.id})`);
        pointagesEmp.forEach(p => {
          const heure = new Date(p.horodatage).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Europe/Paris'
          });
          console.log(`   → ${p.type} à ${heure}`);
        });
      } else {
        console.log(`❌ ${nom} (ID: ${emp.id}) - AUCUN POINTAGE`);
      }
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`   Employés totaux: ${employes.length}`);
    console.log(`   Ont pointé: ${employesQuiOntPointe.size}`);
    console.log(`   Non pointés: ${employes.length - employesQuiOntPointe.size}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmployes();
