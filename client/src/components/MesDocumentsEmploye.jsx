import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { API_BASE } from '../config/api';
import {
  FileText, CheckCircle2, Clock, XCircle, Eye, X, Loader2,
  AlertTriangle, PenLine, ChevronLeft, Download, ShieldCheck, MapPin
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.js`;

// Types de champs remplis par le salarié (à mettre en évidence sur l'aperçu)
const EMPLOYEE_FIELD_LABELS = {
  signature: 'Votre signature',
  initiales: 'Vos initiales',
  nom: 'Votre nom',
  date: 'Date',
};

export default function MesDocumentsEmploye({ onBack, embedded = false }) {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDocs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/documents-rh/mes-documents`, { headers });
      setSignatures(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const pending = signatures.filter(s => s.statut === 'pending' || s.statut === 'read');
  const completed = signatures.filter(s => s.statut === 'signed' || s.statut === 'refused');

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[#cf292c]" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mes Documents</h1>
            <p className="text-sm text-slate-500">Documents à consulter et signer</p>
          </div>
        </div>
      )}

      {/* À signer */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-2">
            <PenLine className="w-3.5 h-3.5" />
            À signer ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(sig => (
              <DocumentItemEmploye key={sig.id} sig={sig} onOpen={() => setSelectedDoc(sig)} />
            ))}
          </div>
        </div>
      )}

      {/* Complétés */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Historique</h2>
          <div className="space-y-2">
            {completed.map(sig => (
              <DocumentItemEmploye key={sig.id} sig={sig} onOpen={() => setSelectedDoc(sig)} />
            ))}
          </div>
        </div>
      )}

      {signatures.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1} />
          <p className="text-sm font-medium">Aucun document</p>
        </div>
      )}

      {/* Modal signature */}
      {selectedDoc && (
        <SignatureModal sig={selectedDoc} onClose={() => setSelectedDoc(null)} onRefresh={fetchDocs} />
      )}
    </div>
  );
}

