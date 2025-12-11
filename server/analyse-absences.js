const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyserAbsences() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Récupérer toutes les données
    const employes = await prisma.user.findMany({});
    const pointages = await prisma.pointage.findMany({ 
      where: {
        horodatage: { 
          gte: today, 
          lt: tomorrow 
        }
      }
    });
    const conges = await prisma.conge.findMany({ 
      where: {
        dateDebut: { lte: today }, 
        dateFin: { gte: today }, 
        statut: 'Approuvé'
      },
      include: {
        user: true
      }
    });
    
    // IDs des personnes qui ont pointé
    const pointesIds = [...new Set(pointages.map(p => p.userId))];
    
    // IDs des personnes en congé
    const congesIds = conges.map(c => c.userId).filter(Boolean);
    
    // Personnes qui n'ont PAS pointé
    const nonPointes = employes.filter(e => !pointesIds.includes(e.id));
    
    console.log('=== ANALYSE COMPLÈTE DES ABSENCES ===\n');
    console.log('📊 STATISTIQUES GLOBALES:');
    console.log('  • Total employés:', employes.length);
    console.log('  • Ont pointé aujourd\'hui:', pointesIds.length);
    console.log('  • En congé approuvé:', congesIds.length);
    console.log('  • N\'ont PAS pointé:', nonPointes.length);
    
    console.log('\n🔍 DÉTAIL DES PERSONNES N\'AYANT PAS POINTÉ (' + nonPointes.length + '):');
    
    let vraiementAbsents = 0;
    nonPointes.forEach((e, idx) => {
      const enConge = congesIds.includes(e.id);
      const statut = enConge ? '✅ EN CONGÉ (justifié)' : '❌ DEVAIT TRAVAILLER (absence non planifiée)';
      console.log(`  ${idx + 1}. ${e.nom} ${e.prenom} - ${statut}`);
      if (!enConge) vraiementAbsents++;
    });
    
    console.log('\n📈 RÉSUMÉ:');
    console.log('  • Absences JUSTIFIÉES (en congé):', congesIds.length);
    console.log('  • Absences NON PLANIFIÉES (devaient travailler):', vraiementAbsents);
    console.log('  • TOTAL absents:', nonPointes.length);
    
    console.log('\n💡 EXPLICATION:');
    console.log('  Le système affiche "' + vraiementAbsents + ' absences non planifiées"');
    console.log('  car ' + congesIds.length + ' personnes sont en congé approuvé (donc justifiées)');
    console.log('  et ' + vraiementAbsents + ' personnes devaient travailler mais n\'ont pas pointé.');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

analyserAbsences();
