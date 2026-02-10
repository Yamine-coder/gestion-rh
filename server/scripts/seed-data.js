// Script de génération de données de test
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Données d'employés réalistes
const employesData = [
  { nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@entreprise.com', role: 'employee' },
  { nom: 'Martin', prenom: 'Pierre', email: 'pierre.martin@entreprise.com', role: 'employee' },
  { nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@entreprise.com', role: 'employee' },
  { nom: 'Dubois', prenom: 'Jean', email: 'jean.dubois@entreprise.com', role: 'employee' },
  { nom: 'Moreau', prenom: 'Claire', email: 'claire.moreau@entreprise.com', role: 'employee' },
  { nom: 'Laurent', prenom: 'Thomas', email: 'thomas.laurent@entreprise.com', role: 'employee' },
  { nom: 'Simon', prenom: 'Emma', email: 'emma.simon@entreprise.com', role: 'employee' },
  { nom: 'Michel', prenom: 'Lucas', email: 'lucas.michel@entreprise.com', role: 'employee' },
  { nom: 'Garcia', prenom: 'Léa', email: 'lea.garcia@entreprise.com', role: 'employee' },
  { nom: 'David', prenom: 'Hugo', email: 'hugo.david@entreprise.com', role: 'employee' },
  { nom: 'Richard', prenom: 'Camille', email: 'camille.richard@entreprise.com', role: 'employee' },
  { nom: 'Petit', prenom: 'Antoine', email: 'antoine.petit@entreprise.com', role: 'employee' }
];

// Types de congés
const typesConges = [
  'Congés payés',
  'RTT',
  'Maladie',
  'Formation',
  'Récupération',
  'Personnel'
];

// Générer une date aléatoire dans une plage
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Générer une heure aléatoire
function randomTime(start = 8, end = 18) {
  const hour = Math.floor(Math.random() * (end - start) + start);
  const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

async function seedDatabase() {
  console.log('🌱 Début du seeding de la base de données...');

  try {
    // Nettoyer les données existantes
    console.log('🧹 Nettoyage des données existantes...');
    await prisma.pointage.deleteMany();
    await prisma.conge.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.user.deleteMany({
      where: { role: 'employee' } // Garder les admins existants
    });

    // Créer les employés
    console.log('👥 Création des employés...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const employes = [];
    for (const employeData of employesData) {
      const employe = await prisma.user.create({
        data: {
          ...employeData,
          password: hashedPassword
        }
      });
      employes.push(employe);
      console.log(`   ✅ Employé créé: ${employe.prenom} ${employe.nom}`);
    }

    // Créer des congés
    console.log('🏖️ Création des demandes de congés...');
    const statuts = ['en attente', 'approuvé', 'refusé'];
    const conges = [];

    for (let i = 0; i < 25; i++) {
      const employe = employes[Math.floor(Math.random() * employes.length)];
      const type = typesConges[Math.floor(Math.random() * typesConges.length)];
      const statut = statuts[Math.floor(Math.random() * statuts.length)];
      
      // Générer des dates de congés réalistes
      const dateDebut = randomDate(new Date(2025, 5, 1), new Date(2025, 11, 31));
      const dateFin = new Date(dateDebut);
      dateFin.setDate(dateDebut.getDate() + Math.floor(Math.random() * 10) + 1); // 1 à 10 jours
      
      const conge = await prisma.conge.create({
        data: {
          type,
          statut,
          dateDebut,
          dateFin,
          userId: employe.id,
          vu: Math.random() > 0.3 // 70% des demandes sont vues
        }
      });
      conges.push(conge);
    }
    console.log(`   ✅ ${conges.length} demandes de congés créées`);

    // Créer des shifts (plannings)
    console.log('📅 Création des plannings...');
    const shifts = [];
    
    // Générer des shifts pour les 4 dernières semaines
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);
    
    for (let day = 0; day < 28; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Skip weekends pour certains employés
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
      
      // Créer des shifts pour 60% des employés chaque jour
      const employesToSchedule = employes.filter(() => Math.random() > 0.4);
      
      for (const employe of employesToSchedule) {
        const shift = await prisma.shift.create({
          data: {
            employeId: employe.id,
            date: currentDate,
            type: 'travail',
            segments: [
              {
                heureDebut: randomTime(8, 9),
                heureFin: randomTime(17, 19),
                pauseDebut: '12:00',
                pauseFin: '13:00'
              }
            ]
          }
        });
        shifts.push(shift);
      }
    }
    console.log(`   ✅ ${shifts.length} shifts créés`);

    // Créer des pointages
    console.log('⏰ Création des pointages...');
    const pointages = [];
    
    for (const shift of shifts) {
      // 80% des shifts ont des pointages
      if (Math.random() > 0.2) {
        const segments = Array.isArray(shift.segments) ? shift.segments : JSON.parse(shift.segments);
        const premierSegment = segments[0];
        
        if (premierSegment && premierSegment.heureDebut && premierSegment.heureFin) {
          // Pointage arrivée avec parfois un peu de retard/avance
          const heureArrivee = new Date(shift.date);
          const [heures, minutes] = premierSegment.heureDebut.split(':');
          heureArrivee.setHours(parseInt(heures), parseInt(minutes));
          
          // Ajouter une variation de -10 à +30 minutes
          const variationMinutes = Math.floor(Math.random() * 40) - 10;
          heureArrivee.setMinutes(heureArrivee.getMinutes() + variationMinutes);
          
          await prisma.pointage.create({
            data: {
              type: 'arrivée',
              horodatage: heureArrivee,
              userId: shift.employeId
            }
          });
          
          // Pointage départ
          const heureDepart = new Date(shift.date);
          const [heuresDepart, minutesDepart] = premierSegment.heureFin.split(':');
          heureDepart.setHours(parseInt(heuresDepart), parseInt(minutesDepart));
          
          // Variation de -30 à +60 minutes pour le départ
          const variationDepart = Math.floor(Math.random() * 90) - 30;
          heureDepart.setMinutes(heureDepart.getMinutes() + variationDepart);
          
          await prisma.pointage.create({
            data: {
              type: 'départ',
              horodatage: heureDepart,
              userId: shift.employeId
            }
          });
          
          pointages.push('arrivée', 'départ');
        }
      }
    }
    console.log(`   ✅ ${pointages.length} pointages créés`);

    // Statistiques finales
    console.log('\n📊 Résumé du seeding:');
    console.log(`   👥 Employés: ${employes.length}`);
    console.log(`   🏖️ Congés: ${conges.length}`);
    console.log(`   📅 Shifts: ${shifts.length}`);
    console.log(`   ⏰ Pointages: ${pointages.length}`);
    
    console.log('\n🎉 Seeding terminé avec succès !');
    console.log('\n📝 Comptes de test créés:');
    console.log('   Email: marie.dupont@entreprise.com');
    console.log('   Mot de passe: password123');
    console.log('   (Même mot de passe pour tous les employés)');

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
