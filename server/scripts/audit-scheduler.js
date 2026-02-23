// Audit: vérifier les faux positifs potentiels restants
const prisma = require('../prisma/client');

async function main() {
  // 1. Types de shift distincts
  const types = await prisma.$queryRawUnsafe('SELECT DISTINCT type FROM "Shift"');
  console.log('=== Types de shift en base ===');
  types.forEach(t => console.log(' ', t.type));
  
  // 2. Absences injustifiées où l'employé a un congé approuvé
  const absencesAvecConge = await prisma.$queryRawUnsafe(`
    SELECT a.id, a."employeId", a.date, a.description,
           c.id as conge_id, c."dateDebut", c."dateFin", c.statut as conge_statut
    FROM "Anomalie" a
    JOIN "Conge" c ON c."userId" = a."employeId"
      AND a.date::date >= c."dateDebut"::date
      AND a.date::date <= c."dateFin"::date
      AND c.statut = 'approuve'
    WHERE a.type = 'absence_injustifiee'
    AND a.statut = 'en_attente'
  `);
  console.log('\n=== Absences injustifiées avec congé approuvé (faux positifs) ===');
  console.log('Total:', absencesAvecConge.length);
  absencesAvecConge.forEach(a => {
    const dateAnomalie = a.date?.toISOString().split('T')[0];
    const dateDebut = a.dateDebut?.toISOString().split('T')[0];
    const dateFin = a.dateFin?.toISOString().split('T')[0];
    console.log(`  Emp ${a.employeId} | Anomalie ${dateAnomalie} | Congé ${dateDebut} → ${dateFin}`);
  });
  
  // 3. Anomalies restantes par type
  const parType = await prisma.$queryRawUnsafe(`
    SELECT type, COUNT(*) as total
    FROM "Anomalie"
    WHERE statut = 'en_attente'
    GROUP BY type
    ORDER BY total DESC
  `);
  console.log('\n=== Anomalies en_attente par type ===');
  parType.forEach(t => console.log(`  ${t.type}: ${t.total}`));
  
  // 4. Vérifier s'il y a des anomalies pour des employés inactifs
  const anomaliesInactifs = await prisma.$queryRawUnsafe(`
    SELECT a.id, a."employeId", a.type, a.date, u.statut as user_statut
    FROM "Anomalie" a
    JOIN "User" u ON u.id = a."employeId"
    WHERE a.statut = 'en_attente'
    AND u.statut != 'actif'
  `);
  console.log('\n=== Anomalies en_attente pour employés inactifs ===');
  console.log('Total:', anomaliesInactifs.length);
  anomaliesInactifs.forEach(a => {
    console.log(`  Emp ${a.employeId} (${a.user_statut}) | ${a.type} | ${a.date?.toISOString().split('T')[0]}`);
  });
  
  // 5. Vérifier les anomalies en doublon (même employé, même date, même type)
  const doublons = await prisma.$queryRawUnsafe(`
    SELECT "employeId", date::date as jour, type, COUNT(*) as nb
    FROM "Anomalie"
    WHERE statut = 'en_attente'
    GROUP BY "employeId", date::date, type
    HAVING COUNT(*) > 1
    ORDER BY nb DESC
  `);
  console.log('\n=== Doublons potentiels (même emp/date/type) ===');
  console.log('Total groupes:', doublons.length);
  doublons.forEach(d => {
    console.log(`  Emp ${d.employeId} | ${d.jour?.toISOString().split('T')[0]} | ${d.type} x${d.nb}`);
  });
  
  // 6. Extra potentiels - vérifier les valeurs extremes de minutesEnAvance/minutesApres
  const extrasExtremes = await prisma.$queryRawUnsafe(`
    SELECT id, "employeId", date, description, details
    FROM "Anomalie"
    WHERE type = 'extra_potentiel'
    AND statut = 'en_attente'
    AND (
      (details->>'minutesEnAvance')::int > 240
      OR (details->>'minutesApres')::int > 480
    )
  `);
  console.log('\n=== Extra potentiels avec valeurs extrêmes ===');
  console.log('Total:', extrasExtremes.length);
  extrasExtremes.forEach(e => {
    const mins = e.details?.minutesEnAvance || e.details?.minutesApres;
    console.log(`  #${e.id} Emp ${e.employeId} | ${e.date?.toISOString().split('T')[0]} | ${mins}min | ${e.description}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
