const prisma = require('./server/prisma/client');

async function checkPointageBug() {
  try {
    // Récupérer Jordan
    const jordan = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: { contains: 'jordan' } },
          { prenom: { contains: 'Jordan', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log('=== EMPLOYE ===');
    console.log('ID:', jordan?.id);
    console.log('Nom:', jordan?.prenom, jordan?.nom);
    console.log('Email:', jordan?.email);
    
    if (!jordan) {
      console.log('Employé Jordan non trouvé');
      return;
    }
    
    // Vérifier les pointages du 6 décembre 2025
    const dateDebut = new Date('2025-12-06T00:00:00');
    const dateFin = new Date('2025-12-07T00:00:00');
    
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: jordan.id,
        horodatage: {
          gte: dateDebut,
          lt: dateFin
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log('\n=== POINTAGES DU 6 DECEMBRE 2025 ===');
    console.log('Nombre de pointages:', pointages.length);
    
    pointages.forEach((p, index) => {
      const heureLocale = new Date(p.horodatage).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
      console.log(`${index + 1}. Type: ${p.type}`);
      console.log(`   Heure: ${heureLocale}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Brut DB: ${p.horodatage}`);
      console.log('');
    });
    
    // Vérifier aussi les shifts de ce jour
    const shifts = await prisma.shift.findMany({
      where: {
        userId: jordan.id,
        date: new Date('2025-12-06')
      }
    });
    
    console.log('\n=== SHIFTS DU 6 DECEMBRE 2025 ===');
    console.log('Nombre de shifts:', shifts.length);
    
    shifts.forEach((s, index) => {
      console.log(`${index + 1}. Debut: ${s.heureDebut} - Fin: ${s.heureFin}`);
      console.log(`   ID: ${s.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPointageBug();
