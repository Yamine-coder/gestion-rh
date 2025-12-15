import React, { useState } from 'react';
import './ComparaisonPlanningRealite.css';
import { getCurrentDateString } from '../utils/parisTimeUtils';
import { User, Calendar, ClipboardList } from 'lucide-react';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ComparaisonPlanningRealite = () => {
  const [comparaisons, setComparaisons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtres, setFiltres] = useState({
    employeId: '',
    dateDebut: getCurrentDateString(),
    dateFin: getCurrentDateString(),
  });

  // Charger les données de comparaison
  const chargerComparaisons = async () => {
    if (!filtres.employeId) {
      setError('Veuillez sélectionner un employé');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        employeId: filtres.employeId,
        dateDebut: filtres.dateDebut,
        dateFin: filtres.dateFin
      });

      const response = await fetch(`${API_BASE}/api/comparison/planning-vs-realite?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setComparaisons(data.comparaisons || []);
    } catch (err) {
      console.error('Erreur chargement comparaisons:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir la classe CSS selon le type d'écart
  const getEcartClass = (ecart) => {
    const base = 'ecart';
    const type = ecart.type.replace('_', '-');
    const gravite = ecart.gravite;
    return `${base} ${base}--${type} ${base}--${gravite}`;
  };

  // Fonction pour obtenir l'icône selon le type d'écart
  const getEcartIcon = (type) => {
    switch (type) {
      case 'retard': return '⏰';
      case 'arrivee_anticipee': return '🌅';
      case 'heures_supplementaires': return '⏱️';
      case 'depart_anticipe': return '🏃';
      case 'absence_totale': return '❌';
      case 'presence_non_prevue': return '❓';
      default: return '⚠️';
    }
  };

  return (
    <div className="comparaison-container">
      <div className="comparaison-header">
        <h2>📊 Planning vs Réalité</h2>
        <p>Comparaison entre les horaires prévus et les pointages réels</p>
      </div>

      {/* Filtres */}
      <div className="filtres-section">
        <div className="filtre-groupe">
          <label>Employé ID:</label>
          <input
            type="number"
            value={filtres.employeId}
            onChange={(e) => setFiltres({...filtres, employeId: e.target.value})}
            placeholder="ID employé"
            min="1"
          />
        </div>
        
        <div className="filtre-groupe">
          <label>Date début:</label>
          <input
            type="date"
            value={filtres.dateDebut}
            onChange={(e) => setFiltres({...filtres, dateDebut: e.target.value})}
          />
        </div>
        
        <div className="filtre-groupe">
          <label>Date fin:</label>
          <input
            type="date"
            value={filtres.dateFin}
            onChange={(e) => setFiltres({...filtres, dateFin: e.target.value})}
          />
        </div>
        
        <button 
          className="btn-charger"
          onClick={chargerComparaisons}
          disabled={loading}
        >
          {loading ? '⏳ Chargement...' : '🔍 Analyser'}
        </button>
      </div>

      {/* Messages d'état */}
      {error && (
        <div className="message message--error">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="message message--loading">
          ⏳ Chargement des données de comparaison...
        </div>
      )}

      {/* Résultats */}
      {comparaisons.length === 0 && !loading && !error && (
        <div className="message message--empty">
          📝 Aucune donnée trouvée pour cette période
        </div>
      )}

      {comparaisons.length > 0 && (
        <div className="comparaisons-list">
          {comparaisons.map((comp, index) => (
            <div key={`${comp.date}-${comp.employeId}`} className="comparaison-card">
              <div className="comparaison-header-card">
                <h3 className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(comp.date).toLocaleDateString('fr-FR')}</h3>
                <span className="employe-badge flex items-center gap-1"><User className="w-3 h-3" /> Employé #{comp.employeId}</span>
              </div>

              <div className="comparaison-content">
                {/* Planning prévu */}
                <div className="section-planifie">
                  <h4 className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Planning Prévu</h4>
                  <div className="creneaux-list">
                    {comp.planifie.map((creneau, idx) => (
                      <div key={idx} className="creneau creneau--prevu">
                        <span className="heure-debut">{creneau.debut}</span>
                        <span className="separateur">→</span>
                        <span className="heure-fin">{creneau.fin}</span>
                      </div>
                    ))}
                  </div>
                  {comp.planifie.length === 0 && (
                    <div className="vide">Aucun planning prévu</div>
                  )}
                </div>

                {/* Pointages réels */}
                <div className="section-reel">
                  <h4>⏰ Pointages Réels</h4>
                  <div className="pointages-list">
                    {comp.reel.map((pointage, idx) => (
                      <div key={idx} className="pointage pointage--reel">
                        {pointage.arrivee && (
                          <div className="pointage-item">
                            <span className="type">📥 Arrivée:</span>
                            <span className="heure">{pointage.arrivee}</span>
                          </div>
                        )}
                        {pointage.depart && (
                          <div className="pointage-item">
                            <span className="type">📤 Départ:</span>
                            <span className="heure">{pointage.depart}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {comp.reel.length === 0 && (
                    <div className="vide">Aucun pointage</div>
                  )}
                </div>

                {/* Écarts détectés */}
                <div className="section-ecarts">
                  <h4>⚖️ Écarts Détectés</h4>
                  <div className="ecarts-list">
                    {comp.ecarts.map((ecart, idx) => (
                      <div key={idx} className={getEcartClass(ecart)}>
                        <span className="ecart-icon">{getEcartIcon(ecart.type)}</span>
                        <span className="ecart-description">{ecart.description}</span>
                        <span className="ecart-details">
                          {ecart.prevu && ecart.reel && (
                            <>Prévu: {ecart.prevu} | Réel: {ecart.reel}</>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {comp.ecarts.length === 0 && (
                    <div className="vide vide--success">
                      ✅ Aucun écart détecté - Parfait !
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComparaisonPlanningRealite;
