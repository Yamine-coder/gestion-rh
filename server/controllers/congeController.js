const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const scoringService = require('../services/scoringService');

// @desc Créer une nouvelle demande de congé
const demanderConge = async (req, res) => {
  const userId = req.user.userId;
  const { type, debut, fin, motif } = req.body;

  if (!type || !debut || !fin) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  try {
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

    // 🔔 Notifier les managers/admins d'une nouvelle demande
    try {
      const employe = await prisma.user.findUnique({
        where: { id: userId },
        select: { nom: true, prenom: true, email: true }
      });

      const managers = await prisma.user.findMany({
        where: { role: { in: ['admin', 'manager'] } },
        select: { id: true }
      });

      const employeName = employe?.prenom && employe?.nom 
        ? `${employe.prenom} ${employe.nom}` 
        : employe?.email || 'Un employé';

      const dateDebutStr = new Date(debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const dateFinStr = new Date(fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const nbJours = Math.ceil((new Date(fin) - new Date(debut)) / (1000 * 60 * 60 * 24) + 1);

      if (managers.length > 0) {
        await prisma.notifications.createMany({
          data: managers.map(manager => ({
            employe_id: manager.id,
            type: 'nouvelle_demande_conge',
            titre: 'Nouvelle demande de conge',
            message: JSON.stringify({
              text: `${employeName} demande un ${type} du ${dateDebutStr} au ${dateFinStr} (${nbJours} jour${nbJours > 1 ? 's' : ''})`,
              congeId: nouveauConge.id,
              employeNom: employeName
            }),
            lue: false
          }))
        });
        console.log(`Notification envoyee aux ${managers.length} manager(s) pour nouvelle demande de ${employeName}`);
      }
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
    console.log('🔍 Paramètres reçus dans getTousLesConges:', req.query);
    
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
            email: true,
            nom: true,
            prenom: true
          },
        },
      }
      // Commenté temporairement pour debugger
      // orderBy: {
      //   dateDebut: "desc",
      // },
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

    // 🔔 CRÉATION DE NOTIFICATION SI APPROUVÉ
    if (statut === 'approuvé' && congeAvant.statut !== 'approuvé') {
      // Notification pour l'employé concerné
      await prisma.notifications.create({
        data: {
          employe_id: conge.userId,
          type: 'conge_approuve',
          titre: 'Demande de congé approuvée',
          message: `Votre demande de congé (${conge.type}) du ${new Date(conge.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(conge.dateFin).toLocaleDateString('fr-FR')} a été approuvée.`
        }
      });
      console.log(`🔔 Notification créée pour l'employé ${conge.userId} - congé approuvé`);

      // 🆕 Notification pour l'équipe (collègues de la même catégorie)
      try {
        const employeAbsent = await prisma.user.findUnique({
          where: { id: conge.userId },
          select: { id: true, nom: true, prenom: true, categorie: true }
        });

        if (employeAbsent) {
          // Récupérer les collègues de la même équipe (catégorie)
          const whereCollegues = {
            statut: 'actif',
            role: 'employee',
            id: { not: conge.userId } // Exclure l'employé absent
          };
          
          // Filtrer par catégorie si l'employé en a une
          if (employeAbsent.categorie) {
            whereCollegues.categorie = employeAbsent.categorie;
          }

          const collegues = await prisma.user.findMany({
            where: whereCollegues,
            select: { id: true }
          });

          if (collegues.length > 0) {
            const nomComplet = `${employeAbsent.prenom} ${employeAbsent.nom}`;
            const dateDebut = new Date(conge.dateDebut).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            const dateFin = new Date(conge.dateFin).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            const isSingleDay = conge.dateDebut.toDateString() === conge.dateFin.toDateString();
            const periodeText = isSingleDay ? `le ${dateDebut}` : `du ${dateDebut} au ${dateFin}`;

            await prisma.notifications.createMany({
              data: collegues.map(collegue => ({
                employe_id: collegue.id,
                type: 'absence_equipe',
                titre: 'Absence équipe',
                message: JSON.stringify({
                  text: `${nomComplet} sera absent(e) ${periodeText} (${conge.type})`,
                  congeId: conge.id,
                  employeNom: nomComplet,
                  employeId: employeAbsent.id,
                  type: conge.type,
                  dateDebut: conge.dateDebut,
                  dateFin: conge.dateFin
                }),
                lue: false
              }))
            });
            console.log(`📅 Notification d'absence envoyée à ${collegues.length} collègue(s) de l'équipe ${employeAbsent.categorie || 'tous'}`);
          }
        }
      } catch (notifEquipeError) {
        console.error('Erreur notification équipe:', notifEquipeError);
        // Ne pas bloquer si la notif équipe échoue
      }
    }

    // 🔔 CRÉATION DE NOTIFICATION SI REFUSÉ
    if (statut === 'refusé' && congeAvant.statut !== 'refusé') {
      await prisma.notifications.create({
        data: {
          employe_id: conge.userId,
          type: 'conge_rejete',
          titre: 'Demande de congé refusée',
          message: `Votre demande de congé (${conge.type}) du ${new Date(conge.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(conge.dateFin).toLocaleDateString('fr-FR')} a été refusée${motifRefus ? '. Raison: ' + motifRefus : '.'}`
        }
      });
      console.log(`🔔 Notification créée pour l'employé ${conge.userId} - congé refusé`);
    }

    // 🆕 CRÉATION AUTOMATIQUE DES SHIFTS SI APPROUVÉ
    if (statut === 'approuvé' && congeAvant.statut !== 'approuvé') {
      console.log(`✅ Congé approuvé - Création des shifts pour l'employé ${conge.userId}`);
      
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
          console.log(`⚠️  Shift existant pour ${currentDate.toLocaleDateString('fr-FR')} - non créé`);
        }

        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`✅ ${shiftsCreated.length} shifts "absence" créés pour le congé #${conge.id}`);
    }

    // 🆕 SUPPRESSION DES SHIFTS SI REFUSÉ, ANNULÉ OU REMIS EN ATTENTE
    if ((statut === 'refusé' || statut === 'annulé' || statut === 'en attente') && congeAvant.statut === 'approuvé') {
      console.log(`❌ Congé ${statut} (était approuvé) - Suppression des shifts pour le congé #${conge.id}`);
      
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

      console.log(`✅ ${shiftsSupprimes.count} shifts "absence" supprimés`);
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
