const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addRealisticPointages() {
  try {
    console.log('⏰ AJOUT DE POINTAGES RÉALISTES');
    console.log('===============================\n');

    // Supprimer tous les pointages existants
    console.log('🗑️ Suppression des pointages existants...');
    await prisma.pointage.deleteMany({});
    console.log('✅ Pointages supprimés\n');

    // Récupérer tous les employés (sauf admin)
    const employes = await prisma.user.findMany({
      where: { role: 'employee' }
    });

    console.log('👥 Création de pointages pour:');
    employes.forEach(emp => {
      console.log(`   - ${emp.prenom} ${emp.nom} (${emp.email})`);
    });
    console.log('');

    // Créer des pointages pour les 7 derniers jours
    const today = new Date();
    let totalPointages = 0;

    for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - dayOffset);
      const dayOfWeek = date.getDay();
      
      // Pas de travail le dimanche
      if (dayOfWeek === 0) continue;

      const dateStr = date.toISOString().split('T')[0];
      console.log(`📅 Jour ${dateStr} (${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dayOfWeek]}):`);

      for (const employe of employes) {
        // Récupérer le shift prévu pour ce jour
        const shift = await prisma.shift.findFirst({
          where: {
            employeId: employe.id,
            date: {
              gte: new Date(dateStr + 'T00:00:00.000Z'),
              lt: new Date(dateStr + 'T23:59:59.999Z')
            }
          }
        });

        if (!shift || !shift.segments) {
          console.log(`     ❌ ${employe.prenom}: Pas de shift programmé`);
          continue;
        }

        const segments = shift.segments;
        console.log(`     👤 ${employe.prenom} ${employe.nom}: ${segments.length} segment(s)`);

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          
          // POINTAGE D'ARRIVÉE
          const heureArriveePrevu = new Date(dateStr + 'T' + segment.start + ':00.000Z');
          
          // Variation réaliste pour l'arrivée (-10 à +20 minutes)
          const variationArrivee = (Math.random() - 0.3) * 30; // Favorise légèrement les retards
          const heureArriveeReelle = new Date(heureArriveePrevu.getTime() + variationArrivee * 60000);
          
          // Déterminer le type d'arrivée
          let typeArrivee = 'arrivee';
          const ecartArrivee = Math.round(variationArrivee);
          
          if (ecartArrivee > 15) {
            typeArrivee = 'retard_critique';
          } else if (ecartArrivee > 5) {
            typeArrivee = 'retard';
          } else if (ecartArrivee < -10) {
            typeArrivee = 'arrivee_matinale';
          }

          const pointageArrivee = await prisma.pointage.create({
            data: {
              type: typeArrivee,
              horodatage: heureArriveeReelle,
              userId: employe.id
            }
          });
          totalPointages++;

          console.log(`       ⬇️  ${segment.start} → ${heureArriveeReelle.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})} (${typeArrivee}${ecartArrivee !== 0 ? `, ${ecartArrivee > 0 ? '+' : ''}${ecartArrivee}min` : ''})`);

          // POINTAGE DE DÉPART
          let heureDepartPrevu = new Date(dateStr + 'T' + segment.end + ':00.000Z');
          
          // Si c'est le lendemain (ex: 02:00), ajuster la date
          if (segment.end.startsWith('0') && parseInt(segment.end.split(':')[0]) <= 6) {
            heureDepartPrevu.setDate(heureDepartPrevu.getDate() + 1);
          }
          
          // Variation réaliste pour le départ (-30 à +15 minutes)
          const variationDepart = (Math.random() - 0.7) * 45; // Favorise les départs anticipés
          const heureDepartReelle = new Date(heureDepartPrevu.getTime() + variationDepart * 60000);
          
          // Déterminer le type de départ
          let typeDepart = 'depart';
          const ecartDepart = Math.round(variationDepart);
          
          if (ecartDepart < -20) {
            typeDepart = 'depart_premature_critique';
          } else if (ecartDepart < -10) {
            typeDepart = 'depart_premature';
          } else if (ecartDepart > 30) {
            typeDepart = 'depart_tardif';
          }

          const pointageDepart = await prisma.pointage.create({
            data: {
              type: typeDepart,
              horodatage: heureDepartReelle,
              userId: employe.id
            }
          });
          totalPointages++;

          console.log(`       ⬆️  ${segment.end} → ${heureDepartReelle.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})} (${typeDepart}${ecartDepart !== 0 ? `, ${ecartDepart > 0 ? '+' : ''}${ecartDepart}min` : ''})`);
        }
      }
      console.log('');
    }

    // Ajouter quelques pointages "hors plage"
    console.log('🚨 Ajout de pointages hors plage pour tests...');
    
    const moussTest = employes.find(e => e.email.includes('mouss.test'));
    if (moussTest) {
      // Pointage très matinal hors plage (le 28/08 à 05:30)
      const dateHorsPlage = new Date(today);
      dateHorsPlage.setDate(today.getDate() - 2); // Il y a 2 jours
      dateHorsPlage.setHours(5, 30, 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'hors_plage_in',
          horodatage: dateHorsPlage,
          userId: moussTest.id
        }
      });
      totalPointages++;
      
      console.log(`   🔥 Mouss Test: Pointage hors plage le ${dateHorsPlage.toLocaleDateString('fr-FR')} à 05:30`);
    }

    // Quelques pointages de présence non prévue
    const marieMartin = employes.find(e => e.email.includes('marie.martin'));
    if (marieMartin) {
      const datePresenceNonPrevue = new Date(today);
      datePresenceNonPrevue.setDate(today.getDate() - 3); // Il y a 3 jours
      datePresenceNonPrevue.setHours(14, 30, 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'presence_non_prevue',
          horodatage: datePresenceNonPrevue,
          userId: marieMartin.id
        }
      });
      totalPointages++;
      
      console.log(`   ✨ Marie Martin: Présence non prévue le ${datePresenceNonPrevue.toLocaleDateString('fr-FR')} à 14:30`);
    }

    console.log(`\n✅ Total de ${totalPointages} pointages créés !`);

    // Vérification
    console.log('\n📊 RÉSUMÉ PAR TYPE DE POINTAGE:');
    const pointagesByType = await prisma.pointage.groupBy({
      by: ['type'],
      _count: { id: true },
      orderBy: { type: 'asc' }
    });

    pointagesByType.forEach(group => {
      const icon = group.type.includes('arrivee') ? '⬇️' : 
                  group.type.includes('depart') ? '⬆️' : 
                  group.type.includes('retard') ? '🟡' : 
                  group.type.includes('hors_plage') ? '🔥' : 
                  group.type.includes('presence_non_prevue') ? '✨' : '📍';
      console.log(`   ${icon} ${group.type}: ${group._count.id}`);
    });

    console.log('\n🎉 Pointages réalistes créés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des pointages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRealisticPointages();
