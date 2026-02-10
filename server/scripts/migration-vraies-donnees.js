// Script de migration des données factices vers les vraies données
// Utiliser ce script pour préparer la migration demain

const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');

// =============================================
// 1. NETTOYAGE DES DONNÉES FACTICES
// =============================================

async function nettoyerDonneesFactices() {
  console.log("🧹 Nettoyage des données factices...");
  
  try {
    // Supprimer les shifts de test
    await prisma.shift.deleteMany({
      where: {
        // Supprimer les shifts avec des segments de test ou des dates anciennes
        OR: [
          { date: { lt: new Date('2025-01-01') } }, // Données antérieures à 2025
          { motif: { contains: 'test' } }
        ]
      }
    });
    console.log("✅ Shifts factices supprimés");

    // Supprimer les congés de test
    await prisma.conge.deleteMany({
      where: {
        OR: [
          { dateDebut: { lt: new Date('2025-01-01') } },
          { type: { contains: 'test' } }
        ]
      }
    });
    console.log("✅ Congés factices supprimés");

    // Supprimer les pointages de test
    await prisma.pointage.deleteMany({
      where: {
        horodatage: { lt: new Date('2025-01-01') }
      }
    });
    console.log("✅ Pointages factices supprimés");

    // Supprimer les employés de test (garder seulement les vrais comptes admin)
    await prisma.user.deleteMany({
      where: {
        AND: [
          { role: "employee" },
          { 
            OR: [
              { email: { contains: 'test' } },
              { email: { contains: 'demo' } },
              { email: { contains: 'example' } },
              { nom: { contains: 'Test' } }
            ]
          }
        ]
      }
    });
    console.log("✅ Employés factices supprimés");

  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
    throw error;
  }
}

// =============================================
// 2. CRÉATION DES VRAIS EMPLOYÉS
// =============================================

const vraisEmployes = [
  // REMPLACER CES DONNÉES PAR LES VRAIES INFORMATIONS
  {
    email: "marie.dupont@monentreprise.com",
    nom: "Dupont",
    prenom: "Marie",
    telephone: "0123456789",
    categorie: "Cuisine",
    role: "employee",
    dateEmbauche: new Date('2024-03-15')
  },
  {
    email: "jean.martin@monentreprise.com", 
    nom: "Martin",
    prenom: "Jean",
    telephone: "0123456790",
    categorie: "Service",
    role: "employee",
    dateEmbauche: new Date('2024-02-10')
  },
  {
    email: "sophie.bernard@monentreprise.com",
    nom: "Bernard", 
    prenom: "Sophie",
    telephone: "0123456791",
    categorie: "Management",
    role: "employee",
    dateEmbauche: new Date('2024-01-20')
  }
  // AJOUTER TOUS LES VRAIS EMPLOYÉS ICI
];

async function creerVraisEmployes() {
  console.log("👥 Création des vrais employés...");
  
  try {
    for (const employe of vraisEmployes) {
      // Générer un mot de passe temporaire
      const motDePasseTemporaire = Math.random().toString(36).slice(-8);
      const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);
      
      const employeCree = await prisma.user.create({
        data: {
          ...employe,
          password: motDePasseHash,
          codeActivation: Math.random().toString(36).slice(-10),
          statut: "actif"
        }
      });
      
      console.log(`✅ Employé créé: ${employe.prenom} ${employe.nom} - MDP: ${motDePasseTemporaire}`);
      
      // IMPORTANT: Envoyer le mot de passe par email ou le noter pour le communiquer
      // TODO: Implémenter l'envoi d'email avec les codes d'activation
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la création des employés:", error);
    throw error;
  }
}

// =============================================
// 3. CRÉATION DU PLANNING INITIAL
// =============================================

