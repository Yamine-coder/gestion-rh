// Test du calcul des heures réelles pour les extras
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHeuresReellesExtra() {
  console.log('🧪 Test du calcul des heures réelles pour extras\n');

  try {
    // 1. Trouver le shift extra de test
    const shift = await prisma.shift.findFirst({
      where: {
        employe: {
          email: 'test.extra@restaurant.com'
        }
      },
      include: {
        employe: true
      },
      orderBy: { date: 'desc' }
    });

    if (!shift) {
      console.log('❌ Aucun shift trouvé pour test.extra@restaurant.com');
      return;
    }

    console.log('📅 Shift trouvé:');
    console.log(`   ID: ${shift.id}`);
    console.log(`   Date: ${shift.date.toISOString().split('T')[0]}`);
    console.log(`   Employé: ${shift.employe.prenom} ${shift.employe.nom}`);
    console.log(`   Segments:`, JSON.stringify(shift.segments, null, 2));

    // 2. Trouver les pointages pour ce jour
    const dateDebut = new Date(shift.date);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(shift.date);
    dateFin.setHours(23, 59, 59, 999);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: shift.employeId,
        horodatage: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log('\n⏰ Pointages du jour:');
    pointages.forEach(p => {
      const heure = p.horodatage.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      console.log(`   - ${p.type}: ${heure}`);
    });

    // 3. Calculer les heures prévues du segment extra
    const segment = shift.segments[0];
    if (segment && segment.isExtra) {
      const [startH, startM] = segment.start.split(':').map(Number);
      const [endH, endM] = segment.end.split(':').map(Number);
      let heuresPrevues = (endH + endM/60) - (startH + startM/60);
      if (heuresPrevues < 0) heuresPrevues += 24;

      console.log('\n📊 Calcul des heures:');
      console.log(`   Segment prévu: ${segment.start} - ${segment.end}`);
      console.log(`   Heures prévues: ${heuresPrevues}h`);

      // 4. Trouver arrivée et départ
      const arrivee = pointages.find(p => p.type === 'arrivee');
      const depart = pointages.find(p => p.type === 'depart');

      if (arrivee && depart) {
        const dureeMs = depart.horodatage - arrivee.horodatage;
        const heuresReelles = dureeMs / (1000 * 60 * 60);
        const ecart = heuresReelles - heuresPrevues;

        console.log(`   Arrivée réelle: ${arrivee.horodatage.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`   Départ réel: ${depart.horodatage.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`   Heures réelles: ${heuresReelles.toFixed(2)}h`);
        console.log(`   Écart: ${ecart > 0 ? '+' : ''}${ecart.toFixed(2)}h`);

        if (ecart < 0) {
          console.log('\n⚠️  L\'employé a travaillé MOINS que prévu');
          console.log(`   À payer: ${heuresReelles.toFixed(2)}h au lieu de ${heuresPrevues}h`);
        } else if (ecart > 0) {
          console.log('\n✅ L\'employé a travaillé PLUS que prévu');
        } else {
          console.log('\n✅ L\'employé a travaillé exactement le temps prévu');
        }
      } else {
        console.log('\n⏳ Pointage incomplet - en attente du pointage de', !arrivee ? 'arrivée' : 'départ');
      }
    }

    // 5. Vérifier si un PaiementExtra existe
    const paiement = await prisma.paiementExtra.findFirst({
      where: {
        shiftId: shift.id
      }
    });

    console.log('\n💰 Paiement Extra:');
    if (paiement) {
      console.log(`   ID: ${paiement.id}`);
      console.log(`   Heures prévues: ${paiement.heuresPrevues || 'N/A'}`);
      console.log(`   Heures réelles: ${paiement.heuresReelles || 'N/A'}`);
      console.log(`   Écart: ${paiement.ecartHeures || 'N/A'}`);
      console.log(`   Pointage validé: ${paiement.pointageValide}`);
      console.log(`   Montant: ${paiement.montant}€`);
      console.log(`   Statut: ${paiement.statut}`);
    } else {
      console.log('   Aucun paiement extra créé pour ce shift');
      console.log('   → Synchroniser les paiements ou en créer un manuellement');
    }

    // 6. Tester la fonction de recalcul
    console.log('\n🔄 Test de recalcul des heures réelles...');
    const { mettreAJourHeuresReelles, creerPaiementDepuisShiftExtra } = require('./services/paiementExtrasService');
    
    if (!paiement) {
      console.log('   Création du paiement depuis le shift...');
      const nouveauPaiement = await creerPaiementDepuisShiftExtra(shift, 0, 1);
      if (nouveauPaiement) {
        console.log(`   ✅ Paiement créé: ID ${nouveauPaiement.id}`);
        console.log(`      Heures prévues: ${nouveauPaiement.heuresPrevues}`);
        console.log(`      Heures réelles: ${nouveauPaiement.heuresReelles}`);
        console.log(`      Écart: ${nouveauPaiement.ecartHeures}`);
        console.log(`      Montant: ${nouveauPaiement.montant}€`);
      }
    } else {
      console.log('   Mise à jour des heures réelles...');
      const updated = await mettreAJourHeuresReelles(paiement.id);
      if (updated) {
        console.log(`   ✅ Paiement mis à jour: ID ${updated.id}`);
        console.log(`      Heures réelles: ${updated.heuresReelles}`);
        console.log(`      Écart: ${updated.ecartHeures}`);
        console.log(`      Montant: ${updated.montant}€`);
      }
    }

    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHeuresReellesExtra();
