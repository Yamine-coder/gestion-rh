const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Vérifier le statut Navigo de quelques employés
  const employes = await prisma.user.findMany({
    where: { role: 'employee', statut: 'actif' },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      justificatifNavigo: true,
      eligibleNavigo: true
    },
    take: 5
  });

  console.log('📋 Statut Navigo des employés:');
  for (const emp of employes) {
    console.log(`  - ${emp.prenom} ${emp.nom} (${emp.email})`);
    console.log(`    Éligible: ${emp.eligibleNavigo ? '✓ Oui' : '✗ Non'}`);
    console.log(`    Justificatif: ${emp.justificatifNavigo || '(aucun)'}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
