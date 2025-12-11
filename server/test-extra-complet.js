const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧪 TEST COMPLET EXTRA - BOUT EN BOUT\n');
    console.log('='.repeat(50));
    
    // 1. Vérifier les utilisateurs extra
    console.log('\n📋 1. UTILISATEURS EXTRA EXISTANTS:');
    const extras = await prisma.user.findMany({
      where: { role: 'extra' },
      select: { id: true, nom: true, prenom: true, email: true, statut: true }
    });
    console.log('   Nombre d\'extras:', extras.length);
    extras.forEach(e => console.log('   -', e.prenom, e.nom, '(' + e.email + ') - Statut:', e.statut));
    
    // 2. Vérifier les shifts des extras
    console.log('\n📅 2. SHIFTS DES EXTRAS:');
    for (const extra of extras) {
      const shifts = await prisma.shift.findMany({
        where: { employeId: extra.id },
        orderBy: { date: 'desc' },
        take: 3
      });
      console.log('   ' + extra.prenom + ':', shifts.length, 'shifts');
      shifts.forEach(s => console.log('      -', s.date.toISOString().split('T')[0], s.heureDebut + '-' + s.heureFin, '(' + s.type + ')'));
    }
    
    // 3. Vérifier les pointages des extras
    console.log('\n⏰ 3. POINTAGES DES EXTRAS:');
    for (const extra of extras) {
      const pointages = await prisma.pointage.findMany({
        where: { userId: extra.id },
        orderBy: { horodatage: 'desc' },
        take: 3
      });
      console.log('   ' + extra.prenom + ':', pointages.length, 'pointages');
      pointages.forEach(p => console.log('      -', p.horodatage.toISOString(), '(' + p.type + ')'));
    }
    
    // 4. Vérifier les congés des extras
    console.log('\n🏖️ 4. CONGES DES EXTRAS:');
    for (const extra of extras) {
      const conges = await prisma.conge.findMany({
        where: { userId: extra.id }
      });
      console.log('   ' + extra.prenom + ':', conges.length, 'demandes de congés');
    }
    
    // 5. Test de connexion simulé
    console.log('\n🔐 5. VERIFICATION AUTHENTIFICATION:');
    if (extras.length > 0) {
      const testExtra = extras[0];
      const fullUser = await prisma.user.findUnique({
        where: { id: testExtra.id },
        select: { password: true }
      });
      console.log('   Hash password présent:', !!fullUser.password);
      console.log('   Longueur hash:', fullUser.password?.length || 0);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST TERMINE');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
