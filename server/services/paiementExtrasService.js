// server/services/paiementExtrasService.js
const prisma = require('../prisma/client');

const TAUX_HORAIRE_DEFAUT = 10; // €/h par défaut

/**
 * Créer un paiement extra depuis une anomalie d'heures supplémentaires
 */
async function creerPaiementDepuisAnomalie(anomalie, adminId) {
  // Vérifier si un paiement existe déjà pour cette anomalie
  const existant = await prisma.paiementExtra.findFirst({
    where: { anomalieId: anomalie.id }
  });
  
  if (existant) {
    return existant;
  }
  
  // Récupérer l'employé
  const employe = await prisma.user.findUnique({
    where: { id: anomalie.employeId },
    select: { id: true, nom: true, prenom: true }
  });
  
  const heures = parseFloat(anomalie.heuresExtra) || 0;
  const tauxHoraire = TAUX_HORAIRE_DEFAUT; // 10€/h par défaut
  const montant = anomalie.montantExtra ? parseFloat(anomalie.montantExtra) : (heures * tauxHoraire);
  
  if (heures <= 0 && montant <= 0) {
    return null;
  }
  
  const paiement = await prisma.paiementExtra.create({
    data: {
      employeId: anomalie.employeId,
      date: anomalie.date,
      heures: heures,
      montant: montant,
      tauxHoraire: tauxHoraire,
      source: 'anomalie_heures_sup',
      anomalieId: anomalie.id,
      statut: 'a_payer',
      creePar: adminId,
      commentaire: `Heures supplémentaires du ${anomalie.date.toLocaleDateString('fr-FR')}`
    }
  });
  
  return paiement;
}

/**
 * Créer un paiement extra depuis un segment extra d'un shift
 */
async function creerPaiementDepuisShiftExtra(shift, segmentIndex, adminId) {
  // Vérifier si un paiement existe déjà pour ce shift/segment
  const existant = await prisma.paiementExtra.findFirst({
    where: { 
      shiftId: shift.id,
      segmentIndex: segmentIndex
    }
  });
  
  if (existant) {
    return existant;
  }
  
  const segment = shift.segments[segmentIndex];
  if (!segment || (!segment.isExtra && !segment.extra)) {
    return null;
  }
  
  // Calculer les heures prévues du segment
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  let heuresPrevues = (endH + endM/60) - (startH + startM/60);
  
  // Gérer les shifts de nuit (fin avant début = franchit minuit)
  if (heuresPrevues < 0) {
    heuresPrevues += 24;
  }
  
  // Récupérer l'employé (tauxHoraireExtra n'existe pas, utiliser le taux par défaut)
  const employe = await prisma.user.findUnique({
    where: { id: shift.employeId },
    select: { id: true, nom: true, prenom: true }
  });
  
  const tauxHoraire = TAUX_HORAIRE_DEFAUT; // 10€/h par défaut
  
  // Calculer les heures réelles depuis les pointages
  const heuresReellesResult = await calculerHeuresReellesDepuisPointages(shift.employeId, shift.date, segment);
  
  // Utiliser les heures réelles si disponibles, sinon les heures prévues
  const heuresAPayer = heuresReellesResult.heuresReelles !== null ? heuresReellesResult.heuresReelles : heuresPrevues;
  const montant = segment.extraMontant ? parseFloat(segment.extraMontant) : (heuresAPayer * tauxHoraire);
  
  const paiement = await prisma.paiementExtra.create({
    data: {
      employeId: shift.employeId,
      date: shift.date,
      heures: heuresAPayer,
      montant: montant,
      tauxHoraire: tauxHoraire,
      heuresPrevues: heuresPrevues,
      heuresReelles: heuresReellesResult.heuresReelles,
      ecartHeures: heuresReellesResult.heuresReelles !== null ? (heuresReellesResult.heuresReelles - heuresPrevues) : null,
      pointageValide: heuresReellesResult.pointageComplet,
      arriveeReelle: heuresReellesResult.arriveeReelle,
      departReelle: heuresReellesResult.departReelle,
      source: 'shift_extra',
      shiftId: shift.id,
      segmentIndex: segmentIndex,
      statut: segment.paymentStatus === 'payé' ? 'paye' : 'a_payer',
      creePar: adminId,
      commentaire: segment.commentaire || `Segment extra ${segment.start}-${segment.end}`
    }
  });
  
  return paiement;
}

