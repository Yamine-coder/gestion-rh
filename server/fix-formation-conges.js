const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFormationConges() {
  // Trouver les congés mal typés (type "Autre" mais motif contient "formation")
  const congesMalTypes = await prisma.conge.findMany({
    where: {
      type: 'Autre',
      motifEmploye: { contains: 'ormation', mode: 'insensitive' }
    }
  });
  
  console.log(`Trouvé ${congesMalTypes.length} congés "Autre" avec "formation" dans le motif:`);
  congesMalTypes.forEach(c => {
    console.log(`  ID ${c.id}: "${c.motifEmploye}"`);
  });
  
  if (congesMalTypes.length > 0) {
    // Corriger le type
    const result = await prisma.conge.updateMany({
      where: {
        type: 'Autre',
        motifEmploye: { contains: 'ormation', mode: 'insensitive' }
      },
      data: {
        type: 'Congé formation'
      }
    });
    
    console.log(`\n✅ ${result.count} congés corrigés: type changé en "Congé formation"`);
  }
  
  // Vérification après correction
  console.log('\n=== Types de congés après correction ===');
  const types = await prisma.conge.groupBy({
    by: ['type'],
    _count: true
  });
  types.forEach(t => console.log(`  "${t.type}": ${t._count} congés`));
  
  await prisma.$disconnect();
}

fixFormationConges();
