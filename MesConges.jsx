import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { Calendar, CalendarCheck, Plus, Clock, Check, X, FileText, RefreshCw, Edit2, Trash2, AlertCircle, ChevronDown, ChevronUp, Filter, Search, Heart, GraduationCap, Stethoscope, DollarSign, Users, RotateCcw, Paperclip, ExternalLink, Upload, History } from "lucide-react";
import BottomNav from "../components/BottomNav";
import DemandeCongeForm from "../components/DemandeCongeForm";
import DatePickerCustom from "../components/DatePickerCustom";
import { getTypeConge } from "../config/typesConges";
import useNotificationHighlight from "../hooks/useNotificationHighlight";
import API_URL from "../config/api";

// Types n�cessitant un justificatif
const TYPES_JUSTIFICATIF_OBLIGATOIRE = ['maladie', 'maternite', 'paternite', 'deces'];
const TYPES_JUSTIFICATIF_OPTIONNEL = ['mariage', 'formation'];

// Fonction pour v�rifier si un type de cong� n�cessite un justificatif
const needsJustificatif = (type) => {
  if (!type) return false;
  const typeNormalized = type.toLowerCase();
  return TYPES_JUSTIFICATIF_OBLIGATOIRE.some(t => typeNormalized.includes(t)) ||
         TYPES_JUSTIFICATIF_OPTIONNEL.some(t => typeNormalized.includes(t));
};

// Fonction pour obtenir le label propre d'un type de cong�
const getTypeLabel = (type) => {
  if (!type) return "Autre";
  const config = getTypeConge(type);
  return config ? config.label : type;
};

