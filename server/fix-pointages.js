// Corriger les types de pointages pour qu'ils soient cohérents

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPointageTypes() {
  try {
    console.log('🔧 Correction des types de pointages...');
    
    // Corriger 'départ' -> 'depart' 
    const updateDepart = await prisma.pointage.updateMany({
      where: { type: 'départ' },
      data: { type: 'depart' }
    });
    
    // Corriger 'arrivée' -> 'arrivee' (au cas où)
    const updateArrivee = await prisma.pointage.updateMany({
      where: { type: 'arrivée' },
      data: { type: 'arrivee' }
    });
    
    console.log(`✅ Corrections effectuées:`);
    console.log(`   - Départs corrigés: ${updateDepart.count}`);
    console.log(`   - Arrivées corrigées: ${updateArrivee.count}`);
    
    // Vérifier les types restants
    const typesUniques = await prisma.pointage.groupBy({
      by: ['type'],
      _count: true
    });
    
    console.log('\n📊 Types de pointages après correction:');
    typesUniques.forEach(type => {
      console.log(`   - ${type.type}: ${type._count}`);
    });
    
    // Test de calcul sur une période plus large
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    last7Days.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const recentPointages = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: last7Days,
          lte: today
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log(`\n📅 Pointages des 7 derniers jours: ${recentPointages.length}`);
    
    // Calculer les heures comme dans le dashboard
    const pointagesParEmploye = {};
    
    for (const p of recentPointages) {
      if (!pointagesParEmploye[p.userId]) pointagesParEmploye[p.userId] = [];
      pointagesParEmploye[p.userId].push(p);
    }
    
    let totalMs = 0;
    
    for (const userId in pointagesParEmploye) {
      const points = pointagesParEmploye[userId];
      console.log(`\n👤 Employé ${userId}: ${points.length} pointages`);
      
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        
        if (current.type === 'arrivee' && next.type === 'depart') {
          const duree = new Date(next.horodatage) - new Date(current.horodatage);
          totalMs += duree;
          const heures = Math.floor(duree / 1000 / 60 / 60);
          const minutes = Math.floor((duree / 1000 / 60) % 60);
          console.log(`   Séance: ${heures}h${minutes.toString().padStart(2, '0')} (${current.horodatage.toISOString().split('T')[1].substring(0,5)} -> ${next.horodatage.toISOString().split('T')[1].substring(0,5)})`);
          i++; // skip next pointage
        }
      }
    }
    
    const heures = Math.floor(totalMs / 1000 / 60 / 60);
    const minutes = Math.floor((totalMs / 1000 / 60) % 60);
    console.log(`\n🕒 TOTAL HEURES (7 jours): ${heures}h${minutes.toString().padStart(2, '0')}`);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPointageTypes();
