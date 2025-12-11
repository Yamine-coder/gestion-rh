const prisma = require('./prisma/client');
const axios = require('axios');

async function testComparaisonsAbsences() {
  try {
    // 1. Lister tous les employés
    const employees = await prisma.user.findMany({ 
      where: { role: 'employee' },
      select: { id: true, email: true, nom: true, prenom: true }
    });
    
    console.log('=== TEST COMPARAISONS POUR DÉTECTER ABSENCES ===\n');
    console.log('👥 Employés à vérifier:', employees.length);
    employees.forEach((e, idx) => {
      console.log(`  ${idx + 1}. ${e.prenom} ${e.nom} (ID: ${e.id})`);
    });
    
    // 2. Vérifier qui a un planning aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const plannings = await prisma.planning.findMany({
      where: {
        date: { gte: today, lt: tomorrow }
      },
      include: { user: { select: { nom: true, prenom: true } } }
    });
    
    console.log('\n📅 Plannings aujourd\'hui:', plannings.length);
    const employesAvecPlanning = new Set(plannings.map(p => p.userId));
    console.log('   Employés avec planning:', employesAvecPlanning.size);
    plannings.forEach(p => {
      console.log(`   - ${p.user.prenom} ${p.user.nom} : ${p.heureDebut} - ${p.heureFin}`);
    });
    
    // 3. Qui a pointé?
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: today, lt: tomorrow }
      },
      include: { user: { select: { nom: true, prenom: true } } }
    });
    
    const employesAyantPointe = new Set(pointages.map(p => p.userId));
    console.log('\n✅ Ont pointé:', employesAyantPointe.size);
    pointages.forEach(p => {
      console.log(`   - ${p.user.prenom} ${p.user.nom}`);
    });
    
    // 4. Analyse des absences détectables par les comparaisons
    console.log('\n🔍 ANALYSE DES ABSENCES DÉTECTABLES:\n');
    
    let absencesDetectees = 0;
    let employesSansPlanning = 0;
    
    for (const emp of employees) {
      const aPlanning = employesAvecPlanning.has(emp.id);
      const aPointe = employesAyantPointe.has(emp.id);
      
      if (!aPlanning) {
        employesSansPlanning++;
        console.log(`   ⚪ ${emp.prenom} ${emp.nom} - PAS de planning (non détectable par comparaisons)`);
      } else if (!aPointe) {
        absencesDetectees++;
        console.log(`   ❌ ${emp.prenom} ${emp.nom} - Planning MAIS pas pointé (ABSENCE DÉTECTÉE)`);
      } else {
        console.log(`   ✅ ${emp.prenom} ${emp.nom} - Planning ET pointé (OK)`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ:\n');
    console.log(`   Total employés:                          ${employees.length}`);
    console.log(`   Ont un planning aujourd'hui:             ${employesAvecPlanning.size}`);
    console.log(`   N'ont PAS de planning:                   ${employesSansPlanning}`);
    console.log(`   Ont pointé:                              ${employesAyantPointe.size}`);
    console.log(`   ─────────────────────────────────────────────────────────`);
    console.log(`   Absences détectées par comparaisons:     ${absencesDetectees} (ont planning mais pas pointé)`);
    console.log(`   Absences NON détectables:                ${employesSansPlanning} (pas de planning)`);
    console.log(`   ─────────────────────────────────────────────────────────`);
    console.log(`   TOTAL absents réels:                     ${employees.length - employesAyantPointe.size}`);
    console.log('='.repeat(70));
    
    console.log('\n💡 EXPLICATION:\n');
    console.log(`   Le système de COMPARAISONS détecte ${absencesDetectees} absences`);
    console.log(`   car il compare le PLANNING vs la RÉALITÉ.`);
    console.log(`   `);
    console.log(`   Les ${employesSansPlanning} employés SANS planning ne sont pas détectés`);
    console.log(`   par les comparaisons car il n'y a rien à comparer !`);
    console.log(`   `);
    console.log(`   C'est pourquoi vous voyez "${absencesDetectees}" dans les anomalies`);
    console.log(`   mais "${employees.length - employesAyantPointe.size}" absents réels.`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testComparaisonsAbsences();
