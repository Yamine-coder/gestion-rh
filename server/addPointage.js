// Script pour ajouter des pointages de test
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // D'abord, récupérer un utilisateur avec le rôle employee
    const employee = await prisma.user.findFirst({
      where: { role: 'employee' },
      select: { id: true, email: true }
    });

    if (!employee) {
      console.error('❌ Aucun employé trouvé dans la base de données');
      return;
    }

    console.log(`✅ Employé trouvé: ${employee.email} (ID: ${employee.id})`);

    // Ajouter un pointage d'arrivée aujourd'hui à 8h00
    const today = new Date();
    today.setHours(8, 0, 0, 0); // 8h00 ce matin
    
    const arrivee = await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: today,
        userId: employee.id
      }
    });
    console.log(`✅ Pointage arrivée créé à ${arrivee.horodatage}`);

    // Ajouter un pointage de départ aujourd'hui à 17h00
    const depart = new Date();
    depart.setHours(17, 0, 0, 0); // 17h00 ce soir
    
    const departPointage = await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: depart,
        userId: employee.id
      }
    });
    console.log(`✅ Pointage départ créé à ${departPointage.horodatage}`);

    // Vérifier les pointages de cet employé
    const pointages = await prisma.pointage.findMany({
      where: { userId: employee.id },
      orderBy: { horodatage: 'desc' },
      take: 5
    });

    console.log('📊 Derniers pointages:');
    pointages.forEach(p => {
      console.log(`- ${p.type} le ${p.horodatage.toLocaleString()}`);
    });

    // Calculer le temps total pour aujourd'hui
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayPointages = await prisma.pointage.findMany({
      where: { 
        userId: employee.id,
        horodatage: { gte: todayStart }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    let totalMs = 0;
    for (let i = 0; i < todayPointages.length - 1; i++) {
      if (todayPointages[i].type === 'arrivee' && todayPointages[i+1].type === 'depart') {
        const ms = todayPointages[i+1].horodatage - todayPointages[i].horodatage;
        totalMs += ms;
        i++; // sauter la paire
      }
    }
    
    const heures = Math.floor(totalMs / 1000 / 60 / 60);
    const minutes = Math.floor((totalMs / 1000 / 60) % 60);
    
    console.log(`⏱️ Temps de présence aujourd'hui: ${heures}h${minutes}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
