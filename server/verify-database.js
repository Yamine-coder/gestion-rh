const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('🔍 VÉRIFICATION DE LA BASE DE DONNÉES');
    console.log('=====================================\n');

    // 1. Utilisateurs
    console.log('👥 UTILISATEURS:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        categorie: true
      },
      orderBy: { role: 'desc' }
    });
    
    users.forEach(user => {
      console.log(`   ${user.role === 'admin' ? '🔑' : '👤'} ${user.prenom} ${user.nom} (${user.email}) - ${user.categorie} [ID: ${user.id}]`);
    });

    // 2. Shifts par employé
    console.log('\n📅 SHIFTS PAR EMPLOYÉ:');
    const shiftsCount = await prisma.shift.groupBy({
      by: ['employeId'],
      _count: { id: true }
    });
    
    for (const shiftGroup of shiftsCount) {
      const employe = await prisma.user.findUnique({
        where: { id: shiftGroup.employeId },
        select: { prenom: true, nom: true }
      });
      console.log(`   👤 ${employe.prenom} ${employe.nom}: ${shiftGroup._count.id} shifts`);
    }

    // 3. Pointages par employé
    console.log('\n⏰ POINTAGES PAR EMPLOYÉ:');
    const pointagesCount = await prisma.pointage.groupBy({
      by: ['userId'],
      _count: { id: true }
    });
    
    for (const pointageGroup of pointagesCount) {
      const employe = await prisma.user.findUnique({
        where: { id: pointageGroup.userId },
        select: { prenom: true, nom: true }
      });
      console.log(`   👤 ${employe.prenom} ${employe.nom}: ${pointageGroup._count.id} pointages`);
    }

    // 4. Anomalies détaillées
    console.log('\n⚠️ ANOMALIES CRÉÉES:');
    const anomalies = await prisma.anomalie.findMany({
      include: {
        employe: {
          select: { prenom: true, nom: true }
        },
        traiteur: {
          select: { prenom: true, nom: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    anomalies.forEach(anomalie => {
      const dateStr = anomalie.date.toLocaleDateString('fr-FR');
      const statusIcon = anomalie.statut === 'validee' ? '✅' : 
                        anomalie.statut === 'refusee' ? '❌' : 
                        anomalie.statut === 'traitee' ? '🔧' : '⏳';
      console.log(`   ${statusIcon} [${anomalie.type}] ${anomalie.employe.prenom} ${anomalie.employe.nom} - ${dateStr}`);
      console.log(`      📝 ${anomalie.description}`);
      if (anomalie.details) {
        console.log(`      📊 Détails: ${JSON.stringify(anomalie.details)}`);
      }
      if (anomalie.traiteur) {
        console.log(`      👨‍💼 Traité par: ${anomalie.traiteur.prenom} ${anomalie.traiteur.nom}`);
      }
      console.log(`      📍 Statut: ${anomalie.statut} (${anomalie.gravite})`);
      console.log('');
    });

    // 5. Congés
    console.log('🏖️ CONGÉS:');
    const conges = await prisma.conge.findMany({
      include: {
        user: {
          select: { prenom: true, nom: true }
        }
      }
    });

    conges.forEach(conge => {
      const debut = conge.dateDebut.toLocaleDateString('fr-FR');
      const fin = conge.dateFin.toLocaleDateString('fr-FR');
      const statusIcon = conge.statut === 'validé' ? '✅' : '⏳';
      console.log(`   ${statusIcon} ${conge.type} - ${conge.user.prenom} ${conge.user.nom}: ${debut} → ${fin} (${conge.statut})`);
    });

    // 6. Test spécifique: Anomalie hors_plage_in pour Mouss Test
    console.log('\n🎯 TEST SPÉCIFIQUE - Anomalie hors_plage_in pour Mouss Test:');
    const moussTest = users.find(u => u.email.includes('mouss.test'));
    if (moussTest) {
      const horsPlageAnomalie = await prisma.anomalie.findFirst({
        where: {
          employeId: moussTest.id,
          type: 'hors_plage_in'
        }
      });
      
      if (horsPlageAnomalie) {
        console.log(`   ✅ Anomalie trouvée: ${horsPlageAnomalie.description}`);
        console.log(`   📅 Date: ${horsPlageAnomalie.date.toLocaleDateString('fr-FR')}`);
        console.log(`   📊 Statut: ${horsPlageAnomalie.statut}`);
        console.log(`   📝 Détails: ${JSON.stringify(horsPlageAnomalie.details, null, 2)}`);
      } else {
        console.log('   ❌ Aucune anomalie hors_plage_in trouvée pour Mouss Test');
      }
    }

    console.log('\n✅ Vérification terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
