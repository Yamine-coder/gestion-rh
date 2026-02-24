// server/routes/planningTemplateRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const { CATEGORIES_VALIDES } = require('../utils/categoriesHelper');

// ============================================================
// 📋 CRUD Planning Templates
// ============================================================

// GET /api/planning-templates — Liste tous les templates
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { categorie, active } = req.query;
    
    const where = {};
    if (categorie) where.categorie = categorie;
    if (active !== undefined) where.active = active === 'true';

    const templates = await prisma.planningTemplate.findMany({
      where,
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }]
    });

    res.json(templates);
  } catch (err) {
    console.error('❌ Erreur liste templates:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// 📥 IMPORTER une semaine réelle dans une grille template
// ============================================================
// GET /api/planning-templates/import-semaine?dateDebut=YYYY-MM-DD&categorie=Pizzaiolo
router.get('/import-semaine', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { dateDebut, categorie } = req.query;
    if (!dateDebut) {
      return res.status(400).json({ error: 'dateDebut (lundi) est obligatoire' });
    }

    const baseDate = new Date(dateDebut + 'T00:00:00.000Z');
    if (baseDate.getUTCDay() !== 1) {
      return res.status(400).json({ error: 'dateDebut doit être un lundi' });
    }

    const endDate = new Date(baseDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);

    // Filtrer les employés par catégorie si précisée
    let employeFilter = {};
    if (categorie) {
      const allEmployes = await prisma.user.findMany({
        where: { role: 'employee', statut: 'actif' },
        select: { id: true, categorie: true, categories: true }
      });
      const filteredIds = allEmployes
        .filter(e => {
          let cats = [];
          if (e.categories) {
            try { cats = JSON.parse(e.categories); } catch (_) { cats = []; }
          }
          if (e.categorie) cats.push(e.categorie);
          return cats.includes(categorie);
        })
        .map(e => e.id);

      if (filteredIds.length === 0) {
        return res.json({ grille: { lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {} }, stats: { totalShifts: 0, totalEmployes: 0 } });
      }
      employeFilter = { employeId: { in: filteredIds } };
    }

    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: baseDate, lte: endDate },
        type: 'travail',
        ...employeFilter
      },
      select: { employeId: true, date: true, segments: true }
    });

    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const grille = {};
    jours.forEach(j => { grille[j] = {}; });

    const employeSet = new Set();

    for (const shift of shifts) {
      const shiftDate = new Date(shift.date);
      const dayOfWeek = shiftDate.getUTCDay();
      const jourIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const jour = jours[jourIndex];
      if (!jour) continue;

      const segments = Array.isArray(shift.segments) ? shift.segments : [];

      for (const seg of segments) {
        if (!seg.start || !seg.end) continue;

        const startH = parseInt(seg.start.split(':')[0]);
        const startM = parseInt(seg.start.split(':')[1] || '0');
        const endH = parseInt(seg.end.split(':')[0]);
        const endM = parseInt(seg.end.split(':')[1] || '0');

        let startMin = startH * 60 + startM;
        let endMin = endH * 60 + endM;
        if (endMin <= startMin) endMin += 24 * 60;

        // Générer les créneaux : 1h pour heures pleines, 30min pour les :30
        let m = startMin;
        while (m < endMin) {
          const isHalfStart = m % 60 === 30;
          let step;
          if (isHalfStart) {
            step = 30; // 30min jusqu’au prochain :00
          } else if (endMin - m >= 60) {
            step = 60; // heure pleine
          } else {
            step = 30; // reste 30min
          }
          const slotEnd = m + step;
          const sH = Math.floor(m / 60);
          const sM = m % 60;
          const eH = Math.floor(slotEnd / 60);
          const eM = slotEnd % 60;
          const sHNorm = sH >= 24 ? sH - 24 : sH;
          const eHNorm = eH >= 24 ? eH - 24 : eH;
          const key = `${String(sHNorm).padStart(2, '0')}:${String(sM).padStart(2, '0')}-${String(eHNorm).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;

          if (!grille[jour][key]) grille[jour][key] = [];
          if (!grille[jour][key].includes(shift.employeId)) {
            grille[jour][key].push(shift.employeId);
          }
          m = slotEnd;
        }

        employeSet.add(shift.employeId);
      }
    }

    res.json({
      grille,
      stats: {
        totalShifts: shifts.length,
        totalEmployes: employeSet.size
      }
    });
  } catch (err) {
    console.error('❌ Erreur import semaine:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/planning-templates/:id — Détail d'un template
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const template = await prisma.planningTemplate.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    res.json(template);
  } catch (err) {
    console.error('❌ Erreur détail template:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/planning-templates — Créer un template
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { nom, categorie, description, grille } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: 'Le nom est obligatoire' });
    }

    if (!categorie) {
      return res.status(400).json({ error: 'La catégorie est obligatoire' });
    }

    // Grille vide par défaut si non fournie
    const grilleFinale = grille || {
      lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {}
    };

    const template = await prisma.planningTemplate.create({
      data: {
        nom: nom.trim(),
        categorie,
        description: description?.trim() || null,
        grille: grilleFinale
      }
    });

    res.status(201).json(template);
  } catch (err) {
    console.error('❌ Erreur création template:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/planning-templates/:id — Modifier un template
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { nom, categorie, description, grille, active } = req.body;
    const id = parseInt(req.params.id);

    const existing = await prisma.planningTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    const updateData = {};
    if (nom !== undefined) updateData.nom = nom.trim();
    if (categorie !== undefined) updateData.categorie = categorie;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (grille !== undefined) updateData.grille = grille;
    if (active !== undefined) updateData.active = active;

    const template = await prisma.planningTemplate.update({
      where: { id },
      data: updateData
    });

    res.json(template);
  } catch (err) {
    console.error('❌ Erreur modification template:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/planning-templates/:id — Supprimer un template
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.planningTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    await prisma.planningTemplate.delete({ where: { id } });
    res.json({ success: true, message: 'Template supprimé' });
  } catch (err) {
    console.error('❌ Erreur suppression template:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// 🚀 APPLIQUER un template à une semaine
// ============================================================

// POST /api/planning-templates/:id/appliquer — Générer les shifts
router.post('/:id/appliquer', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { dateDebut } = req.body; // Date du lundi de la semaine (YYYY-MM-DD)
    const id = parseInt(req.params.id);

    if (!dateDebut) {
      return res.status(400).json({ error: 'La date de début (lundi) est obligatoire' });
    }

    const template = await prisma.planningTemplate.findUnique({ where: { id } });
    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    const grille = template.grille;
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

    // Vérifier que dateDebut est bien un lundi
    const baseDate = new Date(dateDebut + 'T00:00:00.000Z');
    if (baseDate.getUTCDay() !== 1) {
      return res.status(400).json({ error: 'La date de début doit être un lundi' });
    }

    // Pré-charger les employés actifs pour validation
    const activeEmployees = await prisma.user.findMany({
      where: { statut: 'actif', role: 'employee' },
      select: { id: true, prenom: true, nom: true }
    });
    const activeIds = new Set(activeEmployees.map(e => e.id));

    const shiftsToCreate = [];
    const warnings = [];

    for (let jourIndex = 0; jourIndex < 7; jourIndex++) {
      const jour = jours[jourIndex];
      const jourGrille = grille[jour] || {};

      // Calculer la date du jour
      const jourDate = new Date(baseDate);
      jourDate.setUTCDate(jourDate.getUTCDate() + jourIndex);
      const dateStr = jourDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Regrouper les créneaux par employé pour fusionner en segments continus
      const employeCreneaux = {}; // { employeId: [{ start, end }] }

      for (const [creneau, employeIds] of Object.entries(jourGrille)) {
        if (!Array.isArray(employeIds) || employeIds.length === 0) continue;

        const [start, end] = creneau.split('-');
        if (!start || !end) continue;

        for (const employeId of employeIds) {
          if (!activeIds.has(employeId)) {
            const emp = activeEmployees.find(e => e.id === employeId);
            warnings.push(`Employé #${employeId} ignoré (inactif)`);
            continue;
          }
          if (!employeCreneaux[employeId]) employeCreneaux[employeId] = [];
          employeCreneaux[employeId].push({ start, end });
        }
      }

      // Fusionner les créneaux consécutifs en segments
      for (const [employeIdStr, creneaux] of Object.entries(employeCreneaux)) {
        const employeId = parseInt(employeIdStr);

        // Trier par heure de début
        creneaux.sort((a, b) => a.start.localeCompare(b.start));

        // Fusionner les consécutifs
        const segments = [];
        let current = { ...creneaux[0] };

        for (let i = 1; i < creneaux.length; i++) {
          if (creneaux[i].start === current.end) {
            // Consécutif → étendre
            current.end = creneaux[i].end;
          } else {
            // Pas consécutif → sauver et nouveau
            segments.push({
              start: current.start,
              end: current.end,
              commentaire: '',
              aValider: false,
              isExtra: false,
              extraMontant: '',
              paymentStatus: 'à_payer',
              paymentMethod: '',
              paymentDate: '',
              paymentNote: ''
            });
            current = { ...creneaux[i] };
          }
        }
        // Ajouter le dernier
        segments.push({
          start: current.start,
          end: current.end,
          commentaire: '',
          aValider: false,
          isExtra: false,
          extraMontant: '',
          paymentStatus: 'à_payer',
          paymentMethod: '',
          paymentDate: '',
          paymentNote: ''
        });

        shiftsToCreate.push({
          employeId,
          date: new Date(dateStr + 'T00:00:00.000Z'),
          type: 'travail',
          segments
        });
      }
    }

    // Vérifier les shifts existants pour cette semaine
    const endDate = new Date(baseDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    
    const existingShifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: baseDate,
          lte: endDate
        },
        employeId: { in: shiftsToCreate.map(s => s.employeId) }
      },
      select: { employeId: true, date: true }
    });

    const existingKeys = new Set(
      existingShifts.map(s => `${s.employeId}_${s.date.toISOString().split('T')[0]}`)
    );

    // Filtrer les doublons
    const newShifts = [];
    let skipped = 0;
    for (const shift of shiftsToCreate) {
      const key = `${shift.employeId}_${shift.date.toISOString().split('T')[0]}`;
      if (existingKeys.has(key)) {
        skipped++;
      } else {
        newShifts.push(shift);
      }
    }

    // Insérer en batch
    if (newShifts.length > 0) {
      await prisma.$transaction(
        newShifts.map(s => prisma.shift.create({ data: s }))
      );
    }

    res.json({
      success: true,
      message: `${newShifts.length} shifts créés${skipped > 0 ? `, ${skipped} ignorés (déjà existants)` : ''}`,
      created: newShifts.length,
      skipped,
      warnings
    });

  } catch (err) {
    console.error('❌ Erreur application template:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
