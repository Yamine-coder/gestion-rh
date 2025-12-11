const prisma = require('./prisma/client');

async function testShiftsDashboard() {
  try {
    const date = '2025-10-20';
    
    // Récupérer les shifts du jour
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(`${date}T00:00:00Z`),
          lt: new Date('2025-10-21T00:00:00Z')
        }
      },
      include: {
        employe: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      }
    });

    console.log('\n📋 SHIFTS DU', date, ':', shifts.length);
    console.log('━'.repeat(80));

    shifts.forEach((shift, idx) => {
      console.log(`\n${idx + 1}. Shift ID: ${shift.id}`);
      console.log(`   Type: ${shift.type}`);
      console.log(`   Employé:`, shift.employe ? 
        `${shift.employe.prenom} ${shift.employe.nom} (ID: ${shift.employe.id})` : 
        'NON ASSIGNÉ'
      );
      console.log(`   Date:`, new Date(shift.date).toISOString());
      console.log(`   Segments:`, JSON.stringify(shift.segments, null, 2));
    });

    // Récupérer aussi les pointages
    console.log('\n\n⏰ POINTAGES DU', date);
    console.log('━'.repeat(80));

    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: new Date(`${date}T00:00:00Z`),
          lt: new Date('2025-10-21T00:00:00Z')
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    pointages.forEach((p, idx) => {
      console.log(`\n${idx + 1}. Pointage ID: ${p.id}`);
      console.log(`   Type: ${p.type}`);
      console.log(`   Employé: ${p.user.prenom} ${p.user.nom} (ID: ${p.user.id})`);
      console.log(`   Horodatage:`, new Date(p.horodatage).toLocaleString('fr-FR', { 
        timeZone: 'Europe/Paris' 
      }));
    });

    console.log('\n' + '━'.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testShiftsDashboard();
