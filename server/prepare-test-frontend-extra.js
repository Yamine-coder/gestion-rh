/**
 * PRÉPARATION TEST FRONTEND - POINTAGE EXTRA
 * 
 * Ce script crée les données nécessaires pour tester le flux complet
 * de pointage extra sur le frontend AUJOURD'HUI.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const log = (emoji, msg) => console.log(`${emoji} ${msg}`);

async function main() {
  console.log('\n');
  log('🧪', '═══════════════════════════════════════════════════════════════');
  log('🧪', '    PRÉPARATION TEST FRONTEND - POINTAGE EXTRA');
  log('🧪', '═══════════════════════════════════════════════════════════════\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  log('📅', `Date du test: ${todayStr} (AUJOURD'HUI)`);
  
  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. RÉCUPÉRER OU CRÉER UN EMPLOYÉ TEST
    // ═══════════════════════════════════════════════════════════════
    log('\n📋', '1. RECHERCHE EMPLOYÉ TEST...');
    
    let employe = await prisma.user.findFirst({
      where: { 
        email: 'test.extra@restaurant.com'
      }
    });
    
    if (!employe) {
      log('➕', 'Création d\'un employé test pour les extras...');
      const hashedPassword = await bcrypt.hash('Test123!', 10);
      employe = await prisma.user.create({
        data: {
          email: 'test.extra@restaurant.com',
          password: hashedPassword,
          nom: 'TestExtra',
          prenom: 'Employé',
          role: 'employee',
          statut: 'actif',
          categorie: 'Pizzaiolo'
        }
      });
      log('✅', `Employé créé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);
    } else {
      log('✅', `Employé existant: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 2. CRÉER UN SHIFT MIXTE POUR AUJOURD'HUI
    // ═══════════════════════════════════════════════════════════════
    log('\n📋', '2. CRÉATION SHIFT MIXTE (NORMAL + EXTRA) POUR AUJOURD\'HUI...');
    
    // Supprimer les anciens shifts de test pour aujourd'hui
    await prisma.shift.deleteMany({
      where: { 
        employeId: employe.id,
        date: today
      }
    });
    
    // Créer un shift avec segments normal et extra
    const shift = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: today,
        type: 'présence',
        segments: [
          {
            start: '09:00',
            end: '14:00',
            isExtra: false,
            commentaire: 'Service midi - Normal'
          },
          {
            start: '18:00',
            end: '22:00',
            isExtra: true,
            commentaire: 'Renfort soir - EXTRA (payé en espèces)'
          }
        ]
      }
    });
    
    log('✅', `Shift créé: ID ${shift.id}`);
    log('📊', `   Segment NORMAL: 09:00-14:00 (5h)`);
    log('📊', `   Segment EXTRA:  18:00-22:00 (4h) 💰`);
    
    // ═══════════════════════════════════════════════════════════════
    // 3. NETTOYER LES POINTAGES EXISTANTS
    // ═══════════════════════════════════════════════════════════════
    log('\n📋', '3. NETTOYAGE POINTAGES EXISTANTS...');
    
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    await prisma.pointage.deleteMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    log('✅', 'Pointages nettoyés');
    
    // ═══════════════════════════════════════════════════════════════
    // RÉSUMÉ
    // ═══════════════════════════════════════════════════════════════
    console.log('\n');
    log('🎯', '═══════════════════════════════════════════════════════════════');
    log('🎯', '                    DONNÉES PRÊTES POUR TEST');
    log('🎯', '═══════════════════════════════════════════════════════════════');
    
    console.log('\n');
    console.log('   ┌─────────────────────────────────────────────────────────┐');
    console.log('   │                   IDENTIFIANTS TEST                     │');
    console.log('   ├─────────────────────────────────────────────────────────┤');
    console.log('   │  Email:     test.extra@restaurant.com                   │');
    console.log('   │  Password:  Test123!                                    │');
    console.log('   │  Rôle:      Employé                                     │');
    console.log('   └─────────────────────────────────────────────────────────┘');
    console.log('\n');
    console.log('   ┌─────────────────────────────────────────────────────────┐');
    console.log('   │                   SHIFT AUJOURD\'HUI                      │');
    console.log('   ├─────────────────────────────────────────────────────────┤');
    console.log('   │  🟢 09:00 - 14:00  │  Service midi (NORMAL - 5h)        │');
    console.log('   │  🔴 18:00 - 22:00  │  Renfort soir (EXTRA - 4h) 💰      │');
    console.log('   └─────────────────────────────────────────────────────────┘');
    console.log('\n');
    console.log('   ┌─────────────────────────────────────────────────────────┐');
    console.log('   │                   SCÉNARIOS À TESTER                    │');
    console.log('   ├─────────────────────────────────────────────────────────┤');
    console.log('   │  1. Connectez-vous avec les identifiants ci-dessus      │');
    console.log('   │  2. Allez sur la page Pointage                          │');
    console.log('   │  3. Vérifiez l\'affichage du planning (normal + extra)   │');
    console.log('   │  4. Faites un pointage d\'arrivée                        │');
    console.log('   │  5. Vérifiez que les heures extra sont bien séparées    │');
    console.log('   │  6. Côté Admin: vérifiez les paiements extras           │');
    console.log('   └─────────────────────────────────────────────────────────┘');
    console.log('\n');
    
    log('🚀', 'Ouvrez http://localhost:3000 et testez !');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
