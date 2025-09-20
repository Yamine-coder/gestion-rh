/**
 * Création de nouveaux tests pour test@Mouss.com - Version avec dates passées
 * Utilise des dates des jours précédents pour éviter les contraintes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createNewTestData() {
  console.log('🚀 Création de nouveaux tests pour test@Mouss.com');
  console.log('📅 Base temporelle: Europe/Paris (dates passées)');
  
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
    
    // 2. Utiliser des dates des 3 derniers jours
    const today = new Date();
    const day1 = new Date(today);
    day1.setDate(day1.getDate() - 3); // Il y a 3 jours
    const day2 = new Date(today);
    day2.setDate(day2.getDate() - 2); // Il y a 2 jours
    const day3 = new Date(today);
    day3.setDate(day3.getDate() - 1); // Hier
    
    console.log(`📅 Jour 1: ${day1.toDateString()}`);
    console.log(`📅 Jour 2: ${day2.toDateString()}`);
    console.log(`📅 Jour 3: ${day3.toDateString()}`);
    
    // 3. Créer des shifts de test (plannings prévus)
    console.log('\n📋 Création des shifts (plannings)...');
    
    // Shift 1: Horaires normaux (9h-17h)
    const shift1 = await prisma.shift.create({
      data: {
        employeId: user.id,
        date: day1,
        type: 'présence',
        segments: [
          {
            start: '09:00',
            end: '17:00'
          }
        ]
      }
    });
    console.log(`✅ Shift 1: ${day1.toDateString()} 09:00-17:00 (ID: ${shift1.id})`);
    
    // Shift 2: Horaires de soirée (18h-22h)
    const shift2 = await prisma.shift.create({
      data: {
        employeId: user.id,
        date: day2,
        type: 'présence',
        segments: [
          {
            start: '18:00',
            end: '22:00'
          }
        ]
      }
    });
    console.log(`✅ Shift 2: ${day2.toDateString()} 18:00-22:00 (ID: ${shift2.id})`);
    
    // Shift 3: Double service
    const shift3 = await prisma.shift.create({
      data: {
        employeId: user.id,
        date: day3,
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
    console.log(`✅ Shift 3: ${day3.toDateString()} 10:00-14:00 et 16:00-20:00 (ID: ${shift3.id})`);
    
    // 4. Créer des pointages de test
    console.log('\n⏰ Création des pointages de test...');
    
    // Test 1: Retard léger acceptable (5 min)
    const pointage1a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 9, 5, 12)
      }
    });
    
    const pointage1b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 17, 0, 25)
      }
    });
    
    console.log(`✅ Jour 1: 09:05 (retard 5 min - acceptable) → 17:00`);
    
    // Test 2: Hors-plage extrême
    const pointage2a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 17, 15, 30)
      }
    });
    
    const pointage2b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 23, 30, 45)
      }
    });
    
    console.log(`✅ Jour 2: 17:15 (45 min trop tôt - hors plage) → 23:30 (90 min heures sup)`);
    
    // Test 3: Double service avec retard critique
    const pointage3a = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(day3.getFullYear(), day3.getMonth(), day3.getDate(), 10, 25, 15)
      }
    });
    
    const pointage3b = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(day3.getFullYear(), day3.getMonth(), day3.getDate(), 13, 45, 30)
      }
    });
    
    const pointage3c = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: new Date(day3.getFullYear(), day3.getMonth(), day3.getDate(), 16, 10, 45)
      }
    });
    
    const pointage3d = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: new Date(day3.getFullYear(), day3.getMonth(), day3.getDate(), 20, 15, 20)
      }
    });
    
    console.log(`✅ Jour 3: 10:25 (retard 25 min - critique) → 13:45 puis 16:10 → 20:15`);
    
    // 5. Résumé des tests
    console.log('\n📊 RÉSUMÉ DES TESTS CRÉÉS:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ 🟢 TEST TOLÉRANCE NORMALE                                       │');
    console.log(`│ ${day1.toDateString()}: 09:00-17:00 → 09:05-17:00               │`);
    console.log('│ Retard 5 min → Zone acceptable                                  │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ 🟣 TEST HORS-PLAGE EXTRÊME                                      │');
    console.log(`│ ${day2.toDateString()}: 18:00-22:00 → 17:15-23:30               │`);
    console.log('│ 45min trop tôt + 90min heures sup → Hors-plage IN/OUT          │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ 🔴 TEST RETARD CRITIQUE + DOUBLE SERVICE                        │');
    console.log(`│ ${day3.toDateString()}: 10:00-14:00/16:00-20:00                 │`);
    console.log('│ 10:25-13:45/16:10-20:15 → Retard critique + modéré             │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    
    console.log('\n✅ Données de test créées avec succès !');
    console.log('🧪 Testez avec: API /api/comparison/planning-vs-realite?employeId=86');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewTestData();
