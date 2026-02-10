import React, { useState } from 'react';
import axios from 'axios';
import { format, parseISO, addDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { API_BASE } from '../config/api';

/**
 * Composant de formulaire pour la création (rapide ou récurrente) de plannings avec options suppression.
 */
const CreationRapideForm = ({ employes, onClose, onSuccess }) => {
  // Onglet actif: 'create' | 'delete'
  const [tab, setTab] = useState('create');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [indefini, setIndefini] = useState(false); // Mode récurrent
  const [monthsCount, setMonthsCount] = useState(6); // Horizon initial pour l'indéfini

  // Créneaux multiples
  const [creneaux, setCreneaux] = useState([{ heureDebut: '09:00', heureFin: '17:00' }]);

  const [jours, setJours] = useState({
    lundi: true,
    mardi: true,
    mercredi: true,
    jeudi: true,
    vendredi: true,
    samedi: false,
    dimanche: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creationPreview, setCreationPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [creationResult, setCreationResult] = useState(null); // { mode:'batch'|'recurring', details:{} }
  const [lastCreationRange, setLastCreationRange] = useState(null); // { employeIds, startDate, endDate }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);

  // Etats pour la suppression accessible à tout moment
  const [delStartDate, setDelStartDate] = useState('');
  const [delEndDate, setDelEndDate] = useState('');
  const [delSelectedEmployees, setDelSelectedEmployees] = useState([]);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState(null);
  const [delSuccess, setDelSuccess] = useState(null);

  const jourMap = { 0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' };

  // --- Persistence légère (dernier config) ---
  React.useEffect(()=>{
    try {
      const saved = JSON.parse(localStorage.getItem('creationRapideConfig')||'null');
      if(saved){
        setJours(saved.jours||jours);
        setCreneaux(saved.creneaux||creneaux);
      }
    } catch(e){/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  React.useEffect(()=>{
    const payload = { jours, creneaux };
    localStorage.setItem('creationRapideConfig', JSON.stringify(payload));
  },[jours, creneaux]);

  // --- Gestion des créneaux ---
  const ajouterCreneau = () => setCreneaux([...creneaux, { heureDebut: '09:00', heureFin: '17:00' }]);
  const supprimerCreneau = (index) => {
    if (creneaux.length > 1) setCreneaux(creneaux.filter((_, i) => i !== index));
  };
  const modifierCreneau = (index, field, value) => {
    const copy = [...creneaux];
    copy[index][field] = value;
    setCreneaux(copy);
  };

  const validerCreneaux = () => {
    for (let i = 0; i < creneaux.length; i++) {
      const c1 = creneaux[i];
      // 🌙 RESTAURANT : Autoriser shifts de nuit, rejeter seulement durée nulle
      if (c1.heureDebut === c1.heureFin) return `Le créneau ${i + 1} a une durée nulle`;
      for (let j = i + 1; j < creneaux.length; j++) {
        const c2 = creneaux[j];
        if (!(c1.heureFin <= c2.heureDebut || c2.heureFin <= c1.heureDebut)) return `Chevauchement créneaux ${i + 1} et ${j + 1}`;
      }
    }
    return null;
  };

  // --- Aperçu ---
  const genererApercu = () => {
    if (!startDate) { setError('Sélectionnez la date de début'); return; }
    if (!indefini && !endDate) { setError('Sélectionnez la date de fin'); return; }
    const errC = validerCreneaux(); if (errC) { setError(errC); return; }
    const debut = parseISO(startDate);
    let fin;
    if (indefini) {
      fin = addDays(addMonths(debut, monthsCount), -1); // fenêtre de génération virtuelle
    } else {
      fin = parseISO(endDate);
    }
    if (debut > fin) { setError('Début > fin'); return; }
    if (selectedEmployees.length === 0) { setError('Sélectionnez au moins un employé'); return; }

    setError(null);
    const plannings = [];
    for (let d = debut; d <= fin; d = addDays(d, 1)) {
      const js = jourMap[d.getDay()];
      if (!jours[js]) continue;
      const dateStr = format(d, 'yyyy-MM-dd');
      const dateFormatee = format(d, 'EEEE d MMMM yyyy', { locale: fr });
      for (const empId of selectedEmployees) {
        const emp = employes.find(e => e.id === empId);
        plannings.push({
          employeId: empId,
          nom: emp ? `${emp.prenom} ${emp.nom}` : 'Employé',
          date: dateStr,
          dateFormatee,
          creneaux: [...creneaux]
        });
      }
    }
    setCreationPreview(plannings);
    setShowPreview(true);
  };

  // --- Résumé prévisionnel ---
  const computeResume = () => {
    if(!startDate) return null;
    let d1 = parseISO(startDate);
    let d2;
    if(indefini){
      d2 = addDays(addMonths(d1, monthsCount), -1);
    } else if(endDate) {
      d2 = parseISO(endDate);
    } else return null;
    if(isNaN(d1)||isNaN(d2)||d1>d2) return null;
    let totalJourValides = 0;
    for(let d = d1; d <= d2; d = addDays(d,1)){
      const js = jourMap[d.getDay()];
      if(jours[js]) totalJourValides++;
    }
    const totalPlanningsPotentiels = totalJourValides * selectedEmployees.length;
    return { totalJourValides, totalPlanningsPotentiels };
  };
  const resume = computeResume();

  // --- Création ---
  const creerPlannings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { setError('Session expirée'); setLoading(false); return; }

      let formattedDate = null; let rangeInfo = null;
      if (indefini) {
        // Récurrent
        const daysMap = { dimanche:0, lundi:1, mardi:2, mercredi:3, jeudi:4, vendredi:5, samedi:6 };
        const daysOfWeek = Object.entries(jours).filter(([k,v]) => v).map(([k]) => daysMap[k]);
        if (!daysOfWeek.length) { setError('Choisissez au moins un jour'); setLoading(false); return; }
        const segments = creneaux.map(c => ({ start: c.heureDebut, end: c.heureFin }));
        const body = { employeIds: selectedEmployees, startDate, monthsCount, daysOfWeek, segments, mode: 'skip' };
        const res = await axios.post(`${API_BASE}/shifts/recurring`, body, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.data || !res.data.success) { setError(res.data?.error || 'Erreur création récurrente'); setLoading(false); return; }
        formattedDate = startDate;
        rangeInfo = { employeIds: selectedEmployees, startDate, endDate: res.data.to };
        setCreationResult({ mode: 'recurring', details: res.data });
        setLastCreationRange(rangeInfo);
      } else {
        const shiftsToCreate = creationPreview.map(p => ({
          employeeId: p.employeId,
          date: p.date,
          type: 'travail',
          segments: p.creneaux.map(c => ({
            start: c.heureDebut, end: c.heureFin,
            commentaire: '', aValider: false, isExtra: false
          }))
        }));
        const res = await axios.post(`${API_BASE}/shifts/batch`, { shifts: shiftsToCreate }, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.data || res.data.created === 0) { setError(res.data?.errors?.join('\n') || 'Aucun planning créé'); setLoading(false); return; }
        formattedDate = shiftsToCreate.length ? shiftsToCreate[0].date : null;
        rangeInfo = { employeIds: selectedEmployees, startDate, endDate };
        setCreationResult({ mode: 'batch', details: res.data });
        setLastCreationRange(rangeInfo);
      }
      setLoading(false);
      onSuccess(formattedDate);
      setShowPreview(false);
    } catch (e) {
      console.error('Erreur création:', e);
      setError(e.response?.data?.error || 'Erreur lors de la création');
      setLoading(false);
    }
  };

  // --- Suppression plage ---
  const supprimerPlanningsCrees = async () => {
    if (!lastCreationRange) return;
    setDeleteLoading(true); setDeleteError(null); setDeleteSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setDeleteError('Session expirée'); setDeleteLoading(false); return; }
      const body = { employeIds: lastCreationRange.employeIds, startDate: lastCreationRange.startDate, endDate: lastCreationRange.endDate, type: 'travail' };
      const res = await axios.post(`${API_BASE}/shifts/delete-range`, body, { headers: { Authorization: `Bearer ${token}` } });
      const deleted = res.data.deleted || res.data.count || 0;
      setDeleteSuccess(`Plannings supprimés: ${deleted}`);
    } catch (e) {
      setDeleteError(e.response?.data?.error || 'Erreur suppression');
    } finally { setDeleteLoading(false); }
  };

  // --- Sélecteurs ---
  const handleToggleEmployee = (id) => setSelectedEmployees(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  const handleSelectAllEmployees = () => setSelectedEmployees(selectedEmployees.length === employes.length ? [] : employes.map(e=>e.id));
  const handleToggleDelEmployee = (id) => setDelSelectedEmployees(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  const handleSelectAllDelEmployees = () => setDelSelectedEmployees(delSelectedEmployees.length === employes.length ? [] : employes.map(e=>e.id));

  // Suppression totale (tous plannings présence) - confirmation
  const [wipeConfirm, setWipeConfirm] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);
  const [wipeMsg, setWipeMsg] = useState(null);
  const [wipeSelectedEmployees, setWipeSelectedEmployees] = useState([]); // si vide => tous
  const [wipeSuccess, setWipeSuccess] = useState(false);
  const handleToggleWipeEmployee = (id) => setWipeSelectedEmployees(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  const handleSelectAllWipeEmployees = () => setWipeSelectedEmployees(wipeSelectedEmployees.length === employes.length ? [] : employes.map(e=>e.id));
  const [autoCloseAfterAction, setAutoCloseAfterAction] = useState(true);
  const phrase = 'SUPPRIMER TOUS';
  const supprimerTousPlannings = async () => {
    setWipeMsg(null);
    if(wipeConfirm !== phrase){ setWipeMsg('Confirmation incorrecte'); return; }
    try {
      setWipeLoading(true);
      const token = localStorage.getItem('token');
      if(!token){ setWipeMsg('Session expirée'); setWipeLoading(false); return; }
      const body = { startDate: '1970-01-01', endDate: '2100-12-31', type: 'travail' };
      if(wipeSelectedEmployees.length) body.employeIds = wipeSelectedEmployees;
      const res = await axios.post(`${API_BASE}/shifts/delete-range`, body, { headers:{ Authorization:`Bearer ${token}` }});
      const deleted = res.data.deleted || res.data.count || 0;
      setWipeMsg(`${deleted} planning(s) supprimé(s)`);
      setWipeSuccess(true);
      onSuccess();
      if(autoCloseAfterAction){ setTimeout(()=> onClose(), 1200); }
    } catch(e){
      setWipeMsg(e.response?.data?.error || 'Erreur suppression totale');
    } finally { setWipeLoading(false); }
  };
  const handleToggleJour = (jour) => setJours(prev => ({ ...prev, [jour]: !prev[jour] }));

  return (
    <div className="space-y-5">
      {/* Navigation onglets */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={()=>setTab('create')}
          className={`px-3 py-2 -mb-px border-b-2 transition-colors ${tab==='create' ? 'border-[#cf292c] text-[#cf292c]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >Créer</button>
        <button
          type="button"
          onClick={()=>setTab('delete')}
          className={`px-3 py-2 -mb-px border-b-2 transition-colors ${tab==='delete' ? 'border-[#cf292c] text-[#cf292c]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >Supprimer</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">{error}</div>}
      {deleteError && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">{deleteError}</div>}
      {deleteSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-2 rounded-lg text-sm">{deleteSuccess}</div>}

  {tab==='create' && !showPreview && !creationResult && (
        <>
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Période</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date de début</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300" value={startDate} onChange={e=>setStartDate(e.target.value)} required />
              </div>
              {!indefini && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Date de fin</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300" value={endDate} onChange={e=>setEndDate(e.target.value)} required />
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <label className="inline-flex items-center text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="mr-2 accent-[#cf292c]" checked={indefini} onChange={e=>setIndefini(e.target.checked)} />
                Planning indéfini (récurrent)
              </label>
              {indefini && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Durée initiale:</span>
                  <select value={monthsCount} onChange={e=>setMonthsCount(parseInt(e.target.value,10))} className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-1 focus:ring-slate-300">
                    {[1,2,3,6,12].map(m=> <option key={m} value={m}>{m} mois</option> )}
                  </select>
                  <span className="text-slate-400 text-xs">(création sur {monthsCount} mois)</span>
                </div>
              )}
            </div>
          </div>

          {/* Créneaux */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Créneaux horaires</h3>
              <button type="button" onClick={ajouterCreneau} className="px-3 py-1.5 bg-[#cf292c] text-white text-xs rounded-lg hover:bg-[#b52528] flex items-center gap-1 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6"/></svg>
                Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {creneaux.map((c,idx)=>(
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Début {idx+1}</label>
                      <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-300" value={c.heureDebut} onChange={e=>modifierCreneau(idx,'heureDebut', e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fin {idx+1}</label>
                      <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-300" value={c.heureFin} onChange={e=>modifierCreneau(idx,'heureFin', e.target.value)} required />
                    </div>
                  </div>
                  {creneaux.length > 1 && (
                    <button type="button" onClick={()=>supprimerCreneau(idx)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer le créneau">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Jours */}
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Jours de la semaine</h3>
            <div className="flex gap-2 mb-2 text-xs">
              <button type="button" onClick={()=>setJours({lundi:true,mardi:true,mercredi:true,jeudi:true,vendredi:true,samedi:false,dimanche:false})} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">Lun→Ven</button>
              <button type="button" onClick={()=>setJours({lundi:true,mardi:true,mercredi:true,jeudi:true,vendredi:true,samedi:true,dimanche:true})} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">Tous</button>
              <button type="button" onClick={()=>setJours({lundi:false,mardi:false,mercredi:false,jeudi:false,vendredi:false,samedi:false,dimanche:false})} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">Aucun</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(jours).map(([jour, checked]) => (
                <button key={jour} type="button" onClick={()=>handleToggleJour(jour)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${checked ? 'bg-[#cf292c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{jour.substring(0,3)}</button>
              ))}
            </div>
          </div>

          {/* Employés */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-slate-600">Employés</h3>
              <button type="button" onClick={handleSelectAllEmployees} className="text-xs text-[#cf292c] hover:text-[#b52528] transition-colors">{selectedEmployees.length === employes.length ? 'Désélectionner tout' : 'Sélectionner tout'}</button>
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-1">
              {employes.length === 0 ? <p className="text-slate-400 p-2 text-sm">Aucun employé disponible</p> : (
                <div className="grid grid-cols-2 gap-1">
                  {employes.map(emp => (
                    <div key={emp.id} onClick={()=>handleToggleEmployee(emp.id)} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${selectedEmployees.includes(emp.id) ? 'bg-red-50 border border-red-200' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" className="h-4 w-4 accent-[#cf292c] rounded mr-2" checked={selectedEmployees.includes(emp.id)} readOnly />
                      <span className="text-sm text-slate-700">{emp.prenom} {emp.nom}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors">Annuler</button>
            <button type="button" onClick={genererApercu} className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#cf292c] hover:bg-[#b52528] transition-colors" disabled={loading}>Continuer</button>
          </div>
          {resume && (
            <div className="text-xs text-slate-500 mt-2">
              Jours actifs: <strong className="text-slate-700">{resume.totalJourValides}</strong> · Employés: <strong className="text-slate-700">{selectedEmployees.length}</strong> · Plannings: <strong className="text-slate-700">{resume.totalPlanningsPotentiels}</strong>
            </div>
          )}
        </>
      )}

  {tab==='create' && showPreview && !creationResult && (
        <>
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Aperçu des plannings à créer</h3>
            <p className="text-xs text-slate-500 mb-3">{creationPreview.length} {creationPreview.length>1 ? 'plannings' : 'planning'} à créer</p>
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {creationPreview.map((pl,idx)=>(
                <div key={idx} className="mb-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-medium text-sm text-slate-700 flex justify-between items-center">
                    <span>{pl.nom}</span>
                    <button type="button" onClick={()=>setCreationPreview(prev=> prev.filter((_,i)=> i!==idx))} className="text-xs text-red-400 hover:text-red-600">Retirer</button>
                  </div>
                  <div className="text-xs text-slate-500 capitalize mb-2">{pl.dateFormatee}</div>
                  <div className="space-y-1">
                    {pl.creneaux.map((c,i)=>(
                      <div key={i} className="flex items-center text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 bg-[#cf292c] rounded-full mr-2" />
                        <span>Créneau {i+1}: {c.heureDebut} - {c.heureFin}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {creationPreview.length === 0 && <div className="text-center text-sm text-slate-400 py-6">Aucun planning restant</div>}
            </div>
          </div>
          <div className="flex justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={()=>setShowPreview(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors">Retour</button>
            <div className="flex gap-2">
              <button type="button" onClick={genererApercu} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 bg-white hover:bg-slate-50 transition-colors">Rafraîchir</button>
              <button type="button" onClick={creerPlannings} disabled={loading || creationPreview.length===0} className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#cf292c] hover:bg-[#b52528] transition-colors disabled:opacity-50">{loading ? 'Création...' : (indefini ? 'Créer récurrence' : 'Créer les plannings')}</button>
            </div>
          </div>
        </>
      )}

  {tab==='create' && creationResult && (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-medium text-slate-800 mb-1">Plannings créés avec succès !</h3>
          <p className="text-sm text-slate-500 mb-4">
            {creationResult.mode === 'batch' && `${creationResult.details.created} planning(s) créés`}
            {creationResult.mode === 'recurring' && `${creationResult.details.created} dates créées`}
          </p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={()=>{ setCreationResult(null); setShowPreview(false); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors">Créer d'autres</button>
            <button type="button" onClick={()=>onClose()} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#cf292c] hover:bg-[#b52528] transition-colors">Terminer</button>
          </div>
          {lastCreationRange && (
            <p className="text-[11px] text-slate-400 mt-4">Du {lastCreationRange.startDate} au {lastCreationRange.endDate} • {lastCreationRange.employeIds.length} employé(s)</p>
          )}
        </div>
      )}

      {/* Onglet Suppression permanente */}
      {tab==='delete' && (
        <div className="space-y-5">
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
            <h3 className="text-sm font-medium text-slate-700 mb-1">Supprimer des plannings existants</h3>
            <p className="text-xs text-slate-500 mb-4">Sélectionnez une plage de dates et un ou plusieurs employés. Action irréversible.</p>
            {delError && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg mb-3 text-sm">{delError}</div>}
            {delSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-2 rounded-lg mb-3 text-sm flex justify-between items-center">{delSuccess}<div className="flex gap-2 ml-4"><button onClick={()=>{ if(autoCloseAfterAction){ onClose(); } else { setDelSuccess(null);} }} className="text-xs text-emerald-600 underline">{autoCloseAfterAction ? 'Fermer' : 'OK'}</button></div></div>}
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date début</label>
                <input type="date" value={delStartDate} onChange={e=>setDelStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date fin</label>
                <input type="date" value={delEndDate} onChange={e=>setDelEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-300" />
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={async ()=>{
                    setDelError(null); setDelSuccess(null);
                    if(!delStartDate || !delEndDate){ setDelError('Dates requises'); return; }
                    if(new Date(delStartDate) > new Date(delEndDate)){ setDelError('Date début > date fin'); return; }
                    if(delSelectedEmployees.length===0){ setDelError('Sélectionnez au moins un employé'); return; }
                    try {
                      setDelLoading(true);
                      const token = localStorage.getItem('token');
                      if(!token){ setDelError('Session expirée'); setDelLoading(false); return; }
                      const body = { employeIds: delSelectedEmployees, startDate: delStartDate, endDate: delEndDate, type:'travail' };
                      const res = await axios.post(`${API_BASE}/shifts/delete-range`, body, { headers: { Authorization: `Bearer ${token}` } });
                      const deleted = res.data.deleted || res.data.count || 0;
                      setDelSuccess(`${deleted} planning(s) supprimé(s)`);
                      onSuccess();
                      if(autoCloseAfterAction){ setTimeout(()=> onClose(), 1200); }
                    } catch(e){
                      setDelError(e.response?.data?.error || 'Erreur suppression');
                    } finally { setDelLoading(false); }
                  }}
                  disabled={delLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                >{delLoading ? 'Suppression...' : 'Supprimer'}</button>
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
                {employes.length === 0 ? (
                  <p className="text-slate-400 p-2 text-sm">Aucun employé</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {employes.map(emp => (
                      <div key={emp.id} onClick={()=>handleToggleDelEmployee(emp.id)} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${delSelectedEmployees.includes(emp.id) ? 'bg-red-50 border border-red-200' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" className="h-4 w-4 accent-red-500 rounded mr-2" checked={delSelectedEmployees.includes(emp.id)} readOnly />
                        <span className="text-sm text-slate-600">{emp.prenom} {emp.nom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Suppression totale */}
          <div className="p-4 border border-red-200 rounded-lg bg-red-50/30 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">Zone Dangereuse – Suppression massive</h4>
              <p className="text-xs text-red-500 mb-2">Tapez <code className="font-mono bg-white px-1 py-0.5 border border-red-200 rounded text-red-600">{phrase}</code> puis choisissez :</p>
              <ul className="list-disc ml-5 text-[11px] text-red-500 space-y-0.5">
                <li>Sans sélection d'employés: tous les plannings de toute la base.</li>
                <li>Avec employés cochés: uniquement leurs plannings (toutes les dates).</li>
              </ul>
            </div>
            {wipeMsg && <div className={`mb-1 text-xs px-3 py-2 rounded-lg border flex justify-between items-center ${/erreur|incorrecte|Erreur/i.test(wipeMsg)?'bg-red-50 border-red-200 text-red-600':'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
              <span>{wipeMsg}</span>
              {wipeSuccess && <button onClick={()=>{ if(autoCloseAfterAction){ onClose(); } else { setWipeMsg(null); } }} className="text-[10px] underline ml-4">{autoCloseAfterAction? 'Fermer' : 'OK'}</button>}
            </div>}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Confirmation</label>
                <input type="text" value={wipeConfirm} onChange={e=>setWipeConfirm(e.target.value.toUpperCase())} placeholder={phrase} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-300" />
              </div>
              <button type="button" disabled={wipeLoading || wipeConfirm!==phrase} onClick={supprimerTousPlannings} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors">
                {wipeLoading ? 'Suppression...' : (wipeSelectedEmployees.length? 'Supprimer (employés)' : 'Supprimer tout')}
              </button>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-xs font-medium text-red-500">Employés ciblés (optionnel)</h5>
                <button type="button" onClick={handleSelectAllWipeEmployees} className="text-[10px] text-red-500 underline">{wipeSelectedEmployees.length===employes.length? 'Tout désélect.' : 'Tout sélectionner'}</button>
              </div>
              <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg p-1 bg-white/50">
                {employes.length === 0 ? <p className="text-[11px] text-slate-400 p-2">Aucun employé</p> : (
                  <div className="grid grid-cols-2 gap-1">
                    {employes.map(emp => (
                      <div key={emp.id} onClick={()=>handleToggleWipeEmployee(emp.id)} className={`flex items-center p-1.5 rounded-lg cursor-pointer text-[11px] transition-colors ${wipeSelectedEmployees.includes(emp.id) ? 'bg-red-100 border border-red-300' : 'hover:bg-red-50'}`}>
                        <input type="checkbox" className="h-3 w-3 accent-red-500 rounded mr-1" checked={wipeSelectedEmployees.includes(emp.id)} readOnly />
                        <span className="text-slate-600">{emp.prenom} {emp.nom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Option fermeture auto - une seule fois en bas */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <input id="autoCloseShared" type="checkbox" className="h-4 w-4 accent-[#cf292c]" checked={autoCloseAfterAction} onChange={e=>setAutoCloseAfterAction(e.target.checked)} />
            <label htmlFor="autoCloseShared" className="cursor-pointer">Fermer automatiquement après une action réussie</label>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreationRapideForm;
