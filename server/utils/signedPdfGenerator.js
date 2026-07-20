// =====================================================
// Générateur de PDF signé (style DocuSign)
// - Incruste la signature dessinée à un emplacement défini
// - Ajoute une page de certification (signataire, date, IP, hash SHA-256)
// =====================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const SIGNED_DIR = path.join(UPLOADS_DIR, 'documents-rh', 'signed');

// Couleurs charte
const BRAND = rgb(0.81, 0.16, 0.17); // #cf292c
const GRAY_TEXT = rgb(0.25, 0.25, 0.3);
const GRAY_LIGHT = rgb(0.96, 0.96, 0.97);
const GRAY_BORDER = rgb(0.82, 0.82, 0.85);
const GREEN = rgb(0.13, 0.66, 0.42);

// WinAnsi (Helvetica) ne supporte pas tous les caractères : on nettoie.
function sanitize(text) {
  if (text == null) return '';
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\xFF]/g, ''); // retire ce qui sort de Latin-1
}

// Découpe un texte en lignes qui tiennent dans maxWidth
function wrapText(text, font, size, maxWidth) {
  const out = [];
  const paragraphs = sanitize(text).split(/\r?\n/);
  for (const para of paragraphs) {
    if (para.trim() === '') { out.push(''); continue; }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

// Décode une signature dataURL base64 → { bytes, type }
function decodeSignature(signatureData) {
  if (!signatureData || typeof signatureData !== 'string') return null;
  const match = signatureData.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return null;
  return {
    type: match[1].toLowerCase().startsWith('jp') ? 'jpg' : 'png',
    bytes: Buffer.from(match[2], 'base64'),
  };
}

// ----- Détection de zone de signature (style "anchor tags" DocuSign) -----
let _pdfjs = null;
function getPdfjs() {
  if (_pdfjs === null) {
    try { _pdfjs = require('pdfjs-dist/legacy/build/pdf.js'); }
    catch (e) { _pdfjs = false; }
  }
  return _pdfjs;
}

// Minuscule + sans accents pour comparer les ancres
function normTxt(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Ancres recherchées, de la plus précise à la plus large (priorité = index)
const SIGNATURE_ANCHORS = [
  'signature precedee',
  'lu et approuve',
  'signature du salarie',
  'le salarie',
  'bon pour accord',
  'signature du salaria', // tolérance OCR
  'signature :',
];

// Cherche l'emplacement de signature dans un PDF via texte-repère.
// Retourne { pageIndex, x, topY, bottomY, priority } en coordonnées PDF (origine bas-gauche) ou null.
//  - topY    : bas du bloc d'instruction (« Le Salarié / Signature précédée… »)
//  - bottomY : limite basse de la zone libre (juste au-dessus de la ligne suivante / nom)
async function findSignatureZone(pdfBytes) {
  const pdfjsLib = getPdfjs();
  if (!pdfjsLib) return null;
  try {
    const task = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
    });
    const doc = await task.promise;
    let result = null;
    // On parcourt depuis la dernière page (les signatures sont en fin de document)
    for (let p = doc.numPages; p >= 1 && !result; p--) {
      const page = await doc.getPage(p);
      if (page.rotate && page.rotate % 360 !== 0) continue; // pages tournées → fallback
      const content = await page.getTextContent();
      const items = content.items
        .filter((it) => String(it.str || '').trim())
        .map((it) => ({ t: normTxt(it.str), x: it.transform[4], y: it.transform[5] }));

      // 1) Trouver la meilleure ancre (priorité la plus forte = index le plus bas)
      let best = null;
      for (const it of items) {
        for (let ai = 0; ai < SIGNATURE_ANCHORS.length; ai++) {
          if (it.t.includes(SIGNATURE_ANCHORS[ai])) {
            if (!best || ai < best.priority) best = { x: it.x, y: it.y, priority: ai };
          }
        }
      }
      if (!best) continue;

      // 2) Bas du bloc d'instruction : lignes de continuation dans la même colonne
      let topY = best.y;
      for (const it of items) {
        if (it.y < best.y && it.y > best.y - 70 && Math.abs(it.x - best.x) < 230) {
          if (it.y < topY) topY = it.y;
        }
      }

      // 3) Limite basse : première ligne de texte située sous le bloc d'instruction
      let nextLineY = null;
      for (const it of items) {
        if (it.y < topY - 10) {
          if (nextLineY === null || it.y > nextLineY) nextLineY = it.y;
        }
      }
      // On laisse de la marge pour ne pas chevaucher un éventuel trait au-dessus du nom
      const bottomY = nextLineY !== null ? nextLineY + 26 : 70;

      result = { pageIndex: p - 1, x: best.x, topY, bottomY, priority: best.priority };
    }
    await doc.destroy();
    return result;
  } catch (e) {
    return null;
  }
}

// Incruste la signature dans la zone libre détectée (comme un champ DocuSign)
function stampSignatureInZone(page, zone, opts) {
  const { signatureImage, signataire, dateStr, font } = opts;
  const pw = page.getWidth();
  const boxW = 180;
  let x = zone.x;
  if (x + boxW > pw - 24) x = pw - 24 - boxW;
  if (x < 24) x = 24;

  // Bornes verticales de la zone exploitable
  const zoneTop = zone.topY - 6;            // juste sous l'instruction imprimée
  const zoneBottom = Math.min(zone.bottomY, zoneTop - 24); // garantir un minimum
  const avail = zoneTop - zoneBottom;

  // On n'incruste PLUS de mention "Lu et approuve" (sans valeur juridique +
  // souvent déjà imprimée sur le document) : juste la signature + une légende.
  const capH = 10;
  let sigH = avail - capH - 4;
  sigH = Math.max(18, Math.min(46, sigH));

  // Image de signature en haut de la zone
  const sigBottomY = zoneTop - sigH;
  if (signatureImage) {
    const dims = signatureImage.scale(1);
    const ratio = Math.min(boxW / dims.width, sigH / dims.height);
    const sw = dims.width * ratio;
    const sh = dims.height * ratio;
    page.drawImage(signatureImage, { x, y: sigBottomY, width: sw, height: sh });
  }

  // Légende fine sous la signature, sans descendre sous la limite basse
  const capY = Math.max(zoneBottom, sigBottomY - 11);
  page.drawText(`${sanitize(signataire)} - signe le ${sanitize(dateStr)}`, {
    x, y: capY, size: 6.5, font, color: GRAY_TEXT,
  });
}

// Placement manuel : { page, xPct, yPct, wPct, hPct } en fraction 0-1, origine HAUT-gauche.
function parsePlacement(raw) {
  if (!raw) return null;
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (o == null || typeof o !== 'object') return null;
    const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    const placement = {
      page: Math.max(1, Math.round(num(o.page, 1))),
      xPct: Math.min(1, Math.max(0, num(o.xPct, 0))),
      yPct: Math.min(1, Math.max(0, num(o.yPct, 0))),
      wPct: Math.min(1, Math.max(0.05, num(o.wPct, 0.28))),
      hPct: Math.min(1, Math.max(0.03, num(o.hPct, 0.08))),
    };
    return placement;
  } catch (e) { return null; }
}

