const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const conges = await prisma.conge.findMany({
    where: { user: { email: 'yjordan496@gmail.com' } },
    include: { user: true },
    orderBy: { dateDebut: 'desc' }
  });

  console.log(`\n📋 ${conges.length} congés trouvés:\n`);
  
  conges.forEach((c, i) => {
    console.log(`${i+1}. Type: "${c.type}"`);
    console.log(`   Statut: "${c.statut}"`);
    console.log(`   Dates: ${c.dateDebut.toLocaleDateString('fr-FR')} - ${c.dateFin.toLocaleDateString('fr-FR')}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
