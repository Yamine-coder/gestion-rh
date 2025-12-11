// Script de diagnostic complet de la page Stats
// Vérifie toutes les données et leur cohérence

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosticComplet() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DIAGNOSTIC COMPLET DE LA PAGE STATS');
  console.log('='.repeat(80));

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Dates de la période de 30 jours (ce que fait le backend)
  const periode = 30;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - periode);
  startDate.setHours(0, 0, 0, 0);

  console.log(`\n📅 Période analysée: ${startDate.toLocaleDateString('fr-FR')} - ${today.toLocaleDateString('fr-FR')} (${periode} jours)`);

  // ============================================
  // 1. DONNÉES DE BASE
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 1. DONNÉES DE BASE');
  console.log('-'.repeat(60));

  const totalUsers = await prisma.user.count();
  const employesActifs = await prisma.user.findMany({
    where: { role: 'employee', statut: 'actif' }
  });
  const admins = await prisma.user.findMany({
    where: { role: { not: 'employee' } }
  });

  console.log(`   Total utilisateurs: ${totalUsers}`);
  console.log(`   Employés actifs: ${employesActifs.length}`);
  console.log(`   Administrateurs: ${admins.length}`);

  // ============================================
  // 2. CATÉGORIES / RÉPARTITION PAR SERVICE
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 2. RÉPARTITION PAR SERVICE (catégories)');
  console.log('-'.repeat(60));

  const categoriesEmployes = {};
  employesActifs.forEach(emp => {
    const cat = emp.categorie || 'Non défini';
    if (!categoriesEmployes[cat]) categoriesEmployes[cat] = 0;
    categoriesEmployes[cat]++;
  });

  console.log('   Catégories employés actifs:');
  Object.entries(categoriesEmployes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const pct = ((count / employesActifs.length) * 100).toFixed(1);
      console.log(`   - ${cat}: ${count} (${pct}%)`);
    });

  // ============================================
  // 3. POINTAGES
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 3. POINTAGES (30 derniers jours)');
  console.log('-'.repeat(60));

  const pointagesPeriode = await prisma.pointage.findMany({
    where: {
      horodatage: { gte: startDate, lte: today }
    },
    include: { user: { select: { prenom: true, nom: true, categorie: true } } }
  });

  const pointagesEntree = pointagesPeriode.filter(p => p.type === 'ENTRÉE');
  const pointagesSortie = pointagesPeriode.filter(p => p.type === 'SORTIE');

  console.log(`   Total pointages: ${pointagesPeriode.length}`);
  console.log(`   - Entrées: ${pointagesEntree.length}`);
  console.log(`   - Sorties: ${pointagesSortie.length}`);

  // Pointages par jour
  const pointagesParJour = {};
  pointagesPeriode.forEach(p => {
    const dateStr = new Date(p.horodatage).toISOString().split('T')[0];
    if (!pointagesParJour[dateStr]) pointagesParJour[dateStr] = new Set();
    pointagesParJour[dateStr].add(p.userId);
  });

  const joursAvecPointages = Object.keys(pointagesParJour).length;
  const moyenneEmployesParJour = joursAvecPointages > 0 
    ? (Object.values(pointagesParJour).reduce((sum, set) => sum + set.size, 0) / joursAvecPointages).toFixed(1)
    : 0;

  console.log(`   Jours avec pointages: ${joursAvecPointages}`);
  console.log(`   Moyenne employés/jour: ${moyenneEmployesParJour}`);

  // ============================================
  // 4. CALCUL HEURES RÉELLES
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 4. HEURES TRAVAILLÉES');
  console.log('-'.repeat(60));

  // Calculer les heures réelles à partir des pointages
  const pointagesParEmploye = {};
  pointagesPeriode.forEach(p => {
    if (!pointagesParEmploye[p.userId]) pointagesParEmploye[p.userId] = {};
    const dateStr = new Date(p.horodatage).toISOString().split('T')[0];
    if (!pointagesParEmploye[p.userId][dateStr]) pointagesParEmploye[p.userId][dateStr] = [];
    pointagesParEmploye[p.userId][dateStr].push(p);
  });

  let totalHeuresReelles = 0;
  let totalJoursPresence = 0;

  for (const userId in pointagesParEmploye) {
    for (const dateStr in pointagesParEmploye[userId]) {
      const pointagesJour = pointagesParEmploye[userId][dateStr].sort((a, b) => 
        new Date(a.horodatage) - new Date(b.horodatage)
      );
      
      const entrees = pointagesJour.filter(p => p.type === 'ENTRÉE');
      const sorties = pointagesJour.filter(p => p.type === 'SORTIE');

      if (entrees.length > 0 && sorties.length > 0) {
        const heureEntree = new Date(entrees[0].horodatage);
        const heureSortie = new Date(sorties[sorties.length - 1].horodatage);
        const heures = (heureSortie - heureEntree) / (1000 * 60 * 60);
        if (heures > 0 && heures < 16) { // Max 16h par jour
          totalHeuresReelles += heures;
          totalJoursPresence++;
        }
      }
    }
  }

  const dureeMoyenneJour = totalJoursPresence > 0 
    ? (totalHeuresReelles / totalJoursPresence).toFixed(1)
    : 0;

  console.log(`   Total heures travaillées: ${totalHeuresReelles.toFixed(1)}h`);
  console.log(`   Total jours de présence: ${totalJoursPresence}`);
  console.log(`   Durée moyenne/jour: ${dureeMoyenneJour}h`);

  // ============================================
  // 5. SHIFTS PLANIFIÉS
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 5. SHIFTS PLANIFIÉS');
  console.log('-'.repeat(60));

  const shiftsPeriode = await prisma.shift.findMany({
    where: {
      date: { gte: startDate, lte: today }
    }
  });

  console.log(`   Total shifts planifiés: ${shiftsPeriode.length}`);

  // Calculer heures planifiées
  let heuresTheoriques = 0;
  shiftsPeriode.forEach(shift => {
    if (shift.segments) {
      const segments = typeof shift.segments === 'string' 
        ? JSON.parse(shift.segments) 
        : shift.segments;
      
      if (Array.isArray(segments)) {
        segments.forEach(seg => {
          if (seg.start && seg.end) {
            const [startH, startM] = seg.start.split(':').map(Number);
            const [endH, endM] = seg.end.split(':').map(Number);
            heuresTheoriques += ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
          }
        });
      }
    }
  });

  console.log(`   Heures théoriques planifiées: ${heuresTheoriques.toFixed(1)}h`);

  // TAUX D'UTILISATION
  const tauxUtilisation = heuresTheoriques > 0 
    ? ((totalHeuresReelles / heuresTheoriques) * 100).toFixed(1)
    : 'N/A (pas de shifts planifiés)';
  console.log(`   ⚠️  Taux d'utilisation: ${tauxUtilisation}%`);

  if (heuresTheoriques === 0) {
    console.log('   ⚠️  PROBLÈME: Aucun shift planifié → Taux utilisation incorrect!');
  }

  // ============================================
  // 6. RETARDS
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 6. RETARDS');
  console.log('-'.repeat(60));

  let retardsCount = 0;
  let totalPointagesAnalyses = 0;

  for (const userId in pointagesParEmploye) {
    for (const dateStr in pointagesParEmploye[userId]) {
      const pointagesJour = pointagesParEmploye[userId][dateStr];
      const entrees = pointagesJour.filter(p => p.type === 'ENTRÉE');
      
      if (entrees.length > 0) {
        totalPointagesAnalyses++;
        const premiereEntree = new Date(entrees[0].horodatage);
        const heureArrivee = premiereEntree.getHours() * 60 + premiereEntree.getMinutes();
        
        // Trouver le shift correspondant
        const shiftJour = shiftsPeriode.find(s => {
          const shiftDate = new Date(s.date).toISOString().split('T')[0];
          return shiftDate === dateStr && s.userId === userId;
        });

        if (shiftJour && shiftJour.segments) {
          const segments = typeof shiftJour.segments === 'string' 
            ? JSON.parse(shiftJour.segments) 
            : shiftJour.segments;
          
          if (Array.isArray(segments) && segments.length > 0 && segments[0].start) {
            const [startH, startM] = segments[0].start.split(':').map(Number);
            const heureDebutShift = startH * 60 + startM;
            
            if (heureArrivee > heureDebutShift + 5) { // Plus de 5 min de retard
              retardsCount++;
            }
          }
        }
      }
    }
  }

  const tauxRetards = totalPointagesAnalyses > 0 
    ? ((retardsCount / totalPointagesAnalyses) * 100).toFixed(1)
    : 0;

  console.log(`   Retards détectés: ${retardsCount} sur ${totalPointagesAnalyses} jours`);
  console.log(`   Taux de retards: ${tauxRetards}%`);

  if (shiftsPeriode.length === 0) {
    console.log('   ⚠️  PROBLÈME: Sans shifts, impossible de calculer les retards correctement!');
  }

  // ============================================
  // 7. CONGÉS / ABSENCES
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 7. CONGÉS ET ABSENCES');
  console.log('-'.repeat(60));

  const conges = await prisma.conge.findMany({
    where: {
      dateDebut: { lte: today },
      dateFin: { gte: startDate }
    },
    include: { user: { select: { prenom: true, nom: true } } }
  });

  const congesApprouves = conges.filter(c => c.statut === 'approuvé');
  const congesEnAttente = conges.filter(c => c.statut === 'en attente');

  console.log(`   Total congés (période): ${conges.length}`);
  console.log(`   - Approuvés: ${congesApprouves.length}`);
  console.log(`   - En attente: ${congesEnAttente.length}`);

  // Absences par motif
  const absencesParMotif = {};
  congesApprouves.forEach(c => {
    const type = c.type || 'Autre';
    if (!absencesParMotif[type]) absencesParMotif[type] = 0;
    absencesParMotif[type]++;
  });

  console.log('   Absences par motif:');
  Object.entries(absencesParMotif).forEach(([motif, count]) => {
    console.log(`   - ${motif}: ${count}`);
  });

  // ============================================
  // 8. TAUX D'ABSENTÉISME
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 8. TAUX D\'ABSENTÉISME');
  console.log('-'.repeat(60));

  // Employés uniques ayant pointé
  const employesAyantPointe = new Set(
    pointagesPeriode.map(p => p.userId)
  );

  // Jours théoriques = employés * jours ouvrés
  const joursOuvres = Math.min(periode, 22); // Environ 22 jours ouvrés par mois
  const joursTheoriques = employesActifs.length * joursOuvres;
  
  // Jours d'absence
  let joursAbsence = 0;
  congesApprouves.forEach(c => {
    const debut = new Date(Math.max(new Date(c.dateDebut), startDate));
    const fin = new Date(Math.min(new Date(c.dateFin), today));
    const jours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1;
    joursAbsence += Math.max(1, jours);
  });

  const tauxAbsenteisme = joursTheoriques > 0 
    ? ((joursAbsence / joursTheoriques) * 100).toFixed(1)
    : 0;

  console.log(`   Employés ayant pointé: ${employesAyantPointe.size} / ${employesActifs.length}`);
  console.log(`   Jours théoriques: ${joursTheoriques}`);
  console.log(`   Jours d'absence (congés): ${joursAbsence}`);
  console.log(`   Taux d'absentéisme: ${tauxAbsenteisme}%`);

  // ============================================
  // 9. TURNOVER
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 9. TURNOVER (12 derniers mois)');
  console.log('-'.repeat(60));

  const debutAnnee = new Date(today);
  debutAnnee.setMonth(debutAnnee.getMonth() - 12);

  const entrees = await prisma.user.count({
    where: {
      dateEmbauche: { gte: debutAnnee },
      role: 'employee'
    }
  });

  const sorties = await prisma.user.count({
    where: {
      dateSortie: { gte: debutAnnee },
      role: 'employee'
    }
  });

  const effectifMoyen = employesActifs.length + (sorties / 2) - (entrees / 2);
  const tauxRotation = effectifMoyen > 0 
    ? (((entrees + sorties) / 2 / effectifMoyen) * 100).toFixed(1)
    : 0;

  console.log(`   Entrées: ${entrees}`);
  console.log(`   Sorties: ${sorties}`);
  console.log(`   Effectif moyen: ${effectifMoyen.toFixed(0)}`);
  console.log(`   Taux de rotation: ${tauxRotation}%`);

  // ============================================
  // 10. ANCIENNETÉ
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 10. ANCIENNETÉ');
  console.log('-'.repeat(60));

  const anciennetes = employesActifs
    .filter(e => e.dateEmbauche)
    .map(e => {
      const diff = today - new Date(e.dateEmbauche);
      return diff / (1000 * 60 * 60 * 24 * 365);
    });

  const ancienneteMoyenne = anciennetes.length > 0 
    ? (anciennetes.reduce((a, b) => a + b, 0) / anciennetes.length).toFixed(1)
    : 0;

  console.log(`   Employés avec date d'embauche: ${anciennetes.length}`);
  console.log(`   Ancienneté moyenne: ${ancienneteMoyenne} ans`);

  // ============================================
  // 11. ÉVOLUTION EFFECTIF
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('📊 11. ÉVOLUTION EFFECTIF (6 derniers mois)');
  console.log('-'.repeat(60));

  const sixMoisAvant = new Date(today);
  sixMoisAvant.setMonth(sixMoisAvant.getMonth() - 6);

  for (let i = 5; i >= 0; i--) {
    const mois = new Date(today);
    mois.setMonth(mois.getMonth() - i);
    const nomMois = mois.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

    const entreesM = await prisma.user.count({
      where: {
        dateEmbauche: {
          gte: new Date(mois.getFullYear(), mois.getMonth(), 1),
          lt: new Date(mois.getFullYear(), mois.getMonth() + 1, 1)
        },
        role: 'employee'
      }
    });

    const sortiesM = await prisma.user.count({
      where: {
        dateSortie: {
          gte: new Date(mois.getFullYear(), mois.getMonth(), 1),
          lt: new Date(mois.getFullYear(), mois.getMonth() + 1, 1)
        },
        role: 'employee'
      }
    });

    console.log(`   ${nomMois}: +${entreesM} entrées / -${sortiesM} sorties`);
  }

  // ============================================
  // 12. RÉSUMÉ DES PROBLÈMES DÉTECTÉS
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  RÉSUMÉ DES PROBLÈMES DÉTECTÉS');
  console.log('='.repeat(80));

  const problemes = [];

  if (shiftsPeriode.length === 0) {
    problemes.push('❌ Aucun shift planifié → Taux d\'utilisation et retards incorrects');
  }

  if (heuresTheoriques === 0) {
    problemes.push('❌ Heures théoriques = 0 → Taux d\'utilisation divisé par 0');
  }

  if (totalHeuresReelles > heuresTheoriques * 2 && heuresTheoriques > 0) {
    problemes.push(`⚠️  Heures réelles (${totalHeuresReelles.toFixed(0)}h) > 2x heures théoriques (${heuresTheoriques.toFixed(0)}h)`);
  }

  if (employesAyantPointe.size < employesActifs.length * 0.5) {
    problemes.push(`⚠️  Seulement ${employesAyantPointe.size}/${employesActifs.length} employés ont pointé`);
  }

  if (congesApprouves.length === 0) {
    problemes.push('⚠️  Aucun congé approuvé → Graphiques absences vides');
  }

  if (problemes.length === 0) {
    console.log('✅ Aucun problème majeur détecté!');
  } else {
    problemes.forEach(p => console.log(`   ${p}`));
  }

  // ============================================
  // 13. RECOMMANDATIONS
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMANDATIONS');
  console.log('='.repeat(80));

  if (shiftsPeriode.length === 0) {
    console.log('   1. Créer des shifts planifiés pour la période');
    console.log('      → Permet le calcul correct du taux d\'utilisation');
    console.log('      → Permet la détection des retards');
  }

  if (congesApprouves.length === 0) {
    console.log('   2. Ajouter des congés de test pour valider les graphiques');
  }

  console.log('\n' + '='.repeat(80));
  console.log('FIN DU DIAGNOSTIC');
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

diagnosticComplet().catch(e => {
  console.error('Erreur:', e);
  prisma.$disconnect();
});
