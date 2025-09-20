  import { useEffect, useState } from "react";
  import axios from "axios";
  import { Check, X, Clock, ChevronLeft, ChevronRight, Search, Calendar, AlertCircle, RefreshCw, Download, Users } from "lucide-react";
  import alertService from "../services/alertService";
  import * as XLSX from "xlsx";
  import { saveAs } from "file-saver";
  import ConflictAnalysisModal from "./ConflictAnalysisModal";

  function CongesTable({ onViewCongés, onCongeUpdate }) {
    const [conges, setConges] = useState([]);
    const [employes, setEmployes] = useState([]);
    const [filtre, setFiltre] = useState("tous");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showConflictAnalysis, setShowConflictAnalysis] = useState(false);
    const [selectedCongeForAnalysis, setSelectedCongeForAnalysis] = useState(null);
    const itemsPerPage = 5;
    const token = localStorage.getItem("token");

    // Récupérer les congés depuis l'API
    const fetchConges = async () => {
      setLoading(true);
      try {
        // Récupérer les congés ET les employés en parallèle
        const [congesRes, employesRes] = await Promise.all([
          axios.get("http://localhost:5000/admin/conges", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/admin/employes", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);
        
        setConges(congesRes.data);
        setEmployes(employesRes.data);
        
        // Marquer automatiquement toutes les demandes en attente comme vues
        await axios.post(
          "http://localhost:5000/admin/conges/vu", 
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

    // Mettre à jour le statut d'un congé
    const updateStatut = async (id, statut) => {
      try {
        await axios.put(
          `http://localhost:5000/conges/${id}`,
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
        
        // Notification élégante
        alertService.success('Statut mis à jour', `La demande de congé a été ${statut === 'approuvé' ? 'approuvée' : statut === 'refusé' ? 'refusée' : 'mise en attente'} avec succès.`);
      } catch (err) {
        // Message d'erreur
        alertService.error('Erreur', 'Une erreur est survenue lors de la mise à jour.');
      }
    };

    useEffect(() => {
      fetchConges();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        Employé: c.user.email,
        Type: c.type,
        'Date début': new Date(c.dateDebut).toLocaleDateString(),
        'Date fin': new Date(c.dateFin).toLocaleDateString(),
        'Jours': Math.ceil((new Date(c.dateFin) - new Date(c.dateDebut)) / (1000 * 60 * 60 * 24) + 1),
        'Statut': c.statut
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
        {/* Actions compactes en haut à droite */}
        <div className="flex items-center justify-end gap-2 mb-4">
          {/* Indicateur de mise à jour automatique */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline font-medium text-green-700">Mise à jour auto</span>
          </div>
          <button
            onClick={fetchConges}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{loading ? 'Chargement...' : 'Actualiser'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#cf292c] border border-[#cf292c] rounded hover:bg-[#b32528] transition-colors shadow-sm"
            title="Exporter en Excel"
          >
            <Download className="w-3 h-3" />
            <span className="hidden xs:inline">Export</span>
          </button>
        </div>

        {/* Métriques principales épurées */}
        <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">Total</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{statsConges.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 border border-amber-200 flex-shrink-0">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">En attente</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-600">{statsConges.enAttente}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-green-50 border border-green-200 flex-shrink-0">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">Approuvés</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{statsConges.approuve}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-red-50 border border-red-200 flex-shrink-0">
                <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">Refusés</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{statsConges.refuse}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section de recherche et filtres épurée */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Barre de recherche compacte */}
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Sélecteur de statut épuré */}
            <div className="relative min-w-[180px]">
              <select
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
                className="w-full appearance-none text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-2 bg-white focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200"
              >
                <option value="tous">Tous les statuts</option>
                <option value="en attente">En attente</option>
                <option value="approuvé">Approuvés</option>
                <option value="refusé">Refusés</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
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
                  <td colSpan="5" className="px-6 py-12 text-center">
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
                  return (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50 transition-all duration-200 group ${indicateurs.classeSpeciale}`}
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
                          onClick={() => updateStatut(c.id, "approuvé")}
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
                          onClick={() => updateStatut(c.id, "refusé")}
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
                          onClick={() => updateStatut(c.id, "en attente")}
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
                  <td colSpan="5" className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 p-4 rounded-full bg-gray-50 border border-gray-100 shadow-inner">
                        <AlertCircle size={40} className="text-gray-300" />
                      </div>
                      <p className="text-lg font-semibold text-gray-600">Aucun congé trouvé</p>
                      <p className="text-sm text-gray-500 mt-2 max-w-md">
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
              return (
                <div key={c.id} className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col relative ${indicateurs.classeSpeciale}`}> 
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
                        onClick={() => updateStatut(c.id, 'approuvé')}
                        disabled={c.statut === 'approuvé'}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium rounded-md transition border ${c.statut === 'approuvé' ? 'bg-green-100 text-green-400 border-green-200 cursor-not-allowed' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'}`}
                      >
                        <Check size={14} /> OK
                      </button>
                      <button
                        onClick={() => updateStatut(c.id, 'refusé')}
                        disabled={c.statut === 'refusé'}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium rounded-md transition border ${c.statut === 'refusé' ? 'bg-[#cf292c]/20 text-[#cf292c]/40 border-[#cf292c]/20 cursor-not-allowed' : 'bg-white text-[#cf292c] border-[#cf292c]/30 hover:bg-[#cf292c]/5'}`}
                      >
                        <X size={14} /> Non
                      </button>
                      <button
                        onClick={() => updateStatut(c.id, 'en attente')}
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

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="mb-3 sm:mb-0 flex items-center bg-gray-50 px-4 py-2 rounded-lg shadow-inner">
            <div className="flex items-center">
              <div className="h-3 w-3 bg-gradient-to-r from-[#ff9292] to-[#cf292c] rounded-full mr-2"></div>
              <p className="text-sm text-gray-700 font-medium">
                Page <span className="mx-1 text-[#cf292c] font-bold">{page}</span> sur <span className="font-bold">{Math.ceil(congesFiltres.length / itemsPerPage) || 1}</span>
              </p>
            </div>
            <div className="ml-2 px-2 py-0.5 bg-gray-200 rounded-md">
              <span className="text-xs text-gray-700 font-medium">
                {congesFiltres.length} résultat{congesFiltres.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-[#cf292c]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center"
            >
              <ChevronLeft size={16} className="mr-1 text-[#cf292c]" />
              Précédent
            </button>
            <button
              onClick={() =>
                setPage((prev) =>
                  indexOfLastItem < congesFiltres.length ? prev + 1 : prev
                )
              }
              disabled={indexOfLastItem >= congesFiltres.length}
              className="px-4 py-2 text-sm bg-[#cf292c] text-white rounded-lg shadow-sm hover:bg-[#b32528] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center"
            >
              Suivant
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
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
              updateStatut(congeId, "approuvé");
              setShowConflictAnalysis(false);
              setSelectedCongeForAnalysis(null);
            }}
            onReject={(congeId) => {
              updateStatut(congeId, "refusé");
              setShowConflictAnalysis(false);
              setSelectedCongeForAnalysis(null);
            }}
          />
        )}
        
        {/* Actions rapides supprimées - remplacées par les boutons en haut */}
      </div>
    );
  }

  export default CongesTable;