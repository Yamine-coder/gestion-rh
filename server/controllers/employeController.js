const prisma = require('../prisma/client');

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
          statut: true,
          createdAt: true,
        },
      });

      console.log('🔍 [EMPLOYE CONTROLLER] Utilisateur trouvé:', utilisateur);

      if (!utilisateur) {
        console.log('❌ [EMPLOYE CONTROLLER] Utilisateur non trouvé pour ID:', id);
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      console.log('✅ [EMPLOYE CONTROLLER] Retour utilisateur unique');
      return res.json(utilisateur);
    }

    console.log('🔍 [EMPLOYE CONTROLLER] Récupération de TOUS les utilisateurs');

    // Récupérer TOUS les utilisateurs (employés ET admins)
    const utilisateurs = await prisma.user.findMany({
      // Plus de filtre sur le rôle - on récupère employés ET admins
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        categorie: true,
        statut: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📋 [EMPLOYE CONTROLLER] Liste utilisateurs récupérée: ${utilisateurs.length} utilisateurs`);
    console.log('- Répartition:', utilisateurs.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {}));

    console.log('✅ [EMPLOYE CONTROLLER] Retour liste complète');
    res.json(utilisateurs);
  } catch (error) {
    console.error("❌ [EMPLOYE CONTROLLER] Erreur récupération utilisateurs", error);
    console.error("❌ [EMPLOYE CONTROLLER] Stack:", error.stack);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
};

module.exports = { getTousLesEmployes };
