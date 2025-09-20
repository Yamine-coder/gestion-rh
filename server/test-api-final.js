const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('./prisma/client');

// Test complet de l'API mes-shifts
async function testAPIComplete() {
  try {
    console.log('🔍 === TEST API COMPLETE ===\n');
    
    // 1. Vérifier l'utilisateur
    console.log('1. Vérification utilisateur...');
    const user = await prisma.user.findFirst({
      where: { email: 'test@Mouss.com' },
      select: { id: true, email: true, nom: true, prenom: true }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur trouvé: ID ${user.id} - ${user.nom} ${user.prenom}`);
    
    // 2. Vérifier les shifts
    console.log('\n2. Vérification des shifts...');
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Date recherchée: ${today}`);
    
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: user.id,
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`)
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    console.log(`📋 Shifts trouvés: ${shifts.length}`);
    
    shifts.forEach((shift, index) => {
      console.log(`\n   Shift ${index + 1}:`);
      console.log(`   - ID: ${shift.id}`);
      console.log(`   - Date: ${shift.date.toISOString().split('T')[0]}`);
      console.log(`   - Type: ${shift.type}`);
      console.log(`   - Motif: ${shift.motif || 'Aucun'}`);
      console.log(`   - Segments: ${shift.segments || 'Aucun'}`);
      
      if (shift.segments && Array.isArray(shift.segments)) {
        shift.segments.forEach((segment, i) => {
          console.log(`     Segment ${i + 1}: ${segment.heureDebut} - ${segment.heureFin} (pause: ${segment.pause}min)`);
        });
      }
    });
    
    // 3. Vérifier les pointages
    console.log('\n3. Vérification des pointages...');
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: user.id,
        horodatage: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`)
        }
      },
      orderBy: {
        horodatage: 'asc'
      }
    });
    
    console.log(`⏰ Pointages trouvés: ${pointages.length}`);
    
    pointages.forEach((pointage, index) => {
      console.log(`\n   Pointage ${index + 1}:`);
      console.log(`   - ID: ${pointage.id}`);
      console.log(`   - Type: ${pointage.type}`);
      console.log(`   - Heure: ${pointage.horodatage.toLocaleTimeString('fr-FR')}`);
    });
    
    // 4. Simulation de la logique API
    console.log('\n4. Test logique API...');
    
    const result = {
      shifts: shifts,
      hasShifts: shifts.length > 0,
      hasAbsenceShift: shifts.some(s => s.type === 'absence'),
      hasPresenceShift: shifts.some(s => s.type === 'présence'),
      totalPointages: pointages.length,
      isAnomaly: shifts.some(s => s.type === 'absence') && pointages.length > 0
    };
    
    console.log('\n📊 Résultat analyse:');
    console.log(`   - Shifts trouvés: ${result.hasShifts}`);
    console.log(`   - Shift absence: ${result.hasAbsenceShift}`);
    console.log(`   - Shift présence: ${result.hasPresenceShift}`);
    console.log(`   - Total pointages: ${result.totalPointages}`);
    console.log(`   - 🚨 ANOMALIE DÉTECTÉE: ${result.isAnomaly}`);
    
    if (result.isAnomaly) {
      console.log('\n🔴 === ANOMALIE CONFIRMÉE ===');
      console.log('   Absence planifiée + Pointages détectés');
      console.log('   Interface devrait afficher: 🚫 Badge "Anomalie"');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Démarrer le test
testAPIComplete();
