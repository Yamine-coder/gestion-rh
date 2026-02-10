const express = require('express');
const router = express.Router();
// FIX: l'import précédent récupérait un objet (avec authMiddleware, adminMiddleware, default)
// ce qui provoquait "argument handler must be a function". On destructure la fonction.
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const {
  getShifts,
  createOrUpdateShift,
  deleteShift,
  getExtrasSegments,
  updateExtraPayment,
  getShiftExtraLogs,
  createBatchShifts
  ,createRecurringShifts
  ,deleteRangeShifts
} = require('../controllers/shiftController');
const { getParisRangeBoundsUTC } = require('../utils/parisTimeUtils');
const { toLocalDateString } = require('../utils/dateUtils');

// Route pour les employés - accès à leurs propres shifts uniquement
router.get('/mes-shifts', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    const employeId = req.user.userId;
    
    // Bornes UTC correctes pour la plage de dates Paris (gère CET/CEST)
    const { start: startDate, end: endDate } = getParisRangeBoundsUTC(start, end);
    
    const where = {
      employeId: employeId,
      ...(start && end ? {
        date: {
          gte: startDate,
          lte: endDate,
        },
      } : {}),
    };

    const shifts = await require('../prisma/client').shift.findMany({
      where,
      include: { employe: { select: { id: true, email: true, categorie: true } } },
      orderBy: [{ date: "asc" }],
    });

    // Récupérer les congés approuvés de l'employé pour cette période
    const conges = await require('../prisma/client').conge.findMany({
      where: {
        userId: employeId,
        statut: 'approuvé',
        dateDebut: { lte: endDate },
        dateFin: { gte: startDate }
      }
    });
    
    // Créer un map des congés par date (utilise LOCAL date string)
    const congesMap = {};
    conges.forEach(conge => {
      const cStart = new Date(conge.dateDebut);
      const cEnd = new Date(conge.dateFin);
      for (let d = new Date(cStart); d <= cEnd; d.setDate(d.getDate() + 1)) {
        congesMap[toLocalDateString(d)] = conge.type || 'congé';
      }
    });
    
    // Récupérer les demandes de remplacement pour ces shifts (avec info remplaçant)
    const remplacements = await require('../prisma/client').demandeRemplacement.findMany({
      where: {
        shiftId: { in: shifts.map(s => s.id) },
        statut: { notIn: ['annulee', 'expiree'] }
      },
      select: { 
        shiftId: true, 
        statut: true,
        employeRemplacant: {
          select: { id: true, prenom: true, nom: true }
        }
      }
    });
    
    const remplacementMap = {};
    remplacements.forEach(r => {
      remplacementMap[r.shiftId] = {
        statut: r.statut,
        remplacant: r.employeRemplacant || null
      };
    });

    // Formater les shifts avec statut congé/remplacement
    const formattedShifts = shifts.map(shift => {
      const shiftDateStr = toLocalDateString(shift.date);
      const isEnConge = shiftDateStr ? congesMap[shiftDateStr] : null;
      const remplacementInfo = remplacementMap[shift.id];
      
      // Détecter si c'est un shift de remplacement (ne peut pas être re-remplacé)
      const isRemplacement = shift.motif?.toLowerCase()?.includes('remplacement de');
      
      return {
        ...shift,
        date: shift.date ? new Date(shift.date).toISOString() : null,
        estEnConge: !!isEnConge,
        typeConge: isEnConge || null,
        remplacementStatut: remplacementInfo?.statut || null,
        remplacant: remplacementInfo?.remplacant || null,
        isRemplacement: isRemplacement // Flag pour bloquer demande de remplacement
      };
    });

    res.json(formattedShifts);
  } catch (error) {
    console.error('Erreur récupération shifts employé:', error);
    res.status(500).json({ error: "Erreur récupération de vos shifts" });
  }
});

