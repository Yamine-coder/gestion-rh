// Test du scénario: Pause non prise
// Shift prévu: 9h-13h + 14h-17h (avec pause 13h-14h)
// Réel: 9h-17h sans pause

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPauseNonPrise() {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('=== TEST: Pause Non Prise ===\n');
  
  try {
    // 1. Trouver un employé de test
    const employe = await prisma.user.findFirst({
      where: { 
        role: 'employee',
        statut: 'actif'
      }
    });
    
    if (!employe) {
      console.log('❌ Aucun employé trouvé');
      return;
    }
    
    console.log(`👤 Employé test: ${employe.prenom} ${employe.nom} (ID: ${employe.id})\n`);
    
    // 2. Nettoyer les données de test
    await prisma.anomalie.deleteMany({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        },
        type: { in: ['pause_non_prise', 'depassement_amplitude'] }
      }
    });
    
    await prisma.pointage.deleteMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      }
    });
    
    await prisma.shift.deleteMany({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      }
    });
    
    console.log('🧹 Données précédentes nettoyées\n');
    
    // 3. Créer un shift avec pause
    const shift = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date(`${today}T00:00:00.000Z`),
        type: 'travail',
        segments: [
          { type: 'travail', start: '09:00', end: '13:00' },
          { type: 'pause', start: '13:00', end: '14:00' },
          { type: 'travail', start: '14:00', end: '17:00' }
        ]
      }
    });
    
    console.log('📅 Shift créé:');
    console.log('   - 09:00-13:00 (travail)');
    console.log('   - 13:00-14:00 (PAUSE)');
    console.log('   - 14:00-17:00 (travail)');
    console.log('   → Total prévu: 7h travail + 1h pause\n');
    
    // 4. Créer des pointages SANS pause (9h-17h direct)
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'ENTRÉE',
        horodatage: new Date(`${today}T09:00:00.000Z`)
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'SORTIE',
        horodatage: new Date(`${today}T17:00:00.000Z`)
      }
    });
    
    console.log('⏱️ Pointages créés:');
    console.log('   - 09:00 ENTRÉE');
    console.log('   - 17:00 SORTIE');
    console.log('   → Réel: 8h de travail CONTINU (pas de pause)\n');
    
    // 5. Appeler le scheduler pour analyser
    console.log('🔄 Analyse du scheduler...\n');
    
    const scheduler = require('./services/anomalyScheduler');
    
    // Récupérer les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    const entrees = pointages.filter(p => p.type === 'ENTRÉE' || p.type === 'arrivee');
    const sorties = pointages.filter(p => p.type === 'SORTIE' || p.type === 'depart');
    
    // Appeler la méthode de détection
    await scheduler.checkPauseNonPrise(shift, entrees, sorties, today);
    
    // 6. Vérifier les anomalies créées
    const anomalies = await prisma.anomalie.findMany({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      }
    });
    
    console.log('=== RÉSULTATS ===\n');
    
    if (anomalies.length === 0) {
      console.log('❌ Aucune anomalie détectée (problème!)');
    } else {
      console.log(`✅ ${anomalies.length} anomalie(s) détectée(s):\n`);
      
      for (const a of anomalies) {
        console.log(`📌 ${a.type.toUpperCase()}`);
        console.log(`   Gravité: ${a.gravite}`);
        console.log(`   Description: ${a.description}`);
        if (a.details) {
          console.log(`   Détails: ${JSON.stringify(a.details, null, 2)}`);
        }
        console.log('');
      }
    }
    
    // 7. Nettoyage
    console.log('🧹 Nettoyage des données de test...');
    await prisma.anomalie.deleteMany({
      where: { employeId: employe.id, type: { in: ['pause_non_prise', 'depassement_amplitude'] } }
    });
    await prisma.pointage.deleteMany({ 
      where: { 
        userId: employe.id,
        horodatage: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      } 
    });
    await prisma.shift.delete({ where: { id: shift.id } });
    
    console.log('✅ Test terminé!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPauseNonPrise();
