const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// @desc Créer une nouvelle demande de congé
const demanderConge = async (req, res) => {
  const userId = req.user.userId;
  const { type, debut, fin } = req.body;

  if (!type || !debut || !fin) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  try {
    const nouveauConge = await prisma.conge.create({
      data: {
        type,
        dateDebut: new Date(debut),
        dateFin: new Date(fin),
        statut: "en attente",
        vu: false, // Nouvelle demande = pas encore vue
        userId,
      },
    });

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

// @desc Modifier le statut d’un congé
const mettreAJourStatutConge = async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  try {
    const conge = await prisma.conge.update({
      where: { id: parseInt(id) },
      data: { statut },
    });
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
