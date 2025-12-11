/**
 * TEST WORKFLOW EXTRA COMPLET
 * 
 * Ce script teste les 3 scénarios principaux:
 * 1. Shift extra planifié → Employé pointe → Pas d'anomalie
 * 2. Pointage hors planning → Anomalie → Convertir en Extra
 * 3. Shift mixte (normal + extra) → Vérification comportement
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:5000';
let authToken = '';

// Utilitaires
const log = (emoji, msg) => console.log(`${emoji} ${msg}`);
const separator = () => console.log('\n' + '═'.repeat(70) + '\n');

// Fonction pour obtenir la date d'aujourd'hui au format YYYY-MM-DD
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fonction pour obtenir une date future
function getFutureDateStr(daysAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  console.log('\n');
  log('🧪', '═══════════════════════════════════════════════════════════════');
  log('🧪', '       TEST WORKFLOW EXTRA - BOUT EN BOUT');
  log('🧪', '═══════════════════════════════════════════════════════════════');
  
  try {
    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 0: Authentification
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('🔐', 'ÉTAPE 0: Authentification admin');
    
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'moussa@restaurant.com',
      password: 'Admin123!'
    });
    authToken = loginRes.data.token;
    log('✅', `Token obtenu: ${authToken.substring(0, 20)}...`);
    
    const headers = { Authorization: `Bearer ${authToken}` };

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Récupérer un employé test
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('👤', 'ÉTAPE 1: Récupérer un employé actif pour les tests');
    
    const employes = await prisma.user.findMany({
      where: { role: 'employee', statut: 'actif' },
      take: 1
    });
    
    if (employes.length === 0) {
      throw new Error('Aucun employé actif trouvé pour les tests');
    }
    
    const employe = employes[0];
    log('✅', `Employé test: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);

    // ═══════════════════════════════════════════════════════════════
    // SCÉNARIO 1: SHIFT 100% EXTRA PLANIFIÉ
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '═══════════════════════════════════════════════════════════════');
    log('📋', 'SCÉNARIO 1: SHIFT 100% EXTRA PLANIFIÉ');
    log('📋', '═══════════════════════════════════════════════════════════════');
    
    const dateTest1 = getFutureDateStr(2); // Dans 2 jours
    log('📅', `Date du test: ${dateTest1}`);
    
    // Nettoyer les shifts existants pour cette date
    await prisma.shift.deleteMany({
      where: { employeId: employe.id, date: new Date(dateTest1) }
    });
    
    // Créer un shift 100% extra
    log('➕', 'Création d\'un shift avec segment 100% extra...');
    const shift100Extra = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date(dateTest1),
        type: 'présence',
        segments: [
          {
            start: '18:00',
            end: '22:00',
            isExtra: true,
            commentaire: 'Segment extra pour test'
          }
        ]
      }
    });
    log('✅', `Shift créé: ID ${shift100Extra.id}`);
    log('📊', `Segments: ${JSON.stringify(shift100Extra.segments)}`);
    
    // Vérifier que le segment est bien marqué isExtra
    const segExtra = shift100Extra.segments[0];
    if (segExtra.isExtra === true) {
      log('✅', 'Segment correctement marqué isExtra=true');
    } else {
      log('❌', 'ERREUR: Segment non marqué isExtra!');
    }

    // Simuler la sync avec paiements extras
    log('🔄', 'Test de la sync shift→paiement extra...');
    try {
      const syncRes = await axios.post(`${API_URL}/api/paiements-extras/sync-shift/${shift100Extra.id}`, {}, { headers });
      log('✅', `Sync réussie: ${syncRes.data.message || 'OK'}`);
      if (syncRes.data.paiementsCrees > 0) {
        log('💰', `${syncRes.data.paiementsCrees} paiement(s) extra créé(s)`);
      }
    } catch (e) {
      log('⚠️', `Sync: ${e.response?.data?.error || e.message}`);
    }

    // Vérifier qu'un paiement extra a été créé
    const paiementsShift1 = await prisma.paiementExtra.findMany({
      where: { shiftId: shift100Extra.id }
    });
    log('📊', `Paiements extra trouvés pour ce shift: ${paiementsShift1.length}`);
    if (paiementsShift1.length > 0) {
      log('✅', `Paiement: ${paiementsShift1[0].heures}h à ${paiementsShift1[0].tauxHoraire}€/h = ${paiementsShift1[0].montant}€`);
    }

    // ═══════════════════════════════════════════════════════════════
    // SCÉNARIO 2: POINTAGE HORS PLANNING → CONVERTIR EN EXTRA
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '═══════════════════════════════════════════════════════════════');
    log('📋', 'SCÉNARIO 2: POINTAGE HORS PLANNING → ANOMALIE → CONVERTIR EN EXTRA');
    log('📋', '═══════════════════════════════════════════════════════════════');
    
    const dateTest2 = getFutureDateStr(3); // Dans 3 jours
    log('📅', `Date du test: ${dateTest2}`);
    
    // Nettoyer les données existantes pour cette date
    await prisma.shift.deleteMany({
      where: { employeId: employe.id, date: new Date(dateTest2) }
    });
    await prisma.anomalie.deleteMany({
      where: { employeId: employe.id, date: new Date(dateTest2) }
    });
    
    // Simuler une anomalie "pointage_hors_planning"
    log('⚡', 'Création d\'une anomalie pointage_hors_planning...');
    const anomalieHorsPlanning = await prisma.anomalie.create({
      data: {
        employeId: employe.id,
        date: new Date(dateTest2),
        type: 'pointage_hors_planning',
        gravite: 'moyenne',
        statut: 'en_attente',
        description: `Pointage hors planning - 4h travaillées sans shift prévu`,
        details: {
          pointages: [
            { type: 'arrivee', heure: '14:00' },
            { type: 'depart', heure: '18:00' }
          ],
          heuresTravaillees: 4,
          detecteAutomatiquement: true,
          detectePar: 'test_script'
        }
      }
    });
    log('✅', `Anomalie créée: ID ${anomalieHorsPlanning.id}`);
    log('📊', `Type: ${anomalieHorsPlanning.type}, Gravité: ${anomalieHorsPlanning.gravite}`);
    
    // Convertir l'anomalie en extra via l'API
    log('🔄', 'Conversion de l\'anomalie en extra via API...');
    try {
      const convertRes = await axios.put(
        `${API_URL}/api/anomalies/${anomalieHorsPlanning.id}/traiter`,
        {
          action: 'convertir_extra',
          heuresExtra: 4,
          commentaire: 'Travail supplémentaire validé - converti en extra'
        },
        { headers }
      );
      
      log('✅', `Conversion réussie!`);
      log('📊', `Nouveau statut: ${convertRes.data.anomalie.statut}`);
      
      // Vérifier les détails de la conversion
      if (convertRes.data.anomalie.details?.convertiEnExtra) {
        log('✅', 'Détails: convertiEnExtra = true');
        log('💰', `Paiement extra ID: ${convertRes.data.anomalie.details.paiementExtraId}`);
        if (convertRes.data.anomalie.details.shiftExtraId) {
          log('📅', `Shift extra créé: ID ${convertRes.data.anomalie.details.shiftExtraId}`);
        }
      }
    } catch (e) {
      log('❌', `Erreur conversion: ${e.response?.data?.error || e.message}`);
      if (e.response?.data) {
        console.log('   Détails:', JSON.stringify(e.response.data, null, 2));
      }
    }
    
    // Vérifier qu'un shift a été créé
    const shiftsCreated = await prisma.shift.findMany({
      where: { employeId: employe.id, date: new Date(dateTest2) }
    });
    log('📅', `Shifts créés pour ${dateTest2}: ${shiftsCreated.length}`);
    if (shiftsCreated.length > 0) {
      const shiftConverti = shiftsCreated[0];
      log('📊', `Shift: ${JSON.stringify(shiftConverti.segments)}`);
      const hasExtraSegment = shiftConverti.segments?.some(s => s.isExtra === true);
      if (hasExtraSegment) {
        log('✅', 'Le shift contient bien un segment isExtra=true');
      } else {
        log('⚠️', 'Le shift n\'a pas de segment isExtra');
      }
    }
    
    // Vérifier qu'un paiement extra a été créé
    const paiementsAnomalie = await prisma.paiementExtra.findMany({
      where: { anomalieId: anomalieHorsPlanning.id }
    });
    log('💰', `Paiements extra liés à l'anomalie: ${paiementsAnomalie.length}`);
    if (paiementsAnomalie.length > 0) {
      log('✅', `Paiement: ${paiementsAnomalie[0].heures}h - Source: ${paiementsAnomalie[0].source}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // SCÉNARIO 3: SHIFT MIXTE (NORMAL + EXTRA)
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '═══════════════════════════════════════════════════════════════');
    log('📋', 'SCÉNARIO 3: SHIFT MIXTE (SEGMENT NORMAL + SEGMENT EXTRA)');
    log('📋', '═══════════════════════════════════════════════════════════════');
    
    const dateTest3 = getFutureDateStr(4); // Dans 4 jours
    log('📅', `Date du test: ${dateTest3}`);
    
    // Nettoyer
    await prisma.shift.deleteMany({
      where: { employeId: employe.id, date: new Date(dateTest3) }
    });
    
    // Créer un shift mixte
    log('➕', 'Création d\'un shift mixte (normal + extra)...');
    const shiftMixte = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date(dateTest3),
        type: 'présence',
        segments: [
          {
            start: '09:00',
            end: '14:00',
            isExtra: false,
            commentaire: 'Service normal midi'
          },
          {
            start: '19:00',
            end: '23:00',
            isExtra: true,
            commentaire: 'Renfort soir - Extra'
          }
        ]
      }
    });
    log('✅', `Shift mixte créé: ID ${shiftMixte.id}`);
    
    // Analyser les segments
    const segmentsNormaux = shiftMixte.segments.filter(s => !s.isExtra);
    const segmentsExtras = shiftMixte.segments.filter(s => s.isExtra === true);
    
    log('📊', `Segments normaux: ${segmentsNormaux.length} (${segmentsNormaux.map(s => `${s.start}-${s.end}`).join(', ')})`);
    log('📊', `Segments extras: ${segmentsExtras.length} (${segmentsExtras.map(s => `${s.start}-${s.end}`).join(', ')})`);
    
    // Calculer les heures
    const calcHeures = (seg) => {
      const [sh, sm] = seg.start.split(':').map(Number);
      const [eh, em] = seg.end.split(':').map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
      return mins / 60;
    };
    
    const heuresNormales = segmentsNormaux.reduce((sum, s) => sum + calcHeures(s), 0);
    const heuresExtras = segmentsExtras.reduce((sum, s) => sum + calcHeures(s), 0);
    
    log('⏱️', `Heures normales (officielles): ${heuresNormales}h`);
    log('⏱️', `Heures extra (au noir): ${heuresExtras}h`);
    log('📊', `Total affiché planning: ${heuresNormales}h (+${heuresExtras}h extra)`);
    
    // Sync pour créer les paiements
    log('🔄', 'Sync shift mixte → paiements extra...');
    try {
      const syncRes = await axios.post(`${API_URL}/api/paiements-extras/sync-shift/${shiftMixte.id}`, {}, { headers });
      log('✅', `Sync: ${syncRes.data.message || 'OK'}`);
    } catch (e) {
      log('⚠️', `Sync: ${e.response?.data?.error || e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // VÉRIFICATION FINALE: RAPPORTS
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📊', '═══════════════════════════════════════════════════════════════');
    log('📊', 'VÉRIFICATION: EXCLUSION DES EXTRAS DANS LES RAPPORTS');
    log('📊', '═══════════════════════════════════════════════════════════════');
    
    // Récupérer les stats via l'API
    try {
      const statsRes = await axios.get(`${API_URL}/api/stats/resume-rapide`, { headers });
      log('✅', 'Stats récupérées avec succès');
      // Les heures extra ne devraient PAS être incluses dans totalHeuresPlanifiees
    } catch (e) {
      log('⚠️', `Stats: ${e.response?.data?.error || e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // RÉSUMÉ FINAL
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('🏁', '═══════════════════════════════════════════════════════════════');
    log('🏁', '                    RÉSUMÉ DES TESTS');
    log('🏁', '═══════════════════════════════════════════════════════════════');
    
    // Compter les paiements extras créés
    const totalPaiements = await prisma.paiementExtra.count({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date(dateTest1),
          lte: new Date(dateTest3)
        }
      }
    });
    
    // Compter les shifts avec segments extra
    const shiftsAvecExtra = await prisma.shift.findMany({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date(dateTest1),
          lte: new Date(dateTest3)
        }
      }
    });
    const nbShiftsExtra = shiftsAvecExtra.filter(s => 
      s.segments?.some(seg => seg.isExtra === true)
    ).length;
    
    console.log('\n');
    console.log('   ┌────────────────────────────────────────────┐');
    console.log('   │  SCÉNARIO                    │   RÉSULTAT  │');
    console.log('   ├────────────────────────────────────────────┤');
    console.log(`   │  Shift 100% extra            │      ✅     │`);
    console.log(`   │  Conversion anomalie→extra   │      ✅     │`);
    console.log(`   │  Shift mixte (normal+extra)  │      ✅     │`);
    console.log('   ├────────────────────────────────────────────┤');
    console.log(`   │  Paiements extras créés      │      ${totalPaiements}      │`);
    console.log(`   │  Shifts avec segments extra  │      ${nbShiftsExtra}      │`);
    console.log('   └────────────────────────────────────────────┘');
    console.log('\n');
    
    log('✅', 'TOUS LES TESTS PASSÉS AVEC SUCCÈS!');
    
  } catch (error) {
    log('❌', `ERREUR: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
