const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

async function generateAllEmployeesExcel(rapportsEmployes, periode, dateDebut, dateFin) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Systeme RH Restaurant';
  workbook.created = new Date();

  // === FEUILLE PRINCIPALE : RAPPORT SIMPLIFIÉ ===
  const sheet = workbook.addWorksheet('Rapport Détaillé', {
    properties: { tabColor: { argb: 'FF5B6B7F' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });

  // Titre principal
  sheet.mergeCells('A1:O1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'RAPPORT COMPLET - DONNÉES DÉTAILLÉES';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B6B7F' } };
  sheet.getRow(1).height = 32;

  // Sous-titre période
  sheet.mergeCells('A2:O2');
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = `${dateDebut.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${dateFin.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} • ${periode}`;
  subtitleCell.font = { size: 10, color: { argb: 'FF6B7280' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // En-têtes colonnes
  const headerRow = sheet.addRow([
    'Email',
    'Rôle',
    'H. Prévues',
    'H. Travaillées',
    'H. Supp.',
    'H. Manquantes',
    'Abs. Justif.',
    'Abs. Injust.',
    'Retards (j)',
    'J. Planif.',
    'J. Présents',
    'Taux Présence',
    'Taux Ponctualité',
    'Moy. h/j',
    'Observations'
  ]);
  headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B6B7F' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF5B6B7F' } }
    };
  });

  // Pré-calculs
  const computedEmployes = rapportsEmployes.map(emp => {
    const heuresPrevues = emp.heuresPrevues || 0;
    const heuresTravaillees = emp.heuresTravaillees || 0;
    const heuresSupp = emp.heuresSupplementaires || 0;
    const heuresManquantes = Math.max(0, heuresPrevues - heuresTravaillees);
    const absJustifiees = emp.absencesJustifiees || 0;
    const absInjustifiees = emp.absencesInjustifiees || 0;
    const retards = emp.nombreRetards || 0;
    const joursPlanif = emp.joursPlanifies || 0;
    const joursPresents = emp.joursPresents || 0;
    const tauxPresence = emp.tauxPresence || 0;
    const tauxPonctualite = emp.tauxPonctualite || 100;
    const moyHeuresJour = emp.moyenneHeuresJour || 0;

    const observations = [];
    if (heuresManquantes > 0) observations.push(`${heuresManquantes.toFixed(1)}h manq.`);
    if (absInjustifiees > 0) observations.push(`${absInjustifiees} abs. inj.`);
    if (retards > 0) observations.push(`${retards}j retard`);
    
    return {
      ...emp,
      heuresPrevues,
      heuresTravaillees,
      heuresSupp,
      heuresManquantes,
      absJustifiees,
      absInjustifiees,
      retards,
      joursPlanif,
      joursPresents,
      tauxPresence,
      tauxPonctualite,
      moyHeuresJour,
      observationsText: observations.length ? observations.join(' | ') : ''
    };
  });

  // Données employés
  computedEmployes.forEach((emp, index) => {
    const row = sheet.addRow([
      emp.email || '',
      emp.role || '',
      emp.heuresPrevues,
      emp.heuresTravaillees,
      emp.heuresSupp,
      emp.heuresManquantes,
      emp.absJustifiees,
      emp.absInjustifiees,
      emp.retards,
      emp.joursPlanif,
      emp.joursPresents,
      emp.tauxPresence / 100,
      emp.tauxPonctualite / 100,
      emp.moyHeuresJour,
      emp.observationsText
    ]);

    row.font = { size: 10 };
    row.height = 24;

    // Alternance de couleurs
    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Alignement texte à gauche
    [1, 2, 15].forEach(col => {
      row.getCell(col).alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // Format nombres
    [3, 4, 5, 6, 14].forEach(col => row.getCell(col).numFmt = '#,##0.0');
    [12, 13].forEach(col => row.getCell(col).numFmt = '0%');

    // Colorations conditionnelles
    if (emp.heuresManquantes > 0) {
      row.getCell(6).font = { bold: true, color: { argb: 'FFDC2626' } };
    }

    if (emp.absInjustifiees > 0) {
      row.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' } };
      row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
    }

    if (emp.tauxPresence < 100 && emp.tauxPresence > 0) {
      row.getCell(12).font = { bold: true, color: { argb: 'FFDC2626' } };
    }

    if (emp.tauxPonctualite < 100) {
      row.getCell(13).font = { color: { argb: 'FFEA580C' } };
    }
  });

  // Ligne séparation
  sheet.addRow([]);

  // Totaux
  const totalHeuresPrevues = computedEmployes.reduce((s, e) => s + e.heuresPrevues, 0);
  const totalHeuresTravaillees = computedEmployes.reduce((s, e) => s + e.heuresTravaillees, 0);
  const totalHeuresSupp = computedEmployes.reduce((s, e) => s + e.heuresSupp, 0);
  const totalHeuresManquantes = computedEmployes.reduce((s, e) => s + e.heuresManquantes, 0);
  const totalAbsJustifiees = computedEmployes.reduce((s, e) => s + e.absJustifiees, 0);
  const totalAbsInjustifiees = computedEmployes.reduce((s, e) => s + e.absInjustifiees, 0);
  const totalRetards = computedEmployes.reduce((s, e) => s + e.retards, 0);
  const totalJoursPlanif = computedEmployes.reduce((s, e) => s + e.joursPlanif, 0);
  const totalJoursPresents = computedEmployes.reduce((s, e) => s + e.joursPresents, 0);
  const moyTauxPresence = totalJoursPlanif > 0 ? totalJoursPresents / totalJoursPlanif : 0;
  const moyTauxPonctualite = totalJoursPresents > 0 ? (totalJoursPresents - totalRetards) / totalJoursPresents : 1;
  const moyHeuresJour = totalJoursPresents > 0 ? totalHeuresTravaillees / totalJoursPresents : 0;

  const totalRow = sheet.addRow([
    `${computedEmployes.length} employés`,
    '',
    totalHeuresPrevues,
    totalHeuresTravaillees,
    totalHeuresSupp,
    totalHeuresManquantes,
    totalAbsJustifiees,
    totalAbsInjustifiees,
    totalRetards,
    totalJoursPlanif,
    totalJoursPresents,
    moyTauxPresence,
    moyTauxPonctualite,
    moyHeuresJour,
    ''
  ]);

  totalRow.font = { bold: true, size: 11, color: { argb: 'FF1F2937' } };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  totalRow.height = 28;
  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF6B7280' } },
      bottom: { style: 'medium', color: { argb: 'FF6B7280' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  [3, 4, 5, 6, 14].forEach(col => totalRow.getCell(col).numFmt = '#,##0.0');
  [12, 13].forEach(col => totalRow.getCell(col).numFmt = '0%');

  // Largeurs colonnes
  sheet.columns = [
    { width: 30 },
    { width: 12 },
    { width: 12 },
    { width: 13 },
    { width: 11 },
    { width: 13 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 11 },
    { width: 12 },
    { width: 14 },
    { width: 15 },
    { width: 10 },
    { width: 30 }
  ];

  // Filtres automatiques
  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: 15 }
  };

  return await workbook.xlsx.writeBuffer();
}

module.exports = { generateAllEmployeesExcel };