// Incruste la signature dans un rectangle défini manuellement (style éditeur iLovePDF).
// rect est exprimé en fractions de la page, origine haut-gauche.
// WYSIWYG : la signature remplit le cadre dessiné par l'admin, légende discrète en bas.
function stampSignatureAtRect(page, rect, opts) {
  const { signatureImage, signataire, dateStr, font } = opts;
  const pw = page.getWidth();
  const ph = page.getHeight();
  // Conversion → points pdf-lib (origine bas-gauche)
  const boxW = rect.wPct * pw;
  const boxH = rect.hPct * ph;
  const x = rect.xPct * pw;
  const topY = ph - rect.yPct * ph; // haut du cadre
  const bottomY = topY - boxH;      // bas du cadre

  // Légende fine en bas du cadre
  const capText = `${sanitize(signataire)} - signe le ${sanitize(dateStr)}`;
  const capH = 9;
  const capY = bottomY + 1;

  // Signature centrée et remplissant l'espace au-dessus de la légende
  const innerBottom = bottomY + capH;
  const innerH = Math.max(14, topY - innerBottom);
  if (signatureImage) {
    const dims = signatureImage.scale(1);
    const ratio = Math.min(boxW / dims.width, innerH / dims.height);
    const sw = dims.width * ratio;
    const sh = dims.height * ratio;
    const sx = x + (boxW - sw) / 2;
    const sy = innerBottom + (innerH - sh) / 2;
    page.drawImage(signatureImage, { x: sx, y: sy, width: sw, height: sh });
  }
  page.drawText(capText, { x, y: capY, size: 6.5, font, color: GRAY_TEXT });
}

