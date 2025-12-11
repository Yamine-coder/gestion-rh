const prisma = require('../prisma/client');
const { enrichUserWithCategories } = require('../utils/categoriesHelper');

const getTousLesEmployes = async (req, res) => {
  try {
    console.log('🔍 [EMPLOYE CONTROLLER] getTousLesEmployes appelé');
    console.log('🔍 [EMPLOYE CONTROLLER] Params:', req.params);
    console.log('🔍 [EMPLOYE CONTROLLER] Query:', req.query);
    
    const { id } = req.params;
    console.log('🔍 [EMPLOYE CONTROLLER] ID extrait:', id);
    
    if (id) {
      console.log('🔍 [EMPLOYE CONTROLLER] Récupération d\'un utilisateur spécifique:', id);
      // Récupérer un utilisateur spécifique (employé OU admin)
      const utilisateur = await prisma.user.findUnique({
        where: { 
          id: parseInt(id)
          // Plus de filtre sur le rôle - on récupère tous les utilisateurs
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
          // Champs de départ pour le turnover
          dateSortie: true,
          motifDepart: true,
          commentaireDepart: true,
        },
      });

      console.log('🔍 [EMPLOYE CONTROLLER] Utilisateur trouvé:', utilisateur);

      if (!utilisateur) {
        console.log('❌ [EMPLOYE CONTROLLER] Utilisateur non trouvé pour ID:', id);
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      // Enrichir avec categoriesArray
      const enrichedUser = enrichUserWithCategories(utilisateur);
      console.log('✅ [EMPLOYE CONTROLLER] Retour utilisateur unique avec categories:', enrichedUser.categoriesArray);
      return res.json(enrichedUser);
    }

    console.log('🔍 [EMPLOYE CONTROLLER] Récupération de TOUS les employés opérationnels');

    // Récupérer UNIQUEMENT les employés (pas admins, managers, RH)
    const utilisateurs = await prisma.user.findMany({
      where: {
        role: 'employee' // Uniquement les employés opérationnels
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

    console.log(`📋 [EMPLOYE CONTROLLER] Liste utilisateurs récupérée: ${enrichedUsers.length} utilisateurs`);
    console.log('- Répartition:', enrichedUsers.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {}));

    console.log('✅ [EMPLOYE CONTROLLER] Retour liste complète avec categories');
    res.json(enrichedUsers);
  } catch (error) {
    console.error("❌ [EMPLOYE CONTROLLER] Erreur récupération utilisateurs", error);
    console.error("❌ [EMPLOYE CONTROLLER] Stack:", error.stack);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
};

module.exports = { getTousLesEmployes };
