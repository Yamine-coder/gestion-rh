const prisma = require('../prisma/client');
const { getWorkDayBounds } = require('../config/workDayConfig');
const { toLocalDateString } = require('../utils/dateUtils');
const scoringService = require('../services/scoringService');
const { sendAnomalieUrgente } = require('../services/notificationEmailService');
const { isEntree, isSortie, filtrerEntrees, filtrerSorties, trouverPremiereEntree, calculerHeuresReelles, TYPES_ENTREE, TYPES_SORTIE, TYPE_CANONIQUE_ENTREE, TYPE_CANONIQUE_SORTIE } = require('../utils/pointageTypeUtils');
const { parseSegments } = require('../utils/segmentUtils');
const { getBusinessDayBoundsUTC } = require('../utils/businessDayUtils');

// ========== MISE À JOUR DES PAIEMENTS EXTRAS APRÈS POINTAGE DÉPART ==========
/**
 * Met à jour les PaiementExtra du jour pour un employé après son pointage de départ
 * Calcule les heures réelles travaillées depuis les pointages
 */
const mettreAJourPaiementsExtrasApresPointage = async (userId, datePointage) => {
  const dateStr = toLocalDateString(datePointage);
  
  try {
    // 1. Récupérer les PaiementExtra non pointés pour ce jour et cet employé
    const paiementsExtras = await prisma.paiementExtra.findMany({
      where: {
        employeId: parseInt(userId),
        date: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: new Date(`${dateStr}T23:59:59.999Z`)
        },
        source: 'shift_extra', // Uniquement les shift_extra (les autres n'ont pas besoin de pointage)
        pointageValide: false,
        statut: 'a_payer'
      },
      include: {
        employe: { select: { nom: true, prenom: true } }
      }
    });

    if (paiementsExtras.length === 0) {
      return { updated: 0 };
    }

    // Bornes du jour business (05:00 Paris → 04:59 J+1)
    const { end: dateFinEtendue } = getBusinessDayBoundsUTC(dateStr);
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: parseInt(userId),
        horodatage: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: dateFinEtendue
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    if (pointages.length < 2) {
      return { updated: 0 };
    }

    // 3. Pour chaque PaiementExtra, calculer les heures réelles
    let updated = 0;
    
    for (const paiement of paiementsExtras) {
      // Récupérer le shift pour avoir les horaires du segment extra
      const shift = await prisma.shift.findUnique({
        where: { id: paiement.shiftId }
      });

      if (!shift || !shift.segments || paiement.segmentIndex === null) {
        continue;
      }

      const segment = shift.segments[paiement.segmentIndex];
      if (!segment) {
        continue;
      }

      // 4. Trouver les pointages qui correspondent au segment extra
      const [segStartH, segStartM] = segment.start.split(':').map(Number);
      const [segEndH, segEndM] = segment.end.split(':').map(Number);
      let segmentDebutMinutes = segStartH * 60 + segStartM;
      let segmentFinMinutes = segEndH * 60 + segEndM;
      if (segmentFinMinutes < segmentDebutMinutes) segmentFinMinutes += 24 * 60; // Shift de nuit

      const tolerance = 120; // 2 heures de tolérance

      let arrivee = null;
      let depart = null;

      for (const p of pointages) {
        const pDate = new Date(p.horodatage);
        const pMinutes = pDate.getHours() * 60 + pDate.getMinutes();

        // Vérifier si le pointage est dans la plage du segment (avec tolérance)
        const estDansPlage = pMinutes >= (segmentDebutMinutes - tolerance) && 
                            pMinutes <= (segmentFinMinutes + tolerance);

        if (estDansPlage) {
          // ✅ CORRIGÉ: Utiliser les helpers centralisés pour vérifier les types
          if (isEntree(p.type) && !arrivee) {
            arrivee = pDate;
          } else if (isSortie(p.type) && arrivee && !depart) {
            depart = pDate;
          }
        }
      }

      // 5. Si on a arrivée ET départ, calculer et mettre à jour
      if (arrivee && depart) {
        const dureeMs = depart - arrivee;
        const heuresReelles = Math.round((dureeMs / (1000 * 60 * 60)) * 100) / 100;
        const heuresPrevues = parseFloat(paiement.heuresPrevues) || parseFloat(paiement.heures);
        const ecartHeures = Math.round((heuresReelles - heuresPrevues) * 100) / 100;

        const arriveeH = arrivee.getHours().toString().padStart(2, '0');
        const arriveeM = arrivee.getMinutes().toString().padStart(2, '0');
        const departH = depart.getHours().toString().padStart(2, '0');
        const departM = depart.getMinutes().toString().padStart(2, '0');

        // Mettre à jour le montant si les heures ont changé
        const tauxHoraire = parseFloat(paiement.tauxHoraire);
        const nouveauMontant = Math.round(heuresReelles * tauxHoraire * 100) / 100;

        await prisma.paiementExtra.update({
          where: { id: paiement.id },
          data: {
            pointageValide: true,
            heuresReelles: heuresReelles,
            heures: heuresReelles, // Mettre à jour les heures à payer
            montant: nouveauMontant,
            ecartHeures: ecartHeures,
            arriveeReelle: `${arriveeH}:${arriveeM}`,
            departReelle: `${departH}:${departM}`
          }
        });

        updated++;
      }
    }

    return { updated };
  } catch (error) {
    console.error('❌ Erreur mise à jour PaiementExtra après pointage:', error);
    return { updated: 0, error: error.message };
  }
};

