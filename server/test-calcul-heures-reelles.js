const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { creerPaiementDepuisShiftExtra, mettreAJourHeuresReelles } = require('./services/paiementExtrasService');

async function testCalculHeuresReelles() {
  console.log('🧪 Test du calcul des heures réelles pour extras\n');

  try {
    // 1. Le shift 100% extra
    const shift = await prisma.shift.findUnique({
      where: { id: 7986 },
      include: { employe: true }
    });

    if (!shift) {
      console.log('❌ Shift 7986 non trouvé');
      return;
    }

    console.log('📅 Shift:', shift.id);
    console.log(`   Date: ${shift.date.toISOString().split('T')[0]}`);
    console.log(`   Employé: ${shift.employe.prenom} ${shift.employe.nom}`);
    console.log(`   Segments:`, JSON.stringify(shift.segments, null, 2));

    // 2. Les pointages
    const dateDebut = new Date(shift.date);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(shift.date);
    dateFin.setHours(23, 59, 59, 999);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: shift.employeId,
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log('\n⏰ Pointages:');
    pointages.forEach(p => {
      console.log(`   - ${p.type}: ${p.horodatage.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
    });

    // 3. Calcul manuel
    const segment = shift.segments[0];
    const [startH, startM] = segment.start.split(':').map(Number);
    const [endH, endM] = segment.end.split(':').map(Number);
    let heuresPrevues = (endH + endM/60) - (startH + startM/60);
    if (heuresPrevues < 0) heuresPrevues += 24;

    console.log('\n📊 Calcul:');
    console.log(`   Segment prévu: ${segment.start} - ${segment.end}`);
    console.log(`   Heures prévues: ${heuresPrevues}h`);

    const arrivee = pointages.find(p => p.type === 'arrivee');
    const depart = pointages.find(p => p.type === 'depart');

    if (arrivee && depart) {
      const dureeMs = depart.horodatage - arrivee.horodatage;
      const heuresReelles = dureeMs / (1000 * 60 * 60);
      const ecart = heuresReelles - heuresPrevues;

      console.log(`   Heures réelles: ${heuresReelles.toFixed(2)}h`);
      console.log(`   Écart: ${ecart > 0 ? '+' : ''}${ecart.toFixed(2)}h`);
    }

    // 4. Vérifier/créer le PaiementExtra
    let paiement = await prisma.paiementExtra.findFirst({
      where: { shiftId: shift.id }
    });

    if (!paiement) {
      console.log('\n💰 Création du paiement extra...');
      paiement = await creerPaiementDepuisShiftExtra(shift, 0, 1);
    }

    if (paiement) {
      console.log('\n💰 Paiement Extra:');
      console.log(`   ID: ${paiement.id}`);
      console.log(`   Heures prévues: ${paiement.heuresPrevues}`);
      console.log(`   Heures réelles: ${paiement.heuresReelles}`);
      console.log(`   Écart: ${paiement.ecartHeures}`);
      console.log(`   Pointage validé: ${paiement.pointageValide}`);
      console.log(`   Heures à payer: ${paiement.heures}`);
      console.log(`   Montant: ${paiement.montant}€`);
      console.log(`   Statut: ${paiement.statut}`);
    }

    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalculHeuresReelles();
