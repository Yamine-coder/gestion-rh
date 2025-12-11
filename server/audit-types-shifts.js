const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditShiftTypes() {
  console.log('='.repeat(80));
  console.log('📊 AUDIT COMPLET DES TYPES DE SHIFTS');
  console.log('='.repeat(80));
  
  // 1. Types de shifts dans la base de données
  console.log('\n\n📋 1. TYPES DE SHIFTS EN BASE DE DONNÉES');
  console.log('-'.repeat(50));
  
  const shiftsByType = await prisma.$queryRaw`
    SELECT type, COUNT(*) as count
    FROM "Shift"
    GROUP BY type
    ORDER BY count DESC
  `;
  
  console.log('\nTous les types trouvés:');
  shiftsByType.forEach(s => {
    console.log(`   - "${s.type}": ${s.count} shifts`);
  });

  // 2. Analyse des segments avec isExtra
  console.log('\n\n📋 2. SEGMENTS AVEC isExtra = true');
  console.log('-'.repeat(50));
  
  const shifts = await prisma.shift.findMany({
    select: { id: true, segments: true, type: true }
  });
  
  let totalSegments = 0;
  let extraSegments = 0;
  let pauseSegments = 0;
  let normalSegments = 0;
  let shiftsWithExtra = 0;
  
  shifts.forEach(shift => {
    let hasExtra = false;
    let segments = shift.segments || [];
    if (typeof segments === 'string') {
      try { segments = JSON.parse(segments); } catch { segments = []; }
    }
    if (!Array.isArray(segments)) segments = [];
    segments.forEach(seg => {
      totalSegments++;
      if (seg.isExtra) {
        extraSegments++;
        hasExtra = true;
      }
      if (seg.isPause) {
        pauseSegments++;
      }
      if (!seg.isExtra && !seg.isPause) {
        normalSegments++;
      }
    });
    if (hasExtra) shiftsWithExtra++;
  });
  
  console.log(`Total segments: ${totalSegments}`);
  console.log(`   - Segments normaux (travail): ${normalSegments}`);
  console.log(`   - Segments pause: ${pauseSegments}`);
  console.log(`   - Segments extra (isExtra=true): ${extraSegments}`);
  console.log(`   - Shifts contenant des extras: ${shiftsWithExtra}`);

  // 3. Analyse du champ "type" du shift vs le segment
  console.log('\n\n📋 3. CONFUSION TYPE DE SHIFT vs SEGMENT');
  console.log('-'.repeat(50));
  console.log(`
⚠️  PROBLÈME IDENTIFIÉ:
   
   Le champ "type" du Shift représente le TYPE DE JOURNÉE:
   - "présence" = Jour de travail planifié
   - "NORMAL" = Jour de travail normal (ancienne valeur)
   - "repos" = Jour de repos
   - "absence" = Absence planifiée
   - "congé" = Congé
   
   MAIS les "extras" (heures supplémentaires) sont dans les SEGMENTS:
   - segment.isExtra = true pour les heures extra
   - segment.isPause = true pour les pauses
   
   Ce sont DEUX concepts différents !
  `);

  // 4. Types actuellement utilisés dans le calcul d'assiduité
  console.log('\n\n📋 4. TYPES UTILISÉS DANS LE CALCUL D\'ASSIDUITÉ');
  console.log('-'.repeat(50));
  
  const typesInclus = ['présence', 'NORMAL', 'matin', 'soir', 'coupure', 'travail'];
  const typesExclus = ['repos', 'absence'];
  
  console.log('✅ Types INCLUS (jours de travail):');
  for (const type of typesInclus) {
    const count = shiftsByType.find(s => s.type === type)?.count || 0;
    console.log(`   - "${type}": ${count} shifts`);
  }
  
  console.log('\n❌ Types EXCLUS (pas du travail):');
  for (const type of typesExclus) {
    const count = shiftsByType.find(s => s.type === type)?.count || 0;
    console.log(`   - "${type}": ${count} shifts`);
  }

  // 5. Heures extras vs heures normales
  console.log('\n\n📋 5. HEURES EXTRAS VS HEURES NORMALES (30 derniers jours)');
  console.log('-'.repeat(50));
  
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 30);
  
  const recentShifts = await prisma.shift.findMany({
    where: {
      date: { gte: dateDebut },
      type: { in: typesInclus }
    },
    select: { segments: true }
  });
  
  let heuresNormales = 0;
  let heuresExtra = 0;
  let heuresPause = 0;
  
  recentShifts.forEach(shift => {
    let segments = shift.segments || [];
    if (typeof segments === 'string') {
      try { segments = JSON.parse(segments); } catch { segments = []; }
    }
    if (!Array.isArray(segments)) segments = [];
    segments.forEach(seg => {
      if (!seg.start || !seg.end) return;
      const [sh, sm] = seg.start.split(':').map(Number);
      const [eh, em] = seg.end.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration > 0) {
        if (seg.isPause) {
          heuresPause += duration / 60;
        } else if (seg.isExtra) {
          heuresExtra += duration / 60;
        } else {
          heuresNormales += duration / 60;
        }
      }
    });
  });
  
  console.log(`Heures de travail normal: ${heuresNormales.toFixed(1)}h`);
  console.log(`Heures extra (isExtra=true): ${heuresExtra.toFixed(1)}h`);
  console.log(`Heures de pause: ${heuresPause.toFixed(1)}h`);
  console.log(`\n📊 Les extras représentent ${((heuresExtra / (heuresNormales + heuresExtra)) * 100).toFixed(1)}% du temps de travail`);

  // 6. Recommandation
  console.log('\n\n📋 6. RECOMMANDATION D\'UNIFICATION');
  console.log('-'.repeat(50));
  console.log(`
🎯 PROPOSITION D'UNIFICATION:

   1. TYPE DE SHIFT (type du modèle Shift):
      ✅ À GARDER et UNIFIER:
         - "travail" = Jour de travail (remplace présence, NORMAL, matin, soir, coupure)
         - "repos"   = Jour de repos planifié
         - "absence" = Absence (maladie, congé, etc.)
      
   2. TYPE DE SEGMENT (dans le JSON segments):
      ✅ Segment normal: { start, end }
      ✅ Segment pause:  { start, end, isPause: true }
      ✅ Segment extra:  { start, end, isExtra: true, paymentStatus: 'à payer'|'payé' }

   3. MIGRATION SUGGÉRÉE:
      - Remplacer "présence" → "travail"
      - Remplacer "NORMAL" → "travail"  
      - Remplacer "matin/soir/coupure" → "travail"
      
   4. CALCUL D'ASSIDUITÉ:
      - Heures planifiées = segments normaux (sans isExtra, sans isPause)
      - Heures réelles = pointages réels
      - Les heures EXTRA ne comptent PAS dans l'assiduité car non planifiées
  `);

  // 7. Vérification: est-ce que les extras sont actuellement comptés?
  console.log('\n\n📋 7. VÉRIFICATION: LES EXTRAS SONT-ILS COMPTÉS DANS L\'ASSIDUITÉ?');
  console.log('-'.repeat(50));
  
  console.log(`
   ACTUELLEMENT dans le calcul:
   - heuresTheorique = tous les segments (incluant les extras)
   - Cela SURESTIME les heures planifiées car les extras ne sont pas "planifiés"
   
   🔧 CORRECTION RECOMMANDÉE:
   - Exclure segment.isExtra = true du calcul des heures planifiées
   - Les extras sont des heures SUP non prévues au planning
  `);

  await prisma.$disconnect();
}

auditShiftTypes().catch(console.error);
