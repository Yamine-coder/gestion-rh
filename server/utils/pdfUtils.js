// Génération de PDF avec pièces jointes pour les rapports d'heures
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLib, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Génère un PDF avec tableau des heures et pièces jointes Navigo
 */
async function generateRapportPDF(rapportsEmployes, periode, dateDebut, dateFin) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le document PDF de base
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Rapport Heures - ${periode}`,
          Author: 'Système RH',
          Subject: 'Rapport mensuel des heures et absences',
          Creator: 'Gestion RH App'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(20)
         .fillColor('#cf292c')
         .text('RAPPORT MENSUEL - HEURES & ABSENCES', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(12)
         .fillColor('#666')
         .text(`Période: ${formatPeriod(dateDebut, dateFin)}`, { align: 'center' });
      
      doc.moveDown(1);
      
      // Ligne de séparation
      doc.strokeColor('#cf292c')
         .lineWidth(2)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();

      doc.moveDown(1);

      // Infos générales
      const totalEmployes = rapportsEmployes.length;
      const totalHeures = rapportsEmployes.reduce((sum, emp) => sum + (emp.heuresTravaillees || 0), 0);
      
      doc.fontSize(10)
         .fillColor('#333')
         .text(`${totalEmployes} employés • ${totalHeures.toFixed(1)} heures totales`, { align: 'center' });

      doc.moveDown(1.5);

      // Tableau - En-têtes (largeurs optimisées pour A4)
      const startY = doc.y;
      const colWidths = {
        nom: 100,
        heures: 45,
        conges: 50,
        rtt: 40,
        maladie: 50,
        injustif: 50,
        navigo: 40,
        justif: 60
      };
      
      // Total: 435px (A4 width = 595 - margins 100 = 495 available)

      const headers = [
        { text: 'NOM & PRÉNOM', width: colWidths.nom },
        { text: 'HEURES', width: colWidths.heures },
        { text: 'CONGÉS', width: colWidths.conges },
        { text: 'RTT', width: colWidths.rtt },
        { text: 'MALADIE', width: colWidths.maladie },
        { text: 'ABS. INJ.', width: colWidths.injustif },
        { text: 'NAVIGO', width: colWidths.navigo },
        { text: 'JUSTIF.', width: colWidths.justif }
      ];

      // Dessiner en-têtes
      let xPos = 50;
      doc.fontSize(8)
         .fillColor('white');

      // Fond des en-têtes
      const totalWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);
      doc.rect(50, startY - 5, totalWidth, 20)
         .fill('#2c3e50');

      xPos = 50;
      headers.forEach(header => {
        doc.fillColor('white')
           .text(header.text, xPos + 5, startY, { 
             width: header.width - 10, 
             align: 'center' 
           });
        xPos += header.width;
      });

      doc.moveDown(2);

      // Compteur pour les pièces jointes
      let attachmentCount = 0;
      const attachments = [];

      // Lignes des employés
      rapportsEmployes.forEach((emp, index) => {
        const yPos = doc.y;
        
        // Vérifier si on doit ajouter une nouvelle page
        if (yPos > 700) {
          doc.addPage();
          doc.y = 50;
        }

        // Fond alterné
        const totalWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);
        if (index % 2 === 0) {
          doc.rect(50, doc.y - 2, totalWidth, 25)
             .fill('#f9fafb');
        }

        xPos = 50;
        doc.fontSize(8)
           .fillColor('#333');

        // Nom
        doc.text(`${emp.nom.toUpperCase()} ${emp.prenom}`, xPos + 5, doc.y, {
          width: colWidths.nom - 10,
          ellipsis: true
        });
        xPos += colWidths.nom;

        // Heures
        const heuresY = doc.y;
        doc.fillColor('#cf292c')
           .font('Helvetica-Bold')
           .text(`${(emp.heuresTravaillees || 0).toFixed(1)}h`, xPos + 5, heuresY, {
             width: colWidths.heures - 10,
             align: 'center'
           });
        doc.font('Helvetica');
        xPos += colWidths.heures;

        // Congés
        doc.fillColor('#333')
           .text(emp.joursCP > 0 ? `${emp.joursCP}j` : '-', xPos + 5, heuresY, {
             width: colWidths.conges - 10,
             align: 'center'
           });
        xPos += colWidths.conges;

        // RTT
        doc.text(emp.joursRTT > 0 ? `${emp.joursRTT}j` : '-', xPos + 5, heuresY, {
          width: colWidths.rtt - 10,
          align: 'center'
        });
        xPos += colWidths.rtt;

        // Maladie
        const maladieColor = emp.joursMaladie > 3 ? '#ea580c' : '#333';
        doc.fillColor(maladieColor)
           .text(emp.joursMaladie > 0 ? `${emp.joursMaladie}j` : '-', xPos + 5, heuresY, {
             width: colWidths.maladie - 10,
             align: 'center'
           });
        xPos += colWidths.maladie;

        // Absences injustifiées
        const injustifColor = (emp.absencesInjustifiees || 0) > 0 ? '#dc2626' : '#333';
        doc.fillColor(injustifColor)
           .text((emp.absencesInjustifiees || 0) > 0 ? `${emp.absencesInjustifiees}j` : '-', xPos + 5, heuresY, {
             width: colWidths.injustif - 10,
             align: 'center'
           });
        xPos += colWidths.injustif;

        // Navigo
        const navigoText = emp.eligibleNavigo ? 'Oui' : '-';
        const navigoColor = emp.eligibleNavigo ? '#16a34a' : '#9ca3af';
        doc.fillColor(navigoColor)
           .text(navigoText, xPos + 5, heuresY, {
             width: colWidths.navigo - 10,
             align: 'center'
           });
        xPos += colWidths.navigo;

        // Justificatif Navigo avec lien vers pièce jointe
        if (emp.justificatifNavigo) {
          const filePath = path.join(__dirname, '..', emp.justificatifNavigo);
          
          if (fs.existsSync(filePath)) {
            attachmentCount++;
            const attachmentName = `Navigo_${emp.nom}_${emp.prenom}${path.extname(filePath)}`;
            
            // Ajouter la pièce jointe à la liste
            try {
              const fileData = fs.readFileSync(filePath);
              attachments.push({
                name: attachmentName,
                data: fileData
              });

              // Afficher le texte du lien avec numéro de pièce jointe
              const linkText = `PJ${attachmentCount}`;
              doc.fillColor('#2563eb')
                 .font('Helvetica-Bold')
                 .text(linkText, xPos + 5, heuresY, {
                   width: colWidths.justif - 10,
                   align: 'center',
                   underline: true,
                   continued: false
                 });
              
              // Stocker les coordonnées pour créer le lien plus tard
              attachments[attachments.length - 1].linkCoords = {
                x: xPos + 5,
                y: heuresY,
                width: colWidths.justif - 10,
                height: 12,
                pageIndex: Math.floor((yPos - 50) / 700) // Approximation de la page
              };
              
              doc.font('Helvetica');
            } catch (err) {
              console.error(`Erreur lecture fichier ${filePath}:`, err);
              doc.fillColor('#9ca3af')
                 .text('Erreur', xPos + 5, heuresY, {
                   width: colWidths.justif - 10,
                   align: 'center'
                 });
            }
          } else {
            doc.fillColor('#f59e0b')
               .text('Fichier ?', xPos + 5, heuresY, {
                 width: colWidths.justif - 10,
                 align: 'center'
               });
          }
        } else {
          doc.fillColor('#9ca3af')
             .text('-', xPos + 5, heuresY, {
               width: colWidths.justif - 10,
               align: 'center'
             });
        }

        doc.moveDown(1.5);
      });

      // Ligne de séparation avant footer
      doc.moveDown(1);
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();

      doc.moveDown(0.5);

      // Footer avec instructions
      doc.fontSize(10)
         .fillColor('#2563eb')
         .font('Helvetica-Bold')
         .text('📎 PIÈCES JOINTES NAVIGO', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(9)
         .fillColor('#333')
         .font('Helvetica')
         .text(
           `${attachmentCount} fichier(s) inclus comme pièces jointes dans ce PDF`,
           { align: 'center' }
         );

      doc.moveDown(0.8);
      doc.fontSize(8)
         .fillColor('#059669')
         .font('Helvetica-Bold')
         .text('✓ COMMENT ACCÉDER AUX JUSTIFICATIFS :', { align: 'center' });
      
      doc.moveDown(0.4);
      doc.fontSize(7.5)
         .fillColor('#4b5563')
         .font('Helvetica')
         .text('1. Dans votre lecteur PDF (Adobe Reader, Foxit, etc.)', { align: 'center' });
      
      doc.moveDown(0.3);
      doc.text('2. Cliquez sur l\'icône 📎 "Pièces jointes" dans le panneau latéral GAUCHE', { align: 'center' });
      
      doc.moveDown(0.3);
      doc.text('3. Double-cliquez sur le fichier pour l\'ouvrir', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(7)
         .fillColor('#9ca3af')
         .text('Nom des fichiers : Navigo_NOM_Prenom.jpg/pdf', { align: 'center' });

      // Finaliser le PDF de base
      doc.end();

      // Une fois le PDF de base créé, ajouter les pièces jointes avec pdf-lib
      doc.on('end', async () => {
        try {
          const basePdfBuffer = Buffer.concat(chunks);
          
          if (attachments.length > 0) {
            console.log(`📎 Embarquement de ${attachments.length} pièce(s) jointe(s)...`);
            
            // Charger le PDF avec pdf-lib
            const pdfDoc = await PDFLib.load(basePdfBuffer);
            
            // Ajouter chaque pièce jointe et créer un lien cliquable
            for (let i = 0; i < attachments.length; i++) {
              const attachment = attachments[i];
              
              // Embarquer le fichier comme pièce jointe
              await pdfDoc.attach(attachment.data, attachment.name, {
                mimeType: getMimeType(attachment.name),
                description: `Justificatif Navigo - ${attachment.name}`,
                creationDate: new Date(),
                modificationDate: new Date()
              });
              
              // Note: pdf-lib ne supporte pas nativement les liens vers les pièces jointes
              // Les fichiers sont embarqués et accessibles via le panneau "Pièces jointes"
              // du lecteur PDF (Adobe Reader, Foxit, etc.)
            }
            
            // Sauvegarder le PDF avec les pièces jointes
            const finalPdfBytes = await pdfDoc.save();
            console.log(`✅ PDF finalisé avec ${attachments.length} pièce(s) jointe(s)`);
            resolve(Buffer.from(finalPdfBytes));
          } else {
            // Pas de pièces jointes, retourner le PDF de base
            resolve(basePdfBuffer);
          }
        } catch (error) {
          console.error('❌ Erreur lors de l\'embarquement des pièces jointes:', error);
          // En cas d'erreur, retourner le PDF de base sans pièces jointes
          resolve(Buffer.concat(chunks));
        }
      });

    } catch (error) {
      reject(error);
    }
  });
}

function formatPeriod(debut, fin) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return `${new Date(debut).toLocaleDateString('fr-FR', options)} au ${new Date(fin).toLocaleDateString('fr-FR', options)}`;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = { generateRapportPDF };
