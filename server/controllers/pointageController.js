const prisma = require('../prisma/client');
const { getWorkDayBounds } = require('../config/workDayConfig');

// ✅ Enregistrer un pointage (arrivée ou départ)
const enregistrerPointage = async (req, res) => {
  const { type, horodatage, userId: targetUserId } = req.body;
  
  // Pour les admins, permettre de pointer pour n'importe quel utilisateur
  const userId = targetUserId || req.user.userId;

  // 🛡️ Validations de sécurité renforcées
  if (type !== 'arrivee' && type !== 'depart') {
    return res.status(400).json({ error: 'Type de pointage invalide. Seuls "arrivee" et "depart" sont autorisés.' });
  }

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
        type,
        horodatage: {
          gte: limiteAntiDoublon
        }
      }
    });

    if (pointageRecentIdentique) {
      return res.status(409).json({ 
        error: 'Pointage identique trop récent',
        details: `Un ${type} a déjà été enregistré il y a moins de 5 secondes`
      });
    }

    const data = {
      type,
      userId: parseInt(userId),
    };
    
    // Si horodatage spécifié (pour les tests), l'utiliser
    if (horodatage) {
      data.horodatage = new Date(horodatage);
    }

    const pointage = await prisma.pointage.create({
      data,
    });

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

    console.log(`📅 JOURNÉE DE TRAVAIL: ${debutJournee.toLocaleString()} → ${finJournee.toLocaleString()}`);

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

    console.log(`✅ ${pointages.length} pointages trouvés pour la journée de travail`);
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
    const debutJour = new Date(`${date}T00:00:00`);
    const finJour = new Date(`${date}T23:59:59`);
    // Ajoute une plage pour les départs après minuit (ex: jusqu'à 6h du matin du lendemain)
    const finEtendue = new Date(debutJour);
    finEtendue.setDate(finEtendue.getDate() + 1);
    finEtendue.setHours(6, 0, 0, 0);

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

    console.log('DEBUG: Premier pointage trouvé:', pointages.length > 0 ? {
      user: pointages[0].user,
      type: pointages[0].type
    } : 'Aucun pointage');

    const groupedByUser = {};

    console.log('🔍 ÉTAPE 1 - Données brutes des pointages:', pointages.length, 'pointages trouvés');
    if (pointages.length > 0) {
      console.log('Premier pointage:', {
        user: pointages[0].user,
        type: pointages[0].type,
        horodatage: pointages[0].horodatage
      });
    }

    pointages.forEach((p) => {
      const userId = p.user.id;
      if (!groupedByUser[userId]) {
        console.log('🔍 ÉTAPE 2 - Création utilisateur:', {
          userId,
          email: p.user.email,
          nom: p.user.nom,
          prenom: p.user.prenom,
          nomType: typeof p.user.nom,
          prenomType: typeof p.user.prenom
        });
        groupedByUser[userId] = {
          email: p.user.email,
          nom: p.user.nom,
          prenom: p.user.prenom,
          blocs: [],
        };
      }
      const userBlocs = groupedByUser[userId].blocs;

      if (p.type === 'arrivee') {
        // Si le dernier bloc est incomplet (pas de départ), on n'en crée pas un nouveau
        if (userBlocs.length === 0 || userBlocs[userBlocs.length - 1].depart) {
          userBlocs.push({ arrivee: p.horodatage });
        }
        // Sinon, on ignore l'arrivée (cas d'anomalie)
      } else if (p.type === 'depart') {
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
          console.log(`Pointage pour ${user.email}: ${new Date(b.arrivee).toISOString()} -> ${new Date(b.depart).toISOString()}`);
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

    console.log('DEBUG: Données finales à envoyer:', final.length > 0 ? {
      premier_utilisateur: {
        email: final[0].email,
        nom: final[0].nom,
        prenom: final[0].prenom
      }
    } : 'Aucune donnée finale');

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
