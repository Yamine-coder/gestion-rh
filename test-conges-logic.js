const prisma = require('./server/prisma/client');

async function test() {
  console.log('=== TEST LOGIQUE CONGÉS/SHIFTS ===\n');
  
  // Récupérer tous les congés
  const conges = await prisma.conge.findMany({
    include: { user: { select: { prenom: true, nom: true } } }
  });
  
  console.log('📋 Congés existants:');
  conges.forEach(c => {
    const emoji = c.statut === 'approuve' ? '🚫' : c.statut === 'en_attente' ? '⚠️' : '✅';
    console.log(`  ${emoji} ${c.user?.prenom} ${c.user?.nom}: ${c.type} du ${c.dateDebut.toISOString().slice(0,10)} au ${c.dateFin.toISOString().slice(0,10)} - Statut: ${c.statut}`);
  });
  
  console.log('\n📌 Comportement attendu côté Admin (Planning RH):');
  console.log('  🚫 Approuvé → BLOQUER la création de shift');
  console.log('  ⚠️ En attente → AVERTIR mais permettre la création');
  console.log('  ✅ Refusé → Création NORMALE');
  
  console.log('\n📌 Comportement attendu côté Employé (Mon Planning):');
  console.log('  🚫 Approuvé → Shift barré "Absent"');
  console.log('  ⚠️ En attente → Shift affiché normalement');
  console.log('  ✅ Refusé → Shift affiché normalement');
  
  // Créer un congé en_attente pour tester
  console.log('\n🔧 Création d\'un congé EN ATTENTE pour test...');
  
  const existingPending = await prisma.conge.findFirst({
    where: { statut: 'en_attente' }
  });
  
  if (!existingPending) {
    // Trouver un employé
    const employe = await prisma.user.findFirst({
      where: { role: 'employe' }
    });
    
    if (employe) {
      await prisma.conge.create({
        data: {
          userId: employe.id,
          type: 'RTT',
          dateDebut: new Date('2025-12-10'),
          dateFin: new Date('2025-12-10'),
          statut: 'en_attente',
          motif: 'Test congé en attente'
        }
      });
      console.log(`  ✅ Congé EN ATTENTE créé pour ${employe.prenom} ${employe.nom} le 10/12/2025`);
    }
  } else {
    console.log(`  ℹ️ Congé en attente existant pour user ${existingPending.userId}`);
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
