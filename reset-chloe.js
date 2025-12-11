const prisma = require('./server/prisma/client');
const bcrypt = require('./server/node_modules/bcrypt');

async function resetChloe() {
  try {
    // Trouver Chloé Simon
    const chloe = await prisma.user.findFirst({
      where: {
        OR: [
          { prenom: { contains: 'Chlo', mode: 'insensitive' } },
          { nom: { contains: 'Simon', mode: 'insensitive' } }
        ]
      },
      select: { id: true, prenom: true, nom: true, email: true, categorie: true, role: true }
    });
    
    if (!chloe) {
      console.log('❌ Chloé Simon non trouvée');
      const allUsers = await prisma.user.findMany({
        select: { prenom: true, nom: true, email: true }
      });
      console.log('\n📋 Utilisateurs:');
      allUsers.forEach(u => console.log(`   - ${u.prenom} ${u.nom} (${u.email})`));
      return;
    }
    
    console.log('👤 Chloé trouvée:');
    console.log('   Email:', chloe.email);
    console.log('   Catégorie actuelle:', chloe.categorie);
    
    // Nouveau mot de passe
    const newPassword = 'Chloe2024!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mise à jour: password + catégorie si nécessaire
    const updateData = { password: hashedPassword };
    
    if (chloe.categorie !== 'Caisse/Service') {
      updateData.categorie = 'Caisse/Service';
      console.log(`\n🔄 Changement catégorie: "${chloe.categorie}" → "Caisse/Service"`);
    } else {
      console.log('\n✅ Catégorie déjà correcte: Caisse/Service');
    }
    
    await prisma.user.update({
      where: { id: chloe.id },
      data: updateData
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ MISE À JOUR RÉUSSIE !');
    console.log('='.repeat(50));
    console.log('📧 Email:', chloe.email);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('📂 Catégorie:', updateData.categorie || chloe.categorie);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetChloe();
