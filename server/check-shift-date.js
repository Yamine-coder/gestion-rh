const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShiftDate() {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: 162 }
    });
    
    if (!shift) {
      console.log('❌ Shift 162 non trouvé');
      return;
    }
    
    console.log('🔍 Shift 162 - Léa Garcia:');
    console.log('Date brute (DB):', shift.date);
    console.log('Date ISO:', shift.date.toISOString());
    console.log('Date UTC:', shift.date.toUTCString());
    console.log('Date locale:', shift.date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));
    console.log('Jour UTC:', shift.date.getUTCDate());
    console.log('Jour local Paris:', new Date(shift.date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }));
    
    // Vérifier si c'est un problème de fuseau horaire
    const dateStr = shift.date.toISOString().split('T')[0];
    console.log('\n📅 Date normalisée (YYYY-MM-DD):', dateStr);
    
    if (dateStr !== '2025-11-29') {
      console.log('⚠️ PROBLÈME: La date en base n\'est pas le 29 novembre!');
      console.log('✅ Solution: Corriger la date du shift');
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkShiftDate();
