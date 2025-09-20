// Script unifié: création (ou reset) d'un admin + plusieurs employés standards
// Usage: node create-employes-et-admin.js [--reset] [--admin-pass=MonPass!] [--employe-pass=motdepasse]

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const doReset = args.includes('--reset');
  const adminPassArg = args.find(a => a.startsWith('--admin-pass='));
  const employePassArg = args.find(a => a.startsWith('--employe-pass='));
  const adminPassword = adminPassArg ? adminPassArg.split('=')[1] : 'AdminRH2025!';
  const employePassword = employePassArg ? employePassArg.split('=')[1] : 'test123';

  console.log('👥 Initialisation comptes (admin + employés)');
  console.log('   • reset:', doReset);

  try {
    if (doReset) {
      console.log('🧹 Suppression des utilisateurs existants (sauf comptes système potentiels) ...');
      await prisma.user.deleteMany({});
    }

    // Admin principal
    const adminEmail = 'admin@gestion-rh.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    const hashedAdminPass = await bcrypt.hash(adminPassword, 10);

    if (existingAdmin) {
      console.log('♻️  Admin existant trouvé -> réinitialisation mot de passe');
      await prisma.user.update({ where: { id: existingAdmin.id }, data: { password: hashedAdminPass } });
    } else {
      await prisma.user.create({
        data: {
          email: adminEmail,
            password: hashedAdminPass,
            nom: 'Administrateur',
            prenom: 'Système',
            role: 'admin',
            telephone: '+33 1 23 45 67 89',
            categorie: 'Direction',
            dateEmbauche: new Date('2025-01-01')
        }
      });
      console.log('✅ Admin créé');
    }

    const employes = [
      ['pierre.dupont@test.com','Pierre','Dupont','cuisine'],
      ['sophie.martin@test.com','Sophie','Martin','cuisine'],
      ['luc.bernard@test.com','Luc','Bernard','cuisine'],
      ['claire.moreau@test.com','Claire','Moreau','cuisine'],
      ['marie.durand@test.com','Marie','Durand','service'],
      ['jean.leroy@test.com','Jean','Leroy','service'],
      ['ana.garcia@test.com','Ana','Garcia','service'],
      ['paul.roux@test.com','Paul','Roux','service'],
      ['sylvie.petit@test.com','Sylvie','Petit','management'],
      ['david.laurent@test.com','David','Laurent','management'],
      ['alex.simon@test.com','Alex','Simon','polyvalent'],
      ['lucie.michel@test.com','Lucie','Michel','polyvalent']
    ];

    const hashedEmpPass = await bcrypt.hash(employePassword, 10);
    let created = 0, skipped = 0;

    for (const [email, prenom, nom, categorie] of employes) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) { skipped++; continue; }
      await prisma.user.create({
        data: { email, prenom, nom, password: hashedEmpPass, role: 'employe', categorie }
      });
      created++;
      console.log(`   ➕ ${prenom} ${nom} (${categorie})`);
    }

    console.log('\n📌 RÉSUMÉ');
    console.log('   Admin email: ' + adminEmail + ' / pass: ' + adminPassword);
    console.log('   Employés créés:', created, ' | existants ignorés:', skipped);
    console.log('   Mot de passe employés:', employePassword);
    console.log('\nℹ️  Relance possible avec --reset pour tout recréer.');
  } catch (e) {
    console.error('❌ Erreur:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
