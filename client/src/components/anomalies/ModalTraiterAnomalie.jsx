// client/src/components/anomalies/ModalTraiterAnomalie.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  X, AlertTriangle, CheckCircle, XCircle, MessageSquare, Banknote, Clock, 
  TrendingDown, TrendingUp, AlertCircle, Eye, Users, 
  Calendar, FileText, Zap, LogIn, LogOut, ArrowRight, Sparkles, CalendarPlus, Calculator 
} from 'lucide-react';
import { useTraiterAnomalie } from '../../hooks/useAnomalies';
import { anomaliesUtils } from '../../hooks/useAnomalies';
import { toLocalDateString } from '../../utils/parisTimeUtils';
import { useToast } from '../ui/Toast';
import { API_URL } from '../../config/api';

// Couleur brand
const BRAND_COLOR = '#cf292c';

/**
 * Modale pour traiter une anomalie (valider, refuser, corriger)
 */
export default function ModalTraiterAnomalie({
  anomalie,
  onClose,
  onTraited = null
}) {
  const [action, setAction] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [montantExtra, setMontantExtra] = useState('');
  const [heuresExtra, setHeuresExtra] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // 🆕 États pour le bilan journalier
  const [bilanJournalier, setBilanJournalier] = useState(null);
  const [loadingBilan, setLoadingBilan] = useState(false);
  const [confirmSoldeNegatif, setConfirmSoldeNegatif] = useState(false);
  
  // 🆕 États pour le contexte du jour
  const [showContexte, setShowContexte] = useState(false);
  const [contexteJour, setContexteJour] = useState(null);
  const [loadingContexte, setLoadingContexte] = useState(false);
  
  // Pour l'action "corriger"
  const [shiftCorrection, setShiftCorrection] = useState({
    type: 'changement_planning',
    nouvelleHeure: '',
    raison: ''
  });

  const { traiterAnomalie, loading, error } = useTraiterAnomalie();
  const toast = useToast();

  // 🆕 Fonction pour récupérer le bilan journalier
  const fetchBilanJournalier = useCallback(async () => {
    // Récupérer employeId depuis anomalie.employeId ou anomalie.employe.id
    const empId = anomalie?.employeId || anomalie?.employe?.id;
    
    if (!empId || !anomalie?.date) {
      return;
    }
    
    setLoadingBilan(true);
    try {
      const token = localStorage.getItem('token');
      const dateStr = toLocalDateString(new Date(anomalie.date));
      
      const response = await axios.get(
        `${API_URL}/api/anomalies/bilan-journalier/${empId}/${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 🆕 D'abord, extraire les données de l'anomalie comme fallback
      const anomalieDetails = anomalie?.details || {};
      const soldeFromAnomalie = anomalieDetails.soldeNet !== undefined 
        ? anomalieDetails.soldeNet / 60 
        : null;
      const tempsPlanifieAnomalie = anomalieDetails.tempsPlanifie || 0;
      const tempsTravailleAnomalie = anomalieDetails.tempsTravaille || 0;
      
      // Utiliser le NOUVEAU calcul basé sur temps travaillé net
      if (response.data && response.data.calcul) {
        const calcul = response.data.calcul;
        const bilan = response.data.bilan;
        
        // 🆕 Vérifier si l'API a vraiment des données ou si c'est vide (0/0/0)
        const apiHasData = calcul.minutesPrevues > 0 || calcul.minutesTravaillees > 0;
        
        // Si l'API n'a pas de données, utiliser les détails de l'anomalie
        const finalMinutesPrevues = apiHasData ? calcul.minutesPrevues : tempsPlanifieAnomalie;
        const finalMinutesTravaillees = apiHasData ? calcul.minutesTravaillees : tempsTravailleAnomalie;
        const finalSoldeNet = apiHasData ? calcul.soldeHeures : soldeFromAnomalie;
        
        const transformedBilan = {
          // Méthode de calcul utilisée
          methode: apiHasData ? calcul.methode : 'anomalie_details',
          // Temps prévu vs travaillé
          minutesPrevues: finalMinutesPrevues,
          minutesTravaillees: finalMinutesTravaillees,
          // Solde net
          soldeNet: finalSoldeNet,
          soldeMinutes: apiHasData ? calcul.soldeMinutes : (anomalieDetails.soldeNet || 0),
          // Flag source
          fromAnomalieDetails: !apiHasData,
          // Détails par segment
          detailsSegments: calcul.detailsSegments || [],
          // Garder les anomalies pour affichage
          heuresPositives: (bilan?.heuresSup?.totalMinutes || 0) / 60,
          heuresNegatives: (bilan?.retards?.totalMinutes || 0) / 60,
          anomalies: [
            ...(bilan?.heuresSup?.details || []).map(d => ({
              ...d,
              type: 'heures_sup',
              heures: (d.minutes || 0) / 60
            })),
            ...(bilan?.retards?.details || []).map(d => ({
              ...d,
              heures: (d.minutes || 0) / 60
            }))
          ],
          recommendation: {
            extraRecommande: response.data.recommendation?.extraPayable || false,
            extraSuggere: parseFloat(response.data.recommendation?.heuresSuggeres) || 0,
            message: response.data.recommendation?.message || ''
          }
        };
        
        setBilanJournalier(transformedBilan);
        
        // Auto-suggérer les heures si positif
        if (transformedBilan.recommendation.extraSuggere > 0) {
          setHeuresExtra(transformedBilan.recommendation.extraSuggere.toFixed(2));
        }
      } else if (response.data && response.data.bilan) {
        // Fallback ancien format
        const transformedBilan = {
          heuresPositives: (response.data.bilan.heuresSup?.totalMinutes || 0) / 60,
          heuresNegatives: (response.data.bilan.retards?.totalMinutes || 0) / 60,
          soldeNet: response.data.bilan.solde?.heures || 0,
          anomalies: [
            ...(response.data.bilan.heuresSup?.details || []).map(d => ({
              ...d,
              type: 'heures_sup',
              heures: (d.minutes || 0) / 60
            })),
            ...(response.data.bilan.retards?.details || []).map(d => ({
              ...d,
              heures: (d.minutes || 0) / 60
            }))
          ],
          recommendation: {
            extraRecommande: response.data.recommendation?.extraPayable || false,
            extraSuggere: parseFloat(response.data.recommendation?.heuresSuggeres) || 0,
            message: response.data.recommendation?.message || ''
          }
        };
        
        setBilanJournalier(transformedBilan);
        
        if (transformedBilan.recommendation.extraSuggere > 0) {
          setHeuresExtra(transformedBilan.recommendation.extraSuggere.toFixed(2));
        }
      } else {
        // 🆕 FALLBACK: Utiliser les données de l'anomalie elle-même
        
        // Extraire le solde depuis les détails de l'anomalie
        const details = anomalie?.details || {};
        const soldeFromAnomalie = details.soldeNet !== undefined 
          ? details.soldeNet / 60  // Convertir minutes en heures
          : null;
        
        const tempsPlanifie = details.tempsPlanifie ? details.tempsPlanifie / 60 : 0;
        const tempsTravaille = details.tempsTravaille ? details.tempsTravaille / 60 : 0;
        
        setBilanJournalier({
          minutesPrevues: details.tempsPlanifie || 0,
          minutesTravaillees: details.tempsTravaille || 0,
          heuresPositives: tempsTravaille > tempsPlanifie ? tempsTravaille - tempsPlanifie : 0,
          heuresNegatives: tempsTravaille < tempsPlanifie ? tempsPlanifie - tempsTravaille : 0,
          soldeNet: soldeFromAnomalie !== null ? soldeFromAnomalie : 0,
          anomalies: [],
          fromAnomalieDetails: true, // Flag pour indiquer la source
          recommendation: {
            extraRecommande: soldeFromAnomalie === null || soldeFromAnomalie > 0,
            extraSuggere: 0,
            message: soldeFromAnomalie !== null 
              ? (soldeFromAnomalie > 0 ? 'Solde positif selon l\'anomalie' : 'Solde négatif - pas d\'extra payable')
              : 'Aucune donnée de bilan disponible'
          }
        });
      }
    } catch (err) {
      console.error('❌ Erreur fetch bilan journalier:', err);
      
      // 🆕 En cas d'erreur, utiliser les détails de l'anomalie comme fallback
      const details = anomalie?.details || {};
      const soldeFromAnomalie = details.soldeNet !== undefined 
        ? details.soldeNet / 60 
        : null;
      
      setBilanJournalier({
        minutesPrevues: details.tempsPlanifie || 0,
        minutesTravaillees: details.tempsTravaille || 0,
        heuresPositives: 0,
        heuresNegatives: 0,
        soldeNet: soldeFromAnomalie !== null ? soldeFromAnomalie : 0,
        anomalies: [],
        fromAnomalieDetails: true,
        error: true,
        recommendation: {
          extraRecommande: soldeFromAnomalie === null || soldeFromAnomalie > 0,
          extraSuggere: 0,
          message: 'Erreur - bilan basé sur les détails de l\'anomalie'
        }
      });
    } finally {
      setLoadingBilan(false);
    }
  }, [anomalie?.employeId, anomalie?.employe?.id, anomalie?.date]);

  // 🆕 Charger le bilan automatiquement pour les anomalies extra_potentiel
  useEffect(() => {
    const isTypeExtra = anomalie?.type?.includes('extra_potentiel') || 
                        anomalie?.type?.includes('heures_sup') || 
                        anomalie?.type?.includes('hors_plage') ||
                        anomalie?.type?.includes('arrivee_anticipee_extra');
    if (isTypeExtra && anomalie) {
      fetchBilanJournalier();
    } else {
      setBilanJournalier(null);
      setConfirmSoldeNegatif(false);
    }
  }, [anomalie, fetchBilanJournalier]);

  // 🆕 Fonction pour récupérer le contexte complet du jour
  const fetchContexteJour = useCallback(async () => {
    if (!anomalie?.date) return;
    
    setLoadingContexte(true);
    try {
      const token = localStorage.getItem('token');
      const dateStr = toLocalDateString(new Date(anomalie.date));
      
      // Récupérer tous les shifts du jour (route: /shifts avec start et end)
      const shiftsResponse = await axios.get(
        `${API_URL}/shifts?start=${dateStr}&end=${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Récupérer les pointages du jour pour l'employé concerné
      const empId = anomalie?.employeId || anomalie?.employe?.id;
      let pointages = [];
      if (empId) {
        try {
          const pointagesResponse = await axios.get(
            `${API_URL}/api/pointages?userId=${empId}&date=${dateStr}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          pointages = pointagesResponse.data || [];
        } catch (e) {
        }
      }
      
      // Calculer le contexte
      const shifts = shiftsResponse.data || [];
      const employesPresents = [...new Set(shifts.map(s => {
        if (s.employe) return s.employe.prenom + ' ' + s.employe.nom;
        return null;
      }).filter(Boolean))];
      const shiftEmploye = shifts.find(s => s.employeId === empId || s.employe?.id === empId);
      
      // Déterminer le jour de la semaine
      const dateObj = new Date(anomalie.date);
      const joursSemaine = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const jourSemaine = joursSemaine[dateObj.getDay()];
      
      setContexteJour({
        date: dateStr,
        jourSemaine,
        // Équipe présente
        nombreEmployes: employesPresents.length,
        employesPresents,
        // Shift de l'employé concerné
        shiftEmploye: shiftEmploye ? {
          segments: shiftEmploye.segments || [],
          type: shiftEmploye.type,
          motif: shiftEmploye.motif
        } : null,
        // Pointages réels
        pointages: pointages.map(p => ({
          type: p.type,
          heure: new Date(p.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        })),
        // Tous les shifts pour analyse
        tousLesShifts: shifts.map(s => ({
          employe: s.employe?.prenom + ' ' + s.employe?.nom,
          segments: s.segments,
          type: s.type
        }))
      });
      
      setShowContexte(true);
    } catch (err) {
      console.error('Erreur fetch contexte:', err);
      setContexteJour({ error: 'Impossible de charger le contexte' });
      setShowContexte(true);
    } finally {
      setLoadingContexte(false);
    }
  }, [anomalie]);

  // Initialiser les valeurs selon le type d'anomalie
  useEffect(() => {
    if (anomalie?.type?.includes('extra_potentiel') || anomalie?.type?.includes('heures_sup') || anomalie?.type?.includes('hors_plage') || anomalie?.type?.includes('arrivee_anticipee_extra')) {
      // Calculer les heures à partir des détails de l'anomalie
      // Chercher dans plusieurs emplacements possibles et forcer en nombre
      const heuresRaw = anomalie.heuresExtra || 
        anomalie.details?.heuresSup ||
        anomalie.details?.heuresSupp ||
        (anomalie.details?.minutesEnAvance ? anomalie.details.minutesEnAvance / 60 : 0) ||
        (anomalie.details?.minutesApres ? anomalie.details.minutesApres / 60 : 0) ||
        (anomalie.details?.ecartMinutes ? Math.abs(anomalie.details.ecartMinutes) / 60 : 0) ||
        (anomalie.details?.minutesEcart ? Math.abs(anomalie.details.minutesEcart) / 60 : 0) ||
        (anomalie.ecartMinutes ? Math.abs(anomalie.ecartMinutes) / 60 : 0) ||
        0;
      
      // Forcer la conversion en nombre (Decimal de Prisma -> Number)
      const heures = Number(heuresRaw) || 0;
      
      if (heures > 0) {
        setHeuresExtra(heures.toFixed(2));
      }
    }
    
    // Si l'anomalie est déjà traitée, pré-sélectionner son statut actuel
    if (anomalie?.statut && ['validee', 'refusee', 'corrigee'].includes(anomalie.statut)) {
      const actionMap = {
        'validee': 'valider',
        'refusee': 'refuser',
        'corrigee': 'corriger'
      };
      setAction(actionMap[anomalie.statut]);
    }
  }, [anomalie]);



  if (!anomalie) return null;
  
  // Vérifier si l'anomalie a déjà été traitée
  const estDejaTraitee = anomalie.statut && ['validee', 'refusee', 'corrigee'].includes(anomalie.statut);

  const graviteStyle = anomaliesUtils.getGraviteStyle(anomalie.gravite);
  const statutStyle = anomaliesUtils.getStatutStyle(anomalie.statut);
  const typeLabel = anomaliesUtils.getTypeLabel(anomalie.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!action) {
      toast.alert({
        type: 'warning',
        title: 'Action requise',
        message: 'Veuillez sélectionner une action à effectuer'
      });
      return;
    }

    // Validation spécifique pour payer_extra
    if (action === 'payer_extra') {
      if (!heuresExtra || parseFloat(heuresExtra) <= 0) {
        toast.alert({
          type: 'warning',
          title: 'Heures requises',
          message: 'Veuillez indiquer le nombre d\'heures à payer'
        });
        return;
      }
      
      // Vérifier si solde négatif - l'employé n'a pas fait d'extra net ce jour
      if (bilanJournalier && bilanJournalier.soldeNet < 0 && !confirmSoldeNegatif) {
        toast.alert({
          type: 'warning',
          title: 'Attention - Solde négatif',
          message: 'Le solde journalier est négatif (plus de retards que d\'heures sup).\n\nCochez la case de confirmation si vous souhaitez quand même créer ce paiement.'
        });
        return;
      }
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      const options = {
        commentaire: commentaire.trim() || undefined
      };

      // Pour les extras potentiels, inclure les montants
      if (anomalie.type.includes('extra_potentiel') || anomalie.type.includes('heures_sup') || anomalie.type.includes('hors_plage')) {
        if (heuresExtra) options.heuresExtra = parseFloat(heuresExtra);
        if (montantExtra) options.montantExtra = parseFloat(montantExtra);
      }

      // Pour le paiement en extra - simplifié: juste les heures
      // Le taux horaire et la méthode seront choisis au moment du paiement dans ExtrasManager
      if (action === 'payer_extra') {
        options.heuresExtra = parseFloat(heuresExtra) || 0; // heuresExtra est déjà en heures décimales
        // Taux par défaut 10€/h sera utilisé côté backend
      }

      // Pour la correction, inclure les détails du shift
      if (action === 'corriger') {
        if (!shiftCorrection.raison.trim()) {
          toast.alert({
            type: 'warning',
            title: 'Justification requise',
            message: 'Veuillez fournir une justification pour la correction'
          });
          return;
        }
        options.shiftCorrection = {
          type: shiftCorrection.type,
          nouvelleHeure: shiftCorrection.nouvelleHeure || undefined,
          raison: shiftCorrection.raison
        };
      }

      // 🆕 Pour la conversion en extra (pointage hors planning)
      if (action === 'convertir_extra') {
        const heures = heuresExtra || anomalie?.details?.heuresTravaillees || 0;
        if (!heures || parseFloat(heures) <= 0) {
          toast.alert({
            type: 'warning',
            title: 'Heures requises',
            message: 'Veuillez indiquer le nombre d\'heures à convertir'
          });
          return;
        }
        options.heuresExtra = parseFloat(heures);
        // Taux par défaut 10€/h sera utilisé côté backend
      }

      const anomalieMAJ = await traiterAnomalie(anomalie.id, action, options);
      
      setShowConfirmation(false);
      
      // Afficher un message de succès détaillé
      const actionLabels = {
        'valider': 'validée',
        'refuser': 'refusée', 
        'corriger': 'corrigée',
        'payer_extra': 'traitée',
        'convertir_extra': 'convertie'
      };
      const actionLabel = actionLabels[action] || action;
      
      // Messages spécifiques par action
      let details = [];
      details.push({ text: `Employé: ${anomalieMAJ.employe?.prenom} ${anomalieMAJ.employe?.nom}` });
      details.push({ text: `Statut: ${anomalieMAJ.statut}` });

      // Message spécifique pour paiement extra
      if (action === 'payer_extra') {
        const val = parseFloat(heuresExtra) || 0; const h = Math.floor(val); const r = Math.round((val - h) * 60);
        const label = h > 0 ? `${h}h${r > 0 ? String(r).padStart(2,'0') : ''}` : `${r}min`;
        details.push({ text: `Paiement créé : ${label}` });
        details.push({ text: 'Retrouvez-le dans "Suivi Extras"' });
      }

      // Message spécifique pour conversion en extra
      if (action === 'convertir_extra') {
        const heures = heuresExtra || anomalie?.details?.heuresTravaillees || 0;
        const cval = parseFloat(heures) || 0; const ch = Math.floor(cval); const cr = Math.round((cval - ch) * 60);
        const clabel = ch > 0 ? `${ch}h${cr > 0 ? String(cr).padStart(2,'0') : ''}` : `${cr}min`;
        details.push({ text: `Converti en ${clabel} extra` });
        details.push({ text: 'Paiement créé dans "Suivi Extras"' });
      }
      
      // Ajouter les infos du workflow
      if (anomalieMAJ._impactScore !== undefined) {
        let impactText = `Impact score: ${anomalieMAJ._impactScore} points`;
        if (action === 'refuser') impactText += ' (pénalité double)';
        else if (action === 'corriger') impactText += ' (aucune pénalité)';
        details.push({ text: impactText });
      }

      toast.alert({
        type: action === 'refuser' ? 'warning' : 'success',
        title: `Anomalie ${actionLabel}`,
        message: anomalieMAJ._message || `L'anomalie a été traitée avec succès`,
        details
      });
      
      onTraited?.(anomalieMAJ);
      onClose();
      
    } catch (error) {
      console.error('❌ Erreur traitement anomalie:', error);
      toast.error('Erreur', error.message);
      setShowConfirmation(false);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'valider': return <CheckCircle className="h-4 w-4" />;
      case 'refuser': return <XCircle className="h-4 w-4" />;
      case 'corriger': return <AlertTriangle className="h-4 w-4" />;
      case 'payer_extra': return <Banknote className="h-4 w-4" />;
      case 'convertir_extra': return <TrendingUp className="h-4 w-4" />;
      default: return null;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'valider': return 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100';
      case 'refuser': return 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100';
      case 'corriger': return 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'payer_extra': return 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'convertir_extra': return 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  // Vérifie si l'anomalie permet le paiement en extra (extra_potentiel, arrivee_anticipee_extra ou heures_sup)
  const isExtraPotentiel = anomalie?.type?.includes('extra_potentiel') || 
                           anomalie?.type?.includes('arrivee_anticipee_extra') || 
                           anomalie?.type?.includes('heures_sup') || 
                           anomalie?.type?.includes('hors_plage');
  const soldePositif = !bilanJournalier || bilanJournalier.soldeNet >= 0;
  const canPayExtra = isExtraPotentiel && soldePositif;
  
  // 🆕 Vérifie si l'anomalie peut être convertie en extra (pointage hors planning)
  const typesConvertiblesExtra = ['pointage_hors_planning', 'presence_non_prevue', 'pointage_pendant_conge'];
  const canConvertToExtra = typesConvertiblesExtra.includes(anomalie?.type);
  
  // 🆕 Détecter le type d'anomalie pour adapter les actions
  const isAbsence = anomalie?.type?.includes('absence') || anomalie?.type?.includes('segment_non_pointe');
  const isPointageManquant = anomalie?.type?.includes('missing_in') || anomalie?.type?.includes('missing_out');
  const isHorsPlanning = anomalie?.type?.includes('pointage_hors_planning') || anomalie?.type?.includes('presence_non_prevue');
  
  // 🆕 Actions adaptées selon le type d'anomalie
  const getActionsForType = () => {
    // Extra potentiel (départ tardif OU arrivée anticipée) : actions spécifiques avec Payer Extra en premier
    if (isExtraPotentiel) {
      const isArrivee = anomalie?.type?.includes('arrivee_anticipee');
      return [
        { value: 'payer_extra', label: 'Payer en Extra', description: isArrivee ? 'Payer l\'arrivée anticipée' : 'Créer un paiement espèces', icon: Banknote, color: 'purple' },
        { value: 'refuser', label: 'Refuser', description: 'Ne pas payer (travail non demandé)', icon: XCircle, color: 'red' },
        { value: 'corriger', label: 'Corriger', description: 'Erreur de planning', icon: AlertTriangle, color: 'orange' },
      ];
    }
    
    if (isAbsence) {
      return [
        { value: 'justifier', label: 'Justifier', description: 'Absence justifiée (maladie, CP, etc.)', icon: CheckCircle, color: 'emerald' },
        { value: 'refuser', label: 'Injustifiée', description: 'Absence non justifiée (avertissement)', icon: XCircle, color: 'red' },
        { value: 'corriger', label: 'Corriger', description: 'Erreur de planning', icon: AlertTriangle, color: 'orange' },
      ];
    }
    
    if (isPointageManquant) {
      return [
        { value: 'corriger', label: 'Compléter', description: 'Ajouter l\'heure manquante', icon: CheckCircle, color: 'emerald' },
        { value: 'ignorer', label: 'Ignorer', description: 'Laisser tel quel', icon: XCircle, color: 'slate' },
      ];
    }
    
    if (isHorsPlanning) {
      return [
        { value: 'valider', label: 'Régulariser', description: 'Créer le shift et comptabiliser les heures', icon: CheckCircle, color: 'emerald' },
        { value: 'payer_extra', label: 'Payer en Extra', description: 'Payer ces heures en espèces (hors bulletin)', icon: Banknote, color: 'purple' },
        { value: 'refuser', label: 'Rejeter', description: 'Ne pas comptabiliser (travail non autorisé)', icon: XCircle, color: 'red' },
      ];
    }
    
    // Fallback pour autres types (anciens types qui pourraient encore exister)
    return [
      { value: 'valider', label: 'Valider', description: 'Accepter', icon: CheckCircle, color: 'emerald' },
      { value: 'refuser', label: 'Refuser', description: 'Rejeter', icon: XCircle, color: 'red' },
      { value: 'corriger', label: 'Corriger', description: 'Modifier', icon: AlertTriangle, color: 'orange' },
    ];
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        
        {/* En-tête - Style léger */}
        <div className="flex-shrink-0 bg-white border-b border-slate-100">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Icône simple */}
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-slate-800">
                    Traiter l'anomalie
                  </h2>
                  <p className="text-sm text-slate-500">
                    {anomalie.employe?.prenom} {anomalie.employe?.nom} • {anomaliesUtils.formatDate(anomalie.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* Carte anomalie - Style léger */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 mb-4">
            {/* Badges statut + type */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statutStyle.bg} ${statutStyle.color}`}>
                {statutStyle.label}
              </span>
              <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {typeLabel}
              </span>
              <span className="text-xs text-slate-400 ml-auto">
                {anomaliesUtils.formatTime(anomalie.createdAt)}
              </span>
            </div>
            
            {/* Description */}
            <p className="text-sm text-slate-600 mb-3">
              {anomalie.description}
            </p>

            {/* Détails en grille */}
            {anomalie.details && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(() => {
                  const type = anomalie.type || '';
                  const isExtra = type.includes('extra') || type.includes('heures_sup') || type.includes('hors_plage');
                  
                  if (isExtra) {
                    // Pour extras : afficher la durée réellement travaillée
                    const heureArr = anomalie.details.heureArriveeReelle || anomalie.details.heureReelle;
                    const heureDep = anomalie.details.heureDepartReelle;
                    if (heureArr && heureDep) {
                      const [aH, aM] = heureArr.split(':').map(Number);
                      const [dH, dM] = heureDep.split(':').map(Number);
                      let totalMin = (dH * 60 + dM) - (aH * 60 + aM);
                      if (totalMin < 0) totalMin += 1440;
                      const h = Math.floor(totalMin / 60);
                      const r = totalMin % 60;
                      return (
                        <div className="bg-white rounded-lg p-2 text-center border border-slate-200">
                          <div className="text-[10px] text-slate-400 uppercase mb-0.5">Durée travaillée</div>
                          <div className="text-sm font-semibold text-blue-600">
                            {h > 0 ? `${h}h${r > 0 ? String(r).padStart(2,'0') : ''}` : `${totalMin}min`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }
                  
                  // Pour retards/avances/départs anticipés : badge contextuel
                  if (!anomalie.details.ecartMinutes) return null;
                  const mins = Math.abs(anomalie.details.ecartMinutes);
                  const h = Math.floor(mins / 60);
                  const r = mins % 60;
                  const dureeLabel = h > 0 ? `${h}h${r > 0 ? String(r).padStart(2,'0') : ''}` : `${mins}min`;
                  
                  let label, colorClass;
                  if (type.includes('retard')) {
                    label = 'Retard'; colorClass = 'text-red-600';
                  } else if (type.includes('depart_premature') || type.includes('depart_anticipe')) {
                    label = 'Départ anticipé'; colorClass = 'text-amber-600';
                  } else if (type.includes('arrivee_anticipee')) {
                    label = 'Avance'; colorClass = 'text-emerald-600';
                  } else {
                    label = 'Écart'; colorClass = anomalie.details.ecartMinutes > 0 ? 'text-emerald-600' : 'text-red-600';
                  }
                  
                  return (
                    <div className="bg-white rounded-lg p-2 text-center border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase mb-0.5">{label}</div>
                      <div className={`text-sm font-semibold ${colorClass}`}>{dureeLabel}</div>
                    </div>
                  );
                })()}
                {anomalie.details.heurePrevu && (
                  <div className="bg-white rounded-lg p-2 text-center border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase mb-0.5">Prévu</div>
                    <div className="text-sm font-semibold text-slate-700">{anomalie.details.heurePrevu}</div>
                  </div>
                )}
                {anomalie.details.heureReelle && (
                  <div className="bg-white rounded-lg p-2 text-center border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase mb-0.5">Réel</div>
                    <div className="text-sm font-semibold text-slate-700">{anomalie.details.heureReelle}</div>
                  </div>
                )}
                {anomalie.heuresExtra && (
                  <div className="bg-white rounded-lg p-2 text-center border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase mb-0.5">Heures sup</div>
                    <div className="text-sm font-semibold text-blue-600">{Number(anomalie.heuresExtra).toFixed(2)}h</div>
                  </div>
                )}
              </div>
            )}
            
            {/* Bouton Voir le contexte */}
            <button
              onClick={fetchContexteJour}
              disabled={loadingContexte}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-500 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              {loadingContexte ? 'Chargement...' : 'Voir le contexte du jour'}
            </button>
          </div>

          {/* Panneau contexte du jour */}
          {showContexte && contexteJour && (
            <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Contexte du {contexteJour.jourSemaine} {contexteJour.date}
                </span>
                <button 
                  onClick={() => setShowContexte(false)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-500 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {contexteJour.error ? (
                <p className="text-sm text-red-600">{contexteJour.error}</p>
              ) : (
                <div className="space-y-3">
                  {/* Équipe présente */}
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">Équipe ce jour ({contexteJour.nombreEmployes} personnes)</p>
                      <p className="text-xs text-slate-500">
                        {contexteJour.employesPresents?.length > 0 
                          ? contexteJour.employesPresents.join(', ')
                          : 'Aucune donnée'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Shift prévu de l'employé */}
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">Shift prévu pour {anomalie?.employe?.prenom || 'l\'employé'}</p>
                      {contexteJour.shiftEmploye ? (
                        <div className="text-xs text-slate-500">
                          {contexteJour.shiftEmploye.segments?.map((seg, i) => (
                            <span key={i}>
                              {seg.debut || seg.start} - {seg.fin || seg.end}
                              {i < contexteJour.shiftEmploye.segments.length - 1 && ', '}
                            </span>
                          ))}
                          {contexteJour.shiftEmploye.motif && (
                            <span className="ml-2 text-amber-600">({contexteJour.shiftEmploye.motif})</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Aucun shift trouvé</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Pointages réels */}
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">Pointages réels</p>
                      {contexteJour.pointages?.length > 0 ? (
                        <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                          {contexteJour.pointages.map((p, i) => (
                            <span key={i} className={`px-1.5 py-0.5 rounded ${
                              p.type === 'arrivee' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {p.type === 'arrivee' ? '→' : '←'} {p.heure}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Aucun pointage trouvé</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Analyse rapide */}
                  <div className="mt-3 p-2 bg-white rounded border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-1">💡 Analyse</p>
                    <p className="text-xs text-slate-600">
                      {contexteJour.nombreEmployes > 5 
                        ? `Journée chargée (${contexteJour.nombreEmployes} personnes) - Possible rush/renfort demandé`
                        : contexteJour.nombreEmployes > 0
                          ? `Équipe réduite (${contexteJour.nombreEmployes} personnes) - Vérifier si besoin de renfort`
                          : 'Pas de données d\'équipe pour ce jour'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {isExtraPotentiel && (
            <div className={`mb-4 p-4 rounded-lg border ${
              loadingBilan ? 'bg-slate-50 border-slate-200' :
              bilanJournalier?.soldeNet >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Bilan du {anomaliesUtils.formatDate(anomalie.date)}
                </span>
                {loadingBilan && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                    Calcul...
                  </span>
                )}
              </div>
              
              {bilanJournalier && !loadingBilan && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase mb-0.5">Prévu</div>
                      <div className="text-lg font-semibold text-slate-700">
                        {(() => { const m = bilanJournalier.minutesPrevues || 0; const h = Math.floor(m / 60); const r = Math.round(m % 60); return r > 0 ? `${h}h${String(r).padStart(2,'0')}` : `${h}h`; })()}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase mb-0.5">Travaillé</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {(() => { const m = bilanJournalier.minutesTravaillees || 0; const h = Math.floor(m / 60); const r = Math.round(m % 60); return r > 0 ? `${h}h${String(r).padStart(2,'0')}` : `${h}h`; })()}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase mb-0.5">Solde</div>
                      <div className={`text-lg font-semibold ${
                        bilanJournalier.soldeNet >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {(() => { const sm = bilanJournalier.soldeMinutes || Math.round((bilanJournalier.soldeNet || 0) * 60); const abs = Math.abs(sm); const sign = sm >= 0 ? '+' : '-'; const h = Math.floor(abs / 60); const r = abs % 60; return r > 0 ? `${sign}${h}h${String(r).padStart(2,'0')}` : `${sign}${h}h`; })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Message selon le solde */}
                  {bilanJournalier.soldeNet >= 0 ? (
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-emerald-700">Solde positif — Paiement extra recommandé</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-700">Solde négatif — Pas d'extra net ce jour</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Formulaire de traitement */}
          <form onSubmit={handleSubmit}>
            
            {/* Choix de l'action */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Action à effectuer
                {estDejaTraitee && (
                  <span className="ml-2 text-amber-500 text-xs font-normal">
                    (déjà traitée: {anomalie.statut})
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getActionsForType().map((option) => {
                  const Icon = option.icon;
                  const isSelected = action === option.value;
                  const colorClasses = {
                    emerald: isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30',
                    red: isSelected ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-red-300 hover:bg-red-50/30',
                    orange: isSelected ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/30',
                    amber: isSelected ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30',
                    purple: isSelected ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30',
                    teal: isSelected ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/30',
                    slate: isSelected ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  };
                  const iconColors = {
                    emerald: 'text-emerald-500',
                    red: 'text-red-500',
                    orange: 'text-orange-500',
                    amber: 'text-amber-500',
                    purple: 'text-purple-500',
                    teal: 'text-teal-500',
                    slate: 'text-slate-500'
                  };
                  
                  return (
                    <label
                      key={option.value}
                      className={`${estDejaTraitee && action !== option.value ? 'opacity-50' : ''} cursor-pointer border rounded-lg p-3 transition-colors ${colorClasses[option.color]}`}
                    >
                      <input
                        type="radio"
                        name="action"
                        value={option.value}
                        checked={action === option.value}
                        onChange={(e) => setAction(e.target.value)}
                        disabled={estDejaTraitee && action !== option.value}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${iconColors[option.color]}`} />
                        <div>
                          <div className="text-sm font-medium text-slate-700">{option.label}</div>
                          <p className="text-xs text-slate-400">{option.description}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 🆕 Explication pour RÉGULARISATION (pointage hors planning) */}
            {action === 'valider' && isHorsPlanning && (
              <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-start gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-emerald-900 mb-1">
                      Régularisation du pointage
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Un <strong>shift de travail normal</strong> sera créé automatiquement avec les heures pointées.
                      Ces heures seront comptabilisées dans les rapports officiels et la paie.
                    </p>
                  </div>
                </div>

                {/* Récapitulatif des heures */}
                {(() => {
                  const details = typeof anomalie?.details === 'string' 
                    ? JSON.parse(anomalie.details) 
                    : (anomalie?.details || {});
                  const heureArrivee = details.heureArrivee || details.heureDebut;
                  const heureDepart = details.heureDepart || details.heureFin;
                  
                  return (heureArrivee || heureDepart) ? (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-3">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <span>Shift qui sera créé</span>
                      </div>
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                            <LogIn className="h-3 w-3" />
                            <span>Arrivée</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-700">
                            {heureArrivee || '—'}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                            <LogOut className="h-3 w-3" />
                            <span>Départ</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-700">
                            {heureDepart || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Ce qui va se passer */}
                <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Ce qui va se passer</span>
                  </div>
                  <ul className="text-xs text-emerald-700 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CalendarPlus className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Un <strong>shift normal</strong> sera ajouté au planning</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Les heures seront <strong>comptabilisées officiellement</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Elles apparaîtront dans les <strong>rapports de paie</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>L'anomalie sera marquée comme <strong>régularisée</strong></span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* 💶 Formulaire "Payer en Extra" - Version simplifiée */}
            {action === 'payer_extra' && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-2 mb-4">
                  <Banknote className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-purple-900 mb-1">
                      Créer un suivi de paiement extra
                    </h4>
                    <p className="text-xs text-purple-700">
                      Un enregistrement sera créé pour suivre ce paiement. Vous pourrez choisir le <strong>taux horaire</strong> et la <strong>méthode de paiement</strong> au moment de valider le paiement dans "Suivi Extras".
                    </p>
                  </div>
                </div>

                {/* Alerte si solde négatif */}
                {bilanJournalier && bilanJournalier.soldeNet < 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-red-800">
                          ⚠️ Solde journalier négatif
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          Ce jour-là, l'employé a plus de retards ({Math.abs(bilanJournalier.soldeNet).toFixed(2)}h) que d'heures supplémentaires. 
                          Le paiement d'extra n'est pas recommandé.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-start gap-2 p-2 bg-white rounded cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={confirmSoldeNegatif}
                        onChange={(e) => setConfirmSoldeNegatif(e.target.checked)}
                        className="mt-0.5 h-4 w-4 text-red-600 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-700">
                        Je confirme vouloir créer ce paiement malgré le solde négatif
                      </span>
                    </label>
                  </div>
                )}

                {/* Message OK si solde positif */}
                {bilanJournalier && bilanJournalier.soldeNet >= 0 && (
                  <div className="mb-4 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-emerald-700">
                      ✓ Solde positif (+{(() => { const sm = bilanJournalier.soldeMinutes || Math.round(bilanJournalier.soldeNet * 60); const h = Math.floor(sm / 60); const r = sm % 60; return h > 0 ? `${h}h${r > 0 ? String(r).padStart(2,'0') : ''}` : `${sm}min`; })()}) - Paiement recommandé
                    </span>
                  </div>
                )}
                
                {/* Affichage des heures à payer */}
                <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-700 mb-1">
                      {(() => { const val = parseFloat(heuresExtra) || 0; const h = Math.floor(val); const r = Math.round((val - h) * 60); return h > 0 ? `${h}h${r > 0 ? String(r).padStart(2,'0') : ''}` : `${r}min`; })()}
                    </div>
                    <div className="text-sm text-gray-500">à enregistrer pour paiement</div>
                  </div>
                  
                  {/* Champs heures + minutes modifiables */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1 text-center">
                      Modifier si nécessaire
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={Math.floor(parseFloat(heuresExtra) || 0)}
                        onChange={(e) => {
                          const h = parseInt(e.target.value) || 0;
                          const val = parseFloat(heuresExtra) || 0;
                          const mins = Math.round((val - Math.floor(val)) * 60);
                          setHeuresExtra((h + mins / 60).toFixed(2));
                        }}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-500">h</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="59"
                        value={Math.round(((parseFloat(heuresExtra) || 0) - Math.floor(parseFloat(heuresExtra) || 0)) * 60)}
                        onChange={(e) => {
                          const mins = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                          const h = Math.floor(parseFloat(heuresExtra) || 0);
                          setHeuresExtra((h + mins / 60).toFixed(2));
                        }}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-500">min</span>
                    </div>
                  </div>
                </div>

                {/* Info importante */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>📋 Prochaine étape :</strong> Retrouvez ce paiement dans <strong>"Suivi Extras"</strong> (Planning RH) pour confirmer le paiement avec le taux horaire souhaité (10€/h par défaut).
                  </p>
                </div>
              </div>
            )}

            {/* 🆕 Formulaire "Convertir en Extra" - Pour pointage hors planning */}
            {action === 'convertir_extra' && (
              <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-start gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-emerald-900 mb-1">
                      Payer en heures supplémentaires
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Ce pointage hors planning sera payé en espèces (hors bulletin de paie). 
                      Un shift avec segment <strong>isExtra</strong> sera créé automatiquement pour traçabilité.
                    </p>
                  </div>
                </div>

                {/* Récapitulatif des pointages */}
                {anomalie?.details?.pointages && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-emerald-200">
                    <div className="text-xs font-medium text-gray-600 mb-2">📍 Pointages détectés</div>
                    <div className="flex flex-wrap gap-2">
                      {anomalie.details.pointages.map((p, i) => (
                        <span 
                          key={i} 
                          className={`px-2 py-1 rounded text-xs font-mono ${
                            p.type === 'arrivee' || p.type === 'ENTRÉE' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.type === 'arrivee' || p.type === 'ENTRÉE' ? '→' : '←'} {p.heure}
                        </span>
                      ))}
                    </div>
                    {anomalie.details.heuresTravaillees && (
                      <div className="mt-2 text-sm text-gray-700">
                        <strong>Durée calculée:</strong> {anomalie.details.heuresTravaillees}h
                      </div>
                    )}
                  </div>
                )}
                
                {/* Affichage des heures à convertir */}
                <div className="bg-white rounded-lg p-4 border border-emerald-200 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-700 mb-1">
                      {(() => { const val = parseFloat(heuresExtra) || 0; const h = Math.floor(val); const r = Math.round((val - h) * 60); return h > 0 ? `${h}h${r > 0 ? String(r).padStart(2,'0') : ''}` : `${r}min`; })()}
                    </div>
                    <div className="text-sm text-gray-500">à convertir en extra</div>
                  </div>
                  
                  {/* Champs heures + minutes modifiables */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1 text-center">
                      Modifier si nécessaire
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={Math.floor(parseFloat(heuresExtra) || 0)}
                        onChange={(e) => {
                          const h = parseInt(e.target.value) || 0;
                          const val = parseFloat(heuresExtra) || 0;
                          const mins = Math.round((val - Math.floor(val)) * 60);
                          setHeuresExtra((h + mins / 60).toFixed(2));
                        }}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <span className="text-sm font-medium text-gray-500">h</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="59"
                        value={Math.round(((parseFloat(heuresExtra) || 0) - Math.floor(parseFloat(heuresExtra) || 0)) * 60)}
                        onChange={(e) => {
                          const mins = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                          const h = Math.floor(parseFloat(heuresExtra) || 0);
                          setHeuresExtra((h + mins / 60).toFixed(2));
                        }}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <span className="text-sm font-medium text-gray-500">min</span>
                    </div>
                  </div>
                </div>

                {/* Ce qui va se passer */}
                <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                  <p className="text-xs font-medium text-emerald-800 mb-2">✨ Ce qui va se passer :</p>
                  <ul className="text-xs text-emerald-700 space-y-1">
                    <li>• Un <strong>paiement extra</strong> sera créé (visible dans "Suivi Extras")</li>
                    <li>• Un <strong>shift rétroactif</strong> avec segment <code className="bg-emerald-100 px-1 rounded">isExtra=true</code> sera ajouté</li>
                    <li>• L'anomalie sera marquée comme <strong>résolue</strong></li>
                    <li>• Ces heures <strong>n'apparaîtront pas</strong> dans les rapports officiels</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Champs spécifiques à la correction de shift */}
            {action === 'corriger' && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-900 mb-1">
                      Correction du shift (modifie le planning)
                    </h4>
                    <p className="text-xs text-orange-700">
                      Le shift sera modifié pour corriger l'erreur administrative. Aucune pénalité ne sera appliquée à l'employé.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de correction <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={shiftCorrection.type}
                      onChange={(e) => setShiftCorrection({...shiftCorrection, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="changement_planning">Changement de planning</option>
                      <option value="erreur_admin">Erreur administrative</option>
                      <option value="incident_technique">Incident technique</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nouvelle heure (optionnel)
                    </label>
                    <input
                      type="time"
                      value={shiftCorrection.nouvelleHeure}
                      onChange={(e) => setShiftCorrection({...shiftCorrection, nouvelleHeure: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Justification de la correction <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={shiftCorrection.raison}
                      onChange={(e) => setShiftCorrection({...shiftCorrection, raison: e.target.value})}
                      rows={2}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Ex: Formation RH planifiée en retard, shift doit commencer à 10h au lieu de 8h"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Commentaire */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Commentaire {action && (
                  <span className="text-slate-400 font-normal text-xs">
                    ({action === 'refuser' ? 'Obligatoire' : 'Optionnel'})
                  </span>
                )}
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={2}
                required={action === 'refuser'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors resize-none"
                placeholder={
                  action === 'valider' ? 'Motif de validation...' :
                  action === 'refuser' ? 'Motif de refus...' :
                  action === 'corriger' ? 'Description de la correction...' :
                  'Votre commentaire...'
                }
              />
            </div>

            {/* Erreur */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Erreur</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer - Actions */}
        <div className="flex-shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action || loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              action === 'valider' ? 'bg-emerald-500 hover:bg-emerald-600' :
              action === 'refuser' ? 'bg-red-500 hover:bg-red-600' :
              action === 'corriger' ? 'bg-orange-500 hover:bg-orange-600' :
              action === 'reporter' ? 'bg-amber-500 hover:bg-amber-600' :
              action === 'payer_extra' ? 'bg-purple-500 hover:bg-purple-600' :
              action === 'convertir_extra' ? 'bg-teal-500 hover:bg-teal-600' :
              action === 'justifier' ? 'bg-emerald-500 hover:bg-emerald-600' :
              action === 'ignorer' ? 'bg-slate-500 hover:bg-slate-600' :
              'bg-slate-400'
            }`}
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Traitement...
              </>
            ) : (
              'Traiter'
            )}
          </button>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmer l'action</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              {estDejaTraitee ? (
                <>
                  Êtes-vous sûr de vouloir <strong>modifier</strong> le statut de cette anomalie ?<br/>
                  Statut actuel : <strong>{anomalie.statut}</strong><br/>
                  Nouveau statut : <strong>{action === 'valider' ? 'validée' : action === 'refuser' ? 'refusée' : 'corrigée'}</strong>
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir <strong>{action}</strong> cette anomalie ?
                  Cette action ne pourra pas être annulée.
                </>
              )}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${getActionColor(action).includes('green') ? 'bg-green-600 hover:bg-green-700' :
                  getActionColor(action).includes('red') ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
