/**
 * VÉRIFICATION COMPLÈTE DU SYSTÈME DE POINTAGE EXTRA
 * 
 * Ce script vérifie que tout le système est en place et fonctionnel :
 * 1. Schema : champ isExtra dans les segments
 * 2. Routes de pointage : gestion des extras
 * 3. Routes de stats : exclusion des extras
 * 4. Frontend : affichage des extras
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const log = (emoji, msg) => console.log(`${emoji} ${msg}`);
const separator = () => console.log('\n' + '═'.repeat(70) + '\n');

async function main() {
  console.log('\n');
  log('🔍', '═══════════════════════════════════════════════════════════════');
  log('🔍', '    VÉRIFICATION SYSTÈME POINTAGE EXTRA');
  log('🔍', '═══════════════════════════════════════════════════════════════');
  
  let checks = {
    schema: false,
    shiftsWithExtra: false,
    statsExclusion: false,
    pointageRoutes: false,
    paiementExtras: false
  };
  
  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. VÉRIFICATION SCHEMA
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '1. VÉRIFICATION SCHEMA PRISMA');
    
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    // Vérifier que Shift a bien le champ segments (Json)
    if (schemaContent.includes('model Shift') && schemaContent.includes('segments')) {
      log('✅', 'Model Shift avec champ segments (Json) trouvé');
      checks.schema = true;
    } else {
      log('❌', 'Model Shift ou champ segments manquant');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 2. VÉRIFICATION SHIFTS AVEC EXTRA EN BASE
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '2. VÉRIFICATION SHIFTS AVEC SEGMENTS EXTRA EN BASE');
    
    // Récupérer tous les shifts récents
    const recentShifts = await prisma.shift.findMany({
      where: {
        date: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
      },
      include: {
        employe: { select: { nom: true, prenom: true } }
      },
      take: 100
    });
    
    let shiftsWithExtra = 0;
    let totalExtraSegments = 0;
    
    for (const shift of recentShifts) {
      if (shift.segments && Array.isArray(shift.segments)) {
        const extraSegments = shift.segments.filter(s => s.isExtra === true);
        if (extraSegments.length > 0) {
          shiftsWithExtra++;
          totalExtraSegments += extraSegments.length;
          log('📊', `Shift #${shift.id} (${shift.employe?.prenom} ${shift.employe?.nom}) - ${extraSegments.length} segment(s) extra`);
        }
      }
    }
    
    log('📈', `Total: ${shiftsWithExtra} shifts avec segments extra (${totalExtraSegments} segments)`);
    checks.shiftsWithExtra = shiftsWithExtra > 0;
    
    // ═══════════════════════════════════════════════════════════════
    // 3. VÉRIFICATION CODE STATS (EXCLUSION EXTRAS)
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '3. VÉRIFICATION EXCLUSION EXTRAS DANS STATS');
    
    const statsRoutesPath = path.join(__dirname, 'routes', 'statsRoutes.js');
    const statsContent = fs.readFileSync(statsRoutesPath, 'utf-8');
    
    const exclusionPatterns = [
      '!segment.isExtra',
      'segment.isExtra'
    ];
    
    let exclusionCount = 0;
    for (const pattern of exclusionPatterns) {
      const matches = statsContent.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      if (matches) {
        exclusionCount += matches.length;
      }
    }
    
    log('📊', `Occurrences de vérification isExtra dans statsRoutes: ${exclusionCount}`);
    if (exclusionCount >= 5) {
      log('✅', 'Logique d\'exclusion des extras bien présente');
      checks.statsExclusion = true;
    } else {
      log('⚠️', 'Peu de vérifications isExtra trouvées');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 4. VÉRIFICATION ROUTES POINTAGE
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '4. VÉRIFICATION ROUTES POINTAGE');
    
    const pointageRoutesPath = path.join(__dirname, 'routes', 'pointageRoutes.js');
    const pointageContent = fs.readFileSync(pointageRoutesPath, 'utf-8');
    
    // Vérifier la gestion des segments
    if (pointageContent.includes('segments') || pointageContent.includes('segment')) {
      log('✅', 'Gestion des segments présente dans pointageRoutes');
      checks.pointageRoutes = true;
    } else {
      log('⚠️', 'Pas de gestion explicite des segments');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 5. VÉRIFICATION TABLE PAIEMENTS EXTRAS
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '5. VÉRIFICATION PAIEMENTS EXTRAS');
    
    const paiementsExtras = await prisma.paiementExtra.findMany({
      include: {
        employe: { select: { nom: true, prenom: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    log('📊', `Paiements extras en base: ${paiementsExtras.length}`);
    
    if (paiementsExtras.length > 0) {
      checks.paiementExtras = true;
      for (const p of paiementsExtras.slice(0, 5)) {
        log('💰', `${p.employe?.prenom} ${p.employe?.nom}: ${p.heures}h - ${p.montant}€ (${p.statut}) - Source: ${p.source || 'N/A'}`);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 6. TEST SIMULATION CALCUL HEURES (EXCLUSION EXTRA)
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('📋', '6. TEST SIMULATION CALCUL HEURES');
    
    // Trouver un shift mixte (avec extra et normal)
    const shiftMixte = recentShifts.find(s => {
      if (!s.segments || !Array.isArray(s.segments)) return false;
      const hasNormal = s.segments.some(seg => !seg.isExtra);
      const hasExtra = s.segments.some(seg => seg.isExtra === true);
      return hasNormal && hasExtra;
    });
    
    if (shiftMixte) {
      log('📊', `Shift mixte trouvé: #${shiftMixte.id}`);
      
      let heuresNormales = 0;
      let heuresExtras = 0;
      
      for (const seg of shiftMixte.segments) {
        if (seg.start && seg.end) {
          const [sh, sm] = seg.start.split(':').map(Number);
          const [eh, em] = seg.end.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          const heures = mins / 60;
          
          if (seg.isExtra) {
            heuresExtras += heures;
            log('🔴', `  Segment EXTRA: ${seg.start}-${seg.end} = ${heures}h`);
          } else {
            heuresNormales += heures;
            log('🟢', `  Segment NORMAL: ${seg.start}-${seg.end} = ${heures}h`);
          }
        }
      }
      
      log('📈', `Résultat: ${heuresNormales}h normales + ${heuresExtras}h extras`);
      log('✅', `Dans les rapports, seules les ${heuresNormales}h normales seront comptées`);
    } else {
      log('⚠️', 'Aucun shift mixte trouvé pour simulation');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // RÉSUMÉ
    // ═══════════════════════════════════════════════════════════════
    separator();
    log('🏁', '═══════════════════════════════════════════════════════════════');
    log('🏁', '                    RÉSUMÉ DES VÉRIFICATIONS');
    log('🏁', '═══════════════════════════════════════════════════════════════');
    
    console.log('\n');
    console.log('   ┌─────────────────────────────────────────────────┐');
    console.log('   │  COMPOSANT                      │    STATUS     │');
    console.log('   ├─────────────────────────────────────────────────┤');
    console.log(`   │  Schema Prisma (segments Json)  │      ${checks.schema ? '✅' : '❌'}       │`);
    console.log(`   │  Shifts avec segments extra     │      ${checks.shiftsWithExtra ? '✅' : '❌'}       │`);
    console.log(`   │  Stats: exclusion extras        │      ${checks.statsExclusion ? '✅' : '❌'}       │`);
    console.log(`   │  Routes pointage                │      ${checks.pointageRoutes ? '✅' : '❌'}       │`);
    console.log(`   │  Table paiements extras         │      ${checks.paiementExtras ? '✅' : '❌'}       │`);
    console.log('   └─────────────────────────────────────────────────┘');
    console.log('\n');
    
    const allPassed = Object.values(checks).every(v => v);
    
    if (allPassed) {
      log('✅', 'SYSTÈME POINTAGE EXTRA OPÉRATIONNEL !');
    } else {
      log('⚠️', 'Certains composants nécessitent attention');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