async function creerPlanningInitial() {
  console.log("📅 Création du planning initial...");
  
  try {
    const employes = await prisma.user.findMany({
      where: { role: "employee" }
    });
    
    const aujourd_hui = new Date();
    const dans7jours = new Date();
    dans7jours.setDate(aujourd_hui.getDate() + 7);
    
    // Créer un planning de base pour la semaine prochaine
    for (const employe of employes) {
      // Planning type selon la catégorie
      let horairesType;
      
      switch (employe.categorie) {
        case 'Cuisine':
          horairesType = [
            { start: "06:00", end: "14:00", pause: "11:00-11:30" },
            { start: "14:00", end: "22:00", pause: "18:00-18:30" }
          ];
          break;
        case 'Service':
          horairesType = [
            { start: "08:00", end: "16:00", pause: "12:00-13:00" },
            { start: "16:00", end: "00:00", pause: "20:00-20:30" }
          ];
          break;
        case 'Management':
          horairesType = [
            { start: "09:00", end: "17:00", pause: "12:00-13:00" }
          ];
          break;
        default:
          horairesType = [
            { start: "09:00", end: "17:00", pause: "12:00-13:00" }
          ];
      }
      
      // Créer 5 jours de travail (lundi à vendredi)
      for (let i = 1; i <= 5; i++) {
        const dateShift = new Date(aujourd_hui);
        dateShift.setDate(aujourd_hui.getDate() + i);
        
        // Éviter les weekends pour l'exemple
        if (dateShift.getDay() !== 0 && dateShift.getDay() !== 6) {
          
          const segments = horairesType.map(horaire => ({
            start: horaire.start,
            end: horaire.end,
            pause: horaire.pause || "",
            aValider: false,
            tauxHoraire: employe.categorie === 'Management' ? 15.00 : 12.00,
            isExtra: false
          }));
          
          await prisma.shift.create({
            data: {
              employeId: employe.id,
              date: dateShift,
              type: "présence",
              segments: segments
            }
          });
        }
      }
      
      console.log(`✅ Planning créé pour ${employe.prenom} ${employe.nom}`);
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la création du planning:", error);
    throw error;
  }
}

// =============================================
// 4. VÉRIFICATION DES DONNÉES ADMIN
// =============================================

async function verifierComptesAdmin() {
  console.log("🔐 Vérification des comptes administrateurs...");
  
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" }
    });
    
    console.log(`📊 ${admins.length} compte(s) administrateur(s) trouvé(s):`);
    
    for (const admin of admins) {
      console.log(`   - ${admin.email} (${admin.nom} ${admin.prenom})`);
    }
    
    if (admins.length === 0) {
      console.log("⚠️  ATTENTION: Aucun compte admin trouvé!");
      console.log("   Vous devez créer au moins un compte admin avant la migration.");
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
    throw error;
  }
}

// =============================================
// 5. SCRIPT PRINCIPAL DE MIGRATION
// =============================================

async function migrationComplete() {
  console.log("🚀 DÉBUT DE LA MIGRATION VERS LES VRAIES DONNÉES");
  console.log("================================================");
  
  try {
    // Étape 1: Vérifier les comptes admin
    await verifierComptesAdmin();
    
    // Étape 2: Nettoyer les données factices
    await nettoyerDonneesFactices();
    
    // Étape 3: Créer les vrais employés
    await creerVraisEmployes();
    
    // Étape 4: Créer le planning initial
    await creerPlanningInitial();
    
    console.log("================================================");
    console.log("✅ MIGRATION TERMINÉE AVEC SUCCÈS!");
    console.log("📝 ACTIONS À FAIRE:");
    console.log("   1. Communiquer les mots de passe temporaires aux employés");
    console.log("   2. Vérifier que les emails sont corrects");
    console.log("   3. Ajuster les plannings selon les besoins réels");
    console.log("   4. Tester la connexion avec quelques employés");
    
  } catch (error) {
    console.error("❌ ERREUR DURANT LA MIGRATION:", error);
    console.log("🔄 Restauration recommandée si nécessaire");
  } finally {
    await prisma.$disconnect();
  }
}

// =============================================
// 6. UTILITAIRES POUR LE JOUR J
// =============================================

// Fonction pour créer un employé individuellement
async function ajouterUnEmploye(donneesEmploye) {
  try {
    const motDePasseTemporaire = Math.random().toString(36).slice(-8);
    const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);
    
    const employe = await prisma.user.create({
      data: {
        ...donneesEmploye,
        password: motDePasseHash,
        codeActivation: Math.random().toString(36).slice(-10),
        statut: "actif"
      }
    });
    
    console.log(`✅ Employé ajouté: ${donneesEmploye.prenom} ${donneesEmploye.nom}`);
    console.log(`🔑 Mot de passe temporaire: ${motDePasseTemporaire}`);
    
    return { employe, motDePasseTemporaire };
    
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de l'employé:", error);
    throw error;
  }
}

// Fonction pour supprimer toutes les données (ATTENTION!)
async function reinitialiserBase() {
  console.log("⚠️  SUPPRESSION COMPLÈTE DE TOUTES LES DONNÉES");
  
  try {
    await prisma.extraPaymentLog.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.conge.deleteMany(); 
    await prisma.pointage.deleteMany();
    await prisma.planning.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
    
    console.log("🗑️  Base de données nettoyée complètement");
    
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation:", error);
    throw error;
  }
}

// =============================================
// EXPORT DES FONCTIONS
// =============================================

module.exports = {
  migrationComplete,
  ajouterUnEmploye,
  nettoyerDonneesFactices,
  creerVraisEmployes,
  creerPlanningInitial,
  verifierComptesAdmin,
  reinitialiserBase
};

// =============================================
// EXÉCUTION DIRECTE (SI APPELÉ DIRECTEMENT)
// =============================================

if (require.main === module) {
  console.log("🎯 SCRIPT DE MIGRATION - MODE INTERACTIF");
  console.log("=======================================");
  console.log("Choisissez une action:");
  console.log("1. Migration complète (ATTENTION: supprime les données actuelles)");
  console.log("2. Vérification des comptes admin seulement");
  console.log("3. Ajouter un employé individuellement");
  console.log("4. Nettoyer seulement les données factices");
  
  // Pour exécuter la migration complète, décommentez la ligne suivante:
  // migrationComplete();
  
  console.log("⚠️  Pour votre sécurité, modifiez ce script avant exécution!");
}
