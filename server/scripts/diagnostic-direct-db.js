const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosticComplet() {
  try {
    console.log('\n=== DIAGNOSTIC DASHBOARD COMPLET ===\n');
    
    // 1. Compter tous les employés
    const employes = await prisma.user.findMany({
      where: { role: 'employee' },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`📊 TOTAL EMPLOYÉS: ${employes.length}\n`);
    
    // 2. Récupérer tous les pointages du 21/10/2025
    const dateDebut = new Date('2025-10-21T00:00:00.000Z');
    const dateFin = new Date('2025-10-21T23:59:59.999Z');
    
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log(`⏱️ POINTAGES DU 21/10/2025: ${pointages.length}`);
    
    // Grouper par employé
    const pointagesParEmploye = {};
    pointages.forEach(p => {
      if (!pointagesParEmploye[p.userId]) {
        pointagesParEmploye[p.userId] = {
          user: p.user,
          entrees: [],
          sorties: []
        };
      }
      const heure = new Date(p.horodatage).toLocaleTimeString('fr-FR', { 
        timeZone: 'Europe/Paris',
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      if (p.type === 'ENTRÉE') {
        pointagesParEmploye[p.userId].entrees.push(heure);
      } else if (p.type === 'SORTIE') {
        pointagesParEmploye[p.userId].sorties.push(heure);
      }
    });
    
    const employesQuiOntPointe = Object.keys(pointagesParEmploye).length;
    console.log(`👥 EMPLOYÉS QUI ONT POINTÉ: ${employesQuiOntPointe}\n`);
    
    // 3. Récupérer les congés actifs pour le 21/10/2025
    const date = new Date('2025-10-21');
    const congesActifs = await prisma.conge.findMany({
      where: {
        statut: 'approuvé',
        dateDebut: { lte: date },
        dateFin: { gte: date }
      },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });
    
    console.log(`🏖️ CONGÉS ACTIFS: ${congesActifs.length}`);
    if (congesActifs.length > 0) {
      congesActifs.forEach(c => {
        console.log(`   - ${c.user.prenom} ${c.user.nom} (du ${new Date(c.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(c.dateFin).toLocaleDateString('fr-FR')})`);
      });
    }
    console.log();
    
    // 4. Récupérer les plannings du 21/10/2025
    const plannings = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date('2025-10-21T00:00:00.000Z'),
          lt: new Date('2025-10-22T00:00:00.000Z')
        },
        type: 'présence'
      },
      include: {
        employe: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });
    
    console.log(`📅 PLANNINGS DU 21/10/2025: ${plannings.length}`);
    if (plannings.length > 0) {
      plannings.forEach(p => {
        const segments = p.segments || [];
        const segment = segments[0];
        if (segment) {
          console.log(`   - ${p.employe.prenom} ${p.employe.nom}: ${segment.start} → ${segment.end}`);
        }
      });
    }
    console.log();
    
    // 5. Analyse employé par employé
    console.log('=== ANALYSE DÉTAILLÉE PAR EMPLOYÉ ===\n');
    
    const congesIds = new Set(congesActifs.map(c => c.userId));
    const planningsMap = {};
    plannings.forEach(p => {
      planningsMap[p.employeId] = p;
    });
    
    let absentsNonPlanifies = 0;
    let retards = 0;
    let avances = 0;
    
    employes.forEach(emp => {
      const estEnConge = congesIds.has(emp.id);
      const aPointe = pointagesParEmploye[emp.id];
      const planning = planningsMap[emp.id];
      
      console.log(`👤 ${emp.prenom} ${emp.nom} (ID: ${emp.id})`);
      
      // Statut
      if (estEnConge) {
        console.log('   ✅ EN CONGÉ');
      } else if (aPointe) {
        console.log(`   ✅ A POINTÉ`);
        console.log(`      Entrées: ${aPointe.entrees.join(', ')}`);
        console.log(`      Sorties: ${aPointe.sorties.join(', ')}`);
        
        // Comparer avec planning si existe
        if (planning && planning.segments && planning.segments.length > 0) {
          const segment = planning.segments[0];
          console.log(`      Planning: ${segment.start} → ${segment.end}`);
          
          // Comparer première entrée avec heure planifiée
          const premiereEntree = aPointe.entrees[0];
          if (premiereEntree && segment.start) {
            const [heureEntree, minEntree] = premiereEntree.split(':').map(Number);
            const [heurePlanning, minPlanning] = segment.start.split(':').map(Number);
            
            const minutesEntree = heureEntree * 60 + minEntree;
            const minutesPlanning = heurePlanning * 60 + minPlanning;
            const ecart = minutesEntree - minutesPlanning;
            
            if (ecart > 5) {
              console.log(`      ⚠️ RETARD de ${ecart} minutes`);
              retards++;
            } else if (ecart < -5) {
              console.log(`      ⭐ EN AVANCE de ${Math.abs(ecart)} minutes`);
              avances++;
            } else {
              console.log(`      ✅ À L'HEURE (écart: ${ecart} min)`);
            }
          }
        } else {
          console.log('      ⚠️ AUCUN PLANNING');
        }
      } else {
        console.log('   ❌ NON POINTÉ / ABSENT');
        if (!planning) {
          console.log('      ℹ️ Pas de planning prévu');
        } else {
          console.log('      ⚠️ ABSENCE NON PLANIFIÉE');
          absentsNonPlanifies++;
        }
      }
      console.log();
    });
    
    // 6. Résumé statistiques
    console.log('\n=== STATISTIQUES CALCULÉES ===\n');
    
    const nonPointes = employes.length - employesQuiOntPointe - congesActifs.length;
    const tauxPresence = Math.round((employesQuiOntPointe / employes.length) * 100);
    
    console.log(`📊 Total employés: ${employes.length}`);
    console.log(`✅ Ont pointé: ${employesQuiOntPointe} (${tauxPresence}%)`);
    console.log(`🏖️ En congé: ${congesActifs.length}`);
    console.log(`❌ Non pointés: ${nonPointes}`);
    console.log(`⚠️ Absences non planifiées: ${absentsNonPlanifies}`);
    console.log(`⏰ Retards détectés: ${retards}`);
    console.log(`⭐ En avance: ${avances}`);
    console.log(`📅 Avec planning: ${plannings.length}`);
    console.log(`📝 Sans planning: ${employes.length - plannings.length - congesActifs.length}`);
    
    console.log('\n=== VALEURS ATTENDUES DASHBOARD ===\n');
    console.log(`NON POINTÉS: ${nonPointes} (${Math.round((nonPointes / employes.length) * 100)}%)`);
    console.log(`PRÉSENCE: ${tauxPresence}%`);
    console.log(`ABS. NON PLANIF.: ${absentsNonPlanifies}`);
    console.log(`RETARDS: ${retards}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosticComplet();
