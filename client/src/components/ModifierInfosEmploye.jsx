/**
 * ================================================================
 * COMPOSANT - Formulaire de modification des informations personnelles
 * ================================================================
 * Permet aux employés de modifier leurs données avec validation appropriée
 * ================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ModifierInfosEmploye = ({ employe, onUpdate, fieldsToShow = null }) => {
  const [config, setConfig] = useState({ direct: [], validation: [], verrouille: [] });
  const [editingField, setEditingField] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [mesdemandes, setMesDemandes] = useState([]);
  const [showDemandes, setShowDemandes] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  // États pour l'adresse décomposée
  const [adresseRue, setAdresseRue] = useState('');
  const [adresseCP, setAdresseCP] = useState('');
  const [adresseVille, setAdresseVille] = useState('');

  const token = localStorage.getItem('token');

  // Filtrer les champs si fieldsToShow est fourni
  const filterFields = (fields) => {
    if (!fieldsToShow) return fields;
    return fields.filter(field => fieldsToShow.includes(field.nom_champ));
  };

  // Fonction de validation du téléphone (identique au backend)
  const isValidPhoneNumber = (phone) => {
    if (!phone) return true; // Permettre les champs vides
    const cleaned = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?\d{8,15}$/;
    return phoneRegex.test(cleaned);
  };

  // Charger la configuration et les demandes
  useEffect(() => {
    loadConfig();
    loadMesDemandes();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/modifications/config/champs-modifiables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(res.data);
    } catch (error) {
      console.error('Erreur chargement config:', error);
    }
  };

  const loadMesDemandes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/modifications/mes-demandes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMesDemandes(res.data);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    }
  };

  const handleModificationDirecte = async (champ) => {
    // Validation champ vide
    if (!newValue || newValue.trim() === '') {
      setMessage({ 
        type: 'error', 
        text: '⚠️ Le champ ne peut pas être vide' 
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    // Si pas de changement
    if (newValue === employe[champ]) {
      setEditingField(null);
      return;
    }

    // Validation téléphone
    if (champ === 'telephone' && !isValidPhoneNumber(newValue)) {
      setMessage({ 
        type: 'error', 
        text: '📞 Format de téléphone invalide. Exemples : +33612345678, 06 12 34 56 78, +1(555)123-4567' 
      });
      setTimeout(() => setMessage(null), 6000);
      return;
    }

    // Validation IBAN
    if (champ === 'iban') {
      const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
      if (!ibanRegex.test(newValue)) {
        setMessage({ 
          type: 'error', 
          text: '🏦 Format IBAN invalide. Il doit commencer par 2 lettres (pays) suivies de chiffres' 
        });
        setTimeout(() => setMessage(null), 6000);
        return;
      }
    }

    // Validation adresse
    if (champ === 'adresse') {
      if (!adresseRue || !adresseCP || !adresseVille) {
        setMessage({ 
          type: 'error', 
          text: '🏠 Veuillez remplir tous les champs de l\'adresse (rue, code postal, ville)' 
        });
        setTimeout(() => setMessage(null), 5000);
        return;
      }
      if (adresseCP.length !== 5) {
        setMessage({ 
          type: 'error', 
          text: '📮 Le code postal doit contenir exactement 5 chiffres' 
        });
        setTimeout(() => setMessage(null), 5000);
        return;
      }
    }

    setLoading(true);
    try {
      await axios.put(
        `${API_BASE}/api/modifications/modification-directe`,
        { champ, nouvelle_valeur: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ type: 'success', text: '✅ Modification enregistrée avec succès !' });
      setEditingField(null);
      setNewValue('');
      
      // Callback pour mettre à jour les données du parent
      if (onUpdate) onUpdate();
      
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      console.error('❌ Erreur modification:', error);
      console.error('Réponse serveur:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Erreur lors de la modification';
      setMessage({ type: 'error', text: `❌ ${errorMsg}` });
      setTimeout(() => setMessage(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  const handleDemandeModification = async (champ) => {
    if (!newValue || newValue === employe[champ]) {
      setEditingField(null);
      return;
    }

    if (!motif.trim()) {
      setMessage({ type: 'error', text: 'Veuillez indiquer la raison de cette demande' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE}/api/modifications/demande-modification`,
        { champ, nouvelle_valeur: newValue, motif },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ type: 'success', text: '✅ Demande envoyée ! Elle sera traitée par votre manager.' });
      setEditingField(null);
      setNewValue('');
      setMotif('');
      
      loadMesDemandes(); // Recharger les demandes
      
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Erreur demande:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erreur lors de l\'envoi de la demande' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (champ, currentValue) => {
    setEditingField(champ);
    setNewValue(currentValue || '');
    setMotif('');
    
    // Si c'est l'adresse, parser les composants
    if (champ === 'adresse' && currentValue) {
      const parts = currentValue.split('\n').map(p => p.trim()).filter(p => p);
      setAdresseRue(parts[0] || '');
      setAdresseCP(parts[1]?.match(/^\d{5}/)?.[0] || '');
      setAdresseVille(parts[1]?.replace(/^\d{5}\s*/, '') || parts[1] || '');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setNewValue('');
    setMotif('');
    setAdresseRue('');
    setAdresseCP('');
    setAdresseVille('');
  };

  const getFieldLabel = (field) => {
    const labels = {
      telephone: 'Téléphone',
      adresse: 'Adresse',
      email: 'Email',
      iban: 'RIB/IBAN',
      nom: 'Nom',
      prenom: 'Prénom',
      date_naissance: 'Date de naissance',
      dateEmbauche: 'Date d\'embauche',
      categorie: 'Catégorie/Poste',
      role: 'Rôle',
      statut: 'Statut',
      salaire: 'Salaire'
    };
    return labels[field] || field;
  };

  const getStatusBadge = (statut) => {
    const styles = {
      en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
      approuve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejete: 'bg-rose-50 text-rose-700 border-rose-200'
    };
    const labels = {
      en_attente: 'En attente',
      approuve: 'Approuvée',
      rejete: 'Rejetée'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${styles[statut]}`}>
        {statut === 'en_attente' && <ClockIcon className="w-3 h-3" />}
        {statut === 'approuve' && <CheckIcon className="w-3 h-3" />}
        {statut === 'rejete' && <XMarkIcon className="w-3 h-3" />}
        {labels[statut]}
      </span>
    );
  };

  const demandesEnAttente = mesdemandes.filter(d => d.statut === 'en_attente');

  return (
    <div className="space-y-6">
      {/* Message de feedback */}
      {message && (
        <div className={`rounded-xl p-4 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300'
        } animate-in slide-in-from-top-2 duration-300`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Alerte demandes en attente */}
      {demandesEnAttente.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                {demandesEnAttente.length} demande{demandesEnAttente.length > 1 ? 's' : ''} en attente de validation
              </p>
              <button
                onClick={() => setShowDemandes(!showDemandes)}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline mt-1"
              >
                {showDemandes ? 'Masquer' : 'Voir mes demandes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des demandes en attente */}
      {showDemandes && demandesEnAttente.length > 0 && (
        <div className="space-y-2">
          {mesdemandes.slice(0, 5).map((demande) => (
            <div key={demande.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {getFieldLabel(demande.champ_modifie)}
                    </span>
                    {getStatusBadge(demande.statut)}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {demande.ancienne_valeur} → {demande.nouvelle_valeur}
                  </p>
                  {demande.commentaire_validation && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 italic">
                      {demande.commentaire_validation}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(demande.date_demande).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Champs modifiables directement */}
      {filterFields(config.direct).length > 0 && (
        <div className="space-y-4">
            {filterFields(config.direct).map((field) => {
              const fieldName = field.nom_champ;
              const isEditing = editingField === fieldName;
              const currentValue = employe[fieldName];

              return (
                <div key={fieldName}>
                  {isEditing ? (
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-primary-200 dark:border-primary-700">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        {getFieldLabel(fieldName)}
                      </label>
                      <div className="space-y-1">
                        {fieldName === 'adresse' ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                                Numéro et rue
                              </label>
                              <input
                                type="text"
                                value={adresseRue}
                                onChange={(e) => {
                                  setAdresseRue(e.target.value);
                                  setNewValue(`${e.target.value}\n${adresseCP} ${adresseVille}`.trim());
                                }}
                                className="w-full px-3 py-2.5 border border-primary-300 dark:border-primary-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
                                placeholder="123 Rue de la Paix"
                                autoFocus
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                                  Code postal
                                </label>
                                <input
                                  type="text"
                                  value={adresseCP}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                                    setAdresseCP(value);
                                    setNewValue(`${adresseRue}\n${value} ${adresseVille}`.trim());
                                  }}
                                  className="w-full px-3 py-2.5 border border-primary-300 dark:border-primary-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
                                  placeholder="75002"
                                  maxLength={5}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                                  Ville
                                </label>
                                <input
                                  type="text"
                                  value={adresseVille}
                                  onChange={(e) => {
                                    setAdresseVille(e.target.value);
                                    setNewValue(`${adresseRue}\n${adresseCP} ${e.target.value}`.trim());
                                  }}
                                  className="w-full px-3 py-2.5 border border-primary-300 dark:border-primary-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
                                  placeholder="Paris"
                                />
                              </div>
                            </div>
                          </div>
                        ) : fieldName === 'iban' ? (
                          <input
                            type="text"
                            value={newValue}
                            onChange={(e) => {
                              // Nettoyer et formatter l'IBAN (retirer espaces et tirets, majuscules)
                              let cleaned = e.target.value.toUpperCase().replace(/[\s-]/g, '');
                              setNewValue(cleaned);
                            }}
                            className="w-full px-3 py-2.5 border border-primary-300 dark:border-primary-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 font-mono tracking-wider"
                            placeholder="FR7612345678901234567890123"
                            maxLength={34}
                            autoFocus
                          />
                        ) : fieldName === 'telephone' ? (
                          <input
                            type="tel"
                            value={newValue}
                            onChange={(e) => {
                              setNewValue(e.target.value);
                              // Validation temps réel pour téléphone
                              if (e.target.value && !isValidPhoneNumber(e.target.value)) {
                                setPhoneError('Format invalide');
                              } else {
                                setPhoneError('');
                              }
                            }}
                            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 dark:bg-slate-700 dark:text-slate-100 ${
                              phoneError
                                ? 'border-rose-300 dark:border-rose-600 focus:ring-rose-500'
                                : 'border-primary-300 dark:border-primary-600 focus:ring-primary-500'
                            }`}
                            placeholder="+33 6 12 34 56 78"
                            autoFocus
                          />
                        ) : (
                          <input
                            type="text"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full px-3 py-2.5 border border-primary-300 dark:border-primary-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
                            placeholder={`Nouveau ${getFieldLabel(fieldName).toLowerCase()}`}
                            autoFocus
                          />
                        )}
                        {fieldName === 'telephone' && (
                          <div className="text-xs space-y-0.5">
                            {phoneError ? (
                              <p className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                {phoneError}
                              </p>
                            ) : (
                              <p className="text-slate-500 dark:text-slate-400">
                                📞 Formats acceptés : +33 6 12 34 56 78, 06 12 34 56 78, +1 (555) 123-4567
                              </p>
                            )}
                          </div>
                        )}
                        {fieldName === 'iban' && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            🏦 Copiez-collez votre IBAN depuis votre app bancaire (sans espaces)
                          </p>
                        )}
                        {fieldName === 'adresse' && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            🏠 Saisissez votre adresse complète dans les champs ci-dessus
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleModificationDirecte(fieldName)}
                          disabled={
                            loading || 
                            !newValue?.trim() ||
                            (fieldName === 'telephone' && phoneError) ||
                            (fieldName === 'adresse' && (!adresseRue || !adresseCP || !adresseVille || adresseCP.length !== 5)) ||
                            (fieldName === 'iban' && (newValue.length < 15 || !/^[A-Z]{2}\d{2}/.test(newValue)))
                          }
                          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <CheckIcon className="w-4 h-4" />
                          Enregistrer
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={loading}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                         onClick={() => startEdit(fieldName, currentValue)}>
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-all">
                        <PencilIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-primary-900 dark:group-hover:text-primary-100 transition-colors">
                          {getFieldLabel(fieldName)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {currentValue || <span className="text-slate-400 italic">Non renseigné</span>}
                        </p>
                        <div className="mt-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-800/30 transition-colors">
                            <PencilIcon className="w-3.5 h-3.5" /> 
                            Modifier
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Champs nécessitant validation */}
      {filterFields(config.validation).length > 0 && (
        <>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
            🚨 <span className="font-medium">Important :</span> Les modifications suivantes nécessitent une validation de votre manager.
          </div>
          <div className="space-y-4">
            {filterFields(config.validation).map((field) => {
              const fieldName = field.nom_champ;
              const isEditing = editingField === fieldName;
              const currentValue = employe[fieldName];
              const demandeEnCours = demandesEnAttente.find(d => d.champ_modifie === fieldName);

              return (
                <div key={fieldName}>
                  {isEditing ? (
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        {getFieldLabel(fieldName)}
                      </label>
                      <div className="space-y-2">
                        <input
                          type={fieldName === 'email' ? 'email' : 'text'}
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-slate-100"
                          placeholder={`Nouveau ${getFieldLabel(fieldName).toLowerCase()}`}
                        />
                        <textarea
                          value={motif}
                          onChange={(e) => setMotif(e.target.value)}
                          className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-slate-100"
                          placeholder="Raison de la modification (obligatoire)"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleDemandeModification(fieldName)}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <CheckIcon className="w-4 h-4" />
                          Demander
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={loading}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                         onClick={() => !demandeEnCours && startEdit(fieldName, currentValue)}>
                      <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/40 transition-all">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-amber-900 dark:group-hover:text-amber-100 transition-colors">
                          {getFieldLabel(fieldName)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {currentValue || <span className="text-slate-400 italic">Non renseigné</span>}
                        </p>
                        {demandeEnCours ? (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300">
                              <ClockIcon className="w-3.5 h-3.5" />
                              En attente de validation
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 group-hover:bg-amber-100 dark:group-hover:bg-amber-800/30 transition-colors">
                              <PencilIcon className="w-3.5 h-3.5" />
                              Demander une modification
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Champs verrouillés */}
      {filterFields(config.verrouille).length > 0 && (
        <>
          <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-400">
            🔒 <span className="font-medium">Informations protégées :</span> Ces champs ne peuvent être modifiés que par les administrateurs.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filterFields(config.verrouille).slice(0, 6).map((field) => {
              const fieldName = field.nom_champ;
              const value = employe[fieldName];
              const displayValue = fieldName === 'dateEmbauche' && value 
                ? new Date(value).toLocaleDateString('fr-FR')
                : value;
              
              return (
                <div key={fieldName} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
                    <LockClosedIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                      {getFieldLabel(fieldName)}
                    </span>
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium truncate">
                      {displayValue || <span className="text-slate-400 italic">Non renseigné</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ModifierInfosEmploye;
