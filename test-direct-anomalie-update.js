const prisma = require('./server/prisma/client');

async function testDirectUpdate() {
  try {
    console.log('🔍 Test mise à jour anomalie 69...');
    
    // Récupérer l'anomalie
    const anomalie = await prisma.anomalie.findUnique({
      where: { id: 69 },
      include: {
        employe: { select: { nom: true, prenom: true, email: true } }
      }
    });
    
    console.log('📋 Anomalie trouvée:', {
      id: anomalie.id,
      type: anomalie.type,
      statut: anomalie.statut,
      employe: `${anomalie.employe.prenom} ${anomalie.employe.nom}`
    });
    
    // Tenter la mise à jour
    console.log('\n🔧 Tentative de mise à jour...');
    const updated = await prisma.anomalie.update({
      where: { id: 69 },
      data: {
        commentaireManager: 'Test commentaire manager',
        traitePar: 1,
        traiteAt: new Date(),
        statut: 'validee'
      },
      include: {
        employe: { select: { nom: true, prenom: true } },
        traiteur: { select: { nom: true, prenom: true } }
      }
    });
    
    console.log('✅ Mise à jour réussie:', {
      id: updated.id,
      statut: updated.statut,
      commentaireManager: updated.commentaireManager,
      traiteur: updated.traiteur
    });
    
  } catch (error) {
    console.error('❌ ERREUR DÉTAILLÉE:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', JSON.stringify(error.meta, null, 2));
    }
    console.error('\nStack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectUpdate();
