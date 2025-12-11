// Test de détection d'absence pour Marco (5 décembre)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST DÉTECTION ABSENCE ===\n');
  
  // 1. Vérifier la situation de Marco
  const marco = await prisma.user.findFirst({ where: { email: 'marco.romano@restaurant.com' } });
  if (!marco) {
    console.log('❌ Marco non trouvé');
    return;
  }
  console.log('✅ Marco trouvé - ID:', marco.id);
  
  // 2. Shift du 5 décembre
  const dateTarget = new Date('2025-12-05');
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: marco.id,
      date: {
        gte: new Date('2025-12-05T00:00:00Z'),
        lt: new Date('2025-12-06T00:00:00Z')
      }
    }
  });
  
  if (shift) {
    console.log('✅ Shift trouvé pour le 5 décembre:');
    console.log('   Type:', shift.type);
    console.log('   Segments:', JSON.stringify(shift.segments));
  } else {
    console.log('❌ Aucun shift trouvé pour le 5 décembre');
  }
  
  // 3. Pointages du 5 décembre
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: marco.id,
      horodatage: {
        gte: new Date('2025-12-05T00:00:00Z'),
        lt: new Date('2025-12-06T00:00:00Z')
      }
    }
  });
  
  console.log('\n📍 Pointages du 5 décembre:', pointages.length);
  pointages.forEach(p => console.log('  ', p.horodatage.toISOString(), p.type));
  
  // 4. Anomalies existantes pour le 5 décembre
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId: marco.id,
      date: {
        gte: new Date('2025-12-05T00:00:00Z'),
        lt: new Date('2025-12-06T00:00:00Z')
      }
    }
  });
  
  console.log('\n⚠️ Anomalies existantes pour le 5 décembre:', anomalies.length);
  anomalies.forEach(a => console.log('  ', a.type, '-', a.statut));
  
  // 5. CRÉER une anomalie d'absence si nécessaire
  if (shift && shift.type === 'présence' && pointages.length === 0 && anomalies.length === 0) {
    console.log('\n🔴 SITUATION: Shift prévu SANS pointage et SANS anomalie');
    console.log('   → Création d\'une anomalie d\'absence...');
    
    // Calculer les heures prévues
    let minutesPrevues = 0;
    if (shift.segments && Array.isArray(shift.segments)) {
      shift.segments.forEach(seg => {
        const start = seg.start || seg.debut;
        const end = seg.end || seg.fin;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          minutesPrevues += (eh * 60 + em) - (sh * 60 + sm);
        }
      });
    }
    
    const anomalie = await prisma.anomalie.create({
      data: {
        employeId: marco.id,
        date: new Date('2025-12-05T12:00:00Z'),
        type: 'absence_non_justifiee',
        gravite: 'critique',
        statut: 'en_attente',
        details: {
          motif: 'Absence complète - aucun pointage enregistré',
          heuresPrevues: (minutesPrevues / 60).toFixed(2),
          heuresTravaillees: 0,
          ecartMinutes: -minutesPrevues,
          shiftId: shift.id
        },
        description: `Absence non justifiée - ${(minutesPrevues / 60).toFixed(1)}h prévues, aucun pointage`
      }
    });
    
    console.log('   ✅ Anomalie créée ! ID:', anomalie.id);
    console.log('   Type:', anomalie.type);
    console.log('   Gravité:', anomalie.gravite);
  } else if (anomalies.length > 0) {
    console.log('\n✅ Anomalie(s) déjà existante(s) pour cette date');
  } else if (pointages.length > 0) {
    console.log('\n✅ Des pointages existent - pas d\'absence totale');
  } else if (!shift) {
    console.log('\n✅ Pas de shift prévu - pas d\'anomalie à créer');
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Erreur:', e);
  prisma.$disconnect();
});
