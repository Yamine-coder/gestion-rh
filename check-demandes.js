const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Récupérer les demandes de remplacement récentes
    const demandes = await prisma.demandeRemplacement.findMany({
      include: {
        shift: true,
        employeAbsent: { select: { prenom: true, nom: true } },
        employeRemplacant: { select: { prenom: true, nom: true } },
        candidatures: {
          include: {
            employe: { select: { prenom: true, nom: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('=== DEMANDES DE REMPLACEMENT RÉCENTES ===\n');
    
    for (const d of demandes) {
      console.log(`ID: ${d.id}`);
      console.log(`Employé absent: ${d.employeAbsent?.prenom} ${d.employeAbsent?.nom}`);
      console.log(`Remplaçant: ${d.employeRemplacant ? d.employeRemplacant.prenom + ' ' + d.employeRemplacant.nom : 'Aucun'}`);
      console.log(`Shift Date: ${d.shift?.date}`);
      console.log(`Statut: ${d.statut}`);
      console.log(`Priorité: ${d.priorite}`);
      console.log(`Candidatures: ${d.candidatures?.length || 0}`);
      if (d.candidatures?.length > 0) {
        d.candidatures.forEach(c => {
          console.log(`  - ${c.employe?.prenom} ${c.employe?.nom} (${c.statut})`);
        });
      }
      console.log('---');
    }
    
    // Vérifier les shifts de Chloe autour du 11 décembre
    console.log('\n=== SHIFTS DE CHLOE SIMON (11 déc) ===\n');
    const chloe = await prisma.user.findFirst({
      where: { email: 'chloe.simon@restaurant.com' }
    });
    
    if (chloe) {
      const shifts = await prisma.shift.findMany({
        where: {
          userId: chloe.id,
          date: {
            gte: new Date('2025-12-10'),
            lte: new Date('2025-12-12')
          }
        },
        include: {
          demandeRemplacement: {
            include: {
              candidatures: true
            }
          }
        }
      });
      
      for (const s of shifts) {
        console.log(`Date: ${s.date}`);
        console.log(`Type: ${s.type}`);
        console.log(`Horaires: ${s.heureDebut} - ${s.heureFin}`);
        console.log(`Demande Remplacement: ${s.demandeRemplacement ? 'OUI' : 'NON'}`);
        if (s.demandeRemplacement) {
          console.log(`  Statut: ${s.demandeRemplacement.statut}`);
          console.log(`  Candidatures: ${s.demandeRemplacement.candidatures?.length || 0}`);
        }
        console.log('---');
      }
    }
    
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
