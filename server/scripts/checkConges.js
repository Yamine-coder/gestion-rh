const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConges() {
  console.log('📊 VÉRIFICATION RÉPARTITION CONGÉS');
  console.log('='.repeat(50));
  
  // 1. Grouper par type
  const congesParType = await prisma.conge.groupBy({
    by: ['type'],
    _count: true
  });
  
  console.log('\n📋 Congés par TYPE (nombre de demandes):');
  let totalDemandes = 0;
  congesParType.forEach(c => {
    console.log(`   ${c.type}: ${c._count} demandes`);
    totalDemandes += c._count;
  });
  console.log(`   TOTAL: ${totalDemandes} demandes`);
  
  // 2. Calculer les JOURS par type (ce qu'affiche l'interface)
  const allConges = await prisma.conge.findMany({
    select: { type: true, dateDebut: true, dateFin: true, statut: true }
  });
  
  const joursParType = {};
  let totalJours = 0;
  
  allConges.forEach(c => {
    const debut = new Date(c.dateDebut);
    const fin = new Date(c.dateFin);
    const jours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1;
    
    const type = c.type || 'Non défini';
    if (!joursParType[type]) joursParType[type] = 0;
    joursParType[type] += jours;
    totalJours += jours;
  });
  
  console.log('\n📅 Congés par TYPE (nombre de JOURS):');
  Object.entries(joursParType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, jours]) => {
      console.log(`   ${type}: ${jours} jours`);
    });
  console.log(`   TOTAL: ${totalJours} jours`);
  
  // 3. Comparer avec l'interface
  console.log('\n' + '='.repeat(50));
  console.log('🔍 COMPARAISON AVEC L\'INTERFACE:');
  console.log('   Interface montre: 37 total');
  console.log(`   Base de données: ${totalJours} jours (${totalDemandes} demandes)`);
  
  console.log('\n   Interface:          | Base de données:');
  console.log(`   maladie: 8          | ${joursParType['maladie'] || joursParType['Maladie'] || 0}`);
  console.log(`   formation: 5        | ${joursParType['formation'] || joursParType['Formation'] || 0}`);
  console.log(`   Congé payé: 6       | ${joursParType['Congé payé'] || joursParType['congé payé'] || 0}`);
  console.log(`   CP: 1               | ${joursParType['CP'] || joursParType['cp'] || 0}`);
  
  // 4. Détail complet
  console.log('\n📝 DÉTAIL COMPLET PAR TYPE:');
  Object.entries(joursParType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, jours]) => {
      const demandes = congesParType.find(c => c.type === type)?._count || '?';
      console.log(`   "${type}": ${jours} jours (${demandes} demandes)`);
    });
  
  await prisma.$disconnect();
}

checkConges().catch(e => { console.error(e); prisma.$disconnect(); });