// ========== FONCTION DE DÉTECTION AUTOMATIQUE DES ANOMALIES ==========
const detecterEtCreerAnomalie = async (userId, pointage, type) => {
  const horodatage = new Date(pointage.horodatage);
  const dateStr = toLocalDateString(horodatage);
  
  // 🌙 Pour les départs post-minuit (00:00-05:00), chercher aussi le shift de la VEILLE
  const heureLocale = parseInt(horodatage.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }));
  const cherchVeille = isSortie(type) && heureLocale < 5;
  
  let shift = await prisma.shift.findFirst({
    where: {
      employeId: parseInt(userId),
      date: {
        gte: new Date(`${dateStr}T00:00:00.000Z`),
        lt: new Date(`${dateStr}T23:59:59.999Z`)
      },
      type: 'travail'
    }
  });

  // Si pas de shift aujourd'hui et départ post-minuit, chercher le shift de la veille
  if (!shift && cherchVeille) {
    const veille = new Date(horodatage.getTime() - 24 * 60 * 60 * 1000);
    const dateVeille = toLocalDateString(veille);
    shift = await prisma.shift.findFirst({
      where: {
        employeId: parseInt(userId),
        date: {
          gte: new Date(`${dateVeille}T00:00:00.000Z`),
          lt: new Date(`${dateVeille}T23:59:59.999Z`)
        },
        type: 'travail'
      }
    });
  }

  if (!shift) {
    return;
  }

  // Filtrer les segments de travail (exclure pauses)
  const segments = parseSegments(shift.segments);
  const workSegments = segments.filter(seg => {
    const segType = seg.type?.toLowerCase();
    return segType !== 'pause' && segType !== 'break';
  });

  if (!workSegments.length) return;

  const heurePointage = horodatage.getHours() * 60 + horodatage.getMinutes();
  const TOLERANCE_MINUTES = 5; // Tolérance de 5 minutes

  // ===== DÉTECTION RETARD (sur ENTRÉE) =====
  if (isEntree(type)) {
    // Vérifier si c'est la première arrivée du jour
    const pointagesAvant = await prisma.pointage.findFirst({
      where: {
        userId: parseInt(userId),
        type: { in: TYPES_ENTREE },
        horodatage: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: horodatage
        }
      }
    });

    // Si c'est la première arrivée, vérifier le retard (indicateur seulement, pas d'anomalie)
    // Les retards sont comptabilisés dans le score de ponctualité et affichés visuellement sur le planning
    // Pas de création d'anomalie pour éviter le bruit - pratique standard SIRH
    if (!pointagesAvant) {
      const firstSegment = workSegments[0];
      const planStart = firstSegment.start || firstSegment.debut;
      
      if (planStart) {
        const [planH, planM] = planStart.split(':').map(Number);
        const planMinutes = planH * 60 + planM;
        const ecartMinutes = heurePointage - planMinutes;

        if (ecartMinutes > TOLERANCE_MINUTES) {
          const heureReelle = `${String(horodatage.getHours()).padStart(2, '0')}:${String(horodatage.getMinutes()).padStart(2, '0')}`;
          // Log informatif seulement - pas de création d'anomalie
        }
      }
    }
  }

  // ===== DÉTECTION DÉPART ANTICIPÉ (sur SORTIE) =====
  // Les départs anticipés sont comptabilisés dans les stats et affichés visuellement sur le planning
  // Pas de création d'anomalie pour éviter le bruit - pratique standard SIRH
  if (isSortie(type)) {
    const lastSegment = workSegments[workSegments.length - 1];
    const planEnd = lastSegment.end || lastSegment.fin;
    
    if (planEnd) {
      const [planH, planM] = planEnd.split(':').map(Number);
      const planMinutes = planH * 60 + planM;
      const ecartMinutes = planMinutes - heurePointage;

      if (ecartMinutes > TOLERANCE_MINUTES) {
        const heureReelle = `${String(horodatage.getHours()).padStart(2, '0')}:${String(horodatage.getMinutes()).padStart(2, '0')}`;
        // Log informatif seulement - pas de création d'anomalie
      }
    }
  }
};

