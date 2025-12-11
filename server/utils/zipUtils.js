// Génération d'un ZIP contenant le rapport PDF + justificatifs Navigo
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { generateRapportPDF } = require('./pdfUtils');
const { getCurrentDateString } = require('./dateUtils');

/**
 * Génère un fichier ZIP avec :
 * - Le rapport PDF
 * - Les justificatifs Navigo dans un dossier séparé
 * - Un fichier INDEX.txt avec la correspondance
 */
async function generateRapportZIP(rapportsEmployes, periode, dateDebut, dateFin) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer l'archive ZIP
      const archive = archiver('zip', {
        zlib: { level: 9 } // Compression maximale
      });

      const chunks = [];
      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // 1. Générer le PDF du rapport
      console.log('📄 Génération du PDF...');
      const pdfBuffer = await generateRapportPDF(rapportsEmployes, periode, dateDebut, dateFin);
      
      const dateStr = getCurrentDateString();
      const pdfFileName = `Rapport_Heures_${periode}_${dateStr}.pdf`;
      archive.append(pdfBuffer, { name: pdfFileName });

      // 2. Créer un fichier INDEX avec la correspondance
      let indexContent = '═══════════════════════════════════════════════════════════\n';
      indexContent += '  RAPPORT MENSUEL - HEURES & ABSENCES\n';
      indexContent += `  Période: ${formatPeriod(dateDebut, dateFin)}\n`;
      indexContent += '═══════════════════════════════════════════════════════════\n\n';
      indexContent += '📎 JUSTIFICATIFS NAVIGO INCLUS\n\n';
      indexContent += 'Correspondance Employé → Fichier justificatif :\n\n';

      let justifCount = 0;

      // 3. Ajouter chaque justificatif Navigo au ZIP
      rapportsEmployes.forEach((emp, index) => {
        if (emp.justificatifNavigo) {
          const filePath = path.join(__dirname, '..', emp.justificatifNavigo);
          
          if (fs.existsSync(filePath)) {
            justifCount++;
            const extension = path.extname(filePath);
            const newFileName = `Navigo_${emp.nom}_${emp.prenom}${extension}`;
            
            // Ajouter le fichier dans un sous-dossier
            archive.file(filePath, { 
              name: `Justificatifs_Navigo/${newFileName}` 
            });

            // Ajouter à l'index
            indexContent += `  ${justifCount}. ${emp.nom.toUpperCase()} ${emp.prenom}\n`;
            indexContent += `     → Justificatifs_Navigo/${newFileName}\n`;
            indexContent += `     Éligible Navigo: ${emp.eligibleNavigo ? 'OUI' : 'NON'}\n\n`;
          }
        }
      });

      if (justifCount === 0) {
        indexContent += '  Aucun justificatif Navigo trouvé.\n';
      }

      indexContent += '\n═══════════════════════════════════════════════════════════\n';
      indexContent += `Total: ${justifCount} justificatif(s) inclus\n`;
      indexContent += '═══════════════════════════════════════════════════════════\n\n';
      indexContent += 'INSTRUCTIONS :\n';
      indexContent += '1. Ouvrez le PDF pour consulter le rapport complet\n';
      indexContent += '2. Consultez les justificatifs dans le dossier "Justificatifs_Navigo"\n';
      indexContent += '3. Utilisez ce fichier INDEX pour trouver rapidement les documents\n\n';
      indexContent += 'Généré le : ' + new Date().toLocaleString('fr-FR') + '\n';

      archive.append(indexContent, { name: 'LIRE_MOI.txt' });

      console.log(`✅ ZIP créé avec ${justifCount} justificatif(s)`);

      // Finaliser l'archive
      archive.finalize();

    } catch (error) {
      reject(error);
    }
  });
}

function formatPeriod(debut, fin) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return `${new Date(debut).toLocaleDateString('fr-FR', options)} au ${new Date(fin).toLocaleDateString('fr-FR', options)}`;
}

module.exports = { generateRapportZIP };
