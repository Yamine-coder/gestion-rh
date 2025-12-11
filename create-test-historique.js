const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function createTestHistorique() {
  try {
    console.log('🔍 Recherche de l\'utilisateur de test...');
    
    // Trouver l'utilisateur yjordan496@gmail.com
    const user = await prisma.user.findFirst({
      where: { email: 'yjordan496@gmail.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur yjordan496@gmail.com non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.prenom} ${user.nom} (ID: ${user.id})`);

    // Créer plusieurs entrées d'historique pour tester différents cas
    const historiqueData = [
      {
        employe_id: user.id,
        champ_modifie: 'telephone',
        ancienne_valeur: '+33612345678',
        nouvelle_valeur: '+33698765432',
        date_modification: new Date('2024-11-15T10:30:00'),
        adresse_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0'
      },
      {
        employe_id: user.id,
        champ_modifie: 'adresse',
        ancienne_valeur: '123 Rue de la Paix\n75001 Paris',
        nouvelle_valeur: '456 Avenue des Champs-Élysées\nAppartement 3B\n75008 Paris',
        date_modification: new Date('2024-11-20T14:15:00'),
        adresse_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0'
      },
      {
        employe_id: user.id,
        champ_modifie: 'prenom',
        ancienne_valeur: 'Jordan',
        nouvelle_valeur: 'Jordan-Michel',
        date_modification: new Date('2024-11-25T09:00:00'),
        adresse_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0'
      },
      {
        employe_id: user.id,
        champ_modifie: 'email',
        ancienne_valeur: 'jordan.old@exemple.fr',
        nouvelle_valeur: 'yjordan496@gmail.com',
        date_modification: new Date('2024-11-28T16:45:00'),
        adresse_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0'
      },
      {
        employe_id: user.id,
        champ_modifie: 'iban',
        ancienne_valeur: 'FR7612345678901234567890123',
        nouvelle_valeur: 'FR7698765432109876543210987',
        date_modification: new Date('2024-11-30T11:20:00'),
        adresse_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0'
      },
      {
        employe_id: user.id,
        champ_modifie: 'nom',
        ancienne_valeur: 'DUPONT',
        nouvelle_valeur: 'DUPONT-MARTIN',
        date_modification: new Date('2024-12-01T08:30:00'),
        adresse_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0'
      },
      {
        employe_id: user.id,
        champ_modifie: 'telephone',
        ancienne_valeur: '+33698765432',
        nouvelle_valeur: '+212612345678',
        date_modification: new Date('2024-12-02T10:00:00'),
        adresse_ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0'
      }
    ];

    console.log('📝 Création des entrées d\'historique...');

    for (const data of historiqueData) {
      const entry = await prisma.historique_modifications.create({
        data
      });
      console.log(`✅ Créé: ${data.champ_modifie} (${new Date(data.date_modification).toLocaleDateString('fr-FR')})`);
    }

    console.log('');
    console.log('✨ Test terminé avec succès!');
    console.log(`📊 ${historiqueData.length} entrées d'historique créées pour ${user.prenom} ${user.nom}`);
    console.log('');
    console.log('🎯 Champs testés:');
    console.log('   - Téléphone (2 modifications)');
    console.log('   - Adresse (avec complément)');
    console.log('   - Prénom');
    console.log('   - Email');
    console.log('   - IBAN');
    console.log('   - Nom');
    console.log('');
    console.log('💡 Connecte-toi avec yjordan496@gmail.com pour voir l\'historique dans le profil');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestHistorique();
