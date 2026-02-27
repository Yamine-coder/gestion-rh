const prisma = require('../prisma/client');
const { enrichUserWithCategories } = require('../utils/categoriesHelper');

const getTousLesEmployes = async (req, res) => {
  try {
    // Récupérer tous les utilisateurs (employés + admins)
    const utilisateurs = await prisma.user.findMany({
      where: {
        role: { in: ['employee', 'admin'] }
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        categorie: true,
        categories: true, // ✅ Ajout du champ catégories multiples
        statut: true,
        createdAt: true,
        firstLoginDone: true, // Pour savoir si l'employé a déjà activé son compte
        // Champs de départ pour le turnover
        dateSortie: true,
        motifDepart: true,
        commentaireDepart: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Enrichir chaque utilisateur avec categoriesArray
    const enrichedUsers = utilisateurs.map(user => enrichUserWithCategories(user));

    res.json(enrichedUsers);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
};

module.exports = { getTousLesEmployes };
