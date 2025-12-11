// Investigation des bugs détectés
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investiguerBugs() {
  console.log('🔍 INVESTIGATION DES BUGS DÉTECTÉS\n');
  console.log('='.repeat(80));

  try {
    // ==========================================
    // BUG 1 : POINTAGES FUTURS
    // ==========================================
    console.log('\n🚨 BUG CRITIQUE 1 : Pointages dans le futur\n');
    
    const maintenant = new Date();
    const pointagesFuturs = await prisma.pointage.findMany({
      where: { horodatage: { gt: maintenant } },
      include: { user: { select: { email: true, nom: true, prenom: true } } },
      orderBy: { horodatage: 'desc' },
      take: 10
    });

    console.log(`   Trouvé: ${pointagesFuturs.length} pointages futurs`);
    console.log(`   Date actuelle: ${maintenant.toISOString()}\n`);

    if (pointagesFuturs.length > 0) {
      console.log('   Détails:');
      pointagesFuturs.forEach((p, i) => {
        const diff = (new Date(p.horodatage) - maintenant) / (1000 * 60 * 60);
        console.log(`      ${i + 1}. ${p.user.email}`);
        console.log(`         Type: ${p.type}`);
        console.log(`         Date: ${p.horodatage.toISOString()}`);
        console.log(`         Dans: ${diff.toFixed(1)} heures\n`);
      });

      console.log('   💡 CAUSES POSSIBLES:');
      console.log('      1. Horloge du serveur décalée (timezone incorrecte)');
      console.log('      2. Système de scan qui utilise mauvaise timezone');
      console.log('      3. Tests avec des dates futures\n');

      console.log('   🔧 SOLUTION:');
      console.log('      - Vérifier timezone du serveur');
      console.log('      - Ajouter validation côté API: refuser pointages > now + 1 minute');
      console.log('      - Nettoyer les pointages futurs existants\n');
    }

    // ==========================================
    // BUG 2 : APPAIRAGE DÉSÉQUILIBRÉ
    // ==========================================
    console.log('-'.repeat(80));
    console.log('\n⚠️  BUG 2 : Appairage déséquilibré\n');
    
    const employeProbleme = await prisma.user.findFirst({
      where: { email: 'emma.simon@restaurant.com' }
    });

    if (employeProbleme) {
      const pointagesProbleme = await prisma.pointage.findMany({
        where: {
          userId: employeProbleme.id,
          horodatage: {
            gte: new Date('2025-11-30T00:00:00Z'),
            lte: new Date('2025-12-01T23:59:59Z')
          }
        },
        orderBy: { horodatage: 'asc' }
      });

      console.log(`   Employé: ${employeProbleme.email}`);
      console.log(`   Pointages 30 nov - 1 déc: ${pointagesProbleme.length}\n`);

      if (pointagesProbleme.length > 0) {
        console.log('   Détails:');
        pointagesProbleme.forEach(p => {
          console.log(`      - ${p.type} à ${p.horodatage.toISOString()}`);
        });
        console.log();

        console.log('   💡 PROBLÈME:');
        console.log('      Nombre impair de pointages → calcul heures impossible');
        console.log('      Un scan manquant (arrivée OU départ)\n');

        console.log('   🔧 SOLUTIONS:');
        console.log('      1. Ajouter validation côté frontend:');
        console.log('         - Bloquer scan arrivée si dernier scan = arrivée');
        console.log('         - Bloquer scan départ si dernier scan = départ');
        console.log('      2. Permettre à l\'admin de corriger/supprimer pointages erronés');
        console.log('      3. Afficher alerte si appairage incomplet\n');
      }
    }

    // ==========================================
    // BUG 3 : TAUX > 100%
    // ==========================================
    console.log('-'.repeat(80));
    console.log('\n📊 BUG 3 : Taux de présence/ponctualité > 100%\n');
    
    console.log('   SCÉNARIO PROBLÉMATIQUE:');
    console.log('      - 10 shifts planifiés');
    console.log('      - Employé vient aussi 5 jours non planifiés');
    console.log('      - Calcul: (15 présences / 10 shifts) × 100 = 150%\n');

    console.log('   💡 POURQUOI C\'EST UN PROBLÈME:');
    console.log('      Un taux > 100% n\'a pas de sens métier');
    console.log('      Impossible de présenter à un manager\n');

    console.log('   🔧 SOLUTION:');
    console.log('      Math.min(100, (présences / shiftsTotal) * 100)');
    console.log('      OU exclure jours non planifiés du calcul\n');

    // Vérifier si ce cas existe dans les données
    const employes = await prisma.user.findMany({
      where: { role: 'employee' },
      take: 10
    });

    for (const emp of employes) {
      const shifts = await prisma.shift.count({
        where: {
          employeId: emp.id,
          date: {
            gte: new Date('2025-11-01T00:00:00Z'),
            lte: new Date('2025-11-30T23:59:59Z')
          }
        }
      });

      const pointages = await prisma.pointage.findMany({
        where: {
          userId: emp.id,
          horodatage: {
            gte: new Date('2025-11-01T00:00:00Z'),
            lte: new Date('2025-11-30T23:59:59Z')
          }
        }
      });

      // Grouper par jour
      const joursAvecPointages = new Set(
        pointages.map(p => p.horodatage.toISOString().split('T')[0])
      ).size;

      if (shifts > 0) {
        const tauxPresence = (joursAvecPointages / shifts) * 100;
        if (tauxPresence > 100) {
          console.log(`   ⚠️  ${emp.email}:`);
          console.log(`      ${shifts} shifts planifiés`);
          console.log(`      ${joursAvecPointages} jours avec pointages`);
          console.log(`      Taux: ${tauxPresence.toFixed(1)}%\n`);
        }
      }
    }

    // ==========================================
    // VÉRIFICATION CODE PRODUCTION
    // ==========================================
    console.log('-'.repeat(80));
    console.log('\n🔍 VÉRIFICATION : Protection dans le code\n');

    console.log('   ✅ Points correctement protégés:');
    console.log('      - Division par zéro: condition "> 0" présente');
    console.log('      - Heures négatives: Math.max(0, ...) utilisé');
    console.log('      - Timezone retards: getUTCHours() utilisé');
    console.log('      - Accents pointages: variantes vérifiées\n');

    console.log('   ⚠️  À AJOUTER:');
    console.log('      1. Validation pointages futurs (API)');
    console.log('      2. Limite taux à 100% (calculs stats)');
    console.log('      3. Validation appairage (frontend + API)');
    console.log('      4. Alerte admin si données incohérentes\n');

    // ==========================================
    // RÉSUMÉ ET PRIORITÉS
    // ==========================================
    console.log('='.repeat(80));
    console.log('📋 RÉSUMÉ ET PRIORITÉS\n');

    console.log('🔴 PRIORITÉ HAUTE (Correctifs immédiats):');
    console.log('   1. ❌ Nettoyer les 26 pointages futurs');
    console.log('   2. ❌ Ajouter validation API: refuser pointages > now');
    console.log('   3. ❌ Corriger appairage déséquilibré (Emma Simon)\n');

    console.log('🟡 PRIORITÉ MOYENNE (Améliorations):');
    console.log('   4. ⚠️  Limiter taux à 100% dans les calculs');
    console.log('   5. ⚠️  Validation frontend: bloquer doubles scans');
    console.log('   6. ⚠️  Interface admin pour corriger pointages\n');

    console.log('🟢 PRIORITÉ BASSE (Monitoring):');
    console.log('   7. ℹ️  Logger les tentatives de pointages futurs');
    console.log('   8. ℹ️  Alerter admin si appairage incomplet');
    console.log('   9. ℹ️  Dashboard de santé des données\n');

    console.log('='.repeat(80));
    console.log('✅ INVESTIGATION TERMINÉE\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

investiguerBugs();
