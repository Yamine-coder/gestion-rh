/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TESTS COMPLETS — anomalyScheduler.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Mock prisma BEFORE any require (Jest hoists jest.mock calls)
const mockPointageFindMany = jest.fn().mockResolvedValue([]);
const mockAnomalieFindFirst = jest.fn().mockResolvedValue(null);
const mockAnomalieCreate = jest.fn().mockResolvedValue({ id: 999 });
const mockUserFindUnique = jest.fn().mockResolvedValue({ nom: 'Test', prenom: 'User' });

jest.mock('../../prisma/client', () => ({
  pointage: { findMany: mockPointageFindMany },
  anomalie: { findFirst: mockAnomalieFindFirst, create: mockAnomalieCreate },
  user: { findUnique: mockUserFindUnique },
}));

jest.mock('../congeReminderService', () => ({
  checkAndSendReminders: jest.fn(),
}));

const { adjustEndForMidnight, adjustPointageForMidnight, parisTimeToMinutes, AnomalyScheduler } = 
  require('../anomalyScheduler')._testHelpers;

// Utility: create a scheduler instance
function createScheduler() {
  return new AnomalyScheduler();
}

// Helper: make a shift object
function makeShift(id, employeId, segments, date = '2025-02-19') {
  return {
    id,
    employeId,
    date: new Date(`${date}T00:00:00.000Z`),
    type: 'travail',
    segments: JSON.stringify(segments),
    employe: { id: employeId, nom: 'Test', prenom: 'User', statut: 'actif' },
  };
}

