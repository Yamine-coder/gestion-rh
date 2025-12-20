const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifierNouvelleConsigne, NOTIFICATION_TYPES, creerNotifications } = require('../services/notificationService');
const { toLocalDateString } = require('../utils/dateUtils');

// Middleware d'authentification
const { authMiddleware } = require('../middlewares/authMiddleware');
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/consignes - Liste des consignes actives (pour employés)
// Filtre automatiquement par catégorie de l'employé
// ═══════════════════════════════════════════════════════════════════════════
router.get('/', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user.userId || req.user.id;
    
    // Récupérer la catégorie de l'employé
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { categorie: true }
    });
    const userCategorie = user?.categorie || null;
    
    const consignes = await prisma.consigne.findMany({
      where: {
        active: true,
        dateDebut: { lte: now },
        OR: [
          { dateFin: null },
          { dateFin: { gte: now } }
        ],
        // Filtrer par catégorie : soit pour tout le monde (null), soit pour la catégorie de l'employé
        AND: [
          {
            OR: [
              { cibleCategorie: null }, // Consigne pour tout le monde
              { cibleCategorie: userCategorie } // Consigne pour ma catégorie
            ]
          }
        ]
      },
      orderBy: [
        { type: 'desc' }, // urgent > important > info
        { createdAt: 'desc' }
      ]
    });
    
    res.json(consignes);
  } catch (error) {
    console.error('Erreur récupération consignes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/consignes/admin - Toutes les consignes (pour admin)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/admin', authMiddleware, isAdmin, async (req, res) => {
  try {
    const consignes = await prisma.consigne.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(consignes);
  } catch (error) {
    console.error('Erreur récupération consignes admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/consignes/categories - Liste des catégories disponibles (pour admin)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/categories', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Récupérer toutes les catégories uniques des employés actifs
    const categories = await prisma.user.findMany({
      where: { 
        statut: 'actif',
        categorie: { not: null }
      },
      select: { categorie: true },
      distinct: ['categorie']
    });
    
    const listeCategories = categories
      .map(c => c.categorie)
      .filter(Boolean)
      .sort();
    
    res.json(listeCategories);
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/consignes - Créer une consigne (admin)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { titre, contenu, type = 'info', dateDebut, dateFin, cibleCategorie } = req.body;
    
    if (!titre || !contenu) {
      return res.status(400).json({ error: 'Titre et contenu requis' });
    }
    
    const consigne = await prisma.consigne.create({
      data: {
        titre,
        contenu,
        type,
        dateDebut: dateDebut ? new Date(dateDebut) : new Date(),
        dateFin: dateFin ? new Date(dateFin) : null,
        cibleCategorie: cibleCategorie || null, // null = tout le monde
        createdBy: req.user.userId || req.user.id
      }
    });
    
    // 🔔 Notifier les employés concernés (selon la catégorie ciblée)
    try {
      const whereClause = { 
        statut: 'actif',
        role: { in: ['employee', 'manager'] }
      };
      
      // Si une catégorie est ciblée, filtrer les employés
      if (cibleCategorie) {
        whereClause.categorie = cibleCategorie;
      }
      
      const employes = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
      });
      
      if (employes.length > 0) {
        await notifierNouvelleConsigne(consigne, employes.map(e => e.id));
        console.log(`🔔 ${employes.length} employés notifiés de la nouvelle consigne${cibleCategorie ? ` (catégorie: ${cibleCategorie})` : ' (tout le monde)'}`);
      } else {
        console.log('⚠️ Aucun employé actif trouvé pour notifier');
      }
    } catch (notifError) {
      console.error('⚠️ Erreur notification consigne:', notifError);
    }
    
    res.status(201).json(consigne);
  } catch (error) {
    console.error('Erreur création consigne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/consignes/:id - Modifier une consigne (admin)
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { titre, contenu, type, dateDebut, dateFin, active, cibleCategorie } = req.body;
    
    console.log('📝 Modification consigne:', { id, titre, contenu, type, active, cibleCategorie });
    
    // Récupérer l'ancienne consigne AVANT la modification
    const ancienneConsigne = await prisma.consigne.findUnique({
      where: { id: parseInt(id) }
    });
    
    const consigne = await prisma.consigne.update({
      where: { id: parseInt(id) },
      data: {
        ...(titre && { titre }),
        ...(contenu && { contenu }),
        ...(type && { type }),
        ...(dateDebut && { dateDebut: new Date(dateDebut) }),
        ...(dateFin !== undefined && { dateFin: dateFin ? new Date(dateFin) : null }),
        ...(active !== undefined && { active }),
        ...(cibleCategorie !== undefined && { cibleCategorie: cibleCategorie || null })
      }
    });
    
    // 🔔 Notifier les employés si la consigne est modifiée (et reste active)
    console.log('🔔 Notification check:', { isActive: consigne.active, ancienTitre: ancienneConsigne?.titre });
    
    if (consigne.active && ancienneConsigne) {
      try {
        const whereClause = { 
          statut: 'actif',
          role: { in: ['employee', 'manager'] }
        };
        
        // Filtrer par catégorie si ciblée
        if (consigne.cibleCategorie) {
          whereClause.categorie = consigne.cibleCategorie;
        }
        
        const employes = await prisma.user.findMany({
          where: whereClause,
          select: { id: true }
        });
        
        console.log(`👥 Employés trouvés: ${employes.length}`);
        
        if (employes.length > 0) {
          const result = await creerNotifications({
            employeIds: employes.map(e => e.id),
            type: consigne.type === 'urgent' ? NOTIFICATION_TYPES.CONSIGNE_IMPORTANTE : NOTIFICATION_TYPES.NOUVELLE_CONSIGNE,
            titre: '📝 Consigne mise à jour',
            message: {
              text: `La consigne "${ancienneConsigne.titre}" a été modifiée`,
              consigneId: consigne.id,
              consigneTitre: ancienneConsigne.titre,
              highlightConsigneId: consigne.id // Pour highlight la consigne spécifique
            }
          });
          console.log(`🔔 ${result.count} notifications créées pour mise à jour consigne`);
        }
      } catch (notifError) {
        console.error('⚠️ Erreur notification modification consigne:', notifError);
      }
    }
    
    res.json(consigne);
  } catch (error) {
    console.error('Erreur modification consigne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/consignes/:id - Supprimer une consigne (admin)
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.consigne.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression consigne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/consignes/stats/ponctualite - Stats de ponctualité employé
// Standard SIRH : Ponctualité = respect des horaires (retards + départs anticipés)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/stats/ponctualite', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const now = new Date();
    
    // Début du mois en cours
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Récupérer les shifts du mois
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: userId,
        date: { gte: startOfMonth, lte: now }
      },
      orderBy: { date: 'asc' }
    });
    
    // Récupérer uniquement les anomalies de PONCTUALITÉ (retards + départs anticipés)
    // Les pointages hors planning ne comptent pas (problème de planification, pas de ponctualité)
    const anomaliesPonctualite = await prisma.anomalie.findMany({
      where: {
        employeId: userId,
        date: { gte: startOfMonth, lte: now },
        type: { in: ['retard', 'depart_anticipe'] }, // Standard SIRH
        statut: { in: ['en_attente', 'validee'] } // Exclure les anomalies rejetées
      }
    });
    
    // Compter les anomalies par type
    const retards = anomaliesPonctualite.filter(a => a.type === 'retard').length;
    const departsAnticipes = anomaliesPonctualite.filter(a => a.type === 'depart_anticipe').length;
    
    // Total des incidents de ponctualité
    const totalIncidents = retards + departsAnticipes;
    
    // Calculer la ponctualité basée sur les shifts du mois
    // Un shift est "ponctuel" s'il n'a ni retard ni départ anticipé
    const totalShifts = shifts.length;
    const shiftsAvecIncident = new Set();
    
    // Identifier les shifts avec incidents de ponctualité
    for (const anomalie of anomaliesPonctualite) {
      const anomalieDate = toLocalDateString(new Date(anomalie.date));
      for (const shift of shifts) {
        const shiftDate = toLocalDateString(new Date(shift.date));
        if (shiftDate === anomalieDate) {
          shiftsAvecIncident.add(shift.id);
          break;
        }
      }
    }
    
    // Calculer jours consécutifs sans incident de ponctualité
    let joursConsecutifsSansIncident = 0;
    let maxConsecutif = 0;
    const sortedShifts = [...shifts].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (const shift of sortedShifts) {
      if (shiftsAvecIncident.has(shift.id)) {
        joursConsecutifsSansIncident = 0;
      } else {
        joursConsecutifsSansIncident++;
        maxConsecutif = Math.max(maxConsecutif, joursConsecutifsSansIncident);
      }
    }
    
    // Ponctualité = (shifts sans retard ni départ anticipé / total shifts) × 100
    const ponctualite = totalShifts > 0 
      ? Math.round(((totalShifts - shiftsAvecIncident.size) / totalShifts) * 100)
      : 100;
    
    res.json({
      ponctualiteMois: ponctualite,
      joursConsecutifsSansRetard: maxConsecutif,
      totalShifts,
      retards,
      departsAnticipes,
      totalIncidents,
      mois: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    });
  } catch (error) {
    console.error('Erreur stats ponctualité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/consignes/stats/evenements - Prochains événements employé
// ═══════════════════════════════════════════════════════════════════════════
router.get('/stats/evenements', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    console.log('[Evenements] UserId:', userId, '- Date filtre:', now.toISOString());
    
    const evenements = [];
    
    // 1. Prochains congés approuvés
    const prochainsConges = await prisma.conge.findMany({
      where: {
        userId,
        statut: { in: ['approuve', 'approuvé'] },
        dateDebut: { gte: now }
      },
      orderBy: { dateDebut: 'asc' },
      take: 2
    });
    
    for (const conge of prochainsConges) {
      evenements.push({
        type: 'conge',
        label: conge.type || 'Congé',
        date: conge.dateDebut,
        dateFin: conge.dateFin,
        icon: 'plane'
      });
    }
    
    // 2. Remplacements validés (où l'employé est le remplaçant)
    const remplacementsValides = await prisma.demandeRemplacement.findMany({
      where: {
        employeRemplacantId: userId,
        statut: 'validee',
        shift: {
          date: { gte: now }
        }
      },
      include: {
        shift: true,
        employeAbsent: {
          select: { prenom: true, nom: true }
        }
      },
      orderBy: { shift: { date: 'asc' } },
      take: 2
    });
    
    for (const remp of remplacementsValides) {
      const segments = remp.shift.segments || [];
      const firstSeg = segments[0];
      evenements.push({
        type: 'remplacement',
        label: `Remplacement ${remp.employeAbsent.prenom}`,
        date: remp.shift.date,
        horaires: firstSeg ? `${firstSeg.start || firstSeg.debut} - ${firstSeg.end || firstSeg.fin}` : null,
        icon: 'user-check'
      });
    }
    
    // 3. Shifts spéciaux (formation, réunion, visite médicale)
    const shiftsSpeciaux = await prisma.shift.findMany({
      where: {
        employeId: userId,
        date: { gte: now },
        type: { in: ['formation', 'reunion', 'visite_medicale'] }
      },
      orderBy: { date: 'asc' },
      take: 2
    });
    
    const labelsShift = {
      formation: 'Formation',
      reunion: 'Réunion',
      visite_medicale: 'Visite médicale'
    };
    const iconsShift = {
      formation: 'graduation',
      reunion: 'users',
      visite_medicale: 'stethoscope'
    };
    
    for (const shift of shiftsSpeciaux) {
      evenements.push({
        type: shift.type,
        label: labelsShift[shift.type] || shift.type,
        date: shift.date,
        icon: iconsShift[shift.type] || 'calendar'
      });
    }
    
    // Trier par date et limiter à 5
    evenements.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('[Evenements] Trouvés:', evenements.length, evenements.map(e => e.label));
    
    res.json(evenements.slice(0, 5));
  } catch (error) {
    console.error('Erreur événements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
