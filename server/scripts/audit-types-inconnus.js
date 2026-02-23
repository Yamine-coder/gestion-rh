const prisma = require('../prisma/client');

async function main() {
  // pause_excessive - d'où viennent-ils ?
  const pauses = await prisma.anomalie.findMany({
    where: { type: 'pause_excessive', statut: 'en_attente' },
    select: { id: true, employeId: true, date: true, description: true, details: true }
  });
  console.log('=== pause_excessive (7) ===');
  pauses.forEach(p => {
    console.log(`  #${p.id} emp${p.employeId} ${p.date?.toISOString().split('T')[0]} | detectePar: ${p.details?.detectePar} | ${p.description?.substring(0, 100)}`);
    if (p.details?.pauseDetectee) console.log(`    pauseDetectee: ${p.details.pauseDetectee}min`);
    if (p.details?.pausePrevue) console.log(`    pausePrevue: ${p.details.pausePrevue}`);
  });

  // hors_plage + presence_non_prevue
  const autres = await prisma.anomalie.findMany({
    where: { type: { in: ['hors_plage_in_critique', 'hors_plage_out_critique', 'presence_non_prevue'] }, statut: 'en_attente' },
    select: { id: true, type: true, employeId: true, date: true, description: true, details: true }
  });
  console.log('\n=== hors_plage / presence_non_prevue ===');
  autres.forEach(a => {
    console.log(`  #${a.id} ${a.type} emp${a.employeId} ${a.date?.toISOString().split('T')[0]} | detectePar: ${a.details?.detectePar} | ${a.description?.substring(0, 100)}`);
  });

  // segment_non_pointe
  const snp = await prisma.anomalie.findMany({
    where: { type: 'segment_non_pointe', statut: 'en_attente' },
    select: { id: true, employeId: true, date: true, description: true, details: true }
  });
  console.log('\n=== segment_non_pointe ===');
  snp.forEach(s => {
    console.log(`  #${s.id} emp${s.employeId} ${s.date?.toISOString().split('T')[0]} | detectePar: ${s.details?.detectePar} | ${s.description?.substring(0, 100)}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
