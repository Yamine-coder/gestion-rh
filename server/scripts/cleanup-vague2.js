/**
 * Cleanup vague 2 : supprime les faux positifs et doublons identifiés par l'analyse approfondie
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  // IDs identifiés par l'analyse approfondie
  const fauxEtDoublons = [
    // extra_potentiel faux (bug calcul nuit - "Xh après la fin" = impossible)
    216, 213, 217, 211, 212, 235, 309, 283, 311, 291, 335, 353, 334,
    // missing_out_prolonge doublons avec cloture_auto_journee
    57, 102, 132, 107, 135, 133, 199, 183, 244, 243, 248, 234, 231, 246, 249, 250, 247, 245,
    314, 317, 316, 281, 288, 289, 318, 313, 315, 280,
    // missing_out_prolonge faux (pointages complets)
    187, 196, 198,
    // pause_excessive faux (pause = coupure prévue du shift)
    77, 79, 76, 204, 205, 269, 350, 340,
  ];

  // IDs douteux extra_potentiel qui sont en fait faux (3400min d'avance = bug)
  const douteuxFaux = [158, 137, 140, 151, 153, 155, 157];
  
  // segment_non_pointe faux (pointages existent pour ce segment)
  const segmentsFaux = [46, 118, 116, 374];
  
  const allIds = [...fauxEtDoublons, ...douteuxFaux, ...segmentsFaux];

  console.log(`\nCleanup vague 2 - ${DRY_RUN ? 'DRY RUN' : 'MODE RÉEL'}`);
  console.log(`${allIds.length} anomalies à supprimer\n`);

  // Vérifier que les anomalies existent et sont en_attente
  const existing = await prisma.anomalie.findMany({
    where: { id: { in: allIds }, statut: 'en_attente' },
    include: { employe: { select: { nom: true, prenom: true } } }
  });

  console.log(`${existing.length} trouvées en_attente sur ${allIds.length} demandées\n`);
  
  // Détail
  const byType = {};
  existing.forEach(a => {
    if (!byType[a.type]) byType[a.type] = [];
    byType[a.type].push(a);
  });
  Object.entries(byType).forEach(([type, list]) => {
    console.log(`  ${type}: ${list.length}`);
    list.forEach(a => {
      const d = a.date.toISOString().split('T')[0];
      console.log(`    #${a.id} ${a.employe?.prenom} ${a.employe?.nom} ${d}`);
    });
  });

  if (!DRY_RUN && existing.length > 0) {
    const ids = existing.map(a => a.id);
    const result = await prisma.anomalie.deleteMany({
      where: { id: { in: ids } }
    });
    console.log(`\n✅ ${result.count} anomalies supprimées`);
  }

  // Compter ce qui reste
  const restantes = await prisma.anomalie.count({ where: { statut: 'en_attente' } });
  console.log(`\n📋 Anomalies en_attente restantes: ${restantes}`);
}

main()
  .catch(err => { console.error('Erreur:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
