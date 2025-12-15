/**
 * Routes pour le système de remplacement
 * Permet aux employés de demander/proposer des remplacements
 */

const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const scoringService = require('../services/scoringService');
const { notifierDemandeRemplacement } = require('../services/notificationService');

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 ROUTES EMPLOYÉ - Mes demandes de remplacement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /remplacements/mes-demandes
 * Liste les demandes de remplacement de l'employé connecté (en tant qu'absent)
 */
router.get('/mes-demandes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const demandes = await prisma.demandeRemplacement.findMany({
      where: { 
        employeAbsentId: userId,
        statut: { notIn: ['annulee', 'refusee', 'expiree'] } // Exclure les demandes annulées/refusées/expirées
      },
      include: {
        shift: true,
        employeRemplacant: {
          select: { id: true, nom: true, prenom: true }
        },
        candidatures: {
          include: {
            employe: { select: { id: true, nom: true, prenom: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(demandes);
  } catch (error) {
    console.error('Erreur récupération mes demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /remplacements/mes-candidatures
 * Liste les candidatures de l'employé pour remplacer d'autres
 */
router.get('/mes-candidatures', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const candidatures = await prisma.candidatureRemplacement.findMany({
      where: { employeId: userId },
      include: {
        demandeRemplacement: {
          include: {
            shift: true,
            employeAbsent: { select: { id: true, nom: true, prenom: true } },
            employeRemplacant: { select: { id: true, nom: true, prenom: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Pour les candidatures acceptées dont le shift a des segments vides,
    // récupérer les segments depuis le shift du remplaçant (l'utilisateur lui-même)
    const candidaturesAvecSegments = await Promise.all(candidatures.map(async (candidature) => {
      const demande = candidature.demandeRemplacement;
      if (demande && candidature.statut === 'acceptee') {
        const shiftSegments = demande.shift?.segments;
        const segmentsVides = !shiftSegments || 
          (typeof shiftSegments === 'string' && shiftSegments === '[]') ||
          (Array.isArray(shiftSegments) && shiftSegments.length === 0);
        
        if (segmentsVides) {
          // Chercher le shift créé pour ce remplaçant à la même date
          const shiftRemplacant = await prisma.shift.findFirst({
            where: {
              employeId: userId,
              date: demande.shift.date,
              motif: { contains: 'Remplacement' }
            }
          });
          
          if (shiftRemplacant?.segments) {
            return {
              ...candidature,
              demandeRemplacement: {
                ...demande,
                shift: {
                  ...demande.shift,
                  segments: shiftRemplacant.segments
                }
              }
            };
          }
        }
      }
      return candidature;
    }));
    
    res.json(candidaturesAvecSegments);
  } catch (error) {
    console.error('Erreur récupération mes candidatures:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /remplacements/disponibles
 * Liste les demandes de remplacement ouvertes de la même équipe (catégorie)
 * L'employé ne voit que les demandes de son équipe pour se proposer
 */
router.get('/disponibles', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Récupérer l'employé pour sa catégorie
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { categorie: true }
    });
    
    // Construire le filtre : uniquement les demandes de la même équipe (catégorie)
    const whereClause = {
      statut: 'en_attente',
      employeAbsentId: { not: userId }, // Pas ses propres demandes
      // Shift dans le futur
      shift: {
        date: { gte: new Date() }
      }
    };
    
    // Filtrer par catégorie si l'utilisateur en a une
    if (user?.categorie) {
      whereClause.employeAbsent = {
        categorie: user.categorie
      };
    }
    
    const demandes = await prisma.demandeRemplacement.findMany({
      where: whereClause,
      include: {
        shift: true,
        employeAbsent: { select: { id: true, nom: true, prenom: true, categorie: true } },
        candidatures: {
          select: { employeId: true }
        }
      },
      orderBy: [
        { priorite: 'desc' },
        { shift: { date: 'asc' } }
      ]
    });
    
    // Filtrer pour exclure celles où l'employé a déjà candidaté
    const demandesFiltrees = demandes.filter(d => 
      !d.candidatures.some(c => c.employeId === userId)
    );
    
    // Toutes sont de la même catégorie maintenant
    const demandesAvecPriorite = demandesFiltrees.map(d => ({
      ...d,
      memeCategorie: d.employeAbsent.categorie === user?.categorie
    }));
    
    res.json(demandesAvecPriorite);
  } catch (error) {
    console.error('Erreur récupération demandes disponibles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /remplacements/demande
 * Créer une demande de remplacement pour un de ses shifts
 */
router.post('/demande', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shiftId, motif, priorite = 'normale', commentaire } = req.body;
    
    // Vérifier que le shift appartient à l'employé
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, employeId: userId }
    });
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift non trouvé ou non autorisé' });
    }
    
    // Vérifier qu'il n'y a pas déjà une demande en cours
    const demandeExistante = await prisma.demandeRemplacement.findFirst({
      where: {
        shiftId,
        statut: { in: ['en_attente', 'acceptee'] }
      }
    });
    
    if (demandeExistante) {
      return res.status(400).json({ error: 'Une demande existe déjà pour ce shift' });
    }
    
    // Créer la demande
    const demande = await prisma.demandeRemplacement.create({
      data: {
        shiftId,
        employeAbsentId: userId,
        type: 'besoin',
        motif,
        priorite,
        commentaireEmploye: commentaire,
        dateExpiration: shift.date // Expire le jour du shift
      },
      include: {
        shift: true,
        employeAbsent: { select: { id: true, nom: true, prenom: true, categorie: true } }
      }
    });
    
    // Envoyer notification aux collègues de la même catégorie uniquement
    try {
      const employeAbsent = demande.employeAbsent;
      
      // Récupérer tous les employés actifs de la même catégorie (équipe)
      const whereCollegues = {
        statut: 'actif',
        role: 'employee',
        id: { not: userId } // Exclure l'employé qui fait la demande
      };
      
      // Filtrer par catégorie si l'employé en a une
      if (employeAbsent.categorie) {
        whereCollegues.categorie = employeAbsent.categorie;
      }
      
      const collegues = await prisma.user.findMany({
        where: whereCollegues,
        select: { id: true }
      });
      
      // Utiliser le service de notification centralisé
      if (collegues.length > 0) {
        await notifierDemandeRemplacement(
          collegues.map(c => c.id),
          demande,
          employeAbsent,
          shift
        );
        console.log(`✅ Notifications envoyées à ${collegues.length} collègue(s) de l'équipe ${employeAbsent.categorie || 'tous'}`);
      }
    } catch (notifError) {
      console.error('Erreur envoi notifications:', notifError);
      // Ne pas bloquer la création de la demande si les notifs échouent
    }
    
    res.status(201).json(demande);
  } catch (error) {
    console.error('Erreur création demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /remplacements/:id/candidater
 * Se proposer pour un remplacement
 */
router.post('/:id/candidater', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const demandeId = parseInt(req.params.id);
    const { commentaire } = req.body;
    
    // Vérifier que la demande existe et est ouverte
    const demande = await prisma.demandeRemplacement.findFirst({
      where: {
        id: demandeId,
        statut: 'en_attente'
      },
      include: { shift: true }
    });
    
    if (!demande) {
      return res.status(404).json({ error: 'Demande non trouvée ou déjà pourvue' });
    }
    
    // Vérifier que ce n'est pas sa propre demande
    if (demande.employeAbsentId === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas candidater à votre propre demande' });
    }
    
    // Vérifier qu'on n'a pas déjà de shift ce jour-là
    const shiftExistant = await prisma.shift.findFirst({
      where: {
        employeId: userId,
        date: demande.shift.date
      }
    });
    
    if (shiftExistant) {
      return res.status(400).json({ 
        error: 'Vous avez déjà un shift prévu ce jour-là',
        shiftExistant
      });
    }
    
    // Créer la candidature
    const candidature = await prisma.candidatureRemplacement.create({
      data: {
        demandeRemplacementId: demandeId,
        employeId: userId,
        commentaire
      },
      include: {
        employe: { select: { id: true, nom: true, prenom: true } },
        demandeRemplacement: {
          include: { 
            shift: true,
            employeAbsent: { select: { id: true, nom: true, prenom: true } }
          }
        }
      }
    });
    
    // Notifier l'employé absent qu'un collègue s'est proposé
    try {
      const candidat = candidature.employe;
      const employeAbsentId = demande.employeAbsentId;
      
      // Formater la date du shift
      const dateShift = new Date(demande.shift.date);
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      const dateFormatee = dateShift.toLocaleDateString('fr-FR', options);
      
      await prisma.notification.create({
        data: {
          userId: employeAbsentId,
          type: 'remplacement_candidature',
          message: JSON.stringify({
            title: 'Nouvelle candidature',
            body: `${candidat.prenom} ${candidat.nom} s'est proposé pour vous remplacer le ${dateFormatee}`,
            demandeId: demandeId,
            candidatureId: candidature.id,
            candidatNom: `${candidat.prenom} ${candidat.nom}`
          }),
          statut: 'non_lu'
        }
      });
      
      console.log(`✅ Notification envoyée à l'employé absent (ID: ${employeAbsentId}) pour candidature de ${candidat.prenom}`);
    } catch (notifError) {
      console.error('Erreur envoi notification candidature:', notifError);
    }
    
    res.status(201).json(candidature);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Vous avez déjà candidaté pour ce remplacement' });
    }
    console.error('Erreur candidature:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /remplacements/candidature/:id
 * Retirer sa candidature
 */
router.delete('/candidature/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const candidatureId = parseInt(req.params.id);
    
    const candidature = await prisma.candidatureRemplacement.findFirst({
      where: { id: candidatureId, employeId: userId }
    });
    
    if (!candidature) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }
    
    await prisma.candidatureRemplacement.delete({
      where: { id: candidatureId }
    });
    
    res.json({ message: 'Candidature retirée' });
  } catch (error) {
    console.error('Erreur suppression candidature:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /remplacements/:id
 * Annuler sa demande de remplacement
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const demandeId = parseInt(req.params.id);
    
    const demande = await prisma.demandeRemplacement.findFirst({
      where: { 
        id: demandeId, 
        employeAbsentId: userId,
        statut: 'en_attente'
      }
    });
    
    if (!demande) {
      return res.status(404).json({ error: 'Demande non trouvée ou déjà traitée' });
    }
    
    await prisma.demandeRemplacement.update({
      where: { id: demandeId },
      data: { statut: 'annulee' }
    });
    
    res.json({ message: 'Demande annulée' });
  } catch (error) {
    console.error('Erreur annulation demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 👑 ROUTES ADMIN/MANAGER - Gestion des remplacements
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /remplacements/admin/toutes
 * Liste toutes les demandes de remplacement (admin)
 */
router.get('/admin/toutes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { statut, dateDebut, dateFin } = req.query;
    
    const where = {};
    if (statut) where.statut = statut;
    if (dateDebut || dateFin) {
      where.shift = {
        date: {
          ...(dateDebut && { gte: new Date(dateDebut) }),
          ...(dateFin && { lte: new Date(dateFin) })
        }
      };
    }
    
    const demandes = await prisma.demandeRemplacement.findMany({
      where,
      include: {
        shift: true,
        employeAbsent: { select: { id: true, nom: true, prenom: true, categorie: true } },
        employeRemplacant: { select: { id: true, nom: true, prenom: true } },
        candidatures: {
          include: {
            employe: { select: { id: true, nom: true, prenom: true, categorie: true } }
          }
        },
        valideur: { select: { id: true, nom: true, prenom: true } }
      },
      orderBy: [
        { statut: 'asc' },
        { priorite: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    // Pour les demandes validées dont le shift a des segments vides,
    // récupérer les segments depuis le shift du remplaçant
    const demandesAvecSegments = await Promise.all(demandes.map(async (demande) => {
      if (demande.statut === 'acceptee' && demande.employeRemplacantId) {
        const shiftSegments = demande.shift?.segments;
        const segmentsVides = !shiftSegments || 
          (typeof shiftSegments === 'string' && shiftSegments === '[]') ||
          (Array.isArray(shiftSegments) && shiftSegments.length === 0);
        
        if (segmentsVides) {
          // Chercher le shift du remplaçant à la même date
          const shiftRemplacant = await prisma.shift.findFirst({
            where: {
              employeId: demande.employeRemplacantId,
              date: demande.shift.date,
              motif: { contains: 'Remplacement' }
            }
          });
          
          if (shiftRemplacant?.segments) {
            return {
              ...demande,
              shift: {
                ...demande.shift,
                segments: shiftRemplacant.segments // Utiliser les segments du remplaçant
              }
            };
          }
        }
      }
      return demande;
    }));
    
    res.json(demandesAvecSegments);
  } catch (error) {
    console.error('Erreur récupération toutes demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /remplacements/admin/:id/valider
 * Valider un remplacement (assigner un candidat)
 */
router.post('/admin/:id/valider', authenticateToken, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const demandeId = parseInt(req.params.id);
    const { candidatureId, commentaire } = req.body;
    
    // Récupérer la candidature
    const candidature = await prisma.candidatureRemplacement.findFirst({
      where: { id: candidatureId, demandeRemplacementId: demandeId },
      include: {
        employe: true,
        demandeRemplacement: { include: { shift: true } }
      }
    });
    
    if (!candidature) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }
    
    // Transaction: mettre à jour la demande et créer le nouveau shift
    const result = await prisma.$transaction(async (tx) => {
      // 1. Accepter la candidature
      await tx.candidatureRemplacement.update({
        where: { id: candidatureId },
        data: { statut: 'acceptee' }
      });
      
      // 2. Refuser les autres candidatures
      await tx.candidatureRemplacement.updateMany({
        where: {
          demandeRemplacementId: demandeId,
          id: { not: candidatureId }
        },
        data: { statut: 'refusee' }
      });
      
      // 3. Mettre à jour la demande
      const demande = await tx.demandeRemplacement.update({
        where: { id: demandeId },
        data: {
          statut: 'acceptee',
          employeRemplacantId: candidature.employeId,
          validePar: adminId,
          dateValidation: new Date(),
          commentaireManager: commentaire
        }
      });
      
      // 4. Créer un shift pour le remplaçant (copie du shift original)
      const shiftOriginal = candidature.demandeRemplacement.shift;
      
      // Récupérer le nom de l'absent pour le motif
      const employeAbsent = await tx.user.findUnique({
        where: { id: candidature.demandeRemplacement.employeAbsentId },
        select: { prenom: true, nom: true }
      });
      const nomAbsent = employeAbsent ? `${employeAbsent.prenom} ${employeAbsent.nom}` : 'employé absent';
      
      const nouveauShift = await tx.shift.create({
        data: {
          employeId: candidature.employeId,
          date: shiftOriginal.date,
          type: 'travail', // Type unifié pour jour de travail
          segments: shiftOriginal.segments,
          motif: `Remplacement de ${nomAbsent}`
        }
      });
      
      // 5. Marquer le shift original comme "repos" (l'employé absent ne travaille pas)
      // On garde les segments pour référence mais change le type en "repos"
      await tx.shift.update({
        where: { id: shiftOriginal.id },
        data: { 
          type: 'repos',
          motif: `Remplacé par ${candidature.employe.prenom} ${candidature.employe.nom} - Motif: ${candidature.demandeRemplacement.motif || 'non précisé'}`
          // On ne vide plus les segments pour garder l'info des horaires originaux
        }
      });
      
      return { demande, nouveauShift };
    });
    
    // Notifier les parties concernées (employé absent et remplaçant)
    try {
      const dateShift = new Date(candidature.demandeRemplacement.shift.date);
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      const dateFormatee = dateShift.toLocaleDateString('fr-FR', options);
      
      // Notification à l'employé absent
      await prisma.notification.create({
        data: {
          userId: candidature.demandeRemplacement.employeAbsentId,
          type: 'remplacement_valide',
          message: JSON.stringify({
            title: 'Remplacement validé',
            body: `${candidature.employe.prenom} ${candidature.employe.nom} vous remplacera le ${dateFormatee}`,
            demandeId: demandeId,
            remplacantNom: `${candidature.employe.prenom} ${candidature.employe.nom}`
          }),
          statut: 'non_lu'
        }
      });
      
      // Notification au remplaçant
      await prisma.notification.create({
        data: {
          userId: candidature.employeId,
          type: 'remplacement_accepte',
          message: JSON.stringify({
            title: 'Candidature acceptée',
            body: `Votre candidature pour le remplacement du ${dateFormatee} a été acceptée`,
            demandeId: demandeId,
            shiftId: result.nouveauShift.id
          }),
          statut: 'non_lu'
        }
      });
      
      console.log(`✅ Notifications de validation envoyées aux deux parties`);
    } catch (notifError) {
      console.error('Erreur envoi notifications validation:', notifError);
    }
    
    // 📊 SCORING: Bonus pour le remplaçant
    try {
      const dateShift = candidature.demandeRemplacement.shift.date;
      await scoringService.onRemplacementAccepte({
        id: candidature.id,
        remplacant_id: candidature.employeId,
        date: dateShift instanceof Date ? dateShift.toISOString().split('T')[0] : dateShift
      });
    } catch (scoringError) {
      console.error('Erreur scoring remplacement (non bloquante):', scoringError.message);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Erreur validation remplacement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /remplacements/admin/:id/refuser
 * Refuser une demande de remplacement
 */
router.post('/admin/:id/refuser', authenticateToken, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const demandeId = parseInt(req.params.id);
    const { commentaire } = req.body;
    
    const demande = await prisma.demandeRemplacement.update({
      where: { id: demandeId },
      data: {
        statut: 'refusee',
        validePar: adminId,
        dateValidation: new Date(),
        commentaireManager: commentaire
      }
    });
    
    // Refuser toutes les candidatures
    await prisma.candidatureRemplacement.updateMany({
      where: { demandeRemplacementId: demandeId },
      data: { statut: 'refusee' }
    });
    
    res.json(demande);
  } catch (error) {
    console.error('Erreur refus remplacement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 STATISTIQUES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /remplacements/stats
 * Statistiques des remplacements pour le dashboard
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    const stats = await prisma.$transaction([
      // Demandes en attente
      prisma.demandeRemplacement.count({
        where: {
          statut: 'en_attente',
          ...(isAdmin ? {} : { employeAbsentId: userId })
        }
      }),
      // Mes remplacements effectués (en tant que remplaçant)
      prisma.demandeRemplacement.count({
        where: {
          statut: 'acceptee',
          employeRemplacantId: userId
        }
      }),
      // Mes candidatures en attente
      prisma.candidatureRemplacement.count({
        where: {
          employeId: userId,
          statut: 'proposee'
        }
      })
    ]);
    
    res.json({
      demandesEnAttente: stats[0],
      remplacementsEffectues: stats[1],
      candidaturesEnCours: stats[2]
    });
  } catch (error) {
    console.error('Erreur stats remplacements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
