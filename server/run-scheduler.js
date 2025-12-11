const AnomalyScheduler = require('./services/anomalyScheduler');

async function runScheduler() {
  console.log('=== EXECUTION MANUELLE DU SCHEDULER ===');
  console.log('');
  
  const scheduler = new AnomalyScheduler();
  await scheduler.checkAllAnomalies();
  
  console.log('');
  console.log('Scheduler execute!');
}

runScheduler();