// ---- Champs DocuSign (multi-champs) ---------------------------------------

// Parse le JSON des champs et ne garde que les entrées valides.
function parseFields(raw) {
  if (!raw) return null;
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return null;
    const allowed = ['signature', 'initiales', 'nom', 'date', 'mention', 'cachet', 'signature_employeur', 'paraphe_employeur'];
    const out = arr
      .filter(f => f && typeof f === 'object' && allowed.includes(f.type)
        && typeof f.xPct === 'number' && typeof f.yPct === 'number'
        && typeof f.wPct === 'number' && typeof f.hPct === 'number')
      .map(f => ({
        type: f.type,
        page: Math.max(1, Math.round(Number(f.page) || 1)),
        xPct: Math.min(1, Math.max(0, f.xPct)),
        yPct: Math.min(1, Math.max(0, f.yPct)),
        wPct: Math.min(1, Math.max(0.02, f.wPct)),
        hPct: Math.min(1, Math.max(0.015, f.hPct)),
        text: typeof f.text === 'string' ? f.text : undefined,
        cover: f.cover === true,
        bold: f.bold === true,
        italic: f.italic === true,
        genFamily: typeof f.genFamily === 'string' ? f.genFamily : undefined,
        fontHpct: typeof f.fontHpct === 'number' ? f.fontHpct : undefined,
      }));
    return out.length ? out : null;
  } catch (e) { return null; }
}

// "Karim Benali" -> "K.B."
function buildInitials(signataire) {
  const parts = String(signataire || '').trim().split(/\s+/).filter(Boolean);
  const letters = parts.map(p => p[0]).filter(Boolean).map(c => c.toUpperCase());
  if (!letters.length) return '';
  return letters.join('.') + '.';
}

// Taille de police qui tient en largeur (et bornée par la hauteur).
function fitFontSize(text, font, boxW, boxH, maxSize) {
  let size = Math.min(maxSize, boxH * 0.82);
  while (size > 5 && font.widthOfTextAtSize(text, size) > boxW) size -= 0.5;
  return Math.max(5, size);
}

// Choisit la police standard la plus proche de l'original (famille + graisse + italique).
function pickFont(fonts, family, bold, italic) {
  if (!fonts) return null;
  const fam = family === 'times' ? 'times' : family === 'courier' ? 'courier' : 'helv';
  const key = `${fam}${bold ? 'B' : ''}${italic ? 'I' : ''}`;
  return fonts[key] || fonts.helv;
}

// Dessine une image "contain" (ratio préservé) centrée dans un rectangle.
function drawImageContain(page, image, x, y, boxW, boxH) {
  const dims = image.scale(1);
  const ratio = Math.min(boxW / dims.width, boxH / dims.height);
  const w = dims.width * ratio;
  const h = dims.height * ratio;
  page.drawImage(image, { x: x + (boxW - w) / 2, y: y + (boxH - h) / 2, width: w, height: h });
}

