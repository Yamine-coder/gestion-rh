// Script: create-multi-pointages-today.js
// Objectif: Créer rapidement une séquence Arrivée → Départ → Arrivée → Départ pour aujourd'hui
// Utilisation: node create-multi-pointages-today.js --email user@example.com [--delai 30]
// Par défaut: supprime les pointages existants d'aujourd'hui pour l'utilisateur (sauf si --no-clean)
// --delai = minutes entre les blocs simulés (par défaut 30)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { email: null, delai: 30, clean: true };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i+1]) { opts.email = args[i+1]; i++; }
    else if (args[i] === '--delai' && args[i+1]) { opts.delai = parseInt(args[i+1], 10); i++; }
    else if (args[i] === '--no-clean') { opts.clean = false; }
  }
  return opts;
}

async function main() {
  const { email, delai, clean } = parseArgs();
  if (!email) {
    console.error('❌ Argument manquant: --email user@example.com');
    console.log('Usage: node create-multi-pointages-today.js --email admin@test.com --delai 30');
    process.exit(1);
  }
  console.log(`▶️ Création séquence multi-pointages pour ${email} (intervalle simulé ${delai} min)`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('❌ Utilisateur introuvable');
    console.log('💡 Utilisateurs disponibles:');
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    users.forEach(u => console.log(`   - ${u.email}`));
    process.exit(1);
  }

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(now); endOfDay.setHours(23,59,59,999);

  // Fenêtre de la journée
  const baseTime = new Date();
  if (clean) {
    console.log('🧹 Nettoyage: suppression des pointages existants pour aujourd\'hui...');
    const deleted = await prisma.pointage.deleteMany({
      where: {
        userId: user.id,
        horodatage: { gte: startOfDay, lte: endOfDay }
      }
    });
    console.log(`   → ${deleted.count} pointage(s) supprimé(s).`);
  } else {
    console.log('⏭️  Option --no-clean utilisée: conservation des pointages existants.');
  }

  const sequence = [
    { type: 'arrivee', offsetMin: 0 },
    { type: 'depart', offsetMin: delai },
    { type: 'arrivee', offsetMin: delai * 2 },
    { type: 'depart', offsetMin: delai * 3 },
  ];

  const created = [];
  for (const item of sequence) {
    const horodatage = new Date(baseTime.getTime() + item.offsetMin * 60000);
    const record = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: item.type,
        horodatage
      }
    });
    created.push(record);
    console.log(`✅ ${item.type.toUpperCase()} -> ${horodatage.toLocaleTimeString('fr-FR')}`);
  }

  // Récap
  const todayPointages = await prisma.pointage.findMany({
    where: { userId: user.id, horodatage: { gte: startOfDay, lte: endOfDay } },
    orderBy: { horodatage: 'asc' }
  });
  console.log('\n📊 Pointages du jour:');
  todayPointages.forEach(p => console.log(`${p.type.padEnd(7)} ${new Date(p.horodatage).toLocaleTimeString('fr-FR')}`));

  // Calcul durée travaillée
  let totalMs = 0;
  for (let i=0;i<todayPointages.length-1;i+=2) {
    const a = todayPointages[i];
    const d = todayPointages[i+1];
    if (a && d && a.type === 'arrivee' && d.type === 'depart') {
      totalMs += (new Date(d.horodatage) - new Date(a.horodatage));
    }
  }
  const h = totalMs / 3600000;
  const heures = Math.floor(h);
  const minutes = Math.round((h - heures) * 60);
  console.log(`\n⏱️ Total simulé: ${heures}h${minutes.toString().padStart(2,'0')}`);
  console.log(`\n🎯 Maintenant, va sur ta vue journalière pour voir les pointages multiples sur une seule ligne !`);

  await prisma.$disconnect();
}

main().catch(e => { 
  console.error('❌ Erreur:', e.message); 
  prisma.$disconnect(); 
  process.exit(1); 
});
