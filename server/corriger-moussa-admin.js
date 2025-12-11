const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function corrigerMoussaAdmin() {
  console.log('\n🔧 CORRECTION DU RÔLE DE MOUSSA\n');
  console.log('=' .repeat(60));

  try {
    // 1. Trouver Moussa
    const moussa = await prisma.user.findUnique({
      where: { email: 'moussa@restaurant.com' }
    });

    if (!moussa) {
      console.log('❌ Moussa non trouvé dans la base');
      return;
    }

    console.log(`\n📋 État actuel:`);
    console.log(`   Email: ${moussa.email}`);
    console.log(`   Nom: ${moussa.nom} ${moussa.prenom}`);
    console.log(`   Rôle: ${moussa.role}`);
    console.log(`   Catégorie: ${moussa.categorie}`);

    // 2. Mettre à jour en admin
    const updated = await prisma.user.update({
      where: { email: 'moussa@restaurant.com' },
      data: {
        role: 'admin',
        categorie: 'dev_manager'
      }
    });

    console.log(`\n✅ Mise à jour effectuée:`);
    console.log(`   Rôle: ${updated.role}`);
    console.log(`   Catégorie: ${updated.categorie}`);

    // 3. Vérifier tous les admins
    console.log('\n👤 ADMINISTRATEURS DU SYSTÈME:');
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, nom: true, prenom: true, categorie: true }
    });

    admins.forEach(a => {
      console.log(`   - ${a.nom} ${a.prenom} (${a.email}) [${a.categorie || 'système'}]`);
    });

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corrigerMoussaAdmin();
