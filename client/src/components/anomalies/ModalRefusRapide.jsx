// client/src/components/anomalies/ModalRefusRapide.jsx
import React, { useState } from 'react';
import { X, XCircle, MessageSquare } from 'lucide-react';

/**
 * Modale rapide pour refuser une anomalie avec commentaire obligatoire
 * Version allégée par rapport à ModalTraiterAnomalie
 */
export default function ModalRefusRapide({
  anomalie,
  employeNom,
  onClose,
  onConfirm,
  loading = false
}) {
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState('');

  if (!anomalie) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const commentaireTrim = commentaire.trim();
    if (!commentaireTrim) {
      setError('Le commentaire est obligatoire pour un refus');
      return;
    }

    if (commentaireTrim.length < 10) {
      setError('Le commentaire doit contenir au moins 10 caractères');
      return;
    }

    setError('');
    onConfirm(commentaireTrim);
  };

  // Suggestions de motifs de refus
  const suggestions = [
    "Pointage non justifié",
    "Absence non autorisée", 
    "Heures supplémentaires non approuvées",
    "Erreur de saisie",
    "Planning non respecté",
    "Justificatif manquant"
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Refuser l'anomalie</h3>
              <p className="text-sm text-gray-600">
                {employeNom} - {new Date(anomalie.date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Détails de l'anomalie */}
        <div className="p-4 bg-gray-50 border-b">
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-medium">Type :</span> {anomalie.type || 'Anomalie'}
          </p>
          {anomalie.description && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Description :</span> {anomalie.description}
            </p>
          )}
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-4">
          
          {/* Commentaire obligatoire */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motif du refus <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={commentaire}
                onChange={(e) => {
                  setCommentaire(e.target.value);
                  if (error) setError('');
                }}
                rows={4}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Expliquez pourquoi cette anomalie est refusée..."
              />
            </div>
            
            {/* Suggestions */}
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Suggestions :</p>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCommentaire(suggestion)}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !commentaire.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Refus...
                </div>
              ) : (
                'Refuser l\'anomalie'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
