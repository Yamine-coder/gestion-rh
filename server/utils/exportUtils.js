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
    let joursCP = 0;
    let joursRTT = 0;
    let joursMaladie = 0;

    emp.heuresParJour?.forEach((jour) => {
      if (jour.type === 'absence' || (jour.heuresTravaillees === 0 && jour.heuresPrevues > 0)) {
        const dateFormatee = new Date(jour.jour).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' });
        const congeType = (jour.details?.congeType || jour.congeType || '').toLowerCase();

        if (congeType.includes('maladie')) {
          datesMaladie.push(dateFormatee);
          joursMaladie++;
        } else if (congeType.includes('rtt')) {
          datesRTT.push(dateFormatee);
          joursRTT++;
        } else if (congeType.includes('cp') || congeType.includes('congé')) {
          datesCP.push(dateFormatee);
          joursCP++;
        } else if (!congeType) {
          datesInjustifiees.push(dateFormatee);
        } else {
          datesCP.push(dateFormatee);
          joursCP++;
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

  // === RAPPORT COMPTABLE PROFESSIONNEL ===
  const hrSheet = workbook.addWorksheet('Rapport Heures', {
    properties: { tabColor: { argb: 'FFCF292C' } },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 5 }]
  });

  // ENTREPRISE - nom en rouge
  hrSheet.mergeCells('A1:L1');
  const entrepriseCell = hrSheet.getCell('A1');
  entrepriseCell.value = 'LE FOURNIL A PIZZAS - CHEZ ANTOINE';
  entrepriseCell.font = { size: 14, bold: true, color: { argb: 'FFCF292C' } };
  entrepriseCell.alignment = { vertical: 'middle', horizontal: 'center' };
  hrSheet.getRow(1).height = 30;

  // TITRE - professionnel avec fond sombre
  hrSheet.mergeCells('A2:L2');
  const titleCell = hrSheet.getCell('A2');
  titleCell.value = 'RAPPORT MENSUEL - HEURES & ABSENCES';
  titleCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.dark } };
  hrSheet.getRow(2).height = 28;

  // PÉRIODE - avec fond gris clair
  hrSheet.mergeCells('A3:L3');
  const periodeCell = hrSheet.getCell('A3');
  periodeCell.value = `Période : ${dateDebut.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: 'long', year: 'numeric' })} au ${dateFin.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: 'long', year: 'numeric' })}  —  ${computedEmployes.length} salarié(s)`;
  periodeCell.font = { size: 10, italic: true, color: { argb: palette.dark } };
  periodeCell.alignment = { vertical: 'middle', horizontal: 'center' };
  periodeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  hrSheet.getRow(3).height = 22;

  // Ligne vide de séparation
  hrSheet.addRow([]);

  // EN-TÊTES - style professionnel avec bordures
  const headerRow = hrSheet.addRow([
    'Employé',
    'Heures travaillées',
    'Congés payés',
    'RTT',
    'Arrêt maladie',
    'Congé sans solde',
    'Congé exceptionnel',
    'Formation',
    'Abs. injustifiées',
    'Navigo',
    'Justificatif',
    'Observations',
    'Détail CP',
    'Détail RTT',
    'Détail Maladie',
    'Détail Sans solde',
    'Détail Exceptionnel',
    'Détail Formation',
    'Détail Injustifiées'
  ]);
  headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: palette.lightGray } },
      bottom: { style: 'medium', color: { argb: palette.dark } },
      left: { style: 'thin', color: { argb: palette.lightGray } },
      right: { style: 'thin', color: { argb: palette.lightGray } }
    };
  });
  headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  const columnWidths = [25, 12, 22, 22, 22, 22, 22, 22, 22, 8, 12, 15, 30, 30, 30, 30, 30, 30, 30];
  hrSheet.columns = columnWidths.map((width, i) => ({ key: `col${i}`, width }));

  // Masquer les colonnes de détails (dates) - colonnes M à S (index 12 à 18)
  for (let i = 13; i <= 19; i++) {
    hrSheet.getColumn(i).hidden = true;
  }

  // Préparer les liens Navigo pour l'Excel
  const navigoLinks = [];
  
  computedEmployes.forEach((emp, index) => {
    // Vérifier si l'employé a un justificatif Navigo VALIDÉ pour CE MOIS
    const justifMensuel = emp.justificatifsNavigo?.[0];
    const fichierNavigo = justifMensuel?.fichier;
    const navigoValue = fichierNavigo ? 'Oui' : '';
    
    if (fichierNavigo) {
      const filePath = path.join(__dirname, '..', fichierNavigo);
      
      if (fs.existsSync(filePath)) {
        const extension = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        
        // Créer un lien vers le fichier (relatif ou absolu selon le contexte)
        navigoLinks.push({
          rowIndex: index,
          filePath: fichierNavigo, // Chemin relatif depuis la racine du serveur
          fileName: fileName,
          extension: extension
        });
      } else {
        console.warn(`   ❌ Fichier introuvable: ${filePath}`);
      }
    }

    // Format avec dates : "X j (dates)"
    const formatAbsence = (jours, dates) => {
      if (!jours || jours === 0) return '-';
      if (jours === 1 && dates && dates.length > 0) return `1 j (${dates[0]})`;
      if (jours <= 3 && dates && dates.length > 0) return `${jours} j (${dates.join(', ')})`;
      return `${jours} jours`;
    };
    
    const row = hrSheet.addRow([
      `${emp.nom.toUpperCase()} ${emp.prenom}`,
      emp.heuresNormales.toFixed(1) + ' h', // Exclut les heures extra (non Navigo),
      formatAbsence(emp.joursCP || 0, emp.datesCP),
      formatAbsence(emp.joursRTT || 0, emp.datesRTT),
      formatAbsence(emp.joursMaladie || 0, emp.datesMaladie),
      formatAbsence(emp.joursSansSolde || 0, emp.datesSansSolde),
      formatAbsence(emp.joursExceptionnel || 0, emp.datesExceptionnel),
      formatAbsence(emp.joursFormation || 0, emp.datesFormation),
      formatAbsence(emp.absencesInjustifiees || 0, emp.datesInjustifiees),
      navigoValue,
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

    // Hauteur de ligne adaptée pour afficher les dates
    row.height = 30;
    row.font = { size: 10, color: { argb: palette.dark } };

    // Alternance sobre avec bordures
    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      if (isEven && colNumber <= 12) { // Seulement colonnes visibles
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
    
    // Heures - en gras
    row.getCell(2).font = { size: 10, bold: true, color: { argb: palette.dark } };

    // Absences injustifiées (col 9) - rouge si > 0
    if ((emp.absencesInjustifiees || 0) > 0) {
      row.getCell(9).font = { size: 10, bold: true, color: { argb: 'FFDC2626' } };
    }

    // Navigo (col 10) - couleur selon éligibilité
    const navigoCell = row.getCell(10);
    if (emp.eligibleNavigo) {
      navigoCell.font = { size: 10, bold: true, color: { argb: '059669' } };
    } else {
      navigoCell.font = { size: 9, color: { argb: palette.gray } };
    }
    
    // Justificatif (col 11) - cellule préparée pour recevoir le lien
    const justifCell = row.getCell(11);
    justifCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Colonnes cachées - alignement à gauche pour lecture facile
    for (let i = 13; i <= 19; i++) {
      row.getCell(i).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
  });

  // Ajouter les liens Navigo dans les cellules correspondantes
  
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
  
  navigoLinks.forEach(({ rowIndex, filePath, fileName, extension }) => {
    try {
      // Calculer la position de la ligne (row 5 = header, donc données commencent à row 6)
      const excelRow = 6 + rowIndex;
      
      // Récupérer la cellule
      const cell = hrSheet.getCell(`K${excelRow}`); // Colonne K = Justificatif
      
      // Créer un lien cliquable vers le fichier
      const fileUrl = `${BASE_URL}/${filePath.replace(/\\/g, '/')}${token ? '?token=' + token : ''}`;
      
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
  
  // Ligne vide avant totaux
  hrSheet.addRow([]);

  // LIGNE DE TOTAUX - style comptable avec double bordure
  const totalRow = hrSheet.addRow([
    `TOTAL (${computedEmployes.length} salariés)`,
    totals.heuresTravaillees.toFixed(1) + ' h',
    totals.cp ? totals.cp + ' j' : '-',
    totals.rtt ? totals.rtt + ' j' : '-',
    totals.maladie ? totals.maladie + ' j' : '-',
    totals.sansSolde ? totals.sansSolde + ' j' : '-',
    totals.exceptionnel ? totals.exceptionnel + ' j' : '-',
    totals.formation ? totals.formation + ' j' : '-',
    totals.absInjustifiees ? totals.absInjustifiees + ' j' : '-',
    '',
    '',
    ''
  ]);

  totalRow.font = { bold: true, size: 10, color: { argb: palette.dark } };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  totalRow.height = 28;
  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'double', color: { argb: palette.dark } },
      bottom: { style: 'double', color: { argb: palette.dark } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Note de bas de page avec nom entreprise
  hrSheet.addRow([]);
  const noteRow = hrSheet.addRow([
    `Le Fournil A Pizzas - Chez Antoine, Vincennes  •  Généré le ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} à ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}  •  Colonnes masquées : dates détaillées par type d'absence`,
    '', '', '', '', '', '', '', '', '', '', ''
  ]);
  hrSheet.mergeCells(`A${noteRow.number}:L${noteRow.number}`);
  noteRow.getCell(1).font = { size: 8, italic: true, color: { argb: palette.gray } };
  noteRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  noteRow.height = 20;

  hrSheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: 12 }
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