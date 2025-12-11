const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixStatutNull() {
  try {
    console.log("🔍 Recherche des employés sans statut...");
    
    // Trouver tous les employés avec statut null
    const employesSansStatut = await prisma.user.findMany({
      where: {
        statut: null
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        statut: true
      }
    });

    console.log(`📊 ${employesSansStatut.length} employé(s) trouvé(s) sans statut`);

    if (employesSansStatut.length > 0) {
      console.log("\n👥 Liste des employés concernés:");
      employesSansStatut.forEach(e => {
        console.log(`  - [${e.id}] ${e.prenom} ${e.nom} (${e.email}) - statut: ${e.statut}`);
      });

      console.log("\n✏️ Mise à jour en cours...");
      
      // Mettre à jour tous ces employés pour avoir statut = 'actif'
      const result = await prisma.user.updateMany({
        where: {
          statut: null
        },
        data: {
          statut: 'actif'
        }
      });

      console.log(`✅ ${result.count} employé(s) mis à jour avec statut = 'actif'`);
    } else {
      console.log("✅ Tous les employés ont déjà un statut défini");
    }

  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStatutNull();
