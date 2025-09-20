const express = require('express');
const router = express.Router();

const { authMiddleware: authenticateToken, adminMiddleware } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const prisma = require('../prisma/client');
const { getWorkDayBounds } = require('../config/workDayConfig');
const {
  getMesPointages,
  getMesPointagesAujourdhui,
  getPointagesParJour,
  enregistrerPointage,
} = require('../controllers/pointageController');

// 👤 Mes pointages
router.get('/mes-pointages', authenticateToken, getMesPointages);

// 📅 Mes pointages du jour actuel uniquement
router.get('/mes-pointages-aujourdhui', authenticateToken, getMesPointagesAujourdhui);

// 🔧 Pointage manuel (pour tests) - Admin uniquement
router.post('/manuel', authenticateToken, isAdmin, enregistrerPointage);

// 👨‍💼 Admin : pointages d’un jour
router.get('/admin/pointages/jour/:date', authenticateToken, isAdmin, getPointagesParJour);

// 🔁 Pointage automatique avec max 2 blocs (arrivee → depart → arrivee → depart)
// NOUVELLE LOGIQUE : Gère le travail de nuit + validations de sécurité
router.post('/auto', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 🛡️ Validations de sécurité
    if (!userId || userId <= 0) {
      return res.status(400).json({ message: "UserId invalide" });
    }

    // Utiliser la configuration centralisée
    const { debutJournee, finJournee } = getWorkDayBounds();

    console.log(`🔁 POINTAGE AUTO pour journée: ${debutJournee.toLocaleString()} → ${finJournee.toLocaleString()}`);

    const pointagesDuJour = await prisma.pointage.findMany({
      where: {
        userId,
        horodatage: { 
          gte: debutJournee,
          lt: finJournee 
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    const dernier = pointagesDuJour[pointagesDuJour.length - 1];

    // 🔢 Compter le nombre de paires "arrivee → depart"
    let paires = 0;
    for (let i = 0; i < pointagesDuJour.length - 1; i++) {
      if (
        pointagesDuJour[i].type === 'arrivee' &&
        pointagesDuJour[i + 1].type === 'depart'
      ) {
        paires++;
      }
    }

    // 🔒 Si déjà 2 paires → journée terminée
    if (paires >= 2) {
      return res.status(400).json({ message: "Vous avez terminé votre journée (2 blocs max)." });
    }

    // ✅ Déduction du prochain type
    let type = null;

    if (!dernier) {
      type = 'arrivee';
    } else if (dernier.type === 'arrivee') {
      type = 'depart';
    } else if (dernier.type === 'depart') {
      type = 'arrivee';
    }

    if (!type) {
      return res.status(400).json({ message: "Pointage impossible à déterminer." });
    }

    // 🛡️ Protection anti-doublon renforcée (même type dans les 5 dernières secondes)
    const maintenant = new Date();
    const limiteAntiDoublon = new Date(maintenant.getTime() - 5000); // 5 secondes avant

    const pointageRecentIdentique = await prisma.pointage.findFirst({
      where: {
        userId,
        type,
        horodatage: {
          gte: limiteAntiDoublon
        }
      }
    });

    if (pointageRecentIdentique) {
      return res.status(409).json({ 
        message: "Pointage identique trop récent",
        details: `Un ${type} a déjà été enregistré il y a moins de 5 secondes`
      });
    }

    const nouveau = await prisma.pointage.create({
      data: {
        userId,
        type,
        horodatage: maintenant
      }
    });

    res.status(201).json({
      message: `✅ ${type === 'arrivee' ? 'Arrivée' : 'Départ'} enregistré`,
      pointage: nouveau
    });
  } catch (err) {
    console.error("Erreur pointage auto :", err);
    
    // Gestion spécifique des erreurs de contraintes
    if (err.code === 'P2002') {
      return res.status(409).json({ 
        message: "Pointage en doublon détecté",
        details: "Ce pointage a déjà été enregistré"
      });
    }
    
    res.status(500).json({ message: "Erreur serveur dans le pointage automatique." });
  }
});

// 🧮 CALCUL DU TEMPS TOTAL TRAVAILLÉ AUJOURD'HUI
// NOUVELLE LOGIQUE : Gère le travail de nuit (ex: 22h - 06h du lendemain)
router.get('/total-aujourdhui', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Utiliser la configuration centralisée
    const { debutJournee, finJournee } = getWorkDayBounds();

    console.log(`🧮 CALCUL TEMPS pour journée: ${debutJournee.toLocaleString()} → ${finJournee.toLocaleString()}`);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId,
        horodatage: { 
          gte: debutJournee,
          lt: finJournee 
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    let totalMinutes = 0;
    let pairesValides = 0;

    for (let i = 0; i < pointages.length - 1; i++) {
      const debut = pointages[i];
      const fin = pointages[i + 1];

      if (debut.type === 'arrivee' && fin.type === 'depart') {
        const debutTime = new Date(debut.horodatage);
        const finTime = new Date(fin.horodatage);

        const diffMinutes = Math.floor((finTime - debutTime) / 60000); // 1 min = 60000 ms
        if (diffMinutes > 0) {
          totalMinutes += diffMinutes;
          pairesValides++;
        }
        i++; // on saute l'élément suivant (déjà utilisé comme "fin")
      }
    }

    const totalHeures = Math.round((totalMinutes / 60) * 100) / 100; // ex : 7.5

    console.log(`✅ RÉSULTAT: ${totalHeures}h (${pairesValides} paires) sur ${pointages.length} pointages`);

    res.json({
      totalHeures,
      pairesValides,
      pointagesCount: pointages.length,
      periodeJournee: {
        debut: debutJournee,
        fin: finJournee
      }
    });
  } catch (err) {
    console.error("Erreur calcul total heures :", err);
    res.status(500).json({ message: "Erreur serveur lors du calcul des heures." });
  }
});

// 🗑️ Supprimer un pointage erroné (Admin uniquement)
router.delete('/delete-error', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { employeId, date, reason } = req.body;

    console.log(`🗑️ Suppression pointage erroné - Employé: ${employeId}, Date: ${date}, Raison: ${reason}`);

    // Valider les paramètres
    if (!employeId || !date || !reason) {
      return res.status(400).json({ 
        message: "Paramètres manquants: employeId, date et reason sont requis" 
      });
    }

    // Convertir la date pour la recherche (début et fin de journée)
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Chercher les pointages de l'employé pour cette date
    const pointagesToDelete = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (pointagesToDelete.length === 0) {
      return res.status(404).json({ 
        message: "Aucun pointage trouvé pour cet employé à cette date" 
      });
    }

    // Supprimer tous les pointages de cette date pour cet employé
    const deleteResult = await prisma.pointage.deleteMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    console.log(`✅ ${deleteResult.count} pointage(s) supprimé(s) pour employé ${employeId} le ${date}`);

    // Optionnel: Logger l'action admin
    try {
      await prisma.logAdmin.create({
        data: {
          adminId: req.user.userId,
          action: 'DELETE_POINTAGE_ERROR',
          details: JSON.stringify({
            employeId: parseInt(employeId),
            date: date,
            reason: reason,
            deletedCount: deleteResult.count,
            timestamp: new Date().toISOString()
          })
        }
      });
    } catch (logError) {
      console.warn('⚠️ Impossible de logger l\'action admin:', logError.message);
      // Ne pas faire échouer la suppression si le log échoue
    }

    res.json({
      success: true,
      message: `${deleteResult.count} pointage(s) supprimé(s) avec succès`,
      deletedCount: deleteResult.count,
      reason: reason
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du pointage:', error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la suppression du pointage",
      error: error.message 
    });
  }
});

module.exports = router;
