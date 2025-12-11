const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierShiftsConges() {
  console.log('\n🔍 Vérification des shifts créés pour les congés\n');

  try {
    // Vérifier les shifts de novembre pour les 3 employés
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: { in: [49, 50, 88] },
        date: {
          gte: new Date('2025-11-01'),
          lte: new Date('2025-11-30')
        }
      },
      orderBy: [
        { employeId: 'asc' },
        { date: 'asc' }
      ],
      include: {
        employe: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    console.log(`📋 ${shifts.length} shifts trouvés pour novembre 2025\n`);

    const parEmploye = {};
    shifts.forEach(s => {
      const nom = `${s.employe.nom} ${s.employe.prenom}`;
      if (!parEmploye[nom]) parEmploye[nom] = [];
      parEmploye[nom].push(s);
    });

    Object.entries(parEmploye).forEach(([nom, shiftsEmp]) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 ${nom}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      shiftsEmp.forEach(shift => {
        const date = new Date(shift.date).toLocaleDateString('fr-FR');
        const icon = shift.type === 'absence' ? '🏖️' : '💼';
        console.log(`   ${icon} ${date}: type="${shift.type}", motif="${shift.motif || '-'}"`);
        if (shift.type === 'absence' && shift.motif) {
          console.log(`      ✅ Shift congé détecté !`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifierShiftsConges();
