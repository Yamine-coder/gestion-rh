import { useState, useEffect, useRef } from "react";
import { Calendar, Send, AlertTriangle, FileText, Info, X, Heart, GraduationCap, Stethoscope, Clock, DollarSign, Users } from "lucide-react";

function DemandeCongeForm({ onSubmit, onClose }) {
  // Récupérer le dernier type choisi ou utiliser par défaut
  const getLastType = () => {
    const saved = localStorage.getItem('lastCongeType');
    return saved || "congé payé";
  };
  
  const [type, setType] = useState(getLastType());
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [motif, setMotif] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

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
    
    if (dateDebut >= dateFin) {
      newErrors.dates = "La date de fin doit être postérieure à la date de début";
    }
    
    if (dateDebut < aujourdhui) {
      newErrors.dates = "Vous ne pouvez pas demander un congé dans le passé";
    }

    // Vérifier si la demande est trop longue (plus de 30 jours)
    const dureeJours = getDureeJours();
    if (dureeJours > 30) {
      newErrors.duree = "Les congés de plus de 30 jours nécessitent une validation spéciale";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Sauvegarder le type pour la prochaine fois
      localStorage.setItem('lastCongeType', type);
      
      await onSubmit({ type, debut, fin, motif });
      
      // Animation de succès avant la fermeture
      setErrors({});
      
      // Réinitialiser le formulaire
      setDebut("");
      setFin("");
      setMotif("");
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

  // Configuration des types de congé avec icônes et couleurs
  const typesConge = [
    {
      value: "congé payé",
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
      value: "sans solde",
      label: "Sans solde",
      icon: DollarSign,
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50 dark:bg-gray-900/30",
      textColor: "text-gray-700 dark:text-gray-300",
      description: "Congé non rémunéré, soumis à accord de l'employeur"
    },
    {
      value: "maladie",
      label: "Congé maladie",
      icon: Stethoscope,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/30",
      textColor: "text-red-700 dark:text-red-300",
      description: "Justificatif médical requis"
    },
    {
      value: "formation",
      label: "Formation",
      icon: GraduationCap,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/30",
      textColor: "text-green-700 dark:text-green-300",
      description: "Formation liée à votre poste ou développement professionnel"
    },
    {
      value: "maternité",
      label: "Maternité/Paternité",
      icon: Heart,
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/30",
      textColor: "text-pink-700 dark:text-pink-300",
      description: "Congé légal pour naissance ou adoption"
    },
    {
      value: "exceptionnel",
      label: "Congé exceptionnel",
      icon: Users,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/30",
      textColor: "text-orange-700 dark:text-orange-300",
      description: "Événements familiaux : mariage, décès, déménagement..."
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
  <div className="bg-white dark:bg-slate-900 border border-gray-200/60 dark:border-slate-700/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transition-colors max-w-full overflow-x-hidden">
      {/* En-tête moderne avec bouton de fermeture - optimisé mobile */}
    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-800/60 border-b border-gray-200/60 dark:border-slate-700/60 sticky top-0 z-10 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#cf292c] to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate">Nouvelle demande</h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Remplissez les informations</p>
            </div>
          </div>
          
          {/* Bouton de fermeture - plus petit sur mobile */}
          {onClose && (
            <button
              onClick={onClose}
        className="group w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-500 flex-shrink-0"
              aria-label="Fermer le formulaire"
            >
        <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-200 group-hover:text-gray-800 dark:group-hover:text-gray-100" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-hidden max-w-full w-full">
        {/* Type de congé avec liste moderne - optimisé mobile */}
        <div className="space-y-2 sm:space-y-3 overflow-hidden max-w-full w-full min-w-0">
          <label className="block text-sm sm:text-sm font-semibold text-gray-700 dark:text-gray-200">
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
              className="w-full flex items-center gap-3 pl-10 sm:pl-12 pr-4 sm:pr-5 py-2.5 sm:py-3 border border-gray-300/60 dark:border-slate-600 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-left text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 hover:border-gray-400 dark:hover:border-slate-500 transition-all"
            >
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
                <selectedTypeConfig.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <span className="flex-1 truncate font-medium">{selectedTypeConfig.label}</span>
              <span className={`${selectedTypeConfig.bgColor} ${selectedTypeConfig.textColor} inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold border border-transparent`}>Choisir</span>
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
          
          {/* Description moderne du type sélectionné */}
          <div className={`${selectedTypeConfig.bgColor} rounded-lg px-3 py-2.5 transition-all duration-200 border border-gray-100 dark:border-slate-700/50 w-full min-w-0`}> 
            <div className="flex items-start gap-2">
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center ${selectedTypeConfig.textColor} bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm flex-shrink-0 mt-0.5 shadow-sm`}>
                <selectedTypeConfig.icon className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              <div className="flex-1">
                <div className={`text-xs sm:text-sm font-semibold ${selectedTypeConfig.textColor} mb-1 flex items-center gap-1.5`}>
                  {selectedTypeConfig.label}
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${selectedTypeConfig.color.replace('from-', 'bg-').replace(' to-blue-600', '').replace(' to-purple-600', '').replace(' to-gray-600', '').replace(' to-red-600', '').replace(' to-green-600', '').replace(' to-pink-600', '').replace(' to-orange-600', '')}`}></span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {selectedTypeConfig.description}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dates avec validation visuelle - améliorées mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Date de début
            </label>
            <div className="relative group">
              <Calendar className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-hover:text-[#cf292c] transition-colors pointer-events-none" />
              <input
                type="date"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                aria-label="Date de début du congé"
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl text-sm focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:border-gray-400 dark:hover:border-slate-500 text-gray-700 dark:text-gray-200 focus:outline-none ${
                  errors.dates ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-600 dark:focus:border-red-500' : 'border-gray-300/60 dark:border-slate-600'
                }`}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Date de fin
            </label>
            <div className="relative group">
              <Calendar className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-hover:text-[#cf292c] transition-colors pointer-events-none" />
              <input
                type="date"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                min={debut || new Date().toISOString().split('T')[0]}
                aria-label="Date de fin du congé"
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl text-sm focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:border-gray-400 dark:hover:border-slate-500 text-gray-700 dark:text-gray-200 focus:outline-none ${
                  errors.dates ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-600 dark:focus:border-red-500' : 'border-gray-300/60 dark:border-slate-600'
                }`}
                required
              />
            </div>
          </div>
        </div>

        {/* Messages d'erreur - compacts mobile */}
        {errors.dates && (
          <div className="bg-red-50/80 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/60 rounded-lg sm:rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.dates}</div>
            </div>
          </div>
        )}

        {/* Motif optionnel - optimisé mobile */}
        {(type === "sans solde" || type === "exceptionnel" || type === "formation") && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Motif {type === "sans solde" || type === "exceptionnel" ? "(obligatoire)" : "(optionnel)"}
            </label>
            <div className="relative">
              <FileText className="absolute left-3 sm:left-4 top-3 sm:top-4 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={
                  type === "formation" ? "Détails de la formation..." : 
                  type === "exceptionnel" ? "Précisez l'événement..." : 
                  "Motif de la demande..."
                }
                rows={3}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300/60 dark:border-slate-600 rounded-lg sm:rounded-xl text-sm focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-all duration-200 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:border-gray-400 dark:hover:border-slate-500 resize-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                required={type === "sans solde" || type === "exceptionnel"}
              />
            </div>
          </div>
        )}

        {/* Informations sur la durée améliorées - compactes mobile */}
        {dureeJours && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/30 dark:to-indigo-900/30 backdrop-blur-sm border border-blue-200/60 dark:border-blue-800/60 rounded-lg sm:rounded-2xl p-3 sm:p-4 transition-colors">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                    <span className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-300">
                      Durée : {dureeJours} jour{dureeJours > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 leading-tight">
                    Du {new Date(debut).toLocaleDateString('fr-FR', { 
                      day: 'numeric', month: 'short', year: 'numeric' 
                    })} au {new Date(fin).toLocaleDateString('fr-FR', { 
                      day: 'numeric', month: 'short', year: 'numeric' 
                    })}
                  </div>
                  
                  {dureeJours > 5 && (
                    <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-blue-600 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/40 rounded-md px-2 py-1">
                      💡 Pensez à organiser votre travail en amont
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Avertissement pour durée excessive - compact mobile */}
            {errors.duree && (
              <div className="bg-orange-50/80 dark:bg-orange-900/30 border border-orange-200/60 dark:border-orange-700/60 rounded-lg sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-orange-900 dark:text-orange-300 mb-0.5 sm:mb-1">Durée importante</div>
                    <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">{errors.duree}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avertissement pour demandes urgentes amélioré - compact mobile */}
        {isUrgent && (
          <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/30 dark:to-orange-900/30 backdrop-blur-sm border border-amber-200/60 dark:border-amber-700/60 rounded-lg sm:rounded-2xl p-3 sm:p-4 transition-colors">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm sm:text-base font-semibold text-amber-900 dark:text-amber-300 mb-0.5 sm:mb-1">Demande urgente</div>
                <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mb-1 sm:mb-2">
                  Votre congé commence dans moins de 7 jours.
                </div>
                <div className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/40 rounded-md px-2 py-1">
                  📞 Contactez votre manager pour accélérer la validation
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages d'erreur de soumission - compacts mobile */}
        {errors.submit && (
          <div className="bg-red-50/80 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/60 rounded-lg sm:rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.submit}</div>
            </div>
          </div>
        )}

        {/* Bouton de soumission amélioré - optimisé mobile */}
        <button
          type="submit"
          disabled={isSubmitting || !debut || !fin || (type === "sans solde" && !motif) || (type === "exceptionnel" && !motif)}
          aria-label={isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande de congé'}
          className="group w-full flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-[#cf292c] to-red-600 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl hover:shadow-lg hover:shadow-red-500/20 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 text-sm sm:text-base transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#cf292c]/60 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
              <span>Envoi en cours...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-0.5" />
              <span>Envoyer la demande</span>
            </>
          )}
        </button>

        {/* Note informative améliorée - compacte mobile */}
        <div className="text-center pt-2 space-y-1 sm:space-y-2">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 sm:gap-2">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
            Votre demande sera envoyée à votre manager pour validation
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
          </div>
          
          {isUrgent && (
            <div className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-300 font-medium">
              ⚡ Demande urgente - Traitement prioritaire
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default DemandeCongeForm;
