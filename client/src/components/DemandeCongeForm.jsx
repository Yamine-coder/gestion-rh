import { useState, useEffect, useRef } from "react";
import { Calendar, Send, AlertTriangle, FileText, Info, X, Heart, GraduationCap, Stethoscope, Clock, DollarSign, Users, Upload, Paperclip, Trash2, CheckCircle } from "lucide-react";
import DatePickerCustom from './DatePickerCustom';
import { toLocalDateString, getCurrentDateString } from '../utils/parisTimeUtils';

// Types nécessitant un justificatif obligatoire
const TYPES_JUSTIFICATIF_OBLIGATOIRE = ['maladie', 'maternite', 'paternite', 'deces'];
// Types où le justificatif est optionnel mais recommandé
const TYPES_JUSTIFICATIF_OPTIONNEL = ['mariage', 'formation'];

function DemandeCongeForm({ 
  onSubmit, 
  onClose, 
  initialData = null, 
  isEditing = false,
  // Props partagés pour le justificatif (remontés dans le parent)
  justificatif,
  setJustificatif,
  justificatifPreview,
  setJustificatifPreview
}) {
  // Récupérer le dernier type choisi ou utiliser par défaut
  const getLastType = () => {
    if (initialData) return initialData.type;
    const saved = localStorage.getItem('lastCongeType');
    return saved || "CP";
  };
  
  const [type, setType] = useState(getLastType());
  const [debut, setDebut] = useState(initialData ? toLocalDateString(new Date(initialData.dateDebut)) : "");
  const [fin, setFin] = useState(initialData ? toLocalDateString(new Date(initialData.dateFin)) : "");
  const [motif, setMotif] = useState(initialData?.motif || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  // Tracker si un justificatif existant a été supprimé (pour mode édition)
  const [justificatifRemoved, setJustificatifRemoved] = useState(false);
  
  const fileInputRef = useRef(null);
  
  // Initialiser le preview si on édite un congé existant avec un justificatif
  useEffect(() => {
    if (initialData?.justificatif && !justificatifPreview) {
      setJustificatifPreview(initialData.justificatif);
    }
  }, [initialData]);

  // Vérifier si le type sélectionné nécessite un justificatif
  const isJustificatifRequired = TYPES_JUSTIFICATIF_OBLIGATOIRE.includes(type);
  const isJustificatifOptional = TYPES_JUSTIFICATIF_OPTIONNEL.includes(type);
  const showJustificatifField = isJustificatifRequired || isJustificatifOptional;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, justificatif: 'Format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.' }));
        return;
      }
      // Vérifier la taille (10 MB max)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, justificatif: 'Le fichier est trop volumineux (max 10 MB)' }));
        return;
      }
      setJustificatif(file);
      
      // Créer une preview : miniature pour images, nom pour PDF
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setJustificatifPreview({
            type: 'image',
            url: event.target.result,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      } else {
        setJustificatifPreview({
          type: 'pdf',
          name: file.name
        });
      }
      setErrors(prev => ({ ...prev, justificatif: null }));
    }
  };

  const removeJustificatif = () => {
    // Si on est en mode édition et qu'il y avait un justificatif existant, marquer comme supprimé
    if (isEditing && initialData?.justificatif) {
      setJustificatifRemoved(true);
    }
    setJustificatif(null);
    setJustificatifPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    
    // Validations améliorées
    const newErrors = {};
    
    if (!debut || !fin) {
      newErrors.dates = "Veuillez remplir toutes les dates";
    }
    
    const dateDebut = new Date(debut);
    const dateFin = new Date(fin);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    // Permettre les congés d'une journée (même date début et fin)
    if (dateDebut > dateFin) {
      newErrors.dates = "La date de fin ne peut pas être antérieure à la date de début";
    }
    
    if (dateDebut < aujourdhui) {
      newErrors.dates = "Vous ne pouvez pas demander un congé dans le passé";
    }

    // Note: Les congés de plus de 30 jours sont autorisés mais signalés au manager
    // La validation se fait côté manager, pas côté employé

    // Vérifier si le justificatif est obligatoire mais manquant
    if (isJustificatifRequired && !justificatif && !justificatifPreview) {
      newErrors.justificatif = "Un justificatif est obligatoire pour ce type de congé";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Sauvegarder le type pour la prochaine fois
      localStorage.setItem('lastCongeType', type);
      
      // Envoyer avec le fichier si présent, et le flag de suppression si applicable
      await onSubmit({ type, debut, fin, motif, justificatif, justificatifRemoved });
      
      // Animation de succès avant la fermeture
      setErrors({});
      
      // Réinitialiser le formulaire
      setDebut("");
      setFin("");
      setMotif("");
      setJustificatif(null);
      setJustificatifPreview(null);
      setType(getLastType());
      
      // Fermer avec un délai pour permettre l'animation de succès
      if (onClose) {
        setTimeout(() => onClose(), 300);
      }
      
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      setErrors({ submit: "Erreur lors de l'envoi de la demande" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculer la durée en jours
  const getDureeJours = () => {
    if (!debut || !fin) return null;
    const dateDebut = new Date(debut);
    const dateFin = new Date(fin);
    const diffTime = Math.abs(dateFin - dateDebut);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : null;
  };

  const dureeJours = getDureeJours();
  
  // Vérifier si c'est une demande urgente (moins de 7 jours)
  const isUrgent = debut && Math.ceil((new Date(debut) - new Date()) / (1000 * 60 * 60 * 24)) <= 7;

  // Configuration des types de congé avec icônes et couleurs - Synchronisé avec typesConges.js
  const typesConge = [
    {
      value: "CP",
      label: "Congé payé",
      icon: Calendar,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/30",
      textColor: "text-blue-700 dark:text-blue-300",
      description: "Congés acquis selon votre ancienneté et votre temps de travail"
    },
    {
      value: "RTT",
      label: "RTT",
      icon: Clock,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/30",
      textColor: "text-purple-700 dark:text-purple-300",
      description: "Jours de récupération pour la réduction du temps de travail"
    },
    {
      value: "sans_solde",
      label: "Sans solde",
      icon: DollarSign,
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50 dark:bg-gray-900/30",
      textColor: "text-gray-700 dark:text-gray-300",
      description: "Congé non rémunéré, soumis à accord de l'employeur"
    },
    {
      value: "maladie",
      label: "Maladie",
      icon: Stethoscope,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/30",
      textColor: "text-red-700 dark:text-red-300",
      description: "Justificatif médical requis"
    },
    {
      value: "maternite",
      label: "Maternité",
      icon: Heart,
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/30",
      textColor: "text-pink-700 dark:text-pink-300",
      description: "Congé maternité"
    },
    {
      value: "paternite",
      label: "Paternité",
      icon: Heart,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/30",
      textColor: "text-blue-700 dark:text-blue-300",
      description: "Congé paternité"
    },
    {
      value: "deces",
      label: "Décès",
      icon: Users,
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50 dark:bg-gray-900/30",
      textColor: "text-gray-700 dark:text-gray-300",
      description: "Congé pour événement familial"
    },
    {
      value: "mariage",
      label: "Mariage",
      icon: Heart,
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/30",
      textColor: "text-pink-700 dark:text-pink-300",
      description: "Congé pour mariage"
    },
    {
      value: "formation",
      label: "Formation",
      icon: GraduationCap,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/30",
      textColor: "text-green-700 dark:text-green-300",
      description: "Formation professionnelle"
    },
    {
      value: "autre",
      label: "Autre",
      icon: FileText,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/30",
      textColor: "text-orange-700 dark:text-orange-300",
      description: "Autre type de congé"
    }
  ];

  const selectedTypeConfig = typesConge.find(t => t.value === type) || typesConge[0];

  // ---- Etat & refs pour sélecteur custom ----
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const listRef = useRef(null);
  const triggerRef = useRef(null);

  const filteredTypes = typesConge; // plus de recherche, liste courte

  // Focus initial (sans lock body) quand ouverture de la liste inline
  useEffect(() => {
    if (showTypePicker) {
      const idx = filteredTypes.findIndex(t => t.value === type);
      const target = idx >= 0 ? idx : 0;
      const timer = setTimeout(() => setFocusIndex(target), 10);
      return () => clearTimeout(timer);
    }
    setFocusIndex(-1);
  }, [showTypePicker, filteredTypes, type]);

  // Navigation clavier globale
  useEffect(() => {
    if (!showTypePicker) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setShowTypePicker(false);
        triggerRef.current?.focus();
      } else if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
        e.preventDefault();
        setFocusIndex(prev => {
          if (filteredTypes.length === 0) return -1;
          if (e.key === 'Home') return 0;
          if (e.key === 'End') return filteredTypes.length - 1;
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          return ( (prev + delta + filteredTypes.length) % filteredTypes.length );
        });
      } else if (e.key === 'Enter' && focusIndex >= 0) {
        e.preventDefault();
        const chosen = filteredTypes[focusIndex];
        if (chosen) {
          setType(chosen.value);
          localStorage.setItem('lastCongeType', chosen.value);
          setShowTypePicker(false);
          triggerRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTypePicker, focusIndex, filteredTypes]);

  // Scroll vers option focus
  useEffect(() => {
    if (!showTypePicker || focusIndex < 0) return;
    const listEl = listRef.current;
    const optionEl = listEl?.querySelector(`[data-index='${focusIndex}']`);
    if (optionEl && listEl) {
      const oTop = optionEl.offsetTop;
      const oBottom = oTop + optionEl.offsetHeight;
      if (oTop < listEl.scrollTop) listEl.scrollTop = oTop - 4;
      else if (oBottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = oBottom - listEl.clientHeight + 4;
    }
  }, [focusIndex, showTypePicker]);

  return (
  <div className="bg-white dark:bg-slate-800 lg:border-2 lg:border-slate-300/60 lg:dark:border-slate-600/60 lg:rounded-2xl lg:shadow-2xl transition-colors w-full flex flex-col overflow-hidden">
      {/* En-tête moderne - optimisé mobile - FIXÉ en haut */}
    <div className="px-4 lg:px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 transition-colors flex-shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {isEditing ? 'Modifier la demande' : 'Nouvelle demande de congé'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {isEditing ? 'Modifiez les informations ci-dessous' : 'Remplissez le formulaire ci-dessous'}
              </p>
            </div>
            {/* Bouton fermer - visible uniquement sur desktop */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="Fermer le formulaire"
              >
                <X className="w-5 h-5" />
              </button>
            )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 lg:p-5 space-y-3 lg:space-y-4 overflow-y-auto overscroll-contain max-w-full w-full flex-1">
        {/* Type de congé avec liste moderne - optimisé mobile */}
        <div className="space-y-1.5 lg:space-y-1.5 overflow-hidden max-w-full w-full min-w-0">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Type de congé
          </label>
          
          {/* Sélecteur custom déclenché par bouton (évite débordement natif) */}
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setShowTypePicker(true)}
              aria-haspopup="listbox"
              aria-expanded={showTypePicker}
              ref={triggerRef}
              onKeyDown={(e)=>{ if(['Enter',' '].includes(e.key)){ e.preventDefault(); setShowTypePicker(true);} if(e.key==='ArrowDown'){e.preventDefault(); setShowTypePicker(true);} }}
              className="w-full flex items-center gap-3 pl-11 sm:pl-12 pr-4 sm:pr-5 py-2.5 sm:py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-left text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 hover:border-slate-400 dark:hover:border-slate-500 transition-colors relative"
            >
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
                <selectedTypeConfig.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <span className="flex-1 truncate font-medium">{selectedTypeConfig.label}</span>
              <span className={`${selectedTypeConfig.bgColor} ${selectedTypeConfig.textColor} inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold border border-transparent flex-shrink-0`}>Choisir</span>
            </button>
            {showTypePicker && (
              <div className="mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in w-full" role="dialog" aria-label="Liste des types de congé">
                <ul
                  role="listbox"
                  ref={listRef}
                  className="max-h-60 overflow-y-auto overscroll-contain divide-y divide-gray-100 dark:divide-slate-700"
                >
                  {filteredTypes.map((t, idx) => {
                    const ActiveIcon = t.icon; const active = t.value === type;
                    return (
                      <li
                        key={t.value}
                        role="option"
                        aria-selected={active}
                        data-index={idx}
                        tabIndex={-1}
                        onClick={() => { setType(t.value); localStorage.setItem('lastCongeType', t.value); setShowTypePicker(false); triggerRef.current?.focus(); }}
                        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${active ? 'bg-gray-50 dark:bg-slate-800' : focusIndex===idx ? 'bg-gray-100 dark:bg-slate-700/70' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                      >
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${t.bgColor} border border-gray-200/60 dark:border-slate-600 shrink-0`}>
                          <ActiveIcon className={`w-4 h-4 ${t.textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{t.label}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 break-words">{t.description}</div>
                        </div>
                        {active && <div className="w-2.5 h-2.5 rounded-full bg-[#cf292c] shadow-inner shrink-0" />}
                      </li>
                    );
                  })}
                  {filteredTypes.length === 0 && (
                    <li className="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400">Aucun résultat</li>
                  )}
                </ul>
                <div className="px-3 py-2 border-t border-gray-100 dark:border-slate-700 text-right">
                  <button
                    type="button"
                    onClick={() => { setShowTypePicker(false); triggerRef.current?.focus(); }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >Fermer</button>
                </div>
              </div>
            )}
          </div>
          
          {/* Description moderne du type sélectionné - compacte */}
          <div className={`${selectedTypeConfig.bgColor} rounded-lg px-3 py-2 transition-all duration-200 border border-gray-100 dark:border-slate-700/50 w-full min-w-0`}> 
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedTypeConfig.textColor} bg-white/80 dark:bg-slate-700/80 flex-shrink-0`}>
                <selectedTypeConfig.icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className={`text-sm font-semibold ${selectedTypeConfig.textColor}`}>{selectedTypeConfig.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">— {selectedTypeConfig.description}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dates avec DatePicker custom élégant */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative z-20">
            <DatePickerCustom
              label="Date de début"
              value={debut}
              onChange={setDebut}
              min={getCurrentDateString()}
              placeholder="Choisir la date"
              error={errors.dates}
              position="left"
            />
          </div>

          <div className="relative z-10">
            <DatePickerCustom
              label="Date de fin"
              value={fin}
              onChange={setFin}
              min={debut || getCurrentDateString()}
              placeholder="Choisir la date"
              error={errors.dates}
              position="right"
            />
          </div>
        </div>

        {/* Messages d'erreur - compacts */}
        {errors.dates && (
          <div className="bg-red-50/80 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/60 rounded-lg p-2.5 lg:p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <div className="text-xs lg:text-sm text-red-700 dark:text-red-300 font-medium">{errors.dates}</div>
            </div>
          </div>
        )}

        {/* Commentaire/Justification - toujours affiché, optionnel sauf pour certains types */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            {type === "maladie" ? "Justification" : 
             type === "formation" ? "Détails de la formation" :
             type === "sans_solde" ? "Motif" :
             type === "autre" ? "Précisez le motif" :
             "Commentaire"} 
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              {(type === "sans_solde" || type === "maladie" || type === "autre") ? "(obligatoire)" : "(optionnel)"}
            </span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={
                type === "maladie" ? "Décrivez votre situation (certificat médical requis)..." :
                type === "formation" ? "Détails de la formation (organisme, thème, durée)..." : 
                type === "sans_solde" ? "Motif de votre demande..." :
                type === "autre" ? "Précisez le type d'absence et le motif..." :
                type === "CP" ? "Ajoutez un commentaire si nécessaire..." :
                "Précisez les détails de votre demande..."
              }
              rows={2}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              required={type === "sans_solde" || type === "maladie" || type === "autre"}
            />
          </div>
          {type === "maladie" && !showJustificatifField && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Un certificat médical devra être fourni ultérieurement</span>
            </p>
          )}
        </div>

        {/* 📎 Upload de justificatif - Conditionnel selon le type */}
        {showJustificatifField && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Justificatif
              <span className={`text-xs ml-1 ${isJustificatifRequired ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                ({isJustificatifRequired ? 'obligatoire' : 'recommandé'})
              </span>
            </label>
            
            {/* Zone d'upload */}
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
              />
              
              {!justificatifPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                >
                  <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Cliquez pour ajouter un fichier
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Miniature pour images ou icône pour PDF */}
                    {justificatifPreview?.type === 'image' && justificatifPreview?.url ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-emerald-200 dark:border-emerald-700">
                        <img 
                          src={justificatifPreview.url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : typeof justificatifPreview === 'string' && justificatifPreview.startsWith('/') ? (
                      // Justificatif existant (URL serveur) - vérifier si c'est une image
                      justificatifPreview.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-emerald-200 dark:border-emerald-700">
                          <img 
                            src={`http://localhost:5000${justificatifPreview}`}
                            alt="Justificatif" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )
                    ) : (
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                        {typeof justificatifPreview === 'string' && justificatifPreview.startsWith('/') 
                          ? 'Justificatif existant' 
                          : justificatifPreview?.name || justificatifPreview}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {justificatifPreview?.type === 'image' ? 'Image prête' : justificatifPreview?.type === 'pdf' ? 'PDF prêt' : 'Fichier prêt'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeJustificatif}
                    className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Supprimer le fichier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Message d'erreur */}
            {errors.justificatif && (
              <p className="text-xs text-red-500 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{errors.justificatif}</span>
              </p>
            )}
            
            {/* Info sur le type de justificatif attendu */}
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                {type === 'maladie' && "Certificat médical ou arrêt de travail"}
                {type === 'maternite' && "Certificat médical de grossesse"}
                {type === 'paternite' && "Acte de naissance de l'enfant"}
                {type === 'deces' && "Acte de décès ou certificat"}
                {type === 'mariage' && "Acte de mariage (peut être fourni après)"}
                {type === 'formation' && "Convocation ou attestation de formation"}
              </span>
            </p>
          </div>
        )}

        {/* Informations sur la durée - Design épuré */}
        {dureeJours && (
          <div className="space-y-3">
            <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Durée : {dureeJours} jour{dureeJours > 1 ? 's' : ''}
                  </span>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Du {new Date(debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au {new Date(fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              {dureeJours > 5 && (
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  💡 Pensez à organiser votre travail en amont
                </div>
              )}
            </div>

            {/* Avertissement pour durée excessive - Design sobre */}
            {errors.duree && (
              <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-300/60 dark:border-slate-600/60 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{errors.duree}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avertissement pour demandes urgentes */}
        {isUrgent && (
          <div className="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/60 rounded-xl p-4 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200 block mb-1">Demande urgente</span>
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Votre congé commence dans moins de 7 jours. Contactez votre manager pour accélérer la validation.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Messages d'erreur de soumission - compacts */}
        {errors.submit && (
          <div className="bg-red-50/80 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/60 rounded-lg p-2 lg:p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <div className="text-xs lg:text-sm text-red-700 dark:text-red-300 font-medium">{errors.submit}</div>
            </div>
          </div>
        )}

        {/* Bouton d'action principal */}
        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !debut || !fin || ((type === "sans_solde" || type === "maladie" || type === "autre") && !motif)}
            aria-label={isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande de congé'}
            className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#cf292c] to-red-600 text-white font-semibold py-3.5 px-6 rounded-xl hover:shadow-lg hover:shadow-red-500/25 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 text-sm transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#cf292c]/60 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
                <span>{isEditing ? 'Modification...' : 'Envoi en cours...'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-0.5" />
                <span>{isEditing ? 'Modifier la demande' : 'Envoyer la demande'}</span>
              </>
            )}
          </button>
          
          {/* Lien Annuler discret - desktop uniquement */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hidden lg:block w-full text-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors py-2"
            >
              Annuler
            </button>
          )}
        </div>

        {/* Note informative */}
        <div className="text-center pb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Votre demande sera envoyée à votre manager pour validation
          </div>
        </div>
      </form>
    </div>
  );
}

export default DemandeCongeForm;
