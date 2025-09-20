// src/components/RapportHeuresEmploye.jsx

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axiosInstance";
import {
  HiCalendar,
  HiDownload,
  HiXCircle
} from "react-icons/hi";
import {
  BarChart,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const RapportHeuresEmploye = ({ employeId, onClose }) => {
  const [employe, setEmploye] = useState(null);
  const [rapportData, setRapportData] = useState(null);
  const [periode, setPeriode] = useState('mois'); // semaine, mois, trimestre
  const [moisSelectionne, setMoisSelectionne] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Couleur de charte principale
  const ACCENT = '#cf292c';


  const fetchRapportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token d'authentification manquant");
      }

      // Récupérer les données de l'employé et son rapport
      const [employeResponse, rapportResponse] = await Promise.all([
        api.get(`/admin/employes/${employeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get(`/api/stats/employe/${employeId}/rapport`, {
          params: { periode, mois: moisSelectionne },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setEmploye(employeResponse.data);
      setRapportData(rapportResponse.data);
    } catch (err) {
      console.error("Erreur lors de la récupération du rapport:", err);
      if (err.response) {
        setError(`Erreur ${err.response.status} : ${err.response.data?.message || 'Serveur'}`);
      } else {
        setError("Erreur réseau / API indisponible");
      }
    } finally {
      setLoading(false);
    }
  }, [employeId, periode, moisSelectionne]);

  // Regroupe les retards par date pour enrichir le tooltip du graphique
  const retardsByDate = React.useMemo(() => {
    if (!rapportData?.retards) return {};
    return rapportData.retards.reduce((acc, r) => {
      if (!r?.date) return acc;
      const d = r.date;
      const duree = parseInt(r.duree) || 0;
      if (!acc[d]) acc[d] = { total: 0, occurrences: 0 };
      acc[d].total += duree;
      acc[d].occurrences += 1;
      return acc;
    }, {});
  }, [rapportData]);

  // Normalise la structure heuresParJour pour supporter plusieurs conventions de noms + fallback si 0
  const heuresParJourNormalisees = React.useMemo(() => {
    if (!rapportData?.heuresParJour) return [];
    let rows = rapportData.heuresParJour.map((d, idx) => {
      const prevues = d.prevues ?? d.heuresPrevues ?? d.heuresPreveues ?? d.heuresPlanifiees ?? d.heures_planifiees ?? d.planifiees ?? d.planifiee ?? d.planifie ?? d.planned ?? d.expected ?? d.scheduled ?? d.hPrevues ?? 0;
      const travaillees = d.travaillees ?? d.heuresTravaillees ?? d.heuresRealisees ?? d.realisees ?? d.reelles ?? d.hTravaillees ?? d.worked ?? d.effectuees ?? 0;
      const jourKey = d.jour || d.date || `J${idx + 1}`;
      
      // Récupérer les retards pour ce jour - essayer plusieurs clés possibles
      const retardInfo = retardsByDate[jourKey] || 
                        retardsByDate[d.date] || 
                        retardsByDate[d.jour] || 
                        { total: 0, occurrences: 0 };
      
      return {
        key: jourKey,
        jour: jourKey,
        prevues: typeof prevues === 'string' ? parseFloat(prevues.replace(',', '.')) || 0 : prevues,
        travaillees: typeof travaillees === 'string' ? parseFloat(travaillees.replace(',', '.')) || 0 : travaillees,
        retardMinutes: retardInfo.total,
        retardCount: retardInfo.occurrences
      };
    });
    const totalPrevuesGlobal = Number(rapportData.heuresPrevues || rapportData.heuresPreveues) || 0;
    const allPrevuesZero = rows.length && rows.every(r => (r.prevues || 0) === 0);
    if (allPrevuesZero && totalPrevuesGlobal > 0) {
      const actifs = rows.filter(r => r.travaillees > 0);
      const base = actifs.length ? actifs : rows;
      const repartition = totalPrevuesGlobal / base.length;
      rows = rows.map(r => ({ ...r, prevues: +(repartition.toFixed(2)) }));
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[RapportHeuresEmploye] Fallback: Répartition uniforme des heures prévues', { totalPrevuesGlobal, repartition });
      }
    }
    return rows;
  }, [rapportData, retardsByDate]);

  const toutesPrevuesZero = React.useMemo(() => {
    if (!heuresParJourNormalisees.length) return false;
    return heuresParJourNormalisees.every(r => (r.prevues ?? 0) === 0) && heuresParJourNormalisees.some(r => (r.travaillees ?? 0) > 0);
  }, [heuresParJourNormalisees]);

  // Calcul de ponctualité basé sur les retards réels
  const tauxPonctualiteCalcule = React.useMemo(() => {
    // Si pas de données, supposer 100%
    if (!rapportData || !heuresParJourNormalisees.length) return 100;
    
    // Compter les jours travaillés (présences)
    const joursPresents = heuresParJourNormalisees.filter(r => (r.travaillees || 0) > 0);
    if (joursPresents.length === 0) return 100;
    
    // Compter les retards distincts (par jour)
    const retardsUniques = new Set();
    if (rapportData.retards) {
      rapportData.retards.forEach(retard => {
        if (retard.date && parseInt(retard.duree) > 0) {
          retardsUniques.add(retard.date);
        }
      });
    }
    
    const joursAvecRetard = retardsUniques.size;
    const joursSansRetard = Math.max(0, joursPresents.length - joursAvecRetard);
    
    // Calcul: (jours sans retard / jours présents) * 100
    return Math.round((joursSansRetard / joursPresents.length) * 100);
  }, [heuresParJourNormalisees, rapportData]);

  // Tooltip personnalisé pour afficher Ecart & Retards
  const CustomHeuresTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const prevues = payload.find(p => p.dataKey === 'prevues')?.value || 0;
    const travaillees = payload.find(p => p.dataKey === 'travaillees')?.value || 0;
    const ecart = (travaillees - prevues).toFixed(2);
    const retardInfo = retardsByDate[label];
    return (
      <div className="rounded-md border border-gray-200 bg-white/90 backdrop-blur px-3 py-2 shadow-sm text-[11px] space-y-1">
        <div className="font-semibold text-gray-800">{label}</div>
        <div className="flex justify-between gap-4"><span className="text-gray-500">Prévues</span><span className="font-medium text-gray-700">{prevues}h</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500">Travaillées</span><span className="font-medium text-gray-700">{travaillees}h</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500">Écart</span><span className={`font-medium ${ecart < 0 ? 'text-red-600' : ecart > 0 ? 'text-green-600' : 'text-gray-600'}`}>{ecart}h</span></div>
        {retardInfo && (
          <div className="flex justify-between gap-4"><span className="text-gray-500">Retards</span><span className="font-medium text-amber-600">{retardInfo.total} min ({retardInfo.occurrences})</span></div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (employeId) {
      fetchRapportData();
    }
  }, [employeId, fetchRapportData]);

  const exporterRapport = async () => {
    try {
      const token = localStorage.getItem("token");
  const response = await api.get(`/api/stats/employe/${employeId}/export`, {
        params: { periode, mois: moisSelectionne },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${employe?.prenom}_${employe?.nom}_${moisSelectionne}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Erreur lors de l'export:", err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c] mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <HiXCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-xl border border-gray-200 shadow-md max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header sobre */}
        <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-gray-50 text-gray-700 flex items-center justify-center text-sm font-semibold tracking-wide ring-1 ring-inset ring-[--accent]/20"
                 style={{ '--accent': ACCENT }}>
              {employe ? `${employe.prenom?.[0] || ''}${employe.nom?.[0] || ''}` : ''}
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 tracking-tight">
                Rapport d'heures
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[--accent] animate-pulse" style={{ '--accent': ACCENT }} />
              </h2>
              <p className="text-xs text-gray-500">
                {employe?.prenom} {employe?.nom} · {employe?.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exporterRapport}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 hover:border-[--accent] text-gray-700 hover:text-[--accent] text-xs rounded-md transition-colors bg-white focus:outline-none focus:ring-2 focus:ring-[--accent]/30"
              style={{ '--accent': ACCENT }}
            >
              <HiDownload className="w-4 h-4 text-gray-500 group-hover:text-[--accent]" />
              <span>Exporter</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[--accent]/30"
              style={{ '--accent': ACCENT }}
              aria-label="Fermer le rapport"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contrôles de période */}
  <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-200/80">
          <div className="flex flex-wrap gap-6 items-center justify-center text-sm">
            <div className="flex items-center gap-2">
              <HiCalendar className="w-4 h-4 text-gray-500" />
              <label className="text-gray-600">Période</label>
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
    className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--accent]/30 focus:border-[--accent] bg-white transition"
    style={{ '--accent': ACCENT }}
              >
                <option value="semaine">Semaine</option>
                <option value="mois">Mois</option>
                <option value="trimestre">Trimestre</option>
              </select>
            </div>
            {periode === 'mois' && (
              <div className="flex items-center gap-2">
                <label className="text-gray-600">Mois</label>
                <input
                  type="month"
                  value={moisSelectionne}
                  onChange={(e) => setMoisSelectionne(e.target.value)}
      className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--accent]/30 focus:border-[--accent] bg-white transition"
      style={{ '--accent': ACCENT }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Corps du rapport */}
        <div className="flex-1 overflow-y-auto">
          {rapportData && (
            <div className="p-6 space-y-8">
              {/* Décomposition des heures */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                {(() => {
                  const heuresPrevues = Number(rapportData.heuresPrevues || rapportData.heuresPreveues) || 0;
                  const heuresTrav = Number(rapportData.heuresTravaillees) || 0;
                  const heuresSupp = Number(rapportData.heuresSupplementaires) || 0;
                  const absJustJ = Number(rapportData.absencesJustifiees) || 0;
                  const absInjJ = Number(rapportData.absencesInjustifiees) || 0;
                  const retardCount = rapportData.nombreRetards || 0;
                  const joursPresents = (rapportData.heuresParJour || []).filter(j => (j.travaillees ?? j.heuresTravaillees ?? j.heuresRealisees ?? 0) > 0).length;
                  
                  // Pour les absences, on estime avec la moyenne des heures prévues par jour de la période
                  const totalJoursPeriode = joursPresents + absJustJ + absInjJ;
                  const avgHeuresJourPrevu = totalJoursPeriode > 0 ? +(heuresPrevues / totalJoursPeriode).toFixed(2) : 8;
                  const heuresStandardParJour = avgHeuresJourPrevu > 0 ? avgHeuresJourPrevu : 8;
                  
                  const heuresAbsJustEst = +(absJustJ * heuresStandardParJour).toFixed(2);
                  const heuresAbsInjEst = +(absInjJ * heuresStandardParJour).toFixed(2);
                  
                  // Heures manquantes = heures prévues - heures travaillées - absences justifiées estimées
                  // Les absences injustifiées SONT des heures manquantes, donc pas de soustraction
                  const heuresManquantesRaw = heuresPrevues - heuresTrav - heuresAbsJustEst;
                  const heuresManquantes = heuresManquantesRaw > 0 ? +heuresManquantesRaw.toFixed(2) : 0;
                  
                  // Calcul des pourcentages sur la base des heures prévues
                  const partTrav = heuresPrevues ? Math.min(100, (heuresTrav / heuresPrevues) * 100) : 0;
                  const partManq = heuresPrevues ? Math.min(100, (heuresManquantes / heuresPrevues) * 100) : 0;
                  const partAbsJust = heuresPrevues ? Math.min(100, (heuresAbsJustEst / heuresPrevues) * 100) : 0;
                  // Les abs. injustifiées ne sont PAS affichées séparément car déjà incluses dans les heures manquantes
                  
                  // Vérification que la somme des pourcentages ne dépasse pas 100%
                  const totalPourcentages = partTrav + partManq + partAbsJust;
                  const facteurNormalisation = totalPourcentages > 100 ? 100 / totalPourcentages : 1;
                  
                  const partTravNorm = +(partTrav * facteurNormalisation).toFixed(1);
                  const partManqNorm = +(partManq * facteurNormalisation).toFixed(1);
                  const partAbsJustNorm = +(partAbsJust * facteurNormalisation).toFixed(1);
                  return (
                    <>
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-4 rounded bg-[--accent]" style={{ '--accent': ACCENT }} />
                        Décomposition des heures
                      </h3>
                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                            <span>Répartition (sur {heuresPrevues}h prévues)</span>
                            <span className="font-medium text-gray-600">{joursPresents} j présents • {absJustJ} j congés/justifiés • {absInjJ} j abs. inj</span>
                          </div>
                          <div className="h-3 w-full rounded bg-gray-100 overflow-hidden flex ring-1 ring-inset ring-gray-200">
                            <div className="h-full bg-[--accent]/70" style={{ width: partTravNorm + '%', '--accent': ACCENT }} title={`Travaillées ${heuresTrav}h (${partTravNorm}%)`} />
                            {partManqNorm > 0 && <div className="h-full bg-amber-400/70" style={{ width: partManqNorm + '%' }} title={`Heures manquantes ${heuresManquantes}h (${partManqNorm}%)`} />}
                            {partAbsJustNorm > 0 && <div className="h-full bg-green-400/50" style={{ width: partAbsJustNorm + '%' }} title={`Abs. justifiées estimées ${heuresAbsJustEst}h (${partAbsJustNorm}%)`} />}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-gray-600">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[--accent]/70" style={{ '--accent': ACCENT }} /> Travaillées</span>
                            {partManqNorm > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400/70" /> Manquantes*</span>}
                            {partAbsJustNorm > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400/50" /> Abs. just.</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-gray-50/50">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Heures prévues</span>
                            <span className="font-semibold text-gray-800">{heuresPrevues}h</span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-gray-50/50">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Travaillées</span>
                            <span className="font-semibold text-gray-800">{heuresTrav}h</span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-gray-50/50">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Heures supp.</span>
                            <span className="font-semibold text-gray-800">{heuresSupp}h</span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-gray-50/50">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Heures manquantes</span>
                            <span className={`font-semibold ${heuresManquantes ? 'text-amber-600' : 'text-gray-800'}`}>{heuresManquantes}h</span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-green-50/40">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Abs. just. (est.)</span>
                            <span className="font-semibold text-green-700">{heuresAbsJustEst}h</span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-red-50/50">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Abs. inj. (est.)</span>
                            <span className="font-semibold text-red-600">{heuresAbsInjEst}h</span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-yellow-50/60">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Retards (nb)</span>
                            <span className="font-semibold text-yellow-700">{retardCount}</span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-blue-50/50">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Ponctualité</span>
                            <span className={`font-semibold ${tauxPonctualiteCalcule >= 90 ? 'text-green-600' : tauxPonctualiteCalcule >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {tauxPonctualiteCalcule}%
                            </span>
                          </div>
                          <div className="flex flex-col p-2 rounded border border-gray-100 bg-slate-50">
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">Moy. h / jour</span>
                            <span className="font-semibold text-gray-800">{joursPresents ? (heuresTrav / joursPresents).toFixed(2) : '0'}h</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          Estimations des heures d'absence basées sur {heuresStandardParJour}h/jour. *Heures manquantes incluent les absences injustifiées ({absInjJ}j estimées à {heuresAbsInjEst}h). Les heures supp. représentent l'excédent au-dessus du prévu. Ponctualité = % de jours présents sans retard.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Graphique heures */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-4 rounded bg-[--accent]" style={{ '--accent': ACCENT }} />
                  Heures prévues vs. travaillées
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={heuresParJourNormalisees}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="jour"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <Tooltip content={<CustomHeuresTooltip />} />
                    <Bar dataKey="prevues" fill="#e5e7eb" name="Heures prévues" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="travaillees" fill={ACCENT} name="Heures travaillées" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="inline-block w-3 h-3 rounded-sm bg-[#e5e7eb] border border-gray-300" />
                    <span>Prévues</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ACCENT }} />
                    <span>Travaillées</span>
                  </div>
                  <div className="ml-auto text-[10px] text-gray-400">Tooltip: écart & retards/jour</div>
                  {toutesPrevuesZero && (
                    <div className="w-full flex items-center gap-1 text-[10px] text-amber-600 mt-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>Heures prévues manquantes (valeurs à 0). Vérifiez les données planifiées.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RapportHeuresEmploye;
