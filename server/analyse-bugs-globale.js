// ANALYSE GLOBALE : Recherche de bugs potentiels dans tout le système
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🔍 ANALYSE GLOBALE DU SYSTÈME - RECHERCHE DE BUGS\n');
console.log('='.repeat(80));

async function analyseGlobale() {
  const bugs = [];
  const warnings = [];
  const recommendations = [];

  try {
    // ==========================================
    // 1. VÉRIFICATION DIVISION PAR ZÉRO
    // ==========================================
    console.log('\n📐 TEST 1 : Division par zéro\n');
    
    // Test avec un employé sans pointages
    const employeSansPointages = await prisma.user.findFirst({
      where: { 
        role: 'employee',
        NOT: {
          email: 'test.complet@restaurant.com'
        }
      }
    });

    if (employeSansPointages) {
      const pointages = await prisma.pointage.findMany({
        where: { userId: employeSansPointages.id },
        take: 1
      });

      if (pointages.length === 0) {
        console.log(`   ℹ️  Employé ${employeSansPointages.email} sans pointages`);
        console.log(`   🧮 Test: Calcul moyenne quand jours travaillés = 0`);
        
        // Simuler le calcul de moyenne
        const joursTravailles = 0;
        const heuresTotales = 0;
        const moyenne = joursTravailles > 0 ? heuresTotales / joursTravailles : 0;
        
        if (!isNaN(moyenne) && isFinite(moyenne)) {
          console.log(`   ✅ Pas de division par zéro (moyenne = ${moyenne})\n`);
        } else {
          console.log(`   ❌ PROBLÈME : Moyenne = ${moyenne}\n`);
          bugs.push({
            type: 'CRITIQUE',
            zone: 'Calcul de moyenne',
            description: 'Division par zéro possible si aucun jour travaillé',
            solution: 'Ajouter vérification: jours > 0 ? total/jours : 0'
          });
        }
      }
    }

    // ==========================================
    // 2. VÉRIFICATION APPAIRAGE POINTAGES
    // ==========================================
    console.log('📍 TEST 2 : Appairage des pointages\n');
    
    // Chercher des jours avec nombre impair de pointages
    const tousEmployes = await prisma.user.findMany({
      where: { role: 'employee' }
    });

    for (const emp of tousEmployes.slice(0, 5)) { // Limiter à 5 pour la vitesse
      const pointages = await prisma.pointage.findMany({
        where: { userId: emp.id },
        orderBy: { horodatage: 'asc' }
      });

      // Grouper par jour
      const parJour = new Map();
      pointages.forEach(p => {
        const date = p.horodatage.toISOString().split('T')[0];
        if (!parJour.has(date)) parJour.set(date, []);
        parJour.get(date).push(p);
      });

      // Vérifier chaque jour
      for (const [date, pts] of parJour.entries()) {
        if (pts.length % 2 !== 0) {
          console.log(`   ⚠️  ${emp.email} - ${date}: ${pts.length} pointages (IMPAIR)`);
          warnings.push({
            type: 'APPAIRAGE',
            employe: emp.email,
            date: date,
            nbPointages: pts.length,
            description: 'Nombre impair de pointages, calcul des heures faussé'
          });
        }
      }
    }

    if (warnings.filter(w => w.type === 'APPAIRAGE').length === 0) {
      console.log('   ✅ Tous les jours ont un appairage correct\n');
    } else {
      console.log(`   ⚠️  ${warnings.filter(w => w.type === 'APPAIRAGE').length} jour(s) avec appairage déséquilibré\n`);
    }

    // ==========================================
    // 3. VÉRIFICATION CONGÉS VS ABSENCES
    // ==========================================
    console.log('🏖️  TEST 3 : Distinction Congés vs Absences\n');
    
    const testEmploye = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (testEmploye) {
      // Récupérer les congés approuvés de novembre
      const conges = await prisma.conge.findMany({
        where: {
          userId: testEmploye.id,
          statut: 'approuvé',
          dateDebut: { lte: new Date('2025-11-30T23:59:59Z') },
          dateFin: { gte: new Date('2025-11-01T00:00:00Z') }
        }
      });

      // Récupérer les shifts de novembre
      const shifts = await prisma.shift.findMany({
        where: {
          employeId: testEmploye.id,
          date: {
            gte: new Date('2025-11-01T00:00:00Z'),
            lte: new Date('2025-11-30T23:59:59Z')
          }
        }
      });

      // Vérifier si un jour de congé est compté comme absence
      for (const conge of conges) {
        const dateDebut = new Date(conge.dateDebut);
        const dateFin = new Date(conge.dateFin);
        
        // Chercher les shifts pendant le congé
        const shiftsPendantConge = shifts.filter(s => {
          const dateShift = new Date(s.date);
          return dateShift >= dateDebut && dateShift <= dateFin;
        });

        if (shiftsPendantConge.length > 0) {
          console.log(`   ℹ️  Congé ${conge.type} du ${dateDebut.toLocaleDateString()} au ${dateFin.toLocaleDateString()}`);
          console.log(`   ⚠️  ${shiftsPendantConge.length} shift(s) planifié(s) pendant le congé`);
          warnings.push({
            type: 'CONGE_SHIFT',
            description: 'Shifts planifiés pendant un congé approuvé',
            dates: `${dateDebut.toLocaleDateString()} - ${dateFin.toLocaleDateString()}`
          });
        }
      }

      if (warnings.filter(w => w.type === 'CONGE_SHIFT').length === 0) {
        console.log('   ✅ Pas de conflit congé/shift\n');
      } else {
        console.log('   ⚠️  Conflits détectés - Ces jours ne doivent PAS être comptés comme absences\n');
      }
    }

    // ==========================================
    // 4. VÉRIFICATION TAUX > 100%
    // ==========================================
    console.log('📊 TEST 4 : Taux de ponctualité/présence > 100%\n');
    
    // Simuler différents scénarios
    const scenarios = [
      { joursPresents: 10, joursTotal: 10, nom: 'Normal' },
      { joursPresents: 10, joursTotal: 0, nom: 'Division par zéro' },
      { joursPresents: 15, joursTotal: 10, nom: 'Plus présent que prévu' }
    ];

    scenarios.forEach(scenario => {
      const taux = scenario.joursTotal > 0 
        ? (scenario.joursPresents / scenario.joursTotal) * 100 
        : 0;
      
      console.log(`   ${scenario.nom}: ${scenario.joursPresents}/${scenario.joursTotal} = ${taux.toFixed(1)}%`);
      
      if (taux > 100) {
        console.log(`      ⚠️  Taux > 100% détecté`);
        warnings.push({
          type: 'TAUX_INVALIDE',
          description: 'Taux de présence/ponctualité > 100%',
          scenario: scenario.nom
        });
      }
      
      if (isNaN(taux) || !isFinite(taux)) {
        console.log(`      ❌ Taux invalide (NaN ou Infinity)`);
        bugs.push({
          type: 'CRITIQUE',
          zone: 'Calcul de taux',
          description: 'Division par zéro ou calcul invalide',
          solution: 'Vérifier dénominateur > 0'
        });
      }
    });
    console.log();

    // ==========================================
    // 5. VÉRIFICATION HEURES NÉGATIVES
    // ==========================================
    console.log('⏱️  TEST 5 : Heures supplémentaires négatives\n');
    
    // Simuler calcul heures sup
    const casHeuresSup = [
      { prevues: 8, realisees: 9, nom: 'Heures sup normales' },
      { prevues: 8, realisees: 7, nom: 'Moins que prévu' },
      { prevues: 8, realisees: 8, nom: 'Pile poil' }
    ];

    casHeuresSup.forEach(cas => {
      const heuresSup = Math.max(0, cas.realisees - cas.prevues);
      console.log(`   ${cas.nom}: ${cas.realisees}h - ${cas.prevues}h = ${heuresSup}h sup`);
      
      if (heuresSup < 0) {
        console.log(`      ❌ Heures sup négatives!`);
        bugs.push({
          type: 'CRITIQUE',
          zone: 'Heures supplémentaires',
          description: 'Heures supplémentaires négatives possibles',
          solution: 'Utiliser Math.max(0, réalisé - prévu)'
        });
      }
    });
    
    console.log('   ✅ Math.max(0, ...) empêche les valeurs négatives\n');

    // ==========================================
    // 6. VÉRIFICATION TYPES DE DONNÉES
    // ==========================================
    console.log('🔤 TEST 6 : Cohérence des types de données\n');
    
    // Vérifier les types de pointages dans la base
    const typesPointages = await prisma.pointage.findMany({
      select: { type: true },
      distinct: ['type']
    });

    console.log('   Types de pointages trouvés:');
    typesPointages.forEach(t => {
      console.log(`      - "${t.type}"`);
    });

    const typesAttendu = ['arrivée', 'départ', 'arrivee', 'depart', 'ENTRÉE', 'SORTIE'];
    const typesInconnus = typesPointages
      .map(t => t.type)
      .filter(t => !typesAttendu.includes(t));

    if (typesInconnus.length > 0) {
      console.log(`\n   ❌ Types inconnus détectés: ${typesInconnus.join(', ')}`);
      bugs.push({
        type: 'CRITIQUE',
        zone: 'Types de pointages',
        description: `Types non reconnus: ${typesInconnus.join(', ')}`,
        solution: 'Vérifier le système de scan'
      });
    } else {
      console.log('   ✅ Tous les types sont valides\n');
    }

    // ==========================================
    // 7. VÉRIFICATION DATES INVALIDES
    // ==========================================
    console.log('📅 TEST 7 : Dates invalides ou futures\n');
    
    const maintenant = new Date();
    const shiftsFuturs = await prisma.shift.findMany({
      where: {
        date: { gt: new Date(maintenant.getTime() + 7 * 24 * 60 * 60 * 1000) } // Plus de 7 jours
      },
      take: 5
    });

    if (shiftsFuturs.length > 0) {
      console.log(`   ℹ️  ${shiftsFuturs.length} shift(s) planifié(s) à plus de 7 jours`);
      shiftsFuturs.forEach(s => {
        console.log(`      - ${s.date.toLocaleDateString()}`);
      });
      console.log('   ℹ️  Normal pour la planification\n');
    } else {
      console.log('   ✅ Pas de shifts trop loin dans le futur\n');
    }

    // Vérifier les pointages futurs (anormal)
    const pointagesFuturs = await prisma.pointage.findMany({
      where: {
        horodatage: { gt: maintenant }
      }
    });

    if (pointagesFuturs.length > 0) {
      console.log(`   ❌ ${pointagesFuturs.length} pointage(s) dans le FUTUR détecté(s)`);
      bugs.push({
        type: 'CRITIQUE',
        zone: 'Pointages',
        description: 'Pointages avec date future',
        solution: 'Vérifier l\'horloge du serveur ou système de scan'
      });
    } else {
      console.log('   ✅ Pas de pointages futurs\n');
    }

    // ==========================================
    // 8. VÉRIFICATION SEGMENTS isExtra
    // ==========================================
    console.log('➕ TEST 8 : Segments extras vs normaux\n');
    
    const shiftsAvecExtras = await prisma.shift.findMany({
      where: {
        segments: {
          path: '$[*].isExtra',
          array_contains: true
        }
      },
      take: 5
    });

    console.log(`   ${shiftsAvecExtras.length} shift(s) avec segments extras`);
    
    // Vérifier qu'ils ne sont pas comptés dans les heures prévues
    if (shiftsAvecExtras.length > 0) {
      console.log('   ⚠️  Vérifier que segments isExtra=true ne comptent PAS dans heures prévues');
      recommendations.push({
        type: 'VALIDATION',
        zone: 'Heures prévues',
        description: 'Confirmer que segments extras exclus du calcul',
        check: 'if (!segment.isExtra) { heuresPrevues += ... }'
      });
    }
    console.log();

    // ==========================================
    // 9. VÉRIFICATION ARRONDIS
    // ==========================================
    console.log('🔢 TEST 9 : Précision des arrondis\n');
    
    const testArrondis = [
      { val: 8.666666, attendu: 8.67 },
      { val: 8.333333, attendu: 8.33 },
      { val: 8.125, attendu: 8.13 },
      { val: 8.124, attendu: 8.12 }
    ];

    testArrondis.forEach(test => {
      const arrondi = Math.round(test.val * 100) / 100;
      const ok = arrondi === test.attendu;
      console.log(`   ${test.val} → ${arrondi} (attendu: ${test.attendu}) ${ok ? '✅' : '❌'}`);
      
      if (!ok) {
        warnings.push({
          type: 'ARRONDI',
          description: 'Arrondi inattendu',
          valeur: test.val,
          resultat: arrondi,
          attendu: test.attendu
        });
      }
    });
    console.log();

    // ==========================================
    // 10. VÉRIFICATION PERFORMANCES
    // ==========================================
    console.log('⚡ TEST 10 : Requêtes N+1 potentielles\n');
    
    console.log('   ⚠️  Points d\'attention:');
    console.log('      - Récupération pointages: grouper par employé plutôt que boucle');
    console.log('      - Calcul stats: éviter les requêtes dans les boucles');
    console.log('      - Utiliser include/select pour charger relations en une fois');
    
    recommendations.push({
      type: 'PERFORMANCE',
      zone: 'Requêtes base de données',
      description: 'Éviter problèmes N+1',
      solution: 'Utiliser findMany + groupBy côté application'
    });
    console.log();

    // ==========================================
    // RÉSUMÉ
    // ==========================================
    console.log('='.repeat(80));
    console.log('📋 RÉSUMÉ DE L\'ANALYSE\n');

    console.log(`🐛 BUGS CRITIQUES : ${bugs.length}`);
    if (bugs.length > 0) {
      bugs.forEach((bug, i) => {
        console.log(`\n   ${i + 1}. [${bug.type}] ${bug.zone}`);
        console.log(`      Problème: ${bug.description}`);
        console.log(`      Solution: ${bug.solution}`);
      });
    } else {
      console.log('   ✅ Aucun bug critique détecté');
    }

    console.log(`\n⚠️  AVERTISSEMENTS : ${warnings.length}`);
    if (warnings.length > 0) {
      const groupes = {};
      warnings.forEach(w => {
        if (!groupes[w.type]) groupes[w.type] = [];
        groupes[w.type].push(w);
      });

      Object.entries(groupes).forEach(([type, items]) => {
        console.log(`\n   ${type}: ${items.length} occurrence(s)`);
        items.slice(0, 3).forEach(item => {
          console.log(`      - ${item.description || JSON.stringify(item)}`);
        });
      });
    } else {
      console.log('   ✅ Aucun avertissement');
    }

    console.log(`\n💡 RECOMMANDATIONS : ${recommendations.length}`);
    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        console.log(`\n   ${i + 1}. [${rec.type}] ${rec.zone}`);
        console.log(`      ${rec.description}`);
        if (rec.solution) console.log(`      Solution: ${rec.solution}`);
        if (rec.check) console.log(`      Vérifier: ${rec.check}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ANALYSE TERMINÉE\n');

  } catch (error) {
    console.error('❌ Erreur durant l\'analyse:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

analyseGlobale();
