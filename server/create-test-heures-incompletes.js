/**
 * Script de test : Heures INCOMPLÈTES avec anomalies
 * Pour l'utilisateur Jordan (yjordan496@gmail.com)
 * 
 * Scénario : Journée de 8h prévue, mais seulement ~5h travaillées
 * - Shift planifié : 09:00 - 17:00 (8h)
 * - Pointages réels : 09:15 - 14:30 (départ anticipé)
 * - Anomalies : retard à l'arrivée + départ anticipé
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Trouver Jordan
  const jordan = await prisma.user.findUnique({
    where: { email: 'yjordan496@gmail.com' }
  });
  
  if (!jordan) {
    console.error('❌ Utilisateur Jordan non trouvé (yjordan496@gmail.com)');
    return;
  }
  
  console.log(`✅ Utilisateur trouvé : ${jordan.prenom} ${jordan.nom} (ID: ${jordan.id})`);
  
  // Supprimer les anciennes données de test pour aujourd'hui
  console.log('\n🧹 Nettoyage des données existantes pour aujourd\'hui...');
  
  const startOfDay = new Date(today);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Supprimer les anomalies d'aujourd'hui
  await prisma.anomalie.deleteMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  // Supprimer les pointages d'aujourd'hui
  await prisma.pointage.deleteMany({
    where: {
      userId: jordan.id,
      horodatage: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  // Supprimer les shifts d'aujourd'hui
  await prisma.shift.deleteMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  console.log('✅ Données nettoyées');
  
  // === CRÉER LE SHIFT PLANIFIÉ (8h de travail prévu) ===
  console.log('\n📅 Création du shift planifié (09:00 - 17:00)...');
  
  const shift = await prisma.shift.create({
    data: {
      employeId: jordan.id,
      date: today,
      type: 'travail',
      motif: null,
      segments: [
        {
          debut: '09:00',
          fin: '12:00',
          type: 'travail'
        },
        {
          debut: '12:00',
          fin: '13:00',
          type: 'pause'
        },
        {
          debut: '13:00',
          fin: '17:00',
          type: 'travail'
        }
      ],
      version: 1
    }
  });
  
  console.log(`✅ Shift créé (ID: ${shift.id})`);
  
  // === CRÉER LES POINTAGES (heures incomplètes) ===
  console.log('\n⏰ Création des pointages (arrivée en retard + départ anticipé)...');
  
  // Arrivée à 09:15 (15 min de retard)
  const arrivee = new Date(today);
  arrivee.setHours(9, 15, 0, 0);
  
  // Départ à 14:30 (départ anticipé, pas de retour après pause)
  const depart = new Date(today);
  depart.setHours(14, 30, 0, 0);
  
  const pointages = await prisma.pointage.createMany({
    data: [
      {
        userId: jordan.id,
        type: 'arrivee',
        horodatage: arrivee
      },
      {
        userId: jordan.id,
        type: 'depart',
        horodatage: depart
      }
    ]
  });
  
  console.log(`✅ ${pointages.count} pointages créés`);
  console.log(`   - Entrée : 09:15 (15 min de retard)`);
  console.log(`   - Sortie : 14:30 (départ anticipé de 2h30)`);
  console.log(`   - Heures travaillées : ~4h15 au lieu de 8h`);
  
  // === CRÉER LES ANOMALIES ===
  console.log('\n⚠️ Création des anomalies...');
  
  // Anomalie 1 : Retard à l'arrivée (en attente)
  const anomalieRetard = await prisma.anomalie.create({
    data: {
      employeId: jordan.id,
      date: today,
      type: 'retard',
      gravite: 'moyenne',
      description: 'Retard de 15 minutes à la prise de poste',
      details: {
        heurePrevue: '09:00',
        heureReelle: '09:15',
        ecartMinutes: 15
      },
      statut: 'en_attente',
      commentaire: null
    }
  });
  
  console.log(`✅ Anomalie retard créée (ID: ${anomalieRetard.id}) - Statut: en_attente`);
  
  // Anomalie 2 : Départ anticipé (en attente)
  const anomalieDepart = await prisma.anomalie.create({
    data: {
      employeId: jordan.id,
      date: today,
      type: 'depart_anticipe',
      gravite: 'haute',
      description: 'Départ anticipé de 2h30 avant la fin du shift',
      details: {
        heureFinPrevue: '17:00',
        heureDepart: '14:30',
        ecartMinutes: 150
      },
      statut: 'en_attente',
      commentaire: null
    }
  });
  
  console.log(`✅ Anomalie départ anticipé créée (ID: ${anomalieDepart.id}) - Statut: en_attente`);
  
  // Anomalie 3 : Heures manquantes (total journée)
  const anomalieHeures = await prisma.anomalie.create({
    data: {
      employeId: jordan.id,
      date: today,
      type: 'heures_manquantes',
      gravite: 'haute',
      description: 'Heures de travail incomplètes - 3h45 manquantes',
      details: {
        heuresPrevues: 8,
        heuresTravaillees: 4.25,
        heuresManquantes: 3.75
      },
      statut: 'en_attente',
      commentaire: null
    }
  });
  
  console.log(`✅ Anomalie heures manquantes créée (ID: ${anomalieHeures.id}) - Statut: en_attente`);
  
  // === RÉSUMÉ ===
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DU SCÉNARIO DE TEST');
  console.log('='.repeat(60));
  console.log(`👤 Employé : ${jordan.prenom} ${jordan.nom}`);
  console.log(`📧 Email : ${jordan.email}`);
  console.log(`🔑 Mot de passe : Test1234!`);
  console.log('');
  console.log('📅 Shift planifié :');
  console.log('   09:00 - 12:00 : Travail (3h)');
  console.log('   12:00 - 13:00 : Pause (1h)');
  console.log('   13:00 - 17:00 : Travail (4h)');
  console.log('   Total prévu : 8h de travail');
  console.log('');
  console.log('⏰ Pointages réels :');
  console.log('   09:15 : Entrée (15 min de retard)');
  console.log('   14:30 : Sortie (2h30 avant la fin)');
  console.log('   Total travaillé : ~4h15');
  console.log('');
  console.log('⚠️ Anomalies générées :');
  console.log('   1. Retard (15 min) - en_attente');
  console.log('   2. Départ anticipé (2h30) - en_attente');
  console.log('   3. Heures manquantes (3h45) - en_attente');
  console.log('');
  console.log('🎯 Ce que vous devriez voir sur la page Pointage :');
  console.log('   - Jauge à ~53% (4h15 sur 8h)');
  console.log('   - Barre rouge/orange (heures incomplètes)');
  console.log('   - Message "3h45 manquantes"');
  console.log('   - Timeline avec entrée 09:15 et sortie 14:30');
  console.log('   - 3 anomalies en attente');
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
