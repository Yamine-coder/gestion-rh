const prisma = require('../prisma/client');
const path = require('path');
const fs = require('fs');
const { generateSignedPdf } = require('../utils/signedPdfGenerator');
const { sendEmail } = require('../services/emailService');

const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Gabarit HTML simple et neutre pour les emails liés aux documents
function buildDocEmail({ titre, intro, ctaLabel, ctaUrl, footer }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <div style="background:#cf292c;border-radius:14px 14px 0 0;padding:20px 24px">
      <h1 style="margin:0;color:#fff;font-size:18px">Chez Antoine — RH</h1>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:24px">
      <p style="font-size:15px;line-height:1.5;margin:0 0 14px">${intro}</p>
      ${titre ? `<p style="font-size:15px;margin:0 0 18px"><strong>« ${titre} »</strong></p>` : ''}
      ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:#cf292c;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px">${ctaLabel}</a>` : ''}
      <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:22px 0 0">${footer || 'Connectez-vous à votre espace RH pour gérer vos documents.'}</p>
    </div>
  </div>`;
}

// Envoie (sans bloquer) un email à une liste de destinataires
function sendDocEmails(recipients, { subject, intro, ctaLabel, titre, footer }) {
  const ctaUrl = `${APP_URL}/employee/profil`;
  recipients
    .filter((r) => r && r.email)
    .forEach((r) => {
      sendEmail({
        to: r.email,
        subject,
        html: buildDocEmail({ titre, intro, ctaLabel, ctaUrl, footer }),
      }).catch((e) => console.error('[documents-rh] Envoi email échoué:', e?.message));
    });
}


// ============================================
// ADMIN: Créer un document
// ============================================
const createDocument = async (req, res) => {
  try {
    const { titre, description, contenu, type } = req.body;
    let { employeIds } = req.body;
    const createdById = req.userId;

    // employeIds peut arriver comme string JSON (FormData)
    if (typeof employeIds === 'string') {
      try { employeIds = JSON.parse(employeIds); } catch (e) { employeIds = []; }
    }

    // Emplacement de signature (optionnel, défini par l'admin)
    const allowedPositions = ['bottom-left', 'bottom-center', 'bottom-right'];
    const signaturePosition = allowedPositions.includes(req.body.signaturePosition)
      ? req.body.signaturePosition
      : 'bottom-right';
    const signaturePage = req.body.signaturePage ? Number(req.body.signaturePage) : null;

    // Placement manuel optionnel (éditeur visuel) : JSON {page,xPct,yPct,wPct,hPct}
    let signaturePlacement = null;
    if (req.body.signaturePlacement) {
      try {
        const raw = typeof req.body.signaturePlacement === 'string'
          ? JSON.parse(req.body.signaturePlacement)
          : req.body.signaturePlacement;
        if (raw && typeof raw === 'object'
          && typeof raw.xPct === 'number' && typeof raw.yPct === 'number'
          && typeof raw.wPct === 'number' && typeof raw.hPct === 'number') {
          signaturePlacement = JSON.stringify({
            page: Math.max(1, Math.round(Number(raw.page) || 1)),
            xPct: Math.min(1, Math.max(0, raw.xPct)),
            yPct: Math.min(1, Math.max(0, raw.yPct)),
            wPct: Math.min(1, Math.max(0.05, raw.wPct)),
            hPct: Math.min(1, Math.max(0.03, raw.hPct)),
          });
        }
      } catch (e) { signaturePlacement = null; }
    }

    // Champs DocuSign optionnels (éditeur multi-champs) : tableau de
    // {id,type,page,xPct,yPct,wPct,hPct,text?}. type: signature|initiales|mention|cachet
    let signatureChamps = null;
    if (req.body.signatureChamps) {
      try {
        const raw = typeof req.body.signatureChamps === 'string'
          ? JSON.parse(req.body.signatureChamps)
          : req.body.signatureChamps;
        const allowedTypes = ['signature', 'initiales', 'nom', 'date', 'mention', 'cachet', 'signature_employeur', 'paraphe_employeur'];
        if (Array.isArray(raw)) {
          const clean = raw
            .filter(f => f && typeof f === 'object' && allowedTypes.includes(f.type)
              && typeof f.xPct === 'number' && typeof f.yPct === 'number'
              && typeof f.wPct === 'number' && typeof f.hPct === 'number')
            .slice(0, 30)
            .map((f, i) => ({
              id: typeof f.id === 'string' ? f.id.substring(0, 40) : `c${i}`,
              type: f.type,
              page: Math.max(1, Math.round(Number(f.page) || 1)),
              xPct: Math.min(1, Math.max(0, f.xPct)),
              yPct: Math.min(1, Math.max(0, f.yPct)),
              wPct: Math.min(1, Math.max(0.03, f.wPct)),
              hPct: Math.min(1, Math.max(0.02, f.hPct)),
              ...(f.type === 'mention' && typeof f.text === 'string'
                ? { text: f.text.substring(0, 200) } : {}),
              ...(f.type === 'mention' && f.cover === true ? { cover: true } : {}),
              ...(f.type === 'mention' && f.bold === true ? { bold: true } : {}),
              ...(f.type === 'mention' && f.italic === true ? { italic: true } : {}),
              ...(f.type === 'mention' && typeof f.genFamily === 'string'
                ? { genFamily: f.genFamily.substring(0, 12) } : {}),
              ...(f.type === 'mention' && typeof f.fontHpct === 'number'
                ? { fontHpct: Math.min(0.2, Math.max(0.004, f.fontHpct)) } : {}),
            }));
          if (clean.length) signatureChamps = JSON.stringify(clean);
        }
      } catch (e) { signatureChamps = null; }
    }

    // Fichiers (multer.fields) : document principal + image de cachet + signature employeur
    const fichierFile = req.files?.fichier?.[0] || null;
    const cachetFile = req.files?.cachet?.[0] || null;
    const cachetUrl = cachetFile ? `/uploads/documents-rh/${cachetFile.filename}` : null;
    const signatureEmployeurFile = req.files?.signatureEmployeur?.[0] || null;
    const signatureEmployeurUrl = signatureEmployeurFile ? `/uploads/documents-rh/${signatureEmployeurFile.filename}` : null;
    const signatureEmployeurNom = typeof req.body.signatureEmployeurNom === 'string'
      ? req.body.signatureEmployeurNom.trim().substring(0, 120) || null
      : null;

    if (!titre || !titre.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }
    if (!contenu && !fichierFile) {
      return res.status(400).json({ error: 'Un contenu texte ou un fichier est requis' });
    }
    if (!Array.isArray(employeIds) || employeIds.length === 0) {
      return res.status(400).json({ error: 'Sélectionnez au moins un destinataire' });
    }

    const fichierUrl = fichierFile ? `/uploads/documents-rh/${fichierFile.filename}` : null;

    const document = await prisma.documentRH.create({
      data: {
        titre: titre.trim(),
        description: description?.trim() || null,
        contenu: contenu || null,
        fichierUrl,
        type: type || 'note',
        createdById,
        locked: true,
        signaturePosition,
        signaturePage: signaturePage && signaturePage >= 1 ? signaturePage : null,
        signaturePlacement,
        signatureChamps,
        cachetUrl,
        signatureEmployeurUrl,
        signatureEmployeurNom,
      }
    });

    // Créer les signatures pour chaque employé
    const signaturesData = employeIds.map(empId => ({
      documentId: document.id,
      employeId: Number(empId),
      statut: 'pending',
    }));

    await prisma.documentSignature.createMany({ data: signaturesData });

    // Créer une notification pour chaque employé
    const notificationsData = employeIds.map(empId => ({
      employe_id: Number(empId),
      type: 'document_a_signer',
      titre: 'Document à signer',
      message: `Nouveau document à signer : "${document.titre}"`,
      lue: false,
      date_creation: new Date(),
    }));

    await prisma.notifications.createMany({ data: notificationsData });

    // Email d'assignation (asynchrone, n'interrompt pas la réponse)
    try {
      const destinataires = await prisma.user.findMany({
        where: { id: { in: employeIds.map(Number) } },
        select: { email: true, prenom: true },
      });
      sendDocEmails(destinataires, {
        subject: `Document à signer : ${document.titre}`,
        titre: document.titre,
        intro: "Un nouveau document vous a été transmis et attend votre signature électronique.",
        ctaLabel: 'Consulter et signer',
      });
    } catch (mailErr) {
      console.error('[documents-rh] Préparation emails assignation échouée:', mailErr?.message);
    }

    const created = await prisma.documentRH.findUnique({
      where: { id: document.id },
      include: {
        signatures: { include: { employe: { select: { id: true, nom: true, prenom: true } } } },
        createdBy: { select: { id: true, nom: true, prenom: true } },
      }
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Erreur création document:', error);
    res.status(500).json({ error: 'Erreur lors de la création du document' });
  }
};

// ============================================
// ADMIN: Lister tous les documents
// ============================================
const getDocuments = async (req, res) => {
  try {
    const documents = await prisma.documentRH.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, nom: true, prenom: true } },
        signatures: {
          include: { employe: { select: { id: true, nom: true, prenom: true } } }
        }
      }
    });

    // Enrichir avec les stats
    const enriched = documents.map(doc => {
      const total = doc.signatures.length;
      const signed = doc.signatures.filter(s => s.statut === 'signed').length;
      const pending = doc.signatures.filter(s => s.statut === 'pending').length;
      const read = doc.signatures.filter(s => s.statut === 'read').length;
      const refused = doc.signatures.filter(s => s.statut === 'refused').length;
      return { ...doc, stats: { total, signed, pending, read, refused } };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Erreur liste documents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
  }
};

// ============================================
// ADMIN: Détail d'un document
// ============================================
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.documentRH.findUnique({
      where: { id: Number(id) },
      include: {
        createdBy: { select: { id: true, nom: true, prenom: true } },
        signatures: {
          include: { employe: { select: { id: true, nom: true, prenom: true, email: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!document) return res.status(404).json({ error: 'Document non trouvé' });

    const total = document.signatures.length;
    const signed = document.signatures.filter(s => s.statut === 'signed').length;
    const pending = document.signatures.filter(s => s.statut === 'pending').length;
    const read = document.signatures.filter(s => s.statut === 'read').length;
    const refused = document.signatures.filter(s => s.statut === 'refused').length;

    res.json({ ...document, stats: { total, signed, pending, read, refused } });
  } catch (error) {
    console.error('Erreur détail document:', error);
    res.status(500).json({ error: 'Erreur' });
  }
};

// ============================================
// ADMIN: Supprimer un document
// ============================================
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.documentRH.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression document:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

// ============================================
// ADMIN: Relancer un employé (remet en pending s'il a juste "lu")
// ============================================
const relancerSignature = async (req, res) => {
  try {
    const { id, signatureId } = req.params;
    const signature = await prisma.documentSignature.findFirst({
      where: { id: Number(signatureId), documentId: Number(id) },
      include: {
        document: { select: { titre: true } },
        employe: { select: { email: true, prenom: true } },
      }
    });
    if (!signature) return res.status(404).json({ error: 'Signature non trouvée' });

    // Créer notification de relance
    await prisma.notifications.create({
      data: {
        employe_id: signature.employeId,
        type: 'document_rappel',
        titre: 'Rappel signature',
        message: `Rappel : le document "${signature.document?.titre || ''}" attend votre signature`,
        lue: false,
        date_creation: new Date(),
      }
    });

    // Email de relance (asynchrone)
    if (signature.employe?.email) {
      sendDocEmails([signature.employe], {
        subject: `Rappel — Document à signer : ${signature.document?.titre || ''}`,
        titre: signature.document?.titre,
        intro: "Petit rappel : un document est toujours en attente de votre signature électronique.",
        ctaLabel: 'Signer maintenant',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur relance:', error);
    res.status(500).json({ error: 'Erreur' });
  }
};

// ============================================
// EMPLOYÉ: Mes documents à signer
// ============================================
const getMesDocuments = async (req, res) => {
  try {
    const userId = req.userId;
    const signatures = await prisma.documentSignature.findMany({
      where: { employeId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        document: {
          include: { createdBy: { select: { id: true, nom: true, prenom: true } } }
        }
      }
    });
    res.json(signatures);
  } catch (error) {
    console.error('Erreur mes documents:', error);
    res.status(500).json({ error: 'Erreur' });
  }
};

// ============================================
// EMPLOYÉ: Voir un document (marquer comme lu)
// ============================================
const voirDocument = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const signature = await prisma.documentSignature.findUnique({
      where: { documentId_employeId: { documentId: Number(id), employeId: userId } },
      include: { document: true }
    });

    if (!signature) return res.status(404).json({ error: 'Document non trouvé' });

    // Marquer comme lu si encore pending
    if (signature.statut === 'pending') {
      await prisma.documentSignature.update({
        where: { id: signature.id },
        data: { statut: 'read', readAt: new Date() }
      });
    }

    res.json(signature);
  } catch (error) {
    console.error('Erreur voir document:', error);
    res.status(500).json({ error: 'Erreur' });
  }
};

// ============================================
// EMPLOYÉ: Signer un document
// ============================================
const signerDocument = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { signatureData, consentement } = req.body;

    if (!signatureData) {
      return res.status(400).json({ error: 'Signature requise' });
    }
    if (consentement !== true) {
      return res.status(400).json({ error: 'Vous devez confirmer avoir lu et approuvé le document' });
    }

    const signature = await prisma.documentSignature.findUnique({
      where: { documentId_employeId: { documentId: Number(id), employeId: userId } }
    });

    if (!signature) return res.status(404).json({ error: 'Document non trouvé' });
    if (signature.statut === 'signed') return res.status(400).json({ error: 'Document déjà signé' });

    const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || null;

    const updated = await prisma.documentSignature.update({
      where: { id: signature.id },
      data: {
        statut: 'signed',
        signatureData,
        signedAt: new Date(),
        consentement: true,
        ipAddress: typeof ipAddress === 'string' ? ipAddress.substring(0, 45) : null,
        userAgent: typeof userAgent === 'string' ? userAgent.substring(0, 255) : null,
      }
    });

    // Charger document (avec créateur) + employé pour PDF et notifications
    const document = await prisma.documentRH.findUnique({
      where: { id: Number(id) },
      include: { createdBy: { select: { id: true, email: true } } },
    });
    const employe = await prisma.user.findUnique({
      where: { id: userId },
      select: { prenom: true, nom: true, email: true }
    });
    const nomEmploye = employe ? `${employe.prenom || ''} ${employe.nom || ''}`.trim() : 'Un salarié';

    // Générer le PDF signé (signature incrustée + page de certification + hash)
    let signedPdfUrl = null;
    try {
      const { fileUrl, hash } = await generateSignedPdf({ document, signature: updated, employe });
      signedPdfUrl = fileUrl;
      await prisma.documentSignature.update({
        where: { id: signature.id },
        data: { signedPdfUrl: fileUrl, documentHash: hash }
      });
    } catch (pdfErr) {
      console.error('Erreur génération PDF signé:', pdfErr);
      // La signature reste valide même si le PDF n'a pas pu être généré
    }

    // Notifier l'admin créateur + accusé de réception à l'employé
    try {
      // Vérifie si tous les signataires ont signé (pour le message admin)
      const restants = await prisma.documentSignature.count({
        where: { documentId: Number(id), statut: { not: 'signed' } },
      });
      const tousSignes = restants === 0;

      if (document?.createdById) {
        await prisma.notifications.create({
          data: {
            employe_id: document.createdById,
            type: 'document_signe',
            titre: tousSignes ? 'Document entièrement signé' : 'Document signé',
            message: tousSignes
              ? `Tous les salariés ont signé « ${document.titre} »`
              : `${nomEmploye} a signé « ${document.titre} »`,
            lue: false,
            date_creation: new Date(),
          }
        });
        if (document.createdBy?.email) {
          sendEmail({
            to: document.createdBy.email,
            subject: `Document signé : ${document.titre}`,
            html: buildDocEmail({
              titre: document.titre,
              intro: tousSignes
                ? `<strong>${nomEmploye}</strong> vient de signer. Tous les salariés concernés ont désormais signé ce document.`
                : `<strong>${nomEmploye}</strong> vient de signer électroniquement ce document.`,
              ctaLabel: 'Ouvrir le suivi des documents',
              ctaUrl: `${APP_URL}/admin`,
              footer: 'Vous recevez cet email car vous êtes à l\'origine de ce document.',
            }),
          }).catch((e) => console.error('[documents-rh] Email signature (admin) échoué:', e?.message));
        }
      }

      // Accusé de réception à l'employé signataire
      if (employe?.email) {
        sendEmail({
          to: employe.email,
          subject: `Confirmation de signature : ${document?.titre || ''}`,
          html: buildDocEmail({
            titre: document?.titre,
            intro: "Nous confirmons la bonne prise en compte de votre signature électronique. Une copie certifiée est disponible dans votre espace RH.",
            ctaLabel: 'Voir mes documents',
            ctaUrl: `${APP_URL}/employee/profil`,
            footer: 'Ce document signé fait foi de votre accord. Conservez-le précieusement.',
          }),
        }).catch((e) => console.error('[documents-rh] Email confirmation (employé) échoué:', e?.message));
      }
    } catch (notifErr) {
      console.error('[documents-rh] Notification signature échouée:', notifErr?.message);
    }

    return res.json({ success: true, signedAt: updated.signedAt, signedPdfUrl });
  } catch (error) {
    console.error('Erreur signature:', error);
    res.status(500).json({ error: 'Erreur lors de la signature' });
  }
};

// ============================================
// EMPLOYÉ: Refuser un document
// ============================================
const refuserDocument = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { motif } = req.body;

    if (!motif || !motif.trim()) {
      return res.status(400).json({ error: 'Un motif de refus est requis' });
    }

    const signature = await prisma.documentSignature.findUnique({
      where: { documentId_employeId: { documentId: Number(id), employeId: userId } }
    });

    if (!signature) return res.status(404).json({ error: 'Document non trouvé' });
    if (signature.statut === 'signed') return res.status(400).json({ error: 'Document déjà signé, impossible de refuser' });

    await prisma.documentSignature.update({
      where: { id: signature.id },
      data: {
        statut: 'refused',
        motifRefus: motif.trim(),
        refusedAt: new Date(),
      }
    });

    // Notifier l'admin créateur du document (notification + email)
    try {
      const document = await prisma.documentRH.findUnique({
        where: { id: Number(id) },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      const employe = await prisma.user.findUnique({
        where: { id: userId },
        select: { prenom: true, nom: true },
      });
      const nomEmploye = employe ? `${employe.prenom || ''} ${employe.nom || ''}`.trim() : 'Un salarié';
      if (document?.createdById) {
        await prisma.notifications.create({
          data: {
            employe_id: document.createdById,
            type: 'document_refuse',
            titre: 'Document refusé',
            message: `${nomEmploye} a refusé « ${document.titre} » : ${motif.trim().substring(0, 120)}`,
            lue: false,
            date_creation: new Date(),
          }
        });
        if (document.createdBy?.email) {
          sendEmail({
            to: document.createdBy.email,
            subject: `Document refusé : ${document.titre}`,
            html: buildDocEmail({
              titre: document.titre,
              intro: `<strong>${nomEmploye}</strong> a refusé de signer ce document.<br/><br/>Motif indiqué :<br/><em>« ${motif.trim()} »</em>`,
              ctaLabel: 'Ouvrir le suivi des documents',
              ctaUrl: `${APP_URL}/admin`,
              footer: 'Vous recevez cet email car vous êtes à l\'origine de ce document.',
            }),
          }).catch((e) => console.error('[documents-rh] Email refus échoué:', e?.message));
        }
      }
    } catch (notifErr) {
      console.error('[documents-rh] Notification refus échouée:', notifErr?.message);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur refus:', error);
    res.status(500).json({ error: 'Erreur' });
  }
};

// ============================================
// EMPLOYÉ: Compteur documents en attente
// ============================================
const getDocumentsCount = async (req, res) => {
  try {
    const userId = req.userId;
    const count = await prisma.documentSignature.count({
      where: { employeId: userId, statut: { in: ['pending', 'read'] } }
    });
    const total = await prisma.documentSignature.count({
      where: { employeId: userId }
    });
    res.json({ count, total });
  } catch (error) {
    res.json({ count: 0, total: 0 });
  }
};

// ============================================
// Télécharger le PDF signé
// - Employé : son propre PDF signé
// - Admin/Manager : via ?signatureId=, n'importe quel signataire
// ============================================
const telechargerPdfSigne = async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.user?.role;
    const { id } = req.params;
    const { signatureId } = req.query;

    let signature;
    if (signatureId && (role === 'admin' || role === 'manager')) {
      signature = await prisma.documentSignature.findFirst({
        where: { id: Number(signatureId), documentId: Number(id) },
        include: { document: true, employe: { select: { prenom: true, nom: true, email: true } } }
      });
    } else {
      signature = await prisma.documentSignature.findUnique({
        where: { documentId_employeId: { documentId: Number(id), employeId: userId } },
        include: { document: true, employe: { select: { prenom: true, nom: true, email: true } } }
      });
    }

    if (!signature) return res.status(404).json({ error: 'Signature non trouvée' });
    if (signature.statut !== 'signed') return res.status(400).json({ error: 'Document non signé' });

    // Régénérer à la volée si le fichier n'existe plus
    let absPath = signature.signedPdfUrl
      ? path.join(__dirname, '..', 'uploads', signature.signedPdfUrl.replace(/^\/uploads\//, ''))
      : null;

    if (!absPath || !fs.existsSync(absPath)) {
      const { filePath, fileUrl, hash } = await generateSignedPdf({
        document: signature.document,
        signature,
        employe: signature.employe,
      });
      await prisma.documentSignature.update({
        where: { id: signature.id },
        data: { signedPdfUrl: fileUrl, documentHash: hash }
      });
      absPath = filePath;
    }

    const safeTitre = (signature.document.titre || 'document')
      .replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitre}_signe.pdf"`);
    fs.createReadStream(absPath).pipe(res);
  } catch (error) {
    console.error('Erreur téléchargement PDF signé:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
};

// ===== Annuaire des employeurs signataires (réutilisable) =====

// GET /api/documents-rh/signataires — liste des signataires enregistrés
const getSignataires = async (req, res) => {
  try {
    const signataires = await prisma.signataireEmployeur.findMany({
      orderBy: { nom: 'asc' },
    });
    res.json(signataires);
  } catch (error) {
    console.error('Erreur getSignataires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des signataires' });
  }
};

// POST /api/documents-rh/signataires — ajoute un signataire
const createSignataire = async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim().substring(0, 120) : '';
    const fonction = typeof req.body.fonction === 'string' ? req.body.fonction.trim().substring(0, 120) || null : null;
    if (!nom) return res.status(400).json({ error: 'Le nom est requis' });

    const existing = await prisma.signataireEmployeur.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    });
    if (existing) return res.status(200).json(existing);

    const signataire = await prisma.signataireEmployeur.create({ data: { nom, fonction } });
    res.status(201).json(signataire);
  } catch (error) {
    console.error('Erreur createSignataire:', error);
    res.status(500).json({ error: 'Erreur lors de la création du signataire' });
  }
};

// DELETE /api/documents-rh/signataires/:id — supprime un signataire de l'annuaire
const deleteSignataire = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identifiant invalide' });
    await prisma.signataireEmployeur.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Signataire introuvable' });
    console.error('Erreur deleteSignataire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du signataire' });
  }
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  relancerSignature,
  getMesDocuments,
  voirDocument,
  signerDocument,
  refuserDocument,
  getDocumentsCount,
  telechargerPdfSigne,
  getSignataires,
  createSignataire,
  deleteSignataire,
};
