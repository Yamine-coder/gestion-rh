import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import CarteEmploye from "./CarteEmploye";
import "./animations.css";

// Configuration des catégories pour fast-food
const CATEGORIES_EMPLOYES = ['Cuisine', 'Service', 'Management', 'Entretien'];
const CATEGORIES_ADMIN = ['Direction', 'RH', 'Finance', 'Operations'];

function FormulaireCreationEmploye({ onEmployeCreated }) {
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [categorie, setCategorie] = useState("");
  const [dateEmbauche, setDateEmbauche] = useState("");
  const [roleType, setRoleType] = useState("employee"); // Nouveau: employé ou admin
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [nouvelEmploye, setNouvelEmploye] = useState(null);
  const [infosConnexion, setInfosConnexion] = useState(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailProcessing, setEmailProcessing] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false); // eslint-disable-line no-unused-vars
  
  // Effet pour animer l'apparition des actions après l'affichage de la carte
  useEffect(() => {
    let timer;
    if (nouvelEmploye && infosConnexion) {
      timer = setTimeout(() => {
        setActionsVisible(true);
      }, 800);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [nouvelEmploye, infosConnexion]);
  
  // Effet pour gérer la séquence d'animation après l'envoi d'email - UX optimisée
  useEffect(() => {
    let processingTimer;
    let redirectTimer;
    
    if (emailSent) {
      // Montrer d'abord l'animation de finalisation
      setEmailProcessing(true);
      
      // Après 1.5 secondes, montrer le bouton Terminé
      processingTimer = setTimeout(() => {
        setEmailProcessing(false);
        setShowTerminate(true);
        
        // Après 5 secondes supplémentaires, rediriger automatiquement
        redirectTimer = setTimeout(() => {
          // Réinitialiser le formulaire ou rediriger
          setNouvelEmploye(null);
          setInfosConnexion(null);
          setMessage("");
          setActionsVisible(false);
          setEmailSent(false);
          setShowTerminate(false);
          
          // Notification de confirmation finale pour informer l'utilisateur
          toast.success("Employé créé avec succès !", {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          
          // Redirection automatique vers la liste des employés
          // Décommenter une seule des options suivantes selon votre configuration:
          
          // Option 1: pour React Router v6
          // navigate('/admin/employes');
          
          // Option 2: pour React Router v5
          // history.push('/admin/employes');
          
          // Option 3: redirection native
          // window.location.href = '/admin/employes';
          
          // Option 4: Callback pour informer le composant parent
          if (onEmployeCreated) {
            onEmployeCreated();
          }
        }, 5000);
      }, 1500);
    } else {
      setEmailProcessing(false);
      setShowTerminate(false);
    }
    
    return () => {
      clearTimeout(processingTimer);
      clearTimeout(redirectTimer);
    };
  }, [emailSent, onEmployeCreated]);
  
  // Fonction pour envoyer les identifiants par email
  const handleSendEmail = async () => {
    if (!nouvelEmploye || !infosConnexion) {
      toast.error("Impossible d'envoyer l'email : informations employé manquantes");
      return;
    }
    
    setEmailSending(true);
    
    try {
      const token = localStorage.getItem("token");
      
      // Affichage des détails complets pour débogage
      console.log("Détails complets de l'employé:", nouvelEmploye);
      console.log("Infos de connexion:", {
        ...infosConnexion,
        motDePasseTemporaire: infosConnexion.motDePasseTemporaire ? "[MASQUÉ]" : undefined
      });
      
      // Appel à l'API pour envoyer l'email avec les identifiants
      const response = await axios.post(
        "http://localhost:5000/admin/employes/envoyer-identifiants", 
        {
          employeId: nouvelEmploye.id,
          email: nouvelEmploye.email,
          motDePasseTemporaire: infosConnexion.motDePasseTemporaire
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log("Réponse du serveur:", response.data);
      
      setEmailSent(true);
      toast.success("Identifiants envoyés par email avec succès !");
      // Ne pas réinitialiser emailSent automatiquement, cela sera fait par le bouton Terminé
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      
      // Message d'erreur détaillé
      let errorMessage = "Problème de connexion au serveur";
      
      if (error.response) {
        // Le serveur a répondu avec un statut d'erreur
        console.error("Détails de l'erreur:", error.response.data);
        errorMessage = error.response.data.message || "Erreur serveur";
        
        // Gestion spécifique pour le cas de limitation d'envoi
        if (error.response.status === 429 || error.response.data.code === "THROTTLED") {
          toast.warning("Un email a déjà été envoyé récemment à cet utilisateur. Veuillez patienter quelques minutes avant de réessayer.");
          return; // Sortir pour éviter d'afficher le message d'erreur générique
        }
        
        // Afficher plus de détails si disponibles
        if (error.response.data.code) {
          errorMessage += ` (Code: ${error.response.data.code})`;
        }
      } else if (error.request) {
        // La requête a été envoyée mais pas de réponse
        errorMessage = "Le serveur n'a pas répondu";
      }
      
      toast.error(`Erreur lors de l'envoi: ${errorMessage}`);
    } finally {
      setEmailSending(false);
    }
  };

  const token = localStorage.getItem("token");

  // Sélectionner les catégories selon le type de rôle
  const categoriesDisponibles = roleType === 'admin' ? CATEGORIES_ADMIN : CATEGORIES_EMPLOYES;

  // Fonction pour imprimer les identifiants
  const handleImprimer = () => {
    window.print();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/admin/employes", {
        email,
        nom,
        prenom,
        telephone,
        categorie,
        dateEmbauche,
        role: roleType // 'employee' ou 'admin'
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { motDePasseTemporaire } = response.data;
      
      // Stocker les infos pour afficher la carte
      setNouvelEmploye(response.data.user);
      setInfosConnexion({ motDePasseTemporaire });
      
      // On ne définit pas de message en cas de succès pour éviter la duplication
      // car nous affichons déjà la carte de confirmation
      
      // Reset du formulaire
      setEmail("");
      setNom("");
      setPrenom("");
      setTelephone("");
      setCategorie("");
      setDateEmbauche("");
      
      // Appeler la fonction de rappel avec le nouvel employé
      if (onEmployeCreated && typeof onEmployeCreated === 'function') {
        onEmployeCreated(response.data);
      }
    } catch (err) {
      setMessage("❌ Erreur : " + (err.response?.data?.error || "serveur"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
      {/* Header + toggle rôle - design modernisé et responsive */}
      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-[#cf292c] to-[#e74c3c]">
        <div className="px-4 sm:px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 rounded-full bg-white/20 backdrop-blur-sm flex-shrink-0 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 sm:h-6 w-5 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">
                {roleType === 'admin' ? 'Ajouter un administrateur' : 'Ajouter un employé'}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 max-w-lg">
                Création d'un profil {roleType === 'admin' ? 'administrateur' : 'employé'} avec email d'activation automatique.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-full border border-white/30 bg-white/10 backdrop-blur-sm overflow-hidden self-start sm:self-center shadow-sm">
            {[{value:'employee',label:'Employé'},{value:'admin',label:'Admin'}].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={()=>{setRoleType(opt.value); setCategorie('');}}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out ${roleType===opt.value 
                  ? 'bg-white text-[#cf292c] shadow-sm' 
                  : 'text-white hover:bg-white/20 hover:scale-105'}`}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerte courte améliorée */}
      <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3 sm:p-4 text-sm shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-center sm:text-left">
          <h4 className="font-medium text-gray-800 mb-1">Information importante</h4>
          <p className="leading-snug text-gray-700 text-xs sm:text-sm">
            {roleType === 'admin' 
              ? 'Compte administrateur : accès étendus, mot de passe temporaire envoyé.' 
              : 'Profil employé : identifiants temporaires envoyés automatiquement.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Informations personnelles - section modernisée */}
        <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-xl hover:border-gray-300 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-full bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white shadow-sm">
              <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7Z"/></svg>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-800">Informations personnelles</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="nom" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="nom"
                  type="text"
                  placeholder="Nom de famille"
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="prenom" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="prenom"
                  type="text"
                  placeholder="Prénom"
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email professionnel *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="prenom.nom@entreprise.com"
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="mt-1 text-2xs sm:text-xs text-gray-500">
                Servira d'identifiant de connexion
              </p>
            </div>
            
            <div>
              <label htmlFor="telephone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  id="telephone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

  {/* Section rôle supprimée : toggle déjà dans le header */}

        {/* Catégorie - section modernisée */}
        <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-xl hover:border-gray-300 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-full bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white shadow-sm">
              <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-800">{roleType === 'admin' ? 'Service administratif' : 'Catégorie d\'emploi'}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {categoriesDisponibles.map(cat => {
              const active = categorie === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={()=>setCategorie(cat)}
                  className={`flex items-center justify-between rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm transition-all duration-200 transform hover:shadow-sm ${active 
                    ? 'border-[#cf292c] bg-[#cf292c]/5 text-[#cf292c] shadow-sm' 
                    : 'border-gray-200 bg-white hover:bg-gray-50/80 hover:border-gray-300 text-gray-700'}`}
                >
                  <span className="font-medium truncate">{cat}</span>
                  {active ? (
                    <span className="flex h-4 sm:h-5 w-4 sm:w-5 items-center justify-center rounded-full bg-[#cf292c]">
                      <svg className="h-2.5 sm:h-3 w-2.5 sm:w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : (
                    <span className="w-4 sm:w-5 h-4 sm:h-5 rounded-full border border-gray-200"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Informations contractuelles - section modernisée */}
        <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-xl hover:border-gray-300 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-full bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white shadow-sm">
              <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2Z"/></svg>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-800">Informations contractuelles</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="dateEmbauche" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date d'embauche</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="dateEmbauche"
                  type="date"
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  value={dateEmbauche}
                  onChange={(e) => setDateEmbauche(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action modernisés et responsives */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 sm:pt-5 border-t border-gray-200">
          <p className="text-2xs sm:text-xs text-gray-500 text-center sm:text-left">Champs obligatoires *</p>
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={()=>{ setEmail(''); setNom(''); setPrenom(''); setTelephone(''); setCategorie(''); setDateEmbauche(''); }}
              className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <span className="flex items-center gap-1 sm:gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Réinitialiser</span>
              </span>
            </button>
            <button
              type="submit"
              disabled={loading || !nom || !prenom || !email || !categorie}
              className="inline-flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-[#cf292c] hover:bg-[#b8252a] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/40 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 sm:h-4 w-3.5 sm:w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span>Création…</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>
                  <span>{roleType === 'admin' ? 'Créer administrateur' : 'Créer employé'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Message d'erreur uniquement */}
      {message && !message.includes("✅") && (
        <div className="mt-4 sm:mt-5 p-3 sm:p-4 rounded-xl text-xs sm:text-sm flex items-start shadow-sm transition-all duration-300 animate-fadeIn bg-red-50 text-red-800 border border-red-200">
          <span className="mr-2 sm:mr-3 flex-shrink-0 inline-flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded-full bg-red-100 text-[#cf292c]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <h4 className="font-medium text-xs sm:text-sm mb-0.5">Erreur</h4>
            <p className="leading-tight text-2xs sm:text-xs">
              {message.replace("❌", "")}
            </p>
          </div>
        </div>
      )}
      
      {/* Carte d'employé après création réussie - design minimaliste */}
      {nouvelEmploye && infosConnexion && (
        <div className="mt-4 sm:mt-5 transition-all duration-300 animate-fadeIn max-w-lg sm:max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 mb-2 border-b border-gray-100 pb-2 sm:pb-3">
            <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-green-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 sm:h-3 w-2.5 sm:w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-2xs sm:text-xs text-gray-600 font-medium">Compte prêt</span>
            
            {/* Animation de sauvegarde réussie */}
            <div className="ml-auto flex items-center gap-1.5 text-3xs sm:text-2xs text-gray-400 opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 sm:h-3 w-2.5 sm:w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              Enregistré dans le système
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <CarteEmploye 
              employe={nouvelEmploye}
              codeActivation={infosConnexion.codeActivation}
              motDePasseTemporaire={infosConnexion.motDePasseTemporaire}
              className=""
            />
          </div>
          
          {/* Interface ultra-optimisée avec animations fluides */}
          <div className="flex flex-col mt-4 sm:mt-6">
            {/* Actions après création d'employé avec transitions optimisées */}
            <div className={`transition-all duration-500 ${actionsVisible ? 'opacity-100 transform-none' : 'opacity-0 -translate-y-4'}`}>
              {/* Flux d'envoi d'email avec états progressifs */}
              {emailSent ? (
                <div className="animate-fadeIn bg-green-50 border border-green-100 rounded-xl p-3 sm:p-5 text-center relative overflow-hidden">
                  {/* Indicateur de succès progressif */}
                  <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-green-600 animate-progressBar" style={{width: '100%'}}></div>
                  
                  <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-green-100 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 sm:h-8 w-6 sm:w-8 text-green-600 ${emailProcessing ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-1 sm:mb-2 animate-pulseText">Envoi réussi</h3>
                  <p className="text-xs sm:text-sm text-green-700 mb-3 sm:mb-5">
                    Les identifiants ont été envoyés à <span className="font-medium">{nouvelEmploye.email}</span>
                  </p>
                  
                  {emailProcessing ? (
                    // Phase intermédiaire avec animation élégante
                    <div className="flex items-center justify-center text-gray-600 gap-2 animate-fadeIn">
                      <div className="flex space-x-1">
                        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  ) : (
                    // Message de finalisation automatique
                    <div className="animate-fadeIn">
                      <button
                        onClick={() => {
                          setNouvelEmploye(null);
                          setInfosConnexion(null);
                          setMessage("");
                          setActionsVisible(false);
                          setEmailSent(false);
                          setShowTerminate(false);
                        }}
                        className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-[#cf292c] hover:bg-[#b8252a] text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
                      >
                        Terminer
                      </button>
                      <p className="text-3xs sm:text-xs text-gray-500 mt-2 sm:mt-3">
                        <span className="countdown-text">Fermeture automatique dans quelques secondes...</span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Interface centrée sur l'action d'envoi d'email
                <div className="animate-fadeIn flex flex-col items-center">
                  {/* Bouton principal avec design optimisé */}
                  <button
                    onClick={handleSendEmail}
                    disabled={emailSending}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3.5 text-white text-xs sm:text-sm font-medium rounded-xl shadow transition-all duration-300 transform hover:shadow-lg flex items-center justify-center gap-2 sm:gap-2.5 ${emailSending 
                      ? 'bg-gray-400 cursor-not-allowed opacity-80' 
                      : 'bg-gradient-to-r from-[#cf292c] to-[#e74c3c] hover:translate-y-[-2px]'}`}
                  >
                    {emailSending ? (
                      // Animation d'envoi plus élaborée
                      <div className="flex items-center gap-2 sm:gap-3">
                        <svg className="animate-spin h-4 sm:h-5 w-4 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span className="relative">
                          <span className="animate-pulseText">Envoi en cours</span>
                        </span>
                      </div>
                    ) : (
                      // Bouton d'envoi normal
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Envoyer les identifiants par email</span>
                      </>
                    )}
                  </button>
                  
                  {/* Option d'impression intégrée plus discrètement */}
                  <div className="mt-3 sm:mt-4 opacity-60 hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleImprimer}
                      className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-gray-100 transition-all duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Imprimer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormulaireCreationEmploye;
