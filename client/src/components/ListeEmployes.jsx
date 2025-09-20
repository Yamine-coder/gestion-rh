import { useEffect, useState } from "react";
import axios from "axios";
import { Search, QrCode, RefreshCw } from "lucide-react";
import alertService from "../services/alertService";
import "./animations.css"; // Import des animations partagées

// Fonction pour obtenir la catégorie d'un employé avec style
const getCategorieEmploye = (employe) => {
  if (!employe.categorie) {
    return { label: 'Non défini', color: 'bg-gray-100 text-gray-600', icon: '❓' };
  }
  
  const categorie = employe.categorie.toLowerCase();
  
  if (categorie.includes('cuisine')) {
    return { label: 'Cuisine', color: 'bg-orange-100 text-orange-800', icon: '👨‍🍳' };
  }
  if (categorie.includes('service')) {
    return { label: 'Service', color: 'bg-blue-100 text-blue-800', icon: '🍽️' };
  }
  if (categorie.includes('management') || categorie.includes('admin') || categorie.includes('direction')) {
    return { label: 'Management', color: 'bg-purple-100 text-purple-800', icon: '💼' };
  }
  if (categorie.includes('technique') || categorie.includes('maintenance')) {
    return { label: 'Technique', color: 'bg-green-100 text-green-800', icon: '🔧' };
  }
  if (categorie.includes('entretien') || categorie.includes('nettoyage')) {
    return { label: 'Entretien', color: 'bg-yellow-100 text-yellow-800', icon: '🧹' };
  }
  if (categorie.includes('operations') || categorie.includes('logistique')) {
    return { label: 'Opérations', color: 'bg-indigo-100 text-indigo-800', icon: '📦' };
  }
  if (categorie.includes('rh') || categorie.includes('ressources')) {
    return { label: 'RH', color: 'bg-pink-100 text-pink-800', icon: '🤝' };
  }
  if (categorie.includes('finance') || categorie.includes('comptabilité')) {
    return { label: 'Finance', color: 'bg-emerald-100 text-emerald-800', icon: '💰' };
  }
  
  // Catégorie personnalisée
  return { 
    label: employe.categorie, 
    color: 'bg-slate-100 text-slate-800', 
    icon: '🏷️' 
  };
};

