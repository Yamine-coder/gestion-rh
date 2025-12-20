  import { useEffect, useState, useRef } from "react";
  import axios from "axios";
  import { Check, X, Clock, ChevronLeft, ChevronRight, Search, Calendar, AlertCircle, RefreshCw, Download, Users, Paperclip, FileText, Eye, ExternalLink } from "lucide-react";
  import alertService from "../services/alertService";
  import * as XLSX from "xlsx";
  import { saveAs } from "file-saver";
  import ConflictAnalysisModal from "./ConflictAnalysisModal";
  import "../styles/menu-animations.css"; // Pour l'animation highlight
  import { getImageUrl } from '../utils/imageUtils';

  // URL de l'API (utilise la variable d'environnement en production)
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  function CongesTable({ onViewCongés, onCongeUpdate, highlightCongeId, onHighlightComplete }) {
    const [conges, setConges] = useState([]);
    const [employes, setEmployes] = useState([]);
    const [filtre, setFiltre] = useState("tous");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showConflictAnalysis, setShowConflictAnalysis] = useState(false);
    const [selectedCongeForAnalysis, setSelectedCongeForAnalysis] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [previewJustificatif, setPreviewJustificatif] = useState(null); // { url, type, employeName }
    const [highlightedRow, setHighlightedRow] = useState(null); // ID de la ligne a highlighter
    const highlightRef = useRef(null); // Ref pour le scroll
    const itemsPerPage = 5;
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
    const updateStatut = async (id, statut) => {
      try {
        await axios.put(
          `${API_BASE}/conges/${id}`,
          { statut },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Mettre à jour localement sans recharger toute la liste
        setConges((prev) =>
          prev.map((c) => (c.id === id ? { ...c, statut } : c))
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



    useEffect(() => {
      fetchConges();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effet pour gérer le highlight d'une ligne depuis une notification
    useEffect(() => {
      if (highlightCongeId && conges.length > 0) {
        console.log('🎯 Highlight demandé pour congé ID:', highlightCongeId);
        
        // Trouver l'index du congé dans la liste filtrée actuelle
        const congesList = conges.filter(c => 
          (filtre === "tous" ? true : c.statut === filtre) &&
          c.user.email.toLowerCase().includes(search.toLowerCase())
        );
        const congeIndex = congesList.findIndex(c => c.id === highlightCongeId);
        console.log('🎯 Index trouvé:', congeIndex, 'sur', congesList.length, 'congés');
        
        if (congeIndex !== -1) {
          // Calculer la page où se trouve le congé
          const targetPage = Math.ceil((congeIndex + 1) / itemsPerPage);
          console.log('🎯 Navigation vers page:', targetPage);
          setPage(targetPage);
          
          // Activer le highlight
          setHighlightedRow(highlightCongeId);
          console.log('🎯 Highlight activé pour ID:', highlightCongeId);
          
          // Scroll vers la ligne après un court délai (pour laisser le temps au render)
          setTimeout(() => {
            if (highlightRef.current) {
              console.log('🎯 Scroll vers la ligne');
              highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
          
          // Désactiver le highlight après 3 secondes
          setTimeout(() => {
            console.log('🎯 Highlight désactivé');
            setHighlightedRow(null);
            if (onHighlightComplete) {
              onHighlightComplete();
            }
          }, 3500);
        } else {
          // Le congé n'est pas visible avec le filtre actuel, réinitialiser les filtres
          console.log('🎯 Congé non trouvé, réinitialisation des filtres');
          setFiltre('tous');
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

    // Fonction de tri intelligent pour l'admin - VERSION CORRIGÉE
    const trierCongesAdmin = (conges) => {
      return conges.sort((a, b) => {
        // 1. Priorité par statut (en attente en premier)
        const prioriteStatut = {
          'en attente': 1,
          'approuvé': 2, 
          'refusé': 3
        };
        
        if (prioriteStatut[a.statut] !== prioriteStatut[b.statut]) {
          return prioriteStatut[a.statut] - prioriteStatut[b.statut];
        }
        
        // 2. Pour les demandes en attente, tri par proximité des congés
        if (a.statut === 'en attente' && b.statut === 'en attente') {
          const maintenant = new Date();
          const joursAvantA = Math.ceil((new Date(a.dateDebut) - maintenant) / (1000 * 60 * 60 * 24));
          const joursAvantB = Math.ceil((new Date(b.dateDebut) - maintenant) / (1000 * 60 * 60 * 24));
          
          // Tri par urgence : les congés les plus proches en premier
          return joursAvantA - joursAvantB;
        }
        
        // 3. Pour même statut, tri par date de début des congés
        return new Date(a.dateDebut) - new Date(b.dateDebut);
      });
    };

    // Filtrer les congés selon le statut sélectionné et la recherche
    const congesFiltres = trierCongesAdmin(conges.filter((c) =>
      (filtre === "tous" ? true : c.statut === filtre) &&
      c.user.email.toLowerCase().includes(search.toLowerCase())
    ));

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
        'Email': c.user.email,
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

        {/* Barre unifiée : Filtres + Pagination */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Filtres à gauche */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Barre de recherche compacte */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              
              {/* Sélecteur de statut */}
              <div className="relative min-w-[150px]">
                <select
                  value={filtre}
                  onChange={(e) => setFiltre(e.target.value)}
                  className="w-full appearance-none text-sm border border-gray-300 rounded-lg pl-3 pr-7 py-1.5 bg-white focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="en attente">En attente</option>
                  <option value="approuvé">Approuvés</option>
                  <option value="refusé">Refusés</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pagination à droite */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="flex items-center bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                <div className="h-2 w-2 bg-[#cf292c] rounded-full mr-2"></div>
                <span className="text-xs text-gray-600">
                  Page <span className="font-semibold text-[#cf292c]">{page}</span>/<span className="font-semibold">{Math.ceil(congesFiltres.length / itemsPerPage) || 1}</span>
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  ({congesFiltres.length})
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-[#cf292c]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() =>
                    setPage((prev) =>
                      indexOfLastItem < congesFiltres.length ? prev + 1 : prev
                    )
                  }
                  disabled={indexOfLastItem >= congesFiltres.length}
                  className="p-1.5 text-sm bg-[#cf292c] text-white rounded-md hover:bg-[#b32528] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              {/* Bouton Export */}
              <button
                onClick={handleExportExcel}
                className="p-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1"
                title="Exporter en Excel"
              >
                <Download size={14} />
                <span className="hidden sm:inline text-xs font-medium">Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tableau moderne des congés avec style amélioré (desktop) */}
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
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
                  <td colSpan="6" className="px-6 py-12 text-center">
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
                  <td colSpan="6" className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 p-4 rounded-full bg-gray-50 border border-gray-100 shadow-inner">
                        <AlertCircle size={40} className="text-gray-300" />
                      </div>
                      <p className="text-lg font-semibold text-gray-600">Aucun congé trouvé</p>
                      <p className="text-sm text-gray-500 mt-2 max-w-md text-center">
                        Aucune demande ne correspond à vos critères actuels. Essayez de modifier vos filtres ou effectuez une nouvelle recherche.
                      </p>
                      <button 
                        onClick={() => {setFiltre('tous'); setSearch('');}}
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
                onClick={() => { setFiltre('tous'); setSearch(''); }}
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