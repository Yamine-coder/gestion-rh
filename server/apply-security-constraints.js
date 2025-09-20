/**
 * 🛡️ APPLICATION DES CONTRAINTES DE SÉCURITÉ
 * Script pour appliquer les contraintes de sécurité à la base PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applySecurityConstraints() {
  console.log('🛡️ === APPLICATION DES CONTRAINTES DE SÉCURITÉ ===\n');

  try {
    // 1. Contrainte sur les types de pointage
    console.log('1. Ajout contrainte type de pointage...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage" 
        ADD CONSTRAINT pointage_type_check 
        CHECK (type IN ('arrivee', 'depart'))
      `;
      console.log('✅ Contrainte type ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Contrainte type déjà existante');
      } else {
        console.log('❌ Erreur contrainte type:', error.message);
      }
    }

    // 2. Contrainte horodatages futurs (max +1 heure)
    console.log('\n2. Ajout contrainte horodatages futurs...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage"
        ADD CONSTRAINT pointage_futur_check
        CHECK (horodatage <= NOW() + INTERVAL '1 hour')
      `;
      console.log('✅ Contrainte futur ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Contrainte futur déjà existante');
      } else {
        console.log('❌ Erreur contrainte futur:', error.message);
      }
    }

    // 3. Contrainte horodatages anciens (max 7 jours)
    console.log('\n3. Ajout contrainte horodatages anciens...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage"
        ADD CONSTRAINT pointage_ancien_check
        CHECK (horodatage >= NOW() - INTERVAL '7 days')
      `;
      console.log('✅ Contrainte ancien ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Contrainte ancien déjà existante');
      } else {
        console.log('❌ Erreur contrainte ancien:', error.message);
      }
    }

    // 4. Index unique pour empêcher les doublons
    console.log('\n4. Création index anti-doublon...');
    try {
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS pointage_unique_idx 
        ON "Pointage" (
            "userId", 
            "type", 
            date_trunc('second', "horodatage")
        )
      `;
      console.log('✅ Index anti-doublon créé');
    } catch (error) {
      console.log('❌ Erreur index anti-doublon:', error.message);
    }

    // 5. Index optimisé pour les requêtes par journée
    console.log('\n5. Création index journée de travail...');
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS pointage_journee_travail_idx 
        ON "Pointage" ("userId", "horodatage" DESC)
      `;
      console.log('✅ Index journée de travail créé');
    } catch (error) {
      console.log('❌ Erreur index journée:', error.message);
    }

    // 6. Index admin par date
    console.log('\n6. Création index admin...');
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS pointage_date_admin_idx 
        ON "Pointage" (date_trunc('day', "horodatage"), "userId")
      `;
      console.log('✅ Index admin créé');
    } catch (error) {
      console.log('❌ Erreur index admin:', error.message);
    }

    // 7. Contrainte userId positif
    console.log('\n7. Ajout contrainte userId positif...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Pointage"
        ADD CONSTRAINT pointage_userid_positive_check
        CHECK ("userId" > 0)
      `;
      console.log('✅ Contrainte userId positif ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Contrainte userId déjà existante');
      } else {
        console.log('❌ Erreur contrainte userId:', error.message);
      }
    }

    console.log('\n🎉 Contraintes de sécurité appliquées avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'application des contraintes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 Lancer l'application des contraintes
if (require.main === module) {
  applySecurityConstraints().catch(console.error);
}

module.exports = { applySecurityConstraints };