// ===== Item document employé =====
function DocumentItemEmploye({ sig, onOpen }) {
  const statutConfig = {
    pending: { label: 'À signer', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    read: { label: 'Lu', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Eye },
    signed: { label: 'Signé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    refused: { label: 'Refusé', color: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
  };
  const cfg = statutConfig[sig.statut] || statutConfig.pending;
  const Icon = cfg.icon;
  const isPending = sig.statut === 'pending' || sig.statut === 'read';

  return (
    <button onClick={onOpen}
      className={`w-full text-left p-4 rounded-xl border transition-all ${isPending ? 'border-amber-200 bg-amber-50/30 hover:shadow-md' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPending ? 'bg-amber-100' : 'bg-slate-100'}`}>
          <FileText className={`w-5 h-5 ${isPending ? 'text-amber-600' : 'text-slate-400'}`} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 truncate">{sig.document?.titre}</h3>
          {sig.document?.description && <p className="text-xs text-slate-500 truncate mt-0.5">{sig.document.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            <span>{format(new Date(sig.createdAt), 'd MMM yyyy', { locale: fr })}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
              <Icon className="w-3 h-3" strokeWidth={2} />{cfg.label}
            </span>
          </div>
        </div>
        {isPending && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#cf292c] text-white text-xs font-semibold shadow-sm">
              <PenLine className="w-3.5 h-3.5" strokeWidth={2} />Signer
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// ===== Guide visuel de placement de la signature (aperçu du PDF) =====
function SignatureFieldGuide({ fichierUrl, champs }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const pdfRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Champs remplis par le salarié uniquement
  const employeeFields = (Array.isArray(champs) ? champs : []).filter(
    (c) => EMPLOYEE_FIELD_LABELS[c?.type]
  );
  // Page à afficher = celle du premier champ « signature » (ou du premier champ salarié)
  const targetPage =
    (employeeFields.find((c) => c.type === 'signature') || employeeFields[0])?.page || 1;
  const pageFields = employeeFields.filter((c) => (c.page || 1) === targetPage);

  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current;
    if (!pdf || !canvasRef.current) return;
    try {
      const pageNum = Math.min(targetPage, pdf.numPages);
      const pdfPage = await pdf.getPage(pageNum);
      const base = pdfPage.getViewport({ scale: 1 });
      const avail = wrapRef.current ? Math.max(220, wrapRef.current.clientWidth) : 320;
      const scale = avail / base.width;
      const viewport = pdfPage.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      setSize({ w: Math.floor(viewport.width), h: Math.floor(viewport.height) });
      if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch (e) { /* ignore */ } }
      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
      const task = pdfPage.render({ canvasContext: ctx, viewport, transform });
      renderTaskRef.current = task;
      await task.promise;
    } catch (e) {
      if (e && e.name !== 'RenderingCancelledException') setError(true);
    }
  }, [targetPage]);

  // Chargement du PDF (avec token d'authentification)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const token = localStorage.getItem('token') || '';
        const url = `${API_BASE}${fichierUrl}${fichierUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
        const res = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(res.data) }).promise;
        if (cancelled) return;
        pdfRef.current = doc;
        await renderPage();
      } catch (e) {
        if (!cancelled) { setError(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichierUrl]);

  // Re-rendu si la largeur change
  useEffect(() => {
    const onResize = () => renderPage();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [renderPage]);

  if (employeeFields.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[#cf292c]">
        <MapPin className="w-4 h-4" strokeWidth={2} />
        <p className="text-xs font-semibold">Où va votre signature</p>
        {pdfRef.current && pdfRef.current.numPages > 1 && (
          <span className="text-[10px] text-slate-400 font-medium">· page {targetPage}</span>
        )}
      </div>
      <div ref={wrapRef} className="relative rounded-xl border border-slate-200 bg-slate-100 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
        {error && !loading && (
          <div className="flex items-center gap-2 px-3 py-6 text-xs text-slate-400 justify-center">
            <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
            Aperçu indisponible
          </div>
        )}
        <div className="relative inline-block" style={{ display: loading || error ? 'none' : 'inline-block' }}>
          <canvas ref={canvasRef} className="block" />
          {/* Surbrillance des champs du salarié */}
          {size.w > 0 && pageFields.map((c, i) => (
            <div
              key={c.id || i}
              className="absolute rounded-md border-2 border-[#cf292c] bg-[#cf292c]/10 flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]"
              style={{
                left: `${(c.xPct || 0) * size.w}px`,
                top: `${(c.yPct || 0) * size.h}px`,
                width: `${(c.wPct || 0.2) * size.w}px`,
                height: `${(c.hPct || 0.06) * size.h}px`,
              }}
            >
              <span className="px-1 text-[9px] font-bold text-[#cf292c] truncate leading-none">
                {EMPLOYEE_FIELD_LABELS[c.type]}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-snug">
        L'emplacement encadré indique où votre signature sera apposée sur le document.
      </p>
    </div>
  );
}

// ===== Modal Signature Employé =====
function SignatureModal({ sig, onClose, onRefresh }) {
  const [mode, setMode] = useState(null); // null | 'sign' | 'refuse'
  const [motifRefus, setMotifRefus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [consent, setConsent] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const doc = sig.document;
  const isPending = sig.statut === 'pending' || sig.statut === 'read';

  // Champs de signature placés par l'admin (guide visuel)
  let champs = [];
  try { champs = doc.signatureChamps ? JSON.parse(doc.signatureChamps) : []; } catch (e) { champs = []; }

  // Marquer comme lu
  useEffect(() => {
    if (isPending) {
      axios.post(`${API_BASE}/api/documents-rh/${doc.id}/voir`, {}, { headers }).catch(() => {});
    }
  }, []);

  // --- Canvas signature ---
  const getCtx = () => canvasRef.current?.getContext('2d');

  const startDraw = (e) => {
    const ctx = getCtx();
    if (!ctx) return;
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature) { setError('Veuillez dessiner votre signature'); return; }
    if (!consent) { setError('Veuillez confirmer avoir lu et approuvé le document'); return; }
    setError(null);
    try {
      setLoading(true);
      const signatureData = canvasRef.current.toDataURL('image/png');
      await axios.post(`${API_BASE}/api/documents-rh/${doc.id}/signer`, { signatureData, consentement: true }, { headers });
      setSuccess('Document signé avec succès !');
      setTimeout(() => { onRefresh(); onClose(); }, 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors de la signature');
    } finally { setLoading(false); }
  };

  const handleRefuse = async () => {
    if (!motifRefus.trim()) { setError('Indiquez un motif de refus'); return; }
    setError(null);
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/documents-rh/${doc.id}/refuser`, { motif: motifRefus.trim() }, { headers });
      setSuccess('Document refusé');
      setTimeout(() => { onRefresh(); onClose(); }, 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur');
    } finally { setLoading(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[88vh] sm:max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#cf292c] text-white flex items-center justify-center">
              <FileText className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 truncate max-w-[200px]">{doc.titre}</h2>
              <p className="text-[11px] text-slate-400">
                {format(new Date(sig.createdAt), 'd MMM yyyy', { locale: fr })} · {doc.createdBy?.prenom} {doc.createdBy?.nom}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-2 rounded-lg text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />{success}
            </div>
          )}

          {/* Document texte */}
          {doc.contenu && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-52 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{doc.contenu}</p>
            </div>
          )}

          {/* Fichier PDF */}
          {doc.fichierUrl && (
            <a href={`${API_BASE}${doc.fichierUrl}${doc.fichierUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(localStorage.getItem('token') || '')}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#cf292c]/40 hover:bg-red-50/30 transition-colors">
              <FileText className="w-5 h-5 text-[#cf292c]" strokeWidth={1.5} />
              <span className="text-sm font-medium text-slate-700">Voir le document PDF</span>
            </a>
          )}

          {/* Déjà signé */}
          {sig.statut === 'signed' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-emerald-700">Signé le {format(new Date(sig.signedAt), 'd MMM yyyy à HH:mm', { locale: fr })}</p>
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  window.open(`${API_BASE}/api/documents-rh/${doc.id}/pdf-signe?token=${encodeURIComponent(token)}`, '_blank');
                }}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#cf292c] text-white rounded-xl font-semibold text-sm hover:bg-[#b52528] transition-colors">
                <Download className="w-4 h-4" strokeWidth={2} />
                Télécharger le PDF signé
              </button>
            </div>
          )}

          {/* Déjà refusé */}
          {sig.statut === 'refused' && (
            <div className="text-center py-4">
              <XCircle className="w-10 h-10 mx-auto text-red-400 mb-2" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-red-600">Refusé</p>
              {sig.motifRefus && <p className="text-xs text-slate-500 mt-1">Motif : {sig.motifRefus}</p>}
            </div>
          )}

          {/* Actions pour signatures en attente */}
          {isPending && !success && (
            <>
              {mode === null && (
                <div className="flex gap-3">
                  <button onClick={() => setMode('sign')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#cf292c] text-white rounded-xl font-semibold text-sm hover:bg-[#b52528] transition-colors shadow-sm">
                    <PenLine className="w-4 h-4" strokeWidth={2} />Signer
                  </button>
                  <button onClick={() => setMode('refuse')}
                    className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-xl font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <XCircle className="w-4 h-4" strokeWidth={1.5} />Refuser
                  </button>
                </div>
              )}

              {/* Mode signature */}
              {mode === 'sign' && (
                <div className="space-y-3">
                  {/* Guide visuel : emplacement de la signature sur le PDF */}
                  {doc.fichierUrl && champs.length > 0 && (
                    <SignatureFieldGuide fichierUrl={doc.fichierUrl} champs={champs} />
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Dessinez votre signature ci-dessous :</p>
                    <button onClick={clearCanvas} className="text-[11px] text-slate-400 hover:text-slate-600 underline">Effacer</button>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white touch-none">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="w-full h-[150px] cursor-crosshair"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                  </div>
                  {/* Consentement « Lu et approuvé » */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#cf292c] focus:ring-[#cf292c]/30 flex-shrink-0"
                    />
                    <span className="text-[12px] text-slate-600 leading-snug">
                      <span className="font-semibold text-slate-700">Lu et approuvé.</span> Je certifie avoir lu et approuvé l'intégralité de ce document. Cette signature électronique a valeur juridique.
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => setMode(null)} className="px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">Retour</button>
                    <button onClick={handleSign} disabled={loading || !hasSignature || !consent}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" strokeWidth={2} />}
                      Confirmer la signature
                    </button>
                  </div>
                </div>
              )}

              {/* Mode refus */}
              {mode === 'refuse' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Motif de refus :</p>
                  <textarea value={motifRefus} onChange={e => setMotifRefus(e.target.value)} rows={3} placeholder="Expliquez pourquoi vous refusez de signer..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
                  <div className="flex gap-3">
                    <button onClick={() => setMode(null)} className="px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">Retour</button>
                    <button onClick={handleRefuse} disabled={loading || !motifRefus.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" strokeWidth={2} />}
                      Confirmer le refus
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
