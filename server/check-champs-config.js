const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Vérification configuration champs modifiables...\n');
    
    const config = await prisma.champs_modifiables_config.findMany();
    
    if (config.length === 0) {
      console.log('❌ Aucune configuration trouvée');
      console.log('\n📝 Création de la configuration par défaut...\n');
      
      const defaultConfig = [
        { nom_champ: 'telephone', type_modification: 'direct', description: 'Modifiable directement par l\'employé', actif: true },
        { nom_champ: 'adresse', type_modification: 'direct', description: 'Modifiable directement par l\'employé', actif: true },
        { nom_champ: 'nom', type_modification: 'validation', description: 'Nécessite validation administrateur', actif: true },
        { nom_champ: 'prenom', type_modification: 'validation', description: 'Nécessite validation administrateur', actif: true },
        { nom_champ: 'email', type_modification: 'validation', description: 'Nécessite validation administrateur', actif: true },
        { nom_champ: 'iban', type_modification: 'validation', description: 'Nécessite validation administrateur', actif: true },
        { nom_champ: 'categorie', type_modification: 'verrouille', description: 'Modifiable uniquement par l\'administrateur', actif: true },
        { nom_champ: 'dateEmbauche', type_modification: 'verrouille', description: 'Modifiable uniquement par l\'administrateur', actif: true },
        { nom_champ: 'role', type_modification: 'verrouille', description: 'Modifiable uniquement par l\'administrateur', actif: true },
      ];
      
      for (const item of defaultConfig) {
        await prisma.champs_modifiables_config.create({ data: item });
        console.log(`✅ ${item.nom_champ} - ${item.type_modification}`);
      }
      
      console.log('\n✅ Configuration créée avec succès !');
    } else {
      console.log('✅ Configuration existante :\n');
      
      const groupes = {
        direct: config.filter(c => c.type_modification === 'direct'),
        validation: config.filter(c => c.type_modification === 'validation'),
        verrouille: config.filter(c => c.type_modification === 'verrouille')
      };
      
      console.log('📱 Modification directe (sans validation) :');
      groupes.direct.forEach(c => console.log(`   • ${c.nom_champ} - ${c.description}`));
      
      console.log('\n⏳ Nécessite validation admin :');
      groupes.validation.forEach(c => console.log(`   • ${c.nom_champ} - ${c.description}`));
      
      console.log('\n🔒 Modifiable uniquement par admin :');
      groupes.verrouille.forEach(c => console.log(`   • ${c.nom_champ} - ${c.description}`));
    }
    
    // Vérifier les demandes en cours
    const demandes = await prisma.demandes_modification.findMany({
      where: { statut: 'en_attente' },
      include: {
        User_demandes_modification_employe_idToUser: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });
    
    console.log(`\n📝 Demandes en attente : ${demandes.length}`);
    if (demandes.length > 0) {
      demandes.forEach(d => {
        const employe = d.User_demandes_modification_employe_idToUser;
        console.log(`   • ${employe.prenom} ${employe.nom} - ${d.champ_modifie}: "${d.ancienne_valeur}" → "${d.nouvelle_valeur}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
