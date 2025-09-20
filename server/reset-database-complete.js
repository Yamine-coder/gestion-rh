const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function resetDatabaseComplete() {
  try {
    console.log('🔄 RESET COMPLET DE LA BASE DE DONNÉES');
    console.log('=====================================\n');

    // 1. NETTOYAGE COMPLET (dans l'ordre des dépendances)
    console.log('🗑️ Étape 1: Nettoyage complet...');
    
    console.log('   - Suppression des ExtraPaymentLog...');
    await prisma.extraPaymentLog.deleteMany({});
    
    console.log('   - Suppression des Anomalies...');
    await prisma.anomalie.deleteMany({});
    
    console.log('   - Suppression des Shifts...');
    await prisma.shift.deleteMany({});
    
    console.log('   - Suppression des Pointages...');
    await prisma.pointage.deleteMany({});
    
    console.log('   - Suppression des Plannings...');
    await prisma.planning.deleteMany({});
    
    console.log('   - Suppression des Congés...');
    await prisma.conge.deleteMany({});
    
    console.log('   - Suppression des PasswordReset...');
    await prisma.passwordReset.deleteMany({});
    
    console.log('   - Suppression des Users...');
    await prisma.user.deleteMany({});
    
    console.log('✅ Base de données nettoyée\n');

    // 2. CRÉATION DES UTILISATEURS
    console.log('👥 Étape 2: Création des utilisateurs...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@gestion-rh.fr',
        password: hashedPassword,
        role: 'admin',
        nom: 'Admin',
        prenom: 'Système',
        telephone: '0123456789',
        categorie: 'Direction',
        dateEmbauche: new Date('2020-01-01'),
        firstLoginDone: true,
        statut: 'actif'
      }
    });
    console.log(`   ✅ Admin créé: ${admin.email}`);

    // Employés de test
    const employes = [];
    
    const employesData = [
      {
        email: 'mouss.test@gestion-rh.fr',
        nom: 'Test',
        prenom: 'Mouss',
        telephone: '0123456790',
        categorie: 'Service',
        dateEmbauche: new Date('2022-03-15')
      },
      {
        email: 'marie.martin@gestion-rh.fr', 
        nom: 'Martin',
        prenom: 'Marie',
        telephone: '0123456791',
        categorie: 'Cuisine',
        dateEmbauche: new Date('2021-06-01')
      },
      {
        email: 'paul.durand@gestion-rh.fr',
        nom: 'Durand', 
        prenom: 'Paul',
        telephone: '0123456792',
        categorie: 'Bar',
        dateEmbauche: new Date('2021-09-15')
      },
      {
        email: 'sophie.bernard@gestion-rh.fr',
        nom: 'Bernard',
        prenom: 'Sophie', 
        telephone: '0123456793',
        categorie: 'Service',
        dateEmbauche: new Date('2023-01-10')
      },
      {
        email: 'lucas.petit@gestion-rh.fr',
        nom: 'Petit',
        prenom: 'Lucas',
        telephone: '0123456794', 
        categorie: 'Cuisine',
        dateEmbauche: new Date('2022-11-20')
      }
    ];

    for (const empData of employesData) {
      const employe = await prisma.user.create({
        data: {
          ...empData,
          password: hashedPassword,
          role: 'employee',
          firstLoginDone: true,
          statut: 'actif'
        }
      });
      employes.push(employe);
      console.log(`   ✅ Employé créé: ${employe.prenom} ${employe.nom} (${employe.email})`);
    }

    console.log(`✅ ${employes.length + 1} utilisateurs créés\n`);

    // 3. CRÉATION DES SHIFTS DE BASE
    console.log('📅 Étape 3: Création des shifts...');
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7); // Semaine dernière
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7); // Semaine prochaine
    
    let shiftsCreated = 0;
    
    // Créer des shifts pour chaque employé sur 2 semaines
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); // 0 = dimanche, 6 = samedi
      
      // Pas de travail le dimanche par défaut
      if (dayOfWeek === 0) continue;
      
      for (const employe of employes) {
        // Différents types de shifts selon la catégorie et le jour
        let segments = [];
        
        if (employe.categorie === 'Cuisine') {
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lun-Ven
            segments = [
              { start: '06:00', end: '14:00', isExtra: false, commentaire: 'Service matin' },
              { start: '18:00', end: '23:00', isExtra: false, commentaire: 'Service soir' }
            ];
          } else { // Weekend
            segments = [
              { start: '10:00', end: '15:00', isExtra: false, commentaire: 'Service déjeuner' },
              { start: '18:00', end: '00:00', isExtra: false, commentaire: 'Service dîner' }
            ];
          }
        } else if (employe.categorie === 'Service') {
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lun-Ven
            segments = [
              { start: '11:30', end: '15:00', isExtra: false, commentaire: 'Service déjeuner' },
              { start: '19:00', end: '23:30', isExtra: false, commentaire: 'Service dîner' }
            ];
          } else { // Weekend  
            segments = [
              { start: '11:00', end: '16:00', isExtra: false, commentaire: 'Service déjeuner' },
              { start: '19:00', end: '00:30', isExtra: false, commentaire: 'Service dîner' }
            ];
          }
        } else if (employe.categorie === 'Bar') {
          segments = [
            { start: '17:00', end: '02:00', isExtra: false, commentaire: 'Service bar' }
          ];
        }
        
        // Créer le shift avec segments
        if (segments.length > 0) {
          await prisma.shift.create({
            data: {
              employeId: employe.id,
              date: new Date(dateStr + 'T00:00:00.000Z'),
              type: 'présence',
              segments: segments
            }
          });
          shiftsCreated++;
        }
      }
    }
    
    console.log(`✅ ${shiftsCreated} shifts créés\n`);

    // 4. CRÉATION DES POINTAGES RÉALISTES
    console.log('⏰ Étape 4: Création des pointages...');
    
    let pointagesCreated = 0;
    
    // Créer des pointages pour les 7 derniers jours
    const pointageStartDate = new Date(today);
    pointageStartDate.setDate(today.getDate() - 7);
    
    for (let d = new Date(pointageStartDate); d < today; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) continue; // Pas le dimanche
      
      for (const employe of employes) {
        // Récupérer le shift prévu pour ce jour
        const shift = await prisma.shift.findFirst({
          where: {
            employeId: employe.id,
            date: {
              gte: new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z'),
              lt: new Date(d.toISOString().split('T')[0] + 'T23:59:59.999Z')
            }
          }
        });
        
        if (shift && shift.segments) {
          const segments = shift.segments;
          
          for (const segment of segments) {
            // Pointage d'entrée (avec variations réalistes)
            const entreePrevu = new Date(d.toISOString().split('T')[0] + 'T' + segment.start + ':00.000Z');
            const variationEntree = (Math.random() - 0.5) * 30; // +/- 15 min
            const entreeReel = new Date(entreePrevu.getTime() + variationEntree * 60000);
            
            await prisma.pointage.create({
              data: {
                type: 'in',
                horodatage: entreeReel,
                userId: employe.id
              }
            });
            pointagesCreated++;
            
            // Pointage de sortie (avec variations réalistes)
            const sortiePrevu = new Date(d.toISOString().split('T')[0] + 'T' + segment.end + ':00.000Z');
            // Si c'est le lendemain (ex: 02:00), ajuster
            if (segment.end.startsWith('0') && parseInt(segment.end.split(':')[0]) <= 6) {
              sortiePrevu.setDate(sortiePrevu.getDate() + 1);
            }
            const variationSortie = (Math.random() - 0.5) * 40; // +/- 20 min
            const sortieReel = new Date(sortiePrevu.getTime() + variationSortie * 60000);
            
            await prisma.pointage.create({
              data: {
                type: 'out',
                horodatage: sortieReel,
                userId: employe.id
              }
            });
            pointagesCreated++;
          }
        }
      }
    }
    
    console.log(`✅ ${pointagesCreated} pointages créés\n`);

    // 5. CRÉATION D'ANOMALIES DE TEST
    console.log('⚠️ Étape 5: Création d\'anomalies de test...');
    
    const moussTest = employes.find(e => e.email.includes('mouss.test'));
    if (moussTest) {
      // Anomalie hors_plage_in pour le 29 (hier ou avant-hier)
      const dateAnomalie = new Date(today);
      dateAnomalie.setDate(today.getDate() - 2); // Il y a 2 jours
      
      await prisma.anomalie.create({
        data: {
          employeId: moussTest.id,
          date: dateAnomalie,
          type: 'hors_plage_in',
          gravite: 'critique',
          description: 'Pointage d\'entrée hors des créneaux planifiés',
          details: {
            pointageHoraire: '05:30',
            creneauPrevu: '11:30-15:00',
            ecartMinutes: -360
          },
          statut: 'en_attente',
          commentaire: 'Pointage très matinal non prévu'
        }
      });
      
      // Quelques autres anomalies pour tester
      await prisma.anomalie.create({
        data: {
          employeId: moussTest.id,
          date: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Hier
          type: 'retard_critique',
          gravite: 'critique', 
          description: 'Retard important au service',
          details: {
            heurePrevu: '11:30',
            heureReel: '12:15',
            ecartMinutes: 45
          },
          statut: 'en_attente'
        }
      });
      
      await prisma.anomalie.create({
        data: {
          employeId: employes[1].id, // Marie Martin
          date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // Il y a 3 jours
          type: 'presence_non_prevue',
          gravite: 'attention',
          description: 'Présence non planifiée',
          details: {
            pointageHoraire: '14:30',
            aucunCreneauPrevu: true
          },
          statut: 'validee',
          traitePar: admin.id,
          traiteAt: new Date(),
          commentaire: 'Validé par admin - remplacement de dernière minute'
        }
      });
      
      console.log('✅ Anomalies de test créées');
    }
    
    // 6. CRÉATION DE QUELQUES CONGÉS
    console.log('🏖️ Étape 6: Création de congés de test...');
    
    await prisma.conge.create({
      data: {
        type: 'CP',
        statut: 'validé',
        dateDebut: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
        dateFin: new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000), // Dans 9 jours  
        userId: employes[0].id,
        vu: true
      }
    });
    
    await prisma.conge.create({
      data: {
        type: 'RTT',
        statut: 'en attente',
        dateDebut: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // Dans 14 jours
        dateFin: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // Même jour
        userId: employes[2].id,
        vu: false
      }
    });
    
    console.log('✅ Congés de test créés\n');

    // 7. RÉSUMÉ FINAL
    console.log('📊 RÉSUMÉ FINAL');
    console.log('================');
    
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.shift.count(), 
      prisma.pointage.count(),
      prisma.anomalie.count(),
      prisma.conge.count()
    ]);
    
    console.log(`👥 Utilisateurs: ${counts[0]}`);
    console.log(`📅 Shifts: ${counts[1]}`);  
    console.log(`⏰ Pointages: ${counts[2]}`);
    console.log(`⚠️ Anomalies: ${counts[3]}`);
    console.log(`🏖️ Congés: ${counts[4]}`);
    
    console.log('\n🎉 RESET ET REPOPULATION TERMINÉS AVEC SUCCÈS !');
    console.log('\n📋 Comptes créés:');
    console.log('   Admin: admin@gestion-rh.fr / password123');
    console.log('   Mouss Test: mouss.test@gestion-rh.fr / password123');
    console.log('   Marie Martin: marie.martin@gestion-rh.fr / password123');
    console.log('   Paul Durand: paul.durand@gestion-rh.fr / password123');  
    console.log('   Sophie Bernard: sophie.bernard@gestion-rh.fr / password123');
    console.log('   Lucas Petit: lucas.petit@gestion-rh.fr / password123');
    
    console.log('\n✅ La base est prête pour les tests d\'anomalies !');
    
  } catch (error) {
    console.error('❌ Erreur lors du reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
if (require.main === module) {
  resetDatabaseComplete()
    .then(() => {
      console.log('\n🚀 Script terminé avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabaseComplete };
