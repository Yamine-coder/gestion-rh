const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function normalizeConges() {
  console.log('🔧 NORMALISATION DES TYPES DE CONGÉS');
  console.log('='.repeat(50));
  
  // Mapping des types à normaliser
  const typeMapping = {
    // Congés payés → "Congé payé"
    'congés payés': 'Congé payé',
    'conge_paye': 'Congé payé',
    'CP': 'Congé payé',
    'cp': 'Congé payé',
    'congé_payé': 'Congé payé',
    'conges_payes': 'Congé payé',
    
    // Maladie → "Maladie"
    'maladie': 'Maladie',
    'MALADIE': 'Maladie',
    'arret_maladie': 'Maladie',
    'arrêt maladie': 'Maladie',
    
    // Formation → "Formation"
    'formation': 'Formation',
    'FORMATION': 'Formation',
    
    // RTT → "RTT"
    'rtt': 'RTT',
    'Rtt': 'RTT',
    
    // Sans solde → "Sans solde"
    'sans solde': 'Sans solde',
    'sans_solde': 'Sans solde',
    'congé sans solde': 'Sans solde',
    
    // Événement familial → "Événement familial"
    'événement familial': 'Événement familial',
    'evenement_familial': 'Événement familial',
    'événement_familial': 'Événement familial',
    'mariage': 'Événement familial',
    'décès': 'Événement familial',
    'naissance': 'Événement familial',
    
    // Maternité/Paternité
    'maternité': 'Maternité',
    'maternite': 'Maternité',
    'paternité': 'Paternité',
    'paternite': 'Paternité'
  };
  
  // Récupérer tous les types distincts
  const typesDistincts = await prisma.conge.groupBy({
    by: ['type'],
    _count: true
  });
  
  console.log('\n📋 Types avant normalisation:');
  typesDistincts.forEach(t => console.log(`   "${t.type}": ${t._count}`));
  
  // Appliquer les corrections
  let totalModifies = 0;
  
  for (const [oldType, newType] of Object.entries(typeMapping)) {
    const result = await prisma.conge.updateMany({
      where: { type: oldType },
      data: { type: newType }
    });
    
    if (result.count > 0) {
      console.log(`\n✅ "${oldType}" → "${newType}": ${result.count} congés mis à jour`);
      totalModifies += result.count;
    }
  }
  
  // Vérifier le résultat
  const typesApres = await prisma.conge.groupBy({
    by: ['type'],
    _count: true
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Types APRÈS normalisation:');
  typesApres.forEach(t => console.log(`   "${t.type}": ${t._count}`));
  
  // Calculer les jours
  const allConges = await prisma.conge.findMany({
    select: { type: true, dateDebut: true, dateFin: true }
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
  
  console.log('\n📅 Répartition en JOURS (pour le graphique):');
  Object.entries(joursParType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, jours]) => {
      console.log(`   ${type}: ${jours} jours`);
    });
  console.log(`   TOTAL: ${totalJours} jours`);
  
  console.log(`\n✅ ${totalModifies} congés normalisés`);
  
  await prisma.$disconnect();
}

normalizeConges().catch(e => { console.error(e); prisma.$disconnect(); });