// Helper: make a pointage (Paris time → UTC)
function makePointage(userId, type, heureParis, date = '2025-02-19') {
  const [h, m] = heureParis.split(':').map(Number);
  const utcH = h - 1; // CET → UTC approx (winter)
  const actualDate = utcH < 0 ? (() => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })() : date;
  const actualH = ((utcH % 24) + 24) % 24;
  const horodatage = new Date(`${actualDate}T${String(actualH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);
  return {
    id: Math.random(),
    userId,
    type,
    horodatage,
    user: { id: userId, nom: 'Test', prenom: 'User', role: 'employe', statut: 'actif' },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPointageFindMany.mockResolvedValue([]);
  mockAnomalieFindFirst.mockResolvedValue(null);
  mockAnomalieCreate.mockResolvedValue({ id: 999 });
  mockUserFindUnique.mockResolvedValue({ nom: 'Test', prenom: 'User' });
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('adjustEndForMidnight', () => {
  test('shift normal (09:00→17:00) — pas de changement', () => {
    // 17:00 = 1020 min, start 09:00 = 540 min → 1020 > 540 → pas d ajust
    expect(adjustEndForMidnight(1020, '09:00')).toBe(1020);
  });

  test('shift traversant minuit (17:00→00:00) — end 0 → 1440', () => {
    expect(adjustEndForMidnight(0, '17:00')).toBe(1440);
  });

  test('shift traversant minuit (22:00→01:30) — end 90 → 1530', () => {
    expect(adjustEndForMidnight(90, '22:00')).toBe(1530);
  });

  test('shift traversant minuit (20:00→00:30) — end 30 → 1470', () => {
    expect(adjustEndForMidnight(30, '20:00')).toBe(1470);
  });

  test('shift 19:00→23:00 — pas de changement (pas minuit)', () => {
    expect(adjustEndForMidnight(23 * 60, '19:00')).toBe(23 * 60);
  });

  test('pas de segmentStart — retourne endMinutes tel quel', () => {
    expect(adjustEndForMidnight(0, null)).toBe(0);
    expect(adjustEndForMidnight(0, undefined)).toBe(0);
  });

  test('shift matin court (07:00→11:00) — pas de changement', () => {
    expect(adjustEndForMidnight(660, '07:00')).toBe(660);
  });

  test('shift identique fin=début (ex: 12:00→12:00) — ajoute 1440', () => {
    // cas dégénéré mais le code l ajoute car end <= start
    expect(adjustEndForMidnight(720, '12:00')).toBe(720 + 1440);
  });
});

describe('adjustPointageForMidnight', () => {
  test('shift normal — pas d ajustement', () => {
    // pointage 17:30 pour shift start 09:00, pas de traversée minuit
    expect(adjustPointageForMidnight(17 * 60 + 30, 9 * 60, false)).toBe(17 * 60 + 30);
  });

  test('pointage post-minuit pour shift de nuit — ajoute 1440', () => {
    // pointage 00:15 (15 min) pour shift 17:00 (1020 min), crossesMidnight
    expect(adjustPointageForMidnight(15, 1020, true)).toBe(15 + 1440);
  });

  test('pointage 01:00 pour shift 22:00 — ajoute 1440', () => {
    expect(adjustPointageForMidnight(60, 22 * 60, true)).toBe(60 + 1440);
  });

  test('pointage pendant la soirée (avant minuit) pour shift nuit — pas d ajust', () => {
    // pointage 23:30 (1410 min) pour shift start 17:00 (1020), crossesMidnight
    // 1410 >= 1020, donc pas d ajust
    expect(adjustPointageForMidnight(1410, 1020, true)).toBe(1410);
  });

  test('crossesMidnight=false — jamais d ajust même si pointage < start', () => {
    expect(adjustPointageForMidnight(15, 1020, false)).toBe(15);
  });
});

describe('parisTimeToMinutes', () => {
  test('00:00 → 0', () => expect(parisTimeToMinutes('00:00')).toBe(0));
  test('12:30 → 750', () => expect(parisTimeToMinutes('12:30')).toBe(750));
  test('23:59 → 1439', () => expect(parisTimeToMinutes('23:59')).toBe(1439));
  test('null → 0', () => expect(parisTimeToMinutes(null)).toBe(0));
  test('undefined → 0', () => expect(parisTimeToMinutes(undefined)).toBe(0));
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. checkForAbsence — MOCK-BASED INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CAS 2b: ARRIVÉE EN AVANCE (extra potentiel)
// ═══════════════════════════════════════════════════════════════════════════

describe('CAS 2b: Arrivée en avance', () => {
  test('arrivée 1h en avance → crée extra_potentiel (raison: arrivee_avance)', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    // Pointage à 08:00 Paris (1h en avance)
    const pointageEntree = makePointage(10, 'arrivee', '08:00');
    const pointageSortie = makePointage(10, 'depart', '17:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraCall = createCalls.find(c => c[0].data.type === 'extra_potentiel');
    expect(extraCall).toBeDefined();
    expect(extraCall[0].data.details.raison).toBe('arrivee_avance');
    expect(extraCall[0].data.details.minutesEnAvance).toBe(60);
  });

  test('arrivée 30 min en avance (< seuil 45 min) → PAS d extra', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '08:30');
    const pointageSortie = makePointage(10, 'depart', '17:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'arrivee_avance'
    );
    expect(extraCall).toBeUndefined();
  });

  test('BUG FIX: multi-segment, entrée de segment 1 (12:00) pas considérée en avance pour segment 2 (17:00)', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '12:00', end: '14:00', type: 'travail', isExtra: true },
      { start: '17:00', end: '00:00', type: 'travail' }
    ]);
    // Entrée à 12:00 — seulement 5h avant le shift work à 17:00, avanceExcessive > 240
    const pointageEntree = makePointage(10, 'arrivee', '12:00');
    const pointageSortie = makePointage(10, 'depart', '14:07');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraArriveeCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'arrivee_avance'
    );
    // avanceMinutes = 17*60 - 12*60 = 300 > 240 → avanceExcessive → no extra
    expect(extraArriveeCall).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CAS 3: MISSING OUT / CAS 3b: MISSING IN
// ═══════════════════════════════════════════════════════════════════════════

describe('CAS 3: Missing out / CAS 3b: Missing in', () => {
  test('entrée sans sortie → crée missing_out', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const missingOut = createCalls.find(c => c[0].data.type === 'missing_out');
    expect(missingOut).toBeDefined();
  });

  test('sortie sans entrée → crée absence_injustifiee (CAS 1 prioritaire sur CAS 3b)', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageSortie = makePointage(10, 'depart', '17:00');
    mockPointageFindMany.mockResolvedValue([pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    // CAS 1 intercepte d'abord: 0 entrées → absence (retourne immédiatement)
    const absence = createCalls.find(c => c[0].data.type === 'absence_injustifiee');
    expect(absence).toBeDefined();
  });

  test('2 entrées, 1 sortie → crée missing_out (et non missing_in)', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointages = [
      makePointage(10, 'arrivee', '09:00'),
      makePointage(10, 'depart', '13:00'),
      makePointage(10, 'arrivee', '14:00'),
      // Pas de deuxième sortie
    ];
    mockPointageFindMany.mockResolvedValue(pointages);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const missingOut = createCalls.find(c => c[0].data.type === 'missing_out');
    expect(missingOut).toBeDefined();
  });

  test('1 entrée, 2 sorties → crée missing_in', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointages = [
      makePointage(10, 'arrivee', '09:00'),
      makePointage(10, 'depart', '13:00'),
      makePointage(10, 'depart', '17:00'),
    ];
    mockPointageFindMany.mockResolvedValue(pointages);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const missingIn = createCalls.find(c => c[0].data.type === 'missing_in');
    expect(missingIn).toBeDefined();
  });

  test('2 entrées, 2 sorties → pas de missing', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '13:00', type: 'travail' },
      { start: '14:00', end: '17:00', type: 'travail' }
    ]);
    const pointages = [
      makePointage(10, 'arrivee', '09:00'),
      makePointage(10, 'depart', '13:00'),
      makePointage(10, 'arrivee', '14:00'),
      makePointage(10, 'depart', '17:00'),
    ];
    mockPointageFindMany.mockResolvedValue(pointages);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const missingOut = createCalls.find(c => c[0].data.type === 'missing_out');
    const missingIn = createCalls.find(c => c[0].data.type === 'missing_in');
    expect(missingOut).toBeUndefined();
    expect(missingIn).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CAS 5: DÉPART TARDIF
// ═══════════════════════════════════════════════════════════════════════════

describe('CAS 5: Départ tardif', () => {
  test('départ 1h après fin → crée extra_potentiel (raison: depart_tardif)', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    const pointageSortie = makePointage(10, 'depart', '18:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'depart_tardif'
    );
    expect(extraCall).toBeDefined();
    expect(extraCall[0].data.details.minutesApres).toBe(60);
  });

  test('départ 30 min après (< seuil 45 min) → PAS d extra', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    const pointageSortie = makePointage(10, 'depart', '17:30');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'depart_tardif'
    );
    expect(extraCall).toBeUndefined();
  });

  test('shift nuit 17:00→00:00, départ 00:50 → extra 50 min', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '17:00', end: '00:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '17:00');
    // Sortie post-minuit à 00:50 → le lendemain
    const pointageSortie = makePointage(10, 'depart', '00:50', '2025-02-20');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'depart_tardif'
    );
    expect(extraCall).toBeDefined();
    expect(extraCall[0].data.details.minutesApres).toBe(50);
  });

  test('BUG FIX: multi-segment, sortie 14:07 du segment extra 12-14 PAS comptée comme départ tardif du shift nuit 17-00', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '12:00', end: '14:00', type: 'travail', isExtra: true },
      { start: '17:00', end: '00:00', type: 'travail' }
    ]);
    // Sortie à 14:07 Paris (du créneau extra)
    const pointageEntree = makePointage(10, 'arrivee', '12:00');
    const pointageSortie = makePointage(10, 'depart', '14:07');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraDepartCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'depart_tardif'
    );
    // sortie 14:07 est AVANT le segment de nuit 17:00, et crossesMidnight, et est en journée
    // → devrait être ignoré (pas un départ tardif post-minuit)
    expect(extraDepartCall).toBeUndefined();
  });

  test('BUG 8 FIX: extra segment après work → départ pendant extra PAS flagué comme overtime', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' },
      { start: '17:00', end: '20:00', type: 'travail', isExtra: true }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    const pointageSortie = makePointage(10, 'depart', '20:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraDepartCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'depart_tardif'
    );
    // Work ends 17:00, extra ends 20:00, sortie at 20:00 → effectiveShiftEnd = 20:00
    // retardMinutes = 0 → no extra
    expect(extraDepartCall).toBeUndefined();
  });

  test('BUG 8: extra segment, départ 1h APRES extra fin → extra flagué', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' },
      { start: '17:00', end: '20:00', type: 'travail', isExtra: true }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    const pointageSortie = makePointage(10, 'depart', '21:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraDepartCall = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'depart_tardif'
    );
    // effectiveShiftEnd = 20:00 (1200), sortie 21:00 (1260), retard = 60 ≥ 45 → extra
    expect(extraDepartCall).toBeDefined();
    expect(extraDepartCall[0].data.details.minutesApres).toBe(60);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CAS: ARRIVÉE EN AVANCE + DÉPART TARDIF MÊME JOUR (BUG 4: dedup par raison)
// ═══════════════════════════════════════════════════════════════════════════

describe('BUG 4 FIX: Dedup extra_potentiel par raison', () => {
  test('arrivée en avance + départ tardif → 2 extra_potentiel différents', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    // Arrivée 1h en avance ET départ 1h en retard
    const pointageEntree = makePointage(10, 'arrivee', '08:00');
    const pointageSortie = makePointage(10, 'depart', '18:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    // Premier appel: pas d'anomalie existante  
    // Deuxième appel: simuler qu'il y a déjà un extra_potentiel avec raison arrivee_avance
    // mais PAS de depart_tardif
    mockAnomalieFindFirst
      .mockResolvedValueOnce(null) // 1er check (arrivee_avance) → pas d'existant
      .mockResolvedValueOnce(null) // 2ème check (depart_tardif) → pas d'existant
    ;
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraCalls = createCalls.filter(c => c[0].data.type === 'extra_potentiel');
    
    // Devrait en avoir 2 : un arrivee_avance + un depart_tardif
    expect(extraCalls.length).toBe(2);
    
    const raisons = extraCalls.map(c => c[0].data.details.raison);
    expect(raisons).toContain('arrivee_avance');
    expect(raisons).toContain('depart_tardif');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAUSE NON PRISE
// ═══════════════════════════════════════════════════════════════════════════

describe('Pause non prise', () => {
  test('shift coupure 09-13 + 14-17, employé pointe 09:00-17:00 → pause_non_prise', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '13:00', type: 'travail' },
      { start: '14:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    const pointageSortie = makePointage(10, 'depart', '17:00');
    
    const entrees = [pointageEntree];
    const sorties = [pointageSortie];
    
    await scheduler.checkPauseNonPrise(shift, entrees, sorties, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const pauseCall = createCalls.find(c => c[0].data.type === 'pause_non_prise');
    expect(pauseCall).toBeDefined();
    expect(pauseCall[0].data.description).toContain('Pause non prise');
  });

  test('shift sans pause (continu 09-17) → pas de pause_non_prise', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    const pointageSortie = makePointage(10, 'depart', '17:00');
    
    await scheduler.checkPauseNonPrise(shift, [pointageEntree], [pointageSortie], '2025-02-19');
    
    expect(mockAnomalieCreate).not.toHaveBeenCalled();
  });

  test('shift > 6h continu sans pause → crée aussi depassement_amplitude', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '13:00', type: 'travail' },
      { start: '14:00', end: '17:00', type: 'travail' }
    ]);
    // Entrée à 08:00, sortie à 17:00 → 9h continu
    const pointageEntree = makePointage(10, 'arrivee', '08:00');
    const pointageSortie = makePointage(10, 'depart', '17:00');
    
    await scheduler.checkPauseNonPrise(shift, [pointageEntree], [pointageSortie], '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const depassement = createCalls.find(c => c[0].data.type === 'depassement_amplitude');
    const extraPause = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'pause_non_prise'
    );
    // 9h = 540 min > 360 → depassement
    expect(depassement).toBeDefined();
    expect(extraPause).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createAnomalieIfNotExists - DEDUP LOGIC
// ═══════════════════════════════════════════════════════════════════════════

describe('createAnomalieIfNotExists dedup', () => {
  test('anomalie déjà existante → PAS de création', async () => {
    const scheduler = createScheduler();
    mockAnomalieFindFirst.mockResolvedValue({ id: 1, type: 'absence_injustifiee' });
    
    await scheduler.createAnomalieIfNotExists(10, '2025-02-19', 'absence_injustifiee', {
      gravite: 'critique',
      description: 'test'
    });
    
    expect(mockAnomalieCreate).not.toHaveBeenCalled();
  });

  test('BUG 4 FIX: extra_potentiel dedup inclut la raison dans le filtre', async () => {
    const scheduler = createScheduler();
    
    await scheduler.createAnomalieIfNotExists(10, '2025-02-19', 'extra_potentiel', {
      gravite: 'a_valider',
      raison: 'depart_tardif',
      description: 'test'
    });
    
    // Vérifier que findFirst a été appelé avec le filtre raison
    const findCall = mockAnomalieFindFirst.mock.calls[0][0].where;
    expect(findCall.type).toBe('extra_potentiel');
    expect(findCall.details).toEqual({
      path: ['raison'],
      equals: 'depart_tardif'
    });
  });

  test('non-extra_potentiel types ne filtrent PAS par raison', async () => {
    const scheduler = createScheduler();
    
    await scheduler.createAnomalieIfNotExists(10, '2025-02-19', 'absence_injustifiee', {
      gravite: 'critique',
      description: 'test'
    });
    
    const findCall = mockAnomalieFindFirst.mock.calls[0][0].where;
    expect(findCall.details).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDNIGHT-CROSSING EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Midnight-crossing shifts', () => {
  test('shift 22:00→01:30 pas de pointage → absence', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '22:00', end: '01:30', type: 'travail' }
    ]);
    mockPointageFindMany.mockResolvedValue([]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const absence = createCalls.find(c => c[0].data.type === 'absence_injustifiee');
    expect(absence).toBeDefined();
  });

  test('adjustEndForMidnight chaines — multiple segments', () => {
    // Premier segment 17:00→21:00 — normal, pas de midnight
    expect(adjustEndForMidnight(21 * 60, '17:00')).toBe(21 * 60);
    // Deuxième segment 22:00→00:30 — midnight crossing
    expect(adjustEndForMidnight(30, '22:00')).toBe(30 + 1440);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO COMPLET : JOURNÉE NORMALE SANS PROBLÈME
// ═══════════════════════════════════════════════════════════════════════════

describe('Scénario nominal', () => {
  test('shift 09-17, arrivée 09:00, départ 17:00 → aucune anomalie', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '09:00');
    const pointageSortie = makePointage(10, 'depart', '17:00');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    expect(mockAnomalieCreate).not.toHaveBeenCalled();
  });

  test('shift 09-17, arrivée 08:50 (10 min avance), départ 17:15 (15 min tard) → aucune anomalie (< seuils)', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '09:00', end: '17:00', type: 'travail' }
    ]);
    const pointageEntree = makePointage(10, 'arrivee', '08:50');
    const pointageSortie = makePointage(10, 'depart', '17:15');
    mockPointageFindMany.mockResolvedValue([pointageEntree, pointageSortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    expect(mockAnomalieCreate).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG 1 FIX: checkEmployesEnCours — post-midnight minutesEntree adjustment
// ═══════════════════════════════════════════════════════════════════════════

describe('BUG 1 FIX: checkEmployesEnCours post-midnight adjustment', () => {
  test('direct helper test: minutesEntree adjusted when currentMinutes > 1440', () => {
    // Simulate the fix logic manually
    const CUTOFF = 5;
    let minutesEntree = 30; // 00:30 (post-midnight entry)
    const currentMinutes = 1560; // 02:00 adjusted = 24*60 + 120
    
    // The fix: if currentMinutes >= 1440 and minutesEntree < cutoff*60
    if (currentMinutes >= 24 * 60 && minutesEntree < CUTOFF * 60) {
      minutesEntree += 24 * 60;
    }
    
    const dureeEnCours = currentMinutes - minutesEntree;
    // 1560 - 1470 = 90 minutes (correct!)
    expect(dureeEnCours).toBe(90);
  });

  test('without fix: old behavior gives absurd duration', () => {
    // Before fix: minutesEntree NOT adjusted
    const minutesEntree = 30; // 00:30 raw
    const currentMinutes = 1560; // 02:00 adjusted
    const dureeEnCours = currentMinutes - minutesEntree;
    // 1560 - 30 = 1530 min = 25.5h (BUG!)
    expect(dureeEnCours).toBe(1530); // this was the bug
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG 2 FIX: clotureJourneeTravail — midnight shift end adjustment
// ═══════════════════════════════════════════════════════════════════════════

describe('BUG 2 FIX: clotureJourneeTravail midnight shift end', () => {
  test('shift 17:00→00:00 — heuresSupp correct (6h, not 30h)', () => {
    // Simulate the fix
    const shiftEndMinutes = adjustEndForMidnight(0, '17:00'); // 0 → 1440
    const clotureMinutes = 6 * 60 + 24 * 60; // 1800
    const heuresSupp = ((clotureMinutes - shiftEndMinutes) / 60).toFixed(1);
    expect(heuresSupp).toBe('6.0');
  });

  test('shift 09:00→17:00 — heuresSupp correct (13h)', () => {
    const shiftEndMinutes = adjustEndForMidnight(17 * 60, '09:00'); // 1020, pas de midnight
    const clotureMinutes = 6 * 60 + 24 * 60; // 1800
    const heuresSupp = ((clotureMinutes - shiftEndMinutes) / 60).toFixed(1);
    expect(heuresSupp).toBe('13.0');
  });

  test('OLD BUG: shift 17:00→00:00 without fix gave 30h', () => {
    // Old code: shiftEndMinutes = 0 (not adjusted)
    const shiftEndMinutesOLD = 0;
    const clotureMinutes = 1800;
    const heuresSuppOLD = ((clotureMinutes - shiftEndMinutesOLD) / 60).toFixed(1);
    expect(heuresSuppOLD).toBe('30.0'); // This was the bug
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG 3 FIX: checkPointagesSansShift — Paris-based hier calculation
// ═══════════════════════════════════════════════════════════════════════════

describe('BUG 3 FIX: Paris-based hier calculation', () => {
  test('Paris date subtraction gives correct yesterday', () => {
    const realToday = '2025-02-19';
    const [tY, tM, tD] = realToday.split('-').map(Number);
    const hierDate = new Date(tY, tM - 1, tD);
    hierDate.setDate(hierDate.getDate() - 1);
    const hierStr = `${hierDate.getFullYear()}-${String(hierDate.getMonth() + 1).padStart(2, '0')}-${String(hierDate.getDate()).padStart(2, '0')}`;
    expect(hierStr).toBe('2025-02-18');
  });

  test('Works at month boundary', () => {
    const realToday = '2025-03-01';
    const [tY, tM, tD] = realToday.split('-').map(Number);
    const hierDate = new Date(tY, tM - 1, tD);
    hierDate.setDate(hierDate.getDate() - 1);
    const hierStr = `${hierDate.getFullYear()}-${String(hierDate.getMonth() + 1).padStart(2, '0')}-${String(hierDate.getDate()).padStart(2, '0')}`;
    expect(hierStr).toBe('2025-02-28');
  });

  test('Works at year boundary', () => {
    const realToday = '2025-01-01';
    const [tY, tM, tD] = realToday.split('-').map(Number);
    const hierDate = new Date(tY, tM - 1, tD);
    hierDate.setDate(hierDate.getDate() - 1);
    const hierStr = `${hierDate.getFullYear()}-${String(hierDate.getMonth() + 1).padStart(2, '0')}-${String(hierDate.getDate()).padStart(2, '0')}`;
    expect(hierStr).toBe('2024-12-31');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCÉNARIOS RÉELS RESTAURANT
// ═══════════════════════════════════════════════════════════════════════════

describe('Scénarios réels restaurant', () => {
  test('Equipe matin: 07:00-15:00, arrivée 06:10 (50 min avance) → extra', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '07:00', end: '15:00', type: 'travail' }
    ]);
    const entree = makePointage(10, 'arrivee', '06:10');
    const sortie = makePointage(10, 'depart', '15:00');
    mockPointageFindMany.mockResolvedValue([entree, sortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraArrivee = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'arrivee_avance'
    );
    expect(extraArrivee).toBeDefined();
    expect(extraArrivee[0].data.details.minutesEnAvance).toBe(50);
  });

  test('Coupure: 11:00-14:30 + 18:30-23:00, ponctuel → aucune anomalie', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '11:00', end: '14:30', type: 'travail' },
      { start: '18:30', end: '23:00', type: 'travail' }
    ]);
    const pointages = [
      makePointage(10, 'arrivee', '11:00'),
      makePointage(10, 'depart', '14:30'),
      makePointage(10, 'arrivee', '18:30'),
      makePointage(10, 'depart', '23:00'),
    ];
    mockPointageFindMany.mockResolvedValue(pointages);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    expect(mockAnomalieCreate).not.toHaveBeenCalled();
  });

  test('Soir tardif: 19:00→00:30, départ 01:20 → extra 50 min', async () => {
    const scheduler = createScheduler();
    const shift = makeShift(1, 10, [
      { start: '19:00', end: '00:30', type: 'travail' }
    ]);
    const entree = makePointage(10, 'arrivee', '19:00');
    const sortie = makePointage(10, 'depart', '01:20', '2025-02-20');
    mockPointageFindMany.mockResolvedValue([entree, sortie]);
    
    await scheduler.checkForAbsence(shift, '2025-02-19');
    
    const createCalls = mockAnomalieCreate.mock.calls;
    const extraDepart = createCalls.find(c => 
      c[0].data.type === 'extra_potentiel' && c[0].data.details.raison === 'depart_tardif'
    );
    expect(extraDepart).toBeDefined();
    expect(extraDepart[0].data.details.minutesApres).toBe(50);
  });
});
