const prisma = require('./server/prisma/client');

async function check() {
  try {
    const pointages = await prisma.pointage.findMany({
      where: { id: { in: [2176, 2177] } },
      include: { user: { select: { id: true, email: true } } }
    });
    console.log('Pointages trouvés:', JSON.stringify(pointages, null, 2));
    
    // Vérifier aussi les derniers pointages
    const derniers = await prisma.pointage.findMany({
      orderBy: { id: 'desc' },
      take: 5,
      include: { user: { select: { id: true, email: true } } }
    });
    console.log('\nDerniers pointages:', JSON.stringify(derniers, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

check();
