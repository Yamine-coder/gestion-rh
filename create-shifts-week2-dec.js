    const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('📡 Connecté à la base de données');
    
    // Trouver Léa Garcia
    const lea = await prisma.user.findFirst({
      where: { 
        nom: 'Garcia',
        prenom: { contains: 'Léa' }
      }
    });
    
    if (!lea) {
      console.log('❌ Léa Garcia non trouvée');
      await prisma.$disconnect();
      process.exit(1);
    }
    
    console.log('👤 Léa Garcia trouvée - ID:', lea.id);
    console.log('\n📅 Création des plannings et pointages pour la semaine du 8-14 décembre 2025\n');
    
    // Semaine du 8 au 14 décembre 2025
    const scenarios = [
      {
        date: '2025-12-08',
        jour: 'Lundi',
        planning: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ],
        pointages: [
          { arrivee: '08:45', depart: '13:00' }, // 15min d'avance le matin
          { arrivee: '14:00', depart: '18:30' }  // 30min d'heures sup le soir
        ]
      },
      {
        date: '2025-12-09',
        jour: 'Mardi',
        planning: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ],
        pointages: [
          { arrivee: '09:15', depart: '13:00' }, // 15min de retard le matin
          { arrivee: '14:00', depart: '17:45' }  // 15min de départ anticipé le soir
        ]
      },
      {
        date: '2025-12-10',
        jour: 'Mercredi',
        planning: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ],
        pointages: [
          { arrivee: '09:00', depart: '13:00' }, // Parfait le matin
          { arrivee: '14:00', depart: '19:00' }  // 1h d'heures sup le soir
        ]
      },
      {
        date: '2025-12-11',
        jour: 'Jeudi',
        planning: [
          { start: '10:00', end: '14:00' },
          { start: '15:00', end: '19:00' }
        ],
        pointages: [
          { arrivee: '10:30', depart: '14:00' }, // 30min de retard le matin
          { arrivee: '15:00', depart: '19:00' }  // Parfait l'après-midi
        ]
      },
      {
        date: '2025-12-12',
        jour: 'Vendredi',
        planning: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '17:00' }
        ],
        pointages: [
          { arrivee: '09:00', depart: '13:30' }, // 30min d'heures sup le matin
          { arrivee: '14:00', depart: '17:00' }  // Parfait l'après-midi
        ]
      },
      {
        date: '2025-12-13',
        jour: 'Samedi',
        planning: [
          { start: '10:00', end: '16:00' }
        ],
        pointages: [
          { arrivee: '10:00', depart: '16:15' }  // 15min d'heures sup
        ]
      },
      {
        date: '2025-12-14',
        jour: 'Dimanche',
        planning: [
          { start: '14:00', end: '18:00' }
        ],
        pointages: [
          { arrivee: '14:10', depart: '18:00' }  // 10min de retard
        ]
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n${scenario.jour} ${scenario.date}:`);
      
      // Supprimer les données existantes
      await prisma.shift.deleteMany({ 
        where: { 
          employeId: lea.id, 
          date: new Date(scenario.date) 
        } 
      });
      // Supprimer les pointages (arrivee et depart)
      const startDate = new Date(`${scenario.date}T00:00:00Z`);
      startDate.setUTCDate(startDate.getUTCDate() - 1); // Marge J-1
      const endDate = new Date(`${scenario.date}T23:59:59Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1); // Marge J+1
      
      await prisma.pointage.deleteMany({ 
        where: { 
          userId: lea.id,
          horodatage: {
            gte: startDate,
            lt: endDate
          }
        } 
      });
      
      // Créer le planning
      const shift = await prisma.shift.create({
        data: {
          employeId: lea.id,
          date: new Date(scenario.date),
          type: 'présence',
          segments: scenario.planning
        }
      });
      console.log('  ✅ Planning créé:', scenario.planning.map(s => `${s.start}-${s.end}`).join(' | '));
      
      // Créer les pointages (heure locale Paris)
      for (const [index, pointage] of scenario.pointages.entries()) {
        // Arrivée - utiliser le format ISO avec timezone
        const arrDateTime = `${scenario.date}T${pointage.arrivee}:00+01:00`; // Paris en hiver = UTC+1
        
        await prisma.pointage.create({
          data: {
            userId: lea.id,
            type: 'arrivee',
            horodatage: new Date(arrDateTime)
          }
        });
        
        // Départ - utiliser le format ISO avec timezone
        const depDateTime = `${scenario.date}T${pointage.depart}:00+01:00`; // Paris en hiver = UTC+1
        
        await prisma.pointage.create({
          data: {
            userId: lea.id,
            type: 'depart',
            horodatage: new Date(depDateTime)
          }
        });
        console.log(`  📍 Pointage segment ${index}:`, `${pointage.arrivee}-${pointage.depart} (UTC: ${new Date(arrDateTime).toISOString()} → ${new Date(depDateTime).toISOString()})`);
      }
    }
    
    console.log('\n✅ Tous les plannings et pointages de la semaine 2 créés avec succès!');
    console.log('\n📊 Résumé:');
    console.log('  • Lundi 8: Avance matin + Heures sup soir');
    console.log('  • Mardi 9: Retard matin + Départ anticipé soir');
    console.log('  • Mercredi 10: Parfait matin + 1h heures sup soir');
    console.log('  • Jeudi 11: 30min retard matin + Parfait après-midi');
    console.log('  • Vendredi 12: 30min heures sup matin + Parfait après-midi');
    console.log('  • Samedi 13: 15min heures sup');
    console.log('  • Dimanche 14: 10min retard');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
