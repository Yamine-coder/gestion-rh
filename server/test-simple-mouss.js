// Script simplifié pour créer des données de test pour Moussa
// Utilise les scripts existants du serveur

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 CRÉATION DES DONNÉES DE TEST POUR MOUSSA');
console.log('==========================================\n');

// Configuration
const EMPLOYE_EMAIL = 'test@Mouss.com';
const EMPLOYE_ID = 2; // ID que nous allons utiliser

try {
  // 1. Créer l'employé s'il n'existe pas
  console.log('👤 1. Vérification de l\'employé...');
  
  // Utiliser le script create-admin.js comme modèle
  const createEmployeScript = `
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestEmployee() {
  try {
    // Vérifier si l'employé existe
    const existing = await prisma.employe.findUnique({
      where: { email: '${EMPLOYE_EMAIL}' }
    });
    
    if (existing) {
      console.log('✅ Employé existant trouvé (ID: ' + existing.id + ')');
      return existing.id;
    }
    
    // Créer l'employé
    const hashedPassword = await bcrypt.hash('7704154915Ym@!!', 10);
    
    const employe = await prisma.employe.create({
      data: {
        email: '${EMPLOYE_EMAIL}',
        password: hashedPassword,
        prenom: 'Moussa',
        nom: 'Test',
        telephone: '0123456789',
        poste: 'Serveur',
        role: 'EMPLOYEE',
        statut: 'ACTIF'
      }
    });
    
    console.log('✅ Employé créé avec ID: ' + employe.id);
    return employe.id;
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

createTestEmployee();
  `;
  
  fs.writeFileSync('temp-create-employe.js', createEmployeScript);
  execSync('node temp-create-employe.js', { stdio: 'inherit' });
  fs.unlinkSync('temp-create-employe.js');

  // 2. Créer les shifts de test
  console.log('\n📅 2. Création des shifts de test...');
  
  const scenarios = [
    // Aujourd'hui - scénario normal
    {
      date: '2025-08-28',
      shifts: [{ start: '18:00', end: '22:00' }]
    },
    // Demain - scénario critique  
    {
      date: '2025-08-29',
      shifts: [
        { start: '12:00', end: '16:00' },
        { start: '19:00', end: '23:00' }
      ]
    },
    // Après-demain - scénario hors-plage
    {
      date: '2025-08-30',
      shifts: [{ start: '20:00', end: '00:00' }]
    }
  ];
  
  for (const scenario of scenarios) {
    for (const shift of scenario.shifts) {
      const createShiftScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createShift() {
  try {
    const employe = await prisma.employe.findUnique({
      where: { email: '${EMPLOYE_EMAIL}' }
    });
    
    if (!employe) {
      console.error('❌ Employé non trouvé');
      return;
    }
    
    const shift = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date('${scenario.date}'),
        type: 'présence',
        segments: {
          create: [{
            start: '${shift.start}',
            end: '${shift.end}',
            commentaire: 'Test automatique - ${scenario.date}'
          }]
        }
      },
      include: {
        segments: true
      }
    });
    
    console.log('✅ Shift créé: ${shift.start}-${shift.end} le ${scenario.date}');
    
  } catch (error) {
    console.error('❌ Erreur shift:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createShift();
      `;
      
      fs.writeFileSync('temp-create-shift.js', createShiftScript);
      execSync('node temp-create-shift.js', { stdio: 'inherit' });
      fs.unlinkSync('temp-create-shift.js');
    }
  }

  // 3. Créer les pointages de test
  console.log('\n📍 3. Création des pointages de test...');
  
  const pointages = [
    // 28/08 - Normal
    { date: '2025-08-28', type: 'IN', heure: '17:45' },
    { date: '2025-08-28', type: 'OUT', heure: '22:30' },
    
    // 29/08 - Critique
    { date: '2025-08-29', type: 'IN', heure: '12:25' },
    { date: '2025-08-29', type: 'OUT', heure: '15:30' },
    { date: '2025-08-29', type: 'IN', heure: '19:08' },
    { date: '2025-08-29', type: 'OUT', heure: '23:45' },
    
    // 30/08 - Hors-plage
    { date: '2025-08-30', type: 'IN', heure: '19:00' },
    { date: '2025-08-30', type: 'OUT', heure: '01:30' }, // Lendemain
  ];
  
  for (const pointage of pointages) {
    const createPointageScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPointage() {
  try {
    const employe = await prisma.employe.findUnique({
      where: { email: '${EMPLOYE_EMAIL}' }
    });
    
    if (!employe) {
      console.error('❌ Employé non trouvé');
      return;
    }
    
    let dateTime = new Date('${pointage.date}T${pointage.heure}:00.000Z');
    
    // Gestion passage minuit
    if ('${pointage.heure}'.startsWith('01:') || '${pointage.heure}'.startsWith('02:') || '${pointage.heure}'.startsWith('03:')) {
      dateTime.setDate(dateTime.getDate() + 1);
    }
    
    const p = await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: '${pointage.type}',
        horodatage: dateTime,
        methode: 'TEST_AUTO',
        statut: 'VALIDE'
      }
    });
    
    console.log('✅ Pointage ${pointage.type} créé: ${pointage.heure} le ${pointage.date}');
    
  } catch (error) {
    console.error('❌ Erreur pointage:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createPointage();
    `;
    
    fs.writeFileSync('temp-create-pointage.js', createPointageScript);
    execSync('node temp-create-pointage.js', { stdio: 'inherit' });
    fs.unlinkSync('temp-create-pointage.js');
  }

  console.log('\n🎯 INSTRUCTIONS POUR TESTER');
  console.log('==========================');
  console.log('');
  console.log('1️⃣ Démarrez le serveur:');
  console.log('   npm start');
  console.log('');
  console.log('2️⃣ Démarrez le client (autre terminal):');
  console.log('   cd ../client && npm start');
  console.log('');
  console.log('3️⃣ Connectez-vous avec:');
  console.log(`   📧 Email: ${EMPLOYE_EMAIL}`);
  console.log('   🔐 Mot de passe: 7704154915Ym@!!');
  console.log('');
  console.log('4️⃣ Dans le planning:');
  console.log('   • Activez "Comparaison Planning vs Réalité"');
  console.log('   • Regardez les dates 28, 29, 30 août 2025');
  console.log('   • Observez les badges colorés:');
  console.log('     📅 28/08: 🟢 Normal (acceptable)');
  console.log('     📅 29/08: 🔴🟡 Critique/Attention');
  console.log('     📅 30/08: 🟣 Hors-plage');
  console.log('');
  console.log('✅ DONNÉES DE TEST CRÉÉES AVEC SUCCÈS!');

} catch (error) {
  console.error('❌ Erreur lors de la création:', error.message);
}
