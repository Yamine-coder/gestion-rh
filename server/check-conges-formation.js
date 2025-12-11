const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCongesFormation() {
  try {
    // Récupérer TOUS les congés avec leurs détails
    const allConges = await prisma.conge.findMany({
      select: {
        id: true,
        type: true,
        motifEmploye: true,
        dateDebut: true,
        dateFin: true
      },
      orderBy: { dateDebut: 'desc' }
    });

    console.log(`\n=== TOUS LES CONGÉS (${allConges.length} total) ===\n`);
    
    // Grouper par type
    const byType = {};
    allConges.forEach(c => {
      if (!byType[c.type]) byType[c.type] = [];
      byType[c.type].push(c);
    });

    for (const [type, conges] of Object.entries(byType)) {
      console.log(`\n--- Type: "${type}" (${conges.length} congés) ---`);
      conges.forEach(c => {
        const motif = c.motifEmploye ? c.motifEmploye.substring(0, 50) : '(pas de motif)';
        console.log(`  ID ${c.id}: ${motif}...`);
      });
    }

    // Chercher spécifiquement les congés qui mentionnent "formation" dans le motif
    console.log(`\n\n=== CONGÉS MENTIONNANT "FORMATION" DANS LE MOTIF ===\n`);
    
    const formationInMotif = allConges.filter(c => 
      c.motifEmploye && c.motifEmploye.toLowerCase().includes('formation')
    );

    formationInMotif.forEach(c => {
      console.log(`ID ${c.id}:`);
      console.log(`  Type: "${c.type}"`);
      console.log(`  Motif: "${c.motifEmploye}"`);
      console.log('');
    });

    if (formationInMotif.length === 0) {
      console.log('Aucun congé ne mentionne "formation" dans le motif.');
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCongesFormation();
