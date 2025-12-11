const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Recherche de yjordan496@gmail.com...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'yjordan496@gmail.com' },
      select: {
        id: true,
        email: true,
        role: true,
        statut: true,
        nom: true,
        prenom: true,
        password: true
      }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé dans la base de données');
    } else {
      console.log('✅ Utilisateur trouvé:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Nom:', user.nom);
      console.log('   Prénom:', user.prenom);
      console.log('   Rôle:', user.role);
      console.log('   Statut:', user.statut);
      console.log('   Password hash présent:', !!user.password);
      console.log('   Longueur hash:', user.password?.length || 0);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
