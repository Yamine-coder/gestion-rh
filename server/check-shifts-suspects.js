// Vérifier les shifts avec heures suspectes

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShifts() {
  const shifts = await prisma.shift.findMany({
    where: { segments: { not: undefined } },
    include: { employe: { select: { prenom: true, nom: true } } }
  });

  console.log('=== SHIFTS AVEC HEURES SUSPECTES (avant 6h) ===\n');

  let suspects = 0;
  let normaux = 0;

  shifts.forEach(s => {
    if (s.segments && s.segments[0] && s.segments[0].start) {
      const h = parseInt(s.segments[0].start.split(':')[0]);
      if (h < 6) {
        suspects++;
        if (suspects <= 20) {
          console.log(`⚠️ Shift ${s.id}: ${s.employe?.prenom} ${s.employe?.nom} - Début: ${s.segments[0].start} - Fin: ${s.segments[0].end} - Type: ${s.type}`);
        }
      } else {
        normaux++;
      }
    }
  });

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   Shifts normaux (début >= 6h): ${normaux}`);
  console.log(`   Shifts suspects (début < 6h): ${suspects}`);

  // Ces shifts suspects faussent le calcul des retards
  console.log(`\n💡 Ces ${suspects} shifts avec des heures de début avant 6h00`);
  console.log(`   faussent probablement le calcul des retards.`);

  await prisma.$disconnect();
}

checkShifts();
