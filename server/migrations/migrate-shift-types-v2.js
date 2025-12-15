/**
 * 🔄 MIGRATION DES TYPES DE SHIFTS V2
 * 
 * Objectif : Simplifier le modèle - le créneau est maintenant calculé depuis les segments
 * 
 * AVANT :
 *   type: travail | repos | absence | matin | soir | coupure | journee | présence | NORMAL
 * 
 * APRÈS :
 *   type: travail | repos | conge | absence
 *   (le créneau midi/soir/coupure/continue est calculé dynamiquement depuis segments)
 * 
 * Règles de migration :
 *   - matin, soir, coupure, journee, présence, NORMAL → 'travail'
 *   - repos → reste 'repos'
 *   - absence → reste 'absence'
 *   - travail → reste 'travail'
 * 
 * Usage: node server/migrations/migrate-shift-types-v2.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 MIGRATION DES TYPES DE SHIFTS V2');
  console.log(isDryRun ? '⚠️  MODE DRY-RUN (aucune modification)' : '🚀 MODE RÉEL');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Analyser l'état actuel
    console.log('📊 Analyse de l\'état actuel...\n');
    
    const allShifts = await prisma.shift.findMany({
      select: { id: true, type: true, motif: true }
    });
    
    console.log(`Total shifts: ${allShifts.length}\n`);
    
    // Compter par type actuel
    const countByType = {};
    allShifts.forEach(s => {
      const key = s.type || 'null';
      countByType[key] = (countByType[key] || 0) + 1;
    });
    
    console.log('État actuel par type:');
    Object.entries(countByType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('');

    // 2. Préparer les migrations
    // Types qui représentent des créneaux horaires → doivent devenir 'travail'
    const typesToMigrate = ['matin', 'soir', 'coupure', 'journee', 'présence', 'NORMAL', 'presence'];
    
    const toMigrate = allShifts.filter(s => 
      typesToMigrate.map(t => t.toLowerCase()).includes((s.type || '').toLowerCase())
    );

    console.log('📋 Plan de migration:');
    console.log(`  → ${toMigrate.length} shifts à migrer vers 'travail'`);
    console.log(`  → ${allShifts.length - toMigrate.length} shifts déjà corrects`);
    console.log('');

    if (toMigrate.length === 0) {
      console.log('✅ Rien à migrer ! Tous les shifts ont déjà un type correct.');
      return;
    }

    if (isDryRun) {
      console.log('⚠️  DRY-RUN: Aucune modification effectuée.');
      console.log('   Relancez sans --dry-run pour appliquer.');
      console.log('\n   Shifts qui seraient migrés:');
      toMigrate.slice(0, 10).forEach(s => {
        console.log(`     ID ${s.id}: "${s.type}" → "travail"`);
      });
      if (toMigrate.length > 10) {
        console.log(`     ... et ${toMigrate.length - 10} autres`);
      }
      return;
    }

    // 3. Appliquer les migrations
    console.log('🔧 Application des migrations...\n');

    const result = await prisma.shift.updateMany({
      where: { id: { in: toMigrate.map(s => s.id) } },
      data: { type: 'travail' }
    });
    console.log(`✅ ${result.count} shifts migrés vers 'travail'`);

    // 4. Vérification finale
    console.log('\n📊 Vérification post-migration...\n');
    
    const finalCount = await prisma.shift.groupBy({
      by: ['type'],
      _count: true
    });
    
    console.log('Répartition finale:');
    finalCount.forEach(({ type, _count }) => {
      const emoji = type === 'travail' ? '💼' : type === 'repos' ? '🏠' : type === 'conge' ? '🏖️' : type === 'absence' ? '❌' : '❓';
      console.log(`  ${emoji} ${type}: ${_count}`);
    });

    console.log('\n✅ Migration terminée avec succès !');
    console.log('\n📝 Note: Le créneau (midi/soir/coupure/continue) est maintenant');
    console.log('   calculé dynamiquement depuis les segments avec getCreneauFromSegments()');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch(console.error);
