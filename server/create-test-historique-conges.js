const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestHistoriqueConges() {
  try {
    console.log('👥 Récupération d\'un utilisateur...');
    const user = await prisma.user.findFirst({
      select: { id: true, email: true, nom: true, prenom: true }
    });
    
    if (!user) {
      console.log('❌ Aucun utilisateur trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur: ${user.prenom} ${user.nom} (${user.email})`);
    
    const maintenant = new Date();
    
    // Congés HISTORIQUES (passés) avec tous les types pour tester les filtres
    const historiqueConges = [
      // ===== CONGÉS PAYÉS (CP) =====
      {
        userId: user.id,
        type: "Congés payés",
        dateDebut: new Date(2025, 0, 6),  // 6 janvier 2025
        dateFin: new Date(2025, 0, 10),   // 10 janvier 2025
        statut: "approuvé",
        motifEmploye: "Vacances d'hiver en famille"
      },
      {
        userId: user.id,
        type: "Congés payés",
        dateDebut: new Date(2025, 3, 21), // 21 avril 2025
        dateFin: new Date(2025, 3, 25),   // 25 avril 2025
        statut: "approuvé",
        motifEmploye: "Vacances de Pâques"
      },
      {
        userId: user.id,
        type: "Congés payés",
        dateDebut: new Date(2025, 6, 14), // 14 juillet 2025
        dateFin: new Date(2025, 6, 28),   // 28 juillet 2025
        statut: "approuvé",
        motifEmploye: "Vacances d'été - séjour en Espagne"
      },
      {
        userId: user.id,
        type: "Congés payés",
        dateDebut: new Date(2025, 9, 27), // 27 octobre 2025
        dateFin: new Date(2025, 9, 31),   // 31 octobre 2025
        statut: "refusé",
        motifEmploye: "Vacances Toussaint",
        motifRefus: "Effectif insuffisant sur cette période"
      },
      
      // ===== RTT =====
      {
        userId: user.id,
        type: "RTT",
        dateDebut: new Date(2025, 1, 14), // 14 février 2025
        dateFin: new Date(2025, 1, 14),   // 14 février 2025
        statut: "approuvé",
        motifEmploye: "Journée personnelle"
      },
      {
        userId: user.id,
        type: "RTT",
        dateDebut: new Date(2025, 4, 2),  // 2 mai 2025
        dateFin: new Date(2025, 4, 2),    // 2 mai 2025 (pont)
        statut: "approuvé",
        motifEmploye: "Pont du 1er mai"
      },
      {
        userId: user.id,
        type: "RTT",
        dateDebut: new Date(2025, 10, 10), // 10 novembre 2025
        dateFin: new Date(2025, 10, 10),   // 10 novembre 2025
        statut: "refusé",
        motifEmploye: "Pont du 11 novembre",
        motifRefus: "RTT déjà posé par plusieurs collègues"
      },
      
      // ===== MALADIE =====
      {
        userId: user.id,
        type: "Congé maladie",
        dateDebut: new Date(2025, 2, 10), // 10 mars 2025
        dateFin: new Date(2025, 2, 12),   // 12 mars 2025
        statut: "approuvé",
        motifEmploye: "Grippe - certificat médical fourni"
      },
      {
        userId: user.id,
        type: "Congé maladie",
        dateDebut: new Date(2025, 8, 22), // 22 septembre 2025
        dateFin: new Date(2025, 8, 23),   // 23 septembre 2025
        statut: "approuvé",
        motifEmploye: "Gastro-entérite"
      },
      
      // ===== SANS SOLDE =====
      {
        userId: user.id,
        type: "Congé sans solde",
        dateDebut: new Date(2025, 5, 16), // 16 juin 2025
        dateFin: new Date(2025, 5, 20),   // 20 juin 2025
        statut: "approuvé",
        motifEmploye: "Projet personnel - déménagement"
      },
      
      // ===== MATERNITÉ/PATERNITÉ =====
      {
        userId: user.id,
        type: "Congé paternité",
        dateDebut: new Date(2025, 7, 1),  // 1 août 2025
        dateFin: new Date(2025, 7, 25),   // 25 août 2025
        statut: "approuvé",
        motifEmploye: "Naissance prévue le 28 juillet"
      },
      
      // ===== DÉCÈS =====
      {
        userId: user.id,
        type: "Congé décès",
        dateDebut: new Date(2025, 4, 15), // 15 mai 2025
        dateFin: new Date(2025, 4, 17),   // 17 mai 2025
        statut: "approuvé",
        motifEmploye: "Décès grand-parent"
      },
      
      // ===== MARIAGE =====
      {
        userId: user.id,
        type: "Congé mariage",
        dateDebut: new Date(2025, 5, 7),  // 7 juin 2025
        dateFin: new Date(2025, 5, 10),   // 10 juin 2025
        statut: "approuvé",
        motifEmploye: "Mon mariage civil et religieux"
      },
      
      // ===== FORMATION =====
      {
        userId: user.id,
        type: "Congé formation",
        dateDebut: new Date(2025, 8, 8),  // 8 septembre 2025
        dateFin: new Date(2025, 8, 12),   // 12 septembre 2025
        statut: "approuvé",
        motifEmploye: "Formation React avancé - CPF"
      },
      {
        userId: user.id,
        type: "Congé formation",
        dateDebut: new Date(2025, 10, 17), // 17 novembre 2025
        dateFin: new Date(2025, 10, 19),   // 19 novembre 2025
        statut: "refusé",
        motifEmploye: "Formation management",
        motifRefus: "Budget formation épuisé pour 2025"
      },
      
      // ===== AUTRE =====
      {
        userId: user.id,
        type: "Autre",
        dateDebut: new Date(2025, 3, 7),  // 7 avril 2025
        dateFin: new Date(2025, 3, 7),    // 7 avril 2025
        statut: "approuvé",
        motifEmploye: "Rendez-vous administratif préfecture"
      },
      {
        userId: user.id,
        type: "Autre",
        dateDebut: new Date(2025, 9, 15), // 15 octobre 2025
        dateFin: new Date(2025, 9, 15),   // 15 octobre 2025
        statut: "approuvé",
        motifEmploye: "Déménagement - journée exceptionnelle"
      }
    ];
    
    console.log('\n📝 Création des congés historiques de test...\n');
    
    let created = 0;
    for (const conge of historiqueConges) {
      try {
        await prisma.conge.create({ data: conge });
        const dateStr = conge.dateDebut.toLocaleDateString('fr-FR');
        const status = conge.statut === 'approuvé' ? '✅' : '❌';
        console.log(`${status} ${conge.type.padEnd(20)} | ${dateStr} | ${conge.motifEmploye?.substring(0, 30)}...`);
        created++;
      } catch (err) {
        console.log(`⚠️  Erreur pour ${conge.type}: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RÉCAPITULATIF DES CONGÉS HISTORIQUES CRÉÉS :');
    console.log('='.repeat(60));
    console.log(`📊 Total: ${created} congés créés pour ${user.prenom} ${user.nom}`);
    console.log('\n📋 PAR TYPE :');
    console.log('   • Congés payés (CP)    : 4 (3 approuvés, 1 refusé)');
    console.log('   • RTT                  : 3 (2 approuvés, 1 refusé)');
    console.log('   • Maladie              : 2 (approuvés)');
    console.log('   • Sans solde           : 1 (approuvé)');
    console.log('   • Paternité            : 1 (approuvé)');
    console.log('   • Décès                : 1 (approuvé)');
    console.log('   • Mariage              : 1 (approuvé)');
    console.log('   • Formation            : 2 (1 approuvé, 1 refusé)');
    console.log('   • Autre                : 2 (approuvés)');
    console.log('\n📅 PÉRIODE : Janvier 2025 → Novembre 2025');
    console.log('\n🔍 Tu peux maintenant tester les filtres dans l\'historique !');
    console.log('   - Filtre par type de congé');
    console.log('   - Recherche par date');
    console.log('   - Compteur de résultats');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestHistoriqueConges();
