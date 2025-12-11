const prisma = require('./prisma/client');

async function check() {
  try {
    const fiches = await prisma.fichePoste.findMany();
    console.log('=== Fiches de poste existantes ===');
    console.log('Nombre:', fiches.length);
    if (fiches.length > 0) {
      console.log('\nDétail:');
      fiches.forEach(f => {
        console.log(`- ID ${f.id}: ${f.nom || f.titre} (${f.categorie})`);
      });
    } else {
      console.log('\n✅ Aucune fiche existante - Vous ne perdrez rien !');
    }
  } catch (e) {
    console.log('Table inexistante ou vide:', e.message);
    console.log('\n✅ Pas de données à perdre !');
  } finally {
    await prisma.$disconnect();
  }
}

check();
