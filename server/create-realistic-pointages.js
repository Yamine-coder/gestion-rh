// Script pour créer des pointages réalistes sur les 4 dernières semaines
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRealisticPointages() {
  console.log('🚀 Création de pointages réalistes...\n');

  // Récupérer tous les employés actifs
  const employes = await prisma.user.findMany({
    where: { 
      statut: 'actif',
      role: { in: ['employee', 'manager'] }
    },
    select: { id: true, nom: true, prenom: true }
  });

  console.log(`👥 ${employes.length} employés actifs trouvés\n`);

  // Supprimer les anciens pointages de test
  const deleted = await prisma.pointage.deleteMany({});
  console.log(`🗑️  ${deleted.count} anciens pointages supprimés\n`);

  // Générer des dates pour les 4 dernières semaines (jours ouvrés)
  const today = new Date();
  const dates = [];
  
  for (let i = 28; i >= 1; i--) { // Exclure aujourd'hui pour avoir des données complètes
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    // Exclure dimanche (0)
    if (dayOfWeek !== 0) {
      dates.push(new Date(date.toISOString().split('T')[0]));
    }
  }

  console.log(`📅 ${dates.length} jours de travail à générer\n`);

  const pointages = [];
  let totalJours = 0;
  let retards = 0;
  let absences = 0;
  let totalHeures = 0;

  for (const employe of employes) {
    for (const date of dates) {
      // Probabilité de présence : 92%
      const isPresent = Math.random() < 0.92;
      
      if (!isPresent) {
        absences++;
        continue;
      }

      // Heure d'arrivée prévue : entre 8h et 10h selon l'employé
      const heuresPrevues = [8, 9, 10];
      const heurePrevue = heuresPrevues[employe.id % 3];
      
      // Probabilité de retard : 8%
      const isLate = Math.random() < 0.08;
      let minutesArrivee = heurePrevue * 60 + Math.floor(Math.random() * 10);
      
      if (isLate) {
        retards++;
        // Retard de 5 à 45 minutes
        minutesArrivee += 5 + Math.floor(Math.random() * 40);
      }

      // Durée de travail : 7 à 9 heures en minutes
      const dureeMinutes = Math.floor((7 + Math.random() * 2) * 60);
      totalHeures += dureeMinutes / 60;
      
      // Calculer l'heure de départ
      let minutesDepart = minutesArrivee + dureeMinutes;
      
      // Plafonner à 22h59 (1379 minutes)
      if (minutesDepart > 22 * 60 + 59) {
        minutesDepart = 22 * 60 + 59;
      }
      
      const heureArrivee = Math.floor(minutesArrivee / 60);
      const minArrivee = minutesArrivee % 60;
      const heureDepart = Math.floor(minutesDepart / 60);
      const minDepart = minutesDepart % 60;

      const dateStr = date.toISOString().split('T')[0];

      // Pointage ENTREE
      pointages.push({
        userId: employe.id,
        type: 'ENTRÉE',
        horodatage: new Date(`${dateStr}T${String(heureArrivee).padStart(2, '0')}:${String(minArrivee).padStart(2, '0')}:00`)
      });

      // Pointage SORTIE
      pointages.push({
        userId: employe.id,
        type: 'SORTIE',
        horodatage: new Date(`${dateStr}T${String(heureDepart).padStart(2, '0')}:${String(minDepart).padStart(2, '0')}:00`)
      });

      totalJours++;
    }
  }

  // Vérifier qu'il n'y a pas de dates invalides
  const validPointages = pointages.filter(p => !isNaN(p.horodatage.getTime()));
  console.log(`✅ ${validPointages.length}/${pointages.length} pointages valides\n`);

  // Insérer par batch de 200
  const batchSize = 200;
  for (let i = 0; i < validPointages.length; i += batchSize) {
    const batch = validPointages.slice(i, i + batchSize);
    await prisma.pointage.createMany({
      data: batch
    });
    process.stdout.write(`\r✅ ${Math.min(i + batchSize, validPointages.length)}/${validPointages.length} pointages créés`);
  }

  console.log('\n');

  // Statistiques
  const tauxPresence = ((totalJours / (employes.length * dates.length)) * 100).toFixed(1);
  const tauxRetards = ((retards / totalJours) * 100).toFixed(1);
  const dureeMoyenne = (totalHeures / totalJours).toFixed(1);

  console.log('════════════════════════════════════════════');
  console.log('       📊 RÉSUMÉ DES DONNÉES CRÉÉES');
  console.log('════════════════════════════════════════════\n');
  console.log(`  📅 Période:              ${dates[0].toLocaleDateString('fr-FR')} - ${dates[dates.length-1].toLocaleDateString('fr-FR')}`);
  console.log(`  👥 Employés:             ${employes.length}`);
  console.log(`  📝 Pointages créés:      ${validPointages.length} (${totalJours} jours x 2)`);
  console.log(`  ✅ Taux de présence:     ${tauxPresence}%`);
  console.log(`  🚨 Retards:              ${retards} (${tauxRetards}%)`);
  console.log(`  ❌ Absences:             ${absences}`);
  console.log(`  ⏱️  Durée moyenne:        ${dureeMoyenne}h`);
  console.log('\n════════════════════════════════════════════');
  console.log('         ✅ DONNÉES CRÉÉES AVEC SUCCÈS');
  console.log('════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

createRealisticPointages().catch(console.error);
