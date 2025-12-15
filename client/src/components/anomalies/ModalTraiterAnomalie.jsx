// client/src/components/anomalies/ModalTraiterAnomalie.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, AlertTriangle, CheckCircle, XCircle, MessageSquare, Banknote, Clock, TrendingDown, TrendingUp, AlertCircle, HelpCircle, Send, Eye, Users, Calendar, FileText, Zap } from 'lucide-react';
import { useTraiterAnomalie } from '../../hooks/useAnomalies';
import { anomaliesUtils } from '../../hooks/useAnomalies';
import { toLocalDateString } from '../../utils/parisTimeUtils';
import { useToast } from '../ui/Toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  
  // 🆕 États pour l'action "reporter"
  const [questionEmploye, setQuestionEmploye] = useState('');
  const [notifierEmploye, setNotifierEmploye] = useState(true);
  
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
      console.log('🔍 Bilan: employeId ou date manquant', { 
        employeId: anomalie?.employeId, 
        employeObjId: anomalie?.employe?.id,
        date: anomalie?.date 
      });
      return;
    }
    
    setLoadingBilan(true);
    try {
      const token = localStorage.getItem('token');
      const dateStr = toLocalDateString(new Date(anomalie.date));
      
      console.log('🔍 Appel bilan journalier:', { employeId: empId, date: dateStr });
      
      const response = await axios.get(
        `${API_URL}/api/anomalies/bilan-journalier/${empId}/${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('📊 Réponse bilan journalier:', response.data);
      
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
        
        console.log('📊 Données finales:', { 
          apiHasData, 
          finalMinutesPrevues, 
          finalMinutesTravaillees, 
          finalSoldeNet,
          fromAnomalie: !apiHasData 
        });
        
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
        
        console.log('✅ Bilan transformé (méthode temps_travaille_net):', transformedBilan);
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
        
        console.log('✅ Bilan transformé (ancien format):', transformedBilan);
        setBilanJournalier(transformedBilan);
        
        if (transformedBilan.recommendation.extraSuggere > 0) {
          setHeuresExtra(transformedBilan.recommendation.extraSuggere.toFixed(2));
        }
      } else {
        // 🆕 FALLBACK: Utiliser les données de l'anomalie elle-même
        console.warn('⚠️ Réponse bilan sans données, utilisation des détails de l\'anomalie');
        
        // Extraire le solde depuis les détails de l'anomalie
        const details = anomalie?.details || {};
        const soldeFromAnomalie = details.soldeNet !== undefined 
          ? details.soldeNet / 60  // Convertir minutes en heures
          : null;
        
        const tempsPlanifie = details.tempsPlanifie ? details.tempsPlanifie / 60 : 0;
        const tempsTravaille = details.tempsTravaille ? details.tempsTravaille / 60 : 0;
        
        console.log('📋 Détails anomalie:', { 
          soldeNet: details.soldeNet, 
          tempsPlanifie: details.tempsPlanifie,
          tempsTravaille: details.tempsTravaille 
        });
        
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

  // 🆕 Charger le bilan automatiquement pour les anomalies heures_sup
  useEffect(() => {
    const isTypeHeuresSup = anomalie?.type?.includes('heures_sup') || anomalie?.type?.includes('hors_plage');
    if (isTypeHeuresSup && anomalie) {
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
          console.log('Pas de pointages trouvés');
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
    if (anomalie?.type?.includes('heures_sup') || anomalie?.type?.includes('hors_plage')) {
      // Calculer les heures à partir des détails de l'anomalie
      // Chercher dans plusieurs emplacements possibles et forcer en nombre
      const heuresRaw = anomalie.heuresExtra || 
        anomalie.details?.heuresSupp ||
        (anomalie.details?.ecartMinutes ? Math.abs(anomalie.details.ecartMinutes) / 60 : 0) ||
        (anomalie.details?.minutesEcart ? Math.abs(anomalie.details.minutesEcart) / 60 : 0) ||
        (anomalie.ecartMinutes ? Math.abs(anomalie.ecartMinutes) / 60 : 0) ||
        0;
      
      // Forcer la conversion en nombre (Decimal de Prisma -> Number)
      const heures = Number(heuresRaw) || 0;
      
      console.log('🕐 Heures supp calculées:', { heures, anomalie: anomalie?.id, details: anomalie?.details });
      
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

      // Pour les heures supplémentaires, inclure les montants
      if (anomalie.type.includes('heures_sup') || anomalie.type.includes('hors_plage')) {
        if (heuresExtra) options.heuresExtra = parseFloat(heuresExtra);
        if (montantExtra) options.montantExtra = parseFloat(montantExtra);
      }

      // Pour le paiement en extra - simplifié: juste les heures
      // Le taux horaire et la méthode seront choisis au moment du paiement dans ExtrasManager
      if (action === 'payer_extra') {
        options.heuresExtra = parseFloat(heuresExtra);
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

      // 🆕 Pour le report, inclure la question et l'option de notification
      if (action === 'reporter') {
        options.questionVerification = questionEmploye.trim() || 'Vérification nécessaire';
        options.notifierEmploye = notifierEmploye;
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
      
      console.log('✅ Anomalie traitée avec succès:', {
        id: anomalieMAJ.id,
        action,
        nouveauStatut: anomalieMAJ.statut,
        employé: `${anomalieMAJ.employe?.prenom} ${anomalieMAJ.employe?.nom}`,
        date: new Date(anomalieMAJ.date).toLocaleDateString('fr-FR')
      });
      
      setShowConfirmation(false);
      
      // Afficher un message de succès détaillé
      const actionLabels = {
        'valider': 'validée',
        'refuser': 'refusée', 
        'corriger': 'corrigée',
        'payer_extra': 'traitée',
        'reporter': 'reportée',
        'convertir_extra': 'convertie'
      };
      const actionLabel = actionLabels[action] || action;
      
      // Messages spécifiques par action
      let details = [];
      details.push({ text: `Employé: ${anomalieMAJ.employe?.prenom} ${anomalieMAJ.employe?.nom}` });
      details.push({ text: `Statut: ${anomalieMAJ.statut}` });

      // Message spécifique pour paiement extra
      if (action === 'payer_extra') {
        details.push({ text: `Paiement créé : ${heuresExtra}h` });
        details.push({ text: 'Retrouvez-le dans "Suivi Extras"' });
      }

      // Message spécifique pour report
      if (action === 'reporter') {
        details.push({ text: `Note: "${questionEmploye || 'Vérification nécessaire'}"` });
        if (notifierEmploye) {
          details.push({ text: 'Notification envoyée à l\'employé' });
        }
      }

      // Message spécifique pour conversion en extra
      if (action === 'convertir_extra') {
        const heures = heuresExtra || anomalie?.details?.heuresTravaillees || 0;
        details.push({ text: `Converti en ${heures}h extra` });
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
      case 'reporter': return <HelpCircle className="h-4 w-4" />;
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
      case 'reporter': return 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'payer_extra': return 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'convertir_extra': return 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  // Vérifie si l'anomalie permet le paiement en extra (heures sup uniquement ET solde positif)
  const isHeuresSup = anomalie?.type?.includes('heures_sup') || anomalie?.type?.includes('hors_plage');
  const soldePositif = !bilanJournalier || bilanJournalier.soldeNet >= 0;
  const canPayExtra = isHeuresSup && soldePositif;
  
  // 🆕 Vérifie si l'anomalie peut être convertie en extra (pointage hors planning)
  const typesConvertiblesExtra = ['pointage_hors_planning', 'presence_non_prevue', 'pointage_pendant_conge'];
  const canConvertToExtra = typesConvertiblesExtra.includes(anomalie?.type);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* En-tête moderne */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-xl shadow-lg"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Traiter l'anomalie
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {anomalie.employe?.prenom} {anomalie.employe?.nom} • {anomaliesUtils.formatDate(anomalie.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Carte anomalie */}
          <div className={`p-5 rounded-xl border-2 mb-6 ${graviteStyle.bg} ${graviteStyle.border}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${statutStyle.bg} ${statutStyle.color}`}>
                  <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
                  {statutStyle.label}
                </span>
                <span className="text-sm font-medium text-slate-700 bg-white/80 px-3 py-1.5 rounded-lg">
                  {typeLabel}
                </span>
              </div>
              <span className="text-xs text-slate-500 bg-white/50 px-2 py-1 rounded">
                {anomaliesUtils.formatTime(anomalie.createdAt)}
              </span>
            </div>
            
            <p className="text-sm text-slate-700 mb-4 leading-relaxed">
              {anomalie.description}
            </p>

            {/* Détails en grille */}
            {anomalie.details && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {anomalie.details.ecartMinutes && (
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">Écart</div>
                    <div className={`text-lg font-bold ${anomalie.details.ecartMinutes > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {anomalie.details.ecartMinutes > 0 ? '+' : ''}{anomalie.details.ecartMinutes} min
                    </div>
                  </div>
                )}
                {anomalie.details.heurePrevu && (
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">Prévu</div>
                    <div className="text-lg font-bold text-slate-700">{anomalie.details.heurePrevu}</div>
                  </div>
                )}
                {anomalie.details.heureReelle && (
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">Réel</div>
                    <div className="text-lg font-bold text-slate-700">{anomalie.details.heureReelle}</div>
                  </div>
                )}
                {anomalie.heuresExtra && (
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">Heures sup</div>
                    <div className="text-lg font-bold text-blue-600">{Number(anomalie.heuresExtra).toFixed(2)}h</div>
                  </div>
                )}
              </div>
            )}
            
            {/* Bouton Voir le contexte */}
            <button
              onClick={fetchContexteJour}
              disabled={loadingContexte}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-all"
            >
              <Eye className="w-4 h-4" />
              {loadingContexte ? 'Chargement...' : 'Voir le contexte du jour'}
            </button>
          </div>

          {/* 🆕 Panneau contexte du jour */}
          {showContexte && contexteJour && (
            <div className="mb-6 p-4 rounded-lg border bg-slate-50 border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Contexte du {contexteJour.jourSemaine} {contexteJour.date}
                </span>
                <button 
                  onClick={() => setShowContexte(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
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
          {isHeuresSup && (
            <div className={`mb-6 p-5 rounded-xl border-2 ${
              loadingBilan ? 'bg-slate-50 border-slate-200' :
              bilanJournalier?.soldeNet >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Bilan du {anomaliesUtils.formatDate(anomalie.date)}
                </span>
                {loadingBilan && (
                  <span className="text-xs text-slate-500 animate-pulse flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    Calcul en cours...
                  </span>
                )}
              </div>
              
              {bilanJournalier && !loadingBilan && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Prévu</div>
                      <div className="text-2xl font-bold text-slate-700">
                        {(bilanJournalier.minutesPrevues / 60 || 0).toFixed(1)}h
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Travaillé</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {(bilanJournalier.minutesTravaillees / 60 || 0).toFixed(1)}h
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Solde</div>
                      <div className={`text-2xl font-bold ${
                        bilanJournalier.soldeNet >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {bilanJournalier.soldeNet >= 0 ? '+' : ''}{bilanJournalier.soldeNet?.toFixed(2) || 0}h
                      </div>
                    </div>
                  </div>
                  
                  {/* Message selon le solde */}
                  {bilanJournalier.soldeNet >= 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-100/50 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm text-emerald-700 font-medium">Solde positif — Paiement extra recommandé</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-red-100/50 rounded-xl">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-700 font-medium">Solde négatif — Pas d'extra net ce jour</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Formulaire de traitement */}
          <form onSubmit={handleSubmit}>
            
            {/* Choix de l'action - Design moderne */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Action à effectuer
                {estDejaTraitee && (
                  <span className="ml-2 text-amber-600 text-xs font-normal">
                    Cette anomalie a déjà été traitée ({anomalie.statut})
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'valider', label: 'Valider', description: 'Accepter dans la fiche de paie', icon: CheckCircle, color: 'emerald' },
                  { value: 'refuser', label: 'Refuser', description: 'Heures non comptabilisées', icon: XCircle, color: 'red' },
                  { value: 'corriger', label: 'Corriger', description: 'Erreur administrative', icon: AlertTriangle, color: 'orange' },
                  { value: 'reporter', label: 'Reporter', description: 'Besoin de vérification', icon: HelpCircle, color: 'amber' },
                  ...(canPayExtra ? [{ 
                    value: 'payer_extra', 
                    label: 'Payer en Extra', 
                    description: 'Espèces hors fiche de paie',
                    icon: Banknote,
                    color: 'purple'
                  }] : []),
                  ...(canConvertToExtra ? [{ 
                    value: 'convertir_extra', 
                    label: 'Convertir en Extra', 
                    description: 'Transformer en heures "au noir"',
                    icon: TrendingUp,
                    color: 'teal'
                  }] : [])
                ].map((option) => {
                  const Icon = option.icon;
                  const isSelected = action === option.value;
                  const colorClasses = {
                    emerald: isSelected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50',
                    red: isSelected ? 'border-red-500 bg-red-50 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-red-300 hover:bg-red-50/50',
                    orange: isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20' : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50',
                    amber: isSelected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50',
                    purple: isSelected ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20' : 'border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:bg-purple-50',
                    teal: isSelected ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20' : 'border-teal-200 bg-teal-50/30 hover:border-teal-300 hover:bg-teal-50'
                  };
                  const iconColors = {
                    emerald: 'text-emerald-600',
                    red: 'text-red-600',
                    orange: 'text-orange-600',
                    amber: 'text-amber-600',
                    purple: 'text-purple-600',
                    teal: 'text-teal-600'
                  };
                  
                  return (
                    <label
                      key={option.value}
                      className={`${estDejaTraitee && action !== option.value ? 'opacity-50' : ''} cursor-pointer border-2 rounded-xl p-4 transition-all ${colorClasses[option.color]}`}
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
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white shadow-sm' : 'bg-white/50'}`}>
                          <Icon className={`w-5 h-5 ${iconColors[option.color]}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{option.label}</div>
                          <p className="text-xs text-slate-500">{option.description}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Champs spécifiques aux heures supplémentaires */}
            {action === 'valider' && anomalie.type.includes('heures_sup') && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">
                  Paramètres des heures supplémentaires
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'heures
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={heuresExtra}
                      onChange={(e) => setHeuresExtra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={montantExtra}
                      onChange={(e) => setMontantExtra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 31.25"
                    />
                  </div>
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
                      ✓ Solde positif (+{bilanJournalier.soldeNet.toFixed(2)}h) - Paiement recommandé
                    </span>
                  </div>
                )}
                
                {/* Affichage des heures à payer */}
                <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-700 mb-1">
                      {heuresExtra ? `${parseFloat(heuresExtra).toFixed(2)}h` : '0h'}
                    </div>
                    <div className="text-sm text-gray-500">à enregistrer pour paiement</div>
                  </div>
                  
                  {/* Champ heures modifiable si besoin */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1 text-center">
                      Modifier les heures si nécessaire
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={heuresExtra}
                      onChange={(e) => setHeuresExtra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
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
                      Convertir en heures extra "au noir"
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Ce pointage hors planning sera transformé en paiement extra. 
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
                      {heuresExtra ? `${parseFloat(heuresExtra).toFixed(2)}h` : (anomalie?.details?.heuresTravaillees ? `${anomalie.details.heuresTravaillees}h` : '0h')}
                    </div>
                    <div className="text-sm text-gray-500">à convertir en extra</div>
                  </div>
                  
                  {/* Champ heures modifiable si besoin */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1 text-center">
                      Modifier les heures si nécessaire
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={heuresExtra || anomalie?.details?.heuresTravaillees || ''}
                      onChange={(e) => setHeuresExtra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
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

            {/* 🆕 Formulaire "Reporter" - Demander vérification */}
            {action === 'reporter' && (
              <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2 mb-4">
                  <HelpCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-900 mb-1">
                      Reporter pour vérification
                    </h4>
                    <p className="text-xs text-amber-700">
                      Vous n'êtes pas sûr si ces heures étaient vraiment un extra demandé ? 
                      Mettez l'anomalie en attente et demandez clarification à l'employé.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Question à l'employé */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question / Note de vérification
                    </label>
                    <textarea
                      value={questionEmploye}
                      onChange={(e) => setQuestionEmploye(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Ex: Pouvez-vous confirmer si le dépassement du 23/11 était un extra demandé par le manager ?"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Suggestions : "Ces heures étaient-elles un extra validé ?", "Qui a demandé ce dépassement ?"
                    </p>
                  </div>

                  {/* Option notifier l'employé */}
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-25">
                    <input
                      type="checkbox"
                      checked={notifierEmploye}
                      onChange={(e) => setNotifierEmploye(e.target.checked)}
                      className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Send className="h-3.5 w-3.5" />
                        Notifier l'employé
                      </span>
                      <p className="text-xs text-gray-500">
                        {anomalie?.employe?.prenom || 'L\'employé'} recevra une notification pour répondre
                      </p>
                    </div>
                  </label>

                  {/* Résumé de ce qui va se passer */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600">
                      <strong>Ce qui va se passer :</strong>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        <li>L'anomalie passera en statut <span className="font-medium text-amber-600">"À vérifier"</span></li>
                        <li>Votre note sera enregistrée dans l'historique</li>
                        {notifierEmploye && <li>Une notification sera envoyée à l'employé</li>}
                        <li>Vous pourrez y revenir plus tard pour statuer</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Commentaire */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Commentaire {action && (
                  <span className="text-slate-400 font-normal">
                    ({action === 'refuser' ? 'Obligatoire' : 'Optionnel'})
                  </span>
                )}
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  required={action === 'refuser'}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all resize-none"
                  placeholder={
                    action === 'valider' ? 'Motif de validation...' :
                    action === 'refuser' ? 'Motif de refus...' :
                    action === 'corriger' ? 'Description de la correction...' :
                    'Votre commentaire...'
                  }
                />
              </div>
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

        {/* Footer fixe avec actions */}
        <div className="flex-shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action || loading}
            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2 ${
              action === 'valider' ? 'bg-emerald-600 hover:bg-emerald-700' :
              action === 'refuser' ? 'bg-red-600 hover:bg-red-700' :
              action === 'corriger' ? 'bg-orange-600 hover:bg-orange-700' :
              action === 'reporter' ? 'bg-amber-600 hover:bg-amber-700' :
              action === 'payer_extra' ? 'bg-purple-600 hover:bg-purple-700' :
              action === 'convertir_extra' ? 'bg-teal-600 hover:bg-teal-700' :
              'bg-slate-600 hover:bg-slate-700'
            }`}
            style={!action ? {} : { boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Traitement...
              </>
            ) : (
              estDejaTraitee ? 
              `Modifier → ${action === 'valider' ? 'Valider' : action === 'refuser' ? 'Refuser' : action === 'corriger' ? 'Corriger' : action}` :
              `${action === 'valider' ? '✓ Valider' : action === 'refuser' ? '✗ Refuser' : action === 'corriger' ? '🔧 Corriger' : action === 'reporter' ? '⏳ Reporter' : action === 'payer_extra' ? '💶 Créer paiement' : action === 'convertir_extra' ? '🔄 Convertir' : 'Traiter'}`
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
