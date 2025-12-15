// client/src/components/anomalies/AnomalieWorkflow.jsx
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare, Upload, TrendingUp } from 'lucide-react';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * WORKFLOW AVANCÉ DE GESTION DES ANOMALIES
 * Inspiré de Workday, BambooHR, SAP SuccessFactors
 * 
 * Fonctionnalités:
 * 1. Auto-validation intelligente
 * 2. Demande de justification
 * 3. Escalade automatique
 * 4. Score de ponctualité
 * 5. Détection de patterns
 */

// Configuration du workflow
const WORKFLOW_CONFIG = {
  AUTO_VALIDATION: {
    retard_simple: { seuil_minutes: 10, auto_approve: true },
    heures_sup: { seuil_heures: 1, auto_approve: true },
    avec_justif: { auto_approve: true }
  },
  
  ESCALADE: {
    delai_manager: 24, // heures
    delai_rh: 48 // heures
  },
  
  SCORING: {
    retard_simple: -2,
    retard_modere: -5,
    retard_critique: -15,
    presence_anticipee: +1,
    sans_retard_30j: +5
  }
};

/**
 * Hook pour calculer le score de ponctualité d'un employé
 */
export function useEmployeScore(employeId) {
  const [score, setScore] = useState(100);
  const [historique, setHistorique] = useState([]);
  const [tendance, setTendance] = useState('stable'); // amelioration, degradation, stable

  useEffect(() => {
    loadScore();
  }, [employeId]);

  const loadScore = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/anomalies/score/${employeId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setScore(data.score);
        setHistorique(data.historique);
        setTendance(data.tendance);
      }
    } catch (error) {
      console.error('Erreur chargement score:', error);
    }
  };

  const getScoreColor = () => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Correct';
    if (score >= 50) return 'À surveiller';
    return 'Problématique';
  };

  return { score, historique, tendance, getScoreColor, getScoreLabel, reload: loadScore };
}

/**
 * Hook pour détecter les patterns d'anomalies
 */
export function usePatternDetection(employeId) {
  const [patterns, setPatterns] = useState([]);

  useEffect(() => {
    detectPatterns();
  }, [employeId]);

  const detectPatterns = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/anomalies/patterns/${employeId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPatterns(data.patterns);
      }
    } catch (error) {
      console.error('Erreur détection patterns:', error);
    }
  };

  return { patterns, reload: detectPatterns };
}

/**
 * Composant d'affichage du score employé
 */
export function EmployeScoreBadge({ employeId, compact = false }) {
  const { score, getScoreColor, getScoreLabel } = useEmployeScore(employeId);

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs ${getScoreColor()}`}>
        <TrendingUp className="h-3 w-3" />
        <span className="font-medium">{score}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
      score >= 90 ? 'bg-green-50 border-green-200' :
      score >= 70 ? 'bg-yellow-50 border-yellow-200' :
      'bg-red-50 border-red-200'
    }`}>
      <TrendingUp className={`h-4 w-4 ${getScoreColor()}`} />
      <div>
        <div className={`font-bold ${getScoreColor()}`}>{score}/100</div>
        <div className="text-xs text-gray-600">{getScoreLabel()}</div>
      </div>
    </div>
  );
}

/**
 * Composant d'alerte pour les patterns détectés
 */
