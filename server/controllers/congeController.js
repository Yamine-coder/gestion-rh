const prisma = require('../prisma/client');
const scoringService = require('../services/scoringService');
const { envoyerEmailNouvelleDemandeConge } = require('../services/emailService');
const notifConfig = require('../services/notificationConfigService');
const { notifierNouvelleDemandeConde, notifierCongeApprouve, notifierCongeRejete, notifierAbsenceEquipe } = require('../services/notificationService');
const { auditConge, getUserId, getIp } = require('../services/auditService');

// @desc Créer une nouvelle demande de congé
const demanderConge = async (req, res) => {
  const userId = req.user.userId;
  const { type, debut, fin, motif } = req.body;

  if (!type || !debut || !fin) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  try {
    // Vérifier que l'employé est actif
    const employeActif = await prisma.user.findUnique({
      where: { id: userId },
      select: { statut: true }
    });
    if (!employeActif || employeActif.statut !== 'actif') {
      return res.status(403).json({ message: "Compte inactif — impossible de créer une demande de congé." });
    }

    // Vérifier les chevauchements avec des congés existants (en attente ou approuvés)
    const chevauchement = await prisma.conge.findFirst({
      where: {
        userId,
        statut: { in: ['en attente', 'approuvé'] },
        OR: [
          {
            // Nouvelle date début est dans une période existante
            AND: [
              { dateDebut: { lte: new Date(debut) } },
              { dateFin: { gte: new Date(debut) } }
            ]
          },
          {
            // Nouvelle date fin est dans une période existante
            AND: [
              { dateDebut: { lte: new Date(fin) } },
              { dateFin: { gte: new Date(fin) } }
            ]
          },
          {
            // La nouvelle période englobe une période existante
            AND: [
              { dateDebut: { gte: new Date(debut) } },
              { dateFin: { lte: new Date(fin) } }
            ]
          }
        ]
      }
    });

    if (chevauchement) {
      return res.status(400).json({ 
        message: `Vous avez déjà une demande de congé du ${new Date(chevauchement.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(chevauchement.dateFin).toLocaleDateString('fr-FR')} qui chevauche cette période.`,
        chevauchement: {
          id: chevauchement.id,
          type: chevauchement.type,
          dateDebut: chevauchement.dateDebut,
          dateFin: chevauchement.dateFin,
          statut: chevauchement.statut
        }
      });
    }

    const nouveauConge = await prisma.conge.create({
      data: {
        type,
        dateDebut: new Date(debut),
        dateFin: new Date(fin),
        statut: "en attente",
        vu: false, // Nouvelle demande = pas encore vue
        motifEmploye: motif || null, // Commentaire/justification de l'employé
        userId,
      },
    });

    // � AUDIT: création demande congé
    await auditConge(req, {
      congeId: nouveauConge.id,
      action: 'creation',
      after: { type, dateDebut: debut, dateFin: fin, motif, userId }
    });

    // �🔔 Notifier les managers/admins d'une nouvelle demande
    try {
      const employe = await prisma.user.findUnique({
        where: { id: userId },
        select: { nom: true, prenom: true, email: true }
      });

      const employeName = employe?.prenom && employe?.nom 
        ? `${employe.prenom} ${employe.nom}` 
        : employe?.email || 'Un employé';

      // Utiliser le service centralisé pour notifier les managers
      await notifierNouvelleDemandeConde(nouveauConge, employe);

        // 📧 Envoyer email - utilise la config centralisée ou fallback sur admins
        let emailRecipients = notifConfig.getRecipients('conges');
        
        // Si aucun destinataire configuré, envoyer aux admins
        if (emailRecipients.length === 0) {
          const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { email: true }
          });
          emailRecipients = admins.map(a => a.email).filter(Boolean);
        } else {
          // getRecipients retourne des objets {email, name, active} — extraire les emails
          emailRecipients = emailRecipients.map(r => typeof r === 'string' ? r : r.email).filter(Boolean);
        }

        const dateDebutStr = new Date(debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const dateFinStr = new Date(fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const nbJours = Math.ceil((new Date(fin) - new Date(debut)) / (1000 * 60 * 60 * 24) + 1);

        await Promise.allSettled(emailRecipients.map(email =>
          envoyerEmailNouvelleDemandeConge(email, {
            employeNom: employeName,
            type: type,
            dateDebut: dateDebutStr,
            dateFin: dateFinStr,
            nbJours: nbJours,
            motif: motif || null,
            congeId: nouveauConge.id
          }).catch(emailError => {
            console.error(`Erreur envoi email à ${email}:`, emailError.message);
          })
        ));
    } catch (notifError) {
      console.error('Erreur création notification nouvelle demande:', notifError);
    }

    // 📊 SCORING: Vérifier si demande dans les délais
    try {
      await scoringService.onCongeDepose({
        id: nouveauConge.id,
        employe_id: userId,
        date_debut: debut,
        created_at: new Date().toISOString()
      });
    } catch (scoringError) {
      console.error('Erreur scoring congé (non bloquante):', scoringError.message);
    }

    res.status(201).json(nouveauConge);
  } catch (error) {
    console.error("Erreur création congé :", error);
    res.status(500).json({ message: "Erreur lors de la création du congé." });
  }
};

