// server/controllers/adminController.js
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const { genererMotDePasseListible } = require('../utils/passwordUtils');
const { toLocalDateString } = require('../utils/dateUtils');
const { stringifyCategories, parseCategories, CATEGORIES_VALIDES, enrichUserWithCategories, normaliserCategorie, normaliserCategories } = require('../utils/categoriesHelper');
const { isEntree, isSortie, filtrerEntrees, filtrerSorties, TYPES_ENTREE } = require('../utils/pointageTypeUtils');
const { invalidateStatusCache } = require('../middlewares/authMiddleware');
const { parseSegments } = require('../utils/segmentUtils');
const { getBusinessDayBoundsUTC } = require('../utils/businessDayUtils');
const { envoyerIdentifiants } = require('../utils/emailService');

const creerEmploye = async (req, res) => {
  // Support des catégories multiples : 'categories' (array) OU 'categorie' (string legacy)
  const { email, nom, prenom, telephone, categorie, categories, dateEmbauche, role } = req.body;



  // Déterminer les catégories : priorité à 'categories' (array), sinon fallback sur 'categorie' (string)
  let categoriesArray = [];
  if (categories && Array.isArray(categories) && categories.length > 0) {
    categoriesArray = categories;
  } else if (categorie && categorie.trim()) {
    categoriesArray = [categorie.trim()];
  }

  // ✅ VALIDATION DES CHAMPS OBLIGATOIRES
  if (!email || !email.trim()) {
    return res.status(400).json({ 
      error: "L'email est obligatoire",
      code: "EMAIL_REQUIRED" 
    });
  }

  if (!nom || !nom.trim()) {
    return res.status(400).json({ 
      error: "Le nom est obligatoire",
      code: "NOM_REQUIRED" 
    });
  }

  if (!prenom || !prenom.trim()) {
    return res.status(400).json({ 
      error: "Le prénom est obligatoire",
      code: "PRENOM_REQUIRED" 
    });
  }

  // Validation catégorie(s) : au moins une requise
  if (categoriesArray.length === 0) {
    return res.status(400).json({ 
      error: "Au moins une catégorie est obligatoire",
      code: "CATEGORIE_REQUIRED" 
    });
  }

  // Normalisation automatique des catégories (case-insensitive → référentiel)
  const { valides: categoriesNormalisees, invalides: categoriesInvalides } = normaliserCategories(categoriesArray);
  if (categoriesInvalides.length > 0) {
    return res.status(400).json({ 
      error: `Catégories invalides: ${categoriesInvalides.join(', ')}`,
      code: "CATEGORIE_INVALID",
      categoriesValides: CATEGORIES_VALIDES
    });
  }
  // Utiliser les catégories normalisées pour la suite
  categoriesArray = categoriesNormalisees;

  // Validation format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: "Format d'email invalide",
      code: "EMAIL_INVALID" 
    });
  }

  // Validation téléphone (optionnel mais si fourni, doit être valide)
  if (telephone) {
    const cleanedPhone = telephone.replace(/\D/g, '');
    if (cleanedPhone.length > 0 && cleanedPhone.length !== 10) {
      return res.status(400).json({ 
        error: "Le numéro de téléphone doit contenir 10 chiffres",
        code: "TELEPHONE_INVALID" 
      });
    }
  }

  try {
    // ✅ Normaliser l'email en minuscules pour cohérence avec le login
    const normalizedEmail = email.toLowerCase().trim();
    
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    // Génération mot de passe temporaire lisible
    const motDePasseTemporaire = genererMotDePasseListible();
    const hashedPassword = await bcrypt.hash(motDePasseTemporaire, 10);

    const dateEmbaucheEffective = dateEmbauche ? new Date(dateEmbauche) : new Date();

    const nouvelEmploye = await prisma.user.create({
      data: {
        email: normalizedEmail, // ✅ Utilise l'email normalisé
        password: hashedPassword,
        nom,
        prenom,
        telephone,
        categorie: categoriesArray[0], // Garde la première catégorie pour compatibilité legacy
        categories: stringifyCategories(categoriesArray), // JSON array pour multi-catégories
        // ✅ Date d'embauche : Si non fournie, utiliser la date du jour
        dateEmbauche: dateEmbaucheEffective,
        role: role || "employee", // ✅ Utilise le rôle envoyé ou "employee" par défaut
        firstLoginDone: false,
        statut: "actif"
      },
    });

    // 📊 Archiver le mouvement d'entrée (survit aux hard-deletes pour le turnover)
    try {
      await prisma.mouvementEffectif.create({
        data: {
          userId: nouvelEmploye.id,
          type: 'entree',
          date: dateEmbaucheEffective,
          nom,
          prenom,
          categories: stringifyCategories(categoriesArray),
        }
      });
    } catch (e) {
      console.warn('Mouvement effectif (entrée) non enregistré:', e.message);
    }

    res.status(201).json({
      message: "Employé créé avec succès",
      user: { 
        id: nouvelEmploye.id,
        email: nouvelEmploye.email, 
        nom: nouvelEmploye.nom,
        prenom: nouvelEmploye.prenom,
        telephone: nouvelEmploye.telephone,
        categorie: nouvelEmploye.categorie, // Legacy
        categories: nouvelEmploye.categories, // JSON string
        categoriesArray: categoriesArray, // Array parsed pour facilité frontend
        dateEmbauche: nouvelEmploye.dateEmbauche,
        role: nouvelEmploye.role,
        statut: nouvelEmploye.statut
      },
      instructions: "L'employé devra changer ce mot de passe lors de sa première connexion.",
      motDePasseTemporaire: motDePasseTemporaire
    });
  } catch (err) {
    console.error("Erreur création employé :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const supprimerEmploye = async (req, res) => {
  const employeId = parseInt(req.params.id);

  // Validation ID
  if (isNaN(employeId)) {
    return res.status(400).json({
      error: "ID invalide",
      code: "INVALID_ID",
      raw: req.params.id
    });
  }

  try {
    // Vérifier si l'employé existe
    const employe = await prisma.user.findUnique({
      where: { id: employeId },
      include: {
        _count: { select: { conges: true, pointages: true, shifts: true } }
      }
    });

    if (!employe) {
      return res.status(404).json({ 
        error: "Employé non trouvé",
        code: "NOT_FOUND",
        details: "L'employé que vous essayez de supprimer n'existe pas." 
      });
    }

    // 🔒 RÈGLE MÉTIER : Ne pas supprimer un employé actif (sans date de sortie)
    if (!employe.dateSortie) {
      return res.status(400).json({
        error: "Suppression interdite",
        code: "EMPLOYEE_ACTIVE",
        details: "Vous ne pouvez pas supprimer un employé actif. Veuillez d'abord enregistrer son départ."
      });
    }

    // ⚠️ RGPD : Avertissement si suppression avant 2 ans (données utiles pour litiges)
    const deuxAns = 2 * 365 * 24 * 60 * 60 * 1000; // 2 ans en millisecondes
    const dateSortie = new Date(employe.dateSortie);
    const maintenant = new Date();
    const delaiEcoule = maintenant - dateSortie;

    if (delaiEcoule < deuxAns) {
      const joursRestants = Math.ceil((deuxAns - delaiEcoule) / (24 * 60 * 60 * 1000));
      // On autorise mais on log un warning
    }

    await prisma.$transaction(async (tx) => {
      // 📊 S'assurer que les mouvements d'effectif sont archivés avant le hard-delete
      // Vérifier si le mouvement de sortie existe déjà
      const mouvementSortieExiste = await tx.mouvementEffectif.findFirst({
        where: { userId: employeId, type: 'sortie' }
      });
      if (!mouvementSortieExiste && employe.dateSortie) {
        await tx.mouvementEffectif.create({
          data: {
            userId: employeId,
            type: 'sortie',
            date: employe.dateSortie,
            motif: employe.motifDepart,
            nom: employe.nom,
            prenom: employe.prenom,
            categories: employe.categories,
          }
        });
      }
      // Vérifier si le mouvement d'entrée existe déjà
      const mouvementEntreeExiste = await tx.mouvementEffectif.findFirst({
        where: { userId: employeId, type: 'entree' }
      });
      if (!mouvementEntreeExiste && employe.dateEmbauche) {
        await tx.mouvementEffectif.create({
          data: {
            userId: employeId,
            type: 'entree',
            date: employe.dateEmbauche,
            nom: employe.nom,
            prenom: employe.prenom,
            categories: employe.categories,
          }
        });
      }
      // Détacher le userId des mouvements (l'employé va être supprimé)
      await tx.mouvementEffectif.updateMany({
        where: { userId: employeId },
        data: { userId: null }
      });

      // 1. Supprimer les notifications
      await tx.notifications.deleteMany({ where: { employe_id: employeId } });
      
      // 2. Supprimer l'historique des modifications
      await tx.historique_modifications.deleteMany({ where: { employe_id: employeId } });
      
      // 3. Supprimer les demandes de modification (employe_id a onDelete: Cascade, mais on nettoie aussi valide_par)
      await tx.demandes_modification.deleteMany({ where: { employe_id: employeId } });
      await tx.demandes_modification.updateMany({ 
        where: { valide_par: employeId }, 
        data: { valide_par: null } 
      });
      
      // 4. Supprimer le score employé
      await tx.employeScore.deleteMany({ where: { employeId } });
      
      // 5. Supprimer les paiements extra (en tant qu'employé)
      await tx.paiementExtra.deleteMany({ where: { employeId } });
      // Mettre à null les références creePar/payePar si c'est cet employé
      await tx.paiementExtra.updateMany({ where: { creePar: employeId }, data: { creePar: req.userId } }); // Réassigner à l'admin qui supprime
      await tx.paiementExtra.updateMany({ where: { payePar: employeId }, data: { payePar: null } });
      
      // 6. Supprimer les extra payment logs
      await tx.extraPaymentLog.deleteMany({ where: { employeId } });
      await tx.extraPaymentLog.deleteMany({ where: { changedByUserId: employeId } });
      
      // 7. Supprimer les password resets
      await tx.passwordReset.deleteMany({ where: { userId: employeId } });
      
      // 8. Traiter les anomalies (en tant qu'employé ou traiteur)
      // D'abord supprimer les audits et corrections liés aux anomalies de cet employé
      const anomaliesEmploye = await tx.anomalie.findMany({ where: { employeId }, select: { id: true } });
      const anomalieIds = anomaliesEmploye.map(a => a.id);
      if (anomalieIds.length > 0) {
        await tx.anomalieAudit.deleteMany({ where: { anomalieId: { in: anomalieIds } } });
        await tx.shiftCorrection.deleteMany({ where: { anomalieId: { in: anomalieIds } } });
        await tx.paiementExtra.deleteMany({ where: { anomalieId: { in: anomalieIds } } });
      }
      await tx.anomalie.deleteMany({ where: { employeId } });
      // Mettre à null le traiteur si c'est cet employé
      await tx.anomalie.updateMany({ where: { traitePar: employeId }, data: { traitePar: null } });
      
      // 9. Supprimer les shifts et leurs corrections
      const shiftsEmploye = await tx.shift.findMany({ where: { employeId }, select: { id: true } });
      const shiftIds = shiftsEmploye.map(s => s.id);
      if (shiftIds.length > 0) {
        await tx.shiftCorrection.deleteMany({ where: { shiftId: { in: shiftIds } } });
        await tx.extraPaymentLog.deleteMany({ where: { shiftId: { in: shiftIds } } });
        await tx.paiementExtra.deleteMany({ where: { shiftId: { in: shiftIds } } });
        // Supprimer les demandes de remplacement liées aux shifts
        await tx.demandeRemplacement.deleteMany({ where: { shiftId: { in: shiftIds } } });
      }
      await tx.shift.deleteMany({ where: { employeId } });
      
      // 10. Supprimer les demandes de remplacement (comme absent, remplaçant ou valideur)
      // D'abord supprimer les candidatures de cet employé
      await tx.candidatureRemplacement.deleteMany({ where: { employeId: employeId } });
      // Puis supprimer les candidatures sur les demandes où cet employé est absent (via cascade normalement, mais on s'assure)
      const demandesAbsent = await tx.demandeRemplacement.findMany({ where: { employeAbsentId: employeId }, select: { id: true } });
      if (demandesAbsent.length > 0) {
        await tx.candidatureRemplacement.deleteMany({ where: { demandeRemplacementId: { in: demandesAbsent.map(d => d.id) } } });
      }
      await tx.demandeRemplacement.deleteMany({ where: { employeAbsentId: employeId } });
      await tx.demandeRemplacement.deleteMany({ where: { employeRemplacantId: employeId } });
      await tx.demandeRemplacement.updateMany({ where: { validePar: employeId }, data: { validePar: null } });
      
      // 11. Supprimer les justificatifs Navigo
      await tx.justificatifNavigo.deleteMany({ where: { userId: employeId } });
      await tx.justificatifNavigo.updateMany({ where: { validePar: employeId }, data: { validePar: null } });
      
      // 12. Supprimer les congés
      await tx.conge.deleteMany({ where: { userId: employeId } });
      
      // 13. Supprimer les pointages
      await tx.pointage.deleteMany({ where: { userId: employeId } });
      
      // 14. Supprimer les audits d'anomalies créés par cet employé
      await tx.anomalieAudit.deleteMany({ where: { userId: employeId } });
      
      // 14b. Supprimer les AuditLog de cet employé
      await tx.auditLog.deleteMany({ where: { userId: employeId } });
      
      // 15. Mettre à jour les ShiftCorrection où cet employé est auteur/approbateur
      await tx.shiftCorrection.updateMany({ where: { auteurId: employeId }, data: { auteurId: req.userId } });
      await tx.shiftCorrection.updateMany({ where: { approuvePar: employeId }, data: { approuvePar: null } });
      
      // 16. Supprimer les tables SQL legacy (non gérées par Prisma)
      await tx.$executeRaw`DELETE FROM employe_points WHERE employe_id = ${employeId}`;
      await tx.$executeRaw`DELETE FROM employe_points WHERE created_by = ${employeId}`;
      await tx.$executeRaw`DELETE FROM employee_scores WHERE employee_id = ${employeId}`;
      await tx.$executeRaw`DELETE FROM peer_feedbacks WHERE to_employee_id = ${employeId}`;
      await tx.$executeRaw`DELETE FROM peer_feedbacks WHERE from_employee_id = ${employeId}`;
      await tx.$executeRaw`UPDATE peer_feedbacks SET validated_by = NULL WHERE validated_by = ${employeId}`;
      await tx.$executeRaw`DELETE FROM score_history WHERE employee_id = ${employeId}`;
      await tx.$executeRaw`UPDATE score_history SET created_by = ${req.userId} WHERE created_by = ${employeId}`;
      
      // 17. Finalement supprimer l'utilisateur
      await tx.user.delete({ where: { id: employeId } });
    });

    return res.status(200).json({ message: "Employé supprimé avec succès." });
  } catch (error) {
    // Logs détaillés
    console.error('Erreur suppression détaillée:', {
      code: error.code,
      name: error.name,
      message: error.message,
      meta: error.meta,
      stack: error.stack?.split('\n').slice(0,4).join('\n')
    });

    let status = 500;
    let errorMessage = "Erreur lors de la suppression de l'employé.";
    let code = error.code || 'UNKNOWN';

    if (code === 'P2025') { // Record not found
      status = 404; errorMessage = "Employé déjà supprimé.";
    } else if (code === 'P2003') { // FK constraint
      status = 400; errorMessage = "Impossible de supprimer: des données liées existent.";
    } else if (code === 'P2034') { // Transaction failed
      status = 500; errorMessage = "Échec de transaction, réessayez.";
    }

    return res.status(status).json({
      error: errorMessage,
      code,
      details: error.meta || null,
      raw: error.message
    });
  }
};

const modifierEmploye = async (req, res) => {
  const { id } = req.params;
  const { email, nom, prenom, role, categorie, categories, statut, telephone } = req.body;

  try {
    // Construire l'objet de mise à jour avec seulement les champs fournis
    const updateData = {};
    
    if (email !== undefined) updateData.email = email;
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (role !== undefined) updateData.role = role;
    
    // Gestion des catégories multiples avec normalisation automatique
    if (categories !== undefined && Array.isArray(categories)) {
      if (categories.length === 0) {
        return res.status(400).json({ 
          error: "Au moins une catégorie est obligatoire",
          code: "CATEGORIE_REQUIRED" 
        });
      }
      const { valides, invalides } = normaliserCategories(categories);
      if (invalides.length > 0) {
        return res.status(400).json({ 
          error: `Catégories invalides: ${invalides.join(', ')}`,
          code: "CATEGORIE_INVALID",
          categoriesValides: CATEGORIES_VALIDES
        });
      }
      updateData.categories = stringifyCategories(valides);
      updateData.categorie = valides[0]; // Sync la catégorie principale
    } else if (categorie !== undefined) {
      // Fallback sur categorie simple (legacy) — normaliser aussi
      const norm = normaliserCategorie(categorie);
      if (!norm) {
        return res.status(400).json({ 
          error: `Catégorie invalide: ${categorie}`,
          code: "CATEGORIE_INVALID",
          categoriesValides: CATEGORIES_VALIDES
        });
      }
      updateData.categorie = norm;
      updateData.categories = stringifyCategories([norm]);
    }
    
    if (statut !== undefined) {
      updateData.statut = statut;
    }
    if (telephone !== undefined) updateData.telephone = telephone;
    
    // Vérifier qu'il y a au moins un champ à mettre à jour
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Aucune donnée à modifier" });
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Invalider le cache auth si le statut a changé
    if (statut !== undefined) {
      invalidateStatusCache(parseInt(id));
    }

    // Enrichir la réponse avec categoriesArray
    const enrichedUser = enrichUserWithCategories(updated);
    res.status(200).json(enrichedUser);
  } catch (err) {
    console.error("Erreur modification employé :", err);
    
    // Gestion des erreurs spécifiques
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "Cet email est déjà utilisé par un autre utilisateur" });
    }
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "Employé non trouvé" });
    }
    
    res.status(500).json({ error: "Erreur lors de la modification" });
  }
};

