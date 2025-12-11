// server/controllers/statsController.js
const prisma = require('../prisma/client');

// ================== 1. Stats RH globales (déjà utilisées) ==================
const getStatsRH = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
    const premierDuMois = new Date(now.getFullYear(), now.getMonth(), 1);

    console.log('📊 [STATS API] Calcul stats pour:', todayStart.toISOString(), '→', todayEnd.toISOString());

    // Parallel base queries
    const [users, allUsers, pointagesToday, congesAll, statutsGrouped] = await Promise.all([
      // Uniquement les employés actifs (en service)
      prisma.user.findMany({ 
        where: { 
          role: 'employee',
          statut: 'actif',
          OR: [
            { dateSortie: null },
            { dateSortie: { gt: now } }
          ]
        }, 
        select: { id:true, email:true, nom:true, prenom:true, statut:true, dateSortie:true } 
      }),
      // Tous les employés (incluant inactifs) pour stats comparatives
      prisma.user.findMany({ 
        where: { role: 'employee' }, 
        select: { id:true, statut:true, dateSortie:true } 
      }),
      prisma.pointage.findMany({
        where: { horodatage: { gte: todayStart, lte: todayEnd } },
        select: { id:true, userId:true, horodatage:true, type:true }
      }),
      prisma.conge.findMany({
        where: { dateFin: { gte: todayStart } },
        select: { id:true, type:true, statut:true, dateDebut:true, dateFin:true, userId:true }
      }),
      prisma.conge.groupBy({ by: ['statut'], _count: true })
    ]);

    const employes = users.length; // Employés EN SERVICE (actifs)
    const totalEmployes = allUsers.length; // Total incluant inactifs
    const employesInactifs = allUsers.filter(u => u.statut !== 'actif' || (u.dateSortie && u.dateSortie <= now)).length;
    
    console.log('👥 [STATS API] Employés EN SERVICE:', employes, '| Total:', totalEmployes, '| Inactifs:', employesInactifs);
    console.log('⏱️ [STATS API] Pointages trouvés:', pointagesToday.length);

    // Present = distinct userIds with at least one pointage today (could filter ENTREE if type field used)
    const presentSet = new Set(pointagesToday.map(p => p.userId));
    const pointes = presentSet.size;
    console.log('✅ [STATS API] Employés distincts ayant pointé:', pointes);

    // Active approved leaves today
    const congesApprouves = congesAll.filter(c => c.statut === 'approuvé');
    const congesActifsAujourdHui = congesApprouves.filter(c => c.dateDebut <= todayEnd && c.dateFin >= todayStart);
    const employesEnCongeAujourdHuiSet = new Set(congesActifsAujourdHui.map(c => c.userId));

    // Absents = employés - présents - en congé approuvé (approximation, à raffiner si planning)
    const absents = Math.max(0, employes - pointes - employesEnCongeAujourdHuiSet.size);

    // Congés actifs AUJOURD'HUI (à envoyer au front pour calcul correct)
    const congesActifsAujourdHuiFormatted = congesActifsAujourdHui.map(c => {
      const u = users.find(u => u.id === c.userId) || {};
      return {
        id: c.id,
        dateDebut: c.dateDebut,
        dateFin: c.dateFin,
        type: c.type,
        idEmploye: c.userId,
        employe: u.email,
        nom: u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.nom || u.prenom || u.email)
      };
    });

    // Prochains congés (approuvés) futurs (dateDebut > aujourd'hui) limite 60 jours
    const horizon = new Date(now.getTime() + 60*24*60*60*1000);
    const prochainsCongesFuturs = congesApprouves
      .filter(c => c.dateDebut > todayEnd && c.dateDebut <= horizon)
      .sort((a,b) => a.dateDebut - b.dateDebut)
      .slice(0, 100)
      .map(c => {
        const u = users.find(u => u.id === c.userId) || {};
        return {
          id: c.id,
          dateDebut: c.dateDebut,
            dateFin: c.dateFin,
          type: c.type,
          idEmploye: c.userId,
          employe: u.email,
          nom: u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.nom || u.prenom || u.email)
        };
      });
    
    // Combiner congés actifs aujourd'hui + futurs pour le frontend
    const prochainsConges = [...congesActifsAujourdHuiFormatted, ...prochainsCongesFuturs];

    // Heures réalisées approximatives: pour chaque user, diff min/max horodatage (en heures)
    const pointagesParUser = {};
    pointagesToday.forEach(p => {
      if (!pointagesParUser[p.userId]) pointagesParUser[p.userId] = [];
      pointagesParUser[p.userId].push(p.horodatage);
    });
    let totalHeuresCumulees = 0;
    Object.values(pointagesParUser).forEach(list => {
      list.sort();
      if (list.length >= 2) {
        const debut = list[0];
        const fin = list[list.length - 1];
        const diffH = (fin - debut) / 3600000; // ms to hours
        if (diffH > 0 && diffH < 24) totalHeuresCumulees += diffH;
      }
    });
    const heuresRealisees = +totalHeuresCumulees.toFixed(1);
    const totalHeures = `${heuresRealisees}h`;
    // Heures prévues indisponibles ici -> null (peut être alimenté depuis planning plus tard)
    const heuresPrevues = null;

    // Absence breakdown (maladie / congé / autre) basique: on distingue type contenant 'maladie' & 'congé'
    let maladie = 0, congeType = 0, autre = 0;
    congesActifsAujourdHui.forEach(c => {
      const t = (c.type || '').toLowerCase();
      const deb = c.dateDebut; const fin = c.dateFin;
      const jours = Math.ceil((fin - deb)/86400000 + 1);
      if (t.includes('maladie')) maladie += jours; else if (t.includes('cong')) congeType += jours; else autre += jours;
    });

    const absencesDetail = { maladie, conge: congeType, autre };

    // Stats supplémentaires déjà présentes avant (pour compat compat):
    const nbDemandesAttente = congesAll.filter(c => c.statut === 'en attente').length;
    const nbCongesCeMois = congesAll.filter(c => c.dateDebut >= premierDuMois).length;
    const congesParType = {};
    congesAll.forEach(c => {
      const nbJours = Math.ceil((c.dateFin - c.dateDebut) / 86400000 + 1);
      congesParType[c.type] = (congesParType[c.type] || 0) + nbJours;
    });
    const repartitionConges = Object.entries(congesParType).map(([type, jours]) => ({ type, jours }));
    const statutsDemandes = statutsGrouped.map(s => ({ statut: s.statut, value: s._count }));

    const responseData = {
      // Nouveaux champs attendus par le front Tableau de bord
      employes, // Employés actifs EN SERVICE
      employesActifs: employes, // Alias explicite
      totalEmployes, // Total incluant inactifs
      employesInactifs, // Compteur des inactifs/partis
      pointes,
      totalHeures,
      heuresPrevues,
      heuresRealisees,
      prochainsConges,
      surveillance: {
        employesAbsents: absents,
        employesEcartPlanning: 0 // placeholder (écarts planning non calculés ici)
      },
      absencesDetail,
      // Ancienne structure conservée pour compatibilité
      nbEmployes: employes,
      nbDemandesAttente,
      nbCongesCeMois,
      congesParType: repartitionConges,
      statutsDemandes
    };

    console.log('📤 [STATS API] Réponse envoyée:', { employes, pointes, absents, prochainsConges: prochainsConges.length });

    res.json(responseData);
  } catch (e) {
    console.error('Erreur getStatsRH:', e);
    res.status(500).json({ error: 'Erreur chargement statistiques RH' });
  }
};

