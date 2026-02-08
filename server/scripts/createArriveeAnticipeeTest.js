const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createArriveeAnticipeeTest() {
  // Trouver un employé avec un shift récent
  const shift = await prisma.shift.findFirst({
    where: {
      date: {
        gte: new Date('2026-01-26'),
        lte: new Date('2026-01-28')
      },
      type: 'travail'
    },
    include: { employe: true }
  });
  
  if (!shift) {
    console.log('❌ Aucun shift trouvé pour créer le test');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`📅 Shift trouvé: ${shift.employe.prenom} ${shift.employe.nom} - ${shift.date}`);
  
  // Parser les segments pour obtenir l'heure de début
  const segments = typeof shift.segments === 'string' 
    ? JSON.parse(shift.segments) 
    : shift.segments;
  
  const premierSegment = segments?.[0];
  if (!premierSegment) {
    console.log('❌ Pas de segment dans le shift');
    await prisma.$disconnect();
    return;
  }
  
  const debutPrevu = premierSegment.start; // ex: "09:00"
  
  // Simuler une arrivée 50 min en avance
  const [h, m] = debutPrevu.split(':').map(Number);
  const arriveeH = h - 1; // 1h avant
  const arriveeMin = m + 10; // +10 min = 50 min en avance
  const heureArrivee = `${String(arriveeH).padStart(2, '0')}:${String(arriveeMin).padStart(2, '0')}`;
  
  console.log(`⏰ Début prévu: ${debutPrevu}, Arrivée simulée: ${heureArrivee} (50 min en avance)`);
  
  // Créer l'anomalie arrivee_anticipee_extra
  const anomalie = await prisma.anomalie.create({
    data: {
      employeId: shift.employeId,
      date: shift.date,
      type: 'arrivee_anticipee_extra',
      gravite: 'a_valider',
      description: `⚠️ Extra potentiel (arrivée): arrivé à ${heureArrivee}, 50 min en avance (prévu ${debutPrevu}) → Validation managériale requise`,
      statut: 'en_attente',
      heuresExtra: 0.83, // 50 min en heures - au niveau racine
      ecartMinutes: 50,  // écart au niveau racine
      details: {
        shiftId: shift.id,
        heureDebutPrevue: debutPrevu,
        heureArriveeReelle: heureArrivee,
        ecartMinutes: 50,
        minutesEnAvance: 50,
        heuresSup: 0.83 // 50 min en heures
      }
    }
  });
  
  console.log(`\n✅ Anomalie créée: #${anomalie.id}`);
  console.log(`   Type: ${anomalie.type}`);
  console.log(`   Employé: ${shift.employe.prenom} ${shift.employe.nom}`);
  console.log(`   Date: ${shift.date}`);
  console.log(`   Description: ${anomalie.description}`);
  
  await prisma.$disconnect();
}

createArriveeAnticipeeTest().catch(err => {
  console.error('Erreur:', err);
  prisma.$disconnect();
});