// 🚪 Marquer le départ d'un employé (turnover)
const marquerDepart = async (req, res) => {
  const { id } = req.params;
  const { dateSortie, motifDepart, commentaireDepart } = req.body;

  try {
    // Vérifier que l'employé existe et est un employé
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!employe) {
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    if (employe.role !== 'employee') {
      return res.status(400).json({ error: "Cette action est réservée aux employés uniquement" });
    }

    if (employe.dateSortie) {
      return res.status(400).json({ error: "Le départ de cet employé a déjà été enregistré" });
    }

    // Validation des champs requis
    if (!dateSortie || !motifDepart) {
      return res.status(400).json({ error: "Date de sortie et motif sont obligatoires" });
    }

    // Mettre à jour l'employé avec les informations de départ
    // 🔒 Désactiver automatiquement le compte lors du départ
    // + Nettoyage complet des données futures (shifts, congés, remplacements)
    const employeIdInt = parseInt(id);
    const now = new Date();
    const dateSortieDate = new Date(dateSortie);
    // Nettoyage à partir de la date de sortie (ou maintenant si sortie passée)
    const cleanupDate = dateSortieDate > now ? dateSortieDate : now;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut
      const updatedUser = await tx.user.update({
        where: { id: employeIdInt },
        data: {
          statut: 'inactif',
          dateSortie: dateSortieDate,
          motifDepart,
          commentaireDepart: commentaireDepart || null
        },
      });

      // 📊 Archiver le mouvement de sortie (survit aux hard-deletes pour le turnover)
      await tx.mouvementEffectif.create({
        data: {
          userId: employeIdInt,
          type: 'sortie',
          date: dateSortieDate,
          motif: motifDepart,
          nom: employe.nom,
          prenom: employe.prenom,
          categories: employe.categories,
        }
      });

      // 2. Supprimer les shifts futurs (après la date de sortie)
      const deletedShifts = await tx.shift.deleteMany({
        where: {
          employeId: employeIdInt,
          date: { gte: cleanupDate }
        }
      });

      // 3. Annuler les congés en attente
      const cancelledConges = await tx.conge.updateMany({
        where: {
          userId: employeIdInt,
          statut: 'en attente'
        },
        data: {
          statut: 'annulé',
          motifRefus: 'Annulé automatiquement — départ de l\'employé'
        }
      });

      // 4. Annuler les demandes de remplacement actives
      try {
        const cancelledRemplacements = await tx.demandeRemplacement.updateMany({
          where: {
            employeAbsentId: employeIdInt,
            statut: { in: ['ouverte', 'en_attente'] }
          },
          data: { statut: 'annulee' }
        });
      } catch (e) {
        // Table peut ne pas exister
      }

      // 5. Clôturer les anomalies en attente
      try {
        const closedAnomalies = await tx.anomalie.updateMany({
          where: {
            employeId: employeIdInt,
            statut: 'en_attente'
          },
          data: {
            statut: 'refusee',
            commentaire: 'Clôturée automatiquement — départ de l\'employé'
          }
        });
      } catch (e) {
        // Table peut ne pas exister
      }

      return updatedUser;
    });

    // Invalider le cache auth pour bloquer immédiatement les requêtes
    invalidateStatusCache(employeIdInt);

    res.status(200).json(updated);
  } catch (err) {
    console.error("Erreur enregistrement départ :", err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du départ" });
  }
};

