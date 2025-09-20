const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPointageForMouss() {
  try {
    console.log('🔧 Création d\'un pointage pour test@Mouss.com...\n');

    // 1. Trouver l'utilisateur test@Mouss.com
    const moussUser = await prisma.utilisateur.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (!moussUser) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      console.log('💡 Vérifions tous les utilisateurs existants...\n');
      
      const allUsers = await prisma.utilisateur.findMany({
        select: { id: true, email: true, prenom: true, nom: true }
      });
      
      console.log('👥 Utilisateurs disponibles:');
      allUsers.forEach(user => {
        console.log(`   ID: ${user.id} - ${user.email} (${user.prenom} ${user.nom})`);
      });
      
      if (allUsers.length === 0) {
        console.log('❌ Aucun utilisateur trouvé dans la base de données !');
        return;
      }
      
      // Prendre le premier utilisateur disponible
      const firstUser = allUsers[0];
      console.log(`\n💡 Utilisation du premier utilisateur disponible: ${firstUser.email}`);
      await createPointageForUser(firstUser);
      return;
    }

    console.log('✅ Utilisateur test@Mouss.com trouvé:', {
      id: moussUser.id,
      email: moussUser.email,
      nom: moussUser.nom,
      prenom: moussUser.prenom
    });

    await createPointageForUser(moussUser);

  } catch (error) {
    console.error('❌ Erreur lors de la création du pointage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createPointageForUser(user) {
  // 2. Vérifier s'il y a déjà des pointages aujourd'hui
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
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

  console.log(`\n📊 Pointages existants aujourd'hui pour ${user.email}: ${existingPointages.length}`);
  if (existingPointages.length > 0) {
    existingPointages.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.type.toUpperCase()} à ${p.horodatage.toLocaleTimeString('fr-FR')}`);
    });
  }

  // 3. Déterminer le type de pointage à créer
  const dernierPointage = existingPointages[existingPointages.length - 1];
  let typePointage;
  
  if (!dernierPointage) {
    typePointage = 'arrivee';
    console.log('💡 Aucun pointage existant → Création d\'une ARRIVÉE');
  } else if (dernierPointage.type === 'arrivee') {
    typePointage = 'depart';
    console.log('💡 Dernier pointage: arrivée → Création d\'un DÉPART');
  } else {
    typePointage = 'arrivee';
    console.log('💡 Dernier pointage: départ → Création d\'une ARRIVÉE');
  }

  // 4. Créer le nouveau pointage
  const maintenant = new Date();
  const nouveauPointage = await prisma.pointage.create({
    data: {
      userId: user.id,
      type: typePointage,
      horodatage: maintenant,
      date: maintenant.toISOString().split('T')[0] // Format YYYY-MM-DD
    }
  });

  console.log('\n🎉 POINTAGE CRÉÉ AVEC SUCCÈS !');
  console.log('📍 Détails du pointage:');
  console.log(`   ID: ${nouveauPointage.id}`);
  console.log(`   Type: ${nouveauPointage.type.toUpperCase()}`);
  console.log(`   Heure: ${nouveauPointage.horodatage.toLocaleString('fr-FR')}`);
  console.log(`   Date: ${nouveauPointage.date}`);
  console.log(`   Utilisateur: ${user.prenom} ${user.nom} (${user.email})`);

  // 5. Récapitulatif final
  const allPointagesToday = await prisma.pointage.findMany({
    where: {
      userId: user.id,
      horodatage: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: { horodatage: 'asc' }
  });

  console.log('\n📈 RÉCAPITULATIF DU JOUR:');
  console.log(`   Total pointages: ${allPointagesToday.length}`);
  allPointagesToday.forEach((p, i) => {
    const emoji = p.type === 'arrivee' ? '🟢' : '🔴';
    console.log(`   ${i+1}. ${emoji} ${p.type.toUpperCase()} - ${p.horodatage.toLocaleTimeString('fr-FR')}`);
  });

  // 6. Calcul des heures si séquence complète
  if (allPointagesToday.length >= 2 && allPointagesToday.length % 2 === 0) {
    let totalMs = 0;
    for (let i = 0; i < allPointagesToday.length; i += 2) {
      const arrivee = allPointagesToday[i];
      const depart = allPointagesToday[i + 1];
      if (arrivee.type === 'arrivee' && depart.type === 'depart') {
        totalMs += new Date(depart.horodatage) - new Date(arrivee.horodatage);
      }
    }
    const totalHeures = totalMs / (1000 * 60 * 60);
    const h = Math.floor(totalHeures);
    const m = Math.round((totalHeures - h) * 60);
    console.log(`\n⏰ TEMPS TRAVAILLÉ: ${h}h${m.toString().padStart(2,'0')}`);
  } else if (allPointagesToday.length % 2 === 1) {
    console.log('\n⚠️ SÉQUENCE OUVERTE: L\'employé est actuellement au travail');
  }

  // 7. Test de l'API pour vérifier que les données sont accessibles
  console.log('\n🔍 TEST API:');
  try {
    const pointagesAPI = await prisma.pointage.findMany({
      where: { userId: user.id },
      orderBy: { horodatage: 'desc' },
      take: 5
    });
    console.log(`   API accessible: ${pointagesAPI.length} pointages récents trouvés`);
    
    // Test calcul total aujourd'hui
    let totalMsToday = 0;
    const todayPointages = allPointagesToday;
    for (let i = 0; i < todayPointages.length; i += 2) {
      if (i + 1 < todayPointages.length) {
        const arrivee = todayPointages[i];
        const depart = todayPointages[i + 1];
        if (arrivee.type === 'arrivee' && depart.type === 'depart') {
          totalMsToday += new Date(depart.horodatage) - new Date(arrivee.horodatage);
        }
      }
    }
    const totalHeuresToday = totalMsToday / (1000 * 60 * 60);
    console.log(`   Total heures aujourd'hui (API): ${totalHeuresToday.toFixed(2)}h`);
    
  } catch (apiError) {
    console.log('   ❌ Erreur API:', apiError.message);
  }
}

createPointageForMouss();
