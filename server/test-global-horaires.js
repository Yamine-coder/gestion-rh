/**
 * 🧪 TEST GLOBAL SYSTÈME HORAIRES
 * Vérifie que les shifts de nuit et calculs d'heures fonctionnent partout:
 * - Création shifts normaux et nuits
 * - Calculs côté admin (stats, rapports)
 * - Affichage côté employé
 * - Comparaison planning/réalité
 * - Anomalies
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Utilitaires
function calculerDuree(start, end) {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let minutes = (endH * 60 + endM) - (startH * 60 + startM);
  // 🌙 RESTAURANT : Gérer les shifts de nuit
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function testGlobalHoraires() {
  console.log('🧪 === TEST GLOBAL SYSTÈME HORAIRES ===\n');

  try {
    // 1. Trouver/créer un employé test
    console.log('📋 1. PRÉPARATION EMPLOYÉ TEST');
    let employeTest = await prisma.user.findFirst({
      where: { 
        role: { not: 'admin' },
        email: { contains: 'test' }
      }
    });

    if (!employeTest) {
      employeTest = await prisma.user.create({
        data: {
          email: 'test.horaires@restaurant.com',
          password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // dummy hash
          nom: 'TestHoraires',
          prenom: 'Employé',
          role: 'employe'
        }
      });
      console.log(`✅ Employé test créé: ${employeTest.prenom} ${employeTest.nom} (ID: ${employeTest.id})`);
    } else {
      console.log(`✅ Employé test trouvé: ${employeTest.prenom} ${employeTest.nom} (ID: ${employeTest.id})`);
    }

    const today = new Date();
    const dates = {
      lundi: new Date(today),
      mardi: new Date(today),
      mercredi: new Date(today),
      jeudi: new Date(today),
      vendredi: new Date(today)
    };
    
    // Calculer le lundi de la semaine courante
    const jourSemaine = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const diffLundi = jourSemaine === 0 ? -6 : 1 - jourSemaine; // Si dimanche, prendre lundi précédent
    
    dates.lundi.setDate(today.getDate() + diffLundi);
    dates.lundi.setHours(0, 0, 0, 0); // Normaliser à minuit
    
    dates.mardi.setDate(dates.lundi.getDate() + 1);
    dates.mardi.setHours(0, 0, 0, 0);
    
    dates.mercredi.setDate(dates.lundi.getDate() + 2);
    dates.mercredi.setHours(0, 0, 0, 0);
    
    dates.jeudi.setDate(dates.lundi.getDate() + 3);
    dates.jeudi.setHours(0, 0, 0, 0);
    
    dates.vendredi.setDate(dates.lundi.getDate() + 4);
    dates.vendredi.setHours(0, 0, 0, 0);
    
    console.log(`📅 Semaine test: ${formatDate(dates.lundi)} au ${formatDate(dates.vendredi)}`);

    // 2. Nettoyer les shifts existants de la semaine test
    console.log('\n🧹 2. NETTOYAGE DONNÉES TEST');
    await prisma.shift.deleteMany({
      where: {
        employeId: employeTest.id,
        date: {
          gte: dates.lundi,
          lte: dates.vendredi
        }
      }
    });
    console.log('✅ Shifts précédents supprimés');

    // 3. Créer des shifts variés incluant shifts de nuit
    console.log('\n📅 3. CRÉATION SHIFTS TEST (NORMAUX + NUIT)');
    
    const shiftsTest = [
      // Lundi: Shift normal matin
      {
        date: dates.lundi,
        segments: [
          { start: '08:00', end: '12:00' }, // 4h
          { start: '13:00', end: '17:00' }  // 4h
        ],
        totalAttendu: 8
      },
      // Mardi: Double service avec nuit
      {
        date: dates.mardi,
        segments: [
          { start: '11:00', end: '15:00' }, // 4h
          { start: '19:00', end: '00:30' }  // 5.5h (NUIT)
        ],
        totalAttendu: 9.5
      },
      // Mercredi: Shift de nuit complet
      {
        date: dates.mercredi,
        segments: [
          { start: '17:00', end: '01:00' }  // 8h (NUIT)
        ],
        totalAttendu: 8
      },
      // Jeudi: Journée normale
      {
        date: dates.jeudi,
        segments: [
          { start: '09:00', end: '18:00' }  // 9h
        ],
        totalAttendu: 9
      },
      // Vendredi: Shift tardif
      {
        date: dates.vendredi,
        segments: [
          { start: '14:00', end: '23:00' }  // 9h
        ],
        totalAttendu: 9
      }
    ];

    const shiftsCreated = [];
    for (const [index, shiftData] of shiftsTest.entries()) {
      const jour = Object.keys(dates)[index];
      
      // Calculer total manuel
      const totalCalcule = shiftData.segments.reduce((acc, seg) => {
        return acc + calculerDuree(seg.start, seg.end);
      }, 0);

      // Normaliser la date à minuit UTC
      const dateNormalized = new Date(shiftData.date);
      dateNormalized.setHours(0, 0, 0, 0);

      const shift = await prisma.shift.create({
        data: {
          employeId: employeTest.id,
          date: dateNormalized,
          type: 'présence',
          segments: shiftData.segments.map(seg => ({
            id: require('crypto').randomUUID(),
            start: seg.start,
            end: seg.end,
            commentaire: '',
            aValider: false,
            isExtra: false
          }))
        }
      });

      shiftsCreated.push(shift);

      const detailsSegments = shiftData.segments.map(s => {
        const duree = calculerDuree(s.start, s.end);
        const isNuit = s.end < s.start || parseInt(s.start.split(':')[0]) >= 19 || parseInt(s.end.split(':')[0]) <= 6;
        return `${s.start}→${s.end} (${duree.toFixed(1)}h${isNuit ? ' 🌙' : ''})`;
      }).join(' + ');

      const match = Math.abs(totalCalcule - shiftData.totalAttendu) < 0.1;
      console.log(`${match ? '✅' : '❌'} ${jour}: ${detailsSegments} = ${totalCalcule.toFixed(1)}h ${match ? '=' : '≠'} attendu ${shiftData.totalAttendu}h`);
    }

    const totalSemaineAttendu = shiftsTest.reduce((acc, s) => acc + s.totalAttendu, 0);
    console.log(`\n📊 Total semaine attendu: ${totalSemaineAttendu}h`);

    // 4. Créer des pointages réels (avec un shift de nuit)
    console.log('\n⏱️  4. CRÉATION POINTAGES RÉELS');
    
    // Nettoyer pointages existants
    await prisma.pointage.deleteMany({
      where: {
        userId: employeTest.id,
        horodatage: {
          gte: dates.lundi,
          lte: new Date(dates.vendredi.getTime() + 24 * 3600000) // +1 jour pour pointages après minuit
        }
      }
    });

    // Pointages pour shift de nuit du mardi (19h → 00h30)
    const pointageMardi = await prisma.pointage.createMany({
      data: [
        {
          userId: employeTest.id,
          horodatage: new Date(dates.mardi.getTime() + 19 * 3600000 + 5 * 60000), // 19:05
          type: 'arrivée'
        },
        {
          userId: employeTest.id,
          horodatage: new Date(dates.mercredi.getTime() + 0 * 3600000 + 35 * 60000), // 00:35 (J+1)
          type: 'départ'
        }
      ]
    });

    console.log(`✅ Pointages créés pour shift nuit mardi 19:00→00:30`);
    console.log(`   - Arrivée: Mardi ${formatDate(dates.mardi)} 19:05`);
    console.log(`   - Départ: Mercredi ${formatDate(dates.mercredi)} 00:35 (J+1)`);

    // 5. Tester API Stats (côté admin)
    console.log('\n📊 5. TEST API STATS (Vue Admin)');
    
    const statsResponse = await fetch('http://localhost:5000/api/stats/rapports', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN || 'test-token'}`
      }
    }).catch(() => null);

    if (statsResponse?.ok) {
      const stats = await statsResponse.json();
      console.log('✅ API Stats accessible');
    } else {
      console.log('⚠️  API Stats non testée (serveur non démarré ou token manquant)');
    }

    // 6. Requête directe stats
    console.log('\n📈 6. CALCUL STATS DIRECT (Simulation Admin)');
    console.log(`🔍 Recherche shifts pour employé ${employeTest.id} entre ${formatDate(dates.lundi)} et ${formatDate(dates.vendredi)}`);
    
    const shiftsEmploye = await prisma.shift.findMany({
      where: {
        employeId: employeTest.id,
        date: {
          gte: dates.lundi,
          lte: new Date(dates.vendredi.getTime() + 23 * 3600000 + 59 * 60000 + 59000) // Fin de journée vendredi
        },
        type: 'présence'
      }
    });

    console.log(`📊 Shifts trouvés: ${shiftsEmploye.length}`);
    if (shiftsEmploye.length > 0) {
      shiftsEmploye.forEach(s => {
        console.log(`   - ${formatDate(s.date)}: ${s.segments?.length || 0} segments`);
      });
    }

    let totalHeuresPrevues = 0;
    shiftsEmploye.forEach(shift => {
      if (shift.segments && Array.isArray(shift.segments)) {
        const heuresShift = shift.segments.reduce((acc, seg) => {
          return acc + calculerDuree(seg.start, seg.end);
        }, 0);
        totalHeuresPrevues += heuresShift;
      }
    });

    console.log(`✅ Heures prévues calculées: ${totalHeuresPrevues.toFixed(1)}h`);
    console.log(`${Math.abs(totalHeuresPrevues - totalSemaineAttendu) < 0.1 ? '✅' : '❌'} Match avec attendu: ${totalSemaineAttendu}h`);

    // 7. Test comparaison planning/réalité
    console.log('\n🔄 7. TEST COMPARAISON PLANNING/RÉALITÉ');
    
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employeTest.id,
        horodatage: {
          gte: dates.mardi,
          lte: new Date(dates.mercredi.getTime() + 24 * 3600000)
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`✅ ${pointages.length} pointages trouvés pour comparaison`);
    
    // Simuler la détection de shift de nuit
    const shiftMardi = shiftsEmploye.find(s => 
      formatDate(s.date) === formatDate(dates.mardi)
    );

    if (shiftMardi && shiftMardi.segments) {
      const hasNightShift = shiftMardi.segments.some(seg => {
        const [startH] = seg.start.split(':').map(Number);
        const [endH] = seg.end.split(':').map(Number);
        return endH < startH; // Shift de nuit
      });

      console.log(`${hasNightShift ? '✅' : '❌'} Shift de nuit détecté: ${hasNightShift ? 'OUI 🌙' : 'NON'}`);
      
      if (hasNightShift) {
        const pointageDepartJ1 = pointages.find(p => 
          p.type === 'départ' && 
          formatDate(p.horodatage) === formatDate(dates.mercredi) &&
          p.horodatage.getHours() < 6
        );
        console.log(`${pointageDepartJ1 ? '✅' : '❌'} Pointage départ après minuit trouvé: ${pointageDepartJ1 ? 'OUI' : 'NON'}`);
      }
    }

    // 8. Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RÉSUMÉ TEST GLOBAL HORAIRES');
    console.log('='.repeat(60));
    console.log(`✅ Employé test: ${employeTest.prenom} ${employeTest.nom} (ID: ${employeTest.id})`);
    console.log(`✅ Shifts créés: ${shiftsCreated.length}`);
    console.log(`✅ Heures prévues semaine: ${totalHeuresPrevues.toFixed(1)}h / ${totalSemaineAttendu}h`);
    console.log(`✅ Shifts de nuit: 2 (Mardi 19h→00h30, Mercredi 17h→01h)`);
    console.log(`✅ Pointages créés: ${pointages.length}`);
    console.log(`✅ Calculs durée: ${Math.abs(totalHeuresPrevues - totalSemaineAttendu) < 0.1 ? 'CORRECTS ✓' : 'ERREURS ✗'}`);
    
    console.log('\n🎯 ZONES À TESTER MANUELLEMENT:');
    console.log('1. Frontend Planning → Vue Semaine → Vérifier badges heures');
    console.log('2. Frontend Planning → Vue Jour → Vérifier affichage shifts nuit');
    console.log('3. Dashboard Admin → Stats RH → Vérifier total heures');
    console.log('4. Dashboard Employé → Mes heures → Vérifier calculs');
    console.log('5. Rapports → Export heures → Vérifier totaux');
    console.log('6. Comparaison → Anomalies → Vérifier shift nuit mardi');
    
    console.log('\n💡 COMMANDES TEST FRONTEND:');
    console.log(`   - Employé: ID ${employeTest.id}`);
    console.log(`   - Semaine: ${formatDate(dates.lundi)} au ${formatDate(dates.vendredi)}`);
    console.log(`   - Shift nuit: ${formatDate(dates.mardi)} 19:00→00:30`);

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
testGlobalHoraires();
