import React, { useState, useEffect } from 'react';
import { toLocalDateString } from '../utils/parisTimeUtils';

const ModalCreationRapidePlanning = ({ isOpen, onClose, onSave, employees, formatEmployeeName }) => {
  // État pour les jours de la semaine
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  
  // Templates de planning prédéfinis
  const templates = {
    'standard': {
      nom: 'Standard (9h-17h)',
      description: 'Horaires classiques de bureau',
      horaires: jours.map(jour => ({
        jour,
        active: jour !== 'Samedi' && jour !== 'Dimanche',
        creneaux: [{ debut: '09:00', fin: '17:00' }]
      }))
    },
    'matinal': {
      nom: 'Équipe matinale (6h-14h)',
      description: 'Horaires de matin',
      horaires: jours.map(jour => ({
        jour,
        active: jour !== 'Samedi' && jour !== 'Dimanche',
        creneaux: [{ debut: '06:00', fin: '14:00' }]
      }))
    },
    'tardif': {
      nom: 'Équipe tardive (14h-22h)',
      description: 'Horaires d\'après-midi/soir',
      horaires: jours.map(jour => ({
        jour,
        active: jour !== 'Samedi' && jour !== 'Dimanche',
        creneaux: [{ debut: '14:00', fin: '22:00' }]
      }))
    },
    'coupe': {
      nom: 'Journée coupée',
      description: 'Matin et après-midi avec pause déjeuner',
      horaires: jours.map(jour => ({
        jour,
        active: jour !== 'Samedi' && jour !== 'Dimanche',
        creneaux: [
          { debut: '08:00', fin: '12:00' },
          { debut: '14:00', fin: '18:00' }
        ]
      }))
    },
    'weekend': {
      nom: 'Week-end uniquement',
      description: 'Travail le week-end',
      horaires: jours.map(jour => ({
        jour,
        active: jour === 'Samedi' || jour === 'Dimanche',
        creneaux: [{ debut: '09:00', fin: '17:00' }]
      }))
    }
  };
  
  // État pour la date de début (lundi de la semaine)
  const [dateDebut, setDateDebut] = useState('');
  
  // État pour l'employé sélectionné
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // État pour le template sélectionné
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // État pour les horaires par jour
  const [horaires, setHoraires] = useState(
    jours.map(jour => ({
      jour,
      active: jour !== 'Samedi' && jour !== 'Dimanche', // Par défaut, on travaille en semaine
      creneaux: [{ debut: '09:00', fin: '17:00' }]
    }))
  );
  
  // État pour les messages d'erreur
  const [error, setError] = useState('');
  
  // État pour les warnings
  const [warnings, setWarnings] = useState([]);
  
  // État pour le chargement
  const [loading, setLoading] = useState(false);

  // Définir la date de début au lundi de la semaine courante
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // si dimanche, on recule de 6 jours, sinon on calcule la différence avec lundi
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    
    setDateDebut(toLocalDateString(monday));
  }, []);

  // Fonction pour vérifier les chevauchements entre créneaux
  const checkOverlap = (creneau1, creneau2) => {
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1 = timeToMinutes(creneau1.debut);
    const end1 = timeToMinutes(creneau1.fin);
    const start2 = timeToMinutes(creneau2.debut);
    const end2 = timeToMinutes(creneau2.fin);
    
    return !(end1 <= start2 || end2 <= start1);
  };

  // Fonction utilitaire pour convertir l'heure en minutes
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Fonction pour valider tous les créneaux d'un jour
  const validateCreneauxJour = (creneaux) => {
    const erreurs = [];
    const warnings = [];
    
    for (let i = 0; i < creneaux.length; i++) {
      const creneau = creneaux[i];
      
      // 🌙 RESTAURANT : Autoriser shifts de nuit, rejeter seulement durée nulle
      if (creneau.debut === creneau.fin) {
        erreurs.push(`Le créneau ${i + 1} a une durée nulle`);
      }
      
      // Vérifier les chevauchements avec les autres créneaux
      for (let j = i + 1; j < creneaux.length; j++) {
        if (checkOverlap(creneau, creneaux[j])) {
          erreurs.push(`Les créneaux ${i + 1} et ${j + 1} se chevauchent`);
        }
      }
      
      // Avertissement pour les créneaux très courts (< 30 min)
      let dureeMinutes = timeToMinutes(creneau.fin) - timeToMinutes(creneau.debut);
      // 🌙 RESTAURANT : Gérer les shifts de nuit
      if (dureeMinutes < 0) dureeMinutes += 24 * 60;
      const duree = dureeMinutes / 60;
      
      if (duree < 0.5 && duree > 0) {
        warnings.push(`Le créneau ${i + 1} est très court (${Math.round(duree * 60)} minutes)`);
      }
      
      // Avertissement pour les créneaux très longs (> 12h)
      if (duree > 12) {
        warnings.push(`Le créneau ${i + 1} est très long (${duree.toFixed(1)} heures)`);
      }
    }
    
    return { erreurs, warnings };
  };

  // Fonction pour appliquer un template
  const appliquerTemplate = (templateKey) => {
    if (templates[templateKey]) {
      setHoraires([...templates[templateKey].horaires]);
      setSelectedTemplate(templateKey);
      setError('');
      setWarnings([]);
    }
  };

  // Fonction pour calculer le total d'heures d'un jour
  const calculerHeuresJour = (creneaux) => {
    return creneaux.reduce((total, creneau) => {
      const timeToMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const debut = timeToMinutes(creneau.debut);
      const fin = timeToMinutes(creneau.fin);
      
      // 🌙 RESTAURANT : Gérer les shifts de nuit (19:00 → 00:30)
      let duree = fin - debut;
      if (duree < 0) duree += 24 * 60; // Franchit minuit
      
      return total + duree;
    }, 0);
  };

  // Fonction pour formater les minutes en heures:minutes
  const formatDuree = (minutes) => {
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${heures}h${mins.toString().padStart(2, '0')}`;
  };

  // Fonction pour créer un aperçu visuel des créneaux (timeline)
  const createTimelineView = (creneaux) => {
    if (!creneaux || creneaux.length === 0) return null;
    
    const heureDebut = 6; // 6h du matin
    const heureFin = 22; // 22h le soir
    const totalHeures = heureFin - heureDebut;
    
    return (
      <div className="relative h-6 bg-gray-100 rounded-full mt-2">
        {creneaux.map((creneau, index) => {
          const debut = timeToMinutes(creneau.debut);
          const fin = timeToMinutes(creneau.fin);
          const debutHeure = debut / 60;
          const finHeure = fin / 60;
          
          if (debutHeure < heureDebut || finHeure > heureFin) return null;
          
          const left = ((debutHeure - heureDebut) / totalHeures) * 100;
          const width = ((finHeure - debutHeure) / totalHeures) * 100;
          
          return (
            <div
              key={index}
              className="absolute h-4 bg-blue-500 rounded-full top-1"
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              title={`${creneau.debut} - ${creneau.fin}`}
            />
          );
        })}
        {/* Marqueurs d'heures */}
        <div className="absolute top-0 left-0 w-full h-full flex justify-between text-xs text-gray-400 pt-6">
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>22h</span>
        </div>
      </div>
    );
  };

  // Ajouter un créneau pour un jour spécifique
  const ajouterCreneau = (jourIndex) => {
    const nouveauxHoraires = [...horaires];
    nouveauxHoraires[jourIndex].creneaux.push({ debut: '09:00', fin: '17:00' });
    setHoraires(nouveauxHoraires);
  };

  // Supprimer un créneau
  const supprimerCreneau = (jourIndex, creneauIndex) => {
    const nouveauxHoraires = [...horaires];
    nouveauxHoraires[jourIndex].creneaux.splice(creneauIndex, 1);
    setHoraires(nouveauxHoraires);
  };

  // Modifier un créneau
  const modifierCreneau = (jourIndex, creneauIndex, field, value) => {
    const nouveauxHoraires = [...horaires];
    nouveauxHoraires[jourIndex].creneaux[creneauIndex][field] = value;
    setHoraires(nouveauxHoraires);
    
    // Validation en temps réel
    const { erreurs, warnings } = validateCreneauxJour(nouveauxHoraires[jourIndex].creneaux);
    if (erreurs.length > 0) {
      setError(`${nouveauxHoraires[jourIndex].jour}: ${erreurs[0]}`);
    } else {
      setError('');
    }
    
    if (warnings.length > 0) {
      setWarnings([`${nouveauxHoraires[jourIndex].jour}: ${warnings[0]}`]);
    } else {
      setWarnings([]);
    }
  };

  // Activer/désactiver un jour
  const toggleJour = (jourIndex) => {
    const nouveauxHoraires = [...horaires];
    nouveauxHoraires[jourIndex].active = !nouveauxHoraires[jourIndex].active;
    setHoraires(nouveauxHoraires);
  };

  // Fonction pour copier les horaires d'un jour à tous les jours actifs suivants
  const copierHorairesAuxJoursSuivants = (jourIndex) => {
    const nouveauxHoraires = [...horaires];
    const creneauxACopier = [...nouveauxHoraires[jourIndex].creneaux];
    
    for (let i = jourIndex + 1; i < nouveauxHoraires.length; i++) {
      if (nouveauxHoraires[i].active) {
        nouveauxHoraires[i].creneaux = creneauxACopier.map(creneau => ({ ...creneau }));
      }
    }
    
    setHoraires(nouveauxHoraires);
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!selectedEmployee) {
      setError('Veuillez sélectionner un employé.');
      return;
    }
    
    if (!dateDebut) {
      setError('Veuillez sélectionner une date de début.');
      return;
    }
    
    // Vérifier qu'au moins un jour est actif avec au moins un créneau
    const auMoinsUnJourActif = horaires.some(jour => jour.active && jour.creneaux.length > 0);
    if (!auMoinsUnJourActif) {
      setError('Veuillez activer au moins un jour avec un créneau horaire.');
      return;
    }
    
    // Vérifier la validité des créneaux (fin > début)
    let creneauxInvalides = false;
    horaires.forEach(jour => {
      if (jour.active) {
        jour.creneaux.forEach(creneau => {
          if (creneau.debut >= creneau.fin) {
            creneauxInvalides = true;
          }
        });
      }
    });
    
    if (creneauxInvalides) {
      setError('Certains créneaux horaires sont invalides. L\'heure de fin doit être postérieure à l\'heure de début.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Préparation des données pour l'API
      const shiftsACreer = [];
      
      // Pour chaque jour actif
      horaires.forEach((jour, index) => {
        if (jour.active && jour.creneaux.length > 0) {
          // Calculer la date pour ce jour
          const dateJour = new Date(dateDebut);
          dateJour.setDate(dateJour.getDate() + index);
          const dateStr = toLocalDateString(dateJour);
          
          // Créer un shift avec tous les segments (créneaux)
          const shift = {
            employeId: parseInt(selectedEmployee),
            date: dateStr,
            type: 'travail',
            segments: jour.creneaux.map(creneau => ({
              start: creneau.debut,
              end: creneau.fin,
              commentaire: '',
              aValider: false,
              isExtra: false
            }))
          };
          
          shiftsACreer.push(shift);
        }
      });
      
      // Envoyer à l'API
      await onSave(shiftsACreer);
      
      // Réinitialiser le formulaire
      setSelectedEmployee('');
      setHoraires(jours.map(jour => ({
        jour,
        active: jour !== 'Samedi' && jour !== 'Dimanche',
        creneaux: [{ debut: '09:00', fin: '17:00' }]
      })));
      
      // Fermer le modal
      onClose();
    } catch (err) {
      setError(`Erreur lors de la création du planning : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-600">Création Rapide de Planning Hebdomadaire</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {warnings[0]}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Section Templates */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">📋 Templates de planning</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => appliquerTemplate(key)}
                  className={`p-3 text-left rounded-md border transition-colors ${
                    selectedTemplate === key 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{template.nom}</div>
                  <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
              <select 
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                required
              >
                <option value="">Sélectionner un employé</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {formatEmployeeName(emp)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semaine commençant le (lundi)</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="border rounded-md p-4 mb-6">
            <h3 className="font-medium mb-3">Horaires de la semaine</h3>
            
            {horaires.map((jour, jourIndex) => (
              <div key={jour.jour} className={`mb-6 pb-4 ${jourIndex < horaires.length - 1 ? 'border-b' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`jour-${jourIndex}`}
                      checked={jour.active}
                      onChange={() => toggleJour(jourIndex)}
                      className="mr-2 h-4 w-4 accent-blue-600"
                    />
                    <label htmlFor={`jour-${jourIndex}`} className="font-medium">
                      {jour.jour}
                    </label>
                    {jour.active && jour.creneaux.length > 0 && (
                      <span className="ml-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {formatDuree(calculerHeuresJour(jour.creneaux))}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {jour.active && jourIndex < horaires.length - 1 && (
                      <button
                        type="button"
                        onClick={() => copierHorairesAuxJoursSuivants(jourIndex)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                      >
                        Appliquer aux jours suivants
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Timeline visuelle */}
                {jour.active && jour.creneaux.length > 0 && (
                  <div className="mb-3">
                    {createTimelineView(jour.creneaux)}
                  </div>
                )}
                
                {jour.active && jour.creneaux.map((creneau, creneauIndex) => {
                  let dureeMinutes = timeToMinutes(creneau.fin) - timeToMinutes(creneau.debut);
                  // 🌙 RESTAURANT : Gérer les shifts de nuit
                  if (dureeMinutes < 0) dureeMinutes += 24 * 60;
                  const dureeValide = dureeMinutes > 0;
                  const { erreurs } = validateCreneauxJour(jour.creneaux);
                  const hasError = erreurs.some(err => err.includes(`créneau ${creneauIndex + 1}`));
                  
                  return (
                    <div key={creneauIndex} className={`flex items-center mb-2 space-x-2 p-2 rounded-md ${
                      hasError ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">De</span>
                        <input
                          type="time"
                          value={creneau.debut}
                          onChange={(e) => modifierCreneau(jourIndex, creneauIndex, 'debut', e.target.value)}
                          className={`border rounded px-2 py-1 w-24 ${hasError ? 'border-red-300' : 'border-gray-300'}`}
                        />
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">à</span>
                        <input
                          type="time"
                          value={creneau.fin}
                          onChange={(e) => modifierCreneau(jourIndex, creneauIndex, 'fin', e.target.value)}
                          className={`border rounded px-2 py-1 w-24 ${hasError ? 'border-red-300' : 'border-gray-300'}`}
                        />
                      </div>
                      
                      {dureeValide && (
                        <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {formatDuree(dureeMinutes)}
                        </div>
                      )}
                      
                      <div className="flex space-x-1">
                        {creneauIndex === jour.creneaux.length - 1 && (
                          <button
                            type="button"
                            onClick={() => ajouterCreneau(jourIndex)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Ajouter un créneau"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        )}
                        
                        {jour.creneaux.length > 1 && (
                          <button
                            type="button"
                            onClick={() => supprimerCreneau(jourIndex, creneauIndex)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Supprimer ce créneau"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {jour.active && jour.creneaux.length === 0 && (
                  <button
                    type="button"
                    onClick={() => ajouterCreneau(jourIndex)}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajouter un créneau
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Résumé des heures totales */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">📊 Résumé hebdomadaire</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Jours actifs:</span>
                <span className="ml-2 font-medium">
                  {horaires.filter(jour => jour.active).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total créneaux:</span>
                <span className="ml-2 font-medium">
                  {horaires.reduce((total, jour) => 
                    total + (jour.active ? jour.creneaux.length : 0), 0
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Heures/semaine:</span>
                <span className="ml-2 font-medium text-blue-600">
                  {formatDuree(
                    horaires.reduce((total, jour) => 
                      total + (jour.active ? calculerHeuresJour(jour.creneaux) : 0), 0
                    )
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Moyenne/jour:</span>
                <span className="ml-2 font-medium">
                  {(() => {
                    const joursActifs = horaires.filter(jour => jour.active).length;
                    const totalMinutes = horaires.reduce((total, jour) => 
                      total + (jour.active ? calculerHeuresJour(jour.creneaux) : 0), 0
                    );
                    return joursActifs > 0 ? formatDuree(Math.round(totalMinutes / joursActifs)) : '0h00';
                  })()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Création en cours...
                </>
              ) : (
                "Créer le planning"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCreationRapidePlanning;
