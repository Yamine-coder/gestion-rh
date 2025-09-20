const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTodayPointages() {
  try {
    console.log('🔧 Création de pointages pour AUJOURD\'HUI (24 août 2025)...\n');
    
    // Trouver l'utilisateur test@Mouss.com (ID 86)
    const user = await prisma.utilisateur.findFirst({
      where: { 
        OR: [
          { email: 'test@Mouss.com' },
          { id: 86 }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:', user.email, 'ID:', user.id);
    
    // Date d'aujourd'hui
    const today = new Date('2025-08-24'); // Aujourd'hui explicite
    console.log('📅 Date cible:', today.toISOString().split('T')[0]);
    
    // Supprimer les anciens pointages d'aujourd'hui s'il y en a
    const deleted = await prisma.pointage.deleteMany({
      where: {
        userId: user.id,
        date: '2025-08-24'
      }
    });
    console.log(`🗑️ ${deleted.count} pointages d'aujourd'hui supprimés`);
    
    // Créer des pointages réalistes pour aujourd'hui
    
    // 1. Arrivée à 9h00 aujourd'hui
    const arrivee9h = new Date('2025-08-24T09:00:00.000Z');
    const pointage1 = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: arrivee9h,
        date: '2025-08-24'
      }
    });
    console.log('✅ Arrivée 9h00 créée:', pointage1.id);
    
    // 2. Départ pause déjeuner à 12h00
    const depart12h = new Date('2025-08-24T12:00:00.000Z');
    const pointage2 = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: depart12h,
        date: '2025-08-24'
      }
    });
    console.log('✅ Départ 12h00 créé:', pointage2.id);
    
    // 3. Retour de pause à 13h00
    const arrivee13h = new Date('2025-08-24T13:00:00.000Z');
    const pointage3 = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: arrivee13h,
        date: '2025-08-24'
      }
    });
    console.log('✅ Retour 13h00 créé:', pointage3.id);
    
    // 4. Départ final à 17h00
    const depart17h = new Date('2025-08-24T17:00:00.000Z');
    const pointage4 = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: depart17h,
        date: '2025-08-24'
      }
    });
    console.log('✅ Départ 17h00 créé:', pointage4.id);
    
    // Vérifier tous les pointages d'aujourd'hui
    const pointagesAujourdhui = await prisma.pointage.findMany({
      where: {
        userId: user.id,
        date: '2025-08-24'
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log('\n📊 RÉCAPITULATIF DES POINTAGES D\'AUJOURD\'HUI:');
    pointagesAujourdhui.forEach((p, i) => {
      const time = new Date(p.horodatage).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Paris'
      });
      console.log(`  ${i+1}. ${p.type.toUpperCase()} - ${time}`);
    });
    
    // Calculer les heures travaillées
    let totalMs = 0;
    for (let i = 0; i < pointagesAujourdhui.length; i += 2) {
      if (i + 1 < pointagesAujourdhui.length) {
        const arrivee = pointagesAujourdhui[i];
        const depart = pointagesAujourdhui[i + 1];
        if (arrivee.type === 'arrivee' && depart.type === 'depart') {
          const diff = new Date(depart.horodatage) - new Date(arrivee.horodatage);
          totalMs += diff;
          const diffH = Math.floor(diff / 3600000);
          const diffM = Math.floor((diff % 3600000) / 60000);
          console.log(`     → Période ${(i/2)+1}: ${diffH}h${diffM.toString().padStart(2,'0')}`);
        }
      }
    }
    
    const totalHeures = totalMs / (1000 * 60 * 60);
    const h = Math.floor(totalHeures);
    const m = Math.round((totalHeures - h) * 60);
    
    console.log(`\n⏰ TOTAL TRAVAILLÉ: ${h}h${m.toString().padStart(2,'0')} (${totalHeures.toFixed(2)}h)`);
    console.log('📈 Progression: ' + Math.round((totalHeures / 8) * 100) + '%');
    
    console.log('\n🎉 Pointages d\'aujourd\'hui créés avec succès !');
    console.log('📱 Le frontend devrait maintenant afficher ces données correctement.');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    await prisma.$disconnect();
  }
}

createTodayPointages();
