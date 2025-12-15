// Génération d'un ZIP contenant le rapport Excel + justificatifs Navigo
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { generateAllEmployeesExcel } = require('./exportUtils');
const { getCurrentDateString } = require('./dateUtils');

/**
 * Génère un fichier ZIP avec :
 * - Le rapport Excel
 * - Les justificatifs Navigo dans un dossier séparé
 * - Un fichier INDEX.txt avec la correspondance
 */
async function generateRapportExcelZIP(rapportsEmployes, periode, dateDebut, dateFin) {
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

      // 1. Enrichir les données avec les numéros PJ pour l'Excel
      console.log('📊 Attribution des numéros PJ...');
      let pjCounter = 0;
      const enrichedEmployes = rapportsEmployes.map(emp => {
        // Priorité : justificatif mensuel validé (nouveau système) > justificatif simple (ancien)
        const justifMensuel = emp.justificatifsNavigo?.[0]; // Le premier (il n'y en a qu'un par mois)
        const fichierNavigo = justifMensuel?.fichier || emp.justificatifNavigo;
        
        // Inclure si : justificatif mensuel validé OU ancien système avec eligibleNavigo
        const hasJustifMensuel = justifMensuel?.fichier;
        const hasOldJustif = emp.justificatifNavigo && emp.eligibleNavigo;
        
        if (fichierNavigo && (hasJustifMensuel || hasOldJustif)) {
          pjCounter++;
          console.log(`   ✅ PJ${pjCounter}: ${emp.nom} ${emp.prenom} - ${fichierNavigo}`);
          return { 
            ...emp, 
            pjNumber: pjCounter,
            fichierNavigo: fichierNavigo, // Chemin du fichier à utiliser
            dateUploadNavigo: justifMensuel?.dateUpload || null
          };
        }
        return emp;
      });

      // 2. Générer l'Excel du rapport avec les numéros PJ
      console.log('📊 Génération de l\'Excel...');
      const excelBuffer = await generateAllEmployeesExcel(enrichedEmployes, periode, dateDebut, dateFin);
      
      // Créer un timestamp précis pour les noms de fichiers
      const now = new Date();
      const dateStr = getCurrentDateString(); // 2025-12-01
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, 'h'); // 14h30h45
      const timestamp = `${dateStr}_${timeStr}`;
      
      // Format des dates de période pour le nom de fichier
      const dateDebutStr = new Date(dateDebut).toLocaleDateString('fr-FR').replace(/\//g, '-'); // 01-11-2025
      const dateFinStr = new Date(dateFin).toLocaleDateString('fr-FR').replace(/\//g, '-'); // 30-11-2025
      
      const excelFileName = `Rapport_Heures_${periode}_du_${dateDebutStr}_au_${dateFinStr}_genere_le_${timestamp}.xlsx`;
      archive.append(excelBuffer, { name: excelFileName });

      // 3. Créer un fichier INDEX avec la correspondance et dates précises
      let indexContent = '═══════════════════════════════════════════════════════════\n';
      indexContent += '  RAPPORT MENSUEL - HEURES & ABSENCES + NAVIGO\n';
      indexContent += `  Période: ${formatPeriod(dateDebut, dateFin)}\n`;
      indexContent += `  Date de génération: ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}\n`;
      indexContent += `  Généré par: Système de Gestion RH\n`;
      indexContent += '═══════════════════════════════════════════════════════════\n\n';
      indexContent += '📋 CONTENU DU ZIP :\n\n';
      indexContent += `  1. ${excelFileName}\n`;
      indexContent += '     → Tableau Excel avec toutes les heures et absences\n';
      indexContent += '     → Colonne NAVIGO : Oui/Non pour chaque employé\n';
      indexContent += '     → Colonne JUSTIFICATIF NAVIGO : Référence aux fichiers\n\n';
      indexContent += '  2. Justificatifs_Navigo/\n';
      indexContent += '     → Tous les justificatifs des employés éligibles\n\n';
      indexContent += '═══════════════════════════════════════════════════════════\n\n';
      let justifCount = 0;

      // 4. Ajouter chaque justificatif Navigo au ZIP (utiliser fichierNavigo enrichi)
      enrichedEmployes.forEach((emp, index) => {
        // Si l'employé a un numéro PJ, c'est qu'il a un justificatif à inclure
        if (emp.fichierNavigo && emp.pjNumber) {
          const filePath = path.join(__dirname, '..', emp.fichierNavigo);
          
          if (fs.existsSync(filePath)) {
            justifCount++;
            const extension = path.extname(filePath);
            const stats = fs.statSync(filePath);
            const fileSize = (stats.size / 1024).toFixed(2); // Taille en Ko
            // Utiliser la date d'upload du justificatif si dispo, sinon date du fichier
            const dateUpload = emp.dateUploadNavigo 
              ? new Date(emp.dateUploadNavigo).toLocaleDateString('fr-FR')
              : stats.mtime.toLocaleDateString('fr-FR');
            
            const newFileName = `PJ${emp.pjNumber}_${emp.nom}_${emp.prenom}${extension}`;
            
            // Ajouter le fichier dans un sous-dossier daté
            archive.file(filePath, { 
              name: `Justificatifs_Navigo_${dateDebutStr}_au_${dateFinStr}/${newFileName}` 
            });

            // Ajouter à l'index avec plus de détails
            indexContent += `  PJ${emp.pjNumber}. ${emp.nom.toUpperCase()} ${emp.prenom}\n`;
            indexContent += `       Fichier: Justificatifs_Navigo_${dateDebutStr}_au_${dateFinStr}/${newFileName}\n`;
            indexContent += `       Référence Excel: PJ${emp.pjNumber}\n`;
            indexContent += `       Taille: ${fileSize} Ko | Uploadé le: ${dateUpload}\n\n`;
          } else {
            console.warn(`⚠️ Fichier Navigo introuvable: ${filePath} pour ${emp.nom} ${emp.prenom}`);
          }
        }
      });

      indexContent += '\n═══════════════════════════════════════════════════════════\n';
      indexContent += `📊 RÉSUMÉ :\n`;
      indexContent += `   Total: ${justifCount} justificatif(s) inclus\n`;
      indexContent += `   Période couverte: du ${dateDebutStr} au ${dateFinStr}\n`;
      indexContent += `   Date et heure de génération: ${now.toLocaleString('fr-FR')}\n`;
      indexContent += '═══════════════════════════════════════════════════════════\n\n';
      indexContent += '📖 INSTRUCTIONS D\'UTILISATION :\n\n';
      indexContent += '1. Ouvrez le fichier Excel pour consulter le rapport complet\n';
      indexContent += '2. Dans la colonne "JUSTIFICATIF NAVIGO", vous verrez "PJ1", "PJ2", etc.\n';
      indexContent += `3. Pour voir un justificatif, ouvrez le dossier:\n`;
      indexContent += `   "Justificatifs_Navigo_${dateDebutStr}_au_${dateFinStr}"\n`;
      indexContent += '4. Cherchez le fichier correspondant à la référence PJ\n';
      indexContent += '   (ex: PJ1 → PJ1_Bernard_Sarah.jpg)\n\n';
      indexContent += '💡 NOTE:\n';
      indexContent += '   - Les employés non éligibles Navigo ont une cellule vide\n';
      indexContent += '   - Les employés éligibles sans justificatif n\'ont pas de PJ\n\n';

      archive.append(indexContent, { name: 'LIRE_MOI.txt' });

      console.log(`✅ ZIP créé avec Excel + ${justifCount} justificatif(s)`);

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

module.exports = { generateRapportExcelZIP };
