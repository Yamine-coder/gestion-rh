const prisma = require('./prisma/client');

async function checkAdmin() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });
    
    if (admin) {
      console.log(`✅ Admin trouvé: ${admin.email} (ID: ${admin.id})`);
    } else {
      console.log('❌ AUCUN ADMIN trouvé');
    }
    
    // Vérifier aussi l'employé ID 12
    const employe12 = await prisma.user.findUnique({
      where: { id: 12 }
    });
    
    if (employe12) {
      console.log(`✅ Employé ID 12 trouvé: ${employe12.email} (${employe12.role})`);
    } else {
      console.log('❌ Employé ID 12 non trouvé');
      
      // Trouver un employé qui existe
      const premiers = await prisma.user.findMany({
        where: { role: 'employee' },
        take: 5,
        select: { id: true, email: true, nom: true, prenom: true }
      });
      
      console.log('📝 Employés disponibles:', premiers);
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    process.exit(0);
  }
}

checkAdmin();