// ================== 2. Stats employés ==================
const getEmployeesStats = async (req, res) => {
  try {
    const employes = await prisma.user.findMany({
      where: { role: 'employee' },
      select: { id: true, email: true, nom: true, prenom: true, statut: true, createdAt: true }
    });
    res.json({ count: employes.length, employes });
  } catch (e) {
    console.error('Erreur getEmployeesStats:', e);
    res.status(500).json({ error: 'Erreur stats employés' });
  }
};

// ================== 3. Stats planning ==================
const getPlanningStats = async (req, res) => {
  try {
    const maintenant = new Date();
    const depuis = new Date(maintenant);
    depuis.setDate(depuis.getDate() - 30);

    const [totalPlannings30J, totalShifts30J] = await Promise.all([
      prisma.planning.count({ where: { date: { gte: depuis } } }),
      prisma.shift.count({ where: { date: { gte: depuis } } })
    ]);

    res.json({ sur30J: { plannings: totalPlannings30J, shifts: totalShifts30J } });
  } catch (e) {
    console.error('Erreur getPlanningStats:', e);
    res.status(500).json({ error: 'Erreur stats planning' });
  }
};

// ================== 4. Stats congés ==================
const getCongesStats = async (req, res) => {
  try {
    const maintenant = new Date();
    const premierMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const congesCeMois = await prisma.conge.findMany({
      where: { dateDebut: { gte: premierMois } },
      select: { id: true, type: true, statut: true, dateDebut: true, dateFin: true, userId: true }
    });
    res.json({ total: congesCeMois.length, conges: congesCeMois });
  } catch (e) {
    console.error('Erreur getCongesStats:', e);
    res.status(500).json({ error: 'Erreur stats congés' });
  }
};

// ================== 5. Pointages avec filtres ==================
// Utilisé par /admin/pointages ET /admin/stats/pointages
const getAllPointages = async (req, res) => {
  try {
    const { date, userId, type } = req.query;
    const where = {};
    if (userId) where.userId = parseInt(userId);
    if (type) where.type = type;
    if (date) {
      const debut = new Date(`${date}T00:00:00`);
      const fin = new Date(`${date}T23:59:59`);
      where.horodatage = { gte: debut, lte: fin };
    }

    const pointages = await prisma.pointage.findMany({
      where,
      orderBy: { horodatage: 'desc' },
      include: { user: { select: { id: true, email: true, nom: true, prenom: true } } }
    });

    res.json(pointages);
  } catch (e) {
    console.error('Erreur getAllPointages:', e);
    res.status(500).json({ error: 'Erreur récupération pointages' });
  }
};

// ================== 6. Export générique ==================
const exportData = async (req, res) => {
  try {
    const { type } = req.params; // employes|pointages|conges|plannings
    let data = [];
    const filename = type;

    switch (type) {
      case 'employes':
        data = await prisma.user.findMany({ where: { role: 'employee' } });
        break;
      case 'pointages':
        data = await prisma.pointage.findMany({ include: { user: true } });
        break;
      case 'conges':
        data = await prisma.conge.findMany({ include: { user: true } });
        break;
      case 'plannings':
        data = await prisma.planning.findMany({ include: { user: true } });
        break;
      default:
        return res.status(400).json({ error: "Type d'export non supporté" });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().slice(0,10)}.json"`);
    res.json(data);
  } catch (e) {
    console.error('Erreur exportData:', e);
    res.status(500).json({ error: 'Erreur export' });
  }
};

module.exports = {
  getStatsRH,
  getEmployeesStats,
  getPlanningStats,
  getCongesStats,
  getAllPointages,
  exportData
};
