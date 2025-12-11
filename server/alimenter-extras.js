// Script pour alimenter les paiements extras depuis les données existantes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TAUX_HORAIRE_DEFAUT = 10;

async function alimenterExtras() {
  console.log('🚀 Alimentation des paiements extras...\n');
  
  let crees = 0;
  let erreurs = 0;
  
  // Récupérer un admin pour creePar
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true }
  });
  const adminId = admin?.id || 1;
  console.log(`👤 Admin ID utilisé: ${adminId}\n`);

  // 1. Traiter les shifts avec segments extra
  console.log('=== SHIFTS AVEC SEGMENTS EXTRA ===');
  const shiftsAvecSegments = await prisma.shift.findMany({
    where: { segments: { not: null } },
    include: {
      employe: { select: { id: true, nom: true, prenom: true } }
    }
  });
  
  for (const shift of shiftsAvecSegments) {
    if (!shift.segments || !Array.isArray(shift.segments)) continue;
    
    for (let i = 0; i < shift.segments.length; i++) {
      const segment = shift.segments[i];
      if (!segment.isExtra && !segment.extra) continue;
      
      // Vérifier si paiement existe déjà
      const existant = await prisma.paiementExtra.findFirst({
        where: { shiftId: shift.id, segmentIndex: i }
      });
      
      if (existant) {
        console.log(`⚠️ Paiement déjà existant pour shift ${shift.id} segment ${i}`);
        continue;
      }
      
      // Calculer les heures
      const [startH, startM] = (segment.start || '00:00').split(':').map(Number);
      const [endH, endM] = (segment.end || '00:00').split(':').map(Number);
      const heures = Math.max(0, (endH + endM/60) - (startH + startM/60));
      
      if (heures <= 0) continue;
      
      const tauxHoraire = TAUX_HORAIRE_DEFAUT;
      const montant = segment.extraMontant ? parseFloat(segment.extraMontant) : (heures * tauxHoraire);
      
      try {
        await prisma.paiementExtra.create({
          data: {
            employeId: shift.employeId,
            date: shift.date,
            heures: heures,
            montant: montant,
            tauxHoraire: tauxHoraire,
            source: 'shift_extra',
            shiftId: shift.id,
            segmentIndex: i,
            statut: segment.paymentStatus === 'payé' ? 'paye' : 'a_payer',
            creePar: adminId,
            commentaire: segment.commentaire || `Segment extra ${segment.start}-${segment.end}`
          }
        });
        crees++;
        console.log(`✅ Paiement créé: Shift ${shift.id} - ${shift.employe?.prenom} ${shift.employe?.nom} - ${heures.toFixed(2)}h - ${montant}€`);
      } catch (error) {
        erreurs++;
        console.error(`❌ Erreur shift ${shift.id}:`, error.message);
      }
    }
  }

  // 2. Traiter les anomalies d'heures supplémentaires validées
  console.log('\n=== ANOMALIES HEURES SUP ===');
  const anomaliesHS = await prisma.anomalie.findMany({
    where: {
      OR: [
        { type: 'heures_supplementaires' },
        { type: 'heures_sup_a_valider' },
        { type: { contains: 'heures_sup' } }
      ],
      // Inclure celles validées OU en attente pour les avoir dans le système
      statut: { in: ['valide', 'validee', 'resolu', 'traite', 'en_attente'] }
    },
    include: {
      employe: { select: { id: true, nom: true, prenom: true } }
    }
  });
  
  console.log(`Anomalies heures sup trouvées: ${anomaliesHS.length}`);
  
  for (const anomalie of anomaliesHS) {
    // Vérifier si paiement existe déjà
    const existant = await prisma.paiementExtra.findFirst({
      where: { anomalieId: anomalie.id }
    });
    
    if (existant) {
      console.log(`⚠️ Paiement déjà existant pour anomalie ${anomalie.id}`);
      continue;
    }
    
    // Extraire les heures depuis les détails de l'anomalie
    let heures = parseFloat(anomalie.heuresExtra) || 0;
    if (heures <= 0 && anomalie.details) {
      const details = typeof anomalie.details === 'object' ? anomalie.details : {};
      // Chercher dans heuresSupp d'abord
      if (details.heuresSupp) {
        heures = parseFloat(details.heuresSupp);
      }
      // Sinon calculer depuis ecartMinutes
      else if (details.ecartMinutes) {
        heures = Math.abs(details.ecartMinutes) / 60;
      }
      // Sinon chercher minutesEcart
      else if (details.minutesEcart) {
        heures = Math.abs(details.minutesEcart) / 60;
      }
    }
    
    if (heures <= 0) {
      console.log(`⚠️ Anomalie ${anomalie.id}: pas d'heures à payer`);
      continue;
    }
    
    const tauxHoraire = TAUX_HORAIRE_DEFAUT;
    const montant = anomalie.montantExtra ? parseFloat(anomalie.montantExtra) : (heures * tauxHoraire);
    
    try {
      await prisma.paiementExtra.create({
        data: {
          employeId: anomalie.employeId,
          date: anomalie.date,
          heures: heures,
          montant: montant,
          tauxHoraire: tauxHoraire,
          source: 'anomalie_heures_sup',
          anomalieId: anomalie.id,
          statut: anomalie.statut === 'en_attente' ? 'a_payer' : 'a_payer', // Toujours à payer jusqu'à confirmation
          creePar: adminId,
          commentaire: `Heures supplémentaires - ${anomalie.type}`
        }
      });
      crees++;
      console.log(`✅ Paiement créé: Anomalie ${anomalie.id} - ${anomalie.employe?.prenom} ${anomalie.employe?.nom} - ${heures.toFixed(2)}h - ${montant}€`);
    } catch (error) {
      erreurs++;
      console.error(`❌ Erreur anomalie ${anomalie.id}:`, error.message);
    }
  }

  console.log('\n=== RÉSUMÉ ===');
  console.log(`✅ Paiements créés: ${crees}`);
  console.log(`❌ Erreurs: ${erreurs}`);
  
  // Vérifier le total
  const total = await prisma.paiementExtra.count();
  console.log(`📊 Total paiements extras en base: ${total}`);
  
  await prisma.$disconnect();
}

alimenterExtras().catch(console.error);
