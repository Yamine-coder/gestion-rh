/**
 * Nettoyage de TOUTES les fausses anomalies missing_out_prolonge causées
 * par le bug midnight-crossing (shiftEnd 00:00/00:30 traité comme 0 minutes).
 * 
 * Critère de détection: heurePrevueFin est 00:XX (minuit) ET minutesApresFinShift > 500
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_lesV3MUriL8c@ep-fancy-heart-agongvt3-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  try {
    // Récupérer TOUTES les anomalies missing_out_prolonge
    const all = await prisma.anomalie.findMany({
      where: { type: 'missing_out_prolonge' },
      include: { employe: { select: { nom: true, prenom: true } } }
    });

    console.log(`📋 Total anomalies missing_out_prolonge: ${all.length}\n`);

    const falsePositives = [];
    const realOnes = [];

    for (const a of all) {
      const d = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
      const finPrevue = d?.heurePrevueFin || '';
      const [fH] = finPrevue.split(':').map(Number);
      const minutesApres = d?.minutesApresFinShift || 0;

      // Faux positif = fin prévue après minuit (00:XX ou 01:XX) ET minutesApresFinShift aberrant (> 500)
      const isFalse = (fH <= 1 || fH >= 23) && minutesApres > 500;

      if (isFalse) {
        falsePositives.push(a);
        console.log(`  ❌ FAUX ID=${a.id} | ${a.employe?.prenom} ${a.employe?.nom} | ${a.date.toISOString().split('T')[0]} | fin=${finPrevue} | +${minutesApres}min`);
      } else {
        realOnes.push(a);
        console.log(`  ✅ VRAI ID=${a.id} | ${a.employe?.prenom} ${a.employe?.nom} | ${a.date.toISOString().split('T')[0]} | fin=${finPrevue} | +${minutesApres}min`);
      }
    }

    console.log(`\n📊 Résumé: ${falsePositives.length} FAUX / ${realOnes.length} VRAIS`);

    if (falsePositives.length > 0) {
      const ids = falsePositives.map(a => a.id);
      const result = await prisma.anomalie.deleteMany({
        where: { id: { in: ids } }
      });
      console.log(`\n🗑️ ${result.count} fausses anomalie(s) supprimée(s) (IDs: ${ids.join(', ')})`);
    }

    // Aussi supprimer l'anomalie "absence_injustifiee" fausse pour Meer Murshed du 19/02
    // (Il a pointé à 12:02 mais le contexte dit "Aucun pointage" - décalage de business day)
    const fausseAbsence = await prisma.anomalie.findMany({
      where: {
        date: { gte: new Date('2026-02-19T00:00:00Z'), lt: new Date('2026-02-20T00:00:00Z') },
        type: 'absence_injustifiee',
        description: { contains: '12:00 - 00:00' }
      },
      include: { employe: { select: { nom: true, prenom: true } } }
    });

    for (const a of fausseAbsence) {
      console.log(`\n⚠️ Anomalie absence suspecte: ID=${a.id} | ${a.employe?.prenom} ${a.employe?.nom} | ${a.description}`);
      // On la laisse, elle sera valide si personne n'a pointé quand le shift est fini
    }

    console.log('\n✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
