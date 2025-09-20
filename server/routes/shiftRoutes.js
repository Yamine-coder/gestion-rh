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

// Route pour les employés - accès à leurs propres shifts uniquement
router.get('/mes-shifts', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    const employeId = req.user.userId; // CORRECTION: utiliser userId au lieu de employeId
    
    console.log('🔍 DEBUG: Employé', employeId, 'demande ses shifts du', start, 'au', end);
    
    const where = {
      employeId: employeId,
      ...(start && end ? {
        date: {
          gte: new Date(start + 'T00:00:00.000Z'),
          lte: new Date(end + 'T23:59:59.999Z'),
        },
      } : {}),
    };

    const shifts = await require('../prisma/client').shift.findMany({
      where,
      include: { employe: { select: { id: true, email: true } } },
      orderBy: [{ date: "asc" }],
    });

    console.log('🔍 DEBUG: Shifts trouvés pour employé', employeId, ':', shifts.length);
    shifts.forEach(s => {
      console.log('  - Shift ID:', s.id, 'Date:', s.date, 'Type:', s.type, 'Segments:', s.segments?.length || 0);
    });

    // Formater les dates comme dans le contrôleur principal
    const formattedShifts = shifts.map(shift => {
      let formattedDate = null;
      if (shift.date) {
        try {
          formattedDate = new Date(shift.date).toISOString();
        } catch (e) {
          console.error("Erreur format date:", e);
        }
      }
      
      return {
        ...shift,
        date: formattedDate
      };
    });

    res.json(formattedShifts);
  } catch (error) {
    console.error('Erreur récupération shifts employé:', error);
    res.status(500).json({ error: "Erreur récupération de vos shifts" });
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