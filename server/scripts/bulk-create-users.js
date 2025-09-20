// scripts/bulk-create-users.js
// Création en masse d'utilisateurs employé pour tester l'affichage (vue dense)
// Usage: node scripts/bulk-create-users.js 20   (par défaut 10)

const { PrismaClient } = require('@prisma/client');
// Supporte bcryptjs ou bcrypt selon ce qui est installé
let bcrypt;
try { bcrypt = require('bcryptjs'); }
catch { bcrypt = require('bcrypt'); }
const prisma = new PrismaClient();

async function main() {
  const countArg = parseInt(process.argv[2] || '10', 10);
  const howMany = isNaN(countArg) ? 10 : countArg;
  console.log(`➡ Création de ${howMany} employés de test...`);

  // Chercher combien existent déjà avec le prefix test.planning+
  const existing = await prisma.user.findMany({
    where: { email: { startsWith: 'test.planning+' } },
    select: { id: true, email: true }
  });
  let indexStart = existing.length; // continuer la numérotation

  const passwordHash = await bcrypt.hash('Test1234!', 10);
  const created = [];
  for (let i = 0; i < howMany; i++) {
    const num = indexStart + i + 1;
    const email = `test.planning+${num}@example.com`;
    try {
      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: 'employee',
          prenom: `Test${num}`,
          nom: 'Planning'
        }
      });
      created.push(user);
      if ((i + 1) % 5 === 0) console.log(`  - ${i + 1}/${howMany} créés...`);
    } catch (e) {
      console.warn(`  ! Skip ${email}: ${e.code || e.message}`);
    }
  }

  console.log(`✅ Créés: ${created.length} / ${howMany}`);
  created.slice(0, 10).forEach(u => console.log(`  • ${u.id} ${u.email}`));
  if (created.length > 10) console.log('  ...');
}

main()
  .catch(e => { console.error('Erreur bulk create:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
