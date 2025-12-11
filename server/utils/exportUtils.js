const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function generateEmployeePDF(employe, rapportData, periode, dateDebut, dateFin) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PRIMARY = '#cf292c';
      const DARK = '#1f2937';
      const GRAY = '#6b7280';
      const LIGHT_GRAY = '#d1d5db';

      // === EN-TETE MINIMALISTE ===
      doc.fontSize(20).fillColor(DARK).font('Helvetica-Bold').text('RAPPORT DE PRESENCE', 40, 40);
      
      // Ligne rouge fine
      doc.moveTo(40, 70).lineTo(555, 70).strokeColor(PRIMARY).lineWidth(1.5).stroke();

      // Info employé + période sur une ligne épurée
      doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text(`${employe.prenom} ${employe.nom}`, 40, 82);
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(`${employe.role} • ${employe.email}`, 40, 97);
      
      doc.fontSize(9).fillColor(GRAY).text(
        `${dateDebut.toLocaleDateString('fr-FR')} - ${dateFin.toLocaleDateString('fr-FR')}`,
        0, 82, { align: 'right', width: 515 }
      );
      doc.fontSize(8).fillColor(LIGHT_GRAY).text(`${periode}`, 0, 97, { align: 'right', width: 515 });

      // === METRIQUES PRINCIPALES (3 colonnes compactes) ===
      const metricsY = 125;
      const colWidth = 170;

      const heuresPrevues = rapportData.heuresPrevues || 0;
      const heuresTravaillees = rapportData.heuresTravaillees || 0;
      const heuresSupp = rapportData.heuresSupplementaires || 0;
      const tauxRealisation = heuresPrevues > 0 ? ((heuresTravaillees / heuresPrevues) * 100).toFixed(0) : 100;

      // Colonne 1: Heures prévues
      doc.fontSize(8).fillColor(LIGHT_GRAY).font('Helvetica').text('HEURES PREVUES', 40, metricsY);
      doc.fontSize(36).fillColor(DARK).font('Helvetica-Bold').text(heuresPrevues.toFixed(0) + 'h', 40, metricsY + 15);

      // Colonne 2: Heures travaillées avec %
      doc.fontSize(8).fillColor(LIGHT_GRAY).font('Helvetica').text('HEURES TRAVAILLEES', 40 + colWidth, metricsY);
      doc.fontSize(36).fillColor(PRIMARY).font('Helvetica-Bold').text(heuresTravaillees.toFixed(0) + 'h', 40 + colWidth, metricsY + 15);
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(`${tauxRealisation}% realise`, 40 + colWidth, metricsY + 55);

      // Colonne 3: Heures supp
      doc.fontSize(8).fillColor(LIGHT_GRAY).font('Helvetica').text('HEURES SUPP.', 40 + colWidth * 2, metricsY);
      doc.fontSize(36).fillColor(DARK).font('Helvetica-Bold').text(heuresSupp.toFixed(0) + 'h', 40 + colWidth * 2, metricsY + 15);

      // === STATISTIQUES CONDENSEES ===
      const statsY = metricsY + 85;
      
      // Ligne de séparation fine
      doc.moveTo(40, statsY - 10).lineTo(555, statsY - 10).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

      const joursTravailles = rapportData.statistiques?.joursTravailles || 0;
      const absJust = rapportData.absencesJustifiees || 0;
      const absInjust = rapportData.absencesInjustifiees || 0;
      const retards = rapportData.nombreRetards || 0;
      const moyHeures = (rapportData.statistiques?.moyenneHeuresJour || 0).toFixed(1);
      const tauxPonctualite = rapportData.tauxPonctualite || 100;

      // Layout: 3 colonnes x 2 lignes
      const statCol1 = 40;
      const statCol2 = 230;
      const statCol3 = 390;
      
      // Ligne 1
      doc.fontSize(8).fillColor(LIGHT_GRAY).font('Helvetica').text('Jours travailles', statCol1, statsY);
      doc.fontSize(16).fillColor(DARK).font('Helvetica-Bold').text(joursTravailles.toString(), statCol1, statsY + 12);

      doc.fontSize(8).fillColor(LIGHT_GRAY).text('Absences justifiees', statCol2, statsY);
      doc.fontSize(16).fillColor(DARK).text(absJust.toString(), statCol2, statsY + 12);

      doc.fontSize(8).fillColor(LIGHT_GRAY).text('Absences injustifiees', statCol3, statsY);
      doc.fontSize(16).fillColor(PRIMARY).text(absInjust.toString(), statCol3, statsY + 12);

      // Ligne 2
      const statsY2 = statsY + 50;
      doc.fontSize(8).fillColor(LIGHT_GRAY).text('Retards', statCol1, statsY2);
      doc.fontSize(16).fillColor(DARK).text(retards.toString(), statCol1, statsY2 + 12);

      doc.fontSize(8).fillColor(LIGHT_GRAY).text('Moyenne h/jour', statCol2, statsY2);
      doc.fontSize(16).fillColor(DARK).text(moyHeures + 'h', statCol2, statsY2 + 12);

      doc.fontSize(8).fillColor(LIGHT_GRAY).text('Ponctualite', statCol3, statsY2);
      doc.fontSize(16).fillColor(DARK).text(tauxPonctualite.toFixed(0) + '%', statCol3, statsY2 + 12);

      // === TABLEAU COMPACT (limité pour tenir sur 1 page) ===
      const tableY = statsY2 + 60;
      
      doc.moveTo(40, tableY - 8).lineTo(555, tableY - 8).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text('Detail des journees', 40, tableY);

      if (rapportData.heuresParJour && rapportData.heuresParJour.length > 0) {
        const tableTop = tableY + 20;
        const colWidths = [95, 80, 80, 70, 90];
        const colX = [40, 135, 215, 295, 365];
        const headers = ['Date', 'Prevues', 'Reelles', 'Ecart', 'Statut'];
        
        // En-tête tableau (fond gris léger)
        doc.rect(40, tableTop, 415, 18).fill('#f9fafb');
        headers.forEach((header, i) => {
          doc.fontSize(7).fillColor(GRAY).font('Helvetica-Bold').text(
            header, 
            colX[i] + 5, 
            tableTop + 5, 
            { width: colWidths[i] - 10, align: i === 0 ? 'left' : 'center' }
          );
        });

        // Lignes (limiter à 14 lignes max pour tenir sur 1 page)
        let rowY = tableTop + 18;
        const maxRows = Math.min(14, rapportData.heuresParJour.length);
        const joursLimites = rapportData.heuresParJour.slice(0, maxRows);
        
        joursLimites.forEach((jour, index) => {
          const prevues = jour.prevues || 0;
          const travaillees = jour.travaillees || 0;
          const ecart = travaillees - prevues;
          
          // Ligne fine de séparation
          doc.moveTo(40, rowY).lineTo(455, rowY).strokeColor('#f3f4f6').lineWidth(0.5).stroke();
          
          // Date
          doc.fontSize(8).fillColor(DARK).font('Helvetica').text(
            new Date(jour.jour).toLocaleDateString('fr-FR'), 
            colX[0] + 5, 
            rowY + 5, 
            { width: colWidths[0] - 10 }
          );
          
          // Prévues
          doc.fillColor(GRAY).text(
            prevues.toFixed(1), 
            colX[1] + 5, 
            rowY + 5, 
            { width: colWidths[1] - 10, align: 'center' }
          );
          
          // Travaillées
          doc.fillColor(DARK).font('Helvetica-Bold').text(
            travaillees.toFixed(1), 
            colX[2] + 5, 
            rowY + 5, 
            { width: colWidths[2] - 10, align: 'center' }
          );
          
          // Écart
          const ecartColor = ecart > 0 ? '#10b981' : ecart < 0 ? PRIMARY : GRAY;
          doc.fillColor(ecartColor).font('Helvetica-Bold').text(
            (ecart >= 0 ? '+' : '') + ecart.toFixed(1), 
            colX[3] + 5, 
            rowY + 5, 
            { width: colWidths[3] - 10, align: 'center' }
          );
          
          // Statut
          const statut = jour.type === 'absence' ? 'Absent' : 'Present';
          doc.fontSize(7).fillColor(statut === 'Present' ? GRAY : PRIMARY).font('Helvetica').text(
            statut, 
            colX[4] + 5, 
            rowY + 5, 
            { width: colWidths[4] - 10, align: 'center' }
          );
          
          rowY += 16;
        });

        // Note si plus de jours
        if (rapportData.heuresParJour.length > maxRows) {
          doc.fontSize(7).fillColor(LIGHT_GRAY).font('Helvetica-Oblique').text(
            `+ ${rapportData.heuresParJour.length - maxRows} jours supplementaires`,
            40, rowY + 3
          );
        }
      }

      // === PIED DE PAGE MINIMALISTE ===
      doc.fontSize(7).fillColor(LIGHT_GRAY).font('Helvetica').text(
        `Genere le ${new Date().toLocaleDateString('fr-FR')}`,
        40, 
        doc.page.height - 30, 
        { align: 'center', width: 515 }
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

  const palette = {
    primary: 'FFCF292C',
    dark: 'FF1F2937',
    gray: 'FF6B7280',
    lightGray: 'FFF3F4F6',
    soft: 'FFFAFAFA'
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

  // TITRE
  hrSheet.mergeCells('A1:I1');
  const titleCell = hrSheet.getCell('A1');
  titleCell.value = 'RAPPORT MENSUEL - HEURES & ABSENCES';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.primary } };
  hrSheet.getRow(1).height = 36;

  // PÉRIODE
  hrSheet.mergeCells('A2:I2');
  const periodeCell = hrSheet.getCell('A2');
  periodeCell.value = `Période: ${dateDebut.toLocaleDateString('fr-FR')} au ${dateFin.toLocaleDateString('fr-FR')}`;
  periodeCell.font = { size: 11, bold: true, color: { argb: palette.dark } };
  periodeCell.alignment = { vertical: 'middle', horizontal: 'center' };
  hrSheet.getRow(2).height = 24;

  // RÉSUMÉ (ligne 3)
  hrSheet.addRow([]);
  const summaryRow = hrSheet.addRow([
    `${computedEmployes.length} employés`,
    `${totals.heuresTravaillees.toFixed(0)}h travaillées`,
    `${totals.cp} jours CP`,
    `${totals.rtt} jours RTT`,
    `${totals.maladie} jours maladie`,
    totals.absInjustifiees > 0 ? `${totals.absInjustifiees} abs. injust.` : 'Aucune absence injustifiée',
    'À compléter',
    'Justificatifs requis',
    `Édité le ${new Date().toLocaleDateString('fr-FR')}`
  ]);
  summaryRow.font = { size: 9, color: { argb: palette.gray }, italic: true };
  summaryRow.alignment = { vertical: 'middle', horizontal: 'center' };
  summaryRow.height = 20;
  summaryRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
  });

  // EN-TÊTES
  const headerRow = hrSheet.addRow([
    'NOM & PRÉNOM',
    'HEURES\nTRAVAILLÉES',
    'CONGÉS PAYÉS\n(jours + dates)',
    'RTT\n(jours + dates)',
    'ARRÊT MALADIE\n(jours + dates)',
    'ABSENCES NON\nJUSTIFIÉES',
    'NAVIGO\n(Oui/Non)',
    'JUSTIFICATIF\nNAVIGO',
    'OBSERVATIONS'
  ]);
  headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.dark } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 40;
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'medium', color: { argb: palette.dark } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };
  });

  const columnWidths = [28, 14, 32, 32, 32, 32, 12, 25, 25];
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
    if (emp.justificatifNavigo && emp.eligibleNavigo) {
      if (emp.pjNumber) {
        // Mode ZIP: utiliser le numéro pré-attribué
        justificatifText = `PJ${emp.pjNumber}`;
      } else {
        // Mode standalone: calculer le numéro
        const justifIndex = computedEmployes
          .slice(0, index + 1)
          .filter(e => e.justificatifNavigo && e.eligibleNavigo)
          .length;
        justificatifText = `PJ${justifIndex}`;
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

    row.height = 32;
    row.font = { size: 10 };

    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.soft } };
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFF3F4F6' } },
        left: { style: 'thin', color: { argb: 'FFF3F4F6' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Nom à gauche en gras
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(1).font = { size: 10, bold: true, color: { argb: palette.dark } };
    
    // Heures en gras et centré
    row.getCell(2).font = { size: 12, bold: true, color: { argb: palette.primary } };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    // Bordure gauche renforcée pour séparer nom/heures des absences
    row.getCell(3).border = {
      ...row.getCell(3).border,
      left: { style: 'medium', color: { argb: 'FFD1D5DB' } }
    };

    // Mettre en évidence les absences injustifiées
    if ((emp.absencesInjustifiees || 0) > 0) {
      row.getCell(6).font = { bold: true, size: 10, color: { argb: 'FFDC2626' } };
      row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
    }

    // Mettre en évidence la maladie si > 3 jours
    if (emp.joursMaladie > 3) {
      row.getCell(5).font = { bold: true, color: { argb: 'FFEA580C' } };
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    }

    // Colonne NAVIGO - fond jaune si éligible
    const navigoCell = row.getCell(7);
    if (emp.eligibleNavigo) {
      navigoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA7F3D0' } };
      navigoCell.font = { size: 10, bold: true, color: { argb: 'FF065F46' } };
    } else {
      navigoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      navigoCell.font = { size: 10, color: { argb: palette.gray } };
    }
    navigoCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Colonne JUSTIFICATIF - lien cliquable ou vide
    const justifCell = row.getCell(8);
    if (emp.justificatifNavigo) {
      justifCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      justifCell.font = { size: 10, bold: true, color: { argb: 'FF2563EB' }, underline: true };
    } else {
      justifCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      justifCell.font = { size: 9, italic: true, color: { argb: 'FF9CA3AF' } };
    }
    justifCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // OBSERVATIONS - fond blanc, prêt pour notes manuscrites
    row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(9).border = {
      ...row.getCell(9).border,
      left: { style: 'medium', color: { argb: 'FFD1D5DB' } }
    };
  });

  // Ligne vide avant totaux
  hrSheet.addRow([]);

  // LIGNE DE TOTAUX
  const totalRow = hrSheet.addRow([
    `TOTAUX - ${computedEmployes.length} EMPLOYÉS`,
    totals.heuresTravaillees.toFixed(0) + ' h',
    `${totals.cp} jours`,
    `${totals.rtt} jours`,
    `${totals.maladie} jours`,
    totals.absInjustifiees > 0 ? `${totals.absInjustifiees} jours` : '-',
    '',
    '',
    totals.absInjustifiees > 0 ? '⚠️ Retenues salaire à prévoir' : ''
  ]);

  totalRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.primary } };
  totalRow.height = 36;
  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium', color: { argb: palette.dark } },
      bottom: { style: 'medium', color: { argb: palette.dark } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  totalRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };

  // NOTE DE BAS DE PAGE
  hrSheet.addRow([]);
  const noteRow = hrSheet.addRow([
    '✅ Les justificatifs Navigo sont gérés via l\'interface web. Cliquez sur les liens bleus "📎 Voir justificatif" pour ouvrir les documents.',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);
  hrSheet.mergeCells(`A${noteRow.number}:I${noteRow.number}`);
  noteRow.getCell(1).font = { size: 10, italic: false, color: { argb: 'FFFFFFFF' }, bold: true };
  noteRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  noteRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  noteRow.height = 36;
  
  // Instructions
  hrSheet.addRow([]);
  const instructionsRow = hrSheet.addRow([
    '📋 INSTRUCTIONS : Les cellules vertes = justificatif déjà uploadé (cliquer sur le lien). Pour ajouter/modifier un justificatif : utiliser la page "Justificatifs Navigo" de l\'application web.',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);
  hrSheet.mergeCells(`A${instructionsRow.number}:I${instructionsRow.number}`);
  instructionsRow.getCell(1).font = { size: 9, italic: true, color: { argb: palette.dark }, bold: true };
  instructionsRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  instructionsRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  instructionsRow.height = 32;

  hrSheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: 9 }
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