// ✅ Enregistrer un pointage (arrivée ou départ)
const enregistrerPointage = async (req, res) => {
  const { type, horodatage, userId: targetUserId } = req.body;
  
  // Pour les admins, permettre de pointer pour n'importe quel utilisateur
  const userId = targetUserId || req.user.userId;

  // 🛡️ Validations de sécurité renforcées
  if (!isEntree(type) && !isSortie(type)) {
    return res.status(400).json({ error: 'Type de pointage invalide. Types reconnus: arrivee/depart, entree/sortie, ENTRÉE/SORTIE.' });
  }

  // Normaliser le type vers le format canonique (arrivee/depart)
  const typeNormalise = isEntree(type) ? TYPE_CANONIQUE_ENTREE : TYPE_CANONIQUE_SORTIE;

  // Validation userId
  if (!userId || userId <= 0) {
    return res.status(400).json({ error: 'UserId invalide' });
  }

  // Validation horodatage si fourni
  if (horodatage) {
    const datePointage = new Date(horodatage);
    const maintenant = new Date();
    const uneHeure = 60 * 60 * 1000; // 1 heure en ms
    const septJours = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms

    // Empêcher les pointages futurs (tolérance: 1h)
    if (datePointage > maintenant.getTime() + uneHeure) {
      return res.status(400).json({ 
        error: 'Impossible de pointer dans le futur',
        details: `Date fournie: ${datePointage.toISOString()}, limite: ${new Date(maintenant.getTime() + uneHeure).toISOString()}`
      });
    }

    // Empêcher les pointages trop anciens (limite: 7 jours)
    if (datePointage < maintenant.getTime() - septJours) {
      return res.status(400).json({ 
        error: 'Impossible de pointer plus de 7 jours dans le passé',
        details: `Date fournie: ${datePointage.toISOString()}, limite: ${new Date(maintenant.getTime() - septJours).toISOString()}`
      });
    }

    // Validation format date
    if (isNaN(datePointage.getTime())) {
      return res.status(400).json({ error: 'Format de date invalide' });
    }
  }

  try {
    // 🛡️ Vérification anti-doublon renforcée avant insertion
    const maintenant = new Date();
    const limiteAntiDoublon = new Date(maintenant.getTime() - 5000); // 5 secondes

    // Vérifier s'il existe déjà un pointage identique dans les 5 dernières secondes
    const pointageRecentIdentique = await prisma.pointage.findFirst({
      where: {
        userId: parseInt(userId),
        type: typeNormalise,
        horodatage: {
          gte: limiteAntiDoublon
        }
      }
    });

    if (pointageRecentIdentique) {
      return res.status(409).json({ 
        error: 'Pointage identique trop récent',
        details: `Un ${typeNormalise} a déjà été enregistré il y a moins de 5 secondes`
      });
    }

    const data = {
      type: typeNormalise,
      userId: parseInt(userId),
    };
    
    // Si horodatage spécifié (pour les tests), l'utiliser
    if (horodatage) {
      data.horodatage = new Date(horodatage);
    }

    const pointage = await prisma.pointage.create({
      data,
    });

    // ========== DÉTECTION AUTOMATIQUE DES ANOMALIES ==========
    try {
      await detecterEtCreerAnomalie(userId, pointage, typeNormalise);
    } catch (anomalieError) {
      console.error('⚠️ Erreur lors de la détection d\'anomalie (non bloquante):', anomalieError);
    }

    // ========== SCORING AUTOMATIQUE (sur arrivée) ==========
    if (isEntree(typeNormalise)) {
      try {
        // Récupérer le shift du jour pour comparer l'heure d'arrivée
        const datePointage = horodatage ? new Date(horodatage) : new Date();
        const dateStr = datePointage.toISOString().split('T')[0];
        
        const shift = await prisma.shift.findFirst({
          where: {
            employeId: parseInt(userId),
            date: new Date(dateStr)
          }
        });
        
        if (shift && shift.segments && shift.segments.length > 0) {
          const heurePointage = datePointage.toTimeString().slice(0, 5);
          await scoringService.onPointage(
            { 
              id: pointage.id, 
              employe_id: parseInt(userId), 
              type: 'arrivee', 
              heure: heurePointage,
              date: dateStr
            },
            { start: shift.segments[0].start, end: shift.segments[0].end }
          );
        }
      } catch (scoringError) {
        console.error('⚠️ Erreur scoring (non bloquante):', scoringError.message);
      }
    }

    // ========== MISE À JOUR DES PAIEMENTS EXTRAS (sur départ) ==========
    if (isSortie(typeNormalise)) {
      try {
        const datePointage = horodatage ? new Date(horodatage) : new Date();
        const result = await mettreAJourPaiementsExtrasApresPointage(userId, datePointage);
      } catch (extraError) {
        console.error('⚠️ Erreur mise à jour PaiementExtra (non bloquante):', extraError);
      }
    }

    res.status(201).json({ message: 'Pointage enregistré', pointage });
  } catch (error) {
    console.error('Erreur enregistrerPointage:', error);
    
    // Gestion spécifique des erreurs de contraintes DB
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ 
        error: 'Pointage en doublon détecté',
        details: 'Ce pointage a déjà été enregistré'
      });
    }
    
    if (error.code === 'P2003') { // Foreign key constraint
      return res.status(400).json({ 
        error: 'Utilisateur invalide',
        details: 'L\'utilisateur spécifié n\'existe pas'
      });
    }

    res.status(500).json({ error: 'Erreur lors du pointage' });
  }
};

