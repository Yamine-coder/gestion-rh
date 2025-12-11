const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const prisma = require('../prisma/client');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES PAR DÉFAUT POUR CHAQUE CATÉGORIE
// ═══════════════════════════════════════════════════════════════════════════

const TEMPLATES_DEFAUT = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CATÉGORIES EMPLOYÉS
  // ═══════════════════════════════════════════════════════════════════════════
  
  "Pizzaiolo": {
    titre: "Pizzaiolo",
    departement: "Cuisine - Pizza",
    rattachement: "Chef Pizzaiolo / Manager",
    horaires: "Variables selon planning - Services midi et soir, week-ends inclus",
    formation: "Formation pizzaiolo ou experience significative en pizzeria",
    missions: [
      "Preparer la pate a pizza selon les recettes maison",
      "Garnir et cuire les pizzas au four a bois ou electrique",
      "Respecter les normes HACCP et les regles d'hygiene",
      "Gerer les stocks de produits frais (mozzarella, legumes, etc.)",
      "Assurer la mise en place avant chaque service",
      "Controler la qualite et la fraicheur des ingredients",
      "Nettoyer et entretenir le poste de travail et le four",
      "Participer a la creation de nouvelles recettes"
    ],
    competences: [
      "Maitrise des techniques de preparation de pate",
      "Connaissance approfondie des normes HACCP",
      "Rapidite et precision dans l'execution",
      "Sens du gout et creativite culinaire",
      "Capacite a travailler sous pression",
      "Esprit d'equipe et communication"
    ],
    conditionsTravail: "Travail debout, exposition a la chaleur du four, cadence soutenue",
    avantages: "Repas fournis, formation continue, pourboires"
  },

  "Pastaiolo": {
    titre: "Pastaiolo",
    departement: "Cuisine - Pates fraiches",
    rattachement: "Chef de cuisine / Manager",
    horaires: "Variables selon planning - Services midi et soir, week-ends inclus",
    formation: "Formation cuisine italienne ou experience en restauration",
    missions: [
      "Preparer les pates fraiches maison selon les recettes",
      "Cuisiner les sauces et accompagnements",
      "Respecter les normes HACCP et les regles d'hygiene",
      "Gerer les stocks de produits frais",
      "Assurer la mise en place avant chaque service",
      "Controler la qualite et la cuisson des pates",
      "Nettoyer et entretenir le poste de travail",
      "Participer a l'elaboration de nouvelles recettes"
    ],
    competences: [
      "Maitrise des techniques de pates fraiches",
      "Connaissance des normes HACCP",
      "Organisation et rigueur",
      "Sens du gout et de la presentation",
      "Capacite a travailler sous pression",
      "Esprit d'equipe"
    ],
    conditionsTravail: "Travail debout, manipulation de produits alimentaires, cadence soutenue",
    avantages: "Repas fournis, formation continue, ambiance conviviale"
  },

  "Caisse/Service": {
    titre: "Employe(e) Caisse et Service",
    departement: "Caisse / Service en salle",
    rattachement: "Responsable de salle / Manager",
    horaires: "Variables selon planning - Services midi et soir, week-ends inclus",
    formation: "Experience en caisse ou service souhaitee, formation en interne",
    missions: [
      "Accueillir et installer les clients avec courtoisie",
      "Prendre les commandes et les transmettre en cuisine",
      "Assurer le service a table avec professionnalisme",
      "Encaisser les paiements (especes, CB, tickets restaurant)",
      "Gerer le fond de caisse et effectuer la cloture",
      "Veiller a la proprete et au bon rangement de la salle",
      "Repondre aux demandes et reclamations clients",
      "Participer a la mise en place et au debarrassage"
    ],
    competences: [
      "Excellent relationnel et sens du service client",
      "Rigueur et honnetete pour la gestion de caisse",
      "Aisance avec les chiffres et outils de caisse",
      "Capacite a travailler en equipe",
      "Resistance au stress et a la cadence soutenue",
      "Bonne presentation et expression orale"
    ],
    conditionsTravail: "Station debout prolongee, contact client permanent, environnement dynamique",
    avantages: "Repas fournis, pourboires, ambiance conviviale"
  },

  "Entretien": {
    titre: "Agent d'entretien",
    departement: "Entretien / Hygiene",
    rattachement: "Manager / Direction",
    horaires: "Variables - Souvent avant ou apres les services",
    formation: "Aucun diplome requis - Formation en interne",
    missions: [
      "Assurer le nettoyage quotidien des locaux (salle, cuisine, sanitaires)",
      "Entretenir les sols, surfaces et equipements",
      "Gerer les stocks de produits d'entretien",
      "Vider les poubelles et gerer le tri selectif",
      "Maintenir la proprete des espaces communs",
      "Signaler tout dysfonctionnement ou besoin de reparation",
      "Respecter les protocoles d'hygiene et de securite",
      "Participer a la plonge si necessaire"
    ],
    competences: [
      "Rigueur et sens de l'organisation",
      "Connaissance des produits d'entretien",
      "Respect strict des consignes d'hygiene",
      "Autonomie dans le travail",
      "Discretion et fiabilite",
      "Resistance physique"
    ],
    conditionsTravail: "Travail physique, manipulation de produits d'entretien, horaires decales",
    avantages: "Repas fournis, horaires stables possibles"
  },

  "Securite": {
    titre: "Agent de securite",
    departement: "Securite",
    rattachement: "Direction / Manager",
    horaires: "Variables - Principalement services du soir et week-ends",
    formation: "Carte professionnelle obligatoire (CQP APS ou equivalent)",
    missions: [
      "Assurer la securite des clients et du personnel",
      "Controler les acces et gerer les flux de personnes",
      "Prevenir les incidents et intervenir si necessaire",
      "Faire respecter le reglement interieur",
      "Effectuer des rondes de surveillance",
      "Gerer les situations conflictuelles avec diplomatie",
      "Alerter les services d'urgence si necessaire",
      "Rediger des rapports d'incidents"
    ],
    competences: [
      "Carte professionnelle valide",
      "Maitrise des techniques de mediation",
      "Calme et sang-froid en toutes situations",
      "Excellente condition physique",
      "Sens de l'observation",
      "Connaissance des procedures d'urgence"
    ],
    conditionsTravail: "Station debout prolongee, travail en soiree, responsabilites importantes",
    avantages: "Prime de nuit, responsabilites, formation continue"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATÉGORIES ADMINS
  // ═══════════════════════════════════════════════════════════════════════════

  "Direction": {
    titre: "Directeur(trice) / Gerant(e)",
    departement: "Direction generale",
    rattachement: "Proprietaire / Siege",
    horaires: "Temps plein - Disponibilite totale requise",
    formation: "BTS Hotellerie-Restauration, Ecole de commerce ou experience significative",
    missions: [
      "Definir la strategie et les objectifs de l'etablissement",
      "Superviser l'ensemble des equipes et des operations",
      "Gerer le budget, les couts et la rentabilite",
      "Recruter, former et evaluer les collaborateurs",
      "Assurer la relation avec les fournisseurs et partenaires",
      "Veiller au respect des normes d'hygiene et securite",
      "Representer l'etablissement aupres des clients VIP",
      "Analyser les performances et mettre en place des actions correctives"
    ],
    competences: [
      "Leadership et capacite a motiver les equipes",
      "Vision strategique et sens des affaires",
      "Maitrise de la gestion financiere",
      "Excellence relationnelle",
      "Capacite de prise de decision",
      "Connaissance approfondie de la restauration"
    ],
    conditionsTravail: "Responsabilites importantes, horaires etendus, stress occasionnel",
    avantages: "Autonomie, remuneration attractive, primes sur objectifs"
  },

  "RH": {
    titre: "Responsable / Assistant(e) RH",
    departement: "Ressources Humaines",
    rattachement: "Direction",
    horaires: "Temps plein - Horaires de bureau avec flexibilite",
    formation: "Licence/Master RH, Droit social ou experience equivalente",
    missions: [
      "Gerer l'administration du personnel (contrats, paie, conges)",
      "Recruter et integrer les nouveaux collaborateurs",
      "Elaborer et suivre les plannings du personnel",
      "Gerer les formations et le developpement des competences",
      "Assurer le suivi des entretiens annuels",
      "Veiller au respect du droit du travail",
      "Gerer les relations sociales et les conflits",
      "Mettre a jour les outils RH et reporting"
    ],
    competences: [
      "Connaissance du droit du travail",
      "Maitrise des outils de paie et SIRH",
      "Sens de l'ecoute et diplomatie",
      "Organisation et rigueur administrative",
      "Discretion et confidentialite",
      "Capacite a gerer les priorites"
    ],
    conditionsTravail: "Poste administratif, interactions multiples, gestion du stress",
    avantages: "Horaires reguliers, responsabilites, evolution possible"
  },

  "Informatique": {
    titre: "Responsable Informatique / Support IT",
    departement: "Informatique / Systemes d'information",
    rattachement: "Direction",
    horaires: "Temps plein - Disponibilite pour urgences techniques",
    formation: "BTS/DUT Informatique, Licence pro ou experience equivalente",
    missions: [
      "Gerer et maintenir le systeme de caisse et les equipements",
      "Assurer le support technique aupres des equipes",
      "Administrer les logiciels metier (planning, RH, stock)",
      "Gerer la securite informatique et les sauvegardes",
      "Former les utilisateurs aux outils numeriques",
      "Gerer les relations avec les prestataires IT",
      "Proposer des ameliorations et innovations",
      "Documenter les procedures techniques"
    ],
    competences: [
      "Maitrise des systemes Windows/Mac et reseaux",
      "Connaissance des logiciels de restauration",
      "Capacite de diagnostic et resolution de problemes",
      "Pedagogie pour la formation des utilisateurs",
      "Veille technologique",
      "Autonomie et reactivite"
    ],
    conditionsTravail: "Poste technique, interventions variees, astreintes possibles",
    avantages: "Autonomie, formation continue, materiel recent"
  }
};

