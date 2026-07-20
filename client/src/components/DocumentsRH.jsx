import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { API_BASE } from '../config/api';
import {
  FileText, Plus, Send, Search, Eye, Trash2, Bell,
  CheckCircle2, Clock, AlertTriangle, XCircle, Users,
  X, Upload, Loader2, PenLine, Paperclip, ExternalLink, Download,
  Move, Check, ShieldCheck
} from 'lucide-react';
import FieldsPlacementModal from './FieldsPlacementModal';
import './animations.css';

export default function DocumentsRH() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, signed, refused
  const [search, setSearch] = useState('');
  const [employes, setEmployes] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // document à supprimer (modale de confirmation)
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/documents-rh`, { headers });
      setDocuments(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchEmployes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/employes`, { headers });
      setEmployes((res.data || []).filter(e => e.statut === 'actif'));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchDocuments(); fetchEmployes(); }, []);

  const filteredDocs = useMemo(() => {
    let docs = documents;
    if (filter !== 'all') {
      docs = docs.filter(d => {
        if (filter === 'pending') return d.stats.pending > 0 || d.stats.read > 0;
        if (filter === 'signed') return d.stats.signed === d.stats.total;
        if (filter === 'refused') return d.stats.refused > 0;
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(d => d.titre.toLowerCase().includes(q));
    }
    return docs;
  }, [documents, filter, search]);

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/api/documents-rh/${deleteTarget.id}`, { headers });
      setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
      if (selectedDoc?.id === deleteTarget.id) setSelectedDoc(null);
      setDeleteTarget(null);
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  const handleRelance = async (docId, signatureId) => {
    try {
      await axios.post(`${API_BASE}/api/documents-rh/${docId}/relance/${signatureId}`, {}, { headers });
    } catch (e) { console.error(e); }
  };

  // ===== Stats globales =====
  const globalStats = useMemo(() => {
    let total = 0, signed = 0, pending = 0, refused = 0;
    documents.forEach(d => {
      total += d.stats.total;
      signed += d.stats.signed;
      pending += d.stats.pending + d.stats.read;
      refused += d.stats.refused;
    });
    return { total, signed, pending, refused };
  }, [documents]);

  // ===== Compteurs par filtre =====
  const filterCounts = useMemo(() => {
    let pending = 0, signed = 0, refused = 0;
    documents.forEach(d => {
      if (d.stats.pending > 0 || d.stats.read > 0) pending++;
      if (d.stats.total > 0 && d.stats.signed === d.stats.total) signed++;
      if (d.stats.refused > 0) refused++;
    });
    return { all: documents.length, pending, signed, refused };
  }, [documents]);

  const completionRate = globalStats.total > 0 ? Math.round((globalStats.signed / globalStats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-gray-50 min-h-[calc(100vh-3rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-[#cf292c]" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-[calc(100vh-3rem)]">
      {/* Métriques principales style CongesTable */}
      <div className="grid gap-2 sm:gap-3 grid-cols-4 mb-4">
        {[
          { key: 'all', label: 'Total envoyés', value: globalStats.total, icon: Send, iconBg: 'bg-gray-100 border-gray-200', iconColor: 'text-gray-700', valueColor: 'text-gray-900' },
          { key: 'pending', label: 'En attente', value: globalStats.pending, icon: Clock, iconBg: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-600', valueColor: 'text-amber-600' },
          { key: 'signed', label: 'Signés', value: globalStats.signed, icon: CheckCircle2, iconBg: 'bg-green-50 border-green-200', iconColor: 'text-green-600', valueColor: 'text-green-600' },
          { key: 'refused', label: 'Refusés', value: globalStats.refused, icon: XCircle, iconBg: 'bg-red-50 border-red-200', iconColor: 'text-red-600', valueColor: 'text-red-600' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`bg-white rounded-lg border p-2.5 sm:p-3 transition-colors duration-200 text-left ${filter === s.key ? 'border-[#cf292c] ring-1 ring-[#cf292c]/20' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md border flex-shrink-0 ${s.iconBg}`}>
                <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{s.label}</p>
                <p className={`text-base sm:text-lg font-bold ${s.valueColor}`}>{s.value}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Barre de filtres style pill/rounded */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Recherche */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input type="text" placeholder="Rechercher un document..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-full text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtres pill */}
          {[
            { key: 'all', label: 'Tous', count: filterCounts.all },
            { key: 'pending', label: 'En attente', count: filterCounts.pending },
            { key: 'signed', label: 'Complétés', count: filterCounts.signed },
            { key: 'refused', label: 'Refusés', count: filterCounts.refused },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                filter === f.key
                  ? 'bg-[#cf292c] text-white border-[#cf292c] shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#cf292c]/40 hover:bg-gray-50'
              }`}>
              {f.label}
              {f.count > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>{f.count}</span>
              )}
            </button>
          ))}

          {/* Bouton Nouveau document */}
          <button onClick={() => setShowCreate(true)}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-[#cf292c] text-white rounded-full text-sm font-medium hover:bg-[#b52528] transition-colors shadow-sm">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nouveau
          </button>
        </div>
      </div>

      {/* Liste documents */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
            <FileText className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {search ? 'Aucun résultat' : filter !== 'all' ? 'Aucun document dans ce filtre' : 'Aucun document'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {search ? 'Essayez un autre terme' : 'Créez votre premier document à faire signer'}
          </p>
          {!search && filter === 'all' && (
            <button onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#cf292c] text-white rounded-full text-sm font-medium hover:bg-[#b52528] transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2.5} />Nouveau document
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredDocs.map(doc => (
              <DocumentCard key={doc.id} doc={doc} onView={() => setSelectedDoc(doc)} onDelete={() => setDeleteTarget(doc)} />
            ))}
          </div>
        </div>
      )}

      {/* Modal Création */}
      {showCreate && (
        <CreateDocumentModal employes={employes} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchDocuments(); }} />
      )}

      {/* Modal Détail */}
      {selectedDoc && (
        <DocumentDetailModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} onRelance={handleRelance} onRefresh={fetchDocuments} />
      )}

      {/* Modal Confirmation suppression */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
            onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.18s_cubic-bezier(0.34,1.2,0.64,1)]">
            <div className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" strokeWidth={1.8} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Supprimer ce document ?</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-snug">
                « <span className="font-semibold text-slate-700">{deleteTarget.titre}</span> » et
                {deleteTarget.stats?.total > 0
                  ? <> ses <span className="font-semibold text-slate-700">{deleteTarget.stats.total} signature{deleteTarget.stats.total > 1 ? 's' : ''}</span> seront définitivement supprimés.</>
                  : <> toutes ses signatures seront définitivement supprimés.</>}
              </p>
              <div className="mt-3 flex items-start gap-2 text-left bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                <p className="text-[11px] text-amber-700 leading-snug">Cette action est <strong>irréversible</strong>.</p>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-70 shadow-sm">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" strokeWidth={2} />}
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ===== Carte document =====
function DocumentCard({ doc, onView, onDelete }) {
  const progress = doc.stats.total > 0 ? Math.round((doc.stats.signed / doc.stats.total) * 100) : 0;
  const typeLabels = { contrat: 'Contrat', avenant: 'Avenant', reglement: 'Règlement', note: 'Note', autre: 'Autre' };
  const typeColors = { contrat: 'bg-blue-100 text-blue-700', avenant: 'bg-purple-100 text-purple-700', reglement: 'bg-amber-100 text-amber-700', note: 'bg-gray-100 text-gray-600', autre: 'bg-gray-100 text-gray-600' };
  const enAttente = doc.stats.pending + doc.stats.read;
  const isComplete = progress === 100;

  return (
    <div onClick={onView}
      className="group flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${isComplete ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <FileText className={`w-4 h-4 ${isComplete ? 'text-green-600' : 'text-[#cf292c]'}`} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#cf292c] transition-colors">{doc.titre}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeColors[doc.type] || typeColors.autre}`}>
            {typeLabels[doc.type] || doc.type}
          </span>
          {doc.fichierUrl && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
              <Paperclip className="w-2.5 h-2.5" />PDF
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
          <span>{format(new Date(doc.createdAt), 'd MMM yyyy', { locale: fr })}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{doc.stats.total}</span>
          {doc.stats.signed > 0 && <span className="text-green-600 font-medium">{doc.stats.signed} signé{doc.stats.signed > 1 ? 's' : ''}</span>}
          {enAttente > 0 && <span className="text-amber-600 font-medium">{enAttente} en attente</span>}
          {doc.stats.refused > 0 && <span className="text-red-600 font-medium">{doc.stats.refused} refusé{doc.stats.refused > 1 ? 's' : ''}</span>}
        </div>
      </div>
      {/* Mini progress */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-[#cf292c]'}`} style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-gray-500 w-8 text-right">{progress}%</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onView(); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#cf292c] hover:bg-red-50 transition-colors" title="Détail">
          <Eye className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