// @desc Admin - obtenir tous les congés
const getTousLesConges = async (req, res) => {
  try {
    // Debug: afficher tous les paramètres de requête
    
    // Récupérer les filtres optionnels de la requête
    const { statut, nonVu } = req.query;
    
    // Construire l'objet de filtre
    const where = {};
    if (statut) {
      where.statut = statut;
    }
    
    // Si le paramètre nonVu est présent, on filtre sur les demandes non vues
    if (nonVu === 'true') {
      where.vu = false;
    }
    
    // Récupérer les congés avec filtres
    const conges = await prisma.conge.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            categorie: true
          },
        },
      },
      orderBy: {
        dateDebut: "desc",
      },
    });
    res.json(conges);
  } catch (error) {
    console.error("Erreur getTousLesConges:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// @desc Modifier le statut d'un congé
const mettreAJourStatutConge = async (req, res) => {
  const { id } = req.params;
  const { statut, motifRefus } = req.body;

  try {
    // Récupérer le congé AVANT modification pour avoir l'ancien statut
    const congeAvant = await prisma.conge.findUnique({
      where: { id: parseInt(id) }
    });

    if (!congeAvant) {
      return res.status(404).json({ message: "Congé non trouvé" });
    }

    // Mettre à jour le statut (et motifRefus si refusé)
    const conge = await prisma.conge.update({
      where: { id: parseInt(id) },
      data: { 
        statut,
        motifRefus: statut === 'refusé' ? (motifRefus || null) : undefined
      },
    });

    // � AUDIT: changement statut congé
    const actionAudit = statut === 'approuvé' ? 'approbation' : statut === 'refusé' ? 'refus' : 'modification';
    await auditConge(req, {
      congeId: parseInt(id),
      action: actionAudit,
      before: { statut: congeAvant.statut, motifRefus: congeAvant.motifRefus },
      after: { statut, motifRefus: statut === 'refusé' ? motifRefus : null },
      metadata: { userId: congeAvant.userId, type: congeAvant.type, dateDebut: congeAvant.dateDebut, dateFin: congeAvant.dateFin }
    });

    // �🔔 CRÉATION DE NOTIFICATION SI APPROUVÉ (via service centralisé)
    if (statut === 'approuvé' && congeAvant.statut !== 'approuvé') {
      // Notification pour l'employé concerné
      try {
        await notifierCongeApprouve(conge);
      } catch (notifError) {
        console.error('Erreur notification congé approuvé:', notifError);
      }

      // Notification pour l'équipe (collègues de la même catégorie)
      try {
        const employeAbsent = await prisma.user.findUnique({
          where: { id: conge.userId },
          select: { id: true, nom: true, prenom: true, categorie: true }
        });

        if (employeAbsent) {
          const whereCollegues = {
            statut: 'actif',
            role: 'employee',
            id: { not: conge.userId }
          };
          if (employeAbsent.categorie) {
            whereCollegues.categorie = employeAbsent.categorie;
          }

          const collegues = await prisma.user.findMany({
            where: whereCollegues,
            select: { id: true }
          });

          if (collegues.length > 0) {
            await notifierAbsenceEquipe(
              collegues.map(c => c.id),
              conge,
              employeAbsent
            );
          }
        }
      } catch (notifEquipeError) {
        console.error('Erreur notification équipe:', notifEquipeError);
      }
    }

    // 🔔 CRÉATION DE NOTIFICATION SI REFUSÉ (via service centralisé)
    if (statut === 'refusé' && congeAvant.statut !== 'refusé') {
      try {
        await notifierCongeRejete(conge, motifRefus);
      } catch (notifError) {
        console.error('Erreur notification congé refusé:', notifError);
      }
    }

    // 🆕 CRÉATION AUTOMATIQUE DES SHIFTS SI APPROUVÉ
    if (statut === 'approuvé' && congeAvant.statut !== 'approuvé') {
      
      // Créer un shift "absence" pour chaque jour du congé
      const dateDebut = new Date(conge.dateDebut);
      const dateFin = new Date(conge.dateFin);
      const shiftsCreated = [];
      
      let currentDate = new Date(dateDebut);
      currentDate.setHours(12, 0, 0, 0); // Midi pour éviter les problèmes de timezone
      
      while (currentDate <= dateFin) {
        // Vérifier si un shift existe déjà pour ce jour
        const shiftExistant = await prisma.shift.findFirst({
          where: {
            employeId: conge.userId,
            date: {
              gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0),
              lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 0, 0, 0)
            }
          }
        });

        if (!shiftExistant) {
          // Créer le shift absence
          const shift = await prisma.shift.create({
            data: {
              employeId: conge.userId,
              date: new Date(currentDate),
              type: 'absence',
              motif: conge.type, // CP, RTT, Maladie, etc.
              segments: []
            }
          });
          shiftsCreated.push(shift);
        } else {
        }

        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }

    }

    // 🆕 SUPPRESSION DES SHIFTS SI REFUSÉ, ANNULÉ OU REMIS EN ATTENTE
    if ((statut === 'refusé' || statut === 'annulé' || statut === 'en attente') && congeAvant.statut === 'approuvé') {
      
      const dateDebut = new Date(conge.dateDebut);
      const dateFin = new Date(conge.dateFin);
      
      // Supprimer les shifts "absence" liés à ce congé
      const shiftsSupprimes = await prisma.shift.deleteMany({
        where: {
          employeId: conge.userId,
          type: 'absence',
          motif: conge.type,
          date: {
            gte: dateDebut,
            lte: dateFin
          }
        }
      });

    }

    res.json(conge);
  } catch (error) {
    console.error("Erreur MAJ statut congé :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// @desc Récupérer les congés de l'utilisateur connecté
const getMesConges = async (req, res) => {
  const userId = req.user.userId;

  try {
    const mesConges = await prisma.conge.findMany({
      where: { userId },
      orderBy: { dateDebut: 'desc' },
    });

    res.json(mesConges);
  } catch (error) {
    console.error("Erreur récupération congés utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Marquer les demandes de congés comme vues
const marquerCongesCommeVus = async (req, res) => {
  try {
    // Récupérer les IDs des congés à marquer comme vus
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      // Si aucun ID n'est spécifié, on marque toutes les demandes en attente comme vues
      await prisma.conge.updateMany({
        where: {
          statut: 'en attente',
          vu: false
        },
        data: {
          vu: true
        }
      });
    } else {
      // Sinon, on marque uniquement les demandes spécifiées
      await prisma.conge.updateMany({
        where: {
          id: { in: ids.map(Number) },
          vu: false
        },
        data: {
          vu: true
        }
      });
    }
    
    res.status(200).json({ message: "Demandes marquées comme vues" });
  } catch (error) {
    console.error("Erreur lors du marquage des congés comme vus:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer uniquement le comptage des demandes en attente non vues
const getDemandesNonVues = async (req, res) => {
  try {
    const count = await prisma.conge.count({
      where: {
        statut: 'en attente',
        vu: false
      }
    });
    
    res.status(200).json({ count });
  } catch (error) {
    console.error("Erreur lors du comptage des demandes non vues:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  demanderConge,
  getTousLesConges,
  mettreAJourStatutConge,
  getMesConges,
  marquerCongesCommeVus,
  getDemandesNonVues
};
