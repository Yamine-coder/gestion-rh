// Script pour ajouter des scénarios d'anomalies variés
// Usage: node scripts/add-anomalies-scenarios.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAnomaliesScenarios() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎭 AJOUT DE SCÉNARIOS D\'ANOMALIES VARIÉS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Récupérer tous les employés
    const employees = await prisma.user.findMany({ 
      where: { role: 'employee' } 
    });
    
    if (employees.length === 0) {
      console.log('❌ Aucun employé trouvé. Exécutez d\'abord reset-and-seed-today.js');
      return;
    }
    
    console.log(`👥 ${employees.length} employés trouvés\n`);
    
    // SCÉNARIO 1: RETARDS (employés qui arrivent en retard)
    console.log('📋 SCÉNARIO 1: Ajout de RETARDS...\n');
    
    const employesEnRetard = employees.slice(0, 3);
    for (const emp of employesEnRetard) {
      // Planning 09:00-18:00
      const heureDebut = new Date(today);
      heureDebut.setHours(9, 0, 0, 0);
      const heureFin = new Date(today);
      heureFin.setHours(18, 0, 0, 0);
      
      // Créer planning
      await prisma.planning.create({
        data: {
          date: today,
          heureDebut,
          heureFin,
          userId: emp.id
        }
      });
      
      // Pointage ENTRÉE en retard (9h30 au lieu de 9h00)
      const heureEntreeRetard = new Date(today);
      heureEntreeRetard.setHours(9, 30 + Math.floor(Math.random() * 30), 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'ENTRÉE',
          horodatage: heureEntreeRetard,
          userId: emp.id
        }
      });
      
      // Pointage SORTIE normale
      const heureSortie = new Date(today);
      heureSortie.setHours(18, Math.floor(Math.random() * 15), 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'SORTIE',
          horodatage: heureSortie,
          userId: emp.id
        }
      });
      
      const retardMinutes = Math.floor((heureEntreeRetard - heureDebut) / 60000);
      console.log(`   ⏰ ${emp.prenom} ${emp.nom} - RETARD de ${retardMinutes} minutes (prévu 09:00, arrivé ${heureEntreeRetard.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})})`);
    }
    
    console.log(`\n   ✅ ${employesEnRetard.length} employés en retard ajoutés\n`);
    
    // SCÉNARIO 2: DÉPARTS ANTICIPÉS
    console.log('📋 SCÉNARIO 2: Ajout de DÉPARTS ANTICIPÉS...\n');
    
    const employesDepartAnticipe = employees.slice(3, 5);
    for (const emp of employesDepartAnticipe) {
      // Planning 09:00-18:00
      const heureDebut = new Date(today);
      heureDebut.setHours(9, 0, 0, 0);
      const heureFin = new Date(today);
      heureFin.setHours(18, 0, 0, 0);
      
      await prisma.planning.create({
        data: {
          date: today,
          heureDebut,
          heureFin,
          userId: emp.id
        }
      });
      
      // Pointage ENTRÉE normale
      const heureEntree = new Date(today);
      heureEntree.setHours(9, Math.floor(Math.random() * 10), 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'ENTRÉE',
          horodatage: heureEntree,
          userId: emp.id
        }
      });
      
      // Pointage SORTIE anticipée (16h au lieu de 18h)
      const heureSortieAnticipee = new Date(today);
      heureSortieAnticipee.setHours(16, Math.floor(Math.random() * 30), 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'SORTIE',
          horodatage: heureSortieAnticipee,
          userId: emp.id
        }
      });
      
      const avanceMinutes = Math.floor((heureFin - heureSortieAnticipee) / 60000);
      console.log(`   🏃 ${emp.prenom} ${emp.nom} - DÉPART ANTICIPÉ de ${avanceMinutes} minutes (prévu 18:00, parti ${heureSortieAnticipee.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})})`);
    }
    
    console.log(`\n   ✅ ${employesDepartAnticipe.length} départs anticipés ajoutés\n`);
    
    // SCÉNARIO 3: POINTAGES HORS PLAGE (très tôt ou très tard)
    console.log('📋 SCÉNARIO 3: Ajout de POINTAGES HORS PLAGE...\n');
    
    const employesHorsPlage = employees.slice(5, 7);
    for (const emp of employesHorsPlage) {
      // Planning 09:00-18:00
      const heureDebut = new Date(today);
      heureDebut.setHours(9, 0, 0, 0);
      const heureFin = new Date(today);
      heureFin.setHours(18, 0, 0, 0);
      
      await prisma.planning.create({
        data: {
          date: today,
          heureDebut,
          heureFin,
          userId: emp.id
        }
      });
      
      // Pointage ENTRÉE très tôt (6h du matin)
      const heureEntreeTresTot = new Date(today);
      heureEntreeTresTot.setHours(6, Math.floor(Math.random() * 30), 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'ENTRÉE',
          horodatage: heureEntreeTresTot,
          userId: emp.id
        }
      });
      
      // Pointage SORTIE très tard (21h)
      const heureSortieTresTard = new Date(today);
      heureSortieTresTard.setHours(21, Math.floor(Math.random() * 30), 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'SORTIE',
          horodatage: heureSortieTresTard,
          userId: emp.id
        }
      });
      
      const heuresTravaillees = Math.floor((heureSortieTresTard - heureEntreeTresTot) / 3600000);
      console.log(`   🔴 ${emp.prenom} ${emp.nom} - HORS PLAGE (${heureEntreeTresTot.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})} → ${heureSortieTresTard.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}) - ${heuresTravaillees}h travaillées !`);
    }
    
    console.log(`\n   ✅ ${employesHorsPlage.length} pointages hors plage ajoutés\n`);
    
    // SCÉNARIO 4: HEURES SUPPLÉMENTAIRES MASSIVES
    console.log('📋 SCÉNARIO 4: Ajout d\'HEURES SUPPLÉMENTAIRES...\n');
    
    const employesHeuresSup = employees.slice(7, 9);
    for (const emp of employesHeuresSup) {
      // Planning 09:00-18:00
      const heureDebut = new Date(today);
      heureDebut.setHours(9, 0, 0, 0);
      const heureFin = new Date(today);
      heureFin.setHours(18, 0, 0, 0);
      
      await prisma.planning.create({
        data: {
          date: today,
          heureDebut,
          heureFin,
          userId: emp.id
        }
      });
      
      // Pointage ENTRÉE normale
      const heureEntree = new Date(today);
      heureEntree.setHours(8, 55, 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'ENTRÉE',
          horodatage: heureEntree,
          userId: emp.id
        }
      });
      
      // Pointage SORTIE très tard (22h)
      const heureSortieTard = new Date(today);
      heureSortieTard.setHours(22, Math.floor(Math.random() * 30), 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'SORTIE',
          horodatage: heureSortieTard,
          userId: emp.id
        }
      });
      
      const heuresPrevues = 9;
      const heuresRealisees = Math.floor((heureSortieTard - heureEntree) / 3600000);
      const heuresSup = heuresRealisees - heuresPrevues;
      console.log(`   ⚡ ${emp.prenom} ${emp.nom} - HEURES SUP: ${heuresSup}h (prévu ${heuresPrevues}h, travaillé ${heuresRealisees}h)`);
    }
    
    console.log(`\n   ✅ ${employesHeuresSup.length} cas d'heures supplémentaires ajoutés\n`);
    
    // SCÉNARIO 5: POINTAGES MULTIPLES (oubli de pointer)
    console.log('📋 SCÉNARIO 5: Ajout de POINTAGES MULTIPLES...\n');
    
    const employePointagesMultiples = employees[9];
    if (employePointagesMultiples) {
      // Planning normal
      const heureDebut = new Date(today);
      heureDebut.setHours(9, 0, 0, 0);
      const heureFin = new Date(today);
      heureFin.setHours(18, 0, 0, 0);
      
      await prisma.planning.create({
        data: {
          date: today,
          heureDebut,
          heureFin,
          userId: employePointagesMultiples.id
        }
      });
      
      // Plusieurs pointages ENTRÉE (l'employé a oublié de pointer et refait)
      const heures = [9, 9, 9]; // 3 pointages entrée
      for (let i = 0; i < heures.length; i++) {
        const heure = new Date(today);
        heure.setHours(heures[i], 5 + (i * 10), 0, 0);
        
        await prisma.pointage.create({
          data: {
            type: 'ENTRÉE',
            horodatage: heure,
            userId: employePointagesMultiples.id
          }
        });
      }
      
      // Plusieurs pointages SORTIE
      const heuresSortie = [17, 17, 18];
      for (let i = 0; i < heuresSortie.length; i++) {
        const heure = new Date(today);
        heure.setHours(heuresSortie[i], 50 + (i * 5), 0, 0);
        
        await prisma.pointage.create({
          data: {
            type: 'SORTIE',
            horodatage: heure,
            userId: employePointagesMultiples.id
          }
        });
      }
      
      console.log(`   🔄 ${employePointagesMultiples.prenom} ${employePointagesMultiples.nom} - POINTAGES MULTIPLES (${heures.length} entrées, ${heuresSortie.length} sorties)`);
      console.log(`\n   ✅ 1 cas de pointages multiples ajouté\n`);
    }
    
    // SCÉNARIO 6: PAS DE SORTIE (l'employé a oublié de pointer la sortie)
    console.log('📋 SCÉNARIO 6: Ajout de CAS SANS SORTIE...\n');
    
    const employeSansSortie = employees[10];
    if (employeSansSortie) {
      // Planning normal
      const heureDebut = new Date(today);
      heureDebut.setHours(9, 0, 0, 0);
      const heureFin = new Date(today);
      heureFin.setHours(18, 0, 0, 0);
      
      await prisma.planning.create({
        data: {
          date: today,
          heureDebut,
          heureFin,
          userId: employeSansSortie.id
        }
      });
      
      // Pointage ENTRÉE uniquement (pas de sortie)
      const heureEntree = new Date(today);
      heureEntree.setHours(9, 10, 0, 0);
      
      await prisma.pointage.create({
        data: {
          type: 'ENTRÉE',
          horodatage: heureEntree,
          userId: employeSansSortie.id
        }
      });
      
      console.log(`   ❓ ${employeSansSortie.prenom} ${employeSansSortie.nom} - PAS DE SORTIE (entré à ${heureEntree.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})} mais pas pointé la sortie)`);
      console.log(`\n   ✅ 1 cas sans sortie ajouté\n`);
    }
    
    // RÉSUMÉ FINAL
    const totalPointages = await prisma.pointage.count({
      where: {
        horodatage: { gte: today, lt: new Date(today.getTime() + 24*60*60*1000) }
      }
    });
    
    const totalPlannings = await prisma.planning.count({
      where: { date: today }
    });
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SCÉNARIOS AJOUTÉS AVEC SUCCÈS !');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📊 RÉSUMÉ DES ANOMALIES CRÉÉES:\n');
    console.log(`   ⏰ Retards:                     ${employesEnRetard.length}`);
    console.log(`   🏃 Départs anticipés:           ${employesDepartAnticipe.length}`);
    console.log(`   🔴 Hors plage:                  ${employesHorsPlage.length}`);
    console.log(`   ⚡ Heures supplémentaires:      ${employesHeuresSup.length}`);
    console.log(`   🔄 Pointages multiples:         1`);
    console.log(`   ❓ Sans sortie:                 1`);
    console.log(`   ─────────────────────────────────────`);
    console.log(`   📋 Total plannings:             ${totalPlannings}`);
    console.log(`   ⏰ Total pointages:             ${totalPointages}`);
    
    console.log('\n💡 TESTS À EFFECTUER:\n');
    console.log('   1. Rafraîchissez le dashboard');
    console.log('   2. Vérifiez la section "Anomalies & alertes"');
    console.log('   3. Allez dans "Vue journalière" pour voir le détail');
    console.log('   4. Vérifiez les "Rapports d\'heures"');
    console.log('   5. Testez les comparaisons planning vs réalité\n');
    
    console.log('═══════════════════════════════════════════════════\n');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addAnomaliesScenarios();
