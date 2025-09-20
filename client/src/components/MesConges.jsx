import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, Plus, Clock, Check, X, FileText, RefreshCw } from "lucide-react";
import BottomNav from "../components/BottomNav";
import DemandeCongeForm from "../components/DemandeCongeForm";

function MesConges() {
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState({ total: 0, approuve: 0, enAttente: 0, refuse: 0 });
  const [lastCreatedId, setLastCreatedId] = useState(null); // Badge "Nouveau"
  const [toast, setToast] = useState(null); // Notifications feedback
  const [isScrolled, setIsScrolled] = useState(false); // État du scroll
  const token = localStorage.getItem("token");

  // Gérer le scroll pour masquer les statistiques
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Gérer la fermeture avec la touche Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showForm) {
        setShowForm(false);
      }
    };

    if (showForm) {
      document.addEventListener('keydown', handleKeyDown);
      // Empêcher le défilement du body quand la modal est ouverte
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const fetchConges = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await axios.get("http://localhost:5000/conges/mes-conges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const congesData = res.data;
      setConges(congesData);
      
      // Calculer les statistiques
      setStats({
        total: congesData.length,
        approuve: congesData.filter(c => c.statut === "approuvé").length,
        enAttente: congesData.filter(c => c.statut === "en attente").length,
        refuse: congesData.filter(c => c.statut === "refusé").length,
      });
      
    } catch (err) {
      console.error("Erreur chargement congés :", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNouvelleDemande = async (data) => {
    try {
      const res = await axios.post("http://localhost:5000/conges", data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const created = res.data;
      setLastCreatedId(created?._id || Date.now()); // Marquer comme nouveau
      await fetchConges();
      setShowForm(false);
      
      // Toast de succès avec animation améliorée
      setToast({ type: 'success', msg: '🎉 Demande envoyée avec succès ! Votre manager sera notifié.' });
      setTimeout(() => setToast(null), 5000);
      
    } catch (err) {
      console.error("Erreur envoi demande congé :", err);
      setToast({ type: 'error', msg: "Erreur lors de l'envoi de la demande" });
      setTimeout(() => setToast(null), 5000);
    }
  };

  // Fonction pour obtenir les détails d'affichage selon le statut
  const getStatusConfig = (statut) => {
    switch (statut) {
      case "approuvé":
        return { 
          color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700", 
          icon: Check, 
          dotColor: "bg-green-500 dark:bg-green-400"
        };
      case "refusé":
        return { 
          color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700", 
          icon: X, 
          dotColor: "bg-red-500 dark:bg-red-400"
        };
      case "en attente":
        return { 
          color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700", 
          icon: Clock, 
          dotColor: "bg-amber-500 dark:bg-amber-400"
        };
      default:
        return { 
          color: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-700/40 dark:text-gray-300 dark:border-slate-600", 
          icon: FileText, 
          dotColor: "bg-gray-500 dark:bg-gray-400"
        };
    }
  };

  // Calculer la durée en jours
  const getDureeJours = (dateDebut, dateFin) => {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const diffTime = Math.abs(fin - debut);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  useEffect(() => {
    fetchConges();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 pb-24 lg:pt-14 transition-colors">
      
      {/* Toast notifications modernes et élégantes - optimisé mobile */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 lg:top-6 left-1/2 -translate-x-1/2 z-[60] px-3 lg:px-6 py-2.5 lg:py-4 rounded-lg lg:rounded-2xl shadow-2xl backdrop-blur-md border-2 text-xs lg:text-sm flex items-center gap-2 lg:gap-4 animate-in slide-in-from-top-4 fade-in duration-500 min-w-[280px] lg:min-w-[320px] mx-3 lg:mx-0 transition-colors ${
            toast.type === 'success'
              ? 'bg-white/95 dark:bg-slate-800/90 border-green-300/60 dark:border-green-600/60 text-green-800 dark:text-green-300 shadow-green-200/40 dark:shadow-green-900/20'
              : 'bg-white/95 dark:bg-slate-800/90 border-red-300/60 dark:border-red-600/60 text-red-800 dark:text-red-300 shadow-red-200/40 dark:shadow-red-900/20'
          }`}
        >
          <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full animate-pulse shadow-lg ${toast.type === 'success' ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'}`}></div>
          <span className="font-medium flex-1 leading-tight">{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Fermer la notification"
            className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-500 flex-shrink-0"
          >
            <X className="w-3 h-3 lg:w-4 lg:h-4 text-gray-600 dark:text-gray-200" />
          </button>
        </div>
      )}

      {/* Header épuré et moderne - optimisé mobile */}
      <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800 shadow-sm sticky top-0 lg:top-14 z-10 transition-colors">
        <div className="px-3 py-3 lg:px-4 lg:py-6">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-7 h-7 lg:w-10 lg:h-10 bg-gradient-to-br from-[#cf292c] to-red-600 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 transform transition-transform hover:scale-105 flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base lg:text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate">Mes congés</h1>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 truncate">Gérez vos demandes d'absence</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton flottant "+" avec améliorations UX complètes - optimisé mobile */}
      <div className="fixed bottom-28 lg:bottom-8 right-3 lg:right-6 z-50">
        {/* Tooltip - plus compact mobile */}
        <div className={`absolute bottom-full right-0 mb-2 px-2.5 lg:px-3 py-1.5 lg:py-2 bg-gray-900 dark:bg-gray-700 text-white text-[10px] lg:text-xs rounded-md lg:rounded-lg shadow-lg transition-all duration-200 whitespace-nowrap ${
          showForm ? 'opacity-0 pointer-events-none transform scale-95' : 'opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100'
        }`}>
          <span className="lg:hidden">{showForm ? 'Fermer' : 'Nouvelle demande'}</span>
          <span className="hidden lg:inline">{showForm ? 'Fermer le formulaire' : 'Créer une nouvelle demande'}</span>
          <div className="absolute top-full right-2 lg:right-3 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gray-900 dark:bg-gray-700 rotate-45 transform -translate-y-0.5 lg:-translate-y-1"></div>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          aria-label={showForm ? 'Fermer le formulaire de demande' : 'Ouvrir le formulaire de nouvelle demande'}
          className={`group relative flex items-center justify-center lg:justify-start gap-0 lg:gap-3 w-14 h-14 lg:w-auto lg:h-auto lg:px-6 lg:py-3 rounded-full lg:rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 shadow-2xl border-2 ${
            showForm 
              ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-gray-500/60 dark:shadow-slate-900/80 border-gray-200 dark:border-slate-600 focus-visible:ring-gray-300 dark:focus-visible:ring-slate-400' 
              : 'bg-gradient-to-r from-[#e11d48] via-[#cf292c] to-[#b91c1c] text-white hover:from-[#dc2626] hover:via-[#b91c1c] hover:to-[#991b1b] shadow-red-600/50 hover:shadow-red-600/70 border-red-400/20 focus-visible:ring-red-300'
          } hover:shadow-3xl`}
        >
          {/* Effet de brillance au hover */}
          <div className="absolute inset-0 rounded-full lg:rounded-2xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Indicateur d'état actif amélioré - plus petit mobile */}
          {showForm && (
            <div className="absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 w-3 h-3 lg:w-4 lg:h-4 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse shadow-lg border border-white dark:border-slate-800">
              <div className="absolute inset-0.5 bg-white/30 rounded-full animate-ping"></div>
            </div>
          )}
          
          {/* Icône avec animation améliorée - taille réduite mobile */}
          <div className="relative z-10">
            {showForm ? (
              <X className="w-6 h-6 lg:w-5 lg:h-5 transition-all duration-300 group-hover:rotate-180 group-hover:scale-125 filter drop-shadow-sm" strokeWidth={2.5} />
            ) : (
              <Plus className="w-6 h-6 lg:w-5 lg:h-5 transition-all duration-300 group-hover:rotate-90 group-hover:scale-125 filter drop-shadow-sm" strokeWidth={2.5} />
            )}
          </div>
          
          {/* Texte desktop */}
          <span className="hidden lg:inline relative z-10 font-semibold tracking-wide">
            {showForm ? 'Annuler' : 'Nouvelle demande'}
          </span>
        </button>
      </div>

  <div className="px-3 lg:px-4 py-3 lg:py-6">
        {/* Statistiques avec animations - masquées pendant le scroll, compactes mobile */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4 mb-3 lg:mb-6 transition-all duration-300 ${
          isScrolled ? 'opacity-0 -translate-y-4 pointer-events-none h-0 overflow-hidden mb-0' : 'opacity-100 translate-y-0'
        }`}>
          <div className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg lg:rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-2.5 lg:p-4 hover:shadow-md hover:shadow-gray-500/5 dark:hover:shadow-slate-900/30 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-sm text-gray-500 dark:text-gray-400 font-medium">Total</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 lg:mt-1 transition-transform group-hover:scale-105">{stats.total}</p>
              </div>
              <div className="w-6 h-6 lg:w-10 lg:h-10 bg-gray-100 dark:bg-slate-700 rounded-md lg:rounded-xl flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors">
                <FileText className="w-3 h-3 lg:w-5 lg:h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
              </div>
            </div>
          </div>
          
          <div className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg lg:rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-2.5 lg:p-4 hover:shadow-md hover:shadow-amber-500/10 dark:hover:shadow-amber-900/20 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-sm text-gray-500 dark:text-gray-400 font-medium">En attente</p>
                <p className="text-lg lg:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 lg:mt-1 transition-transform group-hover:scale-105">{stats.enAttente}</p>
              </div>
              <div className="w-6 h-6 lg:w-10 lg:h-10 bg-amber-50 dark:bg-amber-900/30 rounded-md lg:rounded-xl flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-800/40 transition-colors">
                <Clock className="w-3 h-3 lg:w-5 lg:h-5 text-amber-500 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300" />
              </div>
            </div>
          </div>
          
          <div className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg lg:rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-2.5 lg:p-4 hover:shadow-md hover:shadow-green-500/10 dark:hover:shadow-green-900/20 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-sm text-gray-500 dark:text-gray-400 font-medium">Approuvées</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600 dark:text-green-400 mt-0.5 lg:mt-1 transition-transform group-hover:scale-105">{stats.approuve}</p>
              </div>
              <div className="w-6 h-6 lg:w-10 lg:h-10 bg-green-50 dark:bg-green-900/30 rounded-md lg:rounded-xl flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-800/40 transition-colors">
                <Check className="w-3 h-3 lg:w-5 lg:h-5 text-green-500 dark:text-green-400 group-hover:text-green-600 dark:group-hover:text-green-300" />
              </div>
            </div>
          </div>
          
          <div className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg lg:rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-2.5 lg:p-4 hover:shadow-md hover:shadow-red-500/10 dark:hover:shadow-red-900/20 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-sm text-gray-500 dark:text-gray-400 font-medium">Refusées</p>
                <p className="text-lg lg:text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5 lg:mt-1 transition-transform group-hover:scale-105">{stats.refuse}</p>
              </div>
              <div className="w-6 h-6 lg:w-10 lg:h-10 bg-red-50 dark:bg-red-900/30 rounded-md lg:rounded-xl flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-800/40 transition-colors">
                <X className="w-3 h-3 lg:w-5 lg:h-5 text-red-500 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal de formulaire avec overlay et animations fluides */}
        {showForm && (
          <>
            {/* Overlay avec effet de fondu progressif */}
            <div 
              className="fixed inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/50 backdrop-blur-md z-40 animate-in fade-in duration-500"
              onClick={() => setShowForm(false)}
              aria-label="Fermer le formulaire"
            />
            
            {/* Modal centrée avec animation élégante */}
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-2xl animate-in zoom-in-90 slide-in-from-bottom-8 duration-500 ease-out">
                  <DemandeCongeForm 
                    onSubmit={handleNouvelleDemande} 
                    onClose={() => setShowForm(false)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Liste des congés moderne et sobre - compacte mobile */}
        <div className="space-y-3 lg:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Mes demandes</h2>
            <button
              onClick={() => fetchConges(true)}
              aria-label="Actualiser la liste des demandes de congés"
              className="group flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm text-gray-500 dark:text-gray-400 hover:text-[#cf292c] dark:hover:text-[#cf292c] transition-all duration-200 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-md lg:rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf292c]/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 lg:w-4 lg:h-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-90'}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Chargement des demandes de congés">
              {/* Skeleton loading moderne */}
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-200/70 dark:bg-slate-700/70 motion-safe:animate-pulse" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200/70 dark:bg-slate-700/70 rounded-lg w-40" />
                      <div className="h-3 bg-gray-200/60 dark:bg-slate-700/60 rounded w-64" />
                      <div className="flex gap-2">
                        <div className="h-3 bg-gray-200/60 dark:bg-slate-700/60 rounded w-24" />
                        <div className="h-3 bg-gray-200/60 dark:bg-slate-700/60 rounded w-20" />
                      </div>
                    </div>
                    <div className="w-24 space-y-2">
                      <div className="h-6 bg-gray-200/60 dark:bg-slate-700/60 rounded-lg" />
                      <div className="h-6 bg-gray-200/50 dark:bg-slate-700/50 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : conges.length === 0 ? (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-8 text-center transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Aucune demande</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">Vous n'avez pas encore fait de demande de congé. Commencez par créer votre première demande.</p>
              <button
                onClick={() => setShowForm(true)}
                className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#cf292c] to-red-600 text-white rounded-xl hover:shadow-lg shadow-red-500/25 transition-all duration-200 text-sm font-medium transform hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-45" />
                Créer une demande
              </button>
            </div>
          ) : (
            conges.map((conge, index) => {
              const statusConfig = getStatusConfig(conge.statut);
              const StatusIcon = statusConfig.icon;
              const dureeJours = getDureeJours(conge.dateDebut, conge.dateFin);
              const isNew = lastCreatedId && (conge._id === lastCreatedId || conge.id === lastCreatedId);
              
              return (
                <div 
                  key={conge._id || index} 
                  className={`group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5 hover:shadow-lg hover:shadow-gray-500/5 dark:hover:shadow-slate-900/40 transition-all duration-300 cursor-pointer focus-within:ring-2 focus-within:ring-[#cf292c]/30 ${
                    isNew ? 'ring-2 ring-green-300/50 shadow-green-100/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <StatusIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2 group-hover:text-[#cf292c] transition-colors flex items-center gap-2">
                                {conge.type}
                                {isNew && (
                                  <span className="text-[10px] uppercase tracking-wide font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full motion-safe:animate-pulse">
                                    Nouveau
                                  </span>
                                )}
                              </h3>
                              <div className="space-y-1">
                                <div className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-2">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                  Du {new Date(conge.dateDebut).toLocaleDateString('fr-FR', { 
                                    day: 'numeric', month: 'long', year: 'numeric' 
                                  })}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-2">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                  au {new Date(conge.dateFin).toLocaleDateString('fr-FR', { 
                                    day: 'numeric', month: 'long', year: 'numeric' 
                                  })}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${statusConfig.color}`}>
                                <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}></div>
                                {conge.statut.charAt(0).toUpperCase() + conge.statut.slice(1)}
                              </span>
                              <div className="mt-3 px-3 py-1 bg-gray-50 dark:bg-slate-700/60 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 dark:text-slate-200">{dureeJours} jour{dureeJours > 1 ? 's' : ''}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default MesConges;
