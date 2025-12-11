const prisma = require('./prisma/client');

async function checkSchema() {
  // Voir un shift existant pour comprendre la structure
  const shift = await prisma.shift.findFirst();
  console.log('Shift exemple:');
  console.log(JSON.stringify(shift, null, 2));
  await prisma.$disconnect();
}
checkSchema();
