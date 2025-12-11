import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import CarteEmploye from "./CarteEmploye";
import "./animations.css";
import { CATEGORIES_EMPLOYES, CATEGORIES_ADMIN } from '../utils/categoriesConfig';
import { getCurrentDateString } from '../utils/parisTimeUtils';
import { Mail, Send, CheckCircle, AlertTriangle, Printer, ArrowLeft, Clock, User, Lock, FileText, Shield } from 'lucide-react';

// Fonction de formatage automatique du téléphone
const formatTelephone = (value) => {
  // Supprimer tout sauf les chiffres
  const cleaned = value.replace(/\D/g, '');
  
  // Limiter à 10 chiffres maximum
  const truncated = cleaned.substring(0, 10);
  
  // Format automatique: 06 12 34 56 78
  if (truncated.length <= 2) {
    return truncated;
  } else if (truncated.length <= 4) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2)}`;
  } else if (truncated.length <= 6) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4)}`;
  } else if (truncated.length <= 8) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4, 6)} ${truncated.substring(6)}`;
  } else {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4, 6)} ${truncated.substring(6, 8)} ${truncated.substring(8)}`;
  }
};

function FormulaireCreationEmploye({ onEmployeCreated, onClose, isEmbedded = false, isModal = false }) {
  // Déterminer si on est en mode compact (embedded ou modal)
  const isCompact = isEmbedded || isModal;
  
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  // ✅ Support catégories multiples
  const [selectedCategories, setSelectedCategories] = useState([]);
  // ✅ Date d'embauche : Date du jour par défaut pour simplifier la création
  const [dateEmbauche, setDateEmbauche] = useState(getCurrentDateString());
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
  const [showConfirmEmail, setShowConfirmEmail] = useState(false); // Modal de confirmation avant envoi
  
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
        
        // Après 3 secondes supplémentaires, fermer automatiquement (plus rapide en modale)
        redirectTimer = setTimeout(() => {
          // Réinitialiser le formulaire
          setNouvelEmploye(null);
          setInfosConnexion(null);
          setMessage("");
          setActionsVisible(false);
          setEmailSent(false);
          setShowTerminate(false);
          
          // En mode modal, fermer la modale
          if (isModal && onClose) {
            onClose();
          } else if (onEmployeCreated) {
            // Sinon, callback classique
            onEmployeCreated();
          }
        }, 3000);
      }, 1500);
    } else {
      setEmailProcessing(false);
      setShowTerminate(false);
    }
    
    return () => {
      clearTimeout(processingTimer);
      clearTimeout(redirectTimer);
    };
  }, [emailSent, onEmployeCreated, onClose, isModal]);
  
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
      setShowConfirmEmail(false);
      // Pas de toast - confirmation visible dans l'interface
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

    // ✅ VALIDATION FRONTEND DES CHAMPS OBLIGATOIRES
    if (!email || !email.trim()) {
      toast.error("L'email est obligatoire");
      return;
    }

    if (!nom || !nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    if (!prenom || !prenom.trim()) {
      toast.error("Le prénom est obligatoire");
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error("Veuillez sélectionner au moins une catégorie");
      return;
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Format d'email invalide");
      return;
    }

    // Validation téléphone (si fourni)
    if (telephone) {
      const cleanedPhone = telephone.replace(/\D/g, '');
      if (cleanedPhone.length > 0 && cleanedPhone.length !== 10) {
        toast.error("Le numéro de téléphone doit contenir 10 chiffres");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/admin/employes", {
        email,
        nom,
        prenom,
        telephone,
        categories: selectedCategories, // ✅ Array de catégories multiples
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
      setSelectedCategories([]);
      setDateEmbauche("");
      
      // ⚠️ NE PAS appeler onEmployeCreated ici - On laisse l'admin envoyer l'email ou cliquer sur Terminer
      // La redirection se fera via le useEffect après l'envoi d'email OU via le bouton Terminer
    } catch (err) {
      setMessage("❌ Erreur : " + (err.response?.data?.error || "serveur"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isCompact ? '' : 'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden'}`}>
      {/* Header - Masqué en mode compact car le parent gère le header */}
      {!isCompact && (
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {roleType === 'admin' ? 'Nouvel administrateur' : 'Nouvel employé'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Remplissez les informations ci-dessous
                </p>
              </div>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={()=>{setRoleType('employee'); setSelectedCategories([]);}}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 ${roleType==='employee' 
                  ? 'bg-[#cf292c] text-white' 
                  : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <User className="w-4 h-4" />
                Employé
              </button>
              <button
                type="button"
                onClick={()=>{setRoleType('admin'); setSelectedCategories([]);}}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 ${roleType==='admin' 
                  ? 'bg-[#cf292c] text-white' 
                  : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corps du formulaire - MASQUÉ quand un employé a été créé */}
      {!nouvelEmploye && (
      <div className={isCompact ? '' : 'p-6'}>
        {/* Sélecteur de type en mode embedded - Plus compact */}
        {isCompact && (
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <p className="text-sm text-gray-600">
              {roleType === 'admin' 
                ? 'Un mot de passe temporaire sera envoyé par email' 
                : 'Les identifiants seront envoyés automatiquement par email'}
            </p>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
              <button
                type="button"
                onClick={()=>{setRoleType('employee'); setSelectedCategories([]);}}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${roleType==='employee' 
                  ? 'bg-[#cf292c] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <User className="w-3.5 h-3.5" />
                Employé
              </button>
              <button
                type="button"
                onClick={()=>{setRoleType('admin'); setSelectedCategories([]);}}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${roleType==='admin' 
                  ? 'bg-[#cf292c] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          </div>
        )}

        {/* Info badge - Uniquement en mode normal */}
        {!isCompact && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-white px-4 py-3.5 mb-8">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              {roleType === 'admin' 
                ? 'Un mot de passe temporaire sera envoyé par email' 
                : 'Les identifiants seront envoyés automatiquement par email'}
            </p>
          </div>
        )}

      <form onSubmit={handleSubmit} className={isCompact ? "space-y-5" : "space-y-8"}>
        {/* Section informations personnelles */}
        <div className={isCompact ? "space-y-4" : "space-y-5"}>
          {!isCompact && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Informations personnelles</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
            </div>
          )}
          
          {/* En mode embedded : une seule ligne avec 4 colonnes */}
          <div className={`grid gap-4 ${isCompact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 gap-5'}`}>
            <div className="space-y-1.5">
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                id="nom"
                type="text"
                placeholder="Nom de famille"
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white ${isCompact ? 'py-2' : 'py-2.5 px-4 rounded-xl'}`}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                id="prenom"
                type="text"
                placeholder="Prénom"
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white ${isCompact ? 'py-2' : 'py-2.5 px-4 rounded-xl'}`}
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
              />
            </div>
          
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="prenom.nom@email.com"
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white ${isCompact ? 'py-2' : 'py-2.5 px-4 rounded-xl'}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <input
                id="telephone"
                type="tel"
                placeholder="06 12 34 56 78"
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white ${isCompact ? 'py-2' : 'py-2.5 px-4 rounded-xl'}`}
                value={telephone}
                onChange={(e) => setTelephone(formatTelephone(e.target.value))}
                maxLength={14}
              />
            </div>
          </div>
          
          {/* Indices email et téléphone - uniquement mode normal */}
          {!isCompact && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                L'email servira d'identifiant de connexion
              </p>
              {telephone && telephone.replace(/\D/g, '').length < 10 && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Numéro incomplet ({telephone.replace(/\D/g, '').length}/10 chiffres)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section catégorie */}
        <div className={isCompact ? "space-y-3" : "space-y-5"}>
          {!isCompact && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                {roleType === 'admin' ? 'Service administratif' : 'Catégorie(s) d\'emploi'}
                <span className="text-red-500 ml-1">*</span>
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
            </div>
          )}
          
          {isCompact && (
            <label className="block text-sm font-medium text-gray-700">
              {roleType === 'admin' ? 'Service' : 'Catégorie(s)'} <span className="text-red-500">*</span>
              {roleType === 'employee' && <span className="text-xs text-gray-400 font-normal ml-2">(multi-sélection)</span>}
            </label>
          )}
          
          {/* Info multi-sélection - uniquement mode normal */}
          {!isCompact && roleType === 'employee' && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 bg-blue-50/50 px-3 py-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sélection multiple possible - Cliquez pour ajouter/retirer des catégories
            </p>
          )}
          
          <div className={`grid gap-2 ${isCompact ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
            {categoriesDisponibles.map(cat => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (roleType === 'admin') {
                      setSelectedCategories([cat]);
                    } else {
                      if (isSelected) {
                        setSelectedCategories(prev => prev.filter(c => c !== cat));
                      } else {
                        setSelectedCategories(prev => [...prev, cat]);
                      }
                    }
                  }}
                  className={`${isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} font-medium rounded-lg border-2 transition-all duration-200 relative ${isSelected 
                    ? 'border-[#cf292c] bg-[#cf292c]/5 text-[#cf292c] shadow-sm' 
                    : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700'}`}
                >
                  {isSelected && (
                    <span className={`absolute ${isCompact ? 'top-0.5 right-0.5' : 'top-1.5 right-1.5'} flex h-4 w-4 items-center justify-center rounded-full bg-[#cf292c] text-white`}>
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {cat}
                </button>
              );
            })}
          </div>
          
          {/* Afficher les catégories sélectionnées - uniquement mode normal */}
          {selectedCategories.length > 0 && !isCompact && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs text-gray-500">Sélection :</span>
              {selectedCategories.map(cat => (
                <span 
                  key={cat}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#cf292c]/10 text-[#cf292c] rounded-full text-xs font-medium"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() => setSelectedCategories(prev => prev.filter(c => c !== cat))}
                    className="hover:bg-[#cf292c]/20 rounded-full p-0.5 transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Section date d'embauche et boutons */}
        <div className={isCompact ? "flex flex-wrap items-end gap-4 pt-4 border-t border-gray-100" : "space-y-5"}>
          {!isCompact && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Informations contractuelles</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="dateEmbauche" className="block text-sm font-medium text-gray-700">
                    Date d'embauche
                    <span className="ml-2 text-xs text-gray-500 font-normal">(recommandé pour statistiques)</span>
                  </label>
                  <input
                    id="dateEmbauche"
                    type="date"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white"
                    value={dateEmbauche}
                    onChange={(e) => setDateEmbauche(e.target.value)}
                    title="Date du jour par défaut. Importante pour calculer l'ancienneté et les statistiques RH."
                  />
                  {!dateEmbauche && (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      </svg>
                      Date recommandée pour statistiques RH et ancienneté
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Date d'embauche - Mode embedded inline */}
          {isCompact && (
            <div className="flex-1 min-w-[180px] space-y-1.5">
              <label htmlFor="dateEmbauche" className="block text-sm font-medium text-gray-700">
                Date d'embauche
              </label>
              <input
                id="dateEmbauche"
                type="date"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white"
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
              />
            </div>
          )}
          
          {/* Boutons - inline en mode embedded */}
          {isCompact && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={()=>{ 
                  setEmail(''); 
                  setNom(''); 
                  setPrenom(''); 
                  setTelephone(''); 
                  setSelectedCategories([]); 
                  setDateEmbauche(getCurrentDateString());
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
              >
                Effacer
              </button>
              <button
                type="submit"
                disabled={loading || !nom || !prenom || !email || selectedCategories.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#cf292c] hover:bg-[#b8252a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Création…</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Créer</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Boutons d'action - Mode normal uniquement */}
        {!isCompact && (
        <div className="flex items-center justify-end gap-3 pt-8 border-t border-gray-100">
          <button
            type="button"
            onClick={()=>{ 
              setEmail(''); 
              setNom(''); 
              setPrenom(''); 
              setTelephone(''); 
              setSelectedCategories([]); 
              setDateEmbauche(getCurrentDateString()); // Remettre date du jour
            }}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Réinitialiser
          </button>
          <button
            type="submit"
            disabled={loading || !nom || !prenom || !email || selectedCategories.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#cf292c] hover:bg-[#b8252a] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Création en cours…</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
                <span>{roleType === 'admin' ? 'Créer administrateur' : 'Créer employé'}</span>
              </>
            )}
          </button>
        </div>
        )}
      </form>
      </div>
      )}
      
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
      
      {/* Carte d'employé après création réussie - design adaptatif modale */}
      {nouvelEmploye && infosConnexion && (
        <div className={`transition-all duration-300 animate-fadeIn ${isModal ? '' : 'mt-4 sm:mt-5 max-w-lg sm:max-w-2xl mx-auto'}`}>
          {/* Badge succès compact */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-700 font-medium">Compte créé avec succès</span>
            <span className="ml-auto text-xs text-gray-400">Enregistré</span>
          </div>
          
          {/* Carte employé compacte */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <CarteEmploye 
              employe={nouvelEmploye}
              codeActivation={infosConnexion.codeActivation}
              motDePasseTemporaire={infosConnexion.motDePasseTemporaire}
              compact={isModal}
            />
          </div>
          
          {/* Actions après création */}
          <div className={`mt-4 transition-all duration-500 ${actionsVisible ? 'opacity-100' : 'opacity-0'}`}>
            {emailSent ? (
              /* État: Email envoyé - Confirmation finale */
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500 mx-auto mb-3 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-base font-semibold text-gray-900 mb-1">Identifiants envoyés !</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Email envoyé à <span className="font-medium">{nouvelEmploye.email}</span>
                </p>
                
                {emailProcessing ? (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setNouvelEmploye(null);
                        setInfosConnexion(null);
                        setMessage("");
                        setActionsVisible(false);
                        setEmailSent(false);
                        setShowTerminate(false);
                        if (isModal && onClose) {
                          onClose();
                        } else if (onEmployeCreated) {
                          onEmployeCreated();
                        }
                      }}
                      className="w-full px-5 py-2.5 bg-[#cf292c] hover:bg-[#b8252a] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Terminé
                    </button>
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      Fermeture automatique...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* État: En attente d'envoi d'email */
              <div className="space-y-3">
                {/* Modal de confirmation d'envoi */}
                {showConfirmEmail && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 animate-fadeIn">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-red-50 mx-auto mb-3 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-[#cf292c]" />
                        </div>
                        
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Confirmer l'envoi</h3>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                          <p className="font-medium text-gray-900 text-sm">{nouvelEmploye?.email}</p>
                          <p className="text-xs text-gray-500">{nouvelEmploye?.prenom} {nouvelEmploye?.nom}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowConfirmEmail(false)}
                            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => {
                              setShowConfirmEmail(false);
                              handleSendEmail();
                            }}
                            disabled={emailSending}
                            className="flex-1 px-4 py-2 bg-[#cf292c] text-white text-sm font-medium rounded-lg hover:bg-[#b8252a] disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Envoyer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Boutons d'action principaux */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setShowConfirmEmail(true)}
                    disabled={emailSending}
                    className="flex-1 px-5 py-2.5 bg-[#cf292c] hover:bg-[#b8252a] disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {emailSending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Envoyer les identifiants
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleImprimer}
                    className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer
                  </button>
                </div>
                
                {/* Option de fermer sans envoyer (mode modale) */}
                {isModal && (
                  <button
                    onClick={onClose}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Fermer sans envoyer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FormulaireCreationEmploye;
