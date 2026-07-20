  import { useEffect, useState, useRef } from "react";
  import axios from "axios";
  import { Check, X, Clock, ChevronLeft, ChevronRight, Search, Calendar, AlertCircle, RefreshCw, Download, Users, Paperclip, FileText, Eye, ExternalLink, ChevronDown, Filter } from "lucide-react";
  import alertService from "../services/alertService";
  import * as XLSX from "xlsx";
  import { saveAs } from "file-saver";
  import ConflictAnalysisModal from "./ConflictAnalysisModal";
  import "../styles/menu-animations.css"; // Pour l'animation highlight
  import { getImageUrl } from '../utils/imageUtils';
  import { API_BASE } from '../config/api';

  function CongesTable({ onViewCongés, onCongeUpdate, highlightCongeId, onHighlightComplete }) {
    const [conges, setConges] = useState([]);
    const [employes, setEmployes] = useState([]);
    const [filtre, setFiltre] = useState("tous");
    const [filtreType, setFiltreType] = useState("tous");
    const [filtrePeriode, setFiltrePeriode] = useState("tous");
    const [filtreCategorie, setFiltreCategorie] = useState("tous");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showConflictAnalysis, setShowConflictAnalysis] = useState(false);
    const [selectedCongeForAnalysis, setSelectedCongeForAnalysis] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [previewJustificatif, setPreviewJustificatif] = useState(null);
    const [highlightedRow, setHighlightedRow] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open
    const [selectedIds, setSelectedIds] = useState(new Set()); // Sélection multiple (bulk)
    const [showRefusModal, setShowRefusModal] = useState(false); // Modal motif de refus
    const [refusData, setRefusData] = useState(null); // { ids: [], motif: '' }
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const highlightRef = useRef(null);
    const dropdownRef = useRef(null);
    const itemsPerPage = 10;
    const token = localStorage.getItem("token");

    // Récupérer les congés depuis l'API
    const fetchConges = async () => {
      setLoading(true);
      try {
        // Récupérer les congés ET les employés en parallèle
        const [congesRes, employesRes] = await Promise.all([
          axios.get(`${API_BASE}/admin/conges`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/admin/employes`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);
        
        setConges(congesRes.data);
        setEmployes(employesRes.data);
        
        // Marquer automatiquement toutes les demandes en attente comme vues
        await axios.post(
          `${API_BASE}/admin/conges/vu`, 
          {}, // Corps vide pour marquer toutes les demandes en attente
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        setLoading(false);
        
        // Notifier le composant parent que les congés ont été vus
        if (onViewCongés) {
          onViewCongés();
        }
        
        // Notifier la mise à jour du badge
        if (onCongeUpdate) {
          onCongeUpdate();
        }
      } catch (err) {
        console.error("Erreur chargement congés", err);
        setLoading(false);
      }
    };

    // Variables pour l'action en attente
    const [pendingAction, setPendingAction] = useState(null);

    // Ouvrir la modal de confirmation
    const openConfirmModal = (id, statut) => {
      // Refus => demander un motif
      if (statut === 'refusé') {
        setRefusData({ ids: [id], motif: '' });
        setShowRefusModal(true);
        return;
      }
      const conge = conges.find(c => c.id === id);
      const employe = employes.find(e => e.id === conge?.employeId);
      setPendingAction({
        id,
        statut,
        conge,
        employe
      });
      setShowConfirmModal(true);
    };

    // Confirmer l'action
    const confirmAction = () => {
      if (pendingAction) {
        updateStatut(pendingAction.id, pendingAction.statut);
        setShowConfirmModal(false);
        setPendingAction(null);
      }
    };

    // Mettre à jour le statut d'un congé
    const updateStatut = async (id, statut, motifRefus = null) => {
      try {
        await axios.put(
          `${API_BASE}/conges/${id}`,
          { statut, ...(motifRefus ? { motifRefus } : {}) },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Mettre à jour localement sans recharger toute la liste
        setConges((prev) =>
          prev.map((c) => (c.id === id ? { ...c, statut, ...(motifRefus ? { motifRefus } : {}) } : c))
        );
        
        // Notifier le parent pour mettre à jour le badge de notification
        if (onCongeUpdate) {
          onCongeUpdate();
        }
      } catch (err) {
        // Message d'erreur
        alertService.error('Erreur', 'Une erreur est survenue lors de la mise à jour.');
      }
    };



    // Calcule le nombre de jours d'un congé (inclusif)
    const compterJoursConge = (c) => {
      if (!c?.dateDebut || !c?.dateFin) return 0;
      const d1 = new Date(c.dateDebut);
      const d2 = new Date(c.dateFin);
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    };

    // Nombre de jours de congés payés approuvés cette année pour un employé
    const joursPrisCetteAnnee = (userId) => {
      const annee = new Date().getFullYear();
      return conges
        .filter(c => c.userId === userId && c.statut === 'approuvé')
        .filter(c => {
          const t = (c.type || '').toLowerCase();
          return t.includes('payé') || t.includes('paye') || t === 'cp' || t.includes('rtt');
        })
        .filter(c => new Date(c.dateDebut).getFullYear() === annee)
        .reduce((sum, c) => sum + compterJoursConge(c), 0);
    };

    // Exécuter un refus avec motif (un ou plusieurs)
    const executerRefus = async () => {
      if (!refusData || refusData.ids.length === 0) return;
      const motif = (refusData.motif || '').trim();
      if (!motif) {
        alertService.error('Motif requis', 'Veuillez indiquer un motif de refus.');
        return;
      }
      setBulkProcessing(true);
      try {
        await Promise.all(refusData.ids.map(id => updateStatut(id, 'refusé', motif)));
        setShowRefusModal(false);
        setRefusData(null);
        setSelectedIds(new Set());
      } finally {
        setBulkProcessing(false);
      }
    };

    // Approuver la sélection en masse
    const approuverSelection = async () => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkProcessing(true);
      try {
        await Promise.all(ids.map(id => updateStatut(id, 'approuvé')));
        setSelectedIds(new Set());
      } finally {
        setBulkProcessing(false);
      }
    };

    // Refuser la sélection en masse (demande un motif)
    const refuserSelection = () => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setRefusData({ ids, motif: '' });
      setShowRefusModal(true);
    };

    // Toggle sélection d'une ligne
    const toggleSelect = (id) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    useEffect(() => {
      fetchConges();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
      if (highlightCongeId && conges.length > 0) {
        
        // Trouver l'index du congé dans la liste filtrée actuelle
        const congesList = conges.filter(c => 
          c.user &&
          (filtre === "tous" ? true : c.statut === filtre) &&
          (() => {
            const searchLower = search.toLowerCase();
            if (!searchLower) return true;
            const email = (c.user.email || '').toLowerCase();
            const nom = (c.user.nom || '').toLowerCase();
            const prenom = (c.user.prenom || '').toLowerCase();
            return email.includes(searchLower) || nom.includes(searchLower) || prenom.includes(searchLower);
          })()
        );
        const congeIndex = congesList.findIndex(c => c.id === highlightCongeId);
        
        if (congeIndex !== -1) {
          // Calculer la page où se trouve le congé
          const targetPage = Math.ceil((congeIndex + 1) / itemsPerPage);
          setPage(targetPage);
          
          // Activer le highlight
          setHighlightedRow(highlightCongeId);
          
          // Scroll vers la ligne après un court délai (pour laisser le temps au render)
          setTimeout(() => {
            if (highlightRef.current) {
              highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
          
          // Désactiver le highlight après 3 secondes
          setTimeout(() => {
            setHighlightedRow(null);
            if (onHighlightComplete) {
              onHighlightComplete();
            }
          }, 3500);
        } else {
          // Le congé n'est pas visible avec le filtre actuel, réinitialiser les filtres
          setFiltre('tous');
          setFiltreType('tous');
          setFiltrePeriode('tous');
          setFiltreCategorie('tous');
          setSearch('');
        }
      }
    }, [highlightCongeId, conges.length]);

    // Fonction pour déterminer l'urgence et les badges - VERSION PRODUCTION
    const getIndicateursConge = (conge) => {
      const maintenant = new Date();
      const joursAvantDebut = Math.ceil((new Date(conge.dateDebut) - maintenant) / (1000 * 60 * 60 * 24));
      
      const indicateurs = {
        badges: [],
        classeSpeciale: '',
        priorite: 'normale'
      };
      
      if (conge.statut === 'en attente') {
        indicateurs.priorite = 'haute';
        indicateurs.classeSpeciale = 'border-l-4 border-l-[#cf292c]';
        
        // Badge EXPRESS pour congés imminents (< 7 jours)
        if (joursAvantDebut <= 7 && joursAvantDebut >= 0) {
          indicateurs.badges.push({
            text: 'Express',
            classe: 'bg-[#cf292c] text-white text-xs px-2 py-1 rounded-full font-medium'
          });
        }
        
        // Badge URGENT pour congés très imminents (< 3 jours)
        if (joursAvantDebut <= 3 && joursAvantDebut >= 0) {
          indicateurs.badges = [{ // Remplace Express par Urgent si plus critique
            text: 'Urgent',
            classe: 'bg-red-600 text-white text-xs px-2 py-1 rounded-full font-medium'
          }];
        }
        
        // Badge DEMAIN pour congés de demain
        if (joursAvantDebut === 1) {
          indicateurs.badges = [{ // Le plus critique
            text: 'Demain',
            classe: 'bg-red-700 text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse'
          }];
        }
      }
      
      return indicateurs;
    };

    // Fonction de tri intelligent pour l'admin
    const trierCongesAdmin = (conges) => {
      return conges.sort((a, b) => {
        // 1. Priorité par statut (en attente en premier, puis approuvé à venir, refusé en dernier)
        const prioriteStatut = {
          'en attente': 1,
          'approuvé': 2, 
          'refusé': 3
        };
        
        if (prioriteStatut[a.statut] !== prioriteStatut[b.statut]) {
          return prioriteStatut[a.statut] - prioriteStatut[b.statut];
        }
        
        // 2. Pour les demandes en attente, tri par urgence (date de début la plus proche d'abord)
        if (a.statut === 'en attente') {
          const maintenant = new Date();
          const joursAvantA = Math.ceil((new Date(a.dateDebut) - maintenant) / (1000 * 60 * 60 * 24));
          const joursAvantB = Math.ceil((new Date(b.dateDebut) - maintenant) / (1000 * 60 * 60 * 24));
          return joursAvantA - joursAvantB;
        }
        
        // 3. Pour les approuvés, les plus proches en premier (à venir d'abord, passés ensuite)
        if (a.statut === 'approuvé') {
          const now = new Date();
          const aFutur = new Date(a.dateFin) >= now;
          const bFutur = new Date(b.dateFin) >= now;
          if (aFutur && !bFutur) return -1;
          if (!aFutur && bFutur) return 1;
          if (aFutur && bFutur) return new Date(a.dateDebut) - new Date(b.dateDebut);
          return new Date(b.dateDebut) - new Date(a.dateDebut); // passés : plus récents d'abord
        }
        
        // 4. Refusés : plus récents d'abord
        return new Date(b.dateDebut) - new Date(a.dateDebut);
      });
    };

    // Filtrer les congés selon le statut sélectionné et la recherche
    const congesFiltres = trierCongesAdmin(conges.filter((c) => {
      if (!c.user) return false;
      // Filtre statut
      if (filtre !== "tous" && c.statut !== filtre) return false;
      // Filtre type de congé
      if (filtreType !== "tous" && c.type !== filtreType) return false;
      // Filtre catégorie employé
      if (filtreCategorie !== "tous") {
        const empCategorie = (c.user.categorie || '').toLowerCase();
        if (!empCategorie.includes(filtreCategorie.toLowerCase())) return false;
      }
      // Filtre période
      if (filtrePeriode !== "tous") {
        const now = new Date();
        const debutSemaine = new Date(now);
        const dow = (now.getDay() + 6) % 7;
        debutSemaine.setDate(now.getDate() - dow);
        debutSemaine.setHours(0, 0, 0, 0);
        const finSemaine = new Date(debutSemaine);
        finSemaine.setDate(debutSemaine.getDate() + 6);
        finSemaine.setHours(23, 59, 59, 999);
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const debutMoisProchain = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const finMoisProchain = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
        const debutTrimestre = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const finTrimestre = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0, 23, 59, 59);
        const dateDebut = new Date(c.dateDebut);
        const dateFin = new Date(c.dateFin);
        if (filtrePeriode === "cette_semaine") {
          if (dateFin < debutSemaine || dateDebut > finSemaine) return false;
        } else if (filtrePeriode === "ce_mois") {
          if (dateFin < debutMois || dateDebut > finMois) return false;
        } else if (filtrePeriode === "mois_prochain") {
          if (dateFin < debutMoisProchain || dateDebut > finMoisProchain) return false;
        } else if (filtrePeriode === "trimestre") {
          if (dateFin < debutTrimestre || dateDebut > finTrimestre) return false;
        } else if (filtrePeriode === "a_venir") {
          if (dateFin < now) return false;
        } else if (filtrePeriode === "passe") {
          if (dateFin >= now) return false;
        }
      }
      // Recherche par nom/prénom/email
      const searchLower = search.toLowerCase();
      if (searchLower) {
        const email = (c.user.email || '').toLowerCase();
        const nom = (c.user.nom || '').toLowerCase();
        const prenom = (c.user.prenom || '').toLowerCase();
        const fullName = `${prenom} ${nom}`;
        if (!email.includes(searchLower) && !nom.includes(searchLower) && !prenom.includes(searchLower) && !fullName.includes(searchLower)) return false;
      }
      return true;
    }));

    // Types de congés uniques présents dans les données
    const typesCongesPresents = [...new Set(conges.map(c => c.type))].sort();

    // Catégories uniques des employés qui ont des congés
    const categoriesPresentes = [...new Set(
      conges.filter(c => c.user && c.user.categorie).map(c => c.user.categorie)
    )].sort();

    // Nombre de filtres actifs (hors recherche)
    const filtresActifs = [filtre !== "tous", filtreType !== "tous", filtrePeriode !== "tous", filtreCategorie !== "tous"].filter(Boolean).length;

    // Fermer dropdown au clic extérieur
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setOpenDropdown(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Statistiques des congés
    const statsConges = {
      total: conges.length,
      enAttente: conges.filter(c => c.statut === "en attente").length,
      approuve: conges.filter(c => c.statut === "approuvé").length,
      refuse: conges.filter(c => c.statut === "refusé").length
    };

    // Pagination
    const indexOfLastItem = page * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const congesAffiches = congesFiltres.slice(indexOfFirstItem, indexOfLastItem);

    const handleExportExcel = () => {
      const rows = congesFiltres.map(c => ({
        'Nom': c.user?.nom || '-',
        'Prénom': c.user?.prenom || '-',
        'Email': c.user?.email || '-',
        'Type': c.type,
        'Date début': new Date(c.dateDebut).toLocaleDateString('fr-FR'),
        'Date fin': new Date(c.dateFin).toLocaleDateString('fr-FR'),
        'Jours': Math.ceil((new Date(c.dateFin) - new Date(c.dateDebut)) / (1000 * 60 * 60 * 24) + 1),
        'Statut': c.statut,
        'Commentaire': c.motifEmploye || '-',
        'Justificatif': c.justificatif ? 'Oui' : 'Non'
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Demandes de congés");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `conges_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
      <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-[calc(100vh-3rem)]">
        {/* Métriques principales compactes */}
        <div className="grid gap-2 sm:gap-3 grid-cols-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-gray-100 border border-gray-200 flex-shrink-0">
                <Calendar className="w-3.5 h-3.5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">{statsConges.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-50 border border-amber-200 flex-shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">En attente</p>
                <p className="text-base sm:text-lg font-bold text-amber-600">{statsConges.enAttente}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-50 border border-green-200 flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Approuvés</p>
                <p className="text-base sm:text-lg font-bold text-green-600">{statsConges.approuve}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-red-50 border border-red-200 flex-shrink-0">
                <X className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Refusés</p>
                <p className="text-base sm:text-lg font-bold text-red-600">{statsConges.refuse}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de filtres style pill/rounded */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
          <div className="flex flex-col gap-3" ref={dropdownRef}>
            {/* Ligne 1 : Recherche + Filtres pill */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Recherche */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher nom, prénom..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-full text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Pill : Statut */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'statut' ? null : 'statut')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    filtre !== 'tous' 
                      ? 'bg-[#cf292c] text-white border-[#cf292c] shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#cf292c]/40 hover:bg-gray-50'
                  }`}
                >
                  <Clock size={14} />
                  {filtre === 'tous' ? 'Statut' : filtre === 'en attente' ? 'En attente' : filtre === 'approuvé' ? 'Approuvés' : 'Refusés'}
                  <ChevronDown size={14} className={`transition-transform ${openDropdown === 'statut' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'statut' && (
                  <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 min-w-[160px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {[{v:'tous',l:'Tous les statuts'},{v:'en attente',l:'En attente'},{v:'approuvé',l:'Approuvés'},{v:'refusé',l:'Refusés'}].map(opt => (
                      <button key={opt.v} onClick={() => { setFiltre(opt.v); setPage(1); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filtre === opt.v ? 'text-[#cf292c] font-medium bg-[#cf292c]/5' : 'text-gray-700'}`}
                      >{opt.l}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pill : Type de congé */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    filtreType !== 'tous' 
                      ? 'bg-[#cf292c] text-white border-[#cf292c] shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#cf292c]/40 hover:bg-gray-50'
                  }`}
                >
                  <Calendar size={14} />
                  {filtreType === 'tous' ? 'Type' : filtreType}
                  <ChevronDown size={14} className={`transition-transform ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'type' && (
                  <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 min-w-[180px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button onClick={() => { setFiltreType('tous'); setPage(1); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filtreType === 'tous' ? 'text-[#cf292c] font-medium bg-[#cf292c]/5' : 'text-gray-700'}`}
                    >Tous les types</button>
                    {typesCongesPresents.map(type => (
                      <button key={type} onClick={() => { setFiltreType(type); setPage(1); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filtreType === type ? 'text-[#cf292c] font-medium bg-[#cf292c]/5' : 'text-gray-700'}`}
                      >{type}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pill : Période */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'periode' ? null : 'periode')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    filtrePeriode !== 'tous' 
                      ? 'bg-[#cf292c] text-white border-[#cf292c] shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#cf292c]/40 hover:bg-gray-50'
                  }`}
                >
                  <Calendar size={14} />
                  {filtrePeriode === 'tous' ? 'Période' : filtrePeriode === 'cette_semaine' ? 'Cette semaine' : filtrePeriode === 'ce_mois' ? 'Ce mois' : filtrePeriode === 'mois_prochain' ? 'Mois prochain' : filtrePeriode === 'trimestre' ? 'Ce trimestre' : filtrePeriode === 'a_venir' ? 'À venir' : 'Passés'}
                  <ChevronDown size={14} className={`transition-transform ${openDropdown === 'periode' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'periode' && (
                  <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 min-w-[180px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Période</div>
                    {[
                      {v:'tous', l:'Toutes périodes'},
                      {v:'cette_semaine', l:'Cette semaine'},
                      {v:'ce_mois', l:'Ce mois'},
                      {v:'mois_prochain', l:'Mois prochain'},
                      {v:'trimestre', l:'Ce trimestre'},
                      {v:'a_venir', l:'À venir (futurs)'},
                      {v:'passe', l:'Passés'}
                    ].map(opt => (
                      <button key={opt.v} onClick={() => { setFiltrePeriode(opt.v); setPage(1); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filtrePeriode === opt.v ? 'text-[#cf292c] font-medium bg-[#cf292c]/5' : 'text-gray-700'}`}
                      >{opt.l}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pill : Catégorie */}
              {categoriesPresentes.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'categorie' ? null : 'categorie')}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                      filtreCategorie !== 'tous' 
                        ? 'bg-[#cf292c] text-white border-[#cf292c] shadow-sm' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#cf292c]/40 hover:bg-gray-50'
                    }`}
                  >
                    <Users size={14} />
                    {filtreCategorie === 'tous' ? 'Catégorie' : filtreCategorie}
                    <ChevronDown size={14} className={`transition-transform ${openDropdown === 'categorie' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'categorie' && (
                    <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 min-w-[170px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button onClick={() => { setFiltreCategorie('tous'); setPage(1); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filtreCategorie === 'tous' ? 'text-[#cf292c] font-medium bg-[#cf292c]/5' : 'text-gray-700'}`}
                      >Toutes catégories</button>
                      {categoriesPresentes.map(cat => (
                        <button key={cat} onClick={() => { setFiltreCategorie(cat); setPage(1); setOpenDropdown(null); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filtreCategorie === cat ? 'text-[#cf292c] font-medium bg-[#cf292c]/5' : 'text-gray-700'}`}
                        >{cat}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reset filtres */}
              {filtresActifs > 0 && (
                <button
                  onClick={() => { setFiltre('tous'); setFiltreType('tous'); setFiltrePeriode('tous'); setFiltreCategorie('tous'); setSearch(''); setPage(1); setOpenDropdown(null); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#cf292c] bg-[#cf292c]/5 border border-[#cf292c]/20 hover:bg-[#cf292c]/10 transition-all duration-200"
                >
                  <RefreshCw size={13} />
                  Reset ({filtresActifs})
                </button>
              )}
            </div>

            {/* Ligne 2 : Résultats + Pagination + Export */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{congesFiltres.length}</span> demande{congesFiltres.length !== 1 ? 's' : ''}
                </span>
                {filtresActifs > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#cf292c]/10 text-[#cf292c]">
                    <Filter size={10} /> {filtresActifs} filtre{filtresActifs > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Pagination pill */}
                <div className="inline-flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-full p-0.5">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-full hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={14} className="text-gray-600" />
                  </button>
                  <span className="px-2 text-xs font-medium text-gray-700">
                    {page}/{Math.ceil(congesFiltres.length / itemsPerPage) || 1}
                  </span>
                  <button
                    onClick={() => setPage((prev) => indexOfLastItem < congesFiltres.length ? prev + 1 : prev)}
                    disabled={indexOfLastItem >= congesFiltres.length}
                    className="p-1.5 rounded-full hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={14} className="text-gray-600" />
                  </button>
                </div>

                {/* Export pill */}
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-[#cf292c] text-white border border-[#cf292c] hover:bg-[#b32528] transition-all duration-200 shadow-sm"
                  title="Exporter en Excel"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barre d'actions groupées (visible quand une sélection existe) */}
        {selectedIds.size > 0 && (
          <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center justify-between gap-3 bg-white border border-[#cf292c]/30 rounded-2xl shadow-lg px-4 py-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#cf292c] text-white text-xs font-bold">
                {selectedIds.size}
              </span>
              demande{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Désélectionner
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={approuverSelection}
                disabled={bulkProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
              >
                <Check size={15} />
                Approuver la sélection
              </button>
              <button
                onClick={refuserSelection}
                disabled={bulkProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-[#cf292c] text-white hover:bg-[#b32528] transition-all shadow-sm disabled:opacity-50"
              >
                <X size={15} />
                Refuser la sélection
              </button>
            </div>
          </div>
        )}

        {/* Tableau moderne des congés avec style amélioré (desktop) */}
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-4 text-center border-b border-gray-200 w-10">
                    {(() => {
                      const idsEnAttente = congesAffiches.filter(c => c.statut === 'en attente').map(c => c.id);
                      const allSelected = idsEnAttente.length > 0 && idsEnAttente.every(id => selectedIds.has(id));
                      return (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-[#cf292c] focus:ring-[#cf292c] cursor-pointer accent-[#cf292c]"
                          checked={allSelected}
                          disabled={idsEnAttente.length === 0}
                          onChange={(e) => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) idsEnAttente.forEach(id => next.add(id));
                              else idsEnAttente.forEach(id => next.delete(id));
                              return next;
                            });
                          }}
                          title="Tout sélectionner (en attente)"
                        />
                      );
                    })()}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Employé
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Type de congé
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Période
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Détails
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200"></div>
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#cf292c] absolute top-0 left-0"></div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-600">Chargement des demandes de congés...</p>
                      <p className="text-xs text-gray-400 mt-1">Veuillez patienter quelques instants</p>
                    </div>
                  </td>
                </tr>
              ) : congesAffiches.length > 0 ? (
                congesAffiches.map((c) => {
                  const indicateurs = getIndicateursConge(c);
                  const isHighlighted = highlightedRow === c.id;
                  return (
                  <tr
                    key={c.id}
                    ref={isHighlighted ? highlightRef : null}
                    className={`
                      hover:bg-gray-50 transition-all duration-200 group 
                      ${indicateurs.classeSpeciale}
                      ${isHighlighted ? 'animate-highlight-row bg-red-50 border-l-4 border-l-[#cf292c]' : ''}
                    `}
                  >
                    <td className="px-4 py-4 text-center border-r border-gray-100">
                      {c.statut === 'en attente' ? (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-[#cf292c] focus:ring-[#cf292c] cursor-pointer accent-[#cf292c]"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      ) : null}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-100">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[#cf292c] rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-white text-sm font-bold">
                            {(() => {
                              if (c.user.nom && c.user.prenom) {
                                return `${c.user.prenom.charAt(0)}${c.user.nom.charAt(0)}`.toUpperCase();
                              } else if (c.user.nom || c.user.prenom) {
                                const name = c.user.nom || c.user.prenom;
                                return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
                              } else {
                                return c.user.email.charAt(0).toUpperCase() + (c.user.email.charAt(1) || '').toUpperCase();
                              }
                            })()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-gray-900 text-sm truncate">{c.user.email}</div>
                            {/* Badges minimalistes */}
                            {indicateurs.badges.map((badge, index) => (
                              <span key={index} className={badge.classe}>
                                {badge.text}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {c.user.nom && c.user.prenom ? (
                              `${c.user.prenom} ${c.user.nom}`
                            ) : c.user.nom || c.user.prenom ? (
                              c.user.nom || c.user.prenom
                            ) : (
                              "Nom non renseigné"
                            )}
                          </div>
                          {(() => {
                            const pris = joursPrisCetteAnnee(c.userId);
                            return (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5"
                                title={`Congés payés/RTT approuvés en ${new Date().getFullYear()}`}>
                                <Calendar size={10} className="text-gray-400" />
                                {pris}j pris en {new Date().getFullYear()}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-100">
                      {c.type.includes("payé") && (
                        <span className="inline-block px-3 py-1 bg-[#cf292c]/10 text-[#cf292c] text-sm font-medium rounded">
                          {c.type}
                        </span>
                      )}
                      {c.type === "RTT" && (
                        <span className="inline-block px-3 py-1 bg-[#cf292c]/15 text-[#cf292c] text-sm font-medium rounded">
                          {c.type}
                        </span>
                      )}
                      {!c.type.includes("payé") && c.type !== "RTT" && (
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded">
                          {c.type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-100">
                      <div className="flex flex-col items-center">
                        <div className="inline-flex items-center px-3 py-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200">
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium">
                            {new Date(c.dateDebut).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} - {new Date(c.dateFin).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}
                          </span>
                        </div>
                        <span className="text-xs text-[#cf292c] font-medium">
                          {Math.ceil((new Date(c.dateFin) - new Date(c.dateDebut)) / (1000 * 60 * 60 * 24) + 1)} jour(s)
                        </span>
                      </div>
                    </td>
                    {/* Nouvelle colonne Détails : Commentaire + Justificatif */}
                    <td className="px-4 py-4 border-r border-gray-100 max-w-[220px]">
                      <div className="space-y-2">
                        {/* Commentaire/Motif de l'employé */}
                        {c.motifEmploye ? (
                          <div className="group relative">
                            <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-slate-600 line-clamp-2" title={c.motifEmploye}>
                                {c.motifEmploye}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                            <FileText size={12} />
                            <span>Aucun commentaire</span>
                          </div>
                        )}
                        
                        {/* Justificatif */}
                        {c.justificatif ? (
                          <button
                            onClick={() => setPreviewJustificatif({
                              url: getImageUrl(c.justificatif),
                              type: c.justificatif.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
                              employeName: c.user?.prenom && c.user?.nom ? `${c.user.prenom} ${c.user.nom}` : c.user?.email,
                              congeType: c.type,
                              dateDebut: c.dateDebut,
                              originalName: c.justificatif.split('/').pop()
                            })}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                          >
                            <Paperclip size={12} />
                            Voir justificatif
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                            <Paperclip size={12} />
                            <span>Pas de justificatif</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-100">
                      {c.statut === "approuvé" && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                          Approuvé
                        </span>
                      )}
                      {c.statut === "refusé" && (
                        <span className="inline-block px-3 py-1 bg-[#cf292c]/10 text-[#cf292c] text-sm font-medium rounded">
                          Refusé
                        </span>
                      )}
                      {c.statut === "refusé" && c.motifRefus && (
                        <p className="mt-1.5 text-[11px] text-gray-500 italic max-w-[160px] mx-auto line-clamp-2" title={c.motifRefus}>
                          « {c.motifRefus} »
                        </p>
                      )}
                      {c.statut === "en attente" && (
                        <span className="inline-block px-3 py-1 bg-[#cf292c]/20 text-[#cf292c] text-sm font-medium rounded">
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        {/* Bouton d'analyse des conflits - Visible seulement pour les demandes en attente */}
                        {c.statut === "en attente" && (
                          <button
                            onClick={() => {
                              setSelectedCongeForAnalysis(c);
                              setShowConflictAnalysis(true);
                            }}
                            className="p-2 rounded-lg transition-colors bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
                            title="Analyser les conflits d'équipe"
                          >
                            <Users size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openConfirmModal(c.id, "approuvé")}
                          className={`p-2 rounded-lg transition-colors ${
                            c.statut === "approuvé" 
                              ? 'bg-green-100 text-green-400 cursor-not-allowed' 
                              : 'bg-white text-green-600 hover:bg-green-50 border border-green-200'
                          }`}
                          title="Approuver"
                          disabled={c.statut === "approuvé"}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => openConfirmModal(c.id, "refusé")}
                          className={`p-2 rounded-lg transition-colors ${
                            c.statut === "refusé" 
                              ? 'bg-[#cf292c]/20 text-[#cf292c]/40 cursor-not-allowed' 
                              : 'bg-white text-[#cf292c] hover:bg-[#cf292c]/5 border border-[#cf292c]/20'
                          }`}
                          title="Refuser"
                          disabled={c.statut === "refusé"}
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => openConfirmModal(c.id, "en attente")}
                          className={`p-2 rounded-lg transition-colors ${
                            c.statut === "en attente" 
                              ? 'bg-[#cf292c]/30 text-[#cf292c]/40 cursor-not-allowed' 
                              : 'bg-white text-[#cf292c] hover:bg-[#cf292c]/10 border border-[#cf292c]/30'
                          }`}
                          title="En attente"
                          disabled={c.statut === "en attente"}
                        >
                          <Clock size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
                ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 p-4 rounded-full bg-gray-50 border border-gray-100 shadow-inner">
                        <AlertCircle size={40} className="text-gray-300" />
                      </div>
                      <p className="text-lg font-semibold text-gray-600">Aucun congé trouvé</p>
                      <p className="text-sm text-gray-500 mt-2 max-w-md text-center">
                        Aucune demande ne correspond à vos critères actuels. Essayez de modifier vos filtres ou effectuez une nouvelle recherche.
                      </p>
                      <button 
                        onClick={() => {setFiltre('tous'); setFiltreType('tous'); setFiltrePeriode('tous'); setFiltreCategorie('tous'); setSearch(''); setPage(1);}}
                        className="mt-4 px-4 py-2 bg-[#cf292c] text-white rounded-lg shadow-sm hover:bg-[#b32528] transition flex items-center gap-2"
                      >
                        <RefreshCw size={16} />
                        Réinitialiser les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

  {/* Vue cartes responsive (mobile & tablette < lg) */}
  <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200"></div>
                  <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-[#cf292c] absolute top-0 left-0"></div>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">Chargement des demandes...</p>
              <p className="text-xs text-gray-400 mt-1">Veuillez patienter</p>
            </div>
          ) : congesAffiches.length > 0 ? (
            congesAffiches.map((c) => {
              const indicateurs = getIndicateursConge(c);
              const isHighlighted = highlightedRow === c.id;
              return (
                <div 
                  key={c.id} 
                  ref={isHighlighted ? highlightRef : null}
                  className={`
                    bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col relative 
                    ${indicateurs.classeSpeciale}
                    ${isHighlighted ? 'animate-highlight-row border-l-4 border-l-[#cf292c]' : ''}
                  `}
                > 
                  {/* Accent vertical si urgence */}
                  <div className="p-3 pb-2">
                    {c.statut === 'en attente' && (
                      <label className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-gray-300 text-[#cf292c] focus:ring-[#cf292c] accent-[#cf292c]"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </label>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full bg-[#cf292c] flex items-center justify-center text-white font-semibold text-xs shadow-inner tracking-wide">
                          {(() => {
                            if (c.user.nom && c.user.prenom) {
                              return `${c.user.prenom.charAt(0)}${c.user.nom.charAt(0)}`.toUpperCase();
                            } else if (c.user.nom || c.user.prenom) {
                              const name = c.user.nom || c.user.prenom;
                              return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
                            } else {
                              return c.user.email.charAt(0).toUpperCase() + (c.user.email.charAt(1) || '').toUpperCase();
                            }
                          })()}
                        </div>
                        {/* Jours badge overlay */}
                        <span className="absolute -bottom-1 -right-1 bg-white border border-[#cf292c]/30 text-[#cf292c] text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm">
                          {Math.ceil((new Date(c.dateFin) - new Date(c.dateDebut)) / (1000 * 60 * 60 * 24) + 1)}j
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-medium text-gray-900 truncate max-w-[160px]">{c.user.email}</span>
                          {indicateurs.badges.map((b, i) => (
                            <span key={i} className={`${b.classe} px-2 py-0.5 leading-none`}>{b.text}</span>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {c.user.nom && c.user.prenom ? (
                            `${c.user.prenom} ${c.user.nom}`
                          ) : c.user.nom || c.user.prenom ? (
                            c.user.nom || c.user.prenom
                          ) : (
                            'Nom non renseigné'
                          )}
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                          <Calendar size={10} className="text-gray-400" />
                          {joursPrisCetteAnnee(c.userId)}j pris en {new Date().getFullYear()}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {/* Type */}
                          {c.type.includes('payé') && (
                            <span className="px-2 py-0.5 rounded-md bg-[#cf292c]/10 text-[#cf292c] text-[11px] font-medium">{c.type}</span>
                          )}
                          {c.type === 'RTT' && (
                            <span className="px-2 py-0.5 rounded-md bg-[#cf292c]/15 text-[#cf292c] text-[11px] font-medium">{c.type}</span>
                          )}
                          {!c.type.includes('payé') && c.type !== 'RTT' && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">{c.type}</span>
                          )}
                          {/* Statut */}
                          {c.statut === 'approuvé' && (
                            <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[11px] font-medium">Approuvé</span>
                          )}
                          {c.statut === 'refusé' && (
                            <span className="px-2 py-0.5 rounded-md bg-[#cf292c]/10 text-[#cf292c] text-[11px] font-medium">Refusé</span>
                          )}
                          {c.statut === 'en attente' && (
                            <span className="px-2 py-0.5 rounded-md bg-[#cf292c]/20 text-[#cf292c] text-[11px] font-medium">En attente</span>
                          )}
                        </div>
                        {c.statut === 'refusé' && c.motifRefus && (
                          <p className="mt-1.5 text-[11px] text-gray-500 italic leading-snug">
                            Motif du refus : « {c.motifRefus} »
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Période compacte */}
                    <div className="mt-3 bg-gray-50/70 border border-gray-200 rounded-md px-2.5 py-1.5 flex items-center justify-start gap-2 text-[12px] text-gray-700 font-medium">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(c.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {new Date(c.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                    {/* Section Détails mobile : commentaire + justificatif */}
                    {(c.motifEmploye || c.justificatif) && (
                      <div className="mt-2 space-y-2">
                        {/* Commentaire/Motif de l'employé */}
                        {c.motifEmploye && (
                          <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                            <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Commentaire employé</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{c.motifEmploye}</p>
                            </div>
                          </div>
                        )}
                        {/* Justificatif mobile - amélioré */}
                        {c.justificatif && (
                          <button
                            onClick={() => setPreviewJustificatif({
                              url: getImageUrl(c.justificatif),
                              type: c.justificatif.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
                              employeName: c.user?.prenom && c.user?.nom ? `${c.user.prenom} ${c.user.nom}` : c.user?.email,
                              congeType: c.type,
                              dateDebut: c.dateDebut,
                              originalName: c.justificatif.split('/').pop()
                            })}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors"
                          >
                            <Eye size={14} />
                            Voir le justificatif
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="px-3 pt-2 pb-3 border-t border-gray-100 bg-white">
                    <div className="grid grid-cols-2 gap-2">
                      {c.statut === 'en attente' && (
                        <button
                          onClick={() => { setSelectedCongeForAnalysis(c); setShowConflictAnalysis(true); }}
                          className="col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition"
                        >
                          <Users size={14} /> Conflits
                        </button>
                      )}
                      <button
                        onClick={() => openConfirmModal(c.id, 'approuvé')}
                        disabled={c.statut === 'approuvé'}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium rounded-md transition border ${c.statut === 'approuvé' ? 'bg-green-100 text-green-400 border-green-200 cursor-not-allowed' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'}`}
                      >
                        <Check size={14} /> OK
                      </button>
                      <button
                        onClick={() => openConfirmModal(c.id, 'refusé')}
                        disabled={c.statut === 'refusé'}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium rounded-md transition border ${c.statut === 'refusé' ? 'bg-[#cf292c]/20 text-[#cf292c]/40 border-[#cf292c]/20 cursor-not-allowed' : 'bg-white text-[#cf292c] border-[#cf292c]/30 hover:bg-[#cf292c]/5'}`}
                      >
                        <X size={14} /> Non
                      </button>
                      <button
                        onClick={() => openConfirmModal(c.id, 'en attente')}
                        disabled={c.statut === 'en attente'}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium rounded-md transition border ${c.statut === 'en attente' ? 'bg-[#cf292c]/30 text-[#cf292c]/50 border-[#cf292c]/30 cursor-not-allowed' : 'bg-white text-[#cf292c] border-[#cf292c]/30 hover:bg-[#cf292c]/10'}`}
                      >
                        <Clock size={14} /> Attente
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col items-center text-center shadow-sm">
              <div className="mb-4 p-3 rounded-full bg-gray-50 border border-gray-100">
                <AlertCircle size={36} className="text-gray-300" />
              </div>
              <p className="text-base font-semibold text-gray-600">Aucun congé trouvé</p>
              <p className="text-xs text-gray-500 mt-2">Aucune demande ne correspond à vos critères.</p>
              <button
                onClick={() => { setFiltre('tous'); setFiltreType('tous'); setFiltrePeriode('tous'); setFiltreCategorie('tous'); setSearch(''); setPage(1); }}
                className="mt-4 px-4 py-2 bg-[#cf292c] text-white rounded-lg shadow-sm hover:bg-[#b32528] transition flex items-center gap-2 text-xs"
              >
                <RefreshCw size={14} /> Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* Modale d'analyse des conflits */}
        {showConflictAnalysis && selectedCongeForAnalysis && (
          <ConflictAnalysisModal
            conge={selectedCongeForAnalysis}
            employes={employes}
            allConges={conges}
            onClose={() => {
              setShowConflictAnalysis(false);
              setSelectedCongeForAnalysis(null);
            }}
            onApprove={(congeId) => {
              setShowConflictAnalysis(false);
              setSelectedCongeForAnalysis(null);
              openConfirmModal(congeId, "approuvé");
            }}
            onReject={(congeId) => {
              setShowConflictAnalysis(false);
              setSelectedCongeForAnalysis(null);
              openConfirmModal(congeId, "refusé");
            }}
          />
        )}
        
        {/* Modal de confirmation */}
        {/* Modal de motif de refus */}
        {showRefusModal && refusData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#cf292c]/10 flex items-center justify-center flex-shrink-0">
                  <X size={20} className="text-[#cf292c]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Refuser {refusData.ids.length > 1 ? `${refusData.ids.length} demandes` : 'la demande'}
                  </h3>
                  <p className="text-xs text-gray-500">Le motif sera visible par l'employé.</p>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Motif du refus <span className="text-[#cf292c]">*</span>
              </label>
              <textarea
                autoFocus
                value={refusData.motif}
                onChange={(e) => setRefusData(prev => ({ ...prev, motif: e.target.value }))}
                rows={3}
                placeholder="Ex. : Période de forte affluence, effectif insuffisant…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/40 focus:border-[#cf292c] resize-none"
              />
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => { setShowRefusModal(false); setRefusData(null); }}
                  disabled={bulkProcessing}
                  className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={executerRefus}
                  disabled={bulkProcessing || !(refusData.motif || '').trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-[#cf292c] text-white hover:bg-[#b32528] transition-colors shadow-sm disabled:opacity-50"
                >
                  <X size={15} />
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Modification du statut
              </h3>
              <p className="text-gray-600 mb-6">
                {pendingAction && (
                  <>
                    Voulez-vous changer le statut de la demande de congé à 
                    <span className="font-semibold text-gray-900"> "{pendingAction.statut}"</span> ?
                    <br />
                    <span className="text-sm text-gray-500 mt-2 block">
                      Cette action sera immédiatement appliquée.
                    </span>
                  </>
                )}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmAction}
                  className="px-4 py-2 bg-[#cf292c] text-white hover:bg-[#b32528] rounded-md transition"
                >
                  Confirmer
                </button>
                </div>
            </div>
          </div>
        )}

        {/* Modal de preview du justificatif */}
        {previewJustificatif && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setPreviewJustificatif(null)}
            />
            <div className="fixed inset-4 lg:inset-10 z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      {previewJustificatif.type === 'pdf' ? (
                        <FileText className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Eye className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                        Justificatif - {previewJustificatif.congeType}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {previewJustificatif.employeName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewJustificatif.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <ExternalLink size={16} />
                      Ouvrir
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(previewJustificatif.url);
                          const blob = await response.blob();
                          const extension = previewJustificatif.originalName?.split('.').pop() || (previewJustificatif.type === 'pdf' ? 'pdf' : 'jpg');
                          const employeeName = previewJustificatif.employeName?.replace(/\s+/g, '_') || 'employe';
                          const dateStr = previewJustificatif.dateDebut ? new Date(previewJustificatif.dateDebut).toLocaleDateString('fr-FR').replace(/\//g, '-') : new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
                          const fileName = `Justificatif_${employeeName}_${dateStr}.${extension}`;
                          saveAs(blob, fileName);
                        } catch (error) {
                          console.error('Erreur téléchargement:', error);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                    >
                      <Download size={16} />
                      Télécharger
                    </button>
                    <button
                      onClick={() => setPreviewJustificatif(null)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-900 flex items-center justify-center min-h-[400px]">
                  {previewJustificatif.type === 'pdf' ? (
                    <iframe
                      src={previewJustificatif.url}
                      className="w-full h-full min-h-[500px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
                      title="Preview PDF"
                    />
                  ) : (
                    <img
                      src={previewJustificatif.url}
                      alt="Justificatif"
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions rapides supprimées - remplacées par les boutons en haut */}
      </div>
    );
  }

  export default CongesTable;