const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createTestShift() {
  try {
    console.log('🔌 Connexion à la base de données...');

    // Trouver l'utilisateur test@Mouss.com (avec M majuscule)
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (!user) {
      console.error('❌ Utilisateur test@Mouss.com non trouvé');
      
      // Lister les utilisateurs disponibles
      const users = await prisma.user.findMany({
        select: { id: true, email: true, nom: true, prenom: true }
      });
      console.log('📋 Utilisateurs disponibles:');
      users.forEach(u => console.log(`   ${u.email} - ${u.prenom} ${u.nom} (ID: ${u.id})`));
      
      await prisma.$disconnect();
      process.exit(1);
    }
    
    console.log(`📧 Utilisateur trouvé: ${user.prenom} ${user.nom} (${user.email})`);

    // Date d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vérifier s'il y a déjà un shift aujourd'hui pour cet utilisateur
    const existingShift = await prisma.shift.findFirst({
      where: {
        employeId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (existingShift) {
      console.log('⚠️ Shift déjà existant pour aujourd\'hui, suppression...');
      await prisma.shift.delete({
        where: { id: existingShift.id }
      });
    }

    // Créer un shift de test avec plusieurs segments (typique restaurant)
    const testShift = await prisma.shift.create({
      data: {
        employeId: user.id,
        date: today,
        type: 'présence',
        segments: [
          {
            start: '11:00',
            end: '14:30',
            isExtra: false,
            commentaire: 'Service midi'
          },
          {
            start: '18:00',
            end: '22:00',
            isExtra: false,
            commentaire: 'Service soir'
          },
          {
            start: '22:00',
            end: '23:00',
            isExtra: true,
            commentaire: 'Nettoyage extra'
          }
        ]
      }
    });

    console.log('🎉 Shift de test créé avec succès !');
    console.log('📅 Date:', today.toLocaleDateString('fr-FR'));
    console.log('⏰ Segments:');
    if (testShift.segments && Array.isArray(testShift.segments)) {
      testShift.segments.forEach(seg => {
        console.log(`   ${seg.start}-${seg.end} ${seg.isExtra ? '(Extra)' : ''} - ${seg.commentaire || ''}`);
      });
    }
    console.log('🆔 Shift ID:', testShift.id);
    console.log('');
    console.log('✅ Le planning devrait maintenant apparaître dans l\'interface Pointage !');
    console.log('🔄 Rechargez la page Pointage pour voir les changements.');

  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error('Details:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Déconnexion de la base de données');
  }
}

createTestShift();