// 🔄 Annuler le départ d'un employé (réembauche ou erreur)
const annulerDepart = async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier que l'employé existe
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!employe) {
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    if (!employe.dateSortie) {
      return res.status(400).json({ error: "Cet employé n'a pas de départ enregistré" });
    }

    // Réactiver l'employé et annuler le départ (en transaction)
    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: parseInt(id) },
        data: {
          statut: 'actif', // ✅ Réactivation du compte
          dateSortie: null,
          motifDepart: null,
          commentaireDepart: null
        },
      });

      // 📊 Supprimer le mouvement de sortie correspondant (annulation = pas de départ)
      await tx.mouvementEffectif.deleteMany({
        where: {
          userId: parseInt(id),
          type: 'sortie',
        }
      });

      return updatedUser;
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error("Erreur annulation départ :", err);
    res.status(500).json({ error: "Erreur lors de l'annulation du départ" });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    // Début de journée (locale) - ajuster pour timezone UTC
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Bornes jour business (05:00 Paris → 04:59 J+1)
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const { start: startPointage, end: finPointage } = getBusinessDayBoundsUTC(todayStr);
    
    const now = today;    // Gestion de la période depuis les paramètres de requête
    const { periode = 'mois' } = req.query;
    const startDate = new Date(startOfToday);
    
    switch (periode) {
      case 'semaine':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'mois':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'trimestre':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'annee':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Données de base
    const employes = await prisma.user.count({ where: { role: 'employee', statut: 'actif' } });

    // Pointages (arrivées) de la journée (fenêtre timezone-aware) pour calcul du taux
    // Filtrer uniquement les employés (pas les admins/managers)
    const pointesAujourdHui = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: startPointage, lte: finPointage },
        type: { in: TYPES_ENTREE },
        user: {
          role: 'employee'
        }
      },
      distinct: ['userId']
    });

    // Calcul sur les 7 derniers jours pour les heures travaillées
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    last7Days.setHours(0, 0, 0, 0);

    // Calcul des heures travaillées aujourd'hui (jour business)
  const { start: startBusiness, end: finEtendue } = getBusinessDayBoundsUTC(todayStr);
  const tempsPresenceAujourdhui = await calculerTotalHeures(startBusiness, finEtendue);

    // Demandes en attente
    const demandesAttente = await prisma.conge.count({
      where: { statut: 'en attente' },
    });

    // Congés ce mois-ci
    const premierDuMois = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    const congesCeMois = await prisma.conge.count({
      where: {
        dateDebut: { gte: premierDuMois },
      },
    });

    // Répartition des types de congés - uniquement les congés validés dans la période
    const congesPeriode = await prisma.conge.findMany({
      where: {
        statut: { in: ['approuve', 'approuvé'] },
        // Congés qui chevauchent la période sélectionnée
        OR: [
          // Congé qui commence dans la période
          { dateDebut: { gte: startDate, lte: today } },
          // Congé qui finit dans la période
          { dateFin: { gte: startDate, lte: today } },
          // Congé qui englobe toute la période
          { AND: [{ dateDebut: { lte: startDate } }, { dateFin: { gte: today } }] }
        ]
      },
    });

    const congesParType = {};
    let totalJoursConges = 0;
    congesPeriode.forEach((c) => {
      const nbJours = Math.ceil(
        (new Date(c.dateFin) - new Date(c.dateDebut)) / (1000 * 60 * 60 * 24) + 1
      );
      if (!congesParType[c.type]) {
        congesParType[c.type] = 0;
      }
      congesParType[c.type] += nbJours;
      totalJoursConges += nbJours;
    });
    
    // Format: { name, value } pour le graphique PieChart du frontend
    const repartitionConges = Object.entries(congesParType).map(([type, jours]) => ({
      name: type,
      value: jours,
    }));

    // Statuts des demandes (pour la période sélectionnée)
    const statuts = await prisma.conge.groupBy({
      by: ['statut'],
      _count: true,
      where: {
        dateDebut: { gte: startDate },
        dateFin: { lte: today },
      },
    });

    const statutsDemandes = statuts.map((s) => ({
      statut: s.statut.charAt(0).toUpperCase() + s.statut.slice(1),
      value: s._count,
      color: s.statut === 'approuvé' || s.statut === 'approuve' ? '#10B981' : 
             s.statut === 'en attente' ? '#FBBF24' : '#cf292c'
    }));

    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const congesSemaine = await prisma.conge.count({
      where: {
        dateDebut: { lte: endOfWeek },
        dateFin: { gte: today },
        statut: { in: ['approuvé', 'approuve'] },
      },
    });

    const prochainsConges = await prisma.conge.findMany({
      where: { dateDebut: { gte: today }, statut: { in: ['approuvé', 'approuve'] } },
      include: { user: true },
      take: 5,
      orderBy: { dateDebut: 'asc' },
    });

    // 👁️ Calculs pour la section "À surveiller" - Données hebdomadaires pertinentes
    
    // Période : début de semaine (lundi) au jour actuel
    const debutSemaine = new Date();
    const joursDepuisLundi = (debutSemaine.getDay() + 6) % 7; // 0 = lundi, 6 = dimanche
    debutSemaine.setDate(debutSemaine.getDate() - joursDepuisLundi);
    debutSemaine.setHours(0, 0, 0, 0);
    
    // 1. Employés absents cette semaine (aucun pointage d'arrivée)
    const employesAvecPointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: debutSemaine, lte: today },
        type: { in: TYPES_ENTREE },
        user: {
          role: 'employee'
        }
      },
      select: { userId: true },
      distinct: ['userId']
    });
    
    // S'assurer que le nombre d'employés absents ne peut pas être négatif
    const employesAbsents = Math.max(0, employes - employesAvecPointages.length);
    
    // 2. Employés avec retards répétés cette semaine 
    // Compter les employés qui ont eu au moins un pointage d'arrivée tardif
    const employesAvecRetards = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: debutSemaine, lte: today },
        type: { in: TYPES_ENTREE },
        user: {
          role: 'employee'
        }
      },
      select: { 
        userId: true,
        horodatage: true 
      }
    });
    
    // Simulation : considérer qu'un employé est en retard s'il pointe après 9h
    const employsRetardsSet = new Set();
    employesAvecRetards.forEach(pointage => {
      const heure = pointage.horodatage.getHours();
      if (heure >= 9) { // Retard si pointage à 9h ou après
        employsRetardsSet.add(pointage.userId);
      }
    });
    
    const employesEnRetard = employsRetardsSet.size;
    
    // 3. Employés avec écart entre heures prévues et réalisées
    const shiftsWeek = await prisma.shift.count({
      where: {
        date: { gte: debutSemaine, lte: today }
      }
    });
    
    const pointagesWeek = await prisma.pointage.count({
      where: {
        horodatage: { gte: debutSemaine, lte: today }
      }
    });
    
    // Si moins de pointages que de shifts, certains employés n'ont pas respecté leur planning
    const employesEcartPlanning = shiftsWeek > 0 ? Math.max(0, Math.min(3, Math.floor((shiftsWeek - pointagesWeek) / 2))) : 0;

    // 📊 NOUVEAUX KPIs CALCULÉS
    
    // 1. Durée moyenne de travail par jour (calculée sur toute la période)
    // Récupérer tous les pointages de la période pour calculer précisément
    const pointagesPeriode = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: startDate, lte: today }
      },
      orderBy: { horodatage: 'asc' }
    });

    // Grouper par employé et par jour pour calculer les heures réelles
    const pointagesParEmploye = {};
    pointagesPeriode.forEach(p => {
      if (!pointagesParEmploye[p.userId]) pointagesParEmploye[p.userId] = {};
      const dateStr = toLocalDateString(p.horodatage);
      if (!pointagesParEmploye[p.userId][dateStr]) pointagesParEmploye[p.userId][dateStr] = [];
      pointagesParEmploye[p.userId][dateStr].push(p);
    });

    let totalHeuresPeriode = 0;
    let joursTravailes = 0;

    for (const [userId, jours] of Object.entries(pointagesParEmploye)) {
      for (const [date, pointages] of Object.entries(jours)) {
        // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes de types
        const entrees = filtrerEntrees(pointages).sort((a, b) => a.horodatage - b.horodatage);
        const sorties = filtrerSorties(pointages).sort((a, b) => a.horodatage - b.horodatage);
        if (entrees.length > 0 && sorties.length > 0) {
          const heuresJour = (sorties[sorties.length - 1].horodatage - entrees[0].horodatage) / (1000 * 60 * 60);
          totalHeuresPeriode += heuresJour;
          joursTravailes++;
        }
      }
    }

    const dureeMoyenneJour = joursTravailes > 0 ? (totalHeuresPeriode / joursTravailes).toFixed(1) : 0;
    
    // 2. Taux d'absentéisme CORRIGÉ : basé sur shifts planifiés vs heures réelles
    // Récupérer tous les shifts planifiés de la période (utilise employeId et segments)
    // Inclure uniquement les shifts de type 'travail' (type unifié)
    const shiftsTheorique = await prisma.shift.findMany({
      where: {
        date: { gte: startDate, lte: today },
        type: 'travail',
        employe: { role: 'employee' }
      }
    });

    // Calculer les heures théoriques totales basées sur les segments des shifts
    const heuresTheorique = shiftsTheorique.reduce((acc, shift) => {
      // Les shifts utilisent le champ 'segments' (JSON array)
      const segments = parseSegments(shift.segments);
      if (segments.length === 0) return acc;
      
      let heuresShift = 0;
      segments.forEach(segment => {
        if (segment.start && segment.end && !segment.isExtra) {
          try {
            const [startH, startM] = segment.start.split(':').map(Number);
            const [endH, endM] = segment.end.split(':').map(Number);
            
            let startMinutes = startH * 60 + startM;
            let endMinutes = endH * 60 + endM;
            
            // Gérer le passage à minuit (shift de nuit)
            if (endMinutes < startMinutes) {
              endMinutes += 24 * 60;
            }
            
            heuresShift += (endMinutes - startMinutes) / 60;
          } catch (e) {
            // parsing error ignored
          }
        }
      });
      
      return acc + heuresShift;
    }, 0);

    // Calculer l'absentéisme : écart entre heures théoriques et heures réelles
    const heuresAbsence = Math.max(0, heuresTheorique - totalHeuresPeriode);
    const tauxAbsenteisme = heuresTheorique > 0 ? ((heuresAbsence / heuresTheorique) * 100).toFixed(1) : 0;
    
    // 3. Taux de retards sur la période - CORRIGÉ pour comparer avec shifts planifiés
    const totalPointagesEntree = await prisma.pointage.count({
      where: {
        horodatage: { gte: startDate, lte: today },
        type: { in: TYPES_ENTREE },
        user: { role: 'employee' }
      }
    });
    
    // Récupérer tous les pointages d'entrée avec infos utilisateur
    const pointagesRetard = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: startDate, lte: today },
        type: { in: TYPES_ENTREE },
        user: { role: 'employee' }
      },
      include: {
        user: { select: { id: true } }
      }
    });
    
    // Compter les retards en comparant avec les shifts planifiés
    let nombreRetards = 0;
    for (const pointage of pointagesRetard) {
      const datePointage = new Date(pointage.horodatage);
      const dateStr = toLocalDateString(datePointage);
      
      // Chercher le shift de cet employé ce jour-là
      const shiftJour = shiftsTheorique.find(s => 
        s.employeId === pointage.userId && 
        toLocalDateString(s.date) === dateStr
      );
      
      if (shiftJour && shiftJour.segments) {
        const parsedSegments = parseSegments(shiftJour.segments);
        if (parsedSegments.length > 0) {
        // Prendre le premier segment comme heure de début prévue
        const premierSegment = parsedSegments[0];
        if (premierSegment.start) {
          const [heurePrevu, minutePrevu] = premierSegment.start.split(':').map(Number);
          const heurePointage = datePointage.getHours();
          const minutePointage = datePointage.getMinutes();
          
          // En retard si arrive après l'heure prévue (+ 5 min de tolérance)
          const minutesPrevues = heurePrevu * 60 + minutePrevu;
          const minutesReelles = heurePointage * 60 + minutePointage;
          
          if (minutesReelles > minutesPrevues + 5) {
            nombreRetards++;
          }
        }
        }
      }
    }
    
    const tauxRetards = totalPointagesEntree > 0 ? ((nombreRetards / totalPointagesEntree) * 100).toFixed(1) : 0;
    const tauxPonctualite = (100 - parseFloat(tauxRetards)).toFixed(1);
    // 3bis. Taux d'assiduité : heures réellement travaillées / heures planifiées
    // Un employé en retard qui rattrape aura une bonne assiduité mais mauvaise ponctualité
    // >100% = les employés font des heures sup, <100% = heures manquantes
    const tauxAssiduite = heuresTheorique > 0 
      ? ((totalHeuresPeriode / heuresTheorique) * 100).toFixed(1)
      : '100.0';
    // 4. Top 3 employés (présence + ponctualité) - CORRIGÉ pour utiliser shifts planifiés
    const employesAvecStats = await prisma.user.findMany({
      where: { role: 'employee', statut: 'actif' },
      include: {
        pointages: {
          where: {
            horodatage: { gte: startDate, lte: today }
          }
        },
        conges: {
          where: {
            dateDebut: { gte: startDate },
            dateFin: { lte: today },
            statut: 'approuvé'
          }
        },
        shifts: {
          where: {
            date: { gte: startDate, lte: today },
            type: 'travail'
          }
        }
      }
    });
    
    // Récupérer les vrais scores depuis employe_points (même source que la page Scoring)
    const scoresFromPoints = await prisma.employePoint.groupBy({
      by: ['employeId'],
      _sum: { points: true }
    });
    const scoresMap = new Map(scoresFromPoints.map(s => [s.employeId, s._sum.points || 0]));

    const employesScores = employesAvecStats.map(emp => {
      // Taux de présence basé sur les shifts planifiés
      const pointagesEntrees = filtrerEntrees(emp.pointages);
      const totalPointages = pointagesEntrees.length;
      const totalShifts = emp.shifts.length;
      const tauxPresence = totalShifts > 0 ? Math.min(100, Math.round((totalPointages / totalShifts) * 100)) : 100;
      
      // Score = somme des points attribués (bonus - malus), identique à la page scoring
      const scoreTotal = scoresMap.get(emp.id) || 0;
      
      return {
        nom: `${emp.prenom} ${emp.nom}`,
        score: scoreTotal,
        presence: tauxPresence
      };
    });
    
    const topEmployes = employesScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    // 5. Employés problématiques (absences/retards excessifs) - CORRIGÉ
    const employesProblematiques = employesAvecStats
      .map(emp => {
        const totalAbsences = emp.conges.length;
        const totalShifts = emp.shifts.length;
        
        // Calculer les retards réels par rapport aux shifts
        // ✅ CORRIGÉ: Utiliser le helper centralisé pour filtrer les entrées
        let totalRetards = 0;
        filtrerEntrees(emp.pointages).forEach(pointage => {
          const datePointage = new Date(pointage.horodatage);
          const dateStr = toLocalDateString(datePointage);
          
          const shiftJour = emp.shifts.find(s => toLocalDateString(s.date) === dateStr);
          
          if (shiftJour && shiftJour.segments && shiftJour.segments.length > 0) {
            const premierSegment = shiftJour.segments[0];
            if (premierSegment.start) {
              const [heurePrevu, minutePrevu] = premierSegment.start.split(':').map(Number);
              const heurePointage = datePointage.getHours();
              const minutePointage = datePointage.getMinutes();
              
              const minutesPrevues = heurePrevu * 60 + minutePrevu;
              const minutesReelles = heurePointage * 60 + minutePointage;
              
              if (minutesReelles > minutesPrevues + 5) {
                totalRetards++;
              }
            }
          }
        });
        
        // Critères: absences >= 5 sur la période OU retards >= 3 sur la période
        if (totalAbsences >= 5 || totalRetards >= 3) {
          return {
            nom: `${emp.prenom} ${emp.nom}`,
            absences: totalAbsences,
            retards: totalRetards,
            type: (totalAbsences >= 8 || totalRetards >= 5) ? 'critical' : 'warning'
          };
        }
        return null;
      })
      .filter(e => e !== null)
      .slice(0, 5);
    
    // 6. Taux de présence hebdomadaire (4 dernières semaines) - REMPLACE heures supplémentaires
    const evolutionPresenceHebdo = [];
    for (let i = 3; i >= 0; i--) {
      const semaineDebut = new Date();
      semaineDebut.setDate(semaineDebut.getDate() - (i * 7 + 7));
      semaineDebut.setHours(0, 0, 0, 0);
      
      const semaineFin = new Date(semaineDebut);
      semaineFin.setDate(semaineFin.getDate() + 7);
      
      // Compter les jours ouvrés de la semaine (5 jours)
      const joursOuvres = 5;
      
      // Récupérer les pointages de la semaine
      const pointagesSemaine = await prisma.pointage.findMany({
        where: {
          horodatage: { gte: semaineDebut, lt: semaineFin },
          type: { in: TYPES_ENTREE }
        },
        include: {
          user: { select: { id: true } }
        }
      });

      // Grouper par employé et par jour
      const presencesParEmploye = {};
      pointagesSemaine.forEach(p => {
        const dateStr = toLocalDateString(p.horodatage);
        if (!presencesParEmploye[p.userId]) presencesParEmploye[p.userId] = new Set();
        presencesParEmploye[p.userId].add(dateStr);
      });

      // Calculer le taux de présence moyen
      const employesPresents = Object.keys(presencesParEmploye).length;
      let totalJoursPresents = 0;
      for (const jours of Object.values(presencesParEmploye)) {
        totalJoursPresents += jours.size;
      }

      const joursTheoriques = employes * joursOuvres;
      const tauxPresence = joursTheoriques > 0 ? (totalJoursPresents / joursTheoriques) * 100 : 0;
      
      evolutionPresenceHebdo.push({
        semaine: `S${4 - i}`,
        taux: Math.round(tauxPresence),
        presents: employesPresents,
        joursPresents: totalJoursPresents,
        joursTheoriques
      });
    }
    
    // 7. Évolution effectif — adapté à la période sélectionnée
    const nbMoisEvolution = periode === 'annee' ? 12 : periode === 'trimestre' ? 6 : 5;
    const evolutionEffectif = [];
    for (let i = nbMoisEvolution - 1; i >= 0; i--) {
      const moisDate = new Date();
      moisDate.setMonth(moisDate.getMonth() - i);
      
      const debutMois = new Date(moisDate.getFullYear(), moisDate.getMonth(), 1);
      const finMois = new Date(moisDate.getFullYear(), moisDate.getMonth() + 1, 0);
      
      // Entrées du mois : d'abord MouvementEffectif, puis fallback User
      let entrees = 0;
      let sorties = 0;
      try {
        const entreesArchive = await prisma.mouvementEffectif.count({
          where: { type: 'entree', date: { gte: debutMois, lte: finMois } }
        });
        const sortiesArchive = await prisma.mouvementEffectif.count({
          where: { type: 'sortie', date: { gte: debutMois, lte: finMois } }
        });
        // Compléter avec les Users qui n'ont pas encore de mouvement archivé
        const entreesUser = await prisma.user.count({
          where: {
            role: 'employee',
            dateEmbauche: { gte: debutMois, lte: finMois },
            id: { notIn: (await prisma.mouvementEffectif.findMany({
              where: { type: 'entree', date: { gte: debutMois, lte: finMois }, userId: { not: null } },
              select: { userId: true }
            })).map(m => m.userId) }
          }
        });
        const sortiesUser = await prisma.user.count({
          where: {
            role: 'employee',
            dateSortie: { gte: debutMois, lte: finMois },
            id: { notIn: (await prisma.mouvementEffectif.findMany({
              where: { type: 'sortie', date: { gte: debutMois, lte: finMois }, userId: { not: null } },
              select: { userId: true }
            })).map(m => m.userId) }
          }
        });
        entrees = entreesArchive + entreesUser;
        sorties = sortiesArchive + sortiesUser;
      } catch (e) {
        // Fallback si table MouvementEffectif n'existe pas encore (migration pas encore jouée)
        entrees = await prisma.user.count({
          where: { role: 'employee', dateEmbauche: { gte: debutMois, lte: finMois } }
        });
        sorties = await prisma.user.count({
          where: { role: 'employee', dateSortie: { gte: debutMois, lte: finMois } }
        });
      }
      
      // Effectif à la fin du mois = embauchés avant finMois, pas encore partis à cette date
      const effectifMois = await prisma.user.count({
        where: {
          role: 'employee',
          dateEmbauche: { lte: finMois },
          OR: [
            { dateSortie: null },
            { dateSortie: { gt: finMois } }
          ]
        }
      });
      
      const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      evolutionEffectif.push({
        mois: moisNoms[moisDate.getMonth()],
        entrees,
        sorties,
        effectif: effectifMois
      });
    }

    // 8. Taux de rotation (Turnover) - Calculé sur la période d'évolution effectif
    const effectifDebut = evolutionEffectif.length > 0 ? evolutionEffectif[0].effectif : employes;
    const effectifFin = employes;
    const effectifMoyen = (effectifDebut + effectifFin) / 2;
    const departsTotal = evolutionEffectif.reduce((acc, curr) => acc + curr.sorties, 0);
    const tauxRotation = effectifMoyen > 0 ? ((departsTotal / effectifMoyen) * 100).toFixed(1) : 0;
    
    // 9. Ancienneté moyenne des employés actifs
    const employesActifs = await prisma.user.findMany({
      where: { role: 'employee', statut: 'actif' },
      select: { dateEmbauche: true }
    });

    let ancienneteMoyenne = 0;
    if (employesActifs.length > 0) {
      const totalAnnees = employesActifs.reduce((acc, emp) => {
        if (emp.dateEmbauche) {
          const anciennete = (today - new Date(emp.dateEmbauche)) / (1000 * 60 * 60 * 24 * 365.25);
          return acc + anciennete;
        }
        return acc;
      }, 0);
      ancienneteMoyenne = (totalAnnees / employesActifs.length).toFixed(1);
    }

    // 10. Taux d'utilisation : (Heures réelles / Heures planifiées) × 100
    const tauxUtilisation = heuresTheorique > 0 ? ((totalHeuresPeriode / heuresTheorique) * 100).toFixed(1) : 0;

    // 11. Répartition par catégorie (données réelles)
    const employesParCategorie = await prisma.user.findMany({
      where: { role: 'employee', statut: 'actif' },
      select: { categorie: true }
    });
    
    const repartitionCategories = {};
    employesParCategorie.forEach(emp => {
      const cat = emp.categorie || 'Non défini';
      if (!repartitionCategories[cat]) repartitionCategories[cat] = 0;
      repartitionCategories[cat]++;
    });
    
    const totalEmployesActifs = employesParCategorie.length;
    const repartitionParService = Object.entries(repartitionCategories)
      .map(([categorie, count]) => ({
        categorie,
        count,
        pourcentage: totalEmployesActifs > 0 ? Math.round((count / totalEmployesActifs) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    // 12. Absences par motif (basé sur les congés)
    const congesApprouves = await prisma.conge.findMany({
      where: {
        statut: 'approuvé',
        dateDebut: { lte: today },
        dateFin: { gte: startDate }
      },
      select: { type: true, dateDebut: true, dateFin: true }
    });

    const absencesParMotif = {};
    congesApprouves.forEach(c => {
      const motif = c.type || 'Autre';
      if (!absencesParMotif[motif]) absencesParMotif[motif] = 0;
      // Compter les jours
      const debut = new Date(Math.max(new Date(c.dateDebut), startDate));
      const fin = new Date(Math.min(new Date(c.dateFin), today));
      const jours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1;
      absencesParMotif[motif] += Math.max(1, jours);
    });

    const absencesParMotifArray = Object.entries(absencesParMotif)
      .map(([motif, jours]) => ({ motif, jours }))
      .sort((a, b) => b.jours - a.jours);

    // 13. Absences par durée (catégorisation)
    const absencesParDuree = {
      '1 jour': 0,
      '2-3 jours': 0,
      '4-7 jours': 0,
      '1-2 semaines': 0,
      '> 2 semaines': 0
    };

    congesApprouves.forEach(c => {
      const jours = Math.ceil((new Date(c.dateFin) - new Date(c.dateDebut)) / (1000 * 60 * 60 * 24)) + 1;
      if (jours === 1) absencesParDuree['1 jour']++;
      else if (jours <= 3) absencesParDuree['2-3 jours']++;
      else if (jours <= 7) absencesParDuree['4-7 jours']++;
      else if (jours <= 14) absencesParDuree['1-2 semaines']++;
      else absencesParDuree['> 2 semaines']++;
    });

    const absencesParDureeArray = Object.entries(absencesParDuree)
      .map(([duree, count]) => ({ duree, count }));

    // 14. Taux d'absentéisme par équipe/catégorie
    const employesAvecCategorie = await prisma.user.findMany({
      where: { role: 'employee', statut: 'actif' },
      select: { id: true, categorie: true }
    });

    const absenteismeParEquipe = {};
    for (const emp of employesAvecCategorie) {
      const cat = emp.categorie || 'Non défini';
      if (!absenteismeParEquipe[cat]) {
        absenteismeParEquipe[cat] = { total: 0, presents: 0 };
      }
      absenteismeParEquipe[cat].total++;
      
      // Vérifier si l'employé a pointé dans la période
      const aPointe = pointagesParEmploye[emp.id] && Object.keys(pointagesParEmploye[emp.id]).length > 0;
      if (aPointe) absenteismeParEquipe[cat].presents++;
    }

    const absenteismeParEquipeArray = Object.entries(absenteismeParEquipe)
      .map(([equipe, data]) => ({
        equipe,
        tauxPresence: data.total > 0 ? Math.round((data.presents / data.total) * 100) : 0,
        tauxAbsence: data.total > 0 ? Math.round(((data.total - data.presents) / data.total) * 100) : 0,
        effectif: data.total
      }))
      .sort((a, b) => b.effectif - a.effectif);

    // Si pas de données, retourner des données de démonstration
    if (employes === 0 && repartitionConges.length === 0 && statutsDemandes.length === 0) {
      return res.json(genererDonneesDemo());
    }

    res.json({
      employes,
      demandesAttente,
      congesCeMois,
      totalHeures: tempsPresenceAujourdhui,  // Heures travaillées aujourd'hui
      tempsPresence: tempsPresenceAujourdhui, // Alias pour compatibilité
      repartitionConges,
      statutsDemandes,
      pointes: pointesAujourdHui.length,
      congesSemaine,
      prochainsConges: prochainsConges.map(c => ({
        nom: c.user.nom && c.user.prenom ? `${c.user.prenom} ${c.user.nom}` : c.user.email,
        type: c.type,
        dateDebut: c.dateDebut,
        dateFin: c.dateFin,
      })),
      // Données pour la section "À surveiller" - hebdomadaires
      surveillance: {
        employesAbsents: employesAbsents,
        employesEnRetard: employesEnRetard,
        employesEcartPlanning: employesEcartPlanning,
        totalElements: employesAbsents + employesEnRetard + employesEcartPlanning,
        periode: `du ${debutSemaine.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au ${today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
      },
      // 📊 NOUVEAUX KPIs
      kpis: {
        tauxAbsenteisme,
        dureeMoyenneJour,
        tauxRetards,
        tauxPonctualite,  // NOUVEAU: 100 - tauxRetards
        tauxAssiduite,    // NOUVEAU: Heures réelles / heures planifiées
        tauxRotation,  // NOUVEAU: Turnover
        ancienneteMoyenne,  // NOUVEAU: Ancienneté
        tauxUtilisation,  // NOUVEAU: Utilisation
        topEmployes,
        employesProblematiques,
        evolutionPresenceHebdo,  // NOUVEAU: Remplace evolutionHeuresSup
        evolutionEffectif,
        repartitionParService,  // NOUVEAU: Répartition réelle par catégorie
        absencesParMotif: absencesParMotifArray,  // NOUVEAU: Pour graphique
        absencesParDuree: absencesParDureeArray,  // NOUVEAU: Pour graphique
        absenteismeParEquipe: absenteismeParEquipeArray,  // NOUVEAU: Pour graphique
        totalAbsences: congesApprouves.length,  // NOUVEAU: Nombre total d'absences
        totalJoursAbsence: absencesParMotifArray.reduce((sum, a) => sum + a.jours, 0)  // NOUVEAU: Total jours
      },
      periode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur dans getDashboardStats:', error);
    res.status(500).json({ error: 'Erreur chargement tableau de bord', details: error.message });
  }
};

const calculerTotalHeures = async (debut, fin) => {
  // Si pas de paramètres, utiliser aujourd'hui
  const dateDebut = debut || new Date();
  const dateFinReel = fin || new Date();

  // Etendre légèrement la fenêtre de fin (comme la vue journalière) pour capter les départs tardifs
  const dateFin = new Date(dateFinReel);
  const dateFinEtendue = new Date(dateFin);
  dateFinEtendue.setHours(dateFinEtendue.getHours() + 6); // tolérance jusqu'à 6h après

  const pointages = await prisma.pointage.findMany({
    where: {
      horodatage: {
        gte: dateDebut,
        lte: dateFinEtendue
      },
    },
    orderBy: { horodatage: 'asc' },
  });

  if (pointages.length === 0) return '0h00';
  
  const pointagesParEmploye = {};

  for (const p of pointages) {
    if (!pointagesParEmploye[p.userId]) pointagesParEmploye[p.userId] = [];
    pointagesParEmploye[p.userId].push(p);
  }

  let totalMs = 0;
  const now = new Date();

  for (const userId in pointagesParEmploye) {
    const points = pointagesParEmploye[userId];

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[i + 1];

      // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes
      if (isEntree(current.type)) {
        if (next && isSortie(next.type)) {
          const dureeMs = new Date(next.horodatage) - new Date(current.horodatage);
          totalMs += dureeMs;
          const dureeH = Math.floor(dureeMs / 1000 / 60 / 60);
          const dureeMin = Math.floor((dureeMs / 1000 / 60) % 60);
          i++; // skip la paire
        } else if (!next) {
          // Pas de départ encore: comptabiliser jusqu'à maintenant (session en cours)
            const dureeMs = now - new Date(current.horodatage);
            if (dureeMs > 0) {
              totalMs += dureeMs;
              const dureeH = Math.floor(dureeMs / 1000 / 60 / 60);
              const dureeMin = Math.floor((dureeMs / 1000 / 60) % 60);
            }
        }
      }
    }
  }

  if (totalMs <= 0) {
    return '0h00';
  }
  const heures = Math.floor(totalMs / 1000 / 60 / 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  return `${heures}h${minutes.toString().padStart(2, '0')}`;
};

// Fonction pour générer l'évolution du taux de présence
const genererEvolutionPresence = async () => {
  const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août'];
  const evolutionPresence = [];
  
  for (let i = 0; i < 8; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (7 - i));
    
    // Compter les pointages pour ce mois
    const debutMois = new Date(date.getFullYear(), date.getMonth(), 1);
    const finMois = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const pointagesMois = await prisma.pointage.count({
      where: {
        horodatage: { gte: debutMois, lte: finMois },
      },
    });
    
    // Calculer un taux basé sur l'activité (simulation)
    const tauxBase = 85;
    const variation = Math.floor(Math.random() * 15) - 7; // -7 à +7
    const taux = Math.max(70, Math.min(100, tauxBase + variation + (pointagesMois > 0 ? 5 : 0)));
    
    evolutionPresence.push({
      mois: mois[date.getMonth()],
      taux,
    });
  }
  
  return evolutionPresence;
};

// Fonction pour générer des données de démonstration
const genererDonneesDemo = () => {
  return {
    demo: true,
    employes: 5,
    demandesAttente: 2,
    congesCeMois: 8,
    tempsPresence: '127h30',
    repartitionConges: [
      { name: 'Congé payé', value: 12 },
      { name: 'Maladie', value: 4 },
      { name: 'RTT', value: 6 },
      { name: 'Autres', value: 2 },
    ],
    statutsDemandes: [
      { statut: 'Approuvé', value: 8, color: '#10B981' },
      { statut: 'En attente', value: 2, color: '#FBBF24' },
      { statut: 'Refusé', value: 1, color: '#cf292c' },
    ],
    evolutionPresence: [
      { mois: 'Jan', taux: 86 },
      { mois: 'Fév', taux: 89 },
      { mois: 'Mar', taux: 92 },
      { mois: 'Avr', taux: 87 },
      { mois: 'Mai', taux: 91 },
      { mois: 'Juin', taux: 95 },
      { mois: 'Juil', taux: 88 },
      { mois: 'Août', taux: 93 },
    ],
    pointes: 2,
    congesSemaine: 1,
    prochainsConges: [
      { nom: 'Demo User', type: 'Congés payés', dateDebut: new Date(), dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    ],
    periode: 'demo',
    timestamp: new Date().toISOString()
  };
};

// 🔄 REINVITER : Régénérer un mot de passe temporaire et renvoyer les identifiants
const reinviterEmploye = async (req, res) => {
  const { id } = req.params;
  const { nouvelEmail } = req.body; // Optionnel : mettre à jour l'email

  try {
    const employeId = parseInt(id);
    if (isNaN(employeId)) {
      return res.status(400).json({ error: "ID employé invalide" });
    }

    // Vérifier que l'employé existe
    const employe = await prisma.user.findUnique({
      where: { id: employeId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        categorie: true,
        categories: true,
        statut: true,
        firstLoginDone: true
      }
    });

    if (!employe) {
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    if (employe.statut !== 'actif') {
      return res.status(400).json({ error: "Impossible de réinviter un employé inactif" });
    }

    // Déterminer l'email à utiliser
    let emailCible = employe.email;
    if (nouvelEmail && nouvelEmail.trim()) {
      const normalizedNewEmail = nouvelEmail.toLowerCase().trim();

      // Vérifier que le nouvel email n'est pas déjà utilisé par un autre employé
      if (normalizedNewEmail !== employe.email) {
        const existant = await prisma.user.findUnique({ where: { email: normalizedNewEmail } });
        if (existant) {
          return res.status(400).json({ error: "Cet email est déjà utilisé par un autre compte" });
        }
      }
      emailCible = normalizedNewEmail;
    }

    // Générer un nouveau mot de passe temporaire
    const motDePasseTemporaire = genererMotDePasseListible();
    const hashedPassword = await bcrypt.hash(motDePasseTemporaire, 10);

    // Mettre à jour l'employé : nouveau password, reset onboarding, email si changé
    const updateData = {
      password: hashedPassword,
      firstLoginDone: false, // Forcer l'onboarding à la prochaine connexion
      codeActivation: null,
    };

    if (emailCible !== employe.email) {
      updateData.email = emailCible;
    }

    await prisma.user.update({
      where: { id: employeId },
      data: updateData
    });

    // Récupérer les catégories pour l'email
    let categoriesArray = [];
    if (employe.categories) {
      categoriesArray = parseCategories(employe.categories);
    } else if (employe.categorie) {
      categoriesArray = [employe.categorie];
    }

    // Envoyer l'email avec les nouveaux identifiants
    const resultatEnvoi = await envoyerIdentifiants(
      emailCible,
      employe.nom,
      employe.prenom,
      motDePasseTemporaire,
      categoriesArray
    );

    if (!resultatEnvoi.success) {
      console.error('❌ Erreur envoi email réinvitation:', resultatEnvoi.error);
      
      if (resultatEnvoi.code === 'THROTTLED') {
        return res.status(429).json({
          success: false,
          error: resultatEnvoi.error,
          message: "Email déjà envoyé récemment. Patientez quelques minutes.",
          motDePasseTemporaire // On le renvoie quand même pour affichage admin
        });
      }

      // L'email a échoué mais le password a été changé → renvoyer le mdp quand même
      return res.status(200).json({
        success: true,
        emailEnvoye: false,
        message: "Mot de passe réinitialisé mais l'email n'a pas pu être envoyé. Communiquez les identifiants manuellement.",
        motDePasseTemporaire,
        email: emailCible
      });
    }

    console.log(`✅ Réinvitation envoyée à ${emailCible} pour ${employe.prenom} ${employe.nom}`);

    res.status(200).json({
      success: true,
      emailEnvoye: true,
      message: `Invitation renvoyée à ${emailCible}`,
      motDePasseTemporaire,
      email: emailCible
    });

  } catch (err) {
    console.error("❌ Erreur réinvitation employé :", err);
    
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "Cet email est déjà utilisé par un autre utilisateur" });
    }
    
    res.status(500).json({ error: "Erreur serveur lors de la réinvitation" });
  }
};

module.exports = {
  creerEmploye,
  modifierEmploye,
  marquerDepart,
  annulerDepart,
  supprimerEmploye,
  reinviterEmploye,
  getDashboardStats,
};
