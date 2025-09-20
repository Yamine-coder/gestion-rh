import React, { useState, useEffect, useCallback } from 'react';
import { HiUsers } from 'react-icons/hi';
import axios from 'axios';
import { computeKPIs } from '../utils/kpiHelpers';

function DashboardOverview() {
  const token = (typeof localStorage!=='undefined') ? localStorage.getItem('token') : null;
  const [stats, setStats] = useState({});
  const [pendingConges, setPendingConges] = useState(0);
  const [pendingLeavesList, setPendingLeavesList] = useState([]);
  const [dailyNote, setDailyNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Shifts / planning
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [shiftError, setShiftError] = useState(null);

  // --- Fetch shifts of the day (best‑effort: if endpoint absent, stays empty) ---
  const fetchShiftsToday = useCallback(async ()=>{
    if(!token) { setLoadingShifts(false); return; }
    const date = new Date().toISOString().slice(0,10);
    try {
      setLoadingShifts(true);
      // Try common endpoint patterns
      let res;
      try { res = await axios.get(`http://localhost:5000/admin/shifts?date=${date}`, { headers:{Authorization:`Bearer ${token}`}}); }
      catch { try { res = await axios.get(`http://localhost:5000/admin/planning/jour?date=${date}`, { headers:{Authorization:`Bearer ${token}`}}); } catch(e2){ throw e2; } }
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.shifts) ? res.data.shifts : []);
      setShifts(data);
      setShiftError(null);
    } catch(e){ setShiftError('Planning indisponible'); setShifts([]); }
    finally { setLoadingShifts(false); }
  },[token]);

  const fetchStats = useCallback(async ()=>{
    if(!token) return;
    try { setLoading(true); const res = await axios.get('http://localhost:5000/admin/stats',{ headers:{Authorization:`Bearer ${token}`}}); setStats(res.data||{}); setLastUpdated(Date.now()); }
    catch(e){ setError('Impossible de charger'); }
    finally{ setLoading(false);} 
  },[token]);

  const fetchPendingLeaves = useCallback( async ()=>{
    if(!token) return;
    try { const res = await axios.get('http://localhost:5000/admin/conges?statut=en%20attente',{ headers:{Authorization:`Bearer ${token}`}}); let list=[]; if(Array.isArray(res.data)) list=res.data; else if(Array.isArray(res.data?.conges)) list=res.data.conges; setPendingLeavesList(list); setPendingConges(list.length);} catch{ setPendingLeavesList([]); setPendingConges(0);} 
  },[token]);

  useEffect(()=>{ fetchStats(); fetchPendingLeaves(); },[fetchStats, fetchPendingLeaves]);
  useEffect(()=>{ try{ const d=localStorage.getItem('rh_daily_instruction'); if(d) setDailyNote(d);}catch{} },[]);
  useEffect(()=>{ fetchShiftsToday(); },[fetchShiftsToday]);

  // KPIs derivés
  const now = new Date();
  const kpi = computeKPIs(stats,{ now });
  const { employes=0, pointes=0, absents=0, nonPointes=0, enCongeAujourdHui=0, absenceBreakdown } = kpi;
  const effectifAttendu = Math.max(0, employes - enCongeAujourdHui);
  const presenceReellePct = effectifAttendu>0? Math.round(pointes/effectifAttendu*100):0;
  let absencesNonPlanifiees=0; if(absenceBreakdown){ const {conge=0, maladie=0, autre=0}=absenceBreakdown; absencesNonPlanifiees=(maladie||0)+(autre||0); if(!absencesNonPlanifiees) absencesNonPlanifiees=Math.max(0,absents-conge); } else { absencesNonPlanifiees=Math.max(0,absents - enCongeAujourdHui);} 
  const nonPointesPct = effectifAttendu>0? Math.round(nonPointes/effectifAttendu*100):0;
  const urgentDemandes = pendingLeavesList.filter(c=>{ if(!c?.dateDebut) return false; return (new Date(c.dateDebut).getTime()-now.getTime()) < 48*3600*1000; }).length;

  // Couleurs
  const colorPresence = presenceReellePct>=85?'ok': presenceReellePct>=70?'warn':'alert';
  const colorNonPointes = nonPointes===0? 'ok' : nonPointesPct>10? 'warn':'neutral';
  const colorAbsNP = absencesNonPlanifiees===0? 'ok': (absencesNonPlanifiees/(effectifAttendu||1) > 0.05 ? 'warn':'neutral');

  // --- Anomalies sur shifts ---
  const dayMs = 24*3600*1000;
  const anomalies = { retards: [], nonAssignes: [], conflits: [], depassements: [], certifications: [] };
  // Index by employee for conflict detection
  const byEmp = {};
  shifts.forEach(s => { if(s.employeeId) { byEmp[s.employeeId] = byEmp[s.employeeId] || []; byEmp[s.employeeId].push(s);} });
  Object.values(byEmp).forEach(list => list.sort((a,b)=> new Date(a.start)-new Date(b.start)));
  // Conflicts + detect tardiness & depassements
  shifts.forEach(s => {
    const start = new Date(s.start); const end = new Date(s.end);
    const durationH = (end - start)/3600000;
    const started = !!(s.started || s.hasPointage || s.checkIn);
    if(start < now && end > now && !started && s.employeeId) anomalies.retards.push(s);
    if(!s.employeeId) anomalies.nonAssignes.push(s);
    if(durationH > 10) anomalies.depassements.push(s);
    if(typeof s.certExpiryDays === 'number' && s.certExpiryDays <=7) anomalies.certifications.push(s);
  });
  Object.values(byEmp).forEach(list => {
    for(let i=0;i<list.length;i++){
      for(let j=i+1;j<list.length;j++){
        const a=list[i], b=list[j];
        const aStart=new Date(a.start), aEnd=new Date(a.end), bStart=new Date(b.start), bEnd=new Date(b.end);
        if(aEnd > bStart && aStart < bEnd){ anomalies.conflits.push([a,b]); }
      }
    }
  });

  const hasAnomalies = Object.values(anomalies).some(arr => arr.length>0);

  const shiftStatus = s => {
    const start=new Date(s.start), end=new Date(s.end);
    if(now > end) return 'done';
    if(now >= start) return 'ongoing';
    return 'upcoming';
  };
  const shiftColor = status => status==='ongoing'? 'bg-green-500' : status==='upcoming'? 'bg-blue-500' : 'bg-gray-400';
  const shiftLight = status => status==='ongoing'? 'bg-green-50 border-green-200' : status==='upcoming'? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200';
  const formatHM = d => new Date(d).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

  // --- Remplacements / échanges à approuver ---
  // Heuristique: shift sans employeeId ou avec s.replacementRequested / s.swapRequest
  // Urgent: commence dans <2h ; Imminent: <6h
  const replacementsRaw = shifts.filter(s => !s.employeeId || s.replacementRequested || s.swapRequest || s.employeeReplacementNeeded);
  const replacements = replacementsRaw.map(s => {
    const start = new Date(s.start);
    const diffH = (start - now)/3600000;
    let urgence = diffH < 0 ? 'en cours' : diffH <=2 ? 'urgent' : diffH <=6 ? 'bientôt' : 'planifié';
    return { id: s.id || s._id || `${s.start}-${s.employeeId||'na'}`, start, end: new Date(s.end), original: s, urgence };
  }).sort((a,b)=> a.start - b.start);
  const urgentReplacements = replacements.filter(r => r.urgence==='urgent');
  const ongoingReplacements = replacements.filter(r => r.urgence==='en cours');

  if(error) return <div className='p-4 text-sm text-red-600'>{error}</div>;

  return (
    <div className='p-4 lg:p-6 space-y-5 bg-gray-50 min-h-[calc(100vh-3rem)]'>
      <div className='flex justify-between items-center'>
        <h1 className='text-sm font-semibold text-gray-700 flex items-center gap-2'><HiUsers className='w-4 h-4 text-[#cf292c]'/> Synthèse</h1>
        <button onClick={()=>{fetchStats(); fetchPendingLeaves();}} className='px-3 py-1.5 text-xs rounded bg-white border border-gray-300 hover:bg-gray-100 flex items-center gap-1'>
          <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/></svg>
          Maj
        </button>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <SimpleCard label='Présence' value={loading? '…': `${presenceReellePct}%`} sub={loading? '' : `${pointes}/${effectifAttendu}`} tone={loading? 'neutral': colorPresence} loading={loading} />
        <SimpleCard label='Non pointés' value={loading? '…': nonPointes} sub={loading? '' : `${nonPointesPct}%`} tone={loading? 'neutral': colorNonPointes} loading={loading} />
        <SimpleCard label='Abs. non planif.' value={loading? '…': absencesNonPlanifiees} sub={!loading && absencesNonPlanifiees===0? 'OK':''} tone={loading? 'neutral': colorAbsNP} loading={loading} />
        <SimpleCard label='Demandes' value={loading? '…': pendingConges} sub={loading? '' : (pendingConges>0? (urgentDemandes>0? `${urgentDemandes} urg.`:'à valider'):'OK')} tone={loading? 'neutral': (pendingConges>0? 'warn':'ok')} loading={loading} />
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <SimpleCard label='Congés' value={loading? '…': enCongeAujourdHui} tone={loading? 'neutral':'info'} loading={loading} />
        <SimpleCard label='Effectif' value={loading? '…': employes} loading={loading} />
      </div>

      {/* Mini planning du jour */}
      <section className='bg-white border border-gray-200 rounded-lg p-4 space-y-3'>
        <div className='flex items-center justify-between'>
          <h2 className='text-xs font-semibold text-gray-700'>Planning du jour</h2>
          <div className='flex items-center gap-2'>
            <button onClick={fetchShiftsToday} className='text-[10px] px-2 py-1 border rounded bg-white hover:bg-gray-50'>Maj</button>
          </div>
        </div>
        {shiftError && <div className='text-[11px] text-red-600'>{shiftError}</div>}
        {loadingShifts ? (
          <div className='text-[11px] text-gray-500'>Chargement…</div>
        ) : shifts.length===0 ? (
          <div className='text-[11px] text-gray-500 italic'>Aucun shift disponible</div>
        ) : (
          <div className='overflow-x-auto scrollbar-thin'>
            <div className='flex items-stretch gap-2 min-w-full pr-2'>
              {shifts.sort((a,b)=> new Date(a.start)-new Date(b.start)).map(s => {
                const status = shiftStatus(s);
                const start=new Date(s.start), end=new Date(s.end);
                const duration = end-start; const widthPct = Math.max(6, (duration/dayMs)*100);
                const isRetard = anomalies.retards.includes(s);
                const isNonAssigne = !s.employeeId;
                return (
                  <div key={s.id || s._id || `${s.start}-${s.employeeId||'na'}`} className={`relative rounded-md border ${shiftLight(status)} px-2 py-1 flex flex-col justify-between`} style={{minWidth:widthPct+'%'}}>
                    <div className='flex items-center justify-between gap-2'>
                      <span className='text-[11px] font-medium text-gray-700 truncate max-w-[90px]' title={s.employeeName||s.employeNom||s.nom||'Non assigné'}>
                        {s.employeeName||s.employeNom||s.nom||'—'}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${shiftColor(status)}`}></span>
                    </div>
                    <div className='text-[10px] text-gray-500'>{formatHM(s.start)}–{formatHM(s.end)}</div>
                    {(isRetard || isNonAssigne) && (
                      <div className='absolute -top-1 -right-1 flex gap-1'>
                        {isRetard && <span className='bg-red-500 text-white rounded px-1 text-[9px]'>RET</span>}
                        {isNonAssigne && <span className='bg-orange-500 text-white rounded px-1 text-[9px]'>NA</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className='flex flex-wrap gap-3 text-[10px] text-gray-500 pt-1'>
          <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-green-500'></span>En cours</span>
          <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-blue-500'></span>À venir</span>
          <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-gray-400'></span>Terminé</span>
          <span className='flex items-center gap-1'><span className='bg-red-500 text-white rounded px-1 text-[9px]'>RET</span>Retard</span>
          <span className='flex items-center gap-1'><span className='bg-orange-500 text-white rounded px-1 text-[9px]'>NA</span>Non assigné</span>
        </div>
      </section>

      {/* Anomalies & alertes */}
      <section className='bg-white border border-gray-200 rounded-lg p-4 space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-xs font-semibold text-gray-700'>Anomalies & alertes</h2>
          {!hasAnomalies && !loadingShifts && <span className='text-[10px] text-green-600 font-medium'>RAS</span>}
        </div>
        {loadingShifts && <div className='text-[11px] text-gray-500'>Analyse…</div>}
        {!loadingShifts && hasAnomalies && (
          <ul className='space-y-1 text-[11px] text-gray-700'>
            {anomalies.retards.length>0 && <li>Retards en cours: <strong className='text-red-600'>{anomalies.retards.length}</strong></li>}
            {anomalies.nonAssignes.length>0 && <li>Shifts non assignés: <strong className='text-orange-600'>{anomalies.nonAssignes.length}</strong></li>}
            {anomalies.conflits.length>0 && <li>Conflits de planning: <strong className='text-red-600'>{anomalies.conflits.length}</strong></li>}
            {anomalies.depassements.length>0 && <li>Dépassements {'>'}10h: <strong className='text-red-600'>{anomalies.depassements.length}</strong></li>}
            {anomalies.certifications.length>0 && <li>Certifications expirant ≤7j: <strong className='text-orange-600'>{anomalies.certifications.length}</strong></li>}
          </ul>
        )}
        <div className='text-[10px] text-gray-400 pt-1'>Retards: shift démarré sans pointage. Conflits: chevauchement même employé.</div>
      </section>

      {/* Remplacements / Échanges */}
      <section className='bg-white border border-gray-200 rounded-lg p-4 space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-xs font-semibold text-gray-700'>Remplacements / Échanges</h2>
          {replacements.length===0 && !loadingShifts && <span className='text-[10px] text-green-600 font-medium'>Aucun</span>}
        </div>
        <div className='flex gap-2'>
          <button className='px-3 py-1.5 text-[10px] rounded bg-[#cf292c] text-white hover:bg-[#b8252a] font-medium'>
            🔄 Gérer remplacements
          </button>
          <button className='px-3 py-1.5 text-[10px] rounded border border-gray-300 hover:bg-gray-50'>
            ➕ Créer demande
          </button>
        </div>
        {loadingShifts && <div className='text-[11px] text-gray-500'>Chargement…</div>}
        {!loadingShifts && replacements.length>0 && (
          <div className='space-y-2'>
            {(urgentReplacements.length>0 || ongoingReplacements.length>0) && (
              <div className='flex flex-wrap gap-2 text-[10px]'>
                {ongoingReplacements.length>0 && <span className='px-2 py-0.5 rounded bg-red-600 text-white font-medium'>À couvrir maintenant: {ongoingReplacements.length}</span>}
                {urgentReplacements.length>0 && <span className='px-2 py-0.5 rounded bg-orange-500 text-white font-medium'>Urgent &lt;2h: {urgentReplacements.length}</span>}
              </div>
            )}
            <ul className='divide-y divide-gray-100 border border-gray-100 rounded'>
              {replacements.slice(0,5).map(r => (
                <li key={r.id} className='p-2 flex items-center justify-between gap-3 text-[11px]'>
                  <div className='flex flex-col'>
                    <span className='font-medium text-gray-700'>{formatHM(r.start)}–{formatHM(r.end)}</span>
                    <span className='text-gray-500'>Rempl. pour {r.original.employeeName||r.original.nom||'—'}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${r.urgence==='urgent'?'bg-orange-500 text-white': r.urgence==='en cours'?'bg-red-600 text-white': r.urgence==='bientôt'?'bg-yellow-300 text-gray-800':'bg-gray-200 text-gray-600'}`}>{r.urgence}</span>
                    <button className='px-2 py-1 rounded border text-[10px] hover:bg-gray-50'>Voir</button>
                  </div>
                </li>
              ))}
            </ul>
            {replacements.length>5 && <div className='text-[10px] text-gray-500 italic'>+{replacements.length-5} autres demandes</div>}
          </div>
        )}
        <div className='text-[10px] text-gray-400 pt-1'>Heuristique: shifts sans affectation ou marqués replacementRequested.</div>
      </section>

      <div className='text-[11px] text-gray-500 flex flex-wrap gap-4 bg-white border border-gray-200 rounded p-3'>
        <span>Consigne: <em>{dailyNote || '—'}</em></span>
        {lastUpdated && <span>MAJ {new Date(lastUpdated).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>}
      </div>
    </div>
  );
}

// --- UI Components Simples ---

// Carte simple
const SimpleCard = ({ label, value, sub, tone='neutral', loading=false }) => {
  const toneMap = {
    neutral: 'bg-white border-gray-200 text-gray-700',
    ok: 'bg-green-50 border-green-200 text-green-700',
    warn: 'bg-orange-50 border-orange-200 text-orange-700',
    alert: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };
  return (
    <div className={`rounded-lg border p-3 text-center ${toneMap[tone]||toneMap.neutral}`}>
      <div className='text-[10px] uppercase tracking-wide font-medium opacity-70 mb-1'>{label}</div>
      <div className='text-lg font-bold leading-none'>{loading? '…' : value}</div>
      {sub && !loading && <div className='text-[11px] opacity-70 mt-1'>{sub}</div>}
    </div>
  );
};

export default DashboardOverview;
