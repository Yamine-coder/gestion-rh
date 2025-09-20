const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdminPointage() {
  try {
    console.log('🔧 Création d\'un pointage pour admin@gesrh.com...\n');

    // 1. Trouver l'utilisateur admin
    const admin = await prisma.utilisateur.findUnique({
      where: { email: 'admin@gesrh.com' }
    });

    if (!admin) {
      console.log('❌ Utilisateur admin@gesrh.com non trouvé');
      console.log('💡 Créons d\'abord cet utilisateur...');
      
      // Créer l'admin s'il n'existe pas
      const newAdmin = await prisma.utilisateur.create({
        data: {
          email: 'admin@gesrh.com',
          motDePasse: '$2b$10$hashedPassword', // Hash fictif
          prenom: 'Admin',
          nom: 'Système',
          role: 'admin'
        }
      });
      
      console.log('✅ Utilisateur admin créé:', {
        id: newAdmin.id,
        email: newAdmin.email,
        nom: newAdmin.nom,
        prenom: newAdmin.prenom
      });
      
      // Utiliser le nouvel admin
      admin = newAdmin;
    } else {
      console.log('✅ Utilisateur admin trouvé:', {
        id: admin.id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom
      });
    }

    // 2. Vérifier s'il y a déjà des pointages aujourd'hui
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const existingPointages = await prisma.pointage.findMany({
      where: {
        userId: admin.id,
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📊 Pointages existants aujourd'hui: ${existingPointages.length}`);
    if (existingPointages.length > 0) {
      existingPointages.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.type} à ${p.horodatage.toLocaleTimeString('fr-FR')}`);
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
        userId: admin.id,
        type: typePointage,
        horodatage: maintenant
      }
    });

    console.log('\n🎉 POINTAGE CRÉÉ AVEC SUCCÈS !');
    console.log('📍 Détails du pointage:');
    console.log(`   ID: ${nouveauPointage.id}`);
    console.log(`   Type: ${nouveauPointage.type.toUpperCase()}`);
    console.log(`   Heure: ${nouveauPointage.horodatage.toLocaleString('fr-FR')}`);
    console.log(`   Utilisateur: ${admin.prenom} ${admin.nom} (${admin.email})`);

    // 5. Récapitulatif final
    const allPointagesToday = await prisma.pointage.findMany({
      where: {
        userId: admin.id,
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

  } catch (error) {
    console.error('❌ Erreur lors de la création du pointage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminPointage();
