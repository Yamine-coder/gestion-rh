import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FileText, 
  Download, 
  Eye, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Users,
  Clock,
  GraduationCap,
  Target,
  CheckSquare,
  Building,
  Gift,
  RotateCcw
} from 'lucide-react';

const FichePosteEditor = ({ userRole = 'admin' }) => {
  const [fiches, setFiches] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [editingFiche, setEditingFiche] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Charger les fiches au montage
  useEffect(() => {
    loadFiches();
  }, []);

  const loadFiches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/fiches-poste', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiches(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des fiches');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFiche = async (categorie) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/fiches-poste/${encodeURIComponent(categorie)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCategorie(categorie);
      setEditingFiche(response.data);
      setExpandedSection('missions');
    } catch (error) {
      toast.error('Erreur lors du chargement de la fiche');
    }
  };

  const handleSave = async () => {
    if (!editingFiche) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/fiches-poste', editingFiche, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Fiche de poste sauvegardée !');
      loadFiches();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!selectedCategorie) return;
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/fiches-poste/${encodeURIComponent(selectedCategorie)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Fiche réinitialisée');
      handleSelectFiche(selectedCategorie);
      loadFiches();
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const handleDownload = async (categorie) => {
    try {
      const token = localStorage.getItem('token');
      const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
      
      const params = new URLSearchParams({
        etablissement: companySettings.nom || 'Le Fournil à Pizzas',
        adresse: companySettings.adresse || ''
      });
      
      const response = await axios.get(
        `http://localhost:5000/api/fiches-poste/generer/${encodeURIComponent(categorie)}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fiche_Poste_${categorie}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF téléchargé !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
      console.error(error);
    }
  };

  const handlePreview = async (categorie) => {
    try {
      const token = localStorage.getItem('token');
      const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
      
      const params = new URLSearchParams({
        etablissement: companySettings.nom || 'Le Fournil à Pizzas',
        adresse: companySettings.adresse || ''
      });
      
      const response = await axios.get(
        `http://localhost:5000/api/fiches-poste/preview/${encodeURIComponent(categorie)}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPreviewUrl(url);
    } catch (error) {
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const updateField = (field, value) => {
    setEditingFiche(prev => ({ ...prev, [field]: value }));
  };

  const addListItem = (field) => {
    setEditingFiche(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), '']
    }));
  };

  const updateListItem = (field, index, value) => {
    setEditingFiche(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const removeListItem = (field, index) => {
    setEditingFiche(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c]"></div>
        <span className="ml-3 text-gray-600">Chargement des fiches...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Modal de prévisualisation */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Prévisualisation PDF</h3>
              <button
                onClick={() => { setPreviewUrl(null); URL.revokeObjectURL(previewUrl); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <iframe
              src={previewUrl}
              className="flex-1 w-full"
              title="Prévisualisation PDF"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des catégories */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="p-1 rounded bg-[#cf292c]/10">
              <FileText size={14} className="text-[#cf292c]" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Fiches de poste</h3>
            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {fiches.length}
            </span>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {fiches.map((fiche) => (
              <div
                key={fiche.categorie}
                className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedCategorie === fiche.categorie ? 'bg-[#cf292c]/5 border-l-2 border-[#cf292c]' : ''
                }`}
                onClick={() => handleSelectFiche(fiche.categorie)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{fiche.categorie}</p>
                    <p className="text-xs text-gray-500">{fiche.titre}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {fiche.isCustom && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        Personnalisé
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(fiche.categorie); }}
                      className="p-1 text-gray-400 hover:text-[#cf292c] hover:bg-[#cf292c]/10 rounded"
                      title="Télécharger PDF"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Éditeur de fiche */}
        <div className="lg:col-span-2">
          {!editingFiche ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Sélectionnez une catégorie pour voir ou modifier la fiche de poste</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header de l'éditeur */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-[#cf292c]/10">
                    <Edit3 size={14} className="text-[#cf292c]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{editingFiche.categorie}</h3>
                    <p className="text-xs text-gray-500">
                      {editingFiche.isCustom ? 'Fiche personnalisée' : 'Template par défaut'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(selectedCategorie)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Eye size={14} /> Prévisualiser
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded"
                  >
                    <RefreshCw size={14} /> Réinitialiser
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#cf292c] text-white rounded hover:bg-[#b91c1c] disabled:opacity-50"
                  >
                    <Save size={14} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>

              {/* Contenu de l'éditeur */}
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {/* Informations de base */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Briefcase size={12} /> Titre du poste
                    </label>
                    <input
                      type="text"
                      value={editingFiche.titre || ''}
                      onChange={(e) => updateField('titre', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Building size={12} /> Département
                    </label>
                    <input
                      type="text"
                      value={editingFiche.departement || ''}
                      onChange={(e) => updateField('departement', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Users size={12} /> Rattachement hiérarchique
                    </label>
                    <input
                      type="text"
                      value={editingFiche.rattachement || ''}
                      onChange={(e) => updateField('rattachement', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Clock size={12} /> Horaires
                    </label>
                    <input
                      type="text"
                      value={editingFiche.horaires || ''}
                      onChange={(e) => updateField('horaires', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <GraduationCap size={12} /> Formation requise
                    </label>
                    <input
                      type="text"
                      value={editingFiche.formation || ''}
                      onChange={(e) => updateField('formation', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Section Missions */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('missions')}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium text-sm text-gray-700">
                      <Target size={14} className="text-[#cf292c]" />
                      Missions principales ({editingFiche.missions?.length || 0})
                    </span>
                    {expandedSection === 'missions' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {expandedSection === 'missions' && (
                    <div className="p-3 space-y-2 bg-white">
                      {(editingFiche.missions || []).map((mission, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 mt-2 w-4">{index + 1}.</span>
                          <input
                            type="text"
                            value={mission}
                            onChange={(e) => updateListItem('missions', index, e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                            placeholder="Décrire la mission..."
                          />
                          <button
                            onClick={() => removeListItem('missions', index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addListItem('missions')}
                        className="flex items-center gap-1 text-xs text-[#cf292c] hover:bg-[#cf292c]/5 px-2 py-1 rounded"
                      >
                        <Plus size={14} /> Ajouter une mission
                      </button>
                    </div>
                  )}
                </div>

                {/* Section Compétences */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('competences')}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium text-sm text-gray-700">
                      <CheckSquare size={14} className="text-green-600" />
                      Compétences requises ({editingFiche.competences?.length || 0})
                    </span>
                    {expandedSection === 'competences' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {expandedSection === 'competences' && (
                    <div className="p-3 space-y-2 bg-white">
                      {(editingFiche.competences || []).map((comp, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 mt-2 w-4">•</span>
                          <input
                            type="text"
                            value={comp}
                            onChange={(e) => updateListItem('competences', index, e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                            placeholder="Décrire la compétence..."
                          />
                          <button
                            onClick={() => removeListItem('competences', index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addListItem('competences')}
                        className="flex items-center gap-1 text-xs text-[#cf292c] hover:bg-[#cf292c]/5 px-2 py-1 rounded"
                      >
                        <Plus size={14} /> Ajouter une compétence
                      </button>
                    </div>
                  )}
                </div>

                {/* Conditions et avantages */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Conditions de travail</label>
                    <textarea
                      value={editingFiche.conditionsTravail || ''}
                      onChange={(e) => updateField('conditionsTravail', e.target.value)}
                      rows={2}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent resize-none"
                      placeholder="Décrire les conditions de travail..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Gift size={12} className="text-purple-500" /> Avantages
                    </label>
                    <textarea
                      value={editingFiche.avantages || ''}
                      onChange={(e) => updateField('avantages', e.target.value)}
                      rows={2}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent resize-none"
                      placeholder="Lister les avantages du poste..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal confirmation réinitialisation - même style que déconnexion */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 sm:mx-0 border border-slate-200 animate-[scaleIn_0.2s_ease-out]">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                Réinitialiser la fiche ?
              </h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Cette fiche sera remplacée par le template par défaut. Cette action est irréversible.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/60"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-4 py-3 text-sm font-medium bg-[#cf292c] text-white rounded-xl hover:bg-[#b82528] transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/60 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FichePosteEditor;
