const prisma = require('./server/prisma/client');

async function fixRemplacementMotif() {
  try {
    // Trouver l'employé 110
    const employe110 = await prisma.user.findUnique({
      where: { id: 110 },
      select: { prenom: true, nom: true }
    });
    
    console.log('Employé 110:', employe110);
    
    // Corriger le motif du shift 7905
    const shift = await prisma.shift.update({
      where: { id: 7905 },
      data: { 
        motif: `Remplacement de ${employe110.prenom} ${employe110.nom}` 
      }
    });
    
    console.log('✅ Shift corrigé:', shift.id, '- Motif:', shift.motif);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemplacementMotif();
