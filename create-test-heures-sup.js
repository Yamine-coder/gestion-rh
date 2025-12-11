const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function createAnomalies() {
  // Chercher tous les employés
  const employes = await prisma.user.findMany({
    where: { role: 'employee' },
    take: 4
  });
  
  console.log('Employes trouves:', employes.length);
  
  if (employes.length === 0) {
    console.log('Aucun employe trouve');
    return;
  }
  
  console.log('Employes:', employes.map(e => e.prenom + ' ' + e.nom));
  
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const today = new Date();
  
  for (let i = 0; i < employes.length; i++) {
    const emp = employes[i];
    const date = new Date(today);
    date.setDate(date.getDate() - i - 1);
    
    // Heures sup entre 45min et 2h15
    const minutesExtra = Math.floor(Math.random() * 90) + 45;
    
    const created = await prisma.anomalie.create({
      data: {
        employeId: emp.id,
        type: 'heures_supplementaires',
        date: date,
        gravite: 'info',
        statut: 'en_attente',
        description: `Heures supplementaires: +${(minutesExtra/60).toFixed(2)}h`,
        heuresExtra: minutesExtra / 60,
        details: {
          minutesEcart: minutesExtra,
          heureReelle: '20:30',
          heurePrevue: '19:00',
          source: 'test'
        }
      }
    });
    console.log(`✅ Anomalie ${created.id} - ${emp.prenom} ${emp.nom} - +${(minutesExtra/60).toFixed(2)}h (${minutesExtra} min)`);
  }
  
  console.log('\n📊 Anomalies heures sup creees avec succes!');
  await prisma.$disconnect();
}

createAnomalies().catch(console.error);