// Incruste tous les champs (signature, initiales, mention, cachet) sur les pages.
// Retourne true si au moins un champ a été dessiné.
function stampFields(pages, fields, opts) {
  const { signatureImage, cachetImage, employeurImage, employeurNom, employeurDateStr, signataire, dateStr, font, fontBold, fontOblique, fonts } = opts;
  let drew = false;
  const initials = buildInitials(signataire);
  for (const f of fields) {
    const page = pages[Math.min(f.page, pages.length) - 1];
    if (!page) continue;
    const pw = page.getWidth();
    const ph = page.getHeight();
    const boxW = f.wPct * pw;
    const boxH = f.hPct * ph;
    const x = f.xPct * pw;
    const topY = ph - f.yPct * ph;
    const bottomY = topY - boxH;

    if (f.type === 'signature') {
      if (!signatureImage) continue;
      const capH = 9;
      drawImageContain(page, signatureImage, x, bottomY + capH, boxW, boxH - capH);
      page.drawText(`${sanitize(signataire)} - signe le ${sanitize(dateStr)}`, {
        x, y: bottomY + 1, size: 6.5, font, color: GRAY_TEXT,
      });
      drew = true;
    } else if (f.type === 'initiales') {
      if (!initials) continue;
      const size = fitFontSize(initials, fontOblique, boxW * 0.96, boxH, 28);
      const tw = fontOblique.widthOfTextAtSize(initials, size);
      page.drawText(initials, {
        x: x + (boxW - tw) / 2,
        y: bottomY + (boxH - size * 0.72) / 2,
        size, font: fontOblique, color: rgb(0.12, 0.18, 0.45),
      });
      drew = true;
    } else if (f.type === 'nom') {
      const txt = sanitize(signataire || '');
      if (!txt) continue;
      const size = fitFontSize(txt, fontBold, boxW * 0.96, boxH, 16);
      const tw = fontBold.widthOfTextAtSize(txt, size);
      page.drawText(txt, {
        x: x + (boxW - tw) / 2,
        y: bottomY + (boxH - size * 0.72) / 2,
        size, font: fontBold, color: rgb(0.1, 0.1, 0.12),
      });
      drew = true;
    } else if (f.type === 'date') {
      const txt = sanitize(dateStr || '');
      if (!txt) continue;
      const size = fitFontSize(txt, font, boxW * 0.96, boxH, 14);
      const tw = font.widthOfTextAtSize(txt, size);
      page.drawText(txt, {
        x: x + (boxW - tw) / 2,
        y: bottomY + (boxH - size * 0.72) / 2,
        size, font, color: rgb(0.1, 0.1, 0.12),
      });
      drew = true;
    } else if (f.type === 'date_employeur') {
      const txt = sanitize(f.text || '');
      if (!txt) continue;
      const size = fitFontSize(txt, font, boxW * 0.96, boxH, 14);
      const tw = font.widthOfTextAtSize(txt, size);
      page.drawText(txt, {
        x: x + (boxW - tw) / 2,
        y: bottomY + (boxH - size * 0.72) / 2,
        size, font, color: rgb(0.1, 0.1, 0.12),
      });
      drew = true;
    } else if (f.type === 'mention') {
      const txt = sanitize(f.text || '');
      // Masque le texte d'origine quand on édite un texte existant (fond blanc)
      if (f.cover) {
        page.drawRectangle({
          x: x - 1, y: bottomY - 1, width: boxW + 2, height: boxH + 2,
          color: rgb(1, 1, 1),
        });
      }
      if (!txt) { if (f.cover) drew = true; continue; }
      const mFont = pickFont(fonts, f.genFamily, f.bold, f.italic) || font;
      if (f.fontHpct) {
        // Édition d'un texte existant : on reproduit la taille de la police d'origine
        let size = Math.max(5, f.fontHpct * ph);
        // On ne réduit que si le texte déborde nettement en largeur
        while (size > 5 && mFont.widthOfTextAtSize(txt, size) > boxW * 1.02) size -= 0.5;
        const ty = bottomY + (boxH - size * 0.72) / 2;
        page.drawText(txt, { x: x + 1, y: ty, size, font: mFont, color: rgb(0.1, 0.1, 0.12) });
        drew = true;
      } else {
        // Texte libre : multi-lignes auto-ajusté
        let size = Math.min(12, boxH * 0.72);
        const wrapLines = (s) => txt.split(/\r?\n/).flatMap((para) => (para === '' ? [''] : wrapText(para, mFont, s, boxW * 0.98)));
        let lines = wrapLines(size);
        while (size > 6 && lines.length * (size + 2) > boxH) {
          size -= 0.5;
          lines = wrapLines(size);
        }
        let ly = topY - size;
        for (const l of lines) {
          if (ly < bottomY - 1) break;
          if (l) page.drawText(l, { x: x + 1, y: ly, size, font: mFont, color: rgb(0.1, 0.1, 0.12) });
          ly -= size + 2;
        }
        drew = true;
      }
    } else if (f.type === 'cachet') {
      if (!cachetImage) continue;
      drawImageContain(page, cachetImage, x, bottomY, boxW, boxH);
      drew = true;
    } else if (f.type === 'signature_employeur') {
      if (!employeurImage) continue;
      const capH = 9;
      drawImageContain(page, employeurImage, x, bottomY + capH, boxW, boxH - capH);
      const cap = `${sanitize(employeurNom || 'Employeur')}${employeurDateStr ? ` - signe le ${sanitize(employeurDateStr)}` : ''}`;
      page.drawText(cap, {
        x, y: bottomY + 1, size: 6.5, font, color: GRAY_TEXT,
      });
      drew = true;
    } else if (f.type === 'paraphe_employeur') {
      const empInitials = buildInitials(employeurNom);
      if (!empInitials) continue;
      const size = fitFontSize(empInitials, fontOblique, boxW * 0.96, boxH, 28);
      const tw = fontOblique.widthOfTextAtSize(empInitials, size);
      page.drawText(empInitials, {
        x: x + (boxW - tw) / 2,
        y: bottomY + (boxH - size * 0.72) / 2,
        size, font: fontOblique, color: rgb(0.36, 0.20, 0.55),
      });
      drew = true;
    }
  }
  return drew;
}



