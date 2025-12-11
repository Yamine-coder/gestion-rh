const p = require('./prisma/client');

async function clean() {
  const today = new Date().toISOString().split('T')[0];
  
  // Supprimer les pointages de Jordan pour aujourd'hui
  const pointages = await p.pointage.deleteMany({ 
    where: { 
      userId: 110,
      horodatage: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    } 
  });
  console.log('Pointages supprimés:', pointages.count);
  
  // Supprimer les anomalies de Jordan pour aujourd'hui
  const anomalies = await p.anomalie.deleteMany({ 
    where: { 
      employeId: 110,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    } 
  });
  console.log('Anomalies supprimées:', anomalies.count);
  
  await p.$disconnect();
}

clean();
