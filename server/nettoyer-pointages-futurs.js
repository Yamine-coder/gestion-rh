// Script pour nettoyer les pointages futurs (tests de Léa Garcia)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nettoyerPointagesFuturs() {
  console.log('🧹 NETTOYAGE DES POINTAGES FUTURS\n');
  console.log('='.repeat(80));

  try {
    const maintenant = new Date();
    
    // Lister d'abord les pointages futurs
    const pointagesFuturs = await prisma.pointage.findMany({
      where: { horodatage: { gt: maintenant } },
      include: { user: { select: { email: true } } },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`\n📊 Trouvé: ${pointagesFuturs.length} pointage(s) futur(s)\n`);

    if (pointagesFuturs.length === 0) {
      console.log('✅ Aucun pointage futur à nettoyer\n');
      return;
    }

    console.log('Détails:');
    pointagesFuturs.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.user.email} - ${p.type} à ${p.horodatage.toISOString()}`);
    });

    console.log(`\n⚠️  Ces pointages sont des données de TEST pour décembre`);
    console.log(`   Ils doivent être supprimés car ils faussent les calculs\n`);

    // Supprimer les pointages futurs
    const resultat = await prisma.pointage.deleteMany({
      where: { horodatage: { gt: maintenant } }
    });

    console.log(`✅ ${resultat.count} pointage(s) supprimé(s)\n`);
    
    // Vérification
    const verification = await prisma.pointage.findMany({
      where: { horodatage: { gt: maintenant } }
    });

    if (verification.length === 0) {
      console.log('✅ SUCCÈS : Plus aucun pointage futur dans la base\n');
    } else {
      console.log(`⚠️  ${verification.length} pointage(s) futur(s) reste(nt)\n`);
    }

    console.log('='.repeat(80));
    console.log('✅ NETTOYAGE TERMINÉ\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

nettoyerPointagesFuturs();
