const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createLongWorkday() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (user) {
      const today = new Date();
      today.setSeconds(0, 0);
      
      const schedule = [
        { type: 'arrivee', hour: 7, minute: 30 },  // Arrivée tôt
        { type: 'depart', hour: 12, minute: 0 },   // Pause midi
        { type: 'arrivee', hour: 13, minute: 0 },  // Retour rapide
        { type: 'depart', hour: 19, minute: 45 }   // Fin très tard
      ];
      
      for (const s of schedule) {
        const time = new Date(today);
        time.setHours(s.hour, s.minute, 0, 0);
        
        await prisma.pointage.create({
          data: {
            userId: user.id,
            type: s.type,
            horodatage: time
          }
        });
      }
      
      console.log('✅ Journée de 10h15 créée');
    }
  } catch (error) {
    console.log('❌ Erreur');
  } finally {
    await prisma.$disconnect();
  }
}

createLongWorkday();
