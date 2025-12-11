const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function createTestAnomalies() {
  console.log('🔧 Création d\'anomalies de test avec différents soldes journaliers...\n');
  
  // Chercher des employés
  const employes = await prisma.user.findMany({
    where: { role: 'employee' },
    take: 6
  });
  
  if (employes.length < 2) {
    console.log('❌ Pas assez d\'employés (minimum 2 requis)');
    return;
  }
  
  console.log('👥 Employés trouvés:', employes.map(e => `${e.prenom} ${e.nom}`).join(', '));
  
  const today = new Date();
  const createdAnomalies = [];
  
  // ========================================
  // CAS 1: Heures sup AVEC solde POSITIF
  // (employé a travaillé plus que prévu)
  // ========================================
  console.log('\n📗 CAS 1: Heures sup avec solde POSITIF');
  
  for (let i = 0; i < Math.min(3, employes.length); i++) {
    const emp = employes[i];
    const date = new Date(today);
    date.setDate(date.getDate() - (i + 1)); // Hier, avant-hier, etc.
    
    const shiftDate = new Date(date);
    shiftDate.setHours(0,0,0,0);
    
    // Vérifier si un shift existe déjà
    const existingShift = await prisma.shift.findFirst({
      where: {
        employeId: emp.id,
        date: shiftDate
      }
    });
    
    if (!existingShift) {
      await prisma.shift.create({
        data: {
          employeId: emp.id,
          date: shiftDate,
          type: 'travail',
          segments: [{ debut: '10:00', fin: '18:00' }]
        }
      });
    }
    
    // Créer un pointage avec PLUS d'heures (solde positif)
    const minutesExtra = 90 + Math.floor(Math.random() * 60); // Entre 1h30 et 2h30
    
    const anomalie = await prisma.anomalie.create({
      data: {
        employeId: emp.id,
        type: 'heures_supplementaires',
        date: shiftDate,
        gravite: 'info',
        statut: 'en_attente',
        description: `Heures supplémentaires: +${(minutesExtra/60).toFixed(2)}h - Solde journalier POSITIF`,
        heuresExtra: minutesExtra / 60,
        details: {
          minutesEcart: minutesExtra,
          heureReelleDebut: '09:30',
          heureReelleFin: '19:30',
          heurePrevueDebut: '10:00',
          heurePrevueFin: '18:00',
          tempsPlanifie: 480, // 8h en minutes
          tempsTravaille: 480 + minutesExtra, // 8h + extra
          soldeNet: minutesExtra, // POSITIF
          source: 'test_solde_positif'
        }
      }
    });
    
    createdAnomalies.push(anomalie);
    console.log(`  ✅ ${emp.prenom} ${emp.nom} - +${(minutesExtra/60).toFixed(2)}h (solde: +${minutesExtra} min)`);
  }
  
  // ========================================
  // CAS 2: "Heures sup" AVEC solde NÉGATIF
  // ========================================
  console.log('\n📕 CAS 2: Heures sup avec solde NÉGATIF (cas invalide)');
  
  // Utiliser les mêmes employés avec des dates différentes (il y a 15+ jours)
  for (let i = 0; i < Math.min(3, employes.length); i++) {
    const emp = employes[i];
    const date = new Date(today);
    date.setDate(date.getDate() - 15 - i); // Il y a 15, 16, 17 jours
    
    const shiftDate = new Date(date);
    shiftDate.setHours(0,0,0,0);
    
    // Vérifier si un shift existe déjà
    const existingShift = await prisma.shift.findFirst({
      where: {
        employeId: emp.id,
        date: shiftDate
      }
    });
    
    if (!existingShift) {
      await prisma.shift.create({
        data: {
          employeId: emp.id,
          date: shiftDate,
          type: 'travail',
          segments: [{ debut: '10:00', fin: '18:00' }]
        }
      });
    }
    
    // Scénario: Départ tardif MAIS gros retard => solde NÉGATIF
    const minutesRetard = 120 + Math.floor(Math.random() * 30); // Retard 2h à 2h30
    const minutesDepartTardif = 45 + Math.floor(Math.random() * 30); // Départ tardif 45min à 1h15
    const soldeNet = minutesDepartTardif - minutesRetard; // Négatif!
    
    const anomalie = await prisma.anomalie.create({
      data: {
        employeId: emp.id,
        type: 'heures_supplementaires',
        date: shiftDate,
        gravite: 'warning',
        statut: 'en_attente',
        description: `Départ tardif +${(minutesDepartTardif/60).toFixed(2)}h MAIS retard -${(minutesRetard/60).toFixed(2)}h - Solde NÉGATIF`,
        heuresExtra: minutesDepartTardif / 60,
        details: {
          minutesEcart: minutesDepartTardif,
          heureReelleDebut: '12:00',
          heureReelleFin: `18:${String(minutesDepartTardif).padStart(2,'0')}`,
          heurePrevueDebut: '10:00',
          heurePrevueFin: '18:00',
          tempsPlanifie: 480, // 8h
          tempsTravaille: 480 + soldeNet, // Moins que prévu
          soldeNet: soldeNet, // NÉGATIF (ex: -75)
          retardMinutes: minutesRetard,
          source: 'test_solde_negatif'
        }
      }
    });
    
    createdAnomalies.push(anomalie);
    console.log(`  ⚠️ ${emp.prenom} ${emp.nom} (${shiftDate.toLocaleDateString()}) - Départ +${(minutesDepartTardif/60).toFixed(2)}h mais retard -${(minutesRetard/60).toFixed(2)}h => solde: ${soldeNet} min`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RÉSUMÉ: ${createdAnomalies.length} anomalies créées`);
  console.log('='.repeat(60));
  console.log('\n🧪 Pour tester:');
  console.log('   1. Ouvrir une anomalie RÉCENTE → Solde POSITIF → Option "Payer en Extra" visible');
  console.log('   2. Ouvrir une anomalie ANCIENNE (il y a 15j) → Solde NÉGATIF → Option masquée');
  console.log('   3. Le bilan journalier affiche les heures prévues vs travaillées\n');
  
  await prisma.$disconnect();
}

createTestAnomalies().catch(console.error);
