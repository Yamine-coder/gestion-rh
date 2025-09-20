/**
 * 🔧 AJUSTEMENT DES CONTRAINTES DE SÉCURITÉ
 * Assouplit les contraintes pour être plus réalistes en production
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function adjustSecurityConstraints() {
  console.log('🔧 === AJUSTEMENT DES CONTRAINTES DE SÉCURITÉ ===\n');

  try {
    // 1. Supprimer l'ancienne contrainte futur trop restrictive
    console.log('1. Suppression ancienne contrainte futur...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage" DROP CONSTRAINT IF EXISTS pointage_futur_check
      `;
      console.log('✅ Ancienne contrainte futur supprimée');
    } catch (error) {
      console.log('ℹ️  Ancienne contrainte déjà supprimée');
    }

    // 2. Ajouter nouvelle contrainte futur plus flexible (2 heures)
    console.log('\n2. Ajout nouvelle contrainte futur (2h de tolérance)...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage"
        ADD CONSTRAINT pointage_futur_check
        CHECK (horodatage <= NOW() + INTERVAL '2 hours')
      `;
      console.log('✅ Nouvelle contrainte futur ajoutée (2h de tolérance)');
    } catch (error) {
      console.log('❌ Erreur nouvelle contrainte futur:', error.message);
    }

    // 3. Ajuster la contrainte ancien pour être plus flexible (30 jours au lieu de 7)
    console.log('\n3. Ajustement contrainte pointages anciens...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage" DROP CONSTRAINT IF EXISTS pointage_ancien_check
      `;
      await prisma.$executeRaw`
        ALTER TABLE "Pointage"
        ADD CONSTRAINT pointage_ancien_check
        CHECK (horodatage >= NOW() - INTERVAL '30 days')
      `;
      console.log('✅ Contrainte ancien ajustée (30 jours de tolérance)');
    } catch (error) {
      console.log('❌ Erreur contrainte ancien:', error.message);
    }

    // 4. Ajouter une contrainte pour empêcher les horodatages NULL
    console.log('\n4. Ajout contrainte horodatage non-NULL...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage" 
        ALTER COLUMN horodatage SET NOT NULL
      `;
      console.log('✅ Contrainte horodatage NOT NULL ajoutée');
    } catch (error) {
      console.log('ℹ️  Contrainte NOT NULL déjà présente ou erreur:', error.message);
    }

    // 5. Créer un index partiel pour les requêtes du jour courant (performance)
    console.log('\n5. Création index partiel jour courant...');
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS pointage_today_idx 
        ON "Pointage" ("userId", "type", "horodatage")
        WHERE horodatage >= CURRENT_DATE - INTERVAL '1 day'
          AND horodatage < CURRENT_DATE + INTERVAL '2 days'
      `;
      console.log('✅ Index partiel jour courant créé');
    } catch (error) {
      console.log('❌ Erreur index partiel:', error.message);
    }

    console.log('\n🎉 Ajustements de sécurité appliqués !');
    
    console.log('\n📋 Contraintes actives:');
    console.log('- Types: seulement "arrivee" ou "depart"');
    console.log('- Futur: max +2 heures (tolérance décalage horloge)');
    console.log('- Passé: max -30 jours (historique raisonnable)');
    console.log('- UserId: doit être positif');
    console.log('- Doublons: interdits (même seconde)');
    console.log('- Index: optimisés pour les requêtes fréquentes');

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajustement:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 Lancer les ajustements
if (require.main === module) {
  adjustSecurityConstraints().catch(console.error);
}

module.exports = { adjustSecurityConstraints };
