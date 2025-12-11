// Script de vérification des anomalies
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnomalies() {
  try {
    console.log('=== VÉRIFICATION DES ANOMALIES ===\n');
    
    // 1. Dernières anomalies créées
    const anomalies = await prisma.anomalie.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        employe: { select: { nom: true, prenom: true } }
      }
    });
    
    console.log('📋 15 dernières anomalies:');
    console.log('-'.repeat(80));
    
    for (const a of anomalies) {
      const date = new Date(a.date).toLocaleDateString('fr-FR');
      const nom = `${a.employe?.prenom || ''} ${a.employe?.nom || ''}`.trim() || 'N/A';
      const desc = a.description?.substring(0, 50) || '';
      console.log(`${a.type.padEnd(25)} | ${nom.padEnd(20)} | ${date} | ${desc}...`);
    }
    
    console.log('\n');
    
    // 2. Statistiques par type
    const stats = await prisma.anomalie.groupBy({
      by: ['type'],
      _count: { type: true }
    });
    
    console.log('📊 Statistiques par type:');
    console.log('-'.repeat(40));
    stats.forEach(s => {
      console.log(`${s.type.padEnd(25)} : ${s._count.type}`);
    });
    
    console.log('\n');
    
    // 3. Anomalies du jour
    const today = new Date().toISOString().split('T')[0];
    const todayAnomalies = await prisma.anomalie.findMany({
      where: {
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      },
      include: {
        employe: { select: { nom: true, prenom: true } }
      }
    });
    
    console.log(`📅 Anomalies du ${today}: ${todayAnomalies.length}`);
    if (todayAnomalies.length > 0) {
      todayAnomalies.forEach(a => {
        const nom = `${a.employe?.prenom || ''} ${a.employe?.nom || ''}`.trim();
        console.log(`  - ${a.type}: ${nom}`);
      });
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnomalies();