// Route pour le planning de l'équipe (collègues de même catégorie - SANS l'utilisateur courant)
router.get('/equipe', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    const userId = req.user.userId;
    
    // Récupérer la catégorie de l'utilisateur
    const currentUser = await require('../prisma/client').user.findUnique({
      where: { id: userId },
      select: { categorie: true }
    });
    
    // Récupérer tous les employés actifs de la même catégorie SAUF l'utilisateur courant
    const whereEmploye = {
      statut: 'actif',
      role: 'employee',
      id: { not: userId } // Exclure l'utilisateur courant
    };
    
    if (currentUser?.categorie) {
      whereEmploye.categorie = currentUser.categorie;
    }
    
    const employes = await require('../prisma/client').user.findMany({
      where: whereEmploye,
      select: { 
        id: true, 
        nom: true, 
        prenom: true, 
        categorie: true,
        photoProfil: true
      },
      orderBy: [{ prenom: 'asc' }, { nom: 'asc' }]
    });
    
    // Bornes UTC correctes pour la plage de dates Paris (gère CET/CEST)
    const { start: startDate, end: endDate } = getParisRangeBoundsUTC(start, end);
    
    // Récupérer les shifts de tous ces employés (collègues uniquement)
    const shifts = await require('../prisma/client').shift.findMany({
      where: {
        employeId: { in: employes.map(e => e.id) },
        date: { gte: startDate, lte: endDate }
      },
      include: {
        employe: { select: { id: true, nom: true, prenom: true, categorie: true } }
      },
      orderBy: [{ date: 'asc' }]
    });
    
    // Récupérer les congés approuvés pour cette période (qui chevauchent la période)
    const conges = await require('../prisma/client').conge.findMany({
      where: {
        userId: { in: employes.map(e => e.id) },
        statut: 'approuvé',
        dateDebut: { lte: endDate },
        dateFin: { gte: startDate }
      },
      include: {
        user: { select: { id: true, nom: true, prenom: true } }
      }
    });
    
    // Récupérer les demandes de remplacement en cours pour ces shifts
    const remplacements = await require('../prisma/client').demandeRemplacement.findMany({
      where: {
        shiftId: { in: shifts.map(s => s.id) },
        statut: { in: ['en_attente', 'acceptee'] }
      },
      select: { shiftId: true, statut: true }
    });
    
    // Créer un map pour vérifier rapidement si un employé est en congé à une date
    const congesMap = {};
    conges.forEach(conge => {
      const start = new Date(conge.dateDebut);
      const end = new Date(conge.dateFin);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${conge.userId}_${toLocalDateString(d)}`;
        congesMap[key] = conge.type || 'congé';
      }
    });
    
    // Map des remplacements par shiftId
    const remplacementMap = {};
    remplacements.forEach(r => {
      remplacementMap[r.shiftId] = r.statut;
    });
    
    // Formater les données avec statut absence
    // Filtrer les shifts de type "repos" (employés remplacés)
    
    const formattedShifts = shifts
      .filter(shift => shift.type !== 'repos') // Exclure les repos/remplacés
      .map(shift => {
        const shiftDateStr = toLocalDateString(shift.date);
        const congeKey = `${shift.employeId}_${shiftDateStr}`;
        const isEnConge = congesMap[congeKey];
        const remplacementStatut = remplacementMap[shift.id];
        
        // Détecter si c'est un shift de remplacement
        const isRemplacement = shift.motif?.toLowerCase()?.includes('remplacement de');
        
        return {
          ...shift,
          date: new Date(shift.date).toISOString(),
          estEnConge: !!isEnConge,
          typeConge: isEnConge || null,
          remplacementStatut: remplacementStatut || null,
          isRemplacement: isRemplacement // Flag pour le frontend
        };
      });
    
    res.json({
      employes,
      shifts: formattedShifts,
      conges,
      categorie: currentUser?.categorie || 'Tous'
    });
  } catch (error) {
    console.error('Erreur récupération planning équipe:', error);
    res.status(500).json({ error: "Erreur récupération du planning équipe" });
  }
});

router.get('/', authenticateToken, isAdmin, getShifts);
router.post('/', authenticateToken, isAdmin, createOrUpdateShift);
router.post('/batch', authenticateToken, isAdmin, createBatchShifts);
router.post('/recurring', authenticateToken, isAdmin, createRecurringShifts);
router.post('/delete-range', authenticateToken, isAdmin, deleteRangeShifts);
router.put('/:id', authenticateToken, isAdmin, createOrUpdateShift);
router.delete('/:id', authenticateToken, isAdmin, deleteShift);
router.get('/extras', authenticateToken, isAdmin, getExtrasSegments);
router.patch('/:id/extra-payment', authenticateToken, isAdmin, updateExtraPayment);
router.get('/:id/extra-logs', authenticateToken, isAdmin, getShiftExtraLogs);

module.exports = router;