// ===== Modal Création =====
function CreateDocumentModal({ employes, onClose, onSuccess }) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [contenu, setContenu] = useState('');
  const [type, setType] = useState('note');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [fichier, setFichier] = useState(null);
  const signaturePosition = 'bottom-right'; // repli par défaut (placement précis via l'éditeur de champs)
  const [champs, setChamps] = useState([]); // champs DocuSign [{id,type,page,xPct,yPct,wPct,hPct,text?}]
  const [cachetFile, setCachetFile] = useState(null);
  const [cachetPreview, setCachetPreview] = useState(null);
  const [employeurSignatureFile, setEmployeurSignatureFile] = useState(null);
  const [employeurSignaturePreview, setEmployeurSignaturePreview] = useState(null);
  const [employeurNom, setEmployeurNom] = useState('');
  const [showFields, setShowFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [empSearch, setEmpSearch] = useState('');

  const token = localStorage.getItem('token');

  const filteredEmp = useMemo(() => {
    if (!empSearch.trim()) return employes;
    const q = empSearch.toLowerCase();
    return employes.filter(e => `${e.prenom} ${e.nom}`.toLowerCase().includes(q));
  }, [employes, empSearch]);

  const handleSubmit = async () => {
    setError(null);
    if (!titre.trim()) { setError('Le titre est requis'); return; }
    if (!contenu.trim() && !fichier) { setError('Ajoutez un contenu texte ou un fichier PDF'); return; }
    if (selectedEmployees.length === 0) { setError('Sélectionnez au moins un destinataire'); return; }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('titre', titre.trim());
      formData.append('description', description.trim());
      formData.append('contenu', contenu.trim());
      formData.append('type', type);
      formData.append('employeIds', JSON.stringify(selectedEmployees));
      formData.append('signaturePosition', signaturePosition);
      if (champs.length) formData.append('signatureChamps', JSON.stringify(champs));
      if (cachetFile) formData.append('cachet', cachetFile);
      if (employeurSignatureFile) formData.append('signatureEmployeur', employeurSignatureFile);
      if (employeurNom.trim()) formData.append('signatureEmployeurNom', employeurNom.trim());
      if (fichier) formData.append('fichier', fichier);

      await axios.post(`${API_BASE}/api/documents-rh`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors de la création');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#cf292c] text-white flex items-center justify-center">
              <FileText className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">Nouveau document</h2>
              <p className="text-[11px] text-slate-400">Rédigez et envoyez un document à signer</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />{error}
            </div>
          )}

          {/* Type + Titre */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20">
                <option value="note">Note de service</option>
                <option value="contrat">Contrat</option>
                <option value="avenant">Avenant</option>
                <option value="reglement">Règlement</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Titre *</label>
              <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Avenant horaires été 2026"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description (optionnelle)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Courte description..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20" />
          </div>

          {/* Contenu texte */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Contenu du document</label>
            <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={6} placeholder="Rédigez le texte du document ici..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 resize-none" />
          </div>

          {/* Upload fichier */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Ou joindre un fichier PDF</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-[#cf292c]/40 transition-colors">
              {fichier ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-[#cf292c]" strokeWidth={1.5} />
                  <span className="text-sm text-slate-700 font-medium">{fichier.name}</span>
                  <button onClick={() => { setFichier(null); setChamps([]); setCachetFile(null); setCachetPreview(null); setEmployeurSignatureFile(null); setEmployeurSignaturePreview(null); setEmployeurNom(''); }} className="text-red-400 hover:text-red-600 ml-2"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-6 h-6 mx-auto text-slate-300 mb-1" strokeWidth={1.5} />
                  <p className="text-xs text-slate-500">Cliquez pour sélectionner (PDF, JPG, PNG - max 10MB)</p>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { setFichier(e.target.files[0] || null); setChamps([]); setCachetFile(null); setCachetPreview(null); setEmployeurSignatureFile(null); setEmployeurSignaturePreview(null); setEmployeurNom(''); }} />
                </label>
              )}
            </div>
          </div>

          {/* Champs à signer (style DocuSign) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Champs à signer</label>

            {/* Éditeur multi-champs (PDF uniquement) */}
            {fichier && (fichier.type === 'application/pdf' || /\.pdf$/i.test(fichier.name)) && (
              <div className="mb-2">
                {champs.length > 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4" strokeWidth={2.4} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-700">{champs.length} champ{champs.length > 1 ? 's' : ''} placé{champs.length > 1 ? 's' : ''}</p>
                          <p className="text-[10.5px] text-emerald-600/80 truncate">
                            {['signature', 'signature_employeur', 'paraphe_employeur', 'initiales', 'nom', 'date', 'mention', 'cachet']
                              .map(t => ({ t, n: champs.filter(c => c.type === t).length }))
                              .filter(x => x.n > 0)
                              .map(x => `${x.n} ${x.t === 'signature_employeur' ? 'sign. employeur' : x.t === 'paraphe_employeur' ? 'paraphe employeur' : x.t === 'mention' ? 'texte' : x.t}`)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button type="button" onClick={() => setShowFields(true)}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg">Modifier</button>
                        <button type="button" onClick={() => { setChamps([]); setCachetFile(null); setCachetPreview(null); setEmployeurSignatureFile(null); setEmployeurSignaturePreview(null); setEmployeurNom(''); }}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Vider</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowFields(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-[#cf292c]/40 hover:border-[#cf292c] hover:bg-red-50/40 transition-colors text-left">
                    <span className="w-8 h-8 rounded-lg bg-[#cf292c] text-white flex items-center justify-center flex-shrink-0">
                      <Move className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-700">Placer les champs (signature, initiales, mention, cachet)</span>
                      <span className="block text-[10.5px] text-slate-400">Glissez chaque champ où il doit être signé (recommandé)</span>
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Aide pour les fichiers non-PDF (placement précis indisponible) */}
            {fichier && !(fichier.type === 'application/pdf' || /\.pdf$/i.test(fichier.name)) && (
              <div className="mb-2 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200/70 px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                <p className="text-[10.5px] text-amber-700 leading-snug">
                  Le placement précis des champs est réservé aux <strong>PDF</strong>. La signature du salarié sera ajoutée automatiquement en bas du document.
                </p>
              </div>
            )}

            {/* Garantie signature électronique */}
            <div className="mt-1 flex items-start gap-2.5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 px-3.5 py-3">
              <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold text-slate-700">Signature électronique sécurisée</p>
                <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">
                  Chaque document signé est horodaté et accompagné d'une page de certification (identité du signataire, date et empreinte du fichier) garantissant son authenticité.
                </p>
              </div>
            </div>
          </div>

          {showFields && fichier && (
            <FieldsPlacementModal
              file={fichier}
              initial={{ champs, cachetPreview, employeurSignaturePreview, employeurNom }}
              onClose={() => setShowFields(false)}
              onConfirm={({ champs: newChamps, cachetFile: newCachet, cachetPreview: newPreview, employeurSignatureFile: newEmpSig, employeurSignaturePreview: newEmpPrev, employeurNom: newEmpNom }) => {
                setChamps(newChamps);
                if (newCachet) setCachetFile(newCachet);
                if (newPreview) setCachetPreview(newPreview);
                if (newEmpSig) setEmployeurSignatureFile(newEmpSig);
                if (newEmpPrev) setEmployeurSignaturePreview(newEmpPrev);
                setEmployeurNom(newEmpNom || '');
                setShowFields(false);
              }}
            />
          )}

          {/* Destinataires */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Destinataires *</label>
              <div className="flex items-center gap-2">
                {selectedEmployees.length > 0 && <span className="text-[10px] font-bold bg-[#cf292c] text-white px-1.5 py-0.5 rounded-full">{selectedEmployees.length}</span>}
                <button type="button" onClick={() => setSelectedEmployees(selectedEmployees.length === employes.length ? [] : employes.map(e => e.id))}
                  className="text-[11px] font-medium text-[#cf292c] hover:underline">
                  {selectedEmployees.length === employes.length ? 'Aucun' : 'Tous'}
                </button>
              </div>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Chercher..." value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20" />
            </div>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-1">
              <div className="grid grid-cols-2 gap-1">
                {filteredEmp.map(emp => {
                  const sel = selectedEmployees.includes(emp.id);
                  return (
                    <button key={emp.id} type="button" onClick={() => setSelectedEmployees(prev => sel ? prev.filter(x => x !== emp.id) : [...prev, emp.id])}
                      className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all text-xs ${sel ? 'bg-red-50 ring-1 ring-[#cf292c]/20' : 'hover:bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${sel ? 'bg-[#cf292c] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {emp.prenom?.[0]}{emp.nom?.[0]}
                      </div>
                      <span className={`truncate ${sel ? 'text-[#cf292c] font-medium' : 'text-slate-600'}`}>{emp.prenom} {emp.nom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#cf292c] text-white rounded-xl font-semibold text-sm hover:bg-[#b52528] transition-colors shadow-sm disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={2} />}
            Envoyer aux employés
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Modal Détail =====
function DocumentDetailModal({ doc, onClose, onRelance, onRefresh }) {
  const [previewSig, setPreviewSig] = useState(null);
  const [relancing, setRelancing] = useState(false);
  const [relancedIds, setRelancedIds] = useState([]);
  const statutLabels = { pending: 'En attente', read: 'Lu', signed: 'Signé', refused: 'Refusé' };
  const statutColors = {
    pending: 'bg-slate-100 text-slate-600',
    read: 'bg-blue-50 text-blue-600',
    signed: 'bg-emerald-50 text-emerald-700',
    refused: 'bg-red-50 text-red-600',
  };
  const statutIcons = {
    pending: Clock,
    read: Eye,
    signed: CheckCircle2,
    refused: XCircle,
  };

  const progress = doc.stats.total > 0 ? Math.round((doc.stats.signed / doc.stats.total) * 100) : 0;
  const enAttenteSigs = doc.signatures.filter(s => s.statut === 'pending' || s.statut === 'read');

  // Trier : en attente d'abord, puis lu, signé, refusé
  const order = { pending: 0, read: 1, signed: 2, refused: 3 };
  const sortedSigs = [...doc.signatures].sort((a, b) => (order[a.statut] ?? 9) - (order[b.statut] ?? 9));

  const openPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}${doc.fichierUrl}`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (e) { alert('Impossible d\'ouvrir le fichier'); }
  };

  const doRelance = async (sigId) => {
    await onRelance(doc.id, sigId);
    setRelancedIds(prev => [...new Set([...prev, sigId])]);
  };

  const downloadSignedPdf = (sigId) => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE}/api/documents-rh/${doc.id}/pdf-signe?signatureId=${sigId}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  const handleRelanceTous = async () => {
    if (enAttenteSigs.length === 0) return;
    setRelancing(true);
    try {
      await Promise.all(enAttenteSigs.map(s => onRelance(doc.id, s.id)));
      setRelancedIds(prev => [...new Set([...prev, ...enAttenteSigs.map(s => s.id)])]);
    } finally { setRelancing(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-slate-800">{doc.titre}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Créé le {format(new Date(doc.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })} par {doc.createdBy?.prenom} {doc.createdBy?.nom}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-4 gap-3 text-center mb-3">
            <div><p className="text-lg font-bold text-slate-800">{doc.stats.total}</p><p className="text-[10px] text-slate-500">Total</p></div>
            <div><p className="text-lg font-bold text-emerald-600">{doc.stats.signed}</p><p className="text-[10px] text-slate-500">Signés</p></div>
            <div><p className="text-lg font-bold text-amber-600">{doc.stats.pending + doc.stats.read}</p><p className="text-[10px] text-slate-500">En attente</p></div>
            <div><p className="text-lg font-bold text-red-600">{doc.stats.refused}</p><p className="text-[10px] text-slate-500">Refusés</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${progress === 100 ? 'bg-emerald-500' : 'bg-[#cf292c]'}`} style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-600">{progress}%</span>
          </div>
        </div>

        {/* Fichier joint */}
        {doc.fichierUrl && (
          <div className="px-6 py-3 border-b border-slate-100">
            <button onClick={openPdf}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#cf292c]/40 hover:bg-red-50/30 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Paperclip className="w-4 h-4 text-[#cf292c]" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">Fichier joint</p>
                <p className="text-[11px] text-slate-400">Cliquez pour ouvrir le document</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Contenu document */}
        {doc.contenu && (
          <div className="px-6 py-3 border-b border-slate-100 max-h-32 overflow-y-auto">
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{doc.contenu}</p>
          </div>
        )}

        {/* Liste signatures */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signatures ({doc.signatures.length})</h3>
            {enAttenteSigs.length > 0 && (
              <button onClick={handleRelanceTous} disabled={relancing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50">
                {relancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" strokeWidth={2} />}
                Relancer tous ({enAttenteSigs.length})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {sortedSigs.map(sig => {
              const Icon = statutIcons[sig.statut] || Clock;
              return (
                <div key={sig.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {sig.employe?.prenom?.[0]}{sig.employe?.nom?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{sig.employe?.prenom} {sig.employe?.nom}</p>
                    {sig.signedAt && <p className="text-[10px] text-slate-400">Signé le {format(new Date(sig.signedAt), 'd MMM yyyy à HH:mm', { locale: fr })}</p>}
                    {sig.statut === 'read' && sig.readAt && <p className="text-[10px] text-blue-400">Lu le {format(new Date(sig.readAt), 'd MMM yyyy à HH:mm', { locale: fr })}</p>}
                    {sig.motifRefus && <p className="text-[10px] text-red-500 mt-0.5 truncate">Motif : {sig.motifRefus}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sig.statut === 'signed' && (
                      <button onClick={() => downloadSignedPdf(sig.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="Télécharger le PDF signé">
                        <Download className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                    {sig.statut === 'signed' && sig.signatureData && (
                      <button onClick={() => setPreviewSig(sig)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors" title="Voir la signature">
                        <PenLine className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${statutColors[sig.statut]}`}>
                      <Icon className="w-3 h-3" strokeWidth={2} />
                      {statutLabels[sig.statut]}
                    </span>
                    {(sig.statut === 'pending' || sig.statut === 'read') && (
                      relancedIds.includes(sig.id) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" strokeWidth={2} />Relancé
                        </span>
                      ) : (
                        <button onClick={() => doRelance(sig.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 transition-colors" title="Relancer">
                          <Bell className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
            Fermer
          </button>
        </div>
      </div>

      {/* Aperçu signature */}
      {previewSig && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewSig(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Signature de {previewSig.employe?.prenom} {previewSig.employe?.nom}</h3>
                {previewSig.signedAt && <p className="text-[11px] text-slate-400">{format(new Date(previewSig.signedAt), 'd MMM yyyy à HH:mm', { locale: fr })}</p>}
              </div>
              <button onClick={() => setPreviewSig(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="p-5 bg-slate-50">
              <img src={previewSig.signatureData} alt="Signature" className="w-full bg-white rounded-xl border border-slate-200" />
            </div>
            <div className="px-5 py-3 border-t border-slate-100">
              <button onClick={() => downloadSignedPdf(previewSig.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#cf292c] text-white rounded-xl font-semibold text-sm hover:bg-[#b52528] transition-colors">
                <Download className="w-4 h-4" strokeWidth={2} />
                Télécharger le PDF signé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
