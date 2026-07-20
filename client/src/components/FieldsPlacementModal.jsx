import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { API_BASE } from '../config/api';
import {
  X, ChevronLeft, ChevronRight, Check, Loader2, Sparkles,
  PenLine, Type, Stamp, Hash, Trash2, Image as ImageIcon, User,
  ZoomIn, ZoomOut, Maximize2, Calendar, GripVertical, Plus, ChevronDown,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.js`;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Police « signature » pour les aperçus (évoque l'écriture manuscrite)
const SCRIPT_FONT = "'Segoe Script','Brush Script MT','Snell Roundhand',cursive";

// 6 types de champs (style iLovePDF / DocuSign)
//  who: 'employe' = rempli automatiquement côté salarié ; 'admin' = défini par vous maintenant
const FIELD_TYPES = {
  signature: { label: 'Signature', desc: 'Le salarié signera ici', color: '#cf292c', icon: PenLine, defW: 0.26, defH: 0.075, who: 'employe', script: true, primary: true },
  initiales: { label: 'Initiales', desc: 'Paraphe du salarié', color: '#4f46e5', icon: Hash, defW: 0.12, defH: 0.06, who: 'employe', script: true },
  nom: { label: 'Nom', desc: 'Nom auto-rempli', color: '#0284c7', icon: User, defW: 0.24, defH: 0.045, who: 'employe' },
  date: { label: 'Date', desc: 'Date de signature', color: '#0d9488', icon: Calendar, defW: 0.16, defH: 0.04, who: 'employe' },
  signature_employeur: { label: 'Signature employeur', desc: 'Vous signez maintenant', color: '#7c3aed', icon: PenLine, defW: 0.26, defH: 0.075, who: 'admin', employerSig: true },
  paraphe_employeur: { label: 'Paraphe employeur', desc: 'Vos initiales', color: '#9333ea', icon: Hash, defW: 0.12, defH: 0.06, who: 'admin', employerInitials: true },
  mention: { label: 'Texte', desc: 'Écrivez directement sur le PDF', color: '#059669', icon: Type, defW: 0.30, defH: 0.05, who: 'admin' },
  cachet: { label: 'Tampon', desc: 'Votre cachet d\u2019entreprise', color: '#d97706', icon: Stamp, defW: 0.16, defH: 0.11, who: 'admin' },
};
// Groupes de la palette : ce que remplit le salarié vs ce que vous (employeur) apposez
const EMPLOYEE_FIELDS = ['signature', 'initiales', 'nom', 'date'];
const EMPLOYER_FIELDS = ['signature_employeur', 'paraphe_employeur', 'mention', 'cachet'];

const uid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Convertit un dataURL (canvas) en File pour l'envoi multipart
function dataUrlToFile(dataUrl, filename) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

// "Jean Dupont" -> "J.D."
function clientInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const letters = parts.map((p) => p[0]).filter(Boolean).map((c) => c.toUpperCase());
  return letters.length ? letters.join('.') + '.' : '';
}

// Aperçu texte affiché dans un champ posé (avant remplissage réel)
function fieldPreviewText(f) {
  switch (f.type) {
    case 'signature': return 'Signature';
    case 'initiales': return 'Init.';
    case 'nom': return 'Nom du salarié';
    case 'date': return new Date().toLocaleDateString('fr-FR');
    case 'mention': return f.text || 'Texte…';
    case 'signature_employeur': return 'Signature employeur';
    case 'paraphe_employeur': return 'Paraphe';
    default: return '';
  }
}

// Miniature d'une page (panneau de gauche)
function Thumb({ pdf, pageNumber, active, hasFields, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    let cancelled = false; let task;
    (async () => {
      if (!pdf) return;
      try {
        const p = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const vp0 = p.getViewport({ scale: 1 });
        const scale = 88 / vp0.width;
        const vp = p.getViewport({ scale });
        const c = ref.current; if (!c) return;
        c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        task = p.render({ canvasContext: c.getContext('2d'), viewport: vp });
        await task.promise;
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; if (task) { try { task.cancel(); } catch (e) { /* ignore */ } } };
  }, [pdf, pageNumber]);
  return (
    <button type="button" onClick={onClick}
      className={`relative w-full rounded-lg border-2 overflow-hidden transition-all ${active ? 'border-[#cf292c] shadow-md' : 'border-transparent hover:border-slate-300'}`}>
      <canvas ref={ref} className="block w-full bg-white" />
      <span className={`absolute bottom-1 right-1 text-[9px] font-bold px-1 rounded ${active ? 'bg-[#cf292c] text-white' : 'bg-slate-700/70 text-white'}`}>{pageNumber}</span>
      {hasFields && <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />}
    </button>
  );
}

/**
 * Pavé de signature manuscrite (dessin à la souris / au doigt).
 * Utilisé par l'employeur pour apposer sa propre signature à la création.
 */
function SignaturePad({ initialPreview, onSave, onClose }) {
  const padRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const ctxOf = () => {
    const c = padRef.current;
    if (!c) return null;
    const ctx = c.getContext('2d');
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
    return ctx;
  };

  // Dimensionne le canvas à sa taille réelle (haute densité)
  useEffect(() => {
    const c = padRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, []);

  const posOf = (e) => {
    const c = padRef.current;
    const rect = c.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    const ctx = ctxOf();
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = posOf(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = ctxOf();
    if (!ctx) return;
    const { x, y } = posOf(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };
  const end = () => { drawingRef.current = false; };

  const clear = () => {
    const c = padRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.getContext('2d').clearRect(0, 0, c.width / dpr, c.height / dpr);
    setHasInk(false);
  };

  const save = () => {
    if (!hasInk) return;
    onSave(padRef.current.toDataURL('image/png'));
  };

  return (
    <div className="absolute inset-0 z-[130] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
              <PenLine className="w-4 h-4" strokeWidth={2} />
            </span>
            <h3 className="text-[14px] font-bold text-slate-800">Votre signature (employeur)</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">Dessinez votre signature dans le cadre ci-dessous.</p>
        <div className="relative rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 overflow-hidden" style={{ height: 180 }}>
          {!hasInk && (
            <span className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none select-none">
              Signez ici
            </span>
          )}
          <canvas ref={padRef}
            className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
            onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button type="button" onClick={clear}
            className="px-3 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg">
            Effacer
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg">
              Annuler
            </button>
            <button type="button" onClick={save} disabled={!hasInk}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-[12px] font-semibold hover:bg-violet-700 disabled:opacity-40">
              <Check className="w-4 h-4" strokeWidth={2.2} /> Valider la signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Éditeur de champs à signer (style DocuSign / Yousign).
 *
 * Props:
 *  - file: File (PDF)
 *  - initial: { champs: [...], cachetPreview: dataURL } (optionnel)
 *  - onConfirm({ champs, cachetFile }): callback
 *  - onClose()
 */
// Sélecteur d'employeur signataire (annuaire réutilisable, pré-remplit le nom)
function SignatairePicker({ signataires, loading, value, onSelect, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setAdding(false); } };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submitNew = async () => {
    const n = nom.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      await onAdd(n, fonction.trim());
      setNom(''); setFonction(''); setAdding(false); setOpen(false);
    } finally { setBusy(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20">
        <span className={value ? 'text-slate-800 font-medium truncate' : 'text-slate-400 truncate'}>
          {value || 'Choisir un signataire…'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-44 overflow-y-auto py-1">
            {loading ? (
              <div className="px-3 py-3 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
            ) : signataires.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-slate-400">Aucun signataire enregistré</p>
            ) : signataires.map((s) => (
              <div key={s.id} className={`group flex items-center gap-2 px-2.5 py-1.5 hover:bg-violet-50 cursor-pointer ${value === s.nom ? 'bg-violet-50/60' : ''}`}
                onClick={() => { onSelect(s.nom); setOpen(false); }}>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-slate-700 truncate">{s.nom}</span>
                  {s.fonction && <span className="block text-[10px] text-slate-400 truncate">{s.fonction}</span>}
                </span>
                {value === s.nom && <Check className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" strokeWidth={2.4} />}
                <button type="button" title="Retirer de l'annuaire"
                  onClick={(e) => { e.stopPropagation(); onRemove(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100">
            {adding ? (
              <div className="p-2 space-y-1.5">
                <input autoFocus type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); }}
                  placeholder="Nom (ex : Jean Dupont)"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                <input type="text" value={fonction} onChange={(e) => setFonction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); }}
                  placeholder="Fonction (optionnel)"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { setAdding(false); setNom(''); setFonction(''); }}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 rounded-md">Annuler</button>
                  <button type="button" onClick={submitNew} disabled={!nom.trim() || busy}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md disabled:opacity-50">
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2.4} />} Ajouter
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                className="w-full flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-violet-600 hover:bg-violet-50">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Nouveau signataire
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FieldsPlacementModal({ file, initial, onConfirm, onClose }) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fields, setFields] = useState(initial?.champs ? initial.champs.map(f => ({ ...f })) : []);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null); // champ Texte en cours d'écriture sur le PDF
  const [textTool, setTextTool] = useState(false); // mode « écrire sur le PDF » (façon Acrobat)
  const [cachetFile, setCachetFile] = useState(null);
  const [cachetPreview, setCachetPreview] = useState(initial?.cachetPreview || null);
  const [zoom, setZoom] = useState(1); // 1 = ajusté à la largeur
  const [ghost, setGhost] = useState(null); // aperçu flottant pendant le drag depuis la palette
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 }); // taille affichée du PDF (px) — pour caler la police

  // Signature de l'employeur (vous) — dessinée maintenant via un pavé
  const [employeurSignatureFile, setEmployeurSignatureFile] = useState(null);
  const [employeurSignaturePreview, setEmployeurSignaturePreview] = useState(initial?.employeurSignaturePreview || null);
  const [employeurNom, setEmployeurNom] = useState(initial?.employeurNom || '');
  const [showPad, setShowPad] = useState(false);

  // Annuaire des employeurs signataires (réutilisable)
  const [signataires, setSignataires] = useState([]);
  const [signatairesLoading, setSignatairesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/documents-rh/signataires`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setSignataires(Array.isArray(res.data) ? res.data : []);
      } catch (e) { /* silencieux */ }
      finally { if (!cancelled) setSignatairesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const addSignataire = async (nom, fonction) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE}/api/documents-rh/signataires`, { nom, fonction }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const created = res.data;
      setSignataires((prev) => prev.some((s) => s.id === created.id) ? prev : [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)));
      setEmployeurNom(created.nom);
    } catch (e) { /* silencieux */ }
  };

  const removeSignataire = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/api/documents-rh/signataires/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSignataires((prev) => prev.filter((s) => s.id !== id));
    } catch (e) { /* silencieux */ }
  };
  const pendingEmployeurAdd = useRef(false);

  const canvasRef = useRef(null);
  const pageWrapRef = useRef(null);
  const scrollRef = useRef(null);
  const renderTaskRef = useRef(null);
  const dragRef = useRef(null);
  const paletteRef = useRef(null);
  const cachetInputRef = useRef(null);
  const pendingCachetAdd = useRef(false);
  const textCacheRef = useRef({}); // { [pageNum]: [{ str, xPct, yPct, wPct, hPct }] }

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const zoomFit = () => setZoom(1);

  // --- Chargement du PDF ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage((p) => Math.min(p, doc.numPages));
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError('Impossible de charger le PDF'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // --- Rendu de la page courante (haute résolution + zoom, façon iLovePDF) ---
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return;
    try {
      const pdfPage = await pdf.getPage(page);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      // Largeur disponible dans le conteneur de défilement (moins le padding)
      const container = scrollRef.current;
      const avail = container ? Math.max(280, container.clientWidth - 48) : 600;
      const fitScale = avail / baseViewport.width;
      const displayScale = Math.max(0.2, fitScale * zoom);
      const viewport = pdfPage.getViewport({ scale: displayScale });
      // Rendu net sur écrans haute densité
      const dpr = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      setCanvasSize({ w: Math.floor(viewport.width), h: Math.floor(viewport.height) });
      if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch (e) { /* ignore */ } }
      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
      const task = pdfPage.render({ canvasContext: ctx, viewport, transform });
      renderTaskRef.current = task;
      await task.promise;
    } catch (e) {
      if (e && e.name !== 'RenderingCancelledException') setError('Erreur de rendu de la page');
    }
  }, [pdf, page, zoom]);

  useEffect(() => { renderPage(); }, [renderPage]);
  useEffect(() => {
    const onResize = () => renderPage();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [renderPage]);

  // --- Extraction du texte existant d'une page (pour pouvoir le modifier façon Acrobat) ---
  const ensurePageText = useCallback(async (pageNum) => {
    if (textCacheRef.current[pageNum]) return textCacheRef.current[pageNum];
    if (!pdf) return [];
    try {
      const p = await pdf.getPage(pageNum);
      const vp = p.getViewport({ scale: 1 });
      const tc = await p.getTextContent();
      const styles = tc.styles || {};
      const items = (tc.items || [])
        .filter((it) => it.str && it.str.trim())
        .map((it) => {
          const tx = pdfjsLib.Util.transform(vp.transform, it.transform);
          const fontH = Math.hypot(tx[2], tx[3]) || it.height || 10;
          const left = tx[4];
          const top = tx[5] - fontH; // tx[5] = ligne de base → haut du glyphe
          const w = it.width || fontH * (it.str.length * 0.5);
          // Détection de la police d'origine (famille + graisse + italique) pour la reproduire
          const style = styles[it.fontName] || {};
          const sig = `${it.fontName || ''} ${style.fontFamily || ''}`.toLowerCase();
          const bold = /bold|black|heavy|semibold|\bbd\b/.test(sig) || (style.fontWeight && Number(style.fontWeight) >= 600);
          const italic = /italic|oblique/.test(sig);
          const mono = /mono|courier|consol/.test(sig);
          const sans = /sans|arial|helvetica|verdana|tahoma|calibri|segoe|roboto/.test(sig);
          const serif = !sans && /serif|times|roman|georgia|minion|garamond|cambria/.test(sig);
          const cssFamily = mono ? "'Courier New', monospace"
            : serif ? "Georgia, 'Times New Roman', serif"
            : "Arial, Helvetica, sans-serif";
          const genFamily = mono ? 'courier' : serif ? 'times' : 'helvetica';
          return {
            str: it.str,
            xPct: left / vp.width,
            yPct: top / vp.height,
            wPct: w / vp.width,
            hPct: fontH / vp.height,
            bold, italic, cssFamily, genFamily,
          };
        });
      textCacheRef.current[pageNum] = items;
      return items;
    } catch (e) {
      textCacheRef.current[pageNum] = [];
      return [];
    }
  }, [pdf]);

  // Pré-charge le texte de la page courante (clic « modifier » instantané)
  useEffect(() => { if (pdf) ensurePageText(page); }, [pdf, page, ensurePageText]);

  // --- Ajout d'un champ (clic = centré, ou à une position de drop) ---
  const addFieldAt = (type, xPct, yPct, targetPage, opts = {}) => {
    const t = FIELD_TYPES[type];
    const pg = targetPage || page;
    const wPct = opts.wPct != null ? opts.wPct : t.defW;
    const hPct = opts.hPct != null ? opts.hPct : t.defH;
    const f = {
      id: uid(),
      type,
      page: pg,
      xPct: xPct != null ? clamp(xPct, 0, 1 - wPct) : clamp(0.5 - wPct / 2, 0, 1 - wPct),
      yPct: yPct != null ? clamp(yPct, 0, 1 - hPct) : clamp(0.45, 0, 1 - hPct),
      wPct,
      hPct,
      ...(type === 'mention' ? {
        text: opts.text != null ? opts.text : '',
        cover: !!opts.cover,
        ...(opts.bold ? { bold: true } : {}),
        ...(opts.italic ? { italic: true } : {}),
        ...(opts.cssFamily ? { cssFamily: opts.cssFamily } : {}),
        ...(opts.genFamily ? { genFamily: opts.genFamily } : {}),
        ...(opts.fontHpct ? { fontHpct: opts.fontHpct } : {}),
      } : {}),
    };
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
    if (type === 'mention') setEditingId(f.id); // écrire tout de suite sur le PDF
    return f;
  };

  // Trouve la ligne de texte située sous le clic (tolérance verticale généreuse)
  const findLineAnchor = (items, xPct, yPct) => {
    let near = null, best = Infinity;
    for (const it of items) {
      const top = it.yPct - it.hPct * 0.8;
      const bot = it.yPct + it.hPct * 1.8;
      if (yPct < top || yPct > bot) continue;
      const inside = xPct >= it.xPct - 0.01 && xPct <= it.xPct + it.wPct + 0.01;
      const cx = it.xPct + it.wPct / 2;
      const d = inside ? -1 : Math.abs(cx - xPct);
      if (d < best) { best = d; near = it; }
    }
    return near;
  };

  // Regroupe toute la ligne partageant la même ligne de base que l'ancre + reconstruit le texte
  const buildLine = (items, anchor) => {
    const baseOf = (it) => it.yPct + it.hPct;
    const hb = baseOf(anchor);
    const line = items
      .filter((it) => Math.abs(baseOf(it) - hb) < anchor.hPct * 0.6)
      .sort((a, b) => a.xPct - b.xPct);
    if (!line.length) return null;
    const minX = Math.min(...line.map((i) => i.xPct));
    const maxX = Math.max(...line.map((i) => i.xPct + i.wPct));
    const minY = Math.min(...line.map((i) => i.yPct));
    const maxY = Math.max(...line.map((i) => i.yPct + i.hPct));
    let text = '';
    for (let k = 0; k < line.length; k++) {
      if (k > 0) {
        const gap = line[k].xPct - (line[k - 1].xPct + line[k - 1].wPct);
        const sp = Math.max(0, Math.round(gap / (line[k].hPct * 0.28)));
        text += ' '.repeat(Math.min(sp, 8));
      }
      text += line[k].str;
    }
    return { minX, maxX, minY, maxY, text };
  };

  // --- Outil « Texte » (façon Adobe Acrobat) ---
  //  • Clic sur une ligne de texte  → on la modifie (toute la ligne est masquée et ré-éditable).
  //  • Clic sur une zone vide       → on ajoute du texte libre.
  const handlePageTextClick = async (e) => {
    if (!textTool) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    const items = await ensurePageText(page);
    const anchor = findLineAnchor(items, xPct, yPct);
    const line = anchor ? buildLine(items, anchor) : null;
    if (anchor && line) {
      // On masque toute la ligne d'origine, puis on la rend éditable (police reproduite)
      const padY = anchor.hPct * 0.35;
      const padX = 0.004;
      addFieldAt('mention', line.minX - padX, line.minY - padY, page, {
        wPct: Math.min(0.99, (line.maxX - line.minX) + padX * 2),
        hPct: (line.maxY - line.minY) + padY * 2,
        text: line.text,
        cover: true,
        bold: anchor.bold, italic: anchor.italic,
        cssFamily: anchor.cssFamily, genFamily: anchor.genFamily,
        fontHpct: anchor.hPct, // taille de police d'origine (fraction de la hauteur de page)
      });
    } else {
      // Texte libre à l'endroit du clic
      const t = FIELD_TYPES.mention;
      addFieldAt('mention', xPct, yPct - t.defH / 2, page);
    }
  };

  // --- Drag-and-drop d'un champ depuis la palette (style iLovePDF) ---
  const startPaletteDrag = (e, type) => {
    e.preventDefault();
    if (type === 'cachet' && !cachetPreview) {
      pendingCachetAdd.current = true;
      cachetInputRef.current?.click();
      return;
    }
    if (type === 'signature_employeur' && !employeurSignaturePreview) {
      pendingEmployeurAdd.current = true;
      setShowPad(true);
      return;
    }
    paletteRef.current = { type, startX: e.clientX, startY: e.clientY, moved: false };
    window.addEventListener('pointermove', onPaletteMove);
    window.addEventListener('pointerup', onPaletteUp);
  };

  const onPaletteMove = (e) => {
    const p = paletteRef.current;
    if (!p) return;
    if (!p.moved && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 6) p.moved = true;
    if (p.moved) setGhost({ type: p.type, x: e.clientX, y: e.clientY });
  };

  const onPaletteUp = (e) => {
    const p = paletteRef.current;
    window.removeEventListener('pointermove', onPaletteMove);
    window.removeEventListener('pointerup', onPaletteUp);
    paletteRef.current = null;
    setGhost(null);
    if (!p) return;
    const canvas = canvasRef.current;
    if (p.moved && canvas) {
      const rect = canvas.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        const t = FIELD_TYPES[p.type];
        const xPct = (e.clientX - rect.left) / rect.width - t.defW / 2;
        const yPct = (e.clientY - rect.top) / rect.height - t.defH / 2;
        addFieldAt(p.type, xPct, yPct);
      }
      return; // déposé hors du document → annulé
    }
    addFieldAt(p.type); // simple clic → centré
  };

  const onCachetPicked = (e) => {
    const file2 = e.target.files?.[0];
    e.target.value = '';
    if (!file2) { pendingCachetAdd.current = false; return; }
    setCachetFile(file2);
    const reader = new FileReader();
    reader.onload = () => {
      setCachetPreview(reader.result);
      if (pendingCachetAdd.current) {
        pendingCachetAdd.current = false;
        addFieldAt('cachet');
      }
    };
    reader.readAsDataURL(file2);
  };

  // Validation du pavé de signature employeur
  const onEmployeurSigned = (dataUrl) => {
    setEmployeurSignaturePreview(dataUrl);
    setEmployeurSignatureFile(dataUrlToFile(dataUrl, 'signature-employeur.png'));
    setShowPad(false);
    if (pendingEmployeurAdd.current) {
      pendingEmployeurAdd.current = false;
      addFieldAt('signature_employeur');
    }
  };

  const removeField = (id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  };
  const updateField = (id, patch) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  // --- Drag & resize ---
  const startDrag = (e, id, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    dragRef.current = {
      id, mode,
      startX: e.clientX, startY: e.clientY,
      rectW: rect.width, rectH: rect.height,
      box: { ...field },
    };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  };

  const onDragMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.rectW;
    const dy = (e.clientY - d.startY) / d.rectH;
    const b = d.box;
    const MINW = 0.04, MINH = 0.022;
    if (d.mode === 'move') {
      updateField(d.id, {
        xPct: clamp(b.xPct + dx, 0, 1 - b.wPct),
        yPct: clamp(b.yPct + dy, 0, 1 - b.hPct),
      });
      return;
    }
    // Redimensionnement par coin (nw, ne, sw, se) — l'angle opposé reste fixe
    let x1 = b.xPct, y1 = b.yPct, x2 = b.xPct + b.wPct, y2 = b.yPct + b.hPct;
    if (d.mode.includes('e')) x2 = clamp(b.xPct + b.wPct + dx, b.xPct + MINW, 1);
    if (d.mode.includes('w')) x1 = clamp(b.xPct + dx, 0, x2 - MINW);
    if (d.mode.includes('s')) y2 = clamp(b.yPct + b.hPct + dy, b.yPct + MINH, 1);
    if (d.mode.includes('n')) y1 = clamp(b.yPct + dy, 0, y2 - MINH);
    updateField(d.id, { xPct: x1, yPct: y1, wPct: x2 - x1, hPct: y2 - y1 });
  };

  const onDragEnd = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  };

  const handleConfirm = () => {
    const champs = fields.map((f) => ({
      id: f.id,
      type: f.type,
      page: f.page,
      xPct: +f.xPct.toFixed(4),
      yPct: +f.yPct.toFixed(4),
      wPct: +f.wPct.toFixed(4),
      hPct: +f.hPct.toFixed(4),
      ...(f.type === 'mention' ? {
        text: f.text || '',
        cover: !!f.cover,
        ...(f.bold ? { bold: true } : {}),
        ...(f.italic ? { italic: true } : {}),
        ...(f.genFamily ? { genFamily: f.genFamily } : {}),
        ...(f.fontHpct ? { fontHpct: +f.fontHpct.toFixed(5) } : {}),
      } : {}),
    }));
    onConfirm({
      champs, cachetFile, cachetPreview,
      employeurSignatureFile, employeurSignaturePreview, employeurNom: employeurNom.trim(),
    });
  };

  const selField = fields.find((f) => f.id === selectedId) || null;
  const pageFields = fields.filter((f) => f.page === page);
  const countByType = fields.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {});
  const pagesWithFields = new Set(fields.map((f) => f.page));

  // Carte de champ (palette) — glissable + cliquable
  const PaletteCard = ({ typeKey }) => {
    const t = FIELD_TYPES[typeKey];
    const Icon = t.icon;
    const n = countByType[typeKey] || 0;
    return (
      <button type="button"
        onPointerDown={(e) => startPaletteDrag(e, typeKey)}
        onClick={() => { /* l'ajout au clic est géré dans onPaletteUp */ }}
        className="group relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-white hover:shadow-md hover:-translate-y-px transition-all text-left touch-none select-none"
        style={{ borderColor: `${t.color}33` }}
        title={`Glisser sur le document ou cliquer pour ajouter — ${t.label}`}>
        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" strokeWidth={2} />
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${t.color}1a`, color: t.color }}>
          <Icon className="w-4 h-4" strokeWidth={2} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[12.5px] font-semibold text-slate-700 leading-tight">{t.label}</span>
          <span className="block text-[10.5px] text-slate-400 truncate">{t.desc}</span>
        </span>
        {n > 0 ? (
          <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.color }}>{n}</span>
        ) : (
          <Plus className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" strokeWidth={2} />
        )}
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[96vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#cf292c] text-white flex items-center justify-center">
              <PenLine className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">Préparer le document à signer</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[420px]">{file?.name || 'Document PDF'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-slate-400">
              {fields.length} champ{fields.length > 1 ? 's' : ''} placé{fields.length > 1 ? 's' : ''}
            </span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Corps : miniatures | document | palette */}
        <div className="flex-1 flex min-h-0">
          {/* Colonne miniatures */}
          {numPages > 1 && (
            <aside className="hidden lg:flex w-28 flex-shrink-0 border-r border-slate-100 bg-slate-50/80 flex-col">
              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pages</div>
              <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-2">
                {Array.from({ length: numPages }, (_, i) => (
                  <Thumb key={i + 1} pdf={pdf} pageNumber={i + 1} active={page === i + 1}
                    hasFields={pagesWithFields.has(i + 1)} onClick={() => setPage(i + 1)} />
                ))}
              </div>
            </aside>
          )}

          {/* Colonne centrale : barre d'outils + document */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Barre d'outils */}
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              </button>
              <span className="text-xs font-medium text-slate-600 tabular-nums min-w-[78px] text-center">Page {page} / {numPages}</span>
              <button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </button>

              {/* Outil « Texte » façon Acrobat : modifier le texte existant ou en ajouter */}
              <button type="button" onClick={() => { setTextTool((v) => !v); setSelectedId(null); setEditingId(null); }}
                title="Modifier le PDF : cliquez sur un texte existant pour le corriger, ou sur une zone vide pour écrire"
                className={`ml-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-semibold transition-colors ${textTool ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Type className="w-4 h-4" strokeWidth={2} />
                {textTool ? 'Cliquez sur le texte…' : 'Modifier le PDF'}
              </button>

              <div className="ml-auto flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-0.5">
                <button type="button" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Dézoomer"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                  <ZoomOut className="w-4 h-4" strokeWidth={2} />
                </button>
                <button type="button" onClick={zoomFit} title="Ajuster à la largeur"
                  className="px-1.5 min-w-[46px] text-[11px] font-semibold text-slate-600 tabular-nums hover:text-[#cf292c]">
                  {Math.round(zoom * 100)}%
                </button>
                <button type="button" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Zoomer"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                  <ZoomIn className="w-4 h-4" strokeWidth={2} />
                </button>
                <span className="w-px h-4 bg-slate-200 mx-0.5" />
                <button type="button" onClick={zoomFit} title="Réinitialiser le zoom"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
                  <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Zone document (scroll deux axes) */}
            <div ref={scrollRef} className="flex-1 overflow-auto bg-slate-200/70" onClick={() => { setSelectedId(null); setEditingId(null); }}>
              {loading && (
                <div className="flex flex-col items-center justify-center text-slate-400 py-20 gap-2">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-sm">Chargement du document…</span>
                </div>
              )}
              {error && <div className="text-red-500 text-sm py-20 text-center">{error}</div>}
              {!loading && !error && (
                <div className="min-h-full w-max min-w-full flex items-start justify-center p-6">
                  <div ref={pageWrapRef} className={`relative inline-block shadow-xl ring-1 ring-black/5 ${textTool ? 'cursor-text' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => { if (textTool) { e.stopPropagation(); handlePageTextClick(e); } }}>
                    <canvas ref={canvasRef} className="block bg-white" />
                    {pageFields.map((f) => {
                      const t = FIELD_TYPES[f.type];
                      const Icon = t.icon;
                      const sel = f.id === selectedId;
                      const editing = f.id === editingId;
                      const handles = ['nw', 'ne', 'sw', 'se'];
                      // Police reproduite pour les champs Texte (édition d'un texte existant)
                      const mFontPx = f.type === 'mention' && f.fontHpct && canvasSize.h ? f.fontHpct * canvasSize.h : null;
                      const mentionStyle = {
                        fontFamily: f.cssFamily || undefined,
                        fontWeight: f.bold ? 700 : 500,
                        fontStyle: f.italic ? 'italic' : 'normal',
                        fontSize: mFontPx ? `${mFontPx}px` : 'clamp(9px, 1.4vw, 16px)',
                        whiteSpace: mFontPx ? 'pre' : 'pre-wrap',
                      };
                      return (
                        <div key={f.id}
                          onPointerDown={(e) => { if (editing) return; e.stopPropagation(); setSelectedId(f.id); startDrag(e, f.id, 'move'); }}
                          onDoubleClick={(e) => { if (f.type === 'mention') { e.stopPropagation(); setSelectedId(f.id); setEditingId(f.id); } }}
                          className={`absolute rounded-md touch-none select-none ${editing ? 'cursor-text' : 'cursor-move'} ${sel ? 'ring-2 ring-offset-1 z-20' : 'z-10'}`}
                          style={{
                            left: `${f.xPct * 100}%`, top: `${f.yPct * 100}%`,
                            width: `${f.wPct * 100}%`, height: `${f.hPct * 100}%`,
                            border: `${sel ? 2 : 1.5}px ${sel ? 'solid' : 'dashed'} ${t.color}`,
                            backgroundColor: (f.type === 'mention' && f.cover) ? '#ffffff' : (sel ? `${t.color}14` : `${t.color}0f`),
                            '--tw-ring-color': '#2563eb',
                          }}>
                          {/* Aperçu */}
                          {f.type === 'cachet' && cachetPreview ? (
                            <img src={cachetPreview} alt="cachet" className="w-full h-full object-contain pointer-events-none p-0.5" />
                          ) : f.type === 'signature_employeur' && employeurSignaturePreview ? (
                            <img src={employeurSignaturePreview} alt="signature employeur" className="w-full h-full object-contain pointer-events-none p-0.5" />
                          ) : f.type === 'paraphe_employeur' ? (
                            <span className="absolute inset-0 flex items-center justify-center px-1 pointer-events-none truncate"
                              style={{ color: t.color, fontFamily: SCRIPT_FONT, fontSize: 'clamp(9px, 1.4vw, 18px)' }}>
                              {clientInitials(employeurNom) || 'Paraphe'}
                            </span>
                          ) : t.script ? (
                            <span className="absolute inset-0 flex items-center justify-center px-1 pointer-events-none truncate"
                              style={{ color: t.color, fontFamily: SCRIPT_FONT, fontSize: 'clamp(9px, 1.4vw, 18px)' }}>
                              {fieldPreviewText(f)}
                            </span>
                          ) : f.type === 'mention' ? (
                            editing ? (
                              <textarea autoFocus value={f.text || ''}
                                onChange={(e) => updateField(f.id, { text: e.target.value })}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.blur(); }}
                                onBlur={() => setEditingId((cur) => (cur === f.id ? null : cur))}
                                className={`absolute inset-0 w-full h-full resize-none ${f.cover ? 'bg-white' : 'bg-white/70'} outline-none px-1 py-0.5 leading-tight text-slate-900`}
                                style={{ ...mentionStyle, lineHeight: 1.05 }} />
                            ) : (
                              <span className="absolute inset-0 flex items-center px-1 leading-tight pointer-events-none whitespace-pre-wrap break-words"
                                style={{ ...mentionStyle, color: f.text ? '#0f172a' : t.color }}>
                                {f.text || 'Double-clic pour écrire'}
                              </span>
                            )
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] font-semibold pointer-events-none truncate" style={{ color: t.color }}>
                              <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={2} /> {fieldPreviewText(f)}
                            </span>
                          )}

                          {/* Badge type (coin haut-gauche) */}
                          {sel && (
                            <span className="absolute -top-5 left-0 text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap pointer-events-none" style={{ backgroundColor: t.color }}>
                              {t.label}
                            </span>
                          )}

                          {/* Supprimer */}
                          {sel && (
                            <button type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
                              className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border border-slate-300 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 z-30">
                              <Trash2 className="w-3 h-3 text-red-500" strokeWidth={2} />
                            </button>
                          )}
                          {/* Poignées de redimensionnement (4 coins) */}
                          {sel && handles.map((h) => (
                            <div key={h} onPointerDown={(e) => { e.stopPropagation(); startDrag(e, f.id, h); }}
                              className="absolute w-2.5 h-2.5 bg-white border-2 rounded-sm touch-none z-30"
                              style={{
                                borderColor: '#2563eb',
                                cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
                                top: h[0] === 'n' ? -5 : undefined,
                                bottom: h[0] === 's' ? -5 : undefined,
                                left: h[1] === 'w' ? -5 : undefined,
                                right: h[1] === 'e' ? -5 : undefined,
                              }} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Colonne palette (style iLovePDF) */}
          <aside className="w-64 sm:w-72 flex-shrink-0 border-l border-slate-100 bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3">
              {/* Éditeur du champ sélectionné */}
              {selField && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: FIELD_TYPES[selField.type].color }}>
                      {FIELD_TYPES[selField.type].label} sélectionné
                    </span>
                    <button type="button" onClick={() => removeField(selField.id)}
                      className="inline-flex items-center gap-1 text-[10.5px] text-red-500 hover:text-red-600 font-medium">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} /> Retirer
                    </button>
                  </div>
                  {selField.type === 'mention' ? (
                    <div className="space-y-1.5">
                      <textarea value={selField.text || ''} rows={2}
                        onChange={(e) => updateField(selField.id, { text: e.target.value })}
                        placeholder="Saisissez votre texte (ex : Fait à Vincennes, le 19/06/2026)"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      <button type="button" onClick={() => setEditingId(selField.id)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-[11px] font-medium hover:bg-emerald-50">
                        <Type className="w-3.5 h-3.5" strokeWidth={2} /> Écrire sur le document
                      </button>
                    </div>
                  ) : selField.type === 'cachet' ? (
                    <button type="button" onClick={() => cachetInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-[11px] font-medium hover:bg-amber-50">
                      <ImageIcon className="w-3.5 h-3.5" strokeWidth={2} /> Changer l'image du cachet
                    </button>
                  ) : selField.type === 'signature_employeur' ? (
                    <div className="space-y-2">
                      {employeurSignaturePreview && (
                        <img src={employeurSignaturePreview} alt="signature employeur"
                          className="w-full h-12 object-contain bg-white border border-slate-200 rounded-lg" />
                      )}
                      <SignatairePicker
                        signataires={signataires}
                        loading={signatairesLoading}
                        value={employeurNom}
                        onSelect={setEmployeurNom}
                        onAdd={addSignataire}
                        onRemove={removeSignataire}
                      />
                      <button type="button" onClick={() => setShowPad(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-300 text-violet-700 text-[11px] font-medium hover:bg-violet-50">
                        <PenLine className="w-3.5 h-3.5" strokeWidth={2} /> Re-signer
                      </button>
                    </div>
                  ) : selField.type === 'paraphe_employeur' ? (
                    <div className="space-y-1.5">
                      <SignatairePicker
                        signataires={signataires}
                        loading={signatairesLoading}
                        value={employeurNom}
                        onSelect={setEmployeurNom}
                        onAdd={addSignataire}
                        onRemove={removeSignataire}
                      />
                      <p className="text-[10.5px] text-slate-500 leading-snug flex items-start gap-1.5">
                        <Hash className="w-3.5 h-3.5 mt-px flex-shrink-0 text-fuchsia-500" strokeWidth={2} />
                        Vos initiales <strong className="text-slate-700">{clientInitials(employeurNom) || '—'}</strong> seront apposées ici.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 leading-snug flex items-start gap-1.5">
                      <User className="w-3.5 h-3.5 mt-px flex-shrink-0 text-slate-400" strokeWidth={2} />
                      Rempli automatiquement au moment où le salarié signe.
                    </p>
                  )}
                </div>
              )}

              {/* Champs remplis par le salarié */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Le salarié remplira</p>
                <div className="space-y-2">
                  {EMPLOYEE_FIELDS.map((k) => <PaletteCard key={k} typeKey={k} />)}
                </div>
              </div>

              {/* Champs apposés par l'employeur (vous) */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 mb-1.5">Côté employeur (vous)</p>
                <div className="space-y-2">
                  {EMPLOYER_FIELDS.map((k) => <PaletteCard key={k} typeKey={k} />)}
                </div>
              </div>

              <p className="text-[10.5px] text-slate-400 flex items-start gap-1.5 pt-1">
                <Sparkles className="w-3 h-3 mt-px text-amber-400 flex-shrink-0" strokeWidth={2} />
                Cliquez sur « Modifier le PDF » dans la barre du haut : cliquez sur un texte existant pour le corriger (l'original est masqué), ou sur une zone vide pour écrire librement — comme dans Acrobat. Le salarié signera sa partie ; votre signature est apposée dès maintenant.
              </p>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 p-3 space-y-2 flex-shrink-0">
              <button onClick={handleConfirm}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#cf292c] text-white rounded-xl font-semibold text-sm hover:bg-[#b52528] transition-colors shadow-sm">
                <Check className="w-4 h-4" strokeWidth={2.2} /> Valider ({fields.length})
              </button>
              <button onClick={onClose} className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">Annuler</button>
            </div>
          </aside>
        </div>

        {/* Aperçu flottant pendant le glisser-déposer */}
        {ghost && (() => {
          const t = FIELD_TYPES[ghost.type];
          const Icon = t.icon;
          return (
            <div className="fixed z-[120] pointer-events-none -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 text-[11px] font-semibold text-white"
              style={{ left: ghost.x, top: ghost.y, backgroundColor: t.color }}>
              <Icon className="w-3.5 h-3.5" strokeWidth={2} /> {t.label}
            </div>
          );
        })()}

        <input ref={cachetInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onCachetPicked} />

        {/* Pavé de signature employeur */}
        {showPad && (
          <SignaturePad
            initialPreview={employeurSignaturePreview}
            onSave={onEmployeurSigned}
            onClose={() => { pendingEmployeurAdd.current = false; setShowPad(false); }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