// Carte de signature propre (rendue sur la page de signature dédiée)
function drawSignatureCard(page, opts) {
  const { signatureImage, signataire, dateStr, fontBold, font, position } = opts;
  const w = page.getWidth();
  const cardW = 380;
  const cardH = 150;
  const margin = 40;
  let x;
  if (position === 'bottom-left') x = margin;
  else if (position === 'bottom-right') x = w - cardW - margin;
  else x = (w - cardW) / 2; // bottom-center → centré
  const y = 590;

  // Cadre
  page.drawRectangle({ x, y, width: cardW, height: cardH, color: rgb(1, 1, 1), borderColor: GRAY_BORDER, borderWidth: 1 });
  // Bandeau haut de carte
  page.drawRectangle({ x, y: y + cardH - 26, width: cardW, height: 26, color: GRAY_LIGHT });
  page.drawText('SIGNATURE MANUSCRITE', { x: x + 14, y: y + cardH - 17, size: 8, font: fontBold, color: GRAY_TEXT });

  // Image de la signature, centrée
  if (signatureImage) {
    const maxW = cardW - 50;
    const maxH = 66;
    const dims = signatureImage.scale(1);
    const ratio = Math.min(maxW / dims.width, maxH / dims.height);
    const sw = dims.width * ratio;
    const sh = dims.height * ratio;
    page.drawImage(signatureImage, { x: x + (cardW - sw) / 2, y: y + 52, width: sw, height: sh });
  }

  // Ligne de signature
  page.drawLine({ start: { x: x + 18, y: y + 46 }, end: { x: x + cardW - 18, y: y + 46 }, thickness: 0.6, color: GRAY_BORDER });
  // Nom + date
  page.drawText(sanitize(signataire), { x: x + 18, y: y + 28, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  page.drawText(`Signe le ${sanitize(dateStr)}`, { x: x + 18, y: y + 13, size: 8.5, font, color: GRAY_TEXT });
}

// Pied de page discret sur le document (référence le certificat)
function drawCertificationFooter(page, opts) {
  const { font, fontBold, signataire, dateStr } = opts;
  const w = page.getWidth();
  const h = 24;
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: GRAY_LIGHT });
  page.drawRectangle({ x: 0, y: h, width: w, height: 1.2, color: BRAND });
  page.drawText('Signe electroniquement', { x: 36, y: 13, size: 7.5, font: fontBold, color: BRAND });
  page.drawText(
    `${sanitize(signataire)} - ${sanitize(dateStr)} - certificat de signature en derniere page`,
    { x: 36, y: 4.5, size: 6.5, font, color: GRAY_TEXT }
  );
}

