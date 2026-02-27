import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO, addDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { API_BASE } from '../config/api';
import {
  Users, CalendarDays, CalendarRange, Repeat, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Search, Plus, X, ArrowRight,
  SlidersHorizontal, Copy, AlertTriangle, Trash2,
  Loader2
} from 'lucide-react';

/**
 * Création rapide de plannings — Wizard 3 étapes
 * Étape 1: Employés  ·  Étape 2: Planning  ·  Étape 3: Confirmation
 */
const CreationRapideForm = ({ employes, onClose, onSuccess }) => {
  // Onglet actif: 'create' | 'delete'
  const [tab, setTab] = useState('create');

  // --- Wizard step (1, 2, 3) ---
  const [step, setStep] = useState(1);

  // --- Étape 1: Employés ---
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');

  // --- Étape 2: Planning ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [indefini, setIndefini] = useState(false);
  const [monthsCount, setMonthsCount] = useState(6);
  const [conflictMode, setConflictMode] = useState('skip');
  const [creneaux, setCreneaux] = useState([{ heureDebut: '09:00', heureFin: '17:00' }]);
  const [creneauxParJour, setCreneauxParJour] = useState(false);
  const [creneauxJours, setCreneauxJours] = useState({
    lundi: [{ heureDebut: '09:00', heureFin: '17:00' }],
    mardi: [{ heureDebut: '09:00', heureFin: '17:00' }],
    mercredi: [{ heureDebut: '09:00', heureFin: '17:00' }],
    jeudi: [{ heureDebut: '09:00', heureFin: '17:00' }],
    vendredi: [{ heureDebut: '09:00', heureFin: '17:00' }],
    samedi: [{ heureDebut: '09:00', heureFin: '17:00' }],
    dimanche: [{ heureDebut: '09:00', heureFin: '17:00' }],
  });
  const [jours, setJours] = useState({
    lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false
  });

  // --- Étape 3: Résultat ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creationResult, setCreationResult] = useState(null);
  const [lastCreationRange, setLastCreationRange] = useState(null);

  // --- Onglet Suppression ---
  const [delStartDate, setDelStartDate] = useState('');
  const [delEndDate, setDelEndDate] = useState('');
  const [delSelectedEmployees, setDelSelectedEmployees] = useState([]);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState(null);
  const [delSuccess, setDelSuccess] = useState(null);
  const [wipeConfirm, setWipeConfirm] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);
  const [wipeMsg, setWipeMsg] = useState(null);
  const [wipeSelectedEmployees, setWipeSelectedEmployees] = useState([]);
  const [wipeSuccess, setWipeSuccess] = useState(false);
  const [autoCloseAfterAction, setAutoCloseAfterAction] = useState(true);
  const phrase = 'SUPPRIMER TOUS';

  const jourMap = { 0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' };
  const jourLabels = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };

  // --- Persistence légère ---
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('creationRapideConfig') || 'null');
      if (saved) {
        if (saved.jours) setJours(saved.jours);
        if (saved.creneaux) setCreneaux(saved.creneaux);
      }
    } catch(e) {/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    localStorage.setItem('creationRapideConfig', JSON.stringify({ jours, creneaux }));
  }, [jours, creneaux]);

  // --- Filtrage employés ---
  const filteredEmployes = useMemo(() => {
    if (!empSearch.trim()) return employes;
    const q = empSearch.toLowerCase();
    return employes.filter(e => `${e.prenom} ${e.nom}`.toLowerCase().includes(q));
  }, [employes, empSearch]);

  // --- Gestion créneaux ---
  const ajouterCreneau = () => setCreneaux([...creneaux, { heureDebut: '09:00', heureFin: '17:00' }]);
  const supprimerCreneau = (index) => { if (creneaux.length > 1) setCreneaux(creneaux.filter((_, i) => i !== index)); };
  const modifierCreneau = (index, field, value) => { const copy = [...creneaux]; copy[index][field] = value; setCreneaux(copy); };

  const ajouterCreneauJour = (jour) => setCreneauxJours(prev => ({ ...prev, [jour]: [...prev[jour], { heureDebut: '09:00', heureFin: '17:00' }] }));
  const supprimerCreneauJour = (jour, index) => setCreneauxJours(prev => ({ ...prev, [jour]: prev[jour].filter((_, i) => i !== index) }));
  const modifierCreneauJour = (jour, index, field, value) => setCreneauxJours(prev => {
    const copy = [...prev[jour]];
    copy[index] = { ...copy[index], [field]: value };
    return { ...prev, [jour]: copy };
  });
  const copierCreneauxVers = (jourSource) => {
    setCreneauxJours(prev => {
      const copy = { ...prev };
      Object.keys(jours).forEach(j => { if (jours[j] && j !== jourSource) copy[j] = JSON.parse(JSON.stringify(prev[jourSource])); });
      return copy;
    });
  };
  const activerCreneauxParJour = () => {
    const init = {};
    Object.keys(jours).forEach(j => { init[j] = JSON.parse(JSON.stringify(creneaux)); });
    setCreneauxJours(init);
    setCreneauxParJour(true);
  };

  const validerCreneaux = () => {
    const validerListe = (liste, label) => {
      for (let i = 0; i < liste.length; i++) {
        const c1 = liste[i];
        if (c1.heureDebut === c1.heureFin) return `${label}Créneau ${i + 1} a une durée nulle`;
        for (let j = i + 1; j < liste.length; j++) {
          const c2 = liste[j];
          if (!(c1.heureFin <= c2.heureDebut || c2.heureFin <= c1.heureDebut)) return `${label}Chevauchement créneaux ${i + 1} et ${j + 1}`;
        }
      }
      return null;
    };
    if (creneauxParJour) {
      for (const [jour, actif] of Object.entries(jours)) {
        if (!actif) continue;
        const err = validerListe(creneauxJours[jour], `${jour.charAt(0).toUpperCase() + jour.slice(1)}: `);
        if (err) return err;
      }
      return null;
    }
    return validerListe(creneaux, '');
  };
  const getCreneauxPourJour = (jourName) => creneauxParJour ? (creneauxJours[jourName] || creneaux) : creneaux;

  // --- Employé toggles ---
  const handleToggleEmployee = (id) => setSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAllEmployees = () => setSelectedEmployees(selectedEmployees.length === employes.length ? [] : employes.map(e => e.id));
  const handleToggleJour = (jour) => setJours(prev => ({ ...prev, [jour]: !prev[jour] }));

  // --- Résumé prévisionnel ---
  const resume = useMemo(() => {
    if (!startDate) return null;
    let d1 = parseISO(startDate);
    let d2;
    if (indefini) { d2 = addDays(addMonths(d1, monthsCount), -1); }
    else if (endDate) { d2 = parseISO(endDate); }
    else return null;
    if (isNaN(d1) || isNaN(d2) || d1 > d2) return null;
    let totalJourValides = 0;
    for (let d = d1; d <= d2; d = addDays(d, 1)) {
      if (jours[jourMap[d.getDay()]]) totalJourValides++;
    }
    return { totalJourValides, totalPlannings: totalJourValides * selectedEmployees.length };
  }, [startDate, endDate, indefini, monthsCount, jours, selectedEmployees, jourMap]);

  // --- Validation par étape ---
  const validerStep1 = () => {
    if (selectedEmployees.length === 0) { setError('Sélectionnez au moins un employé'); return false; }
    setError(null); return true;
  };
  const validerStep2 = () => {
    if (!startDate) { setError('Sélectionnez une date de début'); return false; }
    if (!indefini && !endDate) { setError('Sélectionnez une date de fin'); return false; }
    if (!indefini && endDate && parseISO(startDate) > parseISO(endDate)) { setError('La date de début doit être avant la fin'); return false; }
    if (!Object.values(jours).some(v => v)) { setError('Sélectionnez au moins un jour'); return false; }
    const errC = validerCreneaux();
    if (errC) { setError(errC); return false; }
    setError(null); return true;
  };

  const allerSuivant = () => {
    if (step === 1 && validerStep1()) setStep(2);
    else if (step === 2 && validerStep2()) setStep(3);
  };
  const allerPrecedent = () => { setError(null); setStep(Math.max(1, step - 1)); };

  // --- Création ---
  const creerPlannings = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      if (!token) { setError('Session expirée'); setLoading(false); return; }

      let formattedDate = null; let rangeInfo = null;
      if (indefini) {
        const daysMap = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
        const daysOfWeek = Object.entries(jours).filter(([, v]) => v).map(([k]) => daysMap[k]);
        let body;
        if (creneauxParJour) {
          const segmentsByDay = {};
          for (const [jourName, actif] of Object.entries(jours)) {
            if (!actif) continue;
            segmentsByDay[daysMap[jourName]] = creneauxJours[jourName].map(c => ({ start: c.heureDebut, end: c.heureFin }));
          }
          body = { employeIds: selectedEmployees, startDate, monthsCount, daysOfWeek, segmentsByDay, mode: conflictMode };
        } else {
          const segments = creneaux.map(c => ({ start: c.heureDebut, end: c.heureFin }));
          body = { employeIds: selectedEmployees, startDate, monthsCount, daysOfWeek, segments, mode: conflictMode };
        }
        const res = await axios.post(`${API_BASE}/shifts/recurring`, body, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.data?.success) { setError(res.data?.error || 'Erreur création récurrente'); setLoading(false); return; }
        formattedDate = startDate;
        rangeInfo = { employeIds: selectedEmployees, startDate, endDate: res.data.to };
        setCreationResult({ mode: 'recurring', details: res.data });
        setLastCreationRange(rangeInfo);
      } else {
        // Générer les shifts en batch
        const debut = parseISO(startDate);
        const fin = parseISO(endDate);
        const shiftsToCreate = [];
        for (let d = debut; d <= fin; d = addDays(d, 1)) {
          const js = jourMap[d.getDay()];
          if (!jours[js]) continue;
          const dateStr = format(d, 'yyyy-MM-dd');
          for (const empId of selectedEmployees) {
            shiftsToCreate.push({
              employeeId: empId, date: dateStr, type: 'travail',
              replaceExisting: conflictMode === 'replace',
              segments: getCreneauxPourJour(js).map(c => ({ start: c.heureDebut, end: c.heureFin, commentaire: '', aValider: false, isExtra: false }))
            });
          }
        }
        const res = await axios.post(`${API_BASE}/shifts/batch`, { shifts: shiftsToCreate }, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.data || res.data.created === 0) { setError(res.data?.errors?.join('\n') || 'Aucun planning créé'); setLoading(false); return; }
        formattedDate = shiftsToCreate.length ? shiftsToCreate[0].date : null;
        rangeInfo = { employeIds: selectedEmployees, startDate, endDate };
        setCreationResult({ mode: 'batch', details: res.data });
        setLastCreationRange(rangeInfo);
      }
      setLoading(false);
      onSuccess(formattedDate);
    } catch (e) {
      console.error('Erreur création:', e);
      setError(e.response?.data?.error || 'Erreur lors de la création');
      setLoading(false);
    }
  };

  // --- Suppression handlers ---
  const handleToggleDelEmployee = (id) => setDelSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAllDelEmployees = () => setDelSelectedEmployees(delSelectedEmployees.length === employes.length ? [] : employes.map(e => e.id));
  const handleToggleWipeEmployee = (id) => setWipeSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAllWipeEmployees = () => setWipeSelectedEmployees(wipeSelectedEmployees.length === employes.length ? [] : employes.map(e => e.id));

  const supprimerTousPlannings = async () => {
    setWipeMsg(null);
    if (wipeConfirm !== phrase) { setWipeMsg('Confirmation incorrecte'); return; }
    try {
      setWipeLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { setWipeMsg('Session expirée'); setWipeLoading(false); return; }
      const body = { startDate: '1970-01-01', endDate: '2100-12-31', type: 'travail' };
      if (wipeSelectedEmployees.length) body.employeIds = wipeSelectedEmployees;
      const res = await axios.post(`${API_BASE}/shifts/delete-range`, body, { headers: { Authorization: `Bearer ${token}` } });
      const deleted = res.data.deleted || res.data.count || 0;
      setWipeMsg(`${deleted} planning(s) supprimé(s)`);
      setWipeSuccess(true);
      onSuccess();
      if (autoCloseAfterAction) setTimeout(() => onClose(), 1200);
    } catch (e) {
      setWipeMsg(e.response?.data?.error || 'Erreur suppression totale');
    } finally { setWipeLoading(false); }
  };

  // Nombre de jours actifs sélectionnés
  const joursActifs = Object.values(jours).filter(v => v).length;
  const joursActifsLabels = Object.entries(jours).filter(([, v]) => v).map(([j]) => jourLabels[j]).join(', ');

  // ========== RENDU ==========

  // --- Stepper visuel ---
  const StepIndicator = () => {
    const steps = [
      { num: 1, label: 'Employés', Icon: Users },
      { num: 2, label: 'Planning', Icon: CalendarDays },
      { num: 3, label: 'Confirmer', Icon: Check },
    ];
    return (
      <div className="flex items-center justify-center gap-0 mb-6">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            {i > 0 && (
              <div className={`w-12 h-0.5 transition-colors duration-300 ${step >= s.num ? 'bg-[#cf292c]' : 'bg-slate-200'}`} />
            )}
            <button
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num);
                else if (s.num === step + 1) allerSuivant();
              }}
              className="flex flex-col items-center group"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                ${step === s.num ? 'bg-[#cf292c] text-white shadow-lg shadow-red-200 scale-110' :
                  step > s.num ? 'bg-emerald-500 text-white' :
                  'bg-slate-100 text-slate-400'}`}>
                {step > s.num ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <s.Icon className="w-4 h-4" strokeWidth={1.8} />}
              </div>
              <span className={`text-[10px] mt-1 font-medium transition-colors ${step === s.num ? 'text-[#cf292c]' : step > s.num ? 'text-emerald-600' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // --- Boutons navigation wizard ---
  const WizardNav = ({ canNext = true, nextLabel, onNext, showCreate = false }) => (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
      <div>
        {step > 1 && (
          <button type="button" onClick={allerPrecedent}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Retour
          </button>
        )}
        {step === 1 && (
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            Annuler
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {resume && step >= 2 && (
          <span className="text-[11px] text-slate-400 mr-2 hidden sm:inline">
            {resume.totalPlannings} planning{resume.totalPlannings > 1 ? 's' : ''}
          </span>
        )}
        {showCreate ? (
          <button type="button" onClick={creerPlannings} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#cf292c] hover:bg-[#b52528] rounded-lg transition-colors shadow-sm disabled:opacity-50">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Création...</>
            ) : (
              <><Check className="w-4 h-4" strokeWidth={2} /> Créer les plannings</>
            )}
          </button>
        ) : (
          <button type="button" onClick={onNext || allerSuivant} disabled={!canNext}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#cf292c] hover:bg-[#b52528] rounded-lg transition-colors shadow-sm disabled:opacity-50">
            {nextLabel || 'Suivant'}
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Navigation onglets */}
      <div className="flex border-b border-slate-200 gap-1">
        {[
          { key: 'create', label: 'Créer', Icon: Plus },
          { key: 'delete', label: 'Supprimer', Icon: Trash2 },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-[#cf292c] text-[#cf292c]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <t.Icon className="w-4 h-4" strokeWidth={1.5} /> {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          {error}
        </div>
      )}

      {/* ===================== ONGLET CRÉATION ===================== */}
      {tab === 'create' && !creationResult && (
        <>
          <StepIndicator />

          {/* ===== ÉTAPE 1 : EMPLOYÉS ===== */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Qui planifier ?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sélectionnez les employés concernés</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEmployees.length > 0 && (
                    <span className="text-xs font-semibold text-white bg-[#cf292c] px-2 py-0.5 rounded-full">
                      {selectedEmployees.length}
                    </span>
                  )}
                  <button type="button" onClick={handleSelectAllEmployees}
                    className="text-xs font-medium text-[#cf292c] hover:text-[#b52528] transition-colors">
                    {selectedEmployees.length === employes.length ? 'Aucun' : 'Tous'}
                  </button>
                </div>
              </div>

              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
                <input type="text" placeholder="Rechercher un employé..." value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]/40 bg-white" />
              </div>

              {/* Grille employés */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {filteredEmployes.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">{empSearch ? 'Aucun résultat' : 'Aucun employé disponible'}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-px bg-slate-100">
                    {filteredEmployes.map(emp => {
                      const sel = selectedEmployees.includes(emp.id);
                      return (
                        <button key={emp.id} type="button" onClick={() => handleToggleEmployee(emp.id)}
                          className={`flex items-center gap-2.5 p-3 text-left transition-all bg-white
                            ${sel ? 'bg-red-50/80 ring-1 ring-inset ring-[#cf292c]/20' : 'hover:bg-slate-50'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors
                            ${sel ? 'bg-[#cf292c] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {emp.prenom?.[0]}{emp.nom?.[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${sel ? 'text-[#cf292c]' : 'text-slate-700'}`}>
                              {emp.prenom} {emp.nom}
                            </p>
                          </div>
                          {sel && (
                            <Check className="w-4 h-4 text-[#cf292c] flex-shrink-0" strokeWidth={2.5} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <WizardNav canNext={selectedEmployees.length > 0} />
            </div>
          )}

          {/* ===== ÉTAPE 2 : PLANNING ===== */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Mode de période */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Type de planning</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setIndefini(false)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${!indefini ? 'border-[#cf292c] bg-red-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarRange className={`w-5 h-5 ${!indefini ? 'text-[#cf292c]' : 'text-slate-400'}`} strokeWidth={1.5} />
                      <span className={`text-sm font-semibold ${!indefini ? 'text-[#cf292c]' : 'text-slate-700'}`}>Plage de dates</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Du ... au ...</p>
                  </button>
                  <button type="button" onClick={() => setIndefini(true)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${indefini ? 'border-[#cf292c] bg-red-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Repeat className={`w-5 h-5 ${indefini ? 'text-[#cf292c]' : 'text-slate-400'}`} strokeWidth={1.5} />
                      <span className={`text-sm font-semibold ${indefini ? 'text-[#cf292c]' : 'text-slate-700'}`}>Récurrent</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Répétition automatique</p>
                  </button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {indefini ? 'À partir du' : 'Date de début'}
                  </label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]/40" />
                </div>
                {indefini ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Durée de génération</label>
                    <select value={monthsCount} onChange={e => setMonthsCount(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]/40 bg-white">
                      {[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m} mois</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Date de fin</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]/40" />
                  </div>
                )}
              </div>

              {/* Jours de la semaine */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">Jours travaillés</h3>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setJours({ lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false })}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">Lun-Ven</button>
                    <button type="button" onClick={() => setJours({ lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: true, dimanche: true })}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">7/7</button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {Object.entries(jours).map(([jour, checked]) => (
                    <button key={jour} type="button" onClick={() => handleToggleJour(jour)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all
                        ${checked ? 'bg-[#cf292c] text-white shadow-sm shadow-red-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-200'}`}>
                      {jourLabels[jour]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Créneaux horaires */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">Horaires</h3>
                  <div className="flex items-center gap-2">
                    {!creneauxParJour && creneaux.length < 4 && (
                      <button type="button" onClick={ajouterCreneau}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#cf292c] hover:bg-red-50 rounded-md transition-colors">
                        <Plus className="w-3 h-3" strokeWidth={2} />
                        Créneau
                      </button>
                    )}
                    <button type="button" onClick={() => { if (!creneauxParJour) activerCreneauxParJour(); else setCreneauxParJour(false); }}
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors
                        ${creneauxParJour ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                      <SlidersHorizontal className="w-3 h-3" strokeWidth={1.5} />
                      Par jour
                    </button>
                  </div>
                </div>

                {!creneauxParJour ? (
                  <div className="space-y-2">
                    {creneaux.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <input type="time" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-center focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]/40 bg-white"
                          value={c.heureDebut} onChange={e => modifierCreneau(idx, 'heureDebut', e.target.value)} />
                        <div className="flex items-center gap-1 text-slate-400">
                          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                        <input type="time" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-center focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]/40 bg-white"
                          value={c.heureFin} onChange={e => modifierCreneau(idx, 'heureFin', e.target.value)} />
                        {creneaux.length > 1 && (
                          <button type="button" onClick={() => supprimerCreneau(idx)}
                            className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <X className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(jours).filter(([, actif]) => actif).map(([jour]) => (
                      <div key={jour} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{jourLabels[jour]}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => copierCreneauxVers(jour)}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors">
                              <Copy className="w-2.5 h-2.5" strokeWidth={1.5} /> Tous
                            </button>
                            <button type="button" onClick={() => ajouterCreneauJour(jour)}
                              className="px-1.5 py-0.5 text-[9px] font-medium bg-slate-200 text-slate-600 hover:bg-slate-300 rounded transition-colors">+</button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {(creneauxJours[jour] || []).map((c, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <input type="time" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm text-center focus:ring-1 focus:ring-[#cf292c]/20 bg-white"
                                value={c.heureDebut} onChange={e => modifierCreneauJour(jour, idx, 'heureDebut', e.target.value)} />
                              <span className="text-slate-300 text-xs">→</span>
                              <input type="time" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm text-center focus:ring-1 focus:ring-[#cf292c]/20 bg-white"
                                value={c.heureFin} onChange={e => modifierCreneauJour(jour, idx, 'heureFin', e.target.value)} />
                              {creneauxJours[jour].length > 1 && (
                                <button type="button" onClick={() => supprimerCreneauJour(jour, idx)}
                                  className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-600 rounded transition-colors">
                                <X className="w-3 h-3" strokeWidth={2} /></button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.values(jours).every(v => !v) && (
                      <p className="text-xs text-slate-400 text-center py-3">Sélectionnez au moins un jour ci-dessus</p>
                    )}
                  </div>
                )}
              </div>

              <WizardNav />
            </div>
          )}

          {/* ===== ÉTAPE 3 : CONFIRMATION ===== */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Résumé avant création</h3>

              {/* Carte récap */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Employés sélectionnés */}
                <div className="p-3 bg-white border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employés</span>
                    <span className="text-[10px] font-bold text-white bg-[#cf292c] px-1.5 py-0.5 rounded-full">{selectedEmployees.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployees.slice(0, 8).map(id => {
                      const emp = employes.find(e => e.id === id);
                      return emp ? (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-xs text-slate-700">
                          <span className="w-4 h-4 rounded-full bg-[#cf292c] text-white text-[8px] font-bold flex items-center justify-center">{emp.prenom?.[0]}</span>
                          {emp.prenom}
                        </span>
                      ) : null;
                    })}
                    {selectedEmployees.length > 8 && (
                      <span className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md text-xs text-slate-500">
                        +{selectedEmployees.length - 8} autres
                      </span>
                    )}
                  </div>
                </div>

                {/* Période */}
                <div className="p-3 bg-white border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Période</span>
                  <div className="flex items-center gap-2 text-sm text-slate-800 mt-1 font-medium">
                    {indefini ? (
                      <><Repeat className="w-4 h-4 text-[#cf292c] flex-shrink-0" strokeWidth={1.5} /> Récurrent à partir du {startDate ? format(parseISO(startDate), 'd MMM yyyy', { locale: fr }) : '...'} <span className="text-slate-400 font-normal">({monthsCount} mois)</span></>
                    ) : (
                      <><CalendarRange className="w-4 h-4 text-[#cf292c] flex-shrink-0" strokeWidth={1.5} /> Du {startDate ? format(parseISO(startDate), 'd MMM yyyy', { locale: fr }) : '...'} au {endDate ? format(parseISO(endDate), 'd MMM yyyy', { locale: fr }) : '...'}</>
                    )}
                  </div>
                </div>

                {/* Jours & Horaires */}
                <div className="p-3 bg-white border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jours & Horaires</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    {Object.entries(jours).map(([jour, actif]) => (
                      <span key={jour} className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold
                        ${actif ? 'bg-[#cf292c] text-white' : 'bg-slate-100 text-slate-300'}`}>
                        {jourLabels[jour]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {creneauxParJour ? (
                      Object.entries(jours).filter(([, v]) => v).map(([jour]) => (
                        <div key={jour} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-8 font-semibold text-slate-700">{jourLabels[jour]}</span>
                          {(creneauxJours[jour] || []).map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-medium">{c.heureDebut} → {c.heureFin}</span>
                          ))}
                        </div>
                      ))
                    ) : (
                      creneaux.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#cf292c]" />
                          {c.heureDebut} → {c.heureFin}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Stats */}
                {resume && (
                  <div className="p-3 bg-slate-50 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-slate-800">{selectedEmployees.length}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Employé{selectedEmployees.length > 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-800">{resume.totalJourValides}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Jours</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#cf292c]">{resume.totalPlannings}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Plannings</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode conflit */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-700">Si un planning existe déjà</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {conflictMode === 'skip' ? 'Les jours avec un planning existant seront ignorés' : 'Les plannings existants seront remplacés'}
                  </p>
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button type="button" onClick={() => setConflictMode('skip')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${conflictMode === 'skip' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                    Ignorer
                  </button>
                  <button type="button" onClick={() => setConflictMode('replace')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${conflictMode === 'replace' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>
                    Remplacer
                  </button>
                </div>
              </div>

              <WizardNav showCreate />
            </div>
          )}
        </>
      )}

      {/* ===== RÉSULTAT CRÉATION ===== */}
      {tab === 'create' && creationResult && (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Plannings créés !</h3>
          <p className="text-sm text-slate-500 mb-6">
            {creationResult.mode === 'batch' && <><span className="font-semibold text-emerald-600">{creationResult.details.created}</span> planning(s) créés avec succès</>}
            {creationResult.mode === 'recurring' && <><span className="font-semibold text-emerald-600">{creationResult.details.created}</span> dates créées en récurrence</>}
          </p>
          {lastCreationRange && (
            <p className="text-xs text-slate-400 mb-6">
              Du {format(parseISO(lastCreationRange.startDate), 'd MMM yyyy', { locale: fr })} au {format(parseISO(lastCreationRange.endDate), 'd MMM yyyy', { locale: fr })} — {lastCreationRange.employeIds.length} employé{lastCreationRange.employeIds.length > 1 ? 's' : ''}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => { setCreationResult(null); setStep(1); }}
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors">
              Créer d'autres
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#cf292c] hover:bg-[#b52528] transition-colors shadow-sm">
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* ===================== ONGLET SUPPRESSION ===================== */}
      {tab === 'delete' && (
        <div className="space-y-5">
          <div className="p-4 border border-slate-200 rounded-xl bg-white">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Supprimer des plannings</h3>
            <p className="text-xs text-slate-500 mb-4">Sélectionnez une plage de dates et des employés. Action irréversible.</p>
            {delError && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg mb-3 text-sm">{delError}</div>}
            {delSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-2 rounded-lg mb-3 text-sm flex justify-between items-center">{delSuccess}<button onClick={() => { if (autoCloseAfterAction) onClose(); else setDelSuccess(null); }} className="text-xs text-emerald-600 underline ml-4">{autoCloseAfterAction ? 'Fermer' : 'OK'}</button></div>}
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date début</label>
                <input type="date" value={delStartDate} onChange={e => setDelStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date fin</label>
                <input type="date" value={delEndDate} onChange={e => setDelEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-200" />
              </div>
              <div className="flex flex-col justify-end">
                <button type="button" onClick={async () => {
                  setDelError(null); setDelSuccess(null);
                  if (!delStartDate || !delEndDate) { setDelError('Dates requises'); return; }
                  if (new Date(delStartDate) > new Date(delEndDate)) { setDelError('Date début > date fin'); return; }
                  if (delSelectedEmployees.length === 0) { setDelError('Sélectionnez au moins un employé'); return; }
                  try {
                    setDelLoading(true);
                    const token = localStorage.getItem('token');
                    if (!token) { setDelError('Session expirée'); setDelLoading(false); return; }
                    const body = { employeIds: delSelectedEmployees, startDate: delStartDate, endDate: delEndDate, type: 'travail' };
                    const res = await axios.post(`${API_BASE}/shifts/delete-range`, body, { headers: { Authorization: `Bearer ${token}` } });
                    const deleted = res.data.deleted || res.data.count || 0;
                    setDelSuccess(`${deleted} planning(s) supprimé(s)`);
                    onSuccess();
                    if (autoCloseAfterAction) setTimeout(() => onClose(), 1200);
                  } catch (e) { setDelError(e.response?.data?.error || 'Erreur suppression'); }
                  finally { setDelLoading(false); }
                }} disabled={delLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {delLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-medium text-slate-600">Employés</h4>
                <button type="button" onClick={handleSelectAllDelEmployees} className="text-xs text-red-500 hover:text-red-600">
                  {delSelectedEmployees.length === employes.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-1">
                {employes.length === 0 ? <p className="text-slate-400 p-2 text-sm">Aucun employé</p> : (
                  <div className="grid grid-cols-2 gap-1">
                    {employes.map(emp => (
                      <div key={emp.id} onClick={() => handleToggleDelEmployee(emp.id)}
                        className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${delSelectedEmployees.includes(emp.id) ? 'bg-red-50 border border-red-200' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" className="h-4 w-4 accent-red-500 rounded mr-2" checked={delSelectedEmployees.includes(emp.id)} readOnly />
                        <span className="text-sm text-slate-600">{emp.prenom} {emp.nom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Zone dangereuse */}
          <div className="p-4 border border-red-200 rounded-xl bg-red-50/30 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-red-600 mb-2">Zone dangereuse</h4>
              <p className="text-xs text-red-500">Tapez <code className="font-mono bg-white px-1 py-0.5 border border-red-200 rounded text-red-600">{phrase}</code> pour confirmer la suppression massive.</p>
            </div>
            {wipeMsg && <div className={`text-xs px-3 py-2 rounded-lg border flex justify-between items-center ${/erreur|incorrecte/i.test(wipeMsg) ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
              <span>{wipeMsg}</span>
              {wipeSuccess && <button onClick={() => { if (autoCloseAfterAction) onClose(); else setWipeMsg(null); }} className="text-[10px] underline ml-4">{autoCloseAfterAction ? 'Fermer' : 'OK'}</button>}
            </div>}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <input type="text" value={wipeConfirm} onChange={e => setWipeConfirm(e.target.value.toUpperCase())} placeholder={phrase}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-200" />
              </div>
              <button type="button" disabled={wipeLoading || wipeConfirm !== phrase} onClick={supprimerTousPlannings}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors">
                {wipeLoading ? 'Suppression...' : (wipeSelectedEmployees.length ? 'Supprimer (ciblé)' : 'Supprimer tout')}
              </button>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-[11px] font-medium text-red-500">Employés ciblés (optionnel)</h5>
                <button type="button" onClick={handleSelectAllWipeEmployees} className="text-[10px] text-red-500 underline">{wipeSelectedEmployees.length === employes.length ? 'Désélect.' : 'Tout'}</button>
              </div>
              <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg p-1 bg-white/50">
                {employes.length === 0 ? <p className="text-[11px] text-slate-400 p-2">Aucun employé</p> : (
                  <div className="grid grid-cols-2 gap-1">
                    {employes.map(emp => (
                      <div key={emp.id} onClick={() => handleToggleWipeEmployee(emp.id)}
                        className={`flex items-center p-1.5 rounded-lg cursor-pointer text-[11px] transition-colors ${wipeSelectedEmployees.includes(emp.id) ? 'bg-red-100 border border-red-300' : 'hover:bg-red-50'}`}>
                        <input type="checkbox" className="h-3 w-3 accent-red-500 rounded mr-1" checked={wipeSelectedEmployees.includes(emp.id)} readOnly />
                        <span className="text-slate-600">{emp.prenom} {emp.nom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
            <input id="autoCloseShared" type="checkbox" className="h-4 w-4 accent-[#cf292c]" checked={autoCloseAfterAction} onChange={e => setAutoCloseAfterAction(e.target.checked)} />
            <label htmlFor="autoCloseShared" className="cursor-pointer">Fermer automatiquement après action réussie</label>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreationRapideForm;
