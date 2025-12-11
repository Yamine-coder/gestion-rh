const scheduler = require('./services/anomalyScheduler');

async function runCheck() {
  console.log('=== EXECUTION MANUELLE DU SCHEDULER ===');
  console.log('');
  
  // Appeler checkEndedShifts qui est la méthode principale
  await scheduler.checkEndedShifts();
  
  console.log('');
  console.log('Scheduler execute!');
  
  // Verifier les anomalies
  const prisma = require('./prisma/client');
  const anomalies = await prisma.anomalie.findMany({ where: { employeId: 110 } });
  console.log('');
  console.log('Anomalies Jordan:', anomalies.length);
  anomalies.forEach(a => {
    console.log('  - ' + a.type + ': ' + a.description);
  });
  
  await prisma['$'+'disconnect']();
}

runCheck();