export function PatternAlerts({ employeId }) {
  const { patterns } = usePatternDetection(employeId);

  if (patterns.length === 0) return null;

  return (
    <div className="space-y-2">
      {patterns.map((pattern, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-2 p-3 rounded-lg border ${
            pattern.gravite === 'critique' ? 'bg-red-50 border-red-200' :
            pattern.gravite === 'attention' ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }`}
        >
          <AlertTriangle className={`h-4 w-4 mt-0.5 ${
            pattern.gravite === 'critique' ? 'text-red-600' :
            pattern.gravite === 'attention' ? 'text-yellow-600' :
            'text-blue-600'
          }`} />
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900">{pattern.titre}</div>
            <div className="text-xs text-gray-600 mt-0.5">{pattern.description}</div>
            {pattern.actions && (
              <div className="flex gap-2 mt-2">
                {pattern.actions.map((action, i) => (
                  <button
                    key={i}
                    className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Composant principal: Workflow complet pour une anomalie
 */
export function AnomalieWorkflowCard({ anomalie, onComplete }) {
  const [etape, setEtape] = useState('evaluation'); // evaluation, justification, validation, complete
  const [justification, setJustification] = useState('');
  const [fichiers, setFichiers] = useState([]);
  const [autoValidation, setAutoValidation] = useState(null);

  // Vérifier l'éligibilité à l'auto-validation
  useEffect(() => {
    checkAutoValidation();
  }, [anomalie]);

  const checkAutoValidation = () => {
    const config = WORKFLOW_CONFIG.AUTO_VALIDATION;
    
    if (anomalie.type === 'retard_simple' && anomalie.ecartMinutes < 10) {
      setAutoValidation({
        eligible: true,
        raison: `Retard mineur (${anomalie.ecartMinutes}min) - Auto-validation possible`
      });
    } else if (anomalie.justificationFournie && anomalie.justificationValidee) {
      setAutoValidation({
        eligible: true,
        raison: 'Justification valide fournie - Auto-validation possible'
      });
    } else if (anomalie.type.includes('heures_sup') && anomalie.heuresExtra < 1) {
      setAutoValidation({
        eligible: true,
        raison: 'Heures supplémentaires mineures - Auto-validation possible'
      });
    } else {
      setAutoValidation({
        eligible: false,
        raison: 'Validation manuelle requise'
      });
    }
  };

  const handleAutoValidation = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/anomalies/${anomalie.id}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'valider',
          commentaire: `Auto-validation: ${autoValidation.raison}`,
          auto_validated: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEtape('complete');
        onComplete?.(result.anomalie);
      }
    } catch (error) {
      console.error('Erreur auto-validation:', error);
    }
  };

  const handleDemanderJustification = () => {
    setEtape('justification');
    // Envoyer notification à l'employé
    fetch(`${API_BASE}/api/anomalies/${anomalie.id}/demander-justification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  };

  const renderEvaluation = () => (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">Évaluation de l'anomalie</h4>
          <p className="text-sm text-gray-600 mt-1">{anomalie.description}</p>
        </div>
      </div>

      {/* Auto-validation */}
      {autoValidation?.eligible && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Auto-validation possible</span>
            </div>
          </div>
          <p className="text-sm text-green-700 mb-3">{autoValidation.raison}</p>
          <button
            onClick={handleAutoValidation}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Valider automatiquement
          </button>
        </div>
      )}

      {/* Actions manuelles */}
      <div className="space-y-2">
        <button
          onClick={handleDemanderJustification}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium"
        >
          <MessageSquare className="h-4 w-4" />
          Demander une justification
        </button>

        <button
          onClick={() => setEtape('validation')}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          Traiter manuellement
        </button>
      </div>
    </div>
  );

  const renderJustification = () => (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">Demande de justification envoyée</h4>
        </div>
        <p className="text-sm text-blue-700">
          L'employé a 48h pour fournir une justification. Vous serez notifié.
        </p>
      </div>

      {/* Si l'employé a déjà répondu */}
      {anomalie.justificationFournie && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Justification fournie</h4>
          <p className="text-sm text-gray-700">{anomalie.justificationTexte}</p>
          
          {fichiers.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-gray-600">Pièces jointes:</div>
              {fichiers.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <Upload className="h-4 w-4" />
                  {f.nom}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAutoValidation}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Accepter
            </button>
            <button
              onClick={() => setEtape('validation')}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Refuser
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* En-tête avec score */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{anomalie.employeNom}</h3>
          <p className="text-sm text-gray-500">{new Date(anomalie.date).toLocaleDateString()}</p>
        </div>
        <EmployeScoreBadge employeId={anomalie.employe_id} />
      </div>

      {/* Alertes de patterns */}
      <PatternAlerts employeId={anomalie.employe_id} />

      {/* Workflow */}
      <div className="mt-6">
        {etape === 'evaluation' && renderEvaluation()}
        {etape === 'justification' && renderJustification()}
        {etape === 'complete' && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900">Anomalie traitée</h4>
            <p className="text-sm text-gray-600">L'employé a été notifié de la décision</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnomalieWorkflowCard;