// Liste des catégories disponibles
const CATEGORIES_DISPONIBLES = Object.keys(TEMPLATES_DEFAUT);

// Chemin du logo
const LOGO_PATH = path.join(__dirname, '../assets/logo.jpg');

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATION PDF - VERSION UNE PAGE OPTIMISÉE
// ═══════════════════════════════════════════════════════════════════════════

function genererPDF(fiche, etablissement = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 0,
        autoFirstPage: true,
        bufferPages: false
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = '#cf292c';
      const darkGray = '#2d3748';
      const lightGray = '#718096';
      const nomEtablissement = 'Le Fournil a Pizzas';
      const margin = 45;
      const pageWidth = 595.28; // A4
      const pageHeight = 841.89; // A4
      const contentWidth = pageWidth - (margin * 2);
      const colWidth = contentWidth / 2;
      const col1 = margin;
      const col2 = margin + colWidth;

      // ═══════════════════════════════════════════════════════════════
      // EN-TÊTE
      // ═══════════════════════════════════════════════════════════════
      
      doc.rect(0, 0, pageWidth, 6).fill(primaryColor);
      
      if (fs.existsSync(LOGO_PATH)) {
        try { doc.image(LOGO_PATH, margin, 18, { width: 50 }); } catch (e) { }
      }
      
      doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold');
      doc.text(nomEtablissement, margin + 65, 28, { lineBreak: false });
      
      doc.fillColor(lightGray).fontSize(9).font('Helvetica');
      doc.text('Document officiel - Fiche de poste', margin + 65, 50, { lineBreak: false });
      
      doc.moveTo(margin, 75).lineTo(pageWidth - margin, 75)
         .strokeColor(primaryColor).lineWidth(2).stroke();

      // ═══════════════════════════════════════════════════════════════
      // TITRE DU POSTE
      // ═══════════════════════════════════════════════════════════════
      
      doc.rect(margin, 85, contentWidth, 42).fill('#f8f9fa');
      doc.fillColor(lightGray).fontSize(8).font('Helvetica');
      doc.text('INTITULE DU POSTE', margin + 12, 92, { lineBreak: false });
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold');
      doc.text((fiche.titre || '').toUpperCase(), margin + 12, 106, { lineBreak: false });

      let y = 140;

      // ═══════════════════════════════════════════════════════════════
      // INFORMATIONS GÉNÉRALES
      // ═══════════════════════════════════════════════════════════════
      
      doc.rect(margin, y, contentWidth, 20).fill(primaryColor);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      doc.text('INFORMATIONS GENERALES', margin + 10, y + 6, { lineBreak: false });
      y += 26;
      
      doc.fillColor(lightGray).fontSize(7).font('Helvetica-Bold');
      doc.text('DEPARTEMENT', col1, y, { lineBreak: false });
      doc.text('RATTACHEMENT', col2, y, { lineBreak: false });
      y += 10;
      doc.fillColor(darkGray).fontSize(9).font('Helvetica');
      doc.text(fiche.departement || '-', col1, y, { lineBreak: false });
      doc.text(fiche.rattachement || '-', col2, y, { lineBreak: false });
      y += 16;
      
      doc.fillColor(lightGray).fontSize(7).font('Helvetica-Bold');
      doc.text('HORAIRES', col1, y, { lineBreak: false });
      doc.text('FORMATION REQUISE', col2, y, { lineBreak: false });
      y += 10;
      doc.fillColor(darkGray).fontSize(9).font('Helvetica');
      doc.text(fiche.horaires || '-', col1, y, { width: colWidth - 10, lineBreak: true, height: 20 });
      doc.text(fiche.formation || '-', col2, y, { width: colWidth - 10, lineBreak: true, height: 20 });
      
      y += 30;

      // ═══════════════════════════════════════════════════════════════
      // MISSIONS PRINCIPALES
      // ═══════════════════════════════════════════════════════════════
      
      doc.rect(margin, y, contentWidth, 20).fill(primaryColor);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      doc.text('MISSIONS PRINCIPALES', margin + 10, y + 6, { lineBreak: false });
      y += 28;
      
      const missions = Array.isArray(fiche.missions) ? fiche.missions : [];
      const midPoint = Math.ceil(missions.length / 2);
      const missionsCol1 = missions.slice(0, midPoint);
      const missionsCol2 = missions.slice(midPoint);
      const missionLineH = 28;
      
      missionsCol1.forEach((m, i) => {
        const ly = y + (i * missionLineH);
        // Cercle avec numéro centré
        doc.circle(col1 + 8, ly + 7, 8).fill(primaryColor);
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
        const ns = String(i + 1);
        doc.text(ns, col1 + 8 - doc.widthOfString(ns)/2, ly + 3.5, { lineBreak: false });
        // Texte
        doc.fillColor(darkGray).fontSize(9).font('Helvetica');
        doc.text(m, col1 + 24, ly, { width: colWidth - 30, lineBreak: true, height: 26 });
      });
      
      missionsCol2.forEach((m, i) => {
        const ly = y + (i * missionLineH);
        doc.circle(col2 + 8, ly + 7, 8).fill(primaryColor);
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
        const ns = String(midPoint + i + 1);
        doc.text(ns, col2 + 8 - doc.widthOfString(ns)/2, ly + 3.5, { lineBreak: false });
        doc.fillColor(darkGray).fontSize(9).font('Helvetica');
        doc.text(m, col2 + 24, ly, { width: colWidth - 30, lineBreak: true, height: 26 });
      });
      
      y += Math.max(missionsCol1.length, missionsCol2.length) * missionLineH + 8;

      // ═══════════════════════════════════════════════════════════════
      // COMPÉTENCES REQUISES
      // ═══════════════════════════════════════════════════════════════
      
      doc.rect(margin, y, contentWidth, 20).fill(primaryColor);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      doc.text('COMPETENCES REQUISES', margin + 10, y + 6, { lineBreak: false });
      y += 28;
      
      const competences = Array.isArray(fiche.competences) ? fiche.competences : [];
      const midComp = Math.ceil(competences.length / 2);
      const compCol1 = competences.slice(0, midComp);
      const compCol2 = competences.slice(midComp);
      const compLineH = 22;
      
      compCol1.forEach((c, i) => {
        const ly = y + (i * compLineH);
        doc.fillColor('#22c55e').fontSize(12).font('Helvetica-Bold');
        doc.text('>', col1, ly, { lineBreak: false });
        doc.fillColor(darkGray).fontSize(9).font('Helvetica');
        doc.text(c, col1 + 14, ly + 1, { width: colWidth - 20, lineBreak: true, height: 20 });
      });
      
      compCol2.forEach((c, i) => {
        const ly = y + (i * compLineH);
        doc.fillColor('#22c55e').fontSize(12).font('Helvetica-Bold');
        doc.text('>', col2, ly, { lineBreak: false });
        doc.fillColor(darkGray).fontSize(9).font('Helvetica');
        doc.text(c, col2 + 14, ly + 1, { width: colWidth - 20, lineBreak: true, height: 20 });
      });
      
      y += Math.max(compCol1.length, compCol2.length) * compLineH + 12;

      // ═══════════════════════════════════════════════════════════════
      // CONDITIONS & AVANTAGES
      // ═══════════════════════════════════════════════════════════════
      
      if (fiche.conditionsTravail || fiche.avantages) {
        doc.rect(margin, y, contentWidth, 20).fill(primaryColor);
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
        doc.text('CONDITIONS ET AVANTAGES', margin + 10, y + 6, { lineBreak: false });
        y += 28;
        
        const boxWidth = (contentWidth - 12) / 2;
        const boxHeight = 65;
        
        if (fiche.conditionsTravail) {
          doc.rect(col1, y, boxWidth, boxHeight).fill('#fef2f2');
          doc.rect(col1, y, 3, boxHeight).fill(primaryColor);
          doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold');
          doc.text('CONDITIONS DE TRAVAIL', col1 + 10, y + 8, { lineBreak: false });
          doc.fillColor(darkGray).fontSize(9).font('Helvetica');
          doc.text(fiche.conditionsTravail, col1 + 10, y + 22, { width: boxWidth - 20, lineBreak: true, height: 40 });
        }
        
        if (fiche.avantages) {
          const boxX = col1 + boxWidth + 12;
          doc.rect(boxX, y, boxWidth, boxHeight).fill('#f0fdf4');
          doc.rect(boxX, y, 3, boxHeight).fill('#22c55e');
          doc.fillColor('#16a34a').fontSize(8).font('Helvetica-Bold');
          doc.text('AVANTAGES', boxX + 10, y + 8, { lineBreak: false });
          doc.fillColor(darkGray).fontSize(9).font('Helvetica');
          doc.text(fiche.avantages, boxX + 10, y + 22, { width: boxWidth - 20, lineBreak: true, height: 40 });
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // PIED DE PAGE - Position fixe en bas de page
      // ═══════════════════════════════════════════════════════════════
      
      const footerY = 800;
      doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY)
         .strokeColor('#e5e7eb').lineWidth(1).stroke();
      
      doc.fillColor(lightGray).fontSize(8).font('Helvetica');
      doc.text('Document genere le ' + new Date().toLocaleDateString('fr-FR'), margin, footerY + 8, { lineBreak: false });
      
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold');
      doc.text(nomEtablissement, pageWidth - margin - 95, footerY + 8, { lineBreak: false });
      
      doc.rect(0, pageHeight - 6, pageWidth, 6).fill(primaryColor);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES API
// ═══════════════════════════════════════════════════════════════════════════

// GET /categories - Liste les catégories disponibles
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    res.json(CATEGORIES_DISPONIBLES);
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /templates - Liste les templates par défaut
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const templates = Object.entries(TEMPLATES_DEFAUT).map(([cat, tpl]) => ({
      categorie: cat,
      titre: tpl.titre,
      departement: tpl.departement
    }));
    res.json(templates);
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /template/:categorie - Récupérer le template par défaut d'une catégorie
router.get('/template/:categorie', authMiddleware, async (req, res) => {
  try {
    const { categorie } = req.params;
    
    if (!TEMPLATES_DEFAUT[categorie]) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }
    
    res.json({ categorie, ...TEMPLATES_DEFAUT[categorie] });
  } catch (error) {
    console.error('Erreur récupération template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET / - Liste toutes les fiches de poste (sauvegardées en base)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const fiches = await prisma.fichePoste.findMany({
      where: { active: true },
      orderBy: { categorie: 'asc' }
    });
    
    // Compléter avec les templates par défaut pour les catégories sans fiche
    const fichesMap = new Map(fiches.map(f => [f.categorie, f]));
    
    const result = CATEGORIES_DISPONIBLES.map(cat => {
      if (fichesMap.has(cat)) {
        return { ...fichesMap.get(cat), isCustom: true };
      }
      return { categorie: cat, ...TEMPLATES_DEFAUT[cat], isCustom: false };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erreur récupération fiches:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST / - Créer ou mettre à jour une fiche de poste (admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { categorie, titre, departement, rattachement, horaires, formation, 
            missions, competences, conditionsTravail, avantages } = req.body;
    
    if (!categorie || !titre) {
      return res.status(400).json({ error: 'Catégorie et titre requis' });
    }
    
    // Vérifier si la fiche existe déjà
    const existing = await prisma.fichePoste.findUnique({
      where: { categorie }
    });
    
    const data = {
      titre,
      departement: departement || '',
      rattachement: rattachement || '',
      horaires: horaires || '',
      formation: formation || '',
      missions: missions || [],
      competences: competences || [],
      conditionsTravail: conditionsTravail || null,
      avantages: avantages || null
    };
    
    let fiche;
    if (existing) {
      fiche = await prisma.fichePoste.update({
        where: { categorie },
        data: { ...data, updatedBy: req.userId }
      });
      console.log(`📝 Fiche de poste mise à jour: ${categorie}`);
    } else {
      fiche = await prisma.fichePoste.create({
        data: { ...data, categorie, createdBy: req.userId }
      });
      console.log(`📄 Fiche de poste créée: ${categorie}`);
    }
    
    res.json(fiche);
  } catch (error) {
    console.error('Erreur sauvegarde fiche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /ma-fiche - Fiches de l'employé connecté selon ses catégories
router.get('/ma-fiche', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { categories: true }
    });
    
    if (!user?.categories || user.categories.length === 0) {
      return res.json([]);
    }
    
    const userCategories = Array.isArray(user.categories) ? user.categories : [user.categories];
    
    const result = [];
    for (const cat of userCategories) {
      let fiche = await prisma.fichePoste.findUnique({ where: { categorie: cat } });
      if (!fiche && TEMPLATES_DEFAUT[cat]) {
        fiche = { categorie: cat, ...TEMPLATES_DEFAUT[cat] };
      }
      if (fiche) result.push(fiche);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Erreur récupération fiches employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /generer/:categorie - Générer et télécharger le PDF
router.get('/generer/:categorie', authMiddleware, async (req, res) => {
  try {
    const categorie = decodeURIComponent(req.params.categorie);
    
    // Récupérer la fiche (personnalisée ou template)
    let fiche = await prisma.fichePoste.findUnique({ where: { categorie } });
    
    if (!fiche) {
      if (!TEMPLATES_DEFAUT[categorie]) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }
      fiche = { categorie, ...TEMPLATES_DEFAUT[categorie] };
    }
    
    // Récupérer les infos établissement
    const etablissement = {
      nom: req.query.etablissement || 'Le Fournil à Pizzas',
      adresse: req.query.adresse || ''
    };
    
    const pdfBuffer = await genererPDF(fiche, etablissement);
    
    const filename = `Fiche_Poste_${categorie.replace(/[\/\s]+/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    res.status(500).json({ error: 'Erreur génération PDF' });
  }
});

// GET /preview/:categorie - Prévisualiser le PDF (inline)
router.get('/preview/:categorie', authMiddleware, async (req, res) => {
  try {
    const categorie = decodeURIComponent(req.params.categorie);
    
    let fiche = await prisma.fichePoste.findUnique({ where: { categorie } });
    
    if (!fiche) {
      if (!TEMPLATES_DEFAUT[categorie]) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }
      fiche = { categorie, ...TEMPLATES_DEFAUT[categorie] };
    }
    
    const etablissement = {
      nom: req.query.etablissement || 'Le Fournil à Pizzas',
      adresse: req.query.adresse || ''
    };
    
    const pdfBuffer = await genererPDF(fiche, etablissement);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur prévisualisation:', error);
    res.status(500).json({ error: 'Erreur prévisualisation' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES AVEC PARAMÈTRES DYNAMIQUES (doivent être en DERNIER)
// ═══════════════════════════════════════════════════════════════════════════

// GET /:categorie - Récupérer une fiche spécifique
router.get('/:categorie', authMiddleware, async (req, res) => {
  try {
    const categorie = decodeURIComponent(req.params.categorie);
    
    // Chercher d'abord en base
    const fiche = await prisma.fichePoste.findUnique({
      where: { categorie }
    });
    
    if (fiche) {
      return res.json({ ...fiche, isCustom: true });
    }
    
    // Sinon retourner le template par défaut
    if (TEMPLATES_DEFAUT[categorie]) {
      return res.json({ categorie, ...TEMPLATES_DEFAUT[categorie], isCustom: false });
    }
    
    res.status(404).json({ error: 'Fiche non trouvée' });
  } catch (error) {
    console.error('Erreur récupération fiche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /:categorie - Réinitialiser une fiche (revenir au template par défaut)
router.delete('/:categorie', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const categorie = decodeURIComponent(req.params.categorie);
    
    await prisma.fichePoste.delete({
      where: { categorie }
    }).catch(() => {});
    
    console.log(`🔄 Fiche de poste réinitialisée: ${categorie}`);
    res.json({ success: true, message: 'Fiche réinitialisée au template par défaut' });
  } catch (error) {
    console.error('Erreur réinitialisation fiche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

console.log('🟢 [BOOT] fichesPosteRoutes loaded');

module.exports = router;