function MesConges() {
  const location = useLocation();
  const { isHighlighted: isCongesListHighlighted, highlightId } = useNotificationHighlight('conges-list');
  
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState({ total: 0, approuve: 0, enAttente: 0, refuse: 0 });
  const [lastCreatedId, setLastCreatedId] = useState(null); // Badge "Nouveau"
  const [toast, setToast] = useState(null); // Notifications feedback
  const [editingConge, setEditingConge] = useState(null); // Cong� en cours d'�dition
  const [deletingConge, setDeletingConge] = useState(null); // Cong� � supprimer (pour confirmation)
  const [confirmingEdit, setConfirmingEdit] = useState(null); // Cong� � modifier (confirmation)
  const [showHistorique, setShowHistorique] = useState(false); // Afficher/masquer l'historique
  
  // State partag� pour le justificatif (remont� depuis DemandeCongeForm)
  const [sharedJustificatif, setSharedJustificatif] = useState(null);
  const [sharedJustificatifPreview, setSharedJustificatifPreview] = useState(null);
  
  // Modal d'upload de justificatif pour cong�s existants
  const [uploadingJustificatif, setUploadingJustificatif] = useState(null); // Cong� pour lequel on upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const uploadInputRef = useRef(null);
  
  // Filtres pour l'historique
  const [filterType, setFilterType] = useState("tous"); // tous, CP, RTT, maladie, etc.
  const [searchDate, setSearchDate] = useState(""); // Recherche par date
  const [showFilterTypePicker, setShowFilterTypePicker] = useState(false); // Dropdown custom type
  const filterTypeRef = useRef(null);
  
  // Configuration des types de cong� avec ic�nes et couleurs
  // Les valeurs correspondent aux codes stock�s en base (voir typesConges.js)
  // On inclut aussi les alias pour matcher les anciens formats en base
  const typesCongeConfig = [
    { value: "tous", label: "Tous les types", icon: Filter, color: "from-slate-500 to-slate-600", bgColor: "bg-slate-100 dark:bg-slate-700", textColor: "text-slate-700 dark:text-slate-300", aliases: [] },
    { value: "CP", label: "Cong�s pay�s", icon: Calendar, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/30", textColor: "text-blue-700 dark:text-blue-300", aliases: ["Cong�s pay�s", "Cong� pay�", "cp"] },
    { value: "RTT", label: "RTT", icon: Clock, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/30", textColor: "text-purple-700 dark:text-purple-300", aliases: ["rtt"] },
    { value: "maladie", label: "Maladie", icon: Stethoscope, color: "from-red-500 to-red-600", bgColor: "bg-red-50 dark:bg-red-900/30", textColor: "text-red-700 dark:text-red-300", aliases: ["Cong� maladie", "Maladie"] },
    { value: "sans_solde", label: "Sans solde", icon: DollarSign, color: "from-gray-500 to-gray-600", bgColor: "bg-gray-50 dark:bg-gray-800/50", textColor: "text-gray-700 dark:text-gray-300", aliases: ["Cong� sans solde", "Sans solde"] },
    { value: "maternite", label: "Maternit�", icon: Heart, color: "from-pink-500 to-pink-600", bgColor: "bg-pink-50 dark:bg-pink-900/30", textColor: "text-pink-700 dark:text-pink-300", aliases: ["Cong� maternit�", "Maternit�"] },
    { value: "paternite", label: "Paternit�", icon: Heart, color: "from-cyan-500 to-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-900/30", textColor: "text-cyan-700 dark:text-cyan-300", aliases: ["Cong� paternit�", "Paternit�"] },
    { value: "deces", label: "D�c�s", icon: Users, color: "from-gray-600 to-gray-700", bgColor: "bg-gray-100 dark:bg-gray-800/50", textColor: "text-gray-700 dark:text-gray-400", aliases: ["Cong� d�c�s", "D�c�s"] },
    { value: "mariage", label: "Mariage", icon: Heart, color: "from-rose-500 to-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/30", textColor: "text-rose-700 dark:text-rose-300", aliases: ["Cong� mariage", "Mariage"] },
    { value: "formation", label: "Formation", icon: GraduationCap, color: "from-green-500 to-green-600", bgColor: "bg-green-50 dark:bg-green-900/30", textColor: "text-green-700 dark:text-green-300", aliases: ["Cong� formation", "Formation"] },
    { value: "autre", label: "Autre", icon: FileText, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50 dark:bg-orange-900/30", textColor: "text-orange-700 dark:text-orange-300", aliases: ["Autre"] },
  ];

  // Fonction pour v�rifier si un type de cong� correspond au filtre s�lectionn�
  const matchesTypeFilter = (congeType, filterValue) => {
    if (filterValue === "tous") return true;
    const config = typesCongeConfig.find(t => t.value === filterValue);
    if (!config) return false;
    // V�rifier le code principal et tous les alias
    const allMatches = [config.value, ...config.aliases].map(v => v.toLowerCase());
    return allMatches.includes(congeType?.toLowerCase());
  };
  
  const selectedFilterType = typesCongeConfig.find(t => t.value === filterType) || typesCongeConfig[0];
  
  const token = localStorage.getItem("token");

  // G�rer la fermeture avec la touche Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showForm) {
        setShowForm(false);
      }
    };

    if (showForm) {
      document.addEventListener('keydown', handleKeyDown);
      // Emp�cher le d�filement du body quand la modal est ouverte
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  // Scroll automatique vers la section highlight�e depuis notification
  useEffect(() => {
    if (location.state?.fromNotification && location.state?.highlightSection) {
      const sectionId = location.state.highlightSection;
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500); // D�lai un peu plus long pour laisser le temps au contenu de charger
    }
  }, [location.state, conges]); // D�pendance sur conges pour s'assurer que la liste est charg�e

  const fetchConges = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await axios.get(`${API_URL}/conges/mes-conges`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const congesData = res.data;
      setConges(congesData);
      
      // Calculer les statistiques
      setStats({
        total: congesData.length,
        approuve: congesData.filter(c => c.statut === "approuv�").length,
        enAttente: congesData.filter(c => c.statut === "en attente").length,
        refuse: congesData.filter(c => c.statut === "refus�").length,
      });
      
    } catch (err) {
      console.error("Erreur chargement cong�s :", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNouvelleDemande = async (data) => {
    try {
      let congeId;
      
      if (editingConge) {
        // Mode �dition
        await axios.put(`${API_URL}/conges/${editingConge.id}/update`, {
          type: data.type,
          debut: data.debut,
          fin: data.fin,
          motif: data.motif
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        congeId = editingConge.id;
        
        // Supprimer le justificatif si demand�
        if (data.justificatifRemoved && editingConge.justificatif) {
          try {
            await axios.delete(`${API_URL}/conges/${congeId}/justificatif`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (delErr) {
            console.error(`Erreur suppression justificatif:", delErr);
          }
        }
        
        setToast({ type: 'success', msg: 'Demande modifi�e avec succ�s' });
        setEditingConge(null);
      } else {
        // Mode cr�ation
        const res = await axios.post(`${API_URL}/conges`, {
          type: data.type,
          debut: data.debut,
          fin: data.fin,
          motif: data.motif
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const created = res.data;
        congeId = created?.id;
        setLastCreatedId(congeId || Date.now());
        setToast({ type: 'success', msg: 'Demande envoy�e avec succ�s' });
      }
      
      // Upload du justificatif si pr�sent (nouveau fichier)
      if (data.justificatif && congeId) {
        const formData = new FormData();
        formData.append('justificatif', data.justificatif);
        
        try {
          await axios.post(`${API_URL}/conges/${congeId}/justificatif`, formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
          });
          setToast({ type: 'success', msg: editingConge ? 'Demande modifi�e avec justificatif' : 'Demande envoy�e avec justificatif' });
        } catch (uploadErr) {
          console.error('Erreur upload justificatif:', uploadErr);
          setToast({ type: 'warning', msg: 'Demande enregistrée mais erreur lors de l\'upload' });
        }
      }
      
      await fetchConges();
      setShowForm(false);
      setTimeout(() => setToast(null), 5000);
      
    } catch (err) {
      // G�rer l'erreur de chevauchement ou autres erreurs m�tier
      const errorMsg = err.response?.data?.message || err.response?.data?.error;
      if (errorMsg && (errorMsg.toLowerCase().includes('chevauche') || errorMsg.toLowerCase().includes('chevauchement'))) {
        // Extraire les dates du message pour un affichage concis mais clair
        const dateMatch = errorMsg.match(/(\d{2}\/\d{2}\/\d{4})/g);
        if (dateMatch && dateMatch.length >= 2) {
          setToast({ type: 'error', msg: `Conflit : cong� existant du ${dateMatch[0]} au ${dateMatch[1]}` });
        } else {
          setToast({ type: 'error', msg: 'Conflit avec un cong� existant sur cette p�riode' });
        }
      } else if (errorMsg) {
        setToast({ type: 'error', msg: errorMsg });
      } else {
        // Erreur technique non g�r�e - log pour debug
        console.error("Erreur demande cong� :", err);
        setToast({ type: 'error', msg: editingConge ? "Erreur lors de la modification" : "Erreur lors de l'envoi" });
      }
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleDeleteConge = async (congeId) => {
    try {
      await axios.delete(`${API_URL}/conges/${congeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast({ type: 'success', msg: '??? Demande annul�e avec succ�s' });
      setTimeout(() => setToast(null), 5000);
      await fetchConges();
      setDeletingConge(null);
    } catch (err) {
      console.error(`Erreur suppression cong�:", err);
      setToast({ type: 'error', msg: "Erreur lors de l'annulation" });
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleEditConge = (conge) => {
    setConfirmingEdit(conge);
  };

  const confirmEditConge = () => {
    setEditingConge(confirmingEdit);
    setConfirmingEdit(null);
    // Initialiser le preview du justificatif si le cong� en a un
    if (confirmingEdit?.justificatif) {
      setSharedJustificatifPreview(confirmingEdit.justificatif);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingConge(null);
    // R�initialiser le justificatif partag�
    setSharedJustificatif(null);
    setSharedJustificatifPreview(null);
  };

  // ===== Fonctions pour l'upload de justificatif sur cong� existant =====
  const handleUploadFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // V�rifier le type de fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setToast({ type: 'error', msg: 'Format non autoris�. Utilisez PDF, JPG, PNG ou WEBP.' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      // V�rifier la taille (10 MB max)
      if (file.size > 10 * 1024 * 1024) {
        setToast({ type: 'error', msg: 'Le fichier est trop volumineux (max 10 MB)' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      setUploadFile(file);
      
      // Cr�er une preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadPreview({ type: 'image', url: event.target.result, name: file.name });
        };
        reader.readAsDataURL(file);
      } else {
        setUploadPreview({ type: 'pdf', name: file.name });
      }
    }
  };

  const handleSubmitJustificatif = async () => {
    if (!uploadFile || !uploadingJustificatif) return;
    
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('justificatif', uploadFile);
      
      await axios.post(`${API_URL}/conges/${uploadingJustificatif.id}/justificatif`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });
      
      setToast({ type: 'success', msg: '?? Justificatif ajout� avec succ�s !' });
      await fetchConges();
      handleCloseUploadModal();
    } catch (err) {
      console.error('Erreur upload justificatif:', err);
      setToast({ type: 'error', msg: "Erreur lors de l'upload du justificatif" });
    } finally {
      setUploadLoading(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadingJustificatif(null);
    setUploadFile(null);
    setUploadPreview(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  // Fonction pour obtenir les d�tails d'affichage selon le statut
  const getStatusConfig = (statut) => {
    switch (statut) {
      case "approuv�":
        return { 
          color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400", 
          icon: Check, 
          dotColor: "bg-emerald-500 dark:bg-emerald-400"
        };
      case "refus�":
        return { 
          color: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400", 
          icon: X, 
          dotColor: "bg-rose-500 dark:bg-rose-400"
        };
      case "en attente":
        return { 
          color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", 
          icon: Clock, 
          dotColor: "bg-amber-500 dark:bg-amber-400"
        };
      default:
        return { 
          color: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300", 
          icon: FileText, 
          dotColor: "bg-slate-500 dark:bg-slate-400"
        };
    }
  };

  // Calculer la dur�e en jours
  const getDureeJours = (dateDebut, dateFin) => {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const diffTime = Math.abs(fin - debut);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Composant r�utilisable pour afficher une carte de cong�
  const CongeCard = ({ conge, statusConfig, StatusIcon, dureeJours, isNew, handleEditConge, setDeletingConge, isHistorique = false, onAddJustificatif }) => (
    <div 
      className={`group bg-white dark:bg-slate-800 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 p-4 lg:p-6 hover:shadow-lg transition-all duration-200 ${
        isNew ? 'ring-2 ring-emerald-400/40 shadow-md' : ''
      } ${isHistorique ? 'opacity-75' : ''}`}
    >
      {/* Layout Mobile: Stack vertical */}
      <div className="lg:hidden space-y-4">
        {/* Header mobile: Ic�ne + Type + Badge statut */}
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border ${
            conge.statut === 'approuv�' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30' :
            conge.statut === 'refus�' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/30' :
            'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
          }`}>
            <StatusIcon className={`w-5 h-5 ${
              conge.statut === 'approuv�' ? 'text-emerald-600 dark:text-emerald-400' :
              conge.statut === 'refus�' ? 'text-rose-600 dark:text-rose-400' :
              'text-amber-600 dark:text-amber-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                {getTypeLabel(conge.type)}
              </h3>
              {isNew && (
                <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                  Nouveau
                </span>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusConfig.color} border ${
              conge.statut === 'approuv�' ? 'border-emerald-200 dark:border-emerald-800/30' :
              conge.statut === 'refus�' ? 'border-rose-200 dark:border-rose-800/30' :
              'border-amber-200 dark:border-amber-800/30'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}></div>
              {conge.statut.charAt(0).toUpperCase() + conge.statut.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Dates et dur�e mobile */}
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 space-y-2">
          <div className="flex items-baseline gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">P�riode</div>
              <div className="text-slate-900 dark:text-slate-100 font-medium">
                {new Date(conge.dateDebut).toLocaleDateString('fr-FR', { 
                  day: 'numeric', month: 'short'
                })} - {new Date(conge.dateFin).toLocaleDateString('fr-FR', { 
                  day: 'numeric', month: 'short', year: 'numeric' 
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">Dur�e totale</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {dureeJours} jour{dureeJours > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        
        {/* Motif de refus - Mobile */}
        {conge.statut === 'refus�' && conge.motifRefus && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 mb-1">Motif du refus</div>
                <div className="text-sm text-rose-600 dark:text-rose-400">{conge.motifRefus}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Commentaire employ� - Mobile */}
        {conge.motifEmploye && (
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Votre commentaire</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{conge.motifEmploye}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Justificatif - Mobile */}
        {conge.justificatif ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-3">
            <a 
              href={`${API_URL}${conge.justificatif}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
            >
              <Paperclip className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Justificatif joint</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          </div>
        ) : needsJustificatif(conge.type) && conge.statut !== 'refus�' && onAddJustificatif && (
          <button
            onClick={() => onAddJustificatif(conge)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Ajouter un justificatif
          </button>
        )}
        
        {/* Boutons d'action mobile - uniquement pour cong�s en attente */}
        {conge.statut === "en attente" && handleEditConge && setDeletingConge && (
          <div className="flex gap-2">
            <button
              onClick={() => handleEditConge(conge)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
            <button
              onClick={() => setDeletingConge(conge)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Layout Desktop: Horizontal */}
      <div className="hidden lg:flex items-center gap-6">
        {/* Ic�ne status */}
        <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center border group-hover:scale-105 transition-transform ${
          conge.statut === 'approuv�' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30' :
          conge.statut === 'refus�' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/30' :
          'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
        }`}>
          <StatusIcon className={`w-7 h-7 ${
            conge.statut === 'approuv�' ? 'text-emerald-600 dark:text-emerald-400' :
            conge.statut === 'refus�' ? 'text-rose-600 dark:text-rose-400' :
            'text-amber-600 dark:text-amber-400'
          }`} />
        </div>
        
        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
              {getTypeLabel(conge.type)}
            </h3>
            {isNew && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-500 text-white px-2 py-0.5 rounded">
                Nouveau
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{new Date(conge.dateDebut).toLocaleDateString('fr-FR', { 
              day: 'numeric', month: 'short'
            })} - {new Date(conge.dateFin).toLocaleDateString('fr-FR', { 
              day: 'numeric', month: 'short', year: 'numeric' 
            })}</span>
          </div>
          {/* Motif de refus - Desktop */}
          {conge.statut === 'refus�' && conge.motifRefus && (
            <div className="mt-2 flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>Motif :</strong> {conge.motifRefus}</span>
            </div>
          )}
          {/* Commentaire employ� - Desktop */}
          {conge.motifEmploye && (
            <div className="mt-2 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="italic">"{conge.motifEmploye}"</span>
            </div>
          )}
          {/* Justificatif - Desktop */}
          {conge.justificatif ? (
            <div className="mt-2">
              <a 
                href={`${API_URL}${conge.justificatif}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Justificatif
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : needsJustificatif(conge.type) && conge.statut !== 'refus�' && onAddJustificatif && (
            <div className="mt-2">
              <button
                onClick={() => onAddJustificatif(conge)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Ajouter justificatif
              </button>
            </div>
          )}
        </div>
        
        {/* Badge statut + Dur�e + Actions */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusConfig.color} ${
            conge.statut === 'approuv�' ? 'border-emerald-200 dark:border-emerald-800/30' :
            conge.statut === 'refus�' ? 'border-rose-200 dark:border-rose-800/30' :
            'border-amber-200 dark:border-amber-800/30'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}></div>
            {conge.statut.charAt(0).toUpperCase() + conge.statut.slice(1)}
          </span>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{dureeJours}j</span>
          </div>
          
          {/* Boutons d'action desktop */}
          {conge.statut === "en attente" && handleEditConge && setDeletingConge && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditConge(conge)}
                className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Modifier la demande"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeletingConge(conge)}
                className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Annuler la demande"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    fetchConges();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 pb-navbar lg:pb-8 lg:pt-14 transition-colors pt-header">
      
      {/* Toast notifications �pur�es */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300 min-w-[280px] max-w-[420px] mx-4 ${
            toast.type === 'success'
              ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
          }`}
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}
        >
          {toast.type === 'success' ? (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
          )}
          <span className="flex-1 text-sm leading-snug font-medium">{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Fermer"
            className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors ml-1"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* ===== MOBILE : Fullscreen Sheet iOS-style ===== */}
      {/* Bouton FAB mobile - masqu� quand formulaire ouvert */}
      {!showForm && (
        <div className="lg:hidden fixed right-5 z-[55] bottom-above-navbar">
          <button
            onClick={() => { setEditingConge(null); setShowForm(true); }}
            aria-label="Nouvelle demande"
            className="relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 transform active:scale-95 focus:outline-none shadow-xl bg-primary-600 text-white shadow-primary-600/30 hover:shadow-primary-600/50 hover:bg-primary-700 ring-4 ring-white dark:ring-slate-900"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ===== FORMULAIRE UNIFI� (Mobile + Desktop) ===== */}
      {showForm && (
        <>
          {/* Backdrop - fullscreen avec z-index �lev� */}
          <div 
            className="fixed inset-0 bg-black/40 lg:bg-slate-900/40 backdrop-blur-sm z-[60]"
            onClick={handleCloseForm}
          />
          
          {/* Container adaptatif - fullscreen coll� en bas */}
          <div className="fixed inset-0 z-[61] flex items-end lg:items-center lg:justify-center lg:p-6">
            {/* Sheet mobile / Modal desktop */}
            <div className="w-full lg:w-[640px] max-h-full lg:max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom lg:zoom-in-95 duration-300">
              
              {/* Header mobile uniquement */}
              <div className="lg:hidden flex items-center justify-between px-4 pt-3 pb-1">
                <div className="w-8" />
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <button
                  onClick={handleCloseForm}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              
              {/* Contenu scrollable - UNE SEULE instance du formulaire */}
              <div className="overflow-y-auto flex-1 overscroll-contain pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <DemandeCongeForm 
                  onSubmit={handleNouvelleDemande} 
                  onClose={handleCloseForm}
                  initialData={editingConge}
                  isEditing={!!editingConge}
                  justificatif={sharedJustificatif}
                  setJustificatif={setSharedJustificatif}
                  justificatifPreview={sharedJustificatifPreview}
                  setJustificatifPreview={setSharedJustificatifPreview}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== DESKTOP : Bouton "Nouvelle demande" - masqu� quand formulaire ouvert ===== */}
      {!showForm && (
        <div className="hidden lg:block fixed bottom-8 right-8 z-[60]">
          <button
            onClick={() => { setEditingConge(null); setShowForm(true); }}
            aria-label="Nouvelle demande de cong�"
            className="group relative flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none shadow-xl bg-primary-500 text-white shadow-primary-500/40 hover:shadow-primary-500/60 hover:bg-primary-600"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span>Nouvelle demande</span>
          </button>
        </div>
      )}

      {/* Container max-width pour coh�rence avec navbar */}
      <div className="mx-auto max-w-7xl px-3 lg:px-6 py-3 lg:py-6">
        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 lg:p-5 hover:border-slate-300/60 dark:hover:border-slate-600/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Total</p>
              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 lg:p-5 hover:border-amber-200 dark:hover:border-amber-800/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">En attente</p>
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.enAttente}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 lg:p-5 hover:border-emerald-200 dark:hover:border-emerald-800/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Approuv�es</p>
              <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approuve}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 lg:p-5 hover:border-rose-200 dark:hover:border-rose-800/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Refus�es</p>
              <X className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.refuse}</p>
          </div>
        </div>

        {/* Liste des cong�s avec sections organis�es */}
        <div className="space-y-6">

          {loading ? (
            <div className="space-y-3 lg:space-y-4" aria-busy="true" aria-label="Chargement des demandes de cong�s">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 p-4 lg:p-6 animate-pulse">
                  <div className="flex items-center gap-4 lg:gap-6">
                    <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" />
                    </div>
                    <div className="hidden lg:flex items-center gap-3">
                      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : conges.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-16 lg:p-24 text-center">
              {/* Ic�ne stylis�e avec accent rouge */}
              <div className="inline-flex mb-6 relative">
                {/* Glow subtil rouge */}
                <div className="absolute inset-0 bg-primary-500/10 rounded-2xl blur-xl"></div>
                <div className="relative w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/50 dark:to-slate-800/30 rounded-2xl flex items-center justify-center border border-slate-200/60 dark:border-slate-700/50 shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-transparent rounded-2xl"></div>
                  <Calendar className="relative w-10 h-10 lg:w-12 lg:h-12 text-primary-500/80" strokeWidth={1.5} />
                </div>
              </div>
              
              {/* Texte stylis� */}
              <h3 className="text-lg lg:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Aucune demande de cong�
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] lg:max-w-none mx-auto">
                Cr�ez votre premi�re demande avec le bouton
                <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-500 text-white rounded-full shadow-sm mx-1 align-middle">
                  <Plus className="w-3 h-3" strokeWidth={3} />
                </span>
                ci-dessous
              </p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Cong�s � venir (approuv�s avec date future) */}
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const congesAVenir = conges.filter(c => 
                  c.statut === "approuv�" && new Date(c.dateDebut) >= today
                ).sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut));
                
                return congesAVenir.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                        <CalendarCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Cong�s � venir</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{congesAVenir.length} cong�{congesAVenir.length > 1 ? 's' : ''} approuv�{congesAVenir.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {congesAVenir.map((conge, index) => {
                        const statusConfig = getStatusConfig(conge.statut);
                        const StatusIcon = statusConfig.icon;
                        const dureeJours = getDureeJours(conge.dateDebut, conge.dateFin);
                        const isNew = lastCreatedId && conge.id === lastCreatedId;
                        
                        return (
                          <CongeCard key={conge.id || index} conge={conge} statusConfig={statusConfig} StatusIcon={StatusIcon} dureeJours={dureeJours} isNew={isNew} onAddJustificatif={setUploadingJustificatif} />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* SECTION 2: Demandes en attente de validation */}
              {(() => {
                const congesEnAttente = conges.filter(c => c.statut === "en attente")
                  .sort((a, b) => {
                    // Trier par date de cr�ation (plus r�cent en premier)
                    // Utiliser createdAt du backend, sinon fallback sur id
                    const getTimestamp = (c) => {
                      if (c.createdAt) return new Date(c.createdAt).getTime();
                      // Fallback: id plus grand = plus r�cent (auto-increment)
                      return c.id || 0;
                    };
                    return getTimestamp(b) - getTimestamp(a);
                  });
                
                return congesEnAttente.length > 0 && (
                  <div 
                    id="conges-list"
                    className={`space-y-3 scroll-mt-highlight transition-all duration-500 rounded-xl ${
                      isCongesListHighlighted ? 'highlight-glow p-2 -m-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">En attente</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{congesEnAttente.length} demande{congesEnAttente.length > 1 ? 's' : ''} en cours</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {congesEnAttente.map((conge, index) => {
                        const statusConfig = getStatusConfig(conge.statut);
                        const StatusIcon = statusConfig.icon;
                        const dureeJours = getDureeJours(conge.dateDebut, conge.dateFin);
                        const isNew = lastCreatedId && conge.id === lastCreatedId;
                        
                        return (
                          <CongeCard key={conge.id || index} conge={conge} statusConfig={statusConfig} StatusIcon={StatusIcon} dureeJours={dureeJours} isNew={isNew} handleEditConge={handleEditConge} setDeletingConge={setDeletingConge} onAddJustificatif={setUploadingJustificatif} />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* SECTION 3: Historique (cong�s pass�s + refus�s) - Collapsible avec filtres */}
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let historique = conges.filter(c => 
                  c.statut === "refus�" || (c.statut === "approuv�" && new Date(c.dateFin) < today)
                ).sort((a, b) => new Date(b.dateFin) - new Date(a.dateFin));
                
                // Appliquer les filtres
                if (filterType !== "tous") {
                  historique = historique.filter(c => matchesTypeFilter(c.type, filterType));
                }
                
                if (searchDate) {
                  historique = historique.filter(c => {
                    // Normaliser les dates pour comparer uniquement jour/mois/ann�e (sans heure)
                    const normalizeDate = (d) => {
                      const date = new Date(d);
                      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                    };
                    const searchTime = normalizeDate(searchDate);
                    const debutTime = normalizeDate(c.dateDebut);
                    const finTime = normalizeDate(c.dateFin);
                    return searchTime >= debutTime && searchTime <= finTime;
                  });
                }
                
                const historiqueTotal = conges.filter(c => 
                  c.statut === "refus�" || (c.statut === "approuv�" && new Date(c.dateFin) < today)
                ).length;
                
                return historiqueTotal > 0 && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowHistorique(!showHistorique)}
                      className="w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-slate-150 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-500 flex items-center justify-center">
                          <History className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Historique</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{historiqueTotal} cong�{historiqueTotal > 1 ? 's' : ''} pass�{historiqueTotal > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {showHistorique ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>
                    
                    {showHistorique && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                        {/* Filtres am�lior�s */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                          {/* Header des filtres */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Filter className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Filtres</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Affinez votre recherche</p>
                              </div>
                            </div>
                            {(filterType !== "tous" || searchDate) && (
                              <button
                                onClick={() => { setFilterType("tous"); setSearchDate(""); setShowFilterTypePicker(false); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-all duration-200"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span className="hidden sm:inline">R�initialiser</span>
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Filtre par type - Dropdown custom */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <span>Type de cong�</span>
                              </label>
                              <div className="relative" ref={filterTypeRef}>
                                <button
                                  type="button"
                                  onClick={() => setShowFilterTypePicker(!showFilterTypePicker)}
                                  className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-left text-sm transition-all duration-200 ${
                                    showFilterTypePicker 
                                      ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-sm' 
                                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                                  }`}
                                >
                                  <selectedFilterType.icon className={`w-5 h-5 ${selectedFilterType.textColor} flex-shrink-0`} />
                                  <span className="flex-1 font-medium text-slate-800 dark:text-slate-200 truncate">{selectedFilterType.label}</span>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showFilterTypePicker ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {/* Dropdown list */}
                                {showFilterTypePicker && (
                                  <>
                                    {/* Backdrop pour fermer */}
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setShowFilterTypePicker(false)}
                                    />
                                    <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                      <ul className="max-h-64 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800">
                                        {typesCongeConfig.map((t) => {
                                          const TypeIcon = t.icon;
                                          const isSelected = t.value === filterType;
                                          return (
                                            <li
                                              key={t.value}
                                              onClick={() => { setFilterType(t.value); setShowFilterTypePicker(false); }}
                                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                                isSelected 
                                                  ? 'bg-primary-50 dark:bg-primary-900/30' 
                                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                                              }`}
                                            >
                                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.bgColor} border border-slate-200/60 dark:border-slate-600/60 flex-shrink-0`}>
                                                <TypeIcon className={`w-3.5 h-3.5 ${t.textColor}`} />
                                              </div>
                                              <span className={`flex-1 text-sm ${isSelected ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {t.label}
                                              </span>
                                              {isSelected && (
                                                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Recherche par date - DatePicker Custom */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <span>Rechercher une date</span>
                              </label>
                              <div className="relative">
                                <DatePickerCustom
                                  value={searchDate}
                                  onChange={(date) => setSearchDate(date)}
                                  placeholder="S�lectionner une date"
                                />
                                {searchDate && (
                                  <button
                                    onClick={() => setSearchDate("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center justify-center transition-colors z-10"
                                  >
                                    <X className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Badges filtres actifs + R�sultats */}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {filterType !== "tous" && (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${selectedFilterType.bgColor} ${selectedFilterType.textColor} border border-slate-200/60 dark:border-slate-600/60`}>
                                <selectedFilterType.icon className="w-3 h-3" />
                                {selectedFilterType.label}
                                <button onClick={() => setFilterType("tous")} className="ml-0.5 hover:opacity-70">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                            {searchDate && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                                <Calendar className="w-3 h-3" />
                                {new Date(searchDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                <button onClick={() => setSearchDate("")} className="ml-0.5 hover:opacity-70">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                            
                            {/* Compteur de r�sultats */}
                            <div className="flex-1 text-right">
                              <span className={`text-xs font-medium ${historique.length === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {historique.length === historiqueTotal 
                                  ? `${historiqueTotal} cong�${historiqueTotal > 1 ? 's' : ''}`
                                  : `${historique.length} sur ${historiqueTotal}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Liste filtr�e */}
                        {historique.length > 0 ? (
                          <div className="space-y-3">
                            {historique.map((conge, index) => {
                              const statusConfig = getStatusConfig(conge.statut);
                              const StatusIcon = statusConfig.icon;
                              const dureeJours = getDureeJours(conge.dateDebut, conge.dateFin);
                              
                              return (
                                <CongeCard key={conge.id || index} conge={conge} statusConfig={statusConfig} StatusIcon={StatusIcon} dureeJours={dureeJours} isNew={false} isHistorique onAddJustificatif={setUploadingJustificatif} />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                              <Search className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Aucun cong� trouv�</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Essayez de modifier vos filtres</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmation de modification */}
      {confirmingEdit && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={() => setConfirmingEdit(null)}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-gray-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                      Modifier cette demande ?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                      Vous allez modifier votre demande de <strong>{confirmingEdit.type}</strong> du{' '}
                      {new Date(confirmingEdit.dateDebut).toLocaleDateString('fr-FR')} au{' '}
                      {new Date(confirmingEdit.dateFin).toLocaleDateString('fr-FR')}.
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-6 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      ?? La demande restera "en attente" apr�s modification et devra �tre � nouveau valid�e par votre manager.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmingEdit(null)}
                        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={confirmEditConge}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-lg shadow-blue-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transform hover:scale-[1.02]"
                      >
                        Continuer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal d'upload de justificatif */}
      {uploadingJustificatif && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={handleCloseUploadModal}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    Ajouter un justificatif
                  </h3>
                  <button
                    onClick={handleCloseUploadModal}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                  Ajoutez un justificatif pour votre demande de <strong>{getTypeLabel(uploadingJustificatif.type)}</strong> du{' '}
                  {new Date(uploadingJustificatif.dateDebut).toLocaleDateString('fr-FR')} au{' '}
                  {new Date(uploadingJustificatif.dateFin).toLocaleDateString('fr-FR')}.
                </p>
                
                {/* Zone d'upload */}
                <input
                  type="file"
                  ref={uploadInputRef}
                  onChange={handleUploadFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                
                {!uploadPreview ? (
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all mb-4"
                  >
                    <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-2" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Cliquez pour s�lectionner un fichier
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      PDF, JPG, PNG ou WEBP (max 10 MB)
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {uploadPreview?.type === 'image' && uploadPreview?.url ? (
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-emerald-200 dark:border-emerald-700">
                          <img src={uploadPreview.url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                          {uploadPreview?.name}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Fichier pr�t
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUploadFile(null); setUploadPreview(null); if (uploadInputRef.current) uploadInputRef.current.value = ''; }}
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseUploadModal}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmitJustificatif}
                    disabled={!uploadFile || uploadLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 text-sm font-medium shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploadLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Envoyer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmation de suppression */}
      {deletingConge && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={() => setDeletingConge(null)}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-gray-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                      Annuler cette demande ?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                      Vous �tes sur le point d'annuler votre demande de <strong>{getTypeLabel(deletingConge.type)}</strong> du{' '}
                      {new Date(deletingConge.dateDebut).toLocaleDateString('fr-FR')} au{' '}
                      {new Date(deletingConge.dateFin).toLocaleDateString('fr-FR')}.
                      <br /><br />
                      Cette action est irr�versible.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeletingConge(null)}
                        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleDeleteConge(deletingConge.id)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl hover:from-rose-600 hover:to-rose-700 transition-all duration-200 text-sm font-medium shadow-lg shadow-rose-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transform hover:scale-[1.02]"
                      >
                        Confirmer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}

export default MesConges;
