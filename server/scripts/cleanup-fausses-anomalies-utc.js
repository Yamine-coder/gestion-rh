/**
 * Script de nettoyage one-shot : supprime les fausses anomalies "pointage_hors_planning"
 * causées par le bug UTC (getHours() retournait l'heure UTC au lieu de Paris).
 * 
 * Le bug : un pointage à 00:32 Paris = 23:32 UTC → getHours()=23 → 23<5=false
 * → le système cherchait le shift du jour calendaire (19 fév) au lieu du jour business (18 fév)
 * → "Aucun shift prévu" alors que le shift 19:30-00:30 existait sur le 18 fév.
 * 
 * Ce script identifie ces faux positifs et les supprime.
 * 
 * Usage: node server/scripts/cleanup-fausses-anomalies-utc.js [--dry-run]
 */

const prisma = require('../prisma/client');
const { getBusinessDay } = require('../utils/businessDayUtils');

const DRY_RUN = process.argv.includes('--dry-run');

async function cleanup() {
  console.log(`\n🔧 Nettoyage des fausses anomalies UTC${DRY_RUN ? ' (DRY RUN - aucune suppression)' : ''}\n`);

  // 1. Récupérer toutes les anomalies "pointage_hors_planning"
  const anomalies = await prisma.anomalie.findMany({
    where: {
      type: 'pointage_hors_planning',
      statut: 'en_attente' // Seulement celles non traitées
    },
    include: {
      employe: { select: { nom: true, prenom: true } }
    },
    orderBy: { date: 'desc' }
  });

  console.log(`📋 ${anomalies.length} anomalie(s) "pointage_hors_planning" en attente trouvée(s)\n`);

  let supprimees = 0;
  let conservees = 0;

  for (const anomalie of anomalies) {
    const dateAnomalie = new Date(anomalie.date);
    const dateStr = dateAnomalie.toISOString().split('T')[0];
    const nomEmploye = `${anomalie.employe?.prenom || '?'} ${anomalie.employe?.nom || '?'}`;

    // 2. Vérifier s'il existe un shift sur le jour business PRÉCÉDENT (veille)
    //    C'est le cas typique du bug : anomalie créée pour le 19 fév alors que le shift est le 18
    const veille = new Date(dateAnomalie);
    veille.setDate(veille.getDate() - 1);
    const dateVeille = veille.toISOString().split('T')[0];

    const shiftVeille = await prisma.shift.findFirst({
      where: {
        employeId: anomalie.employeId,
        date: new Date(dateVeille + 'T00:00:00.000Z'),
        type: 'travail'
      }
    });

    // 3. Vérifier aussi s'il existe un shift le jour même (qui aurait été raté)
    const shiftJour = await prisma.shift.findFirst({
      where: {
        employeId: anomalie.employeId,
        date: new Date(dateStr + 'T00:00:00.000Z'),
        type: 'travail'
      }
    });

    // Si un shift existait la veille (shift nocturne), c'est une fausse anomalie
    if (shiftVeille && !shiftJour) {
      // Vérifier que le shift de la veille finit après minuit (nocturne)
      const segments = Array.isArray(shiftVeille.segments) ? shiftVeille.segments : JSON.parse(shiftVeille.segments || '[]');
      const dernierSegment = segments[segments.length - 1];
      const finStr = dernierSegment?.end || dernierSegment?.fin || '';
      const [finH] = finStr.split(':').map(Number);
      
      // Shift nocturne = fin avant 06:00 (passage minuit) ou début >= 18:00
      const debutStr = segments[0]?.start || segments[0]?.debut || '';
      const [debH] = debutStr.split(':').map(Number);
      const isNocturne = finH < 6 || debH >= 18;

      if (isNocturne) {
        console.log(`  ❌ FAUSSE ANOMALIE: ${nomEmploye} le ${dateStr} — shift nocturne ${debutStr}-${finStr} trouvé la veille (${dateVeille})`);
        
        if (!DRY_RUN) {
          await prisma.anomalie.delete({ where: { id: anomalie.id } });
        }
        supprimees++;
        continue;
      }
    }

    console.log(`  ✅ CONSERVÉE: ${nomEmploye} le ${dateStr} — ${anomalie.description?.substring(0, 80) || 'pas de description'}`);
    conservees++;
  }

  console.log(`\n📊 Résultat:`);
  console.log(`   ${supprimees} fausse(s) anomalie(s) ${DRY_RUN ? 'identifiée(s)' : 'supprimée(s)'}`);
  console.log(`   ${conservees} anomalie(s) conservée(s) (vraies anomalies)`);
  
  if (DRY_RUN && supprimees > 0) {
    console.log(`\n💡 Relancez sans --dry-run pour supprimer réellement.`);
  }

  await prisma.$disconnect();
}

cleanup().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
