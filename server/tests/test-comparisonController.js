/**
 * Tests ciblés pour getPlanningVsRealite
 * Vérifie:
 * 1. Découpage jour business (cutoff 05:00)
 * 2. Fenêtre SQL large + filtrage business
 * 3. Déduplication pointages (fenêtre 2 min)
 */

const path = require('path');
const assert = (cond, msg) => { if (!cond) throw new Error('Assertion failed: ' + msg); };

// ------------------ Jeu de données mock ------------------
const EMP_ID = 123;
// Shifts: un shift avant cutoff (doit basculer sur J-1 business) et un après cutoff (reste sur le jour demandé)
// Remarque: en août (UTC+2), pour être <05:00 Paris il faut <03:00 UTC.
const shiftsPrevus = [
  {
    id: 1,
    employeId: EMP_ID,
    date: new Date('2025-08-28T02:30:00.000Z'), // 04:30 Paris -> business day 27
    type: 'présence',
    segments: [ { start: '06:00', end: '14:00' } ]
  },
  {
    id: 2,
    employeId: EMP_ID,
    date: new Date('2025-08-28T07:30:00.000Z'), // 09:30 Paris -> business day 28
    type: 'présence',
    segments: [ { start: '07:00', end: '14:00' } ]
  }
];

// Pointages: avant cutoff (doit aller sur J-1), après cutoff + doublons + départs
const pointagesReels = [
  { id: 1, userId: EMP_ID, type: 'arrivee',  horodatage: new Date('2025-08-28T02:55:00.000Z') }, // 04:55 Paris -> business 27
  { id: 2, userId: EMP_ID, type: 'arrivee',  horodatage: new Date('2025-08-28T05:01:00.000Z') }, // business 28 (très tôt / hors plage possible)
  { id: 3, userId: EMP_ID, type: 'arrivee',  horodatage: new Date('2025-08-28T07:00:00.000Z') }, // arrivée normale
  { id: 4, userId: EMP_ID, type: 'arrivee',  horodatage: new Date('2025-08-28T07:01:00.000Z') }, // doublon (<2min) doit être ignoré
  { id: 5, userId: EMP_ID, type: 'depart',   horodatage: new Date('2025-08-28T14:00:00.000Z') }, // départ normal
  { id: 6, userId: EMP_ID, type: 'depart',   horodatage: new Date('2025-08-28T14:01:00.000Z') }, // doublon départ (<2min) ignoré
  { id: 7, userId: EMP_ID, type: 'depart',   horodatage: new Date('2025-08-28T14:40:00.000Z') }, // départ orphelin conservé
];

// ------------------ Mock Prisma avant import du contrôleur ------------------
let mockShifts = shiftsPrevus;
let mockPointages = pointagesReels;
const prismaMock = {
  shift: { findMany: async () => mockShifts },
  pointage: { findMany: async () => mockPointages }
};
const prismaPath = path.resolve(__dirname, '..', 'prisma', 'client.js');
require.cache[prismaPath] = { exports: prismaMock };

// Import après mise en cache mock
const { getPlanningVsRealite } = require('../controllers/comparisonController');

async function runTest() {
  const req = { query: { employeId: String(EMP_ID), date: '2025-08-28' } };
  let statusCode = 200; let jsonPayload = null;
  const res = {
    status(code){ statusCode = code; return this; },
    json(payload){ jsonPayload = payload; }
  };

  await getPlanningVsRealite(req, res);

  assert(statusCode === 200, 'status 200');
  assert(jsonPayload && jsonPayload.success, 'payload success');
  const { comparaisons } = jsonPayload;
  assert(Array.isArray(comparaisons) && comparaisons.length === 1, 'une seule journée comparée');

  const day = comparaisons[0];
  // Vérifier qu’on est bien sur la date demandée
  assert(day.date === '2025-08-28', 'date business correcte');

  // 1. Shift avant cutoff (04:30) ne doit PAS apparaître ce jour-là
  const shiftIds = day.planifie.map(p => p.shiftId).filter(Boolean);
  if (shiftIds.includes(1)) {
    console.error('DEBUG shift 1 présent, dataset / calcul cutoff incohérent');
  }
  assert(!shiftIds.includes(1), 'shift avant cutoff exclu');
  assert(shiftIds.includes(2), 'shift après cutoff présent');

  // 2. Déduplication: arrivée 07:01 et départ 14:01 supprimés
  const rawArrivees = day.reel.map(r => r.arrivee).filter(Boolean);
  const rawDeparts = day.reel.map(r => r.depart).filter(Boolean);
  // On ne peut pas s’appuyer sur l’heure exacte (conversion fuseau) : on teste le nombre
  // Attendu: 1 pair (arrivée+départ) + 1 départ orphelin => arrivees:1, departs:2
  assert(rawArrivees.length === 1, 'une seule arrivée après dédup');
  assert(rawDeparts.length === 2, 'deux départs (dont un orphelin)');

  // 3. Vérifier présence d’un départ orphelin (arrivee null)
  const hasOrphelin = day.reel.some(r => !r.arrivee && r.depart);
  assert(hasOrphelin, 'départ orphelin conservé');

  console.log('✅ TEST PRINCIPAL OK');

  // --- Test validation employeId ---
  {
    const badReq = { query: { employeId: 'abc', date: '2025-08-28' } };
    let code=200, payload=null;
    const resBad = { status(c){ code=c; return this; }, json(p){ payload=p; } };
    await getPlanningVsRealite(badReq, resBad);
    assert(code===400 && payload.error, 'validation employeId invalide');
    console.log('✅ Validation employeId OK');
  }

  // --- Test DST (ex: passage heure d’été -> hiver fin octobre) ---
  // Fournir un pointage le 26 octobre 02:30 local Paris (ambigue). On simule deux timestamps UTC
  // Hypothèse: utilisation de toLocale pour projection => découpage basé sur heure locale.
  mockShifts = [
    { id: 10, employeId: EMP_ID, date: new Date('2025-10-26T05:30:00.000Z'), type: 'présence', segments: [ { start:'06:00', end:'10:00' } ] }
  ];
  mockPointages = [
    { id: 50, userId: EMP_ID, type: 'arrivee', horodatage: new Date('2025-10-26T04:10:00.000Z') },
    { id: 51, userId: EMP_ID, type: 'depart',  horodatage: new Date('2025-10-26T09:05:00.000Z') }
  ];
  {
    const req2 = { query: { employeId: String(EMP_ID), date: '2025-10-26' } };
    let sc=200, pl=null; const res2 = { status(c){ sc=c; return this; }, json(p){ pl=p; } };
    await getPlanningVsRealite(req2, res2);
    assert(sc===200 && pl.success, 'DST test success');
    console.log('✅ Test DST OK');
  }

  console.log('✅ TOUS TESTS OK');
}

runTest().catch(e => { console.error('❌ TEST ÉCHEC:', e.message); process.exit(1); });