function ListeEmployes({ onRegisterRefresh }) {
  const [employes, setEmployes] = useState([]);
  const [edits, setEdits] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [qrCodes, setQrCodes] = useState({});
  const [selectedEmployeId, setSelectedEmployeId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 5;
  const token = localStorage.getItem("token");

  const fetchEmployes = async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get("http://localhost:5000/admin/employes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployes(res.data);
    } catch (err) {
      console.error("Erreur récupération employés :", err);
      alertService.error("Erreur", "Impossible de récupérer les employés.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchQRCode = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/admin/employes/${id}/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQrCodes((prev) => ({ ...prev, [id]: res.data.qrCode }));
      setSelectedEmployeId(id);
    } catch (err) {
      console.error("Erreur QR Code", err);
      alertService.error("Erreur", "Impossible de générer le QR Code.");
    }
  };

  useEffect(() => {
    fetchEmployes();
    
    // Enregistrer la fonction de rafraîchissement pour qu'elle soit accessible par le parent
    if (onRegisterRefresh && typeof onRegisterRefresh === 'function') {
      onRegisterRefresh(fetchEmployes);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = async (id) => {
    try {
      await axios.put(
        `http://localhost:5000/admin/employes/${id}`,
        { email: edits[id] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alertService.success("Succès", "L'email de l'employé a été modifié.");
      fetchEmployes();
    } catch (err) {
      console.error("Erreur modification :", err);
      alertService.error("Erreur", "Impossible de modifier l'employé.");
    }
  };

  const handleDelete = async (id) => {
    // Trouver l'employé pour afficher ses informations dans la confirmation
    const employe = employes.find(e => e.id === id);
    
    // Afficher la popup de confirmation de suppression
    const result = await alertService.confirmDelete(employe ? employe.email : "cet employé");

    // Si l'utilisateur n'a pas confirmé, arrêter la suppression
    if (!result.isConfirmed) return;

    // Procéder à la suppression seulement si confirmée
    try {
      await axios.delete(`http://localhost:5000/admin/employes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Notification de succès avec animation
      alertService.success("Supprimé", "L'employé a été supprimé avec succès");
      
      fetchEmployes();
    } catch (err) {
      console.error("Erreur suppression :", err);
      
      // Récupérer les détails de l'erreur depuis la réponse API
      const errorMessage = err.response?.data?.error || "Impossible de supprimer cet employé.";
      const errorDetails = err.response?.data?.details;
      
      // Afficher une erreur plus détaillée
      alertService.error("Erreur", errorMessage + (errorDetails ? `\n\nDétails: ${errorDetails}` : ""));
    }
  };

  const filteredEmployes = employes.filter((e) => {
    const searchTerm = search.toLowerCase();
    return (
      e.email.toLowerCase().includes(searchTerm) ||
      (e.nom && e.nom.toLowerCase().includes(searchTerm)) ||
      (e.prenom && e.prenom.toLowerCase().includes(searchTerm)) ||
      (e.categorie && e.categorie.toLowerCase().includes(searchTerm)) ||
      e.role.toLowerCase().includes(searchTerm)
    );
  });

  const indexOfLastItem = page * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployes = filteredEmployes.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="relative bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100 animate-fadeIn">
      {/* Header modernisé inspiré du formulaire de création */}
      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-[#cf292c] to-[#e74c3c]">
        <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 rounded-full bg-white/20 backdrop-blur-sm flex-shrink-0 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 sm:h-6 w-5 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">
                Gestion des utilisateurs
              </h2>
              <p className="text-xs sm:text-sm text-white/80 max-w-lg">
                {filteredEmployes.length} utilisateur{filteredEmployes.length !== 1 ? 's' : ''} enregistré{filteredEmployes.length !== 1 ? 's' : ''} dans le système
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button 
              onClick={fetchEmployes} 
              className="p-2 sm:p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow backdrop-blur-sm border border-white/20" 
              disabled={isRefreshing}
              title="Rafraîchir la liste"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Barre de recherche et statut - Design amélioré */}
      <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white shadow-sm flex-shrink-0">
          <Search className="h-4 sm:h-5 w-4 sm:w-5" />
        </div>
        
        <div className="flex-grow space-y-3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Rechercher par email, nom, prénom, catégorie ou rôle"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] text-sm shadow-sm transition-all duration-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                title="Effacer la recherche"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-center sm:justify-start">
            {isRefreshing ? (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg animate-pulseText text-center sm:text-left border border-gray-200">
                <svg className="animate-spin h-3 w-3 text-[#cf292c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs text-gray-700">Actualisation en cours...</span>
              </div>
            ) : (
              <div className="bg-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 hover:bg-gray-100 justify-center sm:justify-start border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="whitespace-nowrap text-xs text-gray-700">Dernière actualisation: {new Date().toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tableau moderne inspiré du formulaire de création */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
        {/* Version desktop du tableau - affiché uniquement sur les écrans md et plus */}
        <div className="hidden md:block">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Email, Rôle & Catégorie</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Date de création</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                      <QrCode className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">QR Code</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {currentEmployes.map((e, index) => (
                <tr 
                  key={e.id} 
                  className="hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-blue-50/30 transition-all duration-200 group animate-slideInLeft"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-5">
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          value={edits[e.id] ?? e.email}
                          onChange={(ev) => setEdits({ ...edits, [e.id]: ev.target.value })}
                          className="w-full border border-gray-300 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200 shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm"
                          placeholder="Email de l'employé..."
                        />
                        {edits[e.id] !== undefined && edits[e.id] !== e.email && (
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gradient-to-r from-[#cf292c] to-red-500 rounded-full animate-pulse shadow-lg">
                            <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 border ${
                          e.role === 'admin' 
                            ? 'bg-gradient-to-r from-red-100 via-red-50 to-pink-50 text-red-800 border-red-200/50 hover:from-red-200 hover:to-pink-100' 
                            : 'bg-gradient-to-r from-blue-100 via-blue-50 to-indigo-50 text-blue-800 border-blue-200/50 hover:from-blue-200 hover:to-indigo-100'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${e.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`}></div>
                          {e.role === 'admin' ? '👑 Admin' : '👨‍🍳 Employé'}
                        </span>
                        
                        {/* Badge de catégorie pour les employés */}
                        {e.role === 'employee' && (() => {
                          const categorie = getCategorieEmploye(e);
                          return (
                            <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md border ${categorie.color}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                              <span>{categorie.icon}</span>
                              <span>{categorie.label}</span>
                            </span>
                          );
                        })()}
                        
                        {e.nom && e.prenom && (
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md border bg-gradient-to-r from-gray-50 via-white to-gray-50 text-gray-700 border-gray-200/60 hover:from-gray-100 hover:to-gray-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                            {e.prenom} {e.nom}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 text-green-800 border border-green-200/50 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md hover:from-green-100 hover:to-emerald-100">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {new Date(e.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEdit(e.id)}
                        disabled={!edits[e.id] || edits[e.id] === e.email}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 border ${
                          !edits[e.id] || edits[e.id] === e.email
                            ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-500 border-gray-200 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white border-blue-400 hover:from-blue-600 hover:to-indigo-700 shadow-blue-200/50'
                        }`}
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 border bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white border-red-400 hover:from-red-600 hover:to-rose-700 shadow-red-200/50"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Supprimer
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {e.role === 'employee' ? (
                      <div>
                        <button
                          onClick={() =>
                            selectedEmployeId === e.id
                              ? setSelectedEmployeId(null)
                              : fetchQRCode(e.id)
                          }
                          className="text-xs px-3.5 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-600 hover:from-indigo-100 hover:to-indigo-200 rounded-lg flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 ring-1 ring-indigo-200/30"
                        >
                          <QrCode size={14} />
                          {selectedEmployeId === e.id ? "Masquer le QR" : "Afficher le QR"}
                        </button>

                        {qrCodes[e.id] && selectedEmployeId === e.id && (
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg shadow-md animate-fadeIn">
                            <div className="flex items-center justify-center">
                              <div className="relative p-1.5 bg-gradient-to-br from-[#cf292c]/10 to-[#e74c3c]/10 rounded-lg">
                                <img
                                  src={qrCodes[e.id]}
                                  alt={`QR code de ${e.email}`}
                                  className="w-32 h-32 rounded transition-all duration-300 hover:scale-110"
                                />
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => setSelectedEmployeId(null)}
                                  title="Fermer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-center text-gray-600 bg-gray-50 py-1 px-2 rounded-lg">
                              QR Code pour {e.email}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-xs text-gray-400 bg-gray-50 px-3.5 py-1.5 rounded-lg inline-block border border-gray-100">
                          Pas de QR code<br />pour les admins
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Version mobile optimisée - design en cartes compactes */}
        <div className="md:hidden space-y-3 p-1">
          {currentEmployes.map((e, index) => (
            <div 
              key={e.id} 
              className="bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/80 rounded-2xl p-4 hover:shadow-lg hover:border-gray-300/60 transition-all duration-300 animate-slideInLeft shadow-sm hover:from-white hover:to-blue-50/30"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* En-tête compact avec email et statut */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <input
                      value={edits[e.id] ?? e.email}
                      onChange={(ev) => setEdits({ ...edits, [e.id]: ev.target.value })}
                      className="w-full border border-gray-300/60 px-3 py-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all duration-200 shadow-sm hover:shadow-md bg-white/90 backdrop-blur-sm text-gray-800"
                      placeholder="Email de l'employé..."
                    />
                    {edits[e.id] !== undefined && edits[e.id] !== e.email && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gradient-to-r from-[#cf292c] to-red-500 rounded-full animate-pulse shadow-md">
                        <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Indicateur de statut compact */}
                <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                  e.role === 'admin' 
                    ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300/50' 
                    : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300/50'
                }`}>
                  {e.role === 'admin' ? '👑' : '👨‍🍳'}
                </div>
              </div>

              {/* Badges informatifs en ligne compacte */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border ${
                  e.role === 'admin' 
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border-red-200/40' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200/40'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${e.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`}></div>
                  {e.role === 'admin' ? 'Admin' : 'Employé'}
                </span>
                
                {/* Badge de catégorie compact */}
                {e.role === 'employee' && (() => {
                  const categorie = getCategorieEmploye(e);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border ${categorie.color}`}>
                      <span>{categorie.icon}</span>
                      <span className="hidden sm:inline">{categorie.label}</span>
                    </span>
                  );
                })()}
                
                {/* Badge nom/prénom compact */}
                {e.nom && e.prenom && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm border bg-gradient-to-r from-gray-50 to-white text-gray-600 border-gray-200/50">
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    <span className="truncate max-w-[100px]">{e.prenom} {e.nom}</span>
                  </span>
                )}
                
                {/* Date de création compacte */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200/40 shadow-sm">
                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span className="whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' })}</span>
                </span>
              </div>

              {/* Actions en grille compacte */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => handleEdit(e.id)}
                  disabled={!edits[e.id] || edits[e.id] === e.email}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 border ${
                    !edits[e.id] || edits[e.id] === e.email
                      ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-500 border-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 hover:from-blue-600 hover:to-blue-700 shadow-blue-200/50'
                  }`}
                >
                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 border bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 hover:from-red-600 hover:to-red-700 shadow-red-200/50"
                >
                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  <span>Supprimer</span>
                </button>
              </div>
              
              {/* QR Code section optimisée pour mobile */}
              {e.role === 'employee' && (
                <div className="border-t border-gray-100/60 pt-3">
                  <button
                    onClick={() =>
                      selectedEmployeId === e.id
                        ? setSelectedEmployeId(null)
                        : fetchQRCode(e.id)
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 border bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-purple-400 hover:from-purple-600 hover:to-indigo-700 shadow-purple-200/50"
                  >
                    <QrCode className="h-3 w-3" />
                    <span>{selectedEmployeId === e.id ? "Masquer QR" : "Voir QR Code"}</span>
                  </button>
                  
                  {/* QR Code modal optimisé mobile */}
                  {qrCodes[e.id] && selectedEmployeId === e.id && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setSelectedEmployeId(null)}>
                      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-slideInUp" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-800">QR Code</h3>
                          <button
                            onClick={() => setSelectedEmployeId(null)}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-center">
                          <div className="p-4 bg-gradient-to-br from-[#cf292c]/5 to-[#e74c3c]/5 rounded-xl inline-block border border-gray-100">
                            <img
                              src={qrCodes[e.id]}
                              alt={`QR code de ${e.email}`}
                              className="w-48 h-48 rounded-lg"
                            />
                          </div>
                          <div className="mt-4 text-sm text-gray-600 bg-gray-50 py-2 px-4 rounded-lg border border-gray-100">
                            <div className="font-medium text-gray-800">{e.email}</div>
                            <div className="text-xs text-gray-500 mt-1">ID: {e.id}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

      {filteredEmployes.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
          <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? "Aucun résultat pour cette recherche" : "Commencez par ajouter des utilisateurs"}
          </p>
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Effacer la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 px-2 pb-1 space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-600 bg-gradient-to-r from-gray-50 to-white px-4 py-2 rounded-lg border border-gray-200/80 shadow-sm">
            <span className="font-medium">Affichage</span> {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredEmployes.length)} <span className="font-medium">sur</span> {filteredEmployes.length} utilisateurs
          </div>
          <div className="flex gap-3 justify-center sm:justify-end">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2.5 text-sm bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 disabled:transform-none disabled:hover:shadow-none"
            >
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Précédent
              </span>
            </button>
            <button
              onClick={() =>
                setPage((prev) =>
                  indexOfLastItem < filteredEmployes.length ? prev + 1 : prev
                )
              }
              disabled={indexOfLastItem >= filteredEmployes.length}
              className="px-4 py-2.5 text-sm bg-gradient-to-r from-[#cf292c] to-[#e74c3c] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 disabled:transform-none disabled:hover:shadow-none"
            >
              <span className="flex items-center gap-1">
                Suivant
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default ListeEmployes;
