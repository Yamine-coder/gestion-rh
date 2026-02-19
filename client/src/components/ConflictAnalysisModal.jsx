import { useState, useEffect } from "react";
import { 
  X, Shield, ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, 
  CheckCircle2, Info, Users, Calendar, CalendarDays, Clock, 
  TrendingUp, UserCheck, UserMinus, ChevronRight, Ban, Loader2,
  Coffee, Briefcase, Minus, Sun
} from "lucide-react";
import axios from "axios";
import { detectConflicts, generateRecommendations, analyseShiftImpact, generateShiftRecommendations } from "../utils/congeConflicts";
import { API_BASE } from "../config/api";

// Composant Modal d'analyse des conflits - VERSION SHIFT-AWARE
export default function ConflictAnalysisModal({ conge, employes, allConges, onClose, onApprove, onReject }) {

  const [shiftImpact, setShiftImpact] = useState(null);
  const [loadingShifts, setLoadingShifts] = useState(true);

  // Analyser les conflits (existant)
  const conflicts = detectConflicts(allConges, employes, conge.dateDebut, conge.dateFin, conge.userId);
  const recommendations = generateRecommendations(conflicts, conge.dateDebut, conge.dateFin);
  
  // Trouver l'employé demandeur
  const demandeur = employes.find(e => e.id === conge.userId);
  const categorieDemandeur = demandeur?.categorie || 'general';
  
  const { stats } = conflicts;

  // Charger les shifts pour analyse d'impact réel
  useEffect(() => {
    const loadShifts = async () => {
      setLoadingShifts(true);
      try {
        const token = localStorage.getItem("token");
        
        // Fetch shifts du demandeur + de toute sa catégorie sur la période
        const employesCat = employes.filter(e => (e.categorie || 'general') === categorieDemandeur && !e.dateDepart);
        const empIds = employesCat.map(e => e.id);
        
        // On récupère les shifts pour la période du congé
        const res = await axios.get(`${API_BASE}/shifts`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { start: conge.dateDebut, end: conge.dateFin }
        });
        
        const allShifts = res.data || [];
        
        // Filtrer les shifts du demandeur
        const shiftsEmploye = allShifts.filter(s => s.employeId === conge.userId);
        
        // Filtrer les shifts de toute la catégorie
        const shiftsCategorieAll = allShifts.filter(s => empIds.includes(s.employeId));
        
        // Congés actifs hors demandeur
        const congesActifs = (allConges || []).filter(c => 
          (c.statut === 'approuvé' || c.statut === 'en_attente' || c.statut === 'en attente') &&
          c.userId !== conge.userId
        );
        
        const impact = analyseShiftImpact({
          dateDebut: conge.dateDebut,
          dateFin: conge.dateFin,
          employeId: conge.userId,
          shiftsEmploye,
          shiftsCategorieAll,
          employes,
          congesActifs,
        });
        
        setShiftImpact(impact);
      } catch (err) {
        console.error('Erreur chargement shifts pour analyse conflit:', err);
        setShiftImpact(null);
      } finally {
        setLoadingShifts(false);
      }
    };
    
    loadShifts();
  }, [conge.dateDebut, conge.dateFin, conge.userId, categorieDemandeur]);

  // Déterminer le vrai niveau en combinant conflits + couverture horaire réelle
  const getEffectiveLevel = () => {
    if (!shiftImpact) return conflicts.conflictLevel;
    if (shiftImpact.joursAvecShift === 0) return 'none';
    
    // Utiliser la couverture horaire réelle si disponible
    const cov = shiftImpact.couvertureHoraire;
    if (cov && cov.total > 0) {
      if (cov.ratioAbsence >= 80) return 'critical';
      if (cov.ratioAbsence >= 60) return 'high';
      if (cov.ratioAbsence >= 40) return 'medium';
      if (cov.ratioAbsence >= 20) return 'low';
      return 'none';
    }
    if (cov && cov.total === 0) return 'none'; // personne sur le même créneau
    
    // Fallback
    return conflicts.conflictLevel;
  };

  const effectiveLevel = getEffectiveLevel();

  // Config par niveau
  const levelConfig = {
    critical: { 
      icon: ShieldAlert, label: 'Critique', 
      bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700',
      iconColor: 'text-red-500', barColor: 'bg-red-500', dotColor: 'bg-red-500',
      badgeBg: 'bg-red-100', badgeText: 'text-red-700'
    },
    high: { 
      icon: AlertTriangle, label: 'Élevé', 
      bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700',
      iconColor: 'text-orange-500', barColor: 'bg-orange-500', dotColor: 'bg-orange-500',
      badgeBg: 'bg-orange-100', badgeText: 'text-orange-700'
    },
    medium: { 
      icon: AlertCircle, label: 'Modéré', 
      bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700',
      iconColor: 'text-amber-500', barColor: 'bg-amber-500', dotColor: 'bg-amber-500',
      badgeBg: 'bg-amber-100', badgeText: 'text-amber-700'
    },
    low: { 
      icon: Shield, label: 'Faible', 
      bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
      iconColor: 'text-blue-500', barColor: 'bg-blue-500', dotColor: 'bg-blue-500',
      badgeBg: 'bg-blue-100', badgeText: 'text-blue-700'
    },
    none: { 
      icon: ShieldCheck, label: 'Aucun conflit', 
      bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700',
      iconColor: 'text-green-500', barColor: 'bg-green-500', dotColor: 'bg-green-500',
      badgeBg: 'bg-green-100', badgeText: 'text-green-700'
    },
  };

  const config = levelConfig[effectiveLevel] || levelConfig.none;
  const LevelIcon = config.icon;

  // Icône pour le type de jour
  const getDayIcon = (jour) => {
    if (jour.type === 'repos') return <Coffee size={12} className="text-blue-400" />;
    if (jour.type === 'travail') return <Briefcase size={12} className="text-green-600" />;
    if (jour.type === 'absence') return <Minus size={12} className="text-gray-400" />;
    return <Sun size={12} className="text-gray-300" />;
  };

  // Icône de recommandation selon le type
  const getRecIcon = (type) => {
    switch (type) {
      case 'error': return <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />;
      case 'warning': return <AlertCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />;
      case 'success': return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />;
      default: return <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />;
    }
  };

  // Formatter heures
  const fmtH = (h) => h === 0 ? '0h' : h < 1 ? `${Math.round(h * 60)}min` : `${h.toFixed(h % 1 === 0 ? 0 : 1)}h`;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white sm:rounded-xl sm:shadow-xl w-full sm:max-w-lg max-h-[100vh] sm:max-h-[90vh] flex flex-col animate-[fadeIn_0.18s_ease-out] overflow-hidden">
        
        {/* En-tête avec indicateur de niveau */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100">
          {/* Barre de couleur en haut */}
          <div className={`h-1 ${config.barColor} w-full`} />
          
          <div className="px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.border} border flex items-center justify-center`}>
                  <LevelIcon size={16} className={config.iconColor} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">Analyse d'impact</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                    <span className={`text-[11px] sm:text-xs font-medium ${config.text}`}>{config.label}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-7 h-7 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors rounded-lg hover:bg-gray-100"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-5 py-4 space-y-4">
            
            {/* Demandeur */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
              <div className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-gray-700 font-semibold text-sm">
                  {demandeur?.prenom?.charAt(0) || ''}{demandeur?.nom?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm leading-tight truncate">{demandeur?.prenom || ''} {demandeur?.nom || 'Inconnu'}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 capitalize">{categorieDemandeur}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{conge.type}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                  <CalendarDays size={12} className="text-gray-400" />
                  <span>
                    {new Date(conge.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {conge.dateDebut !== conge.dateFin && (
                      <> → {new Date(conge.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</>
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">{stats.requestDays} jour{stats.requestDays > 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* ═══ SECTION IMPACT HORAIRES ═══ */}
            {loadingShifts ? (
              <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Analyse des horaires...</span>
              </div>
            ) : shiftImpact ? (
              <>
                {/* Résumé d'impact */}
                <div className={`rounded-lg border p-3 ${
                  shiftImpact.joursAvecShift === 0 
                    ? 'bg-green-50 border-green-200' 
                    : shiftImpact.impactLevel === 'fort' 
                      ? 'bg-red-50 border-red-200'
                      : shiftImpact.impactLevel === 'modere'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={13} className="text-gray-500" />
                      <span className="text-xs font-semibold text-gray-700">Impact réel sur le planning</span>
                    </div>
                    {shiftImpact.joursAvecShift === 0 ? (
                      <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Aucun impact
                      </span>
                    ) : (
                      <span className={`text-xs font-bold ${
                        shiftImpact.impactLevel === 'fort' ? 'text-red-600' :
                        shiftImpact.impactLevel === 'modere' ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>
                        {fmtH(shiftImpact.totalHeuresPerdues)} perdues
                      </span>
                    )}
                  </div>

                  {/* Résumé en chiffres */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Briefcase size={11} className="text-green-500" />
                        <span className="text-xs font-bold text-gray-900">{shiftImpact.joursAvecShift}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">Jour{shiftImpact.joursAvecShift > 1 ? 's' : ''} travail</div>
                    </div>
                    <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Coffee size={11} className="text-blue-400" />
                        <span className="text-xs font-bold text-gray-900">{shiftImpact.joursRepos}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">Jour{shiftImpact.joursRepos > 1 ? 's' : ''} repos</div>
                    </div>
                    <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Sun size={11} className="text-gray-300" />
                        <span className="text-xs font-bold text-gray-900">{shiftImpact.joursSansShift}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">Non planifié{shiftImpact.joursSansShift > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>

                {/* Détail jour par jour */}
                {shiftImpact.jourParJour.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700">Détail jour par jour</span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-52 overflow-auto">
                      {shiftImpact.jourParJour.map((jour, idx) => (
                        <div key={idx} className={`px-3 py-2 ${
                          jour.type === 'travail' ? 'bg-white' : 'bg-gray-50/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getDayIcon(jour)}
                              <div>
                                <span className="text-xs font-medium text-gray-800 capitalize">
                                  {jour.jourSemaine} {jour.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {jour.type === 'travail' ? (
                                <span className="text-xs font-semibold text-red-600">-{fmtH(jour.heures)}</span>
                              ) : jour.type === 'repos' ? (
                                <span className="text-[11px] font-medium text-blue-500">Repos</span>
                              ) : jour.type === 'absence' ? (
                                <span className="text-[11px] font-medium text-gray-400">Déjà absent</span>
                              ) : (
                                <span className="text-[11px] font-medium text-gray-300">Non planifié</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Segments de travail détaillés */}
                          {jour.type === 'travail' && jour.segments.length > 0 && (
                            <div className="mt-1 ml-5 flex flex-wrap gap-1.5">
                              {jour.segments.map((seg, sIdx) => (
                                <span key={sIdx} className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                  <Clock size={9} className="text-gray-400" />
                                  {seg.start}–{seg.end}
                                </span>
                              ))}
                              {/* Couverture équipe ce jour */}
                              {jour.employesPlanifies > 0 && (
                                <span className={`inline-flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 ${
                                  jour.employesDisponibles <= 1 
                                    ? 'bg-red-50 text-red-600' 
                                    : 'bg-green-50 text-green-600'
                                }`}>
                                  <Users size={9} />
                                  {jour.employesDisponibles}/{jour.employesPlanifies} dispo
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Avertissement jour critique */}
                {shiftImpact.jourCritique && shiftImpact.jourCritique.employesDisponibles <= 1 && (
                  <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg border-l-2 bg-red-50/60 text-red-700 border-red-400">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Couverture critique</div>
                      <div className="opacity-80 mt-0.5 leading-relaxed">
                        Le {shiftImpact.jourCritique.date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' })}, 
                        seulement {shiftImpact.jourCritique.employesDisponibles} personne(s) disponible(s) 
                        sur {shiftImpact.jourCritique.employesPlanifies} planifié(s) dans la catégorie.
                      </div>
                    </div>
                  </div>
                )}

                {/* Message si aucun impact */}
                {shiftImpact.joursAvecShift === 0 && (
                  <div className="flex items-center gap-3 bg-green-50/50 border border-green-200 rounded-lg p-3">
                    <ShieldCheck size={18} className="text-green-500 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-green-800">Pas d'impact sur les horaires</div>
                      <div className="text-[11px] text-green-600 mt-0.5">
                        {demandeur?.prenom || 'L\'employé'} n'a aucun shift de travail planifié sur cette période. 
                        Le congé peut être approuvé sans impact opérationnel.
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* ═══ COUVERTURE HORAIRE RÉELLE ═══ */}
            {shiftImpact?.couvertureHoraire && shiftImpact.couvertureHoraire.total > 0 ? (
              <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-500" />
                    <span className="text-xs font-semibold text-gray-700">Couverture horaire réelle</span>
                  </div>
                  <span className={`text-xs font-bold ${config.text}`}>
                    {shiftImpact.couvertureHoraire.ratioAbsence}% d'absence
                  </span>
                </div>
                
                <div className="w-full bg-white/80 rounded-full h-2 mb-3 overflow-hidden border border-gray-200/50">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${config.barColor}`} 
                    style={{ width: `${Math.min(shiftImpact.couvertureHoraire.ratioAbsence, 100)}%` }} 
                  />
                </div>

                {/* Horaires de référence du demandeur */}
                {shiftImpact.couvertureHoraire.horairesRef?.length > 0 && (
                  <div className="bg-white/70 rounded-md px-2.5 py-1.5 mb-2.5 border border-gray-200/40 flex items-center gap-2">
                    <Clock size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="text-[10px] text-gray-500">Ses horaires :</span>
                    <span className="text-[11px] font-semibold text-gray-800">
                      {shiftImpact.couvertureHoraire.horairesRef.map(s => `${s.start}–${s.end}`).join(' / ')}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Users size={11} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-900">{shiftImpact.couvertureHoraire.total}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">Même créneau</div>
                  </div>
                  <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <UserMinus size={11} className="text-red-400" />
                      <span className="text-xs font-bold text-gray-900">{shiftImpact.couvertureHoraire.absents}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">En congé</div>
                  </div>
                  <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <UserCheck size={11} className="text-green-500" />
                      <span className="text-xs font-bold text-gray-900">{shiftImpact.couvertureHoraire.disponibles}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">Disponible{shiftImpact.couvertureHoraire.disponibles > 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Liste des collègues sur même créneau */}
                {shiftImpact.couvertureHoraire.colleagues.length > 0 && (
                  <div className="border-t border-gray-200/50 pt-2 mt-1 space-y-1">
                    <div className="text-[10px] font-medium text-gray-500 mb-1">Collègues sur les mêmes créneaux :</div>
                    {shiftImpact.couvertureHoraire.colleagues.map((col, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                            <span className="text-[9px] font-medium text-gray-600">
                              {col.employe?.prenom?.charAt(0) || ''}{col.employe?.nom?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-800 font-medium truncate max-w-[120px]">
                            {col.employe?.prenom} {col.employe?.nom}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400" title={`Shift complet: ${col.shiftsExemple?.slice(0, 3).map(s => `${s.start}-${s.end}`).join(' / ')}`}>
                            {col.overlapRanges?.length > 0
                              ? col.overlapRanges.map(r => `${r.start}–${r.end}`).join(' / ')
                              : col.shiftsExemple?.slice(0, 3).map(s => `${s.start}-${s.end}`).join(' / ')
                            }
                          </span>
                          {col.overlapHours > 0 && (
                            <span className="text-[9px] text-gray-300">
                              {col.overlapHours >= 1 ? `${Math.round(col.overlapHours)}h` : `${Math.round(col.overlapHours * 60)}min`}
                            </span>
                          )}
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            col.joursEnConge > 0 
                              ? 'bg-red-50 text-red-600' 
                              : 'bg-green-50 text-green-600'
                          }`}>
                            {col.joursEnConge > 0 ? 'En congé' : 'Dispo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Fallback: couverture catégorie statique */
              <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Couverture de la catégorie</span>
                  <span className={`text-xs font-bold ${config.text}`}>{stats.ratioAbsent}% d'absence</span>
                </div>
                <div className="w-full bg-white/80 rounded-full h-2 mb-3 overflow-hidden border border-gray-200/50">
                  <div className={`h-2 rounded-full transition-all duration-500 ${config.barColor}`} style={{ width: `${Math.min(stats.ratioAbsent, 100)}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                    <div className="flex items-center justify-center gap-1 mb-0.5"><Users size={11} className="text-gray-400" /><span className="text-xs font-bold text-gray-900">{stats.totalInCategory}</span></div>
                    <div className="text-[10px] text-gray-500 leading-tight">Total équipe</div>
                  </div>
                  <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                    <div className="flex items-center justify-center gap-1 mb-0.5"><UserMinus size={11} className="text-red-400" /><span className="text-xs font-bold text-gray-900">{stats.absentInCategory}</span></div>
                    <div className="text-[10px] text-gray-500 leading-tight">Absent{stats.absentInCategory > 1 ? 's' : ''}</div>
                  </div>
                  <div className="bg-white/70 rounded-md px-2.5 py-2 text-center border border-gray-200/40">
                    <div className="flex items-center justify-center gap-1 mb-0.5"><UserCheck size={11} className="text-green-500" /><span className="text-xs font-bold text-gray-900">{stats.availableInCategory}</span></div>
                    <div className="text-[10px] text-gray-500 leading-tight">Disponible{stats.availableInCategory > 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recommandations (shift-aware quand dispo) */}
            {(() => {
              const activeRecs = shiftImpact ? generateShiftRecommendations(shiftImpact) : recommendations;
              return activeRecs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-gray-400" />
                    Recommandations
                  </div>
                  {activeRecs.map((rec, index) => (
                    <div key={index} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border-l-2 ${
                      rec.type === 'error' ? 'bg-red-50/60 text-red-700 border-red-400' :
                      rec.type === 'warning' ? 'bg-orange-50/60 text-orange-700 border-orange-400' :
                      rec.type === 'success' ? 'bg-green-50/60 text-green-700 border-green-400' :
                      'bg-blue-50/60 text-blue-700 border-blue-400'
                    }`}>
                      {getRecIcon(rec.type)}
                      <div>
                        <div className="font-medium">{rec.title}</div>
                        <div className="opacity-80 mt-0.5 leading-relaxed">{rec.message}</div>
                        {rec.action && (
                          <div className="mt-1 font-medium opacity-90 flex items-center gap-1">
                            <ChevronRight size={10} />
                            {rec.action}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Liste des conflits détaillés */}
            {conflicts.sameCategory.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">
                      Chevauchements ({conflicts.sameCategory.length})
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.badgeBg} ${config.badgeText}`}>
                    {categorieDemandeur}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-auto">
                  {conflicts.sameCategory.map((conflict, index) => (
                    <div key={index} className="px-3 py-2.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200">
                            <span className="text-gray-600 font-medium text-[10px]">
                              {conflict.employe.prenom?.charAt(0) || ''}{conflict.employe.nom?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-xs truncate">
                              {conflict.employe.prenom} {conflict.employe.nom}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock size={9} />
                              {new Date(conflict.conge.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → {new Date(conflict.conge.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            conflict.isApproved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {conflict.isApproved ? 'Approuvé' : 'En attente'}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {conflict.overlap}j de chevauchement
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Si pas de conflit, message positif */}
            {conflicts.sameCategory.length === 0 && conflicts.conflictLevel === 'none' && !shiftImpact?.joursAvecShift && (
              <div className="flex items-center gap-3 bg-green-50/50 border border-green-200 rounded-lg p-3">
                <ShieldCheck size={18} className="text-green-500 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-green-800">Aucun chevauchement</div>
                  <div className="text-[11px] text-green-600 mt-0.5">Personne d'autre n'est en congé sur cette période dans la catégorie {categorieDemandeur}.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-gray-50/80 border-t border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
              <span className="text-[11px] sm:text-xs text-gray-500 font-medium">{config.label}</span>
              {shiftImpact && shiftImpact.joursAvecShift > 0 && (
                <span className="text-[10px] text-gray-400 ml-1">
                  · {fmtH(shiftImpact.totalHeuresPerdues)} de travail impactées
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => onReject(conge.id)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#cf292c] rounded-lg hover:bg-[#b32528] transition-colors flex items-center gap-1"
              >
                <Ban size={12} />
                Refuser
              </button>
              <button
                onClick={() => onApprove(conge.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  effectiveLevel === 'critical'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={effectiveLevel === 'critical'}
              >
                <CheckCircle2 size={12} />
                Approuver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