// ✅ Récupérer les pointages d'un utilisateur connecté
const getMesPointages = async (req, res) => {
  const userId = req.user.userId;

  try {
    const pointages = await prisma.pointage.findMany({
      where: { userId },
      orderBy: { horodatage: 'desc' },
    });

    res.status(200).json(pointages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des pointages' });
  }
};

// ✅ Récupérer les pointages du jour actuel pour l'utilisateur connecté
// NOUVELLE LOGIQUE : Gère le travail de nuit (ex: 22h - 06h du lendemain)
const getMesPointagesAujourdhui = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Utiliser la configuration centralisée pour les bornes de journée
    const { debutJournee, finJournee } = getWorkDayBounds();

    const pointages = await prisma.pointage.findMany({
      where: { 
        userId,
        horodatage: {
          gte: debutJournee,
          lt: finJournee  // < au lieu de <= pour éviter les doublons
        }
      },
      orderBy: { horodatage: 'asc' }, // Chronologique pour l'affichage du jour
    });

    res.status(200).json(pointages);
  } catch (error) {
    console.error('Erreur getMesPointagesAujourdhui:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des pointages du jour' });
  }
};

// ✅ Admin : récupérer les pointages d'un jour donné pour tous les utilisateurs
const getPointagesParJour = async (req, res) => {
  const date = req.params.date;

  try {
    const { start: debutJour, end: finEtendue } = getBusinessDayBoundsUTC(date);

    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: debutJour,
          lte: finEtendue,
        },
      },
      orderBy: {
        horodatage: 'asc',
      },
      include: {
        user: {
          select: { id: true, email: true, nom: true, prenom: true },
        },
      },
    });

    const groupedByUser = {};

    pointages.forEach((p) => {
      const userId = p.user.id;
      if (!groupedByUser[userId]) {
        groupedByUser[userId] = {
          email: p.user.email,
          nom: p.user.nom,
          prenom: p.user.prenom,
          blocs: [],
        };
      }
      const userBlocs = groupedByUser[userId].blocs;

      if (isEntree(p.type)) {
        // Si le dernier bloc est incomplet (pas de départ), on n'en crée pas un nouveau
        if (userBlocs.length === 0 || userBlocs[userBlocs.length - 1].depart) {
          userBlocs.push({ arrivee: p.horodatage });
        }
        // Sinon, on ignore l'arrivée (cas d'anomalie)
      } else if (isSortie(p.type)) {
        // On complète le dernier bloc sans départ
        const lastBloc = userBlocs[userBlocs.length - 1];
        if (lastBloc && !lastBloc.depart) {
          lastBloc.depart = p.horodatage;
          const diffMs = new Date(p.horodatage) - new Date(lastBloc.arrivee);
          const h = Math.floor(diffMs / 3600000);
          const m = Math.floor((diffMs % 3600000) / 60000);
          lastBloc.duree = `${h}h ${m < 10 ? '0' : ''}${m}min`;
        } else {
          // Cas rare : départ sans arrivée, on crée un bloc orphelin
          userBlocs.push({ depart: p.horodatage });
        }
      }
    });

    const final = Object.values(groupedByUser).map((user) => {
      let totalMs = 0;

      user.blocs.forEach((b) => {
        if (b.arrivee && b.depart) {
          totalMs += new Date(b.depart) - new Date(b.arrivee);
          // Garder les dates ISO pour le frontend
          // b.arrivee et b.depart restent au format ISO
        }
      });

      const totalH = Math.floor(totalMs / 3600000);
      const totalM = Math.floor((totalMs % 3600000) / 60000);

      return {
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        blocs: user.blocs,
        total: `${totalH}h ${totalM < 10 ? '0' : ''}${totalM}min`,
      };
    });

    res.json(final);
  } catch (err) {
    console.error("Erreur récupération pointages jour :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = {
  enregistrerPointage,
  getMesPointages,
  getMesPointagesAujourdhui,
  getPointagesParJour
};
