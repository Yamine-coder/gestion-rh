const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jordan = await prisma.user.findUnique({ where: { email: 'yjordan496@gmail.com' } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Supprimer les pointages et anomalies existants
  await prisma.anomalie.deleteMany({ where: { employeId: jordan.id, date: { gte: today, lt: tomorrow } } });
  await prisma.pointage.deleteMany({ where: { userId: jordan.id, horodatage: { gte: today, lt: tomorrow } } });
  
  console.log('🧹 Données nettoyées\n');
  
  /**
   * SCÉNARIO : Pause décalée
   * 
   * Shift prévu:
   *   09:00 - 12:00 (travail matin)
   *   12:00 - 13:00 (pause)
   *   13:00 - 17:00 (travail après-midi)
   * 
   * Pointages réels:
   *   09:00 - Arrivée (à l'heure ✓)
   *   12:30 - Sortie pause (30 min de retard sur la pause)
   *   12:45 - Retour pause (15 min plus tôt, pause courte de 15min seulement!)
   *   17:00 - Départ (à l'heure ✓)
   * 
   * Résultat:
   *   - Matin: 09:00-12:30 = 3h30 (au lieu de 3h) → +30 min
   *   - Pause: 12:30-12:45 = 15 min (au lieu de 1h) → pause écourtée
   *   - Après-midi: 12:45-17:00 = 4h15 (au lieu de 4h) → +15 min
   *   - Total travaillé: 7h45 (au lieu de 7h) → +45 min de travail!
   */
  
  const p1 = new Date(today); p1.setHours(9, 0, 0, 0);    // Arrivée à l'heure
  const p2 = new Date(today); p2.setHours(12, 30, 0, 0);  // Sortie pause en retard (+30min)
  const p3 = new Date(today); p3.setHours(12, 45, 0, 0);  // Retour pause anticipé (pause de 15min seulement)
  const p4 = new Date(today); p4.setHours(17, 0, 0, 0);   // Départ à l'heure
  
  await prisma.pointage.createMany({
    data: [
      { userId: jordan.id, type: 'arrivee', horodatage: p1 },
      { userId: jordan.id, type: 'depart', horodatage: p2 },
      { userId: jordan.id, type: 'arrivee', horodatage: p3 },
      { userId: jordan.id, type: 'depart', horodatage: p4 }
    ]
  });
  
  console.log('✅ 4 pointages créés:\n');
  console.log('   PRÉVU              RÉEL              ÉCART');
  console.log('   ─────────────────────────────────────────────');
  console.log('   09:00 Arrivée  →   09:00 Arrivée     ✓ À l\'heure');
  console.log('   12:00 Pause    →   12:30 Pause       +30 min (travail en plus)');
  console.log('   13:00 Retour   →   12:45 Retour      -15 min (pause écourtée)');
  console.log('   17:00 Départ   →   17:00 Départ      ✓ À l\'heure');
  console.log('');
  console.log('📊 Analyse:');
  console.log('   • Matin travaillé: 3h30 (prévu 3h) → +30 min');
  console.log('   • Pause réelle: 15 min (prévu 1h) → pause très courte!');
  console.log('   • Après-midi: 4h15 (prévu 4h) → +15 min');
  console.log('   • TOTAL: 7h45 travaillées (prévu 7h) → +45 min');
  console.log('');
  console.log('⚠️  Ce scénario montre un employé qui a travaillé PLUS que prévu');
  console.log('    en prenant une pause très courte (15 min au lieu de 1h)');
}

main().finally(() => prisma.$disconnect());
