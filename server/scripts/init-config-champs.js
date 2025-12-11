const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script d'initialisation de la configuration des champs modifiables
 * À exécuter après la migration Prisma
 */

async function initConfigChamps() {
  console.log('🔧 Initialisation de la configuration des champs...\n');

  const champsConfig = [
    // ✅ MODIFICATION DIRECTE (sans validation)
    {
      nomChamp: 'telephone',
      typeModification: 'direct',
      description: 'Numéro de téléphone personnel',
      ordreAffichage: 1
    },
    {
      nomChamp: 'adresse',
      typeModification: 'direct',
      description: 'Adresse postale',
      ordreAffichage: 2
    },

    // ⚠️ NÉCESSITE VALIDATION RH/Manager
    {
      nomChamp: 'email',
      typeModification: 'validation',
      description: 'Adresse email professionnelle',
      ordreAffichage: 3
    },

    // 🔒 VERROUILLÉ (modification admin uniquement)
    {
      nomChamp: 'nom',
      typeModification: 'verrouille',
      description: 'Nom de famille',
      ordreAffichage: 4
    },
    {
      nomChamp: 'prenom',
      typeModification: 'verrouille',
      description: 'Prénom',
      ordreAffichage: 5
    },
    {
      nomChamp: 'categorie',
      typeModification: 'verrouille',
      description: 'Catégorie/Poste',
      ordreAffichage: 6
    },
    {
      nomChamp: 'dateEmbauche',
      typeModification: 'verrouille',
      description: 'Date d\'embauche',
      ordreAffichage: 7
    },
    {
      nomChamp: 'role',
      typeModification: 'verrouille',
      description: 'Rôle dans le système',
      ordreAffichage: 8
    },
    {
      nomChamp: 'statut',
      typeModification: 'verrouille',
      description: 'Statut du compte',
      ordreAffichage: 9
    }
  ];

  try {
    for (const champ of champsConfig) {
      const champData = {
        nom_champ: champ.nomChamp,
        type_modification: champ.typeModification,
        description: champ.description,
        actif: true
      };

      const existe = await prisma.champs_modifiables_config.findUnique({
        where: { nom_champ: champData.nom_champ }
      });

      if (existe) {
        console.log(`⏭️  ${champData.nom_champ} existe déjà`);
        continue;
      }

      await prisma.champs_modifiables_config.create({
        data: champData
      });

      const icon = champData.type_modification === 'direct' ? '✅' : 
                   champData.type_modification === 'validation' ? '⚠️' : '🔒';
      console.log(`${icon} ${champData.nom_champ} - ${champData.type_modification}`);
    }

    console.log('\n✅ Configuration initialisée avec succès !');
    
    // Afficher le résumé
    const counts = await prisma.champs_modifiables_config.groupBy({
      by: ['type_modification'],
      _count: true
    });

    console.log('\n📊 Résumé:');
    counts.forEach(c => {
      console.log(`   ${c.type_modification}: ${c._count} champs`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initConfigChamps();
