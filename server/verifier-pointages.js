const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierPointages() {
  console.log('🔍 Vérification des pointages pour test@Mouss.com...');
  
  const employe = await prisma.user.findUnique({
    where: { email: 'test@Mouss.com' }
  });
  
  if (!employe) {
    console.log('❌ Employé non trouvé');
    return;
  }
  
  console.log('✅ Employé trouvé:', employe.nom, employe.prenom);
  
  const pointages = await prisma.pointage.findMany({
    where: { userId: employe.id },
    orderBy: { horodatage: 'desc' },
    take: 20
  });
  
  console.log(`📊 ${pointages.length} pointages trouvés:`);
  pointages.forEach(p => {
    const date = new Date(p.horodatage);
    const dateStr = date.toLocaleDateString('fr-FR');
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    console.log(`  ${p.type} - ${dateStr} à ${timeStr}`);
  });

  // Vérifier aussi les shifts
  const shifts = await prisma.shift.findMany({
    where: { employeId: employe.id },
    orderBy: { date: 'desc' },
    take: 10
  });
  
  console.log(`\n📅 ${shifts.length} shifts trouvés:`);
  shifts.forEach(s => {
    const date = new Date(s.date);
    const dateStr = date.toLocaleDateString('fr-FR');
    console.log(`  ${s.type} - ${dateStr} - ${s.segments?.length || 0} segments`);
  });
}

verifierPointages().catch(console.error).finally(() => process.exit(0));
