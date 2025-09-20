const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAnomaliePointage() {
  try {
    console.log('🎯 Création d\'une anomalie : pointage complet avec absence prévue');
    console.log('📅 Date cible : 24 août 2025');
    console.log('👤 Utilisateur : test@Mouss.com');
    console.log('');

    // 1. Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);

    // 2. Date spécifique du 24 août 2025
    const targetDate = '2025-08-24';
    const baseDate = new Date(targetDate);
    
    // Créer les horodatages pour un créneau de travail normal
    const arrivee = new Date(baseDate);
    arrivee.setHours(9, 15, 0, 0); // 09:15:00
    
    const depart = new Date(baseDate);
    depart.setHours(17, 45, 0, 0); // 17:45:00

    console.log(`\n🕘 Pointage prévu:`);
    console.log(`   Arrivée: ${arrivee.toLocaleString('fr-FR')}`);
    console.log(`   Départ: ${depart.toLocaleString('fr-FR')}`);
    console.log(`   Durée: ${((depart - arrivee) / 3600000).toFixed(1)}h`);

    // 3. Vérifier les pointages existants pour cette date
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingPointages = await prisma.pointage.findMany({
      where: {
        userId: user.id,
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    if (existingPointages.length > 0) {
      console.log(`\n⚠️ Pointages existants trouvés (${existingPointages.length}) - suppression...`);
      await prisma.pointage.deleteMany({
        where: {
          userId: user.id,
          horodatage: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });
      console.log('✅ Pointages existants supprimés');
    }

    // 4. Vérifier l'absence prévue
    console.log('\n🔍 Vérification de l\'absence prévue...');
    
    const absence = await prisma.shift.findFirst({
      where: {
        employeId: user.id,
        date: baseDate,
        type: 'absence'
      }
    });

    if (absence) {
      console.log(`✅ Absence trouvée: ${absence.motif} - ${absence.type}`);
      console.log('🎯 ANOMALIE CONFIRMÉE : Pointage sur jour d\'absence !');
    } else {
      console.log('⚠️ Aucune absence prévue trouvée - création quand même du pointage');
    }

    // 5. Créer les pointages
    console.log('\n🏗️ Création des pointages...');

    // Pointage arrivée
    const pointageArrivee = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: arrivee
      }
    });
    console.log(`✅ Arrivée créée: ${pointageArrivee.horodatage.toLocaleString('fr-FR')}`);

    // Pointage départ
    const pointageDepart = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: depart
      }
    });
    console.log(`✅ Départ créé: ${pointageDepart.horodatage.toLocaleString('fr-FR')}`);

    // 6. Calculer et afficher le résumé
    const dureeMinutes = Math.floor((depart - arrivee) / 60000);
    const dureeHeures = (dureeMinutes / 60).toFixed(2);

    console.log('\n📊 RÉSUMÉ DE L\'ANOMALIE:');
    console.log('=' .repeat(50));
    console.log(`👤 Employé: ${user.nom} ${user.prenom} (${user.email})`);
    console.log(`📅 Date: ${targetDate}`);
    console.log(`🚫 Statut prévu: ${absence ? `ABSENCE (${absence.motif})` : 'AUCUN PLANNING'}`);
    console.log(`⏰ Pointage réel: ${arrivee.toLocaleTimeString('fr-FR')} → ${depart.toLocaleTimeString('fr-FR')}`);
    console.log(`⌛ Durée travaillée: ${dureeHeures}h (${dureeMinutes} minutes)`);
    console.log(`🔥 TYPE ANOMALIE: ${absence ? 'PRÉSENCE SUR ABSENCE' : 'TRAVAIL NON PLANIFIÉ'}`);
    console.log('=' .repeat(50));
    
    if (absence) {
      console.log('\n🎯 Test réussi ! L\'anomalie est maintenant créée :');
      console.log('   → L\'employé était prévu absent mais a pointé');
      console.log('   → Vous pouvez tester les boutons "💼 Extra" et "❌ Erreur"');
      console.log('   → Rafraîchir la page Planning RH pour voir l\'anomalie');
    } else {
      console.log('\n⚠️ L\'anomalie peut ne pas apparaître sans absence prévue');
      console.log('   → Créez d\'abord une absence dans le planning pour ce jour');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la création
createAnomaliePointage();
