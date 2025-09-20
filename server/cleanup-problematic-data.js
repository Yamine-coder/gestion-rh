/**
 * 🧹 NETTOYAGE DES DONNÉES PROBLÉMATIQUES
 * Supprime les pointages qui violent les contraintes de sécurité
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupProblematicData() {
  console.log('🧹 === NETTOYAGE DES DONNÉES PROBLÉMATIQUES ===\n');

  try {
    // 1. Supprimer les pointages futurs (plus de 1 heure dans le futur)
    console.log('1. Suppression des pointages futurs...');
    const futur = new Date();
    futur.setHours(futur.getHours() + 1);
    
    const pointagesFuturs = await prisma.pointage.deleteMany({
      where: {
        horodatage: {
          gt: futur
        }
      }
    });
    console.log(`✅ ${pointagesFuturs.count} pointages futurs supprimés`);

    // 2. Supprimer les pointages trop anciens (plus de 7 jours)
    console.log('\n2. Suppression des pointages trop anciens...');
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    
    const pointagesAnciens = await prisma.pointage.deleteMany({
      where: {
        horodatage: {
          lt: limite
        }
      }
    });
    console.log(`✅ ${pointagesAnciens.count} pointages anciens supprimés`);

    // 3. Supprimer les pointages avec types invalides
    console.log('\n3. Suppression des types de pointage invalides...');
    const typesInvalides = await prisma.pointage.deleteMany({
      where: {
        NOT: {
          type: {
            in: ['arrivee', 'depart']
          }
        }
      }
    });
    console.log(`✅ ${typesInvalides.count} types invalides supprimés`);

    // 4. Supprimer les pointages avec userId invalides
    console.log('\n4. Suppression des userId invalides...');
    const userIdsInvalides = await prisma.pointage.deleteMany({
      where: {
        userId: {
          lte: 0
        }
      }
    });
    console.log(`✅ ${userIdsInvalides.count} userId invalides supprimés`);

    // 5. Identifier et supprimer les doublons exacts
    console.log('\n5. Identification des doublons...');
    const doublons = await prisma.$queryRaw`
      SELECT "userId", type, date_trunc('second', horodatage) as horodatage_sec, COUNT(*)
      FROM "Pointage"
      GROUP BY "userId", type, date_trunc('second', horodatage)
      HAVING COUNT(*) > 1
    `;

    if (doublons.length > 0) {
      console.log(`Trouvé ${doublons.length} groupes de doublons`);
      
      for (const doublon of doublons) {
        // Garder le premier, supprimer les autres
        const pointagesDoublons = await prisma.pointage.findMany({
          where: {
            userId: doublon.userId,
            type: doublon.type,
            horodatage: {
              gte: new Date(doublon.horodatage_sec),
              lt: new Date(doublon.horodatage_sec.getTime() + 1000)
            }
          },
          orderBy: { id: 'asc' }
        });

        // Supprimer tous sauf le premier
        const aSupprimer = pointagesDoublons.slice(1);
        for (const p of aSupprimer) {
          await prisma.pointage.delete({ where: { id: p.id } });
        }
        console.log(`  Supprimé ${aSupprimer.length} doublons pour user ${doublon.userId}`);
      }
    } else {
      console.log('✅ Aucun doublon trouvé');
    }

    console.log('\n🧹 Nettoyage terminé !');

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 Lancer le nettoyage
if (require.main === module) {
  cleanupProblematicData().catch(console.error);
}

module.exports = { cleanupProblematicData };
