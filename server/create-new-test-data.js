/**
 * Création de nouveaux tests pour test@Mouss.com avec la standardisation Europe/Paris
 * Tests complets des nouvelles fonctionnalités de tolérance
 */

const { PrismaClient } = require('@prisma/client');
const { getCurrentParisDateString } = require('./utils/parisTimeUtils');

const prisma = new PrismaClient();

async function createNewTestData() {
  console.log('🚀 Création de nouveaux tests pour test@Mouss.com');
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
    console.log(`✅ Shift 1: ${getCurrentParisDateString()} 09:00-17:00 (ID: ${shift1.id})`);
    
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
    
    // Shift 3: Double service (10h-14h et 16h-20h) - Après-demain
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
    
    // 3. Créer des pointages de test (réalités diverses)
    console.log('\n⏰ Création des pointages de test...');
    
    // Test 1: Arrivée légèrement en retard (5 min = zone acceptable)
    const pointage1a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 5) // 09:05
      }
    });
    
    // Test 1: Départ à l'heure
    const pointage1b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0) // 17:00
      }
    });
    
    console.log(`✅ Pointages aujourd'hui: 09:05 (5 min retard) → 17:00 (à l'heure)`);
    
    // Test 2: Arrivée très en avance (hors plage) + départ tardif (heures sup)
    const pointage2a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 17, 15) // 17:15 (45 min trop tôt)
      }
    });
    
    const pointage2b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 30) // 23:30 (90 min heures sup)
      }
    });
    
    console.log(`✅ Pointages demain: 17:15 (45 min trop tôt) → 23:30 (90 min heures sup)`);
    
    // Test 3: Double service avec anomalies - retard critique + départ prématuré
    const pointage3a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 10, 25) // 10:25 (25 min retard critique)
      }
    });
    
    const pointage3b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 13, 45) // 13:45 (15 min trop tôt sur 2e service)
      }
    });
    
    const pointage3c = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 16, 10) // 16:10 (10 min retard modéré)
      }
    });
    
    const pointage3d = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 20, 15) // 20:15 (15 min heures sup acceptables)
      }
    });
    
    console.log(`✅ Pointages après-demain: 10:25 (25 min retard) → 13:45 puis 16:10 → 20:15`);
    
    // 4. Résumé des tests créés
    console.log('\n📊 RÉSUMÉ DES TESTS CRÉÉS:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ JOUR 1 (Aujourd\'hui): Test tolérance normale                    │');
    console.log('│ Planning: 09:00-17:00                                           │');
    console.log('│ Réel: 09:05-17:00 → 🟢 Acceptable (5 min retard toléré)       │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ JOUR 2 (Demain): Test extrêmes hors-plage                       │');
    console.log('│ Planning: 18:00-22:00                                           │');
    console.log('│ Réel: 17:15-23:30 → 🟣 Hors-plage IN + OUT (à valider)        │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ JOUR 3 (Après-demain): Test double service + critique          │');
    console.log('│ Planning: 10:00-14:00 et 16:00-20:00                           │');
    console.log('│ Réel: 10:25-13:45 et 16:10-20:15                               │');
    console.log('│ → 🔴 Retard critique + 🟡 Départ anticipé + 🟢 Acceptable     │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    
    console.log('\n✅ Données de test créées avec succès !');
    console.log('🔧 Prêt pour tester la standardisation Europe/Paris');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewTestData();
