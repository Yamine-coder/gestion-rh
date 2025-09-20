const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMouss24() {
  try {
    console.log('🔍 Vérification des données pour test@Mouss.com le 24 août 2025...\n');

    // 1. Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);

    // 2. Vérifier les pointages du 24 août 2025
    const targetDate = '2025-08-24';
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    console.log(`\n📅 Recherche des pointages du ${targetDate}:`);
    console.log(`   Période: ${startOfDay.toISOString()} → ${endOfDay.toISOString()}`);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: user.id,
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`\n🕐 Pointages trouvés: ${pointages.length}`);
    
    if (pointages.length > 0) {
      pointages.forEach((p, index) => {
        const localTime = new Date(p.horodatage).toLocaleString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Europe/Paris'
        });
        console.log(`   ${index + 1}. ${p.type.toUpperCase()} - ${localTime}`);
      });

      // Calcul des créneaux
      let creneaux = [];
      for (let i = 0; i < pointages.length - 1; i++) {
        if (pointages[i].type === 'arrivee' && pointages[i + 1].type === 'depart') {
          const debut = new Date(pointages[i].horodatage);
          const fin = new Date(pointages[i + 1].horodatage);
          const dureeMinutes = Math.floor((fin - debut) / 60000);
          const dureeHeures = (dureeMinutes / 60).toFixed(2);
          
          creneaux.push({
            debut: debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            fin: fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            dureeMinutes,
            dureeHeures
          });
        }
      }

      if (creneaux.length > 0) {
        console.log(`\n⏰ Créneaux de travail détectés: ${creneaux.length}`);
        creneaux.forEach((c, index) => {
          console.log(`   ${index + 1}. ${c.debut} → ${c.fin} (${c.dureeHeures}h)`);
        });

        const totalMinutes = creneaux.reduce((total, c) => total + c.dureeMinutes, 0);
        const totalHeures = (totalMinutes / 60).toFixed(2);
        console.log(`\n📊 Total: ${totalHeures}h (${totalMinutes} minutes)`);
      } else {
        console.log('\n⚠️ Aucun créneau complet détecté (pas de paires arrivée/départ)');
      }
    } else {
      console.log('   Aucun pointage trouvé pour cette date');
    }

    // 3. Vérifier les shifts du planning RH pour cette date
    console.log(`\n📋 Vérification des shifts du planning RH:`);
    
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: user.id,
        date: new Date(targetDate)
      }
    });

    console.log(`   Shifts trouvés: ${shifts.length}`);
    
    shifts.forEach((shift, index) => {
      console.log(`\n   Shift ${index + 1}:`);
      console.log(`     ID: ${shift.id}`);
      console.log(`     Type: ${shift.type}`);
      console.log(`     Motif: ${shift.motif || 'N/A'}`);
      console.log(`     Commentaire: ${shift.commentaire || 'N/A'}`);
      
      // Vérifier si le champ segments existe dans la structure JSON
      if (shift.segments) {
        console.log(`     Segments (JSON): ${JSON.stringify(shift.segments, null, 2)}`);
      } else {
        console.log(`     Segments: Structure inconnue`);
        console.log(`     Données brutes du shift:`, JSON.stringify(shift, null, 2));
      }
    });

    // 4. Vérifier les congés
    console.log(`\n🏖️ Vérification des congés:`);
    
    const conges = await prisma.conge.findMany({
      where: {
        userId: user.id,
        dateDebut: { lte: new Date(targetDate) },
        dateFin: { gte: new Date(targetDate) },
        statut: 'validé'
      }
    });

    if (conges.length > 0) {
      console.log(`   Congés actifs: ${conges.length}`);
      conges.forEach((conge, index) => {
        console.log(`     ${index + 1}. ${conge.type} - ${conge.dateDebut.toLocaleDateString('fr-FR')} → ${conge.dateFin.toLocaleDateString('fr-FR')}`);
        console.log(`        Motif: ${conge.motif || 'N/A'}`);
      });
    } else {
      console.log('   Aucun congé validé pour cette date');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMouss24();
