const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function generateEmployeePDF(employe, rapportData, periode, dateDebut, dateFin) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Couleurs charte
      const PRIMARY = '#cf292c';
      const DARK = '#1f2937';
      const GRAY = '#6b7280';
      const LIGHT = '#9ca3af';
      const BORDER = '#e5e7eb';
      const GREEN = '#059669';
      const BG_LIGHT = '#f8f9fa';
      const WHITE = '#ffffff';

      // Calculs
      let heuresPrevues = 0;
      let heuresTravaillees = 0;
      if (rapportData.heuresParJour && rapportData.heuresParJour.length > 0) {
        rapportData.heuresParJour.forEach(jour => {
          heuresPrevues += (jour.prevues || 0);
          heuresTravaillees += (jour.travaillees || 0);
        });
      }
      if (heuresPrevues === 0) heuresPrevues = rapportData.heuresPrevues || 0;
      if (heuresTravaillees === 0) heuresTravaillees = rapportData.heuresTravaillees || 0;
      
      const ecartTotal = heuresTravaillees - heuresPrevues;
      const tauxRealisation = heuresPrevues > 0 ? Math.round((heuresTravaillees / heuresPrevues) * 100) : 100;
      const joursPresents = rapportData.statistiques?.joursPresents || 0;
      const retards = rapportData.nombreRetards || 0;
      const tauxPonctualite = rapportData.tauxPonctualite !== undefined ? rapportData.tauxPonctualite : 100;
      const moyHeures = joursPresents > 0 ? (heuresTravaillees / joursPresents).toFixed(1) : '0.0';

      const pageWidth = 495;
      const left = 50;
      let y = 0;

      // === HEADER ROUGE ===
      doc.rect(0, 0, 595, 70).fill(PRIMARY);
      
      doc.fontSize(18).fillColor(WHITE).font('Helvetica-Bold').text('RAPPORT DE PRESENCE', left, 22);
      
      const periodeLabel = periode === 'mois' ? 'Mensuel' : periode === 'semaine' ? 'Hebdomadaire' : 'Trimestriel';
      const formatDate = (d) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: 'short', year: 'numeric' });
      doc.fontSize(10).fillColor(WHITE).font('Helvetica').text(
        `${periodeLabel}  -  ${formatDate(dateDebut)} au ${formatDate(dateFin)}`, left, 46
      );

      // === EMPLOYE ===
      y = 90;
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text(`${employe.prenom} ${employe.nom}`, left, y);
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(employe.email, left, y + 17);
      
      // Ligne separatrice
      y = 125;
      doc.moveTo(left, y).lineTo(left + pageWidth, y).strokeColor(BORDER).lineWidth(1).stroke();

      // === SYNTHESE DES HEURES ===
      y = 145;
      doc.fontSize(9).fillColor(LIGHT).font('Helvetica-Bold').text('SYNTHESE DES HEURES', left, y);
      y += 20;
      
      // Card avec fond
      doc.roundedRect(left, y, pageWidth, 80, 4).fill(BG_LIGHT);
      
      const colWidth = pageWidth / 3;
      const cardY = y + 18;
      
      // Col 1 - Heures prevues
      doc.fontSize(8).fillColor(GRAY).font('Helvetica').text('Prevues', left + 25, cardY);
      doc.fontSize(26).fillColor(DARK).font('Helvetica-Bold').text(heuresPrevues.toFixed(0) + 'h', left + 25, cardY + 14);
      
      // Separateur vertical
      doc.moveTo(left + colWidth, y + 15).lineTo(left + colWidth, y + 65).strokeColor(BORDER).lineWidth(1).stroke();
      
      // Col 2 - Heures realisees
      doc.fontSize(8).fillColor(GRAY).font('Helvetica').text('Realisees', left + colWidth + 25, cardY);
      doc.fontSize(26).fillColor(PRIMARY).font('Helvetica-Bold').text(heuresTravaillees.toFixed(2) + 'h', left + colWidth + 25, cardY + 14);
      doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(tauxRealisation + '% du prevu', left + colWidth + 25, cardY + 45);
      
      // Separateur vertical
      doc.moveTo(left + colWidth * 2, y + 15).lineTo(left + colWidth * 2, y + 65).strokeColor(BORDER).lineWidth(1).stroke();
      
      // Col 3 - Ecart
      const ecartColor = ecartTotal >= 0 ? GREEN : PRIMARY;
      const ecartSign = ecartTotal >= 0 ? '+' : '';
      doc.fontSize(8).fillColor(GRAY).font('Helvetica').text('Ecart', left + colWidth * 2 + 25, cardY);
      doc.fontSize(26).fillColor(ecartColor).font('Helvetica-Bold').text(ecartSign + ecartTotal.toFixed(2) + 'h', left + colWidth * 2 + 25, cardY + 14);
      const ecartLabel = ecartTotal >= 0 ? 'Excedent' : 'A regulariser';
      doc.fontSize(8).fillColor(ecartColor).font('Helvetica').text(ecartLabel, left + colWidth * 2 + 25, cardY + 45);

      // === INDICATEURS ===
      y = 260;
      doc.fontSize(9).fillColor(LIGHT).font('Helvetica-Bold').text('INDICATEURS', left, y);
      y += 20;
      
      const stats = [
        { label: 'Jours travailles', value: joursPresents.toString(), color: DARK },
        { label: 'Retards', value: retards.toString(), color: retards > 0 ? '#d97706' : DARK },
        { label: 'Ponctualite', value: tauxPonctualite.toFixed(0) + '%', color: tauxPonctualite >= 80 ? GREEN : PRIMARY },
        { label: 'Moyenne / jour', value: moyHeures + 'h', color: DARK }
      ];
      
      const statWidth = pageWidth / 4;
      stats.forEach((s, i) => {
        const x = left + i * statWidth;
        doc.fontSize(20).fillColor(s.color).font('Helvetica-Bold').text(s.value, x, y);
        doc.fontSize(8).fillColor(LIGHT).font('Helvetica').text(s.label, x, y + 24);
      });

      // === DETAIL PAR JOUR ===
      y = 330;
      doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('DETAIL PAR JOUR', left, y);
      y += 15;

      if (rapportData.heuresParJour && rapportData.heuresParJour.length > 0) {
        // Header du tableau - Style sobre avec fond gris clair
        const colX = [left, left + 100, left + 195, left + 300, left + 405];
        const colW = [92, 87, 97, 97, 90];
        
        doc.roundedRect(left, y, pageWidth, 22, 2).fill('#f3f4f6');
        const headers = ['Date', 'Prevues', 'Realisees', 'Ecart', 'Statut'];
        headers.forEach((h, i) => {
          doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold').text(
            h.toUpperCase(), colX[i] + 10, y + 7, { width: colW[i], align: i === 0 ? 'left' : 'center' }
          );
        });
        
        y += 22;
        
        // Lignes du tableau - TOUTES les lignes avec pagination automatique
        const rowHeight = 24;
        const pageBottomLimit = 750; // Limite avant footer
        
        rapportData.heuresParJour.forEach((jour, idx) => {
          // Vérifier si on doit créer une nouvelle page
          if (y + rowHeight > pageBottomLimit) {
            doc.addPage();
            y = 50;
            
            // Re-dessiner le header du tableau sur la nouvelle page
            doc.roundedRect(left, y, pageWidth, 22, 2).fill('#f3f4f6');
            headers.forEach((h, i) => {
              doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold').text(
                h.toUpperCase(), colX[i] + 10, y + 7, { width: colW[i], align: i === 0 ? 'left' : 'center' }
              );
            });
            y += 22;
          }
          
          const prevues = jour.prevues || 0;
          const travaillees = jour.travaillees || 0;
          const ecart = travaillees - prevues;
          
          // Fond alterné
          if (idx % 2 === 0) {
            doc.rect(left, y, pageWidth, rowHeight).fill(BG_LIGHT);
          }
          
          const dateObj = new Date(jour.jour);
          const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
          const jourSemaine = jours[dateObj.getDay()];
          const dateFormatee = dateObj.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' });
          
          const rowY = y + 7;
          doc.fontSize(9).fillColor(DARK).font('Helvetica').text(`${jourSemaine} ${dateFormatee}`, colX[0] + 10, rowY);
          doc.fillColor(GRAY).text(prevues % 1 === 0 ? prevues + 'h' : prevues.toFixed(1) + 'h', colX[1] + 10, rowY, { width: colW[1], align: 'center' });
          doc.fillColor(DARK).font('Helvetica-Bold').text(travaillees.toFixed(2) + 'h', colX[2] + 10, rowY, { width: colW[2], align: 'center' });
          
          const rowEcartColor = ecart > 0.01 ? GREEN : ecart < -0.01 ? PRIMARY : GRAY;
          doc.fillColor(rowEcartColor).font('Helvetica').text((ecart >= 0 ? '+' : '') + ecart.toFixed(2) + 'h', colX[3] + 10, rowY, { width: colW[3], align: 'center' });
          
          // Déterminer la couleur du statut
          const statut = jour.statut || (jour.type !== 'absence' && travaillees > 0 ? 'Présent' : 'Absent');
          let statutColor = GRAY;
          if (statut === 'Présent' || statut === 'Present') {
            statutColor = GREEN;
          } else if (statut === 'Absence' || statut === 'Absent') {
            statutColor = PRIMARY;
          } else if (statut.includes('Congé') || statut === 'RTT' || statut.includes('Maladie')) {
            statutColor = '#3b82f6'; // Bleu pour congés/RTT/maladie
          } else if (statut === 'Repos') {
            statutColor = GRAY;
          }
          
          doc.fontSize(8).fillColor(statutColor).font('Helvetica-Bold').text(
            statut, colX[4] + 10, rowY + 1, { width: colW[4], align: 'center' }
          );
          
          y += rowHeight;
        });
      }

      // === FOOTER === (positionné juste après le contenu, pas en bas fixe)
      // Ajouter un espace après le tableau
      y += 20;
      
      // Si on est trop bas, ajouter une nouvelle page pour le footer
      if (y > 780) {
        doc.addPage();
        y = 50;
      }
      
      // Ligne de séparation et texte du footer
      doc.moveTo(left, y).lineTo(left + pageWidth, y).strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.fontSize(8).fillColor(LIGHT).font('Helvetica').text(
        `Document genere le ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        left, y + 8, { width: pageWidth, align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generateAllEmployeesExcel(rapportsEmployes, periode, dateDebut, dateFin, token) {
  const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
  const TEMPLATE_FILENAME = 'rapport-heures-template.xlsm';
  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_FILENAME);
  const templateExists = fs.existsSync(templatePath);

  const workbook = new ExcelJS.Workbook();

  if (templateExists) {
    const templateBuffer = await fs.promises.readFile(templatePath);
    await workbook.xlsx.load(templateBuffer);

    // On repart d'une feuille propre mais on conserve le projet VBA du modèle
    while (workbook.worksheets.length) {
      workbook.removeWorksheet(workbook.worksheets[0].id);
    }
  }

  workbook.creator = 'Le Fournil A Pizzas - Chez Antoine';
  workbook.created = new Date();

  // Palette sobre et professionnelle (inspirée du rapport PDF)
  const palette = {
    dark: 'FF1F2937',       // Noir/gris foncé - titres
    accent: 'FFCF292C',     // Rouge - uniquement pour alertes
    gray: 'FF6B7280',       // Gris moyen - texte secondaire
    lightGray: 'FFD1D5DB',  // Gris clair - bordures
    soft: 'FFF9FAFB',       // Gris très clair - alternance lignes
    white: 'FFFFFFFF'       // Blanc
  };

  // Pré-calculs pour chaque employé (utilisés par les deux feuilles)
  const computedEmployes = rapportsEmployes.map((emp) => {
    const joursOuvres = emp.statistiques?.joursOuvrables ?? 22;
    const joursPresents = emp.statistiques?.joursTravailles ?? 0;
    const heuresPrevues = emp.heuresPrevues || 0;
    const heuresTravaillees = emp.heuresTravaillees || 0;
    const heuresSupplementaires = emp.heuresSupplementaires || 0;
    const heuresExtra = emp.heuresExtra || 0;
    const heuresNormales = Math.max(0, heuresTravaillees - heuresExtra);
    const heuresManquantes = Math.max(0, heuresPrevues - heuresTravaillees);

    const datesCP = [];
    const datesRTT = [];
    const datesMaladie = [];
    const datesInjustifiees = [];
    const datesSansSolde = [];
    const datesFormation = [];
    const datesExceptionnel = [];
    let joursCP = 0;
    let joursRTT = 0;
    let joursMaladie = 0;

    emp.heuresParJour?.forEach((jour) => {
      // Ignorer les jours futurs (pas encore travaillés, ce n'est pas une absence)
      const jourDate = new Date(jour.jour);
      const now = new Date();
      // Comparer en date Paris (sans heure)
      const jourKey = jourDate.toISOString().slice(0, 10);
      const todayKey = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }); // format YYYY-MM-DD
      if (jourKey > todayKey) return;

      if (jour.type === 'absence' || (jour.heuresTravaillees === 0 && jour.heuresPrevues > 0)) {
        const dateFormatee = new Date(jour.jour).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' });
        const congeType = (jour.details?.congeType || jour.congeType || '').toLowerCase();

        if (congeType.includes('maladie') || congeType.includes('arret')) {
          datesMaladie.push(dateFormatee);
          joursMaladie++;
        } else if (congeType.includes('rtt')) {
          datesRTT.push(dateFormatee);
          joursRTT++;
        } else if (congeType.includes('sans') && congeType.includes('sold')) {
          // "sans_solde", "sans solde", "Congé sans solde", etc.
          datesSansSolde.push(dateFormatee);
        } else if (congeType.includes('formation')) {
          datesFormation.push(dateFormatee);
        } else if (congeType.includes('exceptionnel')) {
          datesExceptionnel.push(dateFormatee);
        } else if (congeType.includes('cp') || congeType.includes('cong')) {
          // "cp", "conge_paye", "congé payé" — APRÈS les checks sans solde/exceptionnel
          datesCP.push(dateFormatee);
          joursCP++;
        } else if (!congeType) {
          datesInjustifiees.push(dateFormatee);
        } else {
          // Type inconnu → absence injustifiée plutôt que CP par défaut
          datesInjustifiees.push(dateFormatee);
        }
      }
    });

    const absJustifiees = typeof emp.absencesJustifiees === 'number'
      ? emp.absencesJustifiees
      : (joursCP + joursRTT + joursMaladie);

    const tauxPresenceRatio = joursOuvres > 0 ? (joursPresents / joursOuvres) : 0;
    const tauxPresencePercent = Math.round(tauxPresenceRatio * 1000) / 10;

    const alertes = [];
    if (heuresManquantes > 0) alertes.push(`H. manquantes ${heuresManquantes.toFixed(1)}h`);
    if (heuresExtra > 10) alertes.push(`H. extra ${heuresExtra.toFixed(1)}h`);
    if (emp.absencesInjustifiees > 0) alertes.push(`${emp.absencesInjustifiees} abs. injust.`);
    if (datesMaladie.length > 0) alertes.push(`${datesMaladie.length}j maladie`);
    const alertesText = alertes.length ? alertes.join(' | ') : 'RAS';

    const scoreFiabilite = Math.max(40, Math.min(100,
      100 - (heuresManquantes * 1.2) - (emp.absencesInjustifiees * 15) - Math.max(0, 90 - tauxPresencePercent) * 0.6
    ));

    const observations = [];
    if (tauxPresencePercent < 85) observations.push('Présence faible');
    if (emp.absencesInjustifiees > 0) observations.push('Retenue à prévoir');
    if (heuresManquantes > 5) observations.push('Vérifier planning');
    observations.push(`Indice fiabilité ${scoreFiabilite.toFixed(0)}%`);

    const tauxPonctualite = joursPresents > 0 
      ? Math.round(((joursPresents - emp.retards) / joursPresents) * 1000) / 10 
      : 100;
    
    const moyenneHeuresParJour = joursPresents > 0 
      ? Math.round((heuresTravaillees / joursPresents) * 10) / 10 
      : 0;

    return {
      ...emp,
      joursOuvres,
      joursPresents,
      heuresPrevues,
      heuresTravaillees,
      heuresSupplementaires,
      heuresNormales,
      heuresManquantes,
      datesCP,
      datesRTT,
      datesMaladie,
      datesInjustifiees,
      datesSansSolde,
      datesFormation,
      datesExceptionnel,
      joursCP,
      joursRTT,
      joursMaladie,
      absJustifiees,
      tauxPresenceRatio,
      tauxPresencePercent,
      alertesText,
      tauxPonctualite,
      moyenneHeuresParJour
    };
  });

  const totals = computedEmployes.reduce((acc, emp) => {
    acc.joursOuvres += emp.joursOuvres;
    acc.joursPresents += emp.joursPresents;
    acc.heuresPrevues += emp.heuresPrevues;
    acc.heuresTravaillees += emp.heuresTravaillees;
    acc.heuresSupp += emp.heuresExtra || 0;
    acc.heuresManquantes += emp.heuresManquantes;
    acc.absJustifiees += emp.absJustifiees;
    acc.absInjustifiees += emp.absencesInjustifiees || 0;
    acc.cp += emp.joursCP;
    acc.rtt += emp.joursRTT;
    acc.maladie += emp.joursMaladie;
    acc.sansSolde += emp.joursSansSolde || 0;
    acc.exceptionnel += emp.joursExceptionnel || 0;
    acc.formation += emp.joursFormation || 0;
    acc.retards += emp.retards || 0;
    acc.tauxPresence += emp.tauxPresencePercent;
    acc.tauxPonctualite += emp.tauxPonctualite;
    acc.moyenneHeuresParJour += emp.moyenneHeuresParJour;
    return acc;
  }, {
    joursOuvres: 0,
    joursPresents: 0,
    heuresPrevues: 0,
    heuresTravaillees: 0,
    heuresSupp: 0,
    heuresManquantes: 0,
    absJustifiees: 0,
    absInjustifiees: 0,
    cp: 0,
    rtt: 0,
    maladie: 0,
    sansSolde: 0,
    exceptionnel: 0,
    formation: 0,
    retards: 0,
    tauxPresence: 0,
    tauxPonctualite: 0,
    moyenneHeuresParJour: 0
  });

  // === NAVETTE - RAPPORT HEURES ===
  const hrSheet = workbook.addWorksheet('Rapport Heures', {
    properties: { tabColor: { argb: 'FFCF292C' } },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }]
  });

  // Largeurs de colonnes (8 visibles + 7 cachées)
  const columnWidths = [30, 38, 28, 14, 18, 16, 12, 22, 30, 30, 30, 30, 30, 30, 30];
  hrSheet.columns = columnWidths.map((width, i) => ({ key: `col${i}`, width }));

  // Masquer les colonnes de détails (dates) - colonnes I à O (index 8 à 14)
  for (let i = 9; i <= 15; i++) {
    hrSheet.getColumn(i).hidden = true;
  }

  const moisFr = dateDebut.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', month: 'long' });
  const anneeFull = dateDebut.getFullYear();

  // --- ROW 1 : TITRE + ENTREPRISE (compact) ---
  hrSheet.mergeCells('A1:H1');
  hrSheet.getRow(1).height = 28;
  const titleCell = hrSheet.getCell('A1');
  titleCell.value = { richText: [
    { text: 'NAVETTE  —  ', font: { size: 13, bold: true, color: { argb: 'FF1F2937' } } },
    { text: 'Le Fournil à Pizzas', font: { size: 13, bold: true, color: { argb: 'FFCF292C' } } }
  ]};
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };

  // --- ROW 2 : PÉRIODE + EMAIL (une seule ligne) ---
  hrSheet.mergeCells('A2:H2');
  hrSheet.getRow(2).height = 22;
  const infoCell = hrSheet.getCell('A2');
  infoCell.value = { richText: [
    { text: `${moisFr} ${anneeFull}`, font: { size: 10, bold: true, color: { argb: 'FFCF292C' } } },
    { text: '   •   Récapitulatif bulletins de salaires   •   ', font: { size: 9, color: { argb: 'FF6B7280' } } },
    { text: 'sk.auditreporting@gmail.com', font: { size: 9, color: { argb: 'FF2563EB' }, underline: true } }
  ]};
  infoCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // --- ROW 3 : Séparation fine ---
  hrSheet.getRow(3).height = 4;

  // --- ROW 4 : EN-TÊTES COLONNES (une seule ligne, sobre) ---
  const hdrBg = 'FF374151';
  const hdrFont = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  const hdrRedFont = { bold: false, size: 7.5, italic: true, color: { argb: 'FFFFB3B3' } };
  const hdrBorder = {
    top: { style: 'thin', color: { argb: 'FF374151' } },
    bottom: { style: 'medium', color: { argb: 'FF1F2937' } },
    left: { style: 'hair', color: { argb: 'FF4B5563' } },
    right: { style: 'hair', color: { argb: 'FF4B5563' } }
  };

  const headerDefs = [
    { col: 1, rt: [
      { text: 'NOM ET PRÉNOM', font: hdrFont }
    ]},
    { col: 2, rt: [
      { text: 'ABSENCES + MOTIF\n', font: hdrFont },
      { text: 'indiquez les dates', font: hdrRedFont }
    ]},
    { col: 3, rt: [
      { text: 'CONGÉS PAYÉS PRIS\n', font: hdrFont },
      { text: 'indiquez les dates', font: hdrRedFont }
    ]},
    { col: 4, rt: [
      { text: 'PRIME\n', font: hdrFont },
      { text: 'montant', font: hdrRedFont }
    ]},
    { col: 5, rt: [
      { text: 'NAVIGO\n', font: hdrFont },
      { text: 'mensuel / annuel', font: { size: 7.5, color: { argb: 'FFCBD5E1' } } }
    ]},
    { col: 6, rt: [
      { text: 'TARIF\n', font: hdrFont },
      { text: 'part salarié', font: { size: 7.5, color: { argb: 'FFCBD5E1' } } }
    ]},
    { col: 7, rt: [
      { text: 'JUSTIF.', font: hdrFont }
    ]},
    { col: 8, rt: [
      { text: 'OBSERVATIONS', font: hdrFont }
    ]}
  ];

  hrSheet.getRow(4).height = 36;
  headerDefs.forEach(({ col, rt }) => {
    const cell = hrSheet.getCell(4, col);
    cell.value = { richText: rt };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hdrBg } };
    cell.border = hdrBorder;
  });
  hrSheet.getCell(4, 1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  // En-têtes colonnes cachées (détails)
  ['Détail CP', 'Détail RTT', 'Détail Maladie', 'Détail Sans solde', 'Détail Exceptionnel', 'Détail Formation', 'Détail Injustifiées'].forEach((label, i) => {
    const cell = hrSheet.getCell(4, 9 + i);
    cell.value = label;
    cell.font = hdrFont;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hdrBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  // Préparer les liens Navigo pour l'Excel
  const navigoLinks = [];
  
  computedEmployes.forEach((emp, index) => {
    // Vérifier si l'employé a un justificatif Navigo VALIDÉ pour CE MOIS
    const justifMensuel = emp.justificatifsNavigo?.[0];
    const fichierNavigo = justifMensuel?.fichier;
    
    if (justifMensuel?.id) {
      const extension = path.extname(fichierNavigo || '').toLowerCase();
      const fileName = justifMensuel.fichierNom || path.basename(fichierNavigo || 'justificatif');
      
      navigoLinks.push({
        rowIndex: index,
        justificatifId: justifMensuel.id,
        fileName: fileName,
        extension: extension
      });
    }

    // Absences : richText structuré (type en gras, dates en normal, un par ligne)
    const absRichText = [];
    const absTypes = [
      { dates: emp.datesMaladie, label: 'Maladie', color: 'FFB91C1C' },
      { dates: emp.datesRTT, label: 'RTT', color: 'FF1D4ED8' },
      { dates: emp.datesSansSolde, label: 'Sans solde', color: 'FF92400E' },
      { dates: emp.datesFormation, label: 'Formation', color: 'FF6D28D9' },
      { dates: emp.datesExceptionnel, label: 'Exceptionnel', color: 'FF0E7490' },
      { dates: emp.datesInjustifiees, label: 'Injustifié', color: 'FFDC2626' }
    ];
    absTypes.forEach(({ dates, label, color }) => {
      if (dates?.length) {
        if (absRichText.length) absRichText.push({ text: '\n', font: { size: 8 } });
        absRichText.push(
          { text: `${label} : `, font: { bold: true, size: 9, color: { argb: color } } },
          { text: dates.join(', '), font: { size: 9, color: { argb: 'FF374151' } } }
        );
      }
    });

    // CP : richText structuré aussi
    const cpRichText = [];
    if (emp.datesCP?.length) {
      cpRichText.push(
        { text: `${emp.joursCP} jour${emp.joursCP > 1 ? 's' : ''} : `, font: { bold: true, size: 9, color: { argb: 'FF1D4ED8' } } },
        { text: emp.datesCP.join(', '), font: { size: 9, color: { argb: 'FF374151' } } }
      );
    }

    // Navigo type & tarif
    const navigoType = emp.eligibleNavigo ? 'Mensuel' : '';
    const navigoTarif = emp.eligibleNavigo ? '90,80' : '';
    
    const row = hrSheet.addRow([
      `${emp.nom.toUpperCase()} ${emp.prenom}`,
      '', // Absences — sera set en richText après
      '', // CP — sera set en richText après
      '', // Prime (à remplir manuellement par le comptable)
      navigoType,
      navigoTarif,
      '', // Justificatif
      '', // Observations
      // Colonnes cachées avec détails complets
      (emp.datesCP || []).join(', ') || '-',
      (emp.datesRTT || []).join(', ') || '-',
      (emp.datesMaladie || []).join(', ') || '-',
      (emp.datesSansSolde || []).join(', ') || '-',
      (emp.datesExceptionnel || []).join(', ') || '-',
      (emp.datesFormation || []).join(', ') || '-',
      (emp.datesInjustifiees || []).join(', ') || '-'
    ]);

    // Appliquer richText pour absences et CP
    if (absRichText.length) row.getCell(2).value = { richText: absRichText };
    if (cpRichText.length) row.getCell(3).value = { richText: cpRichText };

    // Hauteur de ligne adaptée au nombre de types d'absences
    const nbAbsLines = absTypes.filter(t => t.dates?.length).length;
    row.height = Math.max(28, nbAbsLines * 16);
    row.font = { size: 10, color: { argb: palette.dark } };

    // Alternance sobre avec bordures
    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      if (isEven && colNumber <= 8) { // Seulement colonnes visibles
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      }
      // Bordures fines
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right: { style: 'hair', color: { argb: 'FFE5E7EB' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Nom à gauche et en gras
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(1).font = { size: 10, bold: true, color: { argb: palette.dark } };

    // Absences (col 2) - le richText gère déjà les couleurs par type
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // Prime (col 4) - cellule vide, fond jaune clair pour indiquer saisie manuelle
    row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } };

    // Navigo Type (col 5)
    if (emp.eligibleNavigo) {
      row.getCell(5).font = { size: 10, bold: true, color: { argb: 'FF059669' } };
      row.getCell(6).font = { size: 10, color: { argb: palette.dark } };
    } else {
      row.getCell(5).font = { size: 9, color: { argb: palette.gray } };
    }
    
    // Justificatif (col 7) - cellule préparée pour recevoir le lien
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Colonnes cachées - alignement à gauche pour lecture facile
    for (let i = 9; i <= 15; i++) {
      row.getCell(i).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
  });

  // Ajouter les liens Navigo dans les cellules correspondantes
  
  const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://gestion-rh-vqof.onrender.com' : 'http://localhost:5000');
  
  navigoLinks.forEach(({ rowIndex, justificatifId, fileName, extension }) => {
    try {
      // Calculer la position de la ligne (row 4 = header, données dès row 5)
      const excelRow = 5 + rowIndex;
      
      // Récupérer la cellule
      const cell = hrSheet.getCell(`G${excelRow}`); // Colonne G = Justificatif
      
      // Lien vers la route API publique qui sert le fichier depuis la BDD (persistant)
      const fileUrl = `${BASE_URL}/api/navigo/fichier/${justificatifId}`;
      
      // Déterminer l'icône selon le type de fichier
      let iconText = '📄';
      if (['.pdf'].includes(extension)) iconText = '📄 PDF';
      else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(extension)) iconText = '🖼️ Image';
      else if (['.doc', '.docx'].includes(extension)) iconText = '📝 Word';
      else if (['.xls', '.xlsx'].includes(extension)) iconText = '📊 Excel';
      else iconText = '📎 Fichier';
      
      cell.value = {
        text: iconText,
        hyperlink: fileUrl,
        tooltip: `Télécharger ${fileName}`
      };
      
      cell.font = {
        size: 9,
        color: { argb: '0066CC' },
        underline: true,
        bold: false
      };
      
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } catch (err) {
      console.error(`   ❌ Erreur pour ${fileName}:`, err.message);
    }
  });
  
  // Note de bas de page
  hrSheet.addRow([]);
  const noteRow = hrSheet.addRow([
    `Le Fournil A Pizzas - Chez Antoine, Vincennes  •  Généré le ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} à ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}`,
    '', '', '', '', '', '', ''
  ]);
  hrSheet.mergeCells(`A${noteRow.number}:H${noteRow.number}`);
  noteRow.getCell(1).font = { size: 8, italic: true, color: { argb: palette.gray } };
  noteRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  noteRow.height = 20;

  hrSheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: 8 }
  };
  const buffer = await workbook.xlsx.writeBuffer();
  const mimeType = templateExists
    ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const extension = templateExists ? 'xlsm' : 'xlsx';

  // Attacher les métadonnées sur le buffer pour compatibilité ascendante
  buffer.mimeType = mimeType;
  buffer.extension = extension;
  buffer.usedTemplate = templateExists;

  return buffer;
}

module.exports = { generateEmployeePDF, generateAllEmployeesExcel };