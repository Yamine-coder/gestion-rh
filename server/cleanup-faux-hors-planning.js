const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

/**
 * Script de nettoyage : supprime les fausses anomalies "pointage_hors_planning"
 * quand l'employé avait bien un shift ce jour-là.
 */
async function main() {
  // 1. Récupérer toutes les anomalies hors_planning en_attente
  const anomalies = await p.anomalie.findMany({
    where: {
      type: 'pointage_hors_planning',
      statut: 'en_attente'
    },
    include: {
      employe: { select: { nom: true, prenom: true } }
    }
  });
  
  console.log(`📋 ${anomalies.length} anomalies "pointage_hors_planning" en attente\n`);
  
  let supprimees = 0;
  let conservees = 0;
  
  for (const anomalie of anomalies) {
    const dateAnomalie = anomalie.date;
    // La date de l'anomalie est à 12:00 UTC, on veut la date du jour
    const dateStr = dateAnomalie.toISOString().split('T')[0];
    
    // Chercher un shift ce jour-là pour cet employé
    const shift = await p.shift.findFirst({
      where: {
        employeId: anomalie.employeId,
        date: new Date(`${dateStr}T00:00:00.000Z`),
        type: { in: ['travail', 'présence', 'presence'] }
      }
    });
    
    if (shift) {
      // Il y a un shift → fausse anomalie → supprimer
      console.log(`❌ FAUX POSITIF - ${anomalie.employe?.prenom} ${anomalie.employe?.nom} le ${dateStr}`);
      console.log(`   Shift trouvé: ID ${shift.id}, segments: ${typeof shift.segments === 'string' ? shift.segments.substring(0, 80) : JSON.stringify(shift.segments).substring(0, 80)}...`);
      
      await p.anomalie.delete({ where: { id: anomalie.id } });
      supprimees++;
    } else {
      // Pas de shift → anomalie légitime
      console.log(`✅ LÉGITIME  - ${anomalie.employe?.prenom} ${anomalie.employe?.nom} le ${dateStr} (pas de shift)`);
      conservees++;
    }
  }
  
  console.log(`\n=== Résultat ===`);
  console.log(`🗑️  Fausses anomalies supprimées: ${supprimees}`);
  console.log(`✅ Anomalies légitimes conservées: ${conservees}`);
}

main().catch(console.error).finally(() => p.$disconnect());
