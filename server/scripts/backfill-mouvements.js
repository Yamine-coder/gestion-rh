/**
 * 📊 Backfill MouvementEffectif
 * 
 * Ce script crée les mouvements d'entrée/sortie pour tous les employés existants
 * afin que la table MouvementEffectif soit à jour pour le calcul du turnover.
 * 
 * À exécuter UNE seule fois après la migration.
 * Usage: node scripts/backfill-mouvements.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  console.log('📊 Backfill MouvementEffectif...\n');

  const employes = await prisma.user.findMany({
    where: { role: 'employee' },
    select: { id: true, nom: true, prenom: true, categories: true, dateEmbauche: true, dateSortie: true, motifDepart: true, statut: true }
  });

  let entreesCreees = 0;
  let sortiesCreees = 0;
  let dejaExistants = 0;

  for (const emp of employes) {
    // Mouvement d'entrée
    if (emp.dateEmbauche) {
      const existe = await prisma.mouvementEffectif.findFirst({
        where: { userId: emp.id, type: 'entree' }
      });
      if (!existe) {
        await prisma.mouvementEffectif.create({
          data: {
            userId: emp.id,
            type: 'entree',
            date: emp.dateEmbauche,
            nom: emp.nom,
            prenom: emp.prenom,
            categories: emp.categories,
          }
        });
        entreesCreees++;
      } else {
        dejaExistants++;
      }
    }

    // Mouvement de sortie
    if (emp.dateSortie) {
      const existe = await prisma.mouvementEffectif.findFirst({
        where: { userId: emp.id, type: 'sortie' }
      });
      if (!existe) {
        await prisma.mouvementEffectif.create({
          data: {
            userId: emp.id,
            type: 'sortie',
            date: emp.dateSortie,
            motif: emp.motifDepart,
            nom: emp.nom,
            prenom: emp.prenom,
            categories: emp.categories,
          }
        });
        sortiesCreees++;
      } else {
        dejaExistants++;
      }
    }
  }

  console.log(`✅ Terminé :`);
  console.log(`   ${entreesCreees} entrées créées`);
  console.log(`   ${sortiesCreees} sorties créées`);
  console.log(`   ${dejaExistants} mouvements déjà existants (ignorés)`);
  console.log(`   ${employes.length} employés traités au total`);

  await prisma.$disconnect();
}

backfill().catch(e => {
  console.error('❌ Erreur:', e);
  prisma.$disconnect();
  process.exit(1);
});
