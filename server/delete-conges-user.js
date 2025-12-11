const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteConges() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'yjordan496@gmail.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }

    console.log(`📧 Utilisateur trouvé: ${user.prenom} ${user.nom} (ID: ${user.id})`);

    const deleted = await prisma.conge.deleteMany({
      where: { userId: user.id }
    });

    console.log(`✅ ${deleted.count} congé(s) supprimé(s)`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteConges();
