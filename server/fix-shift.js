// Corriger le shift pour qu'il soit détecté par le frontend
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixShift() {
  const today = new Date('2025-12-04T00:00:00');
  const tomorrow = new Date('2025-12-05T00:00:00');
  
  // Vérifier le shift actuel
  const currentShift = await prisma.shift.findFirst({
    where: {
      employeId: 93,
      date: { gte: today, lt: tomorrow }
    }
  });
  
  console.log('Shift actuel:', currentShift);
  
  if (currentShift) {
    // Mettre à jour avec type 'présence' pour être détecté
    await prisma.shift.update({
      where: { id: currentShift.id },
      data: {
        type: 'présence',
        segments: [
          { debut: '09:00', fin: '12:30', poste: 'Service' },
          { debut: '13:30', fin: '17:00', poste: 'Service' }
        ]
      }
    });
    console.log('✅ Shift mis à jour avec type "présence"');
  } else {
    // Créer un nouveau shift
    await prisma.shift.create({
      data: {
        employeId: 93,
        date: today,
        type: 'présence',
        segments: [
          { debut: '09:00', fin: '12:30', poste: 'Service' },
          { debut: '13:30', fin: '17:00', poste: 'Service' }
        ],
        version: 1
      }
    });
    console.log('✅ Shift créé avec type "présence"');
  }
  
  // Vérifier
  const updatedShift = await prisma.shift.findFirst({
    where: {
      employeId: 93,
      date: { gte: today, lt: tomorrow }
    }
  });
  console.log('Shift après correction:', updatedShift);
  
  await prisma.$disconnect();
}

fixShift();
