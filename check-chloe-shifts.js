const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const chloe = await prisma.user.findFirst({ 
      where: { email: 'chloe.simon@restaurant.com' } 
    });
    console.log('=== CHLOÉ SIMON ===');
    console.log('ID:', chloe?.id);
    console.log('');
    
    // Ses shifts de la semaine
    const shifts = await prisma.shift.findMany({ 
      where: { 
        employeId: chloe.id, 
        date: { 
          gte: new Date('2025-12-08'), 
          lte: new Date('2025-12-14') 
        } 
      }, 
      include: { 
        remplacements: {
          include: {
            employeRemplacant: { select: { prenom: true, nom: true } }
          }
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('=== SES SHIFTS CETTE SEMAINE ===');
    shifts.forEach(s => { 
      const dateStr = s.date.toISOString().split('T')[0];
      console.log(`Date: ${dateStr} | Type: ${s.type} | Heures: ${s.heureDebut}-${s.heureFin}`);
      console.log(`  Remplacements liés: ${s.remplacements?.length || 0}`);
      if (s.remplacements?.length > 0) { 
        s.remplacements.forEach(r => {
          console.log(`    -> Statut: ${r.statut}`);
          if (r.employeRemplacant) {
            console.log(`    -> Remplaçant: ${r.employeRemplacant.prenom} ${r.employeRemplacant.nom}`);
          }
        });
      }
    });
    
    // Vérifier aussi les demandes où elle est remplaçante
    console.log('\n=== REMPLACEMENTS OÙ ELLE EST REMPLAÇANTE ===');
    const remplacementsCommeRemplacant = await prisma.demandeRemplacement.findMany({
      where: { employeRemplacantId: chloe.id },
      include: {
        shift: true,
        employeAbsent: { select: { prenom: true, nom: true } }
      }
    });
    
    remplacementsCommeRemplacant.forEach(r => {
      console.log(`Shift du ${r.shift?.date?.toISOString().split('T')[0]} | Statut: ${r.statut}`);
      console.log(`  Remplace: ${r.employeAbsent?.prenom} ${r.employeAbsent?.nom}`);
    });
    
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
