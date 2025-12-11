const axios = require('axios');

async function main() {
  // Login pour obtenir le token
  const loginRes = await axios.post('http://localhost:5000/auth/login', {
    email: 'yjordan496@gmail.com',
    password: 'Test1234!'
  });
  
  const token = loginRes.data.token;
  console.log('✅ Token obtenu');
  
  // Date du jour
  const today = new Date().toISOString().split('T')[0];
  console.log('\n📅 Date recherchée:', today);
  
  // Test API anomalies
  console.log('\n🔍 Test /api/anomalies...');
  try {
    const anomaliesRes = await axios.get(`http://localhost:5000/api/anomalies?dateDebut=${today}&dateFin=${today}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Réponse anomalies:', JSON.stringify(anomaliesRes.data, null, 2));
  } catch (err) {
    console.log('Erreur anomalies:', err.response?.status, err.response?.data || err.message);
  }
  
  // Vérifier en base
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const jordan = await prisma.user.findUnique({ where: { email: 'yjordan496@gmail.com' } });
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const anomaliesDB = await prisma.anomalie.findMany({
    where: {
      employeId: jordan.id,
      date: { gte: todayDate, lt: tomorrow }
    }
  });
  
  console.log('\n📊 Anomalies en base pour Jordan:', anomaliesDB.length);
  anomaliesDB.forEach(a => {
    console.log('  - ID:', a.id, 'Type:', a.type, 'Date:', a.date, 'Statut:', a.statut);
  });
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Erreur:', err.message);
});
