const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 VÉRIFICATION DES TABLES');
  console.log('═══════════════════════════════════════════════════\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Vérifier les employés
  const employees = await prisma.user.findMany({
    where: { role: 'employee' },
    select: { id: true, email: true, nom: true, prenom: true }
  });
  
  console.log(`📊 EMPLOYÉS (${employees.length}):`);
  employees.forEach(emp => {
    console.log(`   - ${emp.prenom} ${emp.nom} (ID: ${emp.id})`);
  });

  // 2. Vérifier les pointages d'aujourd'hui
  console.log(`\n⏰ POINTAGES AUJOURD'HUI (${today.toLocaleDateString('fr-FR')}):`);
  
  const pointagesAujourdhui = await prisma.pointage.findMany({
    where: {
      horodatage: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      user: {
        select: { id: true, prenom: true, nom: true }
      }
    },
    orderBy: [
      { userId: 'asc' },
      { horodatage: 'asc' }
    ]
  });

  console.log(`   Total: ${pointagesAujourdhui.length} pointages\n`);
  
  // Grouper par utilisateur
  const pointagesParUser = {};
  pointagesAujourdhui.forEach(p => {
    if (!pointagesParUser[p.userId]) {
      pointagesParUser[p.userId] = {
        user: p.user,
        pointages: []
      };
    }
    pointagesParUser[p.userId].pointages.push(p);
  });

  Object.values(pointagesParUser).forEach(({ user, pointages }) => {
    console.log(`   👤 ${user.prenom} ${user.nom} (ID: ${user.id})`);
    pointages.forEach(p => {
      const heure = new Date(p.horodatage).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`      ${p.type === 'ENTRÉE' ? '🟢' : '🔴'} ${p.type} à ${heure} (DB: ${p.horodatage.toISOString()})`);
    });
  });

  // 3. Vérifier les plannings d'aujourd'hui
  console.log(`\n📅 PLANNINGS AUJOURD'HUI:`);
  
  const planningsAujourdhui = await prisma.planning.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      user: {
        select: { prenom: true, nom: true }
      }
    }
  });

  console.log(`   Total: ${planningsAujourdhui.length} plannings\n`);
  
  planningsAujourdhui.forEach(p => {
    const debut = new Date(p.heureDebut).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const fin = new Date(p.heureFin).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    console.log(`   📋 ${p.user.prenom} ${p.user.nom}: ${debut} - ${fin}`);
    console.log(`      Date DB: ${p.date.toISOString()}`);
  });

  // 4. Vérifier les congés actifs
  console.log(`\n🏖️ CONGÉS ACTIFS AUJOURD'HUI:`);
  
  const congesActifs = await prisma.conge.findMany({
    where: {
      statut: 'APPROUVÉ',
      dateDebut: { lte: tomorrow },
      dateFin: { gte: today }
    },
    include: {
      user: {
        select: { prenom: true, nom: true }
      }
    }
  });

  console.log(`   Total: ${congesActifs.length} congés\n`);
  
  congesActifs.forEach(c => {
    console.log(`   🏖️ ${c.user.prenom} ${c.user.nom}: ${c.dateDebut.toLocaleDateString('fr-FR')} - ${c.dateFin.toLocaleDateString('fr-FR')}`);
  });

  // 5. Vérifier les anomalies
  console.log(`\n⚠️ ANOMALIES:`);
  const anomalies = await prisma.anomalie.count();
  console.log(`   Total anomalies dans la base: ${anomalies}`);

  console.log('\n═══════════════════════════════════════════════════\n');
  
  await prisma.$disconnect();
}

checkTables().catch(console.error);
