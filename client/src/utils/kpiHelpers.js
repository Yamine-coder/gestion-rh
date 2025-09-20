// Pure helper for KPI derivations so we can unit test logic independently of the UI.
// Inputs: stats object shaped like backend /admin/stats response, plus optional 'now' date
// Output: object with derived metrics used by DashboardOverview.

export function computeKPIs(stats, { now = new Date() } = {}) {
  const safe = v => (typeof v === 'number' && !isNaN(v) ? v : 0);
  const employes = safe(stats?.employes);
  const pointes = safe(stats?.pointes);
  const surveillance = stats?.surveillance || {};
  const absents = safe(surveillance.employesAbsents);
  const tauxPresence = employes > 0 ? Math.round(pointes / employes * 100) : 0;
  // Non pointés = prévus - présents - absents (clamp >=0)
  const nonPointes = Math.max(0, employes - pointes - absents);

  // Retards moyenne (prefer moyenneRetardMinutes then avgRetardMinutes)
  const avgRetardMinutes = (typeof surveillance.moyenneRetardMinutes === 'number')
    ? surveillance.moyenneRetardMinutes
    : (typeof surveillance.avgRetardMinutes === 'number' ? surveillance.avgRetardMinutes : null);

  // Heures prévues / réalisées
  let heuresPrevues = (typeof stats?.heuresPrevues === 'number') ? stats.heuresPrevues : null;
  let heuresRealisees = (typeof stats?.heuresRealisees === 'number') ? stats.heuresRealisees : null;
  if (heuresRealisees == null && typeof stats?.totalHeures === 'string') {
    const m = stats.totalHeures.match(/(\d+(?:[.,]\d+)?)h/);
    if (m) heuresRealisees = parseFloat(m[1].replace(',', '.'));
  }
  const deltaHeures = (heuresPrevues != null && heuresRealisees != null)
    ? +(heuresRealisees - heuresPrevues).toFixed(1)
    : null;

  // Congés aujourd'hui
  const prochains = Array.isArray(stats?.prochainsConges) ? stats.prochainsConges : [];
  const enCongeAujourdHui = prochains.filter(c => {
    const deb = new Date(c.dateDebut);
    const fin = new Date(c.dateFin);
    return now >= deb && now <= fin;
  }).length;

  // Absence breakdown
  const absBreak = stats?.absencesDetail || stats?.absencesBreakdown || {};
  const absMaladie = safe(absBreak.maladie);
  const absConge = safe(absBreak.conge || absBreak.conges);
  const absAutre = safe(absBreak.autre || absBreak.other);
  const totalAbsDetail = absMaladie + absConge + absAutre;

  return {
    employes,
    pointes,
    tauxPresence,
    absents,
    nonPointes,
    avgRetardMinutes,
    heuresPrevues,
    heuresRealisees,
    deltaHeures,
    enCongeAujourdHui,
    absenceBreakdown: { maladie: absMaladie, conge: absConge, autre: absAutre, total: totalAbsDetail }
  };
}

// Small convenience for tests: generate a stats object quickly
export function buildStatsFixture(overrides = {}) {
  return {
    employes: 20,
    pointes: 17,
    totalHeures: '85h',
    heuresPrevues: 80,
    heuresRealisees: 85,
    prochainsConges: [
      { dateDebut: '2025-08-22', dateFin: '2025-08-22' }, // today
      { dateDebut: '2025-08-23', dateFin: '2025-08-25' }, // future
    ],
    surveillance: { employesAbsents: 2, moyenneRetardMinutes: 8 },
    absencesDetail: { maladie: 1, conge: 2, autre: 0 },
    ...overrides
  };
}