// Page dédiée : signature + certificat (audit trail complet)
function addCertificationPage(pdfDoc, opts) {
  const { font, fontBold, signatureImage, signataire, email, dateStr, ip, userAgent, consentement, hash, titre, type, position } = opts;
  const page = pdfDoc.addPage([595, 842]); // A4
  const w = page.getWidth();

  // Bandeau titre
  page.drawRectangle({ x: 0, y: 770, width: w, height: 72, color: BRAND });
  page.drawText('SIGNATURE ELECTRONIQUE', { x: 40, y: 808, size: 16, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Certificat de preuve - valeur probante (eIDAS - signature simple)', { x: 40, y: 790, size: 8, font, color: rgb(1, 1, 1) });

  // Carte de signature
  drawSignatureCard(page, { signatureImage, signataire, dateStr, fontBold, font, position });

  // Détails de l'audit
  let y = 545;
  const line = (label, value, opts2 = {}) => {
    page.drawText(sanitize(label), { x: 40, y, size: 9, font: fontBold, color: GRAY_TEXT });
    const lines = wrapText(value, font, 9, w - 220);
    lines.forEach((l, i) => {
      page.drawText(l, { x: 200, y: y - i * 12, size: 9, font: opts2.font || font, color: opts2.color || GRAY_TEXT });
    });
    y -= Math.max(1, lines.length) * 12 + 11;
  };

  line('Document', titre);
  line('Type', type || 'note');
  line('Signataire', signataire, { font: fontBold });
  if (email) line('Email', email);
  line('Date et heure', dateStr);
  line('Adresse IP', ip || 'non disponible');
  if (userAgent) line('Appareil / navigateur', userAgent);
  line('Consentement', consentement ? 'Lu et approuve - case cochee par le signataire' : 'non disponible', { color: consentement ? GREEN : GRAY_TEXT });
  line('Statut', 'SIGNE', { color: GREEN, font: fontBold });

  // Encadré empreinte
  y -= 8;
  page.drawRectangle({ x: 40, y: y - 56, width: w - 80, height: 56, color: GRAY_LIGHT, borderColor: GRAY_BORDER, borderWidth: 1 });
  page.drawText('Empreinte d\'integrite (SHA-256)', { x: 50, y: y - 16, size: 8, font: fontBold, color: GRAY_TEXT });
  page.drawText('Toute modification du document apres signature invalide cette empreinte.', { x: 50, y: y - 28, size: 7, font, color: GRAY_TEXT });
  page.drawText(hash.substring(0, 32), { x: 50, y: y - 42, size: 8, font, color: BRAND });
  page.drawText(hash.substring(32), { x: 50, y: y - 52, size: 8, font, color: BRAND });

  // Mention légale
  page.drawText(
    'Ce certificat atteste que le signataire identifie ci-dessus a appose sa signature electronique sur le document.',
    { x: 40, y: 60, size: 7.5, font, color: GRAY_TEXT }
  );
  page.drawText(
    'Conformement a l\'article 1367 du Code civil, la signature electronique a la meme valeur qu\'une signature manuscrite.',
    { x: 40, y: 48, size: 7.5, font, color: GRAY_TEXT }
  );

  return page;
}

/**
 * Génère le PDF signé.
 * @param {Object} params
 * @param {Object} params.document - DocumentRH (titre, type, contenu, fichierUrl, signaturePosition, signaturePage)
 * @param {Object} params.signature - DocumentSignature (signatureData, ipAddress, signedAt)
 * @param {Object} params.employe - { prenom, nom, email }
 * @returns {Promise<{ filePath, fileUrl, hash }>}
 */
async function generateSignedPdf({ document, signature, employe }) {
  const position = document.signaturePosition || 'bottom-right';
  const signataire = `${employe.prenom || ''} ${employe.nom || ''}`.trim() || 'Employe';
  const signedAt = signature.signedAt ? new Date(signature.signedAt) : new Date();
  const dateStr = signedAt.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  // Légende de la signature employeur (apposée à la création du document)
  const employeurNom = document.signatureEmployeurNom || null;
  const employeurDateStr = document.createdAt
    ? new Date(document.createdAt).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null;

  // 1. Charger / créer le PDF de base + calculer le hash du contenu source
  let pdfDoc;
  let sourceBytes;
  let isPdfSource = false;

  const fichierAbsPath = document.fichierUrl
    ? path.join(UPLOADS_DIR, document.fichierUrl.replace(/^\/uploads\//, ''))
    : null;

  if (fichierAbsPath && fs.existsSync(fichierAbsPath)) {
    sourceBytes = fs.readFileSync(fichierAbsPath);
    const ext = path.extname(fichierAbsPath).toLowerCase();
    if (ext === '.pdf') {
      pdfDoc = await PDFDocument.load(sourceBytes);
      isPdfSource = true;
    } else {
      // Image : créer un PDF avec l'image en pleine page
      pdfDoc = await PDFDocument.create();
      const img = ext === '.png'
        ? await pdfDoc.embedPng(sourceBytes)
        : await pdfDoc.embedJpg(sourceBytes);
      const page = pdfDoc.addPage([595, 842]);
      const ratio = Math.min((595 - 40) / img.width, (842 - 120) / img.height);
      page.drawImage(img, {
        x: (595 - img.width * ratio) / 2,
        y: 842 - 40 - img.height * ratio,
        width: img.width * ratio,
        height: img.height * ratio,
      });
    }
  } else {
    // Document texte (contenu) → générer les pages
    const contenu = document.contenu || '';
    sourceBytes = Buffer.from(`${document.titre || ''}\n\n${contenu}`, 'utf8');
    pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 50;
    const pageW = 595, pageH = 842;
    let page = pdfDoc.addPage([pageW, pageH]);
    let cy = pageH - margin;
    // Titre
    page.drawText(sanitize(document.titre || 'Document'), { x: margin, y: cy, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
    cy -= 28;
    const lines = wrapText(contenu, font, 11, pageW - margin * 2);
    for (const l of lines) {
      if (cy < margin + 120) {
        page = pdfDoc.addPage([pageW, pageH]);
        cy = pageH - margin;
      }
      page.drawText(l, { x: margin, y: cy, size: 11, font, color: rgb(0.15, 0.15, 0.18) });
      cy -= 16;
    }
  }

  // 2. Hash SHA-256 du contenu source
  const hash = crypto.createHash('sha256').update(sourceBytes).digest('hex');

  // 3. Polices + image signature
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Jeu de polices standard pour reproduire la police du texte édité (façon Acrobat)
  const fonts = {
    helv: font,
    helvB: fontBold,
    helvI: fontOblique,
    helvBI: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
    times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    timesB: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    timesI: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    timesBI: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
    courier: await pdfDoc.embedFont(StandardFonts.Courier),
    courierB: await pdfDoc.embedFont(StandardFonts.CourierBold),
    courierI: await pdfDoc.embedFont(StandardFonts.CourierOblique),
    courierBI: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
  };

  let signatureImage = null;
  const decoded = decodeSignature(signature.signatureData);
  if (decoded) {
    try {
      signatureImage = decoded.type === 'jpg'
        ? await pdfDoc.embedJpg(decoded.bytes)
        : await pdfDoc.embedPng(decoded.bytes);
    } catch (e) { /* signature illisible — on continue sans image */ }
  }

  // Image de cachet (optionnelle, uploadée par l'admin)
  let cachetImage = null;
  if (document.cachetUrl) {
    try {
      const cachetPath = path.join(UPLOADS_DIR, document.cachetUrl.replace(/^\/uploads\//, ''));
      if (fs.existsSync(cachetPath)) {
        const cachetBytes = fs.readFileSync(cachetPath);
        const cext = path.extname(cachetPath).toLowerCase();
        cachetImage = (cext === '.jpg' || cext === '.jpeg')
          ? await pdfDoc.embedJpg(cachetBytes)
          : await pdfDoc.embedPng(cachetBytes);
      }
    } catch (e) { /* cachet illisible — on continue sans */ }
  }

  // Image de la signature employeur (apposée par l'admin à la création)
  let employeurImage = null;
  if (document.signatureEmployeurUrl) {
    try {
      const empPath = path.join(UPLOADS_DIR, document.signatureEmployeurUrl.replace(/^\/uploads\//, ''));
      if (fs.existsSync(empPath)) {
        const empBytes = fs.readFileSync(empPath);
        const eext = path.extname(empPath).toLowerCase();
        employeurImage = (eext === '.jpg' || eext === '.jpeg')
          ? await pdfDoc.embedJpg(empBytes)
          : await pdfDoc.embedPng(empBytes);
      }
    } catch (e) { /* signature employeur illisible — on continue sans */ }
  }

  // 4. Incrustation de la signature :
  //    (0) champs DocuSign multi-champs (éditeur avancé),
  //    (a) placement manuel simple défini par l'admin (éditeur visuel),
  //    (b) sinon détection automatique du repère (anchor tag),
  //    (c) sinon pied de page discret + carte sur la page certificat.
  const pages = pdfDoc.getPages();
  let placed = false;

  // (0) Champs multi-champs
  const champs = isPdfSource ? parseFields(document.signatureChamps) : null;
  if (champs && champs.length) {
    const drew = stampFields(pages, champs, {
      signatureImage, cachetImage, employeurImage, employeurNom, employeurDateStr, signataire, dateStr, font, fontBold, fontOblique, fonts,
    });
    if (drew) placed = true;
  }

  const manual = !placed && isPdfSource ? parsePlacement(document.signaturePlacement) : null;

  if (manual && signatureImage) {
    const idx = Math.min(manual.page, pages.length) - 1;
    if (pages[idx]) {
      stampSignatureAtRect(pages[idx], manual, { signatureImage, signataire, dateStr, font, fontOblique });
      placed = true;
    }
  }

  if (!placed) {
    let anchor = null;
    if (isPdfSource) {
      anchor = await findSignatureZone(sourceBytes);
    }
    if (anchor && signatureImage && pages[anchor.pageIndex]) {
      // Style DocuSign : signature posée précisément dans la zone repérée du document
      stampSignatureInZone(pages[anchor.pageIndex], anchor, {
        signatureImage, signataire, dateStr, font, fontOblique,
      });
      placed = true;
    }
  }

  if (!placed) {
    // Aucun emplacement → pied de page discret sur la page cible
    let targetIndex = pages.length - 1;
    if (document.signaturePage && document.signaturePage >= 1 && document.signaturePage <= pages.length) {
      targetIndex = document.signaturePage - 1;
    }
    drawCertificationFooter(pages[targetIndex], { font, fontBold, signataire, dateStr });
  }

  // 5. Page dédiée : certificat (audit trail complet + rappel de la signature)
  addCertificationPage(pdfDoc, {
    font, fontBold, signatureImage, signataire, email: employe.email, dateStr,
    ip: signature.ipAddress, userAgent: signature.userAgent, consentement: signature.consentement,
    hash, titre: document.titre, type: document.type, position,
  });

  // 6. Sauvegarde
  if (!fs.existsSync(SIGNED_DIR)) fs.mkdirSync(SIGNED_DIR, { recursive: true });
  const fileName = `signed-${document.id}-${signature.employeId}-${Date.now()}.pdf`;
  const filePath = path.join(SIGNED_DIR, fileName);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);

  return {
    filePath,
    fileUrl: `/uploads/documents-rh/signed/${fileName}`,
    hash,
  };
}

module.exports = { generateSignedPdf };
