import { computeKPIs, buildStatsFixture } from './kpiHelpers';

test('computeKPIs basic derivations', () => {
  const stats = buildStatsFixture();
  const kpi = computeKPIs(stats, { now: new Date('2025-08-22T09:00:00Z') });
  expect(kpi.employes).toBe(20);
  expect(kpi.pointes).toBe(17);
  expect(kpi.tauxPresence).toBe(Math.round(17/20*100));
  expect(kpi.absents).toBe(2);
  expect(kpi.nonPointes).toBe(Math.max(0, 20 - 17 - 2));
  expect(kpi.avgRetardMinutes).toBe(8);
  expect(kpi.deltaHeures).toBe(5); // 85 - 80
  expect(kpi.enCongeAujourdHui).toBe(1);
  expect(kpi.absenceBreakdown.total).toBe(3);
});

test('computeKPIs handles missing values gracefully', () => {
  const stats = { employes: 0, pointes: 0, surveillance: {} };
  const kpi = computeKPIs(stats);
  expect(kpi.tauxPresence).toBe(0);
  expect(kpi.nonPointes).toBe(0);
  expect(kpi.deltaHeures).toBeNull();
});
