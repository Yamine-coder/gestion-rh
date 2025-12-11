const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateConfiguration() {
  try {
    console.log('🔄 Mise à jour de la configuration des champs modifiables...\n');

    // Configuration recommandée selon la logique métier
    const nouvelleConfig = [
      // ✅ Modification DIRECTE (sans validation admin)
      { 
        nom_champ: 'telephone', 
        type: 'direct', 
        description: 'Numéro de téléphone personnel (format: +33612345678 ou 06 12 34 56 78)'
      },
      { 
        nom_champ: 'adresse', 
        type: 'direct', 
        description: 'Adresse postale complète (minimum 10 caractères)'
      },
      { 
        nom_champ: 'photo', 
        type: 'direct', 
        description: 'Photo de profil (upload direct via interface)'
      },

      // ⏳ Nécessite VALIDATION ADMIN
      { 
        nom_champ: 'nom', 
        type: 'validation', 
        description: 'Nom de famille (changement nécessite justificatif)'
      },
      { 
        nom_champ: 'prenom', 
        type: 'validation', 
        description: 'Prénom (changement nécessite justificatif)'
      },
      { 
        nom_champ: 'email', 
        type: 'validation', 
        description: 'Adresse email (affecte la connexion, format: exemple@domaine.fr)'
      },
      { 
        nom_champ: 'iban', 
        type: 'validation', 
        description: 'Coordonnées bancaires RIB/IBAN (format: FR76XXXXXXXXXXXXXXXXXXXXXX)'
      },
      { 
        nom_champ: 'date_naissance', 
        type: 'validation', 
        description: 'Date de naissance (nécessite document d\'identité)'
      },

      // 🔒 Modifiable UNIQUEMENT par ADMIN
      { 
        nom_champ: 'categorie', 
        type: 'verrouille', 
        description: 'Catégorie/Poste (détermine les droits et salaire)'
      },
      { 
        nom_champ: 'dateEmbauche', 
        type: 'verrouille', 
        description: 'Date d\'embauche (contractuel, non modifiable)'
      },
      { 
        nom_champ: 'salaire', 
        type: 'verrouille', 
        description: 'Salaire de base (contractuel, modifiable uniquement par RH/Admin)'
      },
      { 
        nom_champ: 'statut', 
        type: 'verrouille', 
        description: 'Statut du contrat (actif/inactif/suspendu)'
      },
      { 
        nom_champ: 'role', 
        type: 'verrouille', 
        description: 'Rôle dans l\'application (admin/manager/employee)'
      }
    ];

    // Mettre à jour chaque champ
    for (const config of nouvelleConfig) {
      await prisma.champs_modifiables_config.upsert({
        where: { nom_champ: config.nom_champ },
        update: { 
          type_modification: config.type,
          description: config.description,
          actif: true
        },
        create: {
          nom_champ: config.nom_champ,
          type_modification: config.type,
          description: config.description,
          actif: true
        }
      });
      console.log(`✅ ${config.nom_champ.padEnd(20)} → ${config.type}`);
    }

    console.log('\n📊 Résumé de la configuration:');
    
    const stats = {
      direct: nouvelleConfig.filter(c => c.type === 'direct').length,
      validation: nouvelleConfig.filter(c => c.type === 'validation').length,
      verrouille: nouvelleConfig.filter(c => c.type === 'verrouille').length
    };

    console.log(`   📱 Modification directe: ${stats.direct} champs`);
    console.log(`   ⏳ Validation admin: ${stats.validation} champs`);
    console.log(`   🔒 Admin uniquement: ${stats.verrouille} champs`);

    console.log('\n🎯 Logique métier appliquée:');
    console.log('   • telephone, adresse → Direct (données personnelles non sensibles)');
    console.log('   • nom, prenom, email, iban, date_naissance → Validation (identité/bancaire)');
    console.log('   • categorie, dateEmbauche, salaire, statut, role → Admin only (contractuel)');

    // Afficher les demandes en attente
    const demandes = await prisma.demandes_modification.findMany({
      where: { statut: 'en_attente' },
      include: {
        User_demandes_modification_employe_idToUser: {
          select: { nom: true, prenom: true }
        }
      }
    });

    if (demandes.length > 0) {
      console.log(`\n📝 ${demandes.length} demande(s) en attente de traitement:`);
      demandes.forEach(d => {
        const nom = d.User_demandes_modification_employe_idToUser?.nom || 'Inconnu';
        const prenom = d.User_demandes_modification_employe_idToUser?.prenom || '';
        console.log(`   • ${nom} ${prenom} - ${d.champ_modifie}: "${d.ancienne_valeur}" → "${d.nouvelle_valeur}"`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateConfiguration();
