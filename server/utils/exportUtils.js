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
      const formatDate = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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
          const dateFormatee = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          
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
        `Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
        left, y + 8, { width: pageWidth, align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generateAllEmployeesExcel(rapportsEmployes, periode, dateDebut, dateFin) {
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

  workbook.creator = 'Systeme RH Restaurant';
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
    const heuresNormales = Math.max(0, heuresTravaillees - heuresSupplementaires);
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
        const dateFormatee = new Date(jour.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
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
    if (heuresSupplementaires > 10) alertes.push(`H. supp ${heuresSupplementaires.toFixed(1)}h`);
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
    acc.heuresSupp += emp.heuresSupplementaires;
    acc.heuresManquantes += emp.heuresManquantes;
    acc.absJustifiees += emp.absJustifiees;
    acc.absInjustifiees += emp.absencesInjustifiees || 0;
    acc.cp += emp.joursCP;
    acc.rtt += emp.joursRTT;
    acc.maladie += emp.joursMaladie;
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
    retards: 0,
    tauxPresence: 0,
    tauxPonctualite: 0,
    moyenneHeuresParJour: 0
  });

  // === RAPPORT COMPTABLE SIMPLIFIÉ ===
  const hrSheet = workbook.addWorksheet('Rapport Heures', {
    properties: { tabColor: { argb: palette.primary } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5 }]
  });

  // TITRE - sobre, fond blanc avec ligne rouge
  hrSheet.mergeCells('A1:I1');
  const titleCell = hrSheet.getCell('A1');
  titleCell.value = 'RAPPORT MENSUEL';
  titleCell.font = { size: 18, bold: true, color: { argb: palette.dark } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.border = { bottom: { style: 'medium', color: { argb: palette.accent } } };
  hrSheet.getRow(1).height = 40;

  // PÉRIODE - discret
  hrSheet.mergeCells('A2:I2');
  const periodeCell = hrSheet.getCell('A2');
  periodeCell.value = `${dateDebut.toLocaleDateString('fr-FR')} - ${dateFin.toLocaleDateString('fr-FR')}`;
  periodeCell.font = { size: 10, color: { argb: palette.gray } };
  periodeCell.alignment = { vertical: 'middle', horizontal: 'left' };
  hrSheet.getRow(2).height = 20;

  // Ligne vide avant en-têtes
  hrSheet.addRow([]);

  // EN-TÊTES - sobres, fond gris clair
  const headerRow = hrSheet.addRow([
    'Employé',
    'Heures',
    'Congés payés',
    'RTT',
    'Maladie',
    'Abs. injust.',
    'Navigo',
    'Justif.',
    'Notes'
  ]);
  headerRow.font = { bold: true, size: 9, color: { argb: palette.dark } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.border = { bottom: { style: 'thin', color: { argb: palette.lightGray } } };
  });
  headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  const columnWidths = [22, 10, 18, 18, 18, 12, 8, 10, 18];
  hrSheet.columns = columnWidths.map((width, i) => ({ key: `col${i}`, width }));

  computedEmployes.forEach((emp, index) => {
    // Formater les absences de façon lisible
    const formatAbsence = (jours, dates) => {
      if (jours === 0) return '-';
      if (jours === 1) return `1 jour (${dates[0]})`;
      return `${jours} jours\n${dates.join(', ')}`;
    };

    // Préparer le justificatif Navigo (référence vers fichier dans ZIP)
    const navigoValue = emp.eligibleNavigo ? 'Oui' : '';
    
    // Utiliser le numéro PJ attribué par excelZipUtils, ou calculer si en mode standalone
    let justificatifText = '';
    let justificatifFileName = '';
    if (emp.justificatifNavigo && emp.eligibleNavigo) {
      // Extraire l'extension du fichier original
      const ext = emp.justificatifNavigo.split('.').pop() || 'pdf';
      justificatifFileName = `Navigo_${emp.nom}_${emp.prenom}.${ext}`;
      
      if (emp.pjNumber) {
        // Mode ZIP: utiliser le numéro pré-attribué
        justificatifText = `📎 PJ${emp.pjNumber}`;
      } else {
        // Mode standalone: calculer le numéro
        const justifIndex = computedEmployes
          .slice(0, index + 1)
          .filter(e => e.justificatifNavigo && e.eligibleNavigo)
          .length;
        justificatifText = `📎 PJ${justifIndex}`;
      }
    }

    const row = hrSheet.addRow([
      `${emp.nom.toUpperCase()} ${emp.prenom}`,
      emp.heuresTravaillees.toFixed(1) + ' h',
      formatAbsence(emp.joursCP, emp.datesCP),
      formatAbsence(emp.joursRTT, emp.datesRTT),
      formatAbsence(emp.joursMaladie, emp.datesMaladie),
      formatAbsence(emp.absencesInjustifiees || 0, emp.datesInjustifiees),
      navigoValue, // NAVIGO - Oui/Non basé sur BDD
      justificatifText, // JUSTIFICATIF NAVIGO - PJ1, PJ2, etc.
      ''  // OBSERVATIONS - cases vides pour notes manuelles
    ]);

    row.height = 24;
    row.font = { size: 9, color: { argb: palette.dark } };

    // Alternance sobre
    const isEven = index % 2 === 0;
    row.eachCell((cell) => {
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.soft } };
      }
      cell.border = { bottom: { style: 'hair', color: { argb: palette.lightGray } } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Nom à gauche
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(1).font = { size: 9, bold: true, color: { argb: palette.dark } };
    
    // Heures - sobre mais visible
    row.getCell(2).font = { size: 10, bold: true, color: { argb: palette.dark } };

    // Absences injustifiées - rouge discret
    if ((emp.absencesInjustifiees || 0) > 0) {
      row.getCell(6).font = { size: 9, bold: true, color: { argb: palette.accent } };
    }

    // Navigo - sobre
    const navigoCell = row.getCell(7);
    navigoCell.font = { size: 9, color: { argb: emp.eligibleNavigo ? palette.dark : palette.gray } };
    
    // Justificatif - avec lien vers le fichier dans le dossier ZIP
    const justifCell = row.getCell(8);
    if (emp.justificatifNavigo && justificatifFileName) {
      // Ajouter un hyperlien vers le fichier dans le dossier Justificatifs_Navigo
      justifCell.value = {
        text: justificatifText,
        hyperlink: `Justificatifs_Navigo/${justificatifFileName}`,
        tooltip: `Ouvrir ${justificatifFileName}`
      };
      justifCell.font = { size: 9, color: { argb: '0066CC' }, underline: true };
    } else {
      justifCell.font = { size: 9, color: { argb: palette.gray } };
    }
  });

  // Ligne vide avant totaux
  hrSheet.addRow([]);

  // LIGNE DE TOTAUX - sobre
  const totalRow = hrSheet.addRow([
    `Total (${computedEmployes.length})`,
    totals.heuresTravaillees.toFixed(0) + 'h',
    totals.cp || '-',
    totals.rtt || '-',
    totals.maladie || '-',
    totals.absInjustifiees || '-',
    '',
    '',
    ''
  ]);

  totalRow.font = { bold: true, size: 9, color: { argb: palette.dark } };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  totalRow.height = 26;
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: 'thin', color: { argb: palette.lightGray } } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Note discrète
  hrSheet.addRow([]);
  const noteRow = hrSheet.addRow([
    `Généré le ${new Date().toLocaleDateString('fr-FR')} • Cliquez sur les liens PJ pour ouvrir les justificatifs Navigo (extraire le ZIP d'abord)`,
    '', '', '', '', '', '', '', ''
  ]);
  hrSheet.mergeCells(`A${noteRow.number}:I${noteRow.number}`);
  noteRow.getCell(1).font = { size: 8, italic: true, color: { argb: palette.gray } };
  noteRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  noteRow.height = 20;

  hrSheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: 9 }
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