/**
 * Calculer les heures réellement travaillées depuis les pointages
 * pour un segment extra donné
 */
async function calculerHeuresReellesDepuisPointages(employeId, date, segment) {
  // Récupérer les pointages du jour pour cet employé
  const dateDebut = new Date(date);
  dateDebut.setHours(0, 0, 0, 0);
  const dateFin = new Date(date);
  dateFin.setHours(23, 59, 59, 999);
  
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: employeId,
      horodatage: {
        gte: dateDebut,
        lte: dateFin
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  if (pointages.length === 0) {
    return { heuresReelles: null, pointageComplet: false };
  }
  
  // Trouver les pointages qui correspondent au segment extra
  const [segStartH, segStartM] = segment.start.split(':').map(Number);
  const [segEndH, segEndM] = segment.end.split(':').map(Number);
  const segmentDebutMinutes = segStartH * 60 + segStartM;
  let segmentFinMinutes = segEndH * 60 + segEndM;
  if (segmentFinMinutes < segmentDebutMinutes) segmentFinMinutes += 24 * 60; // Shift de nuit
  
  // Chercher un pointage d'arrivée et de départ dans la plage du segment (avec tolérance de 2h)
  const tolerance = 120; // 2 heures de tolérance
  
  let arrivee = null;
  let depart = null;
  
  for (const p of pointages) {
    const pDate = new Date(p.horodatage);
    const pMinutes = pDate.getHours() * 60 + pDate.getMinutes();
    
    // Vérifier si le pointage est dans la plage du segment (avec tolérance)
    const estDansPlage = pMinutes >= (segmentDebutMinutes - tolerance) && pMinutes <= (segmentFinMinutes + tolerance);
    
    if (estDansPlage) {
      if (p.type === 'arrivee' && !arrivee) {
        arrivee = pDate;
      } else if (p.type === 'depart' && arrivee) {
        depart = pDate;
      }
    }
  }
  
  if (!arrivee) {
    return { heuresReelles: null, pointageComplet: false, arriveeReelle: null, departReelle: null };
  }
  
  if (!depart) {
    // Seulement arrivée, pas encore de départ
    const arriveeH = arrivee.getHours().toString().padStart(2, '0');
    const arriveeM = arrivee.getMinutes().toString().padStart(2, '0');
    return { 
      heuresReelles: null, 
      pointageComplet: false,
      arriveeReelle: `${arriveeH}:${arriveeM}`,
      departReelle: null
    };
  }
  
  // Calculer la durée réelle
  const dureeMs = depart - arrivee;
  const heuresReelles = dureeMs / (1000 * 60 * 60);
  
  // Formater les heures de pointage
  const arriveeH = arrivee.getHours().toString().padStart(2, '0');
  const arriveeM = arrivee.getMinutes().toString().padStart(2, '0');
  const departH = depart.getHours().toString().padStart(2, '0');
  const departM = depart.getMinutes().toString().padStart(2, '0');
  
  return { 
    heuresReelles: Math.round(heuresReelles * 100) / 100, // Arrondir à 2 décimales
    pointageComplet: true,
    arriveeReelle: `${arriveeH}:${arriveeM}`,
    departReelle: `${departH}:${departM}`
  };
}

/**
 * Mettre à jour les heures réelles d'un paiement extra existant
 * (à appeler après un pointage de départ)
 */
async function mettreAJourHeuresReelles(paiementId) {
  const paiement = await prisma.paiementExtra.findUnique({
    where: { id: paiementId },
    include: { employe: true }
  });
  
  if (!paiement || !paiement.shiftId) {
    return null;
  }
  
  const shift = await prisma.shift.findUnique({
    where: { id: paiement.shiftId }
  });
  
  if (!shift || !shift.segments || paiement.segmentIndex === null) {
    return null;
  }
  
  const segment = shift.segments[paiement.segmentIndex];
  if (!segment) return null;
  
  const heuresReellesResult = await calculerHeuresReellesDepuisPointages(paiement.employeId, paiement.date, segment);
  
  if (heuresReellesResult.heuresReelles === null) {
    return paiement; // Pas de changement
  }
  
  const heuresPrevues = parseFloat(paiement.heuresPrevues) || parseFloat(paiement.heures);
  const ecart = heuresReellesResult.heuresReelles - heuresPrevues;
  
  // Mettre à jour avec les heures réelles
  const updated = await prisma.paiementExtra.update({
    where: { id: paiementId },
    data: {
      heuresReelles: heuresReellesResult.heuresReelles,
      ecartHeures: ecart,
      pointageValide: heuresReellesResult.pointageComplet,
      arriveeReelle: heuresReellesResult.arriveeReelle,
      departReelle: heuresReellesResult.departReelle,
      heures: heuresReellesResult.heuresReelles, // Mettre à jour les heures à payer
      montant: heuresReellesResult.heuresReelles * parseFloat(paiement.tauxHoraire),
      derniereModif: new Date()
    }
  });
  
  return updated;
}

/**
 * Recalculer les heures réelles pour tous les paiements non validés d'une date
 */
async function recalculerHeuresReellesPourDate(date) {
  const dateDebut = new Date(date);
  dateDebut.setHours(0, 0, 0, 0);
  const dateFin = new Date(date);
  dateFin.setHours(23, 59, 59, 999);
  
  const paiements = await prisma.paiementExtra.findMany({
    where: {
      date: { gte: dateDebut, lte: dateFin },
      source: 'shift_extra',
      statut: 'a_payer'
    }
  });
  
  const resultats = [];
  for (const p of paiements) {
    const updated = await mettreAJourHeuresReelles(p.id);
    if (updated) {
      resultats.push(updated);
    }
  }
  
  return resultats;
}

/**
 * Synchroniser tous les paiements extras depuis les anomalies et shifts
 */
async function synchroniserTousLesPaiements(adminId) {
  
  const resultats = {
    anomalies: { traites: 0, crees: 0, erreurs: 0 },
    shifts: { traites: 0, crees: 0, erreurs: 0 }
  };
  
  // 1. Traiter les anomalies d'extras potentiels validées
  const anomaliesHS = await prisma.anomalie.findMany({
    where: {
      OR: [
        { type: 'extra_potentiel' },
        { type: 'heures_supplementaires' },
        { type: 'heures_sup_a_valider' },
        { type: { contains: 'heures_sup' } }
      ],
      statut: { in: ['valide', 'validee', 'resolu', 'traite'] }
    }
  });
  
  for (const anomalie of anomaliesHS) {
    resultats.anomalies.traites++;
    try {
      const paiement = await creerPaiementDepuisAnomalie(anomalie, adminId);
      if (paiement && !paiement.id) {
        resultats.anomalies.crees++;
      }
    } catch (error) {
      console.error(`❌ Erreur anomalie ${anomalie.id}:`, error.message);
      resultats.anomalies.erreurs++;
    }
  }
  
  // 2. Traiter les shifts avec segments extra
  const shiftsAvecSegments = await prisma.shift.findMany({
    where: {
      segments: { not: null }
    }
  });
  
  for (const shift of shiftsAvecSegments) {
    if (!shift.segments || !Array.isArray(shift.segments)) continue;
    
    for (let i = 0; i < shift.segments.length; i++) {
      const segment = shift.segments[i];
      if (segment.isExtra || segment.extra) {
        resultats.shifts.traites++;
        try {
          const paiement = await creerPaiementDepuisShiftExtra(shift, i, adminId);
          if (paiement) {
            resultats.shifts.crees++;
          }
        } catch (error) {
          console.error(`❌ Erreur shift ${shift.id} segment ${i}:`, error.message);
          resultats.shifts.erreurs++;
        }
      }
    }
  }
  
  return resultats;
}

module.exports = {
  creerPaiementDepuisAnomalie,
  creerPaiementDepuisShiftExtra,
  synchroniserTousLesPaiements,
  calculerHeuresReellesDepuisPointages,
  mettreAJourHeuresReelles,
  recalculerHeuresReellesPourDate,
  TAUX_HORAIRE_DEFAUT
};
