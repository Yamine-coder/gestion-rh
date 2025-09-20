/**
 * Création de nouveaux tests pour test@Mouss.com - Version corrigée
 * Évite les contraintes d'unicité en utilisant des heures différentes
 */

const { PrismaClient } = require('@prisma/client');
const { getCurrentParisDateString } = require('./utils/parisTimeUtils');

const prisma = new PrismaClient();

async function createNewTestData() {
  console.log('🚀 Création de nouveaux tests pour test@Mouss.com (Version 2)');
  console.log('📅 Base temporelle: Europe/Paris');
  
  try {
    // 1. Trouver l'utilisateur test@Mouss.com
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur: ${user.prenom} ${user.nom} (ID: ${user.id})`);
    
    // 2. Créer des shifts de test (plannings prévus)
    console.log('\n📋 Création des shifts (plannings)...');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    // Shift 1: Horaires normaux (9h-17h) - Aujourd'hui
    const shift1 = await prisma.shift.create({
      data: {
        employeId: user.id,
        date: today,
        type: 'présence',
        segments: [
          {
            start: '09:00',
            end: '17:00'
          }
        ]
      }
    });
    console.log(`✅ Shift 1: Aujourd'hui 09:00-17:00 (ID: ${shift1.id})`);
    
    // Shift 2: Horaires de soirée (18h-22h) - Demain  
    const shift2 = await prisma.shift.create({
      data: {
        employeId: user.id,
        date: tomorrow,
        type: 'présence',
        segments: [
          {
            start: '18:00',
            end: '22:00'
          }
        ]
      }
    });
    console.log(`✅ Shift 2: Demain 18:00-22:00 (ID: ${shift2.id})`);
    
    // Shift 3: Double service - Après-demain
    const shift3 = await prisma.shift.create({
      data: {
        employeId: user.id,
        date: dayAfter,
        type: 'présence',
        segments: [
          {
            start: '10:00',
            end: '14:00'
          },
          {
            start: '16:00', 
            end: '20:00'
          }
        ]
      }
    });
    console.log(`✅ Shift 3: Après-demain 10:00-14:00 et 16:00-20:00 (ID: ${shift3.id})`);
    
    // 3. Créer des pointages de test avec heures précises pour éviter les doublons
    console.log('\n⏰ Création des pointages de test...');
    
    // Test 1: Jour 1 - Retard léger acceptable
    const pointage1a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 5, 12) // 09:05:12
      }
    });
    
    const pointage1b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0, 25) // 17:00:25
      }
    });
    
    console.log(`✅ Jour 1: 09:05:12 (5 min retard acceptable) → 17:00:25`);
    
    // Test 2: Jour 2 - Hors-plage extrêmes
    const pointage2a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 17, 15, 30) // 17:15:30 (45 min trop tôt)
      }
    });
    
    const pointage2b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 30, 45) // 23:30:45 (90 min heures sup)
      }
    });
    
    console.log(`✅ Jour 2: 17:15:30 (45 min trop tôt = hors-plage) → 23:30:45 (90 min heures sup)`);
    
    // Test 3: Jour 3 - Double service avec critiques
    const pointage3a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 10, 25, 15) // 10:25:15 (25 min retard critique)
      }
    });
    
    const pointage3b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 13, 45, 30) // 13:45:30
      }
    });
    
    const pointage3c = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 16, 10, 45) // 16:10:45 (10 min retard modéré)
      }
    });
    
    const pointage3d = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 20, 15, 20) // 20:15:20 (15 min heures sup acceptables)
      }
    });
    
    console.log(`✅ Jour 3: 10:25:15 (25 min retard critique) → 13:45:30`);
    console.log(`           16:10:45 (10 min retard modéré) → 20:15:20 (15 min heures sup)`);
    
    // 4. Résumé des tests créés
    console.log('\n📊 RÉSUMÉ DES TESTS CRÉÉS AVEC TIMEZONE EUROPE/PARIS:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ 🟢 JOUR 1: Test zone acceptable                                 │');
    console.log('│ Planning: 09:00-17:00                                           │');
    console.log('│ Réel: 09:05-17:00 → Retard 5 min (dans tolérance)             │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ 🟣 JOUR 2: Test hors-plage extrême                              │');
    console.log('│ Planning: 18:00-22:00                                           │');
    console.log('│ Réel: 17:15-23:30 → 45min trop tôt + 90min heures sup         │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ 🔴🟡 JOUR 3: Test double service + critique                     │');
    console.log('│ Planning: 10:00-14:00 et 16:00-20:00                           │');
    console.log('│ Réel: 10:25-13:45 et 16:10-20:15                               │');
    console.log('│ → Retard critique 25min + Retard modéré 10min                  │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    
    console.log('\n✅ Données de test créées avec succès !');
    console.log('🎯 Prêt pour tester le système de tolérance Europe/Paris');
    console.log('🧪 Utilisez l\'API /api/comparison/planning-vs-realite pour les tests');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewTestData();
