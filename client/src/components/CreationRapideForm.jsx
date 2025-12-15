import React, { useState } from 'react';
import axios from 'axios';
import { format, parseISO, addDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    <div className="space-y-6">
      {/* Navigation onglets */}
      <div className="flex border-b gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={()=>setTab('create')}
          className={`px-3 py-2 -mb-px border-b-2 ${tab==='create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >Créer</button>
        <button
          type="button"
          onClick={()=>setTab('delete')}
          className={`px-3 py-2 -mb-px border-b-2 ${tab==='delete' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >Supprimer</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>}
      {deleteError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">{deleteError}</div>}
      {deleteSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md">{deleteSuccess}</div>}

  {tab==='create' && !showPreview && !creationResult && (
        <>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Période</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Date de début</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" value={startDate} onChange={e=>setStartDate(e.target.value)} required />
              </div>
              {!indefini && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date de fin</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" value={endDate} onChange={e=>setEndDate(e.target.value)} required />
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <label className="inline-flex items-center text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="mr-2" checked={indefini} onChange={e=>setIndefini(e.target.checked)} />
                Planning indéfini (récurrent)
              </label>
              {indefini && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Durée initiale:</span>
                  <select value={monthsCount} onChange={e=>setMonthsCount(parseInt(e.target.value,10))} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    {[1,2,3,6,12].map(m=> <option key={m} value={m}>{m} mois</option> )}
                  </select>
                  <span className="text-gray-400">(création sur {monthsCount} mois)</span>
                </div>
              )}
            </div>
          </div>

          {/* Créneaux */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Créneaux horaires</h3>
              <button type="button" onClick={ajouterCreneau} className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6"/></svg>
                Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {creneaux.map((c,idx)=>(
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Début {idx+1}</label>
                      <input type="time" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500" value={c.heureDebut} onChange={e=>modifierCreneau(idx,'heureDebut', e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Fin {idx+1}</label>
                      <input type="time" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500" value={c.heureFin} onChange={e=>modifierCreneau(idx,'heureFin', e.target.value)} required />
                    </div>
                  </div>
                  {creneaux.length > 1 && (
                    <button type="button" onClick={()=>supprimerCreneau(idx)} className="text-red-500 hover:text-red-700" title="Supprimer le créneau">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Jours */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Jours de la semaine</h3>
            <div className="flex gap-2 mb-2 text-xs">
              <button type="button" onClick={()=>setJours({lundi:true,mardi:true,mercredi:true,jeudi:true,vendredi:true,samedi:false,dimanche:false})} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Lun→Ven</button>
              <button type="button" onClick={()=>setJours({lundi:true,mardi:true,mercredi:true,jeudi:true,vendredi:true,samedi:true,dimanche:true})} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Tous</button>
              <button type="button" onClick={()=>setJours({lundi:false,mardi:false,mercredi:false,jeudi:false,vendredi:false,samedi:false,dimanche:false})} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Aucun</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(jours).map(([jour, checked]) => (
                <button key={jour} type="button" onClick={()=>handleToggleJour(jour)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${checked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{jour.substring(0,3)}</button>
              ))}
            </div>
          </div>

          {/* Employés */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-700">Employés</h3>
              <button type="button" onClick={handleSelectAllEmployees} className="text-sm text-blue-600 hover:text-blue-800">{selectedEmployees.length === employes.length ? 'Désélectionner tout' : 'Sélectionner tout'}</button>
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-1">
              {employes.length === 0 ? <p className="text-gray-500 p-2">Aucun employé disponible</p> : (
                <div className="grid grid-cols-2 gap-1">
                  {employes.map(emp => (
                    <div key={emp.id} onClick={()=>handleToggleEmployee(emp.id)} className={`flex items-center p-2 rounded cursor-pointer ${selectedEmployees.includes(emp.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                      <input type="checkbox" className="h-4 w-4 text-blue-600 rounded mr-2" checked={selectedEmployees.includes(emp.id)} readOnly />
                      <span>{emp.prenom} {emp.nom}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Annuler</button>
            <button type="button" onClick={genererApercu} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700" disabled={loading}>Continuer</button>
          </div>
          {resume && (
            <div className="text-xs text-gray-600 mt-2">
              Jours actifs dans la période: <strong>{resume.totalJourValides}</strong> · Employés: <strong>{selectedEmployees.length}</strong> · Plannings potentiels: <strong>{resume.totalPlanningsPotentiels}</strong>
            </div>
          )}
        </>
      )}

  {tab==='create' && showPreview && !creationResult && (
        <>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Aperçu des plannings à créer</h3>
            <p className="text-sm text-gray-500 mb-3">{creationPreview.length} {creationPreview.length>1 ? 'plannings' : 'planning'} à créer</p>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
              {creationPreview.map((pl,idx)=>(
                <div key={idx} className="mb-2 p-3 bg-gray-50 rounded-md border">
                  <div className="font-medium text-gray-800 flex justify-between items-center">
                    <span>{pl.nom}</span>
                    <button type="button" onClick={()=>setCreationPreview(prev=> prev.filter((_,i)=> i!==idx))} className="text-xs text-red-500 hover:text-red-700">Retirer</button>
                  </div>
                  <div className="text-sm text-gray-600 capitalize mb-2">{pl.dateFormatee}</div>
                  <div className="space-y-1">
                    {pl.creneaux.map((c,i)=>(
                      <div key={i} className="flex items-center text-sm">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                        <span>Créneau {i+1}: {c.heureDebut} - {c.heureFin}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {creationPreview.length === 0 && <div className="text-center text-sm text-gray-500 py-6">Aucun planning restant</div>}
            </div>
          </div>
          <div className="flex justify-between gap-3 mt-6">
            <button type="button" onClick={()=>setShowPreview(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Retour</button>
            <div className="flex gap-3">
              <button type="button" onClick={genererApercu} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-600 bg-white hover:bg-gray-50">Rafraîchir</button>
              <button type="button" onClick={creerPlannings} disabled={loading || creationPreview.length===0} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-[#cf292c] hover:bg-[#b31f22]">{loading ? 'Création...' : (indefini ? 'Créer récurrence' : 'Créer les plannings')}</button>
            </div>
          </div>
        </>
      )}

  {tab==='create' && creationResult && (
        <div className="space-y-4">
          <div className="p-4 border border-green-200 bg-green-50 rounded-md">
            <h3 className="font-medium text-green-800 mb-1">Plannings créés avec succès</h3>
            <p className="text-sm text-green-700">{creationResult.mode === 'batch' && `${creationResult.details.created} planning(s) créés.`}{creationResult.mode === 'recurring' && `${creationResult.details.created} dates sur ${creationResult.details.from} → ${creationResult.details.to}`}</p>
            {lastCreationRange && <p className="text-xs text-gray-600 mt-2">Plage: {lastCreationRange.startDate} → {lastCreationRange.endDate} ({lastCreationRange.employeIds.length} employé(s))</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={supprimerPlanningsCrees} disabled={deleteLoading || !lastCreationRange} className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{deleteLoading ? 'Suppression...' : 'Supprimer ces plannings'}</button>
            <button type="button" onClick={()=>onClose()} className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300">Fermer</button>
          </div>
        </div>
      )}

      {/* Onglet Suppression permanente */}
      {tab==='delete' && (
        <div className="space-y-6">
          <div className="mt-2 p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-2">Supprimer des plannings existants</h3>
            <p className="text-xs text-gray-500 mb-4">Sélectionnez une plage de dates et un ou plusieurs employés pour supprimer leurs plannings de présence. Action irréversible.</p>
            {delError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{delError}</div>}
            {delSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded mb-3 text-sm flex justify-between items-center">{delSuccess}<div className="flex gap-2 ml-4"><button onClick={()=>{ if(autoCloseAfterAction){ onClose(); } else { setDelSuccess(null);} }} className="text-xs text-green-700 underline">{autoCloseAfterAction ? 'Fermer' : 'OK'}</button></div></div>}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Date début</label>
                <input type="date" value={delStartDate} onChange={e=>setDelStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Date fin</label>
                <input type="date" value={delEndDate} onChange={e=>setDelEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-red-500" />
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
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >{delLoading ? 'Suppression...' : 'Supprimer'}</button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-700 text-sm">Employés</h4>
                <button type="button" onClick={handleSelectAllDelEmployees} className="text-xs text-red-600 hover:text-red-700">
                  {delSelectedEmployees.length === employes.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md p-1">
                {employes.length === 0 ? (
                  <p className="text-gray-500 p-2 text-sm">Aucun employé</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {employes.map(emp => (
                      <div key={emp.id} onClick={()=>handleToggleDelEmployee(emp.id)} className={`flex items-center p-2 rounded cursor-pointer ${delSelectedEmployees.includes(emp.id) ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'}`}>
                        <input type="checkbox" className="h-4 w-4 text-red-600 rounded mr-2" checked={delSelectedEmployees.includes(emp.id)} readOnly />
                        <span className="text-sm">{emp.prenom} {emp.nom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Suppression totale */}
          <div className="p-4 border rounded-md bg-red-50/40 space-y-4">
            <div>
              <h4 className="font-medium text-red-700 mb-2">Zone Dangereuse – Suppression massive</h4>
              <p className="text-xs text-red-600 mb-2">Tapez <code className="font-mono bg-white px-1 py-0.5 border rounded">{phrase}</code> puis choisissez :</p>
              <ul className="list-disc ml-5 text-[11px] text-red-600 space-y-0.5">
                <li>Sans sélection d'employés: tous les plannings (présence) de toute la base.</li>
                <li>Avec employés cochés: uniquement leurs plannings (toutes les dates).</li>
              </ul>
            </div>
            {wipeMsg && <div className={`mb-1 text-xs px-3 py-2 rounded border flex justify-between items-center ${/erreur|incorrecte|Erreur/i.test(wipeMsg)?'bg-red-50 border-red-200 text-red-700':'bg-green-50 border-green-200 text-green-700'}`}>
              <span>{wipeMsg}</span>
              {wipeSuccess && <button onClick={()=>{ if(autoCloseAfterAction){ onClose(); } else { setWipeMsg(null); } }} className="text-[10px] underline ml-4">{autoCloseAfterAction? 'Fermer' : 'OK'}</button>}
            </div>}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirmation</label>
                <input type="text" value={wipeConfirm} onChange={e=>setWipeConfirm(e.target.value.toUpperCase())} placeholder={phrase} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-red-500" />
              </div>
              <button type="button" disabled={wipeLoading || wipeConfirm!==phrase} onClick={supprimerTousPlannings} className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">
                {wipeLoading ? 'Suppression...' : (wipeSelectedEmployees.length? 'Supprimer (employés)' : 'Supprimer tout')}
              </button>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-xs font-medium text-red-700">Employés ciblés (optionnel)</h5>
                <button type="button" onClick={handleSelectAllWipeEmployees} className="text-[10px] text-red-600 underline">{wipeSelectedEmployees.length===employes.length? 'Tout désélect.' : 'Tout sélectionner'}</button>
              </div>
              <div className="max-h-40 overflow-y-auto border border-red-200 rounded p-1 bg-white/50">
                {employes.length === 0 ? <p className="text-[11px] text-gray-500 p-2">Aucun employé</p> : (
                  <div className="grid grid-cols-2 gap-1">
                    {employes.map(emp => (
                      <div key={emp.id} onClick={()=>handleToggleWipeEmployee(emp.id)} className={`flex items-center p-1.5 rounded cursor-pointer text-[11px] ${wipeSelectedEmployees.includes(emp.id) ? 'bg-red-100 border border-red-300' : 'hover:bg-red-50'}`}>
                        <input type="checkbox" className="h-3 w-3 text-red-600 rounded mr-1" checked={wipeSelectedEmployees.includes(emp.id)} readOnly />
                        <span>{emp.prenom} {emp.nom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-red-200/40">
              <input id="autoCloseToggle" type="checkbox" className="h-4 w-4" checked={autoCloseAfterAction} onChange={e=>setAutoCloseAfterAction(e.target.checked)} />
              <label htmlFor="autoCloseToggle" className="text-[11px] text-red-700 select-none">Fermer automatiquement après succès</label>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <input id="autoCloseShared" type="checkbox" className="h-4 w-4" checked={autoCloseAfterAction} onChange={e=>setAutoCloseAfterAction(e.target.checked)} />
            <label htmlFor="autoCloseShared">Fermer automatiquement la fenêtre après une suppression réussie</label>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreationRapideForm;
