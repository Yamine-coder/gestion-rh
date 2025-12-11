// Créer des congés de test approuvés pour alimenter les graphiques d'absences

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestConges() {
  console.log('🔧 Création de congés de test approuvés...\n');

  // Récupérer quelques employés
  const employes = await prisma.user.findMany({
    where: { role: 'employee', statut: 'actif' },
    take: 15
  });

  const typesConges = [
    'congés payés',
    'congés payés', 
    'congés payés',
    'RTT',
    'RTT',
    'maladie',
    'maladie',
    'maladie',
    'événement familial',
    'sans solde',
    'congés payés',
    'formation'
  ];

  const today = new Date();
  const congesACreer = [];

  // Créer des congés variés sur les 60 derniers jours
  for (let i = 0; i < Math.min(12, employes.length); i++) {
    const emp = employes[i];
    const type = typesConges[i % typesConges.length];
    
    // Dates aléatoires dans les 60 derniers jours
    const joursAvant = Math.floor(Math.random() * 55) + 5;
    const duree = type === 'maladie' 
      ? Math.floor(Math.random() * 5) + 1  // 1-5 jours pour maladie
      : type === 'RTT' 
        ? 1  // 1 jour pour RTT
        : Math.floor(Math.random() * 10) + 1;  // 1-10 jours pour autres
    
    const dateDebut = new Date(today);
    dateDebut.setDate(dateDebut.getDate() - joursAvant);
    
    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateFin.getDate() + duree - 1);

    congesACreer.push({
      userId: emp.id,
      type: type,
      dateDebut: dateDebut,
      dateFin: dateFin,
      statut: 'approuvé',
      motifEmploye: `Demande de ${type} - Test`,
      createdAt: new Date(dateDebut.getTime() - 7 * 24 * 60 * 60 * 1000) // Créé 7 jours avant
    });
  }

  console.log(`📊 Congés à créer: ${congesACreer.length}`);
  console.log('\nDétail des congés:');
  
  for (const conge of congesACreer) {
    const emp = employes.find(e => e.id === conge.userId);
    const duree = Math.ceil((conge.dateFin - conge.dateDebut) / (1000 * 60 * 60 * 24)) + 1;
    console.log(`   - ${emp.prenom} ${emp.nom}: ${conge.type} (${duree}j) du ${conge.dateDebut.toLocaleDateString('fr-FR')} au ${conge.dateFin.toLocaleDateString('fr-FR')}`);
  }

  // Créer les congés
  await prisma.conge.createMany({
    data: congesACreer,
    skipDuplicates: true
  });

  // Vérification
  const congesApprouves = await prisma.conge.count({
    where: { statut: 'approuvé' }
  });

  // Résumé par type
  const congesParType = await prisma.conge.groupBy({
    by: ['type'],
    where: { statut: 'approuvé' },
    _count: { id: true }
  });

  console.log(`\n✅ Total congés approuvés: ${congesApprouves}`);
  console.log('\nRépartition par type:');
  congesParType.forEach(c => {
    console.log(`   - ${c.type}: ${c._count.id}`);
  });

  await prisma.$disconnect();
}

createTestConges().catch(e => {
  console.error('Erreur:', e);
  prisma.$disconnect();
});
