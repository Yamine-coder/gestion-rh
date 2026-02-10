const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  // Nettoyer les données existantes (optionnel)
  console.log('🧹 Nettoyage des anciennes données...');
  await prisma.anomalie.deleteMany();
  await prisma.extraPaymentLog.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.pointage.deleteMany();
  await prisma.conge.deleteMany();
  await prisma.planning.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();

  // 1. Créer des utilisateurs
  console.log('👥 Création des utilisateurs...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@gestionrh.com',
      password: hashedPassword,
      nom: 'Administrateur',
      prenom: 'Système',
      role: 'admin',
      telephone: '0600000000',
      categorie: 'Cadre',
      dateEmbauche: new Date('2023-01-01'),
      statut: 'actif',
      firstLoginDone: true
    }
  });

  const employe1 = await prisma.user.create({
    data: {
      email: 'jean.dupont@gestionrh.com',
      password: hashedPassword,
      nom: 'Dupont',
      prenom: 'Jean',
      role: 'employee',
      telephone: '0601020304',
      categorie: 'Technicien',
      dateEmbauche: new Date('2023-06-01'),
      statut: 'actif',
      firstLoginDone: true
    }
  });

  const employe2 = await prisma.user.create({
    data: {
      email: 'marie.martin@gestionrh.com',
      password: hashedPassword,
      nom: 'Martin',
      prenom: 'Marie',
      role: 'employee',
      telephone: '0601020305',
      categorie: 'Commercial',
      dateEmbauche: new Date('2023-07-01'),
      statut: 'actif',
      firstLoginDone: true
    }
  });

  const employe3 = await prisma.user.create({
    data: {
      email: 'pierre.durand@gestionrh.com',
      password: hashedPassword,
      nom: 'Durand',
      prenom: 'Pierre',
      role: 'employee',
      telephone: '0601020306',
      categorie: 'Agent',
      dateEmbauche: new Date('2024-01-15'),
      statut: 'actif',
      firstLoginDone: false
    }
  });

  console.log('✅ Utilisateurs créés:', { admin, employe1, employe2, employe3 });

  // 2. Créer des plannings
  console.log('📅 Création des plannings...');
  
  const aujourd_hui = new Date();
  const demain = new Date(aujourd_hui);
  demain.setDate(demain.getDate() + 1);
  const apreDemain = new Date(aujourd_hui);
  apreDemain.setDate(apreDemain.getDate() + 2);

  await prisma.planning.create({
    data: {
      userId: employe1.id,
      date: aujourd_hui,
      heureDebut: new Date(`${aujourd_hui.toISOString().split('T')[0]}T08:00:00Z`),
      heureFin: new Date(`${aujourd_hui.toISOString().split('T')[0]}T16:00:00Z`)
    }
  });

  await prisma.planning.create({
    data: {
      userId: employe2.id,
      date: aujourd_hui,
      heureDebut: new Date(`${aujourd_hui.toISOString().split('T')[0]}T14:00:00Z`),
      heureFin: new Date(`${aujourd_hui.toISOString().split('T')[0]}T22:00:00Z`)
    }
  });

  await prisma.planning.create({
    data: {
      userId: employe3.id,
      date: demain,
      heureDebut: new Date(`${demain.toISOString().split('T')[0]}T09:00:00Z`),
      heureFin: new Date(`${demain.toISOString().split('T')[0]}T17:00:00Z`)
    }
  });

  console.log('✅ Plannings créés');

  // 3. Créer des pointages
  console.log('⏰ Création des pointages...');
  
  const hier = new Date(aujourd_hui);
  hier.setDate(hier.getDate() - 1);

  await prisma.pointage.create({
    data: {
      userId: employe1.id,
      type: 'entrée',
      horodatage: new Date(`${hier.toISOString().split('T')[0]}T08:05:00Z`)
    }
  });

  await prisma.pointage.create({
    data: {
      userId: employe1.id,
      type: 'sortie',
      horodatage: new Date(`${hier.toISOString().split('T')[0]}T16:00:00Z`)
    }
  });

  await prisma.pointage.create({
    data: {
      userId: employe2.id,
      type: 'entrée',
      horodatage: new Date(`${hier.toISOString().split('T')[0]}T14:10:00Z`)
    }
  });

  await prisma.pointage.create({
    data: {
      userId: employe2.id,
      type: 'sortie',
      horodatage: new Date(`${hier.toISOString().split('T')[0]}T22:30:00Z`)
    }
  });

  console.log('✅ Pointages créés');

  // 4. Créer des congés
  console.log('🏖️ Création des congés...');
  
  const dateDebut1 = new Date('2025-11-01');
  const dateFin1 = new Date('2025-11-05');
  const dateDebut2 = new Date('2025-10-25');
  const dateFin2 = new Date('2025-10-26');

  await prisma.conge.create({
    data: {
      userId: employe1.id,
      dateDebut: dateDebut1,
      dateFin: dateFin1,
      type: 'Congé payé',
      statut: 'approuvé',
      vu: true
    }
  });

  await prisma.conge.create({
    data: {
      userId: employe2.id,
      dateDebut: dateDebut2,
      dateFin: dateFin2,
      type: 'Maladie',
      statut: 'en attente',
      vu: false
    }
  });

  await prisma.conge.create({
    data: {
      userId: employe3.id,
      dateDebut: new Date('2025-12-20'),
      dateFin: new Date('2025-12-31'),
      type: 'Congé payé',
      statut: 'en attente',
      vu: false
    }
  });

  console.log('✅ Congés créés');

  // 5. Créer des shifts
  console.log('🔄 Création des shifts...');
  
  const shift1 = await prisma.shift.create({
    data: {
      employeId: employe1.id,
      date: hier,
      type: 'jour',
      segments: [
        {
          debut: '08:00',
          fin: '12:00',
          type: 'normal'
        },
        {
          debut: '13:00',
          fin: '16:00',
          type: 'normal'
        }
      ],
      version: 1
    }
  });

  const shift2 = await prisma.shift.create({
    data: {
      employeId: employe2.id,
      date: hier,
      type: 'soir',
      motif: 'Shift de soirée',
      segments: [
        {
          debut: '14:00',
          fin: '18:00',
          type: 'normal'
        },
        {
          debut: '18:00',
          fin: '22:00',
          type: 'soir'
        }
      ],
      version: 1
    }
  });

  console.log('✅ Shifts créés');

  // 6. Créer des anomalies
  console.log('⚠️ Création des anomalies...');
  
  await prisma.anomalie.create({
    data: {
      employeId: employe1.id,
      date: hier,
      type: 'retard',
      gravite: 'info',
      description: 'Retard de 5 minutes à l\'arrivée',
      details: {
        ecartMinutes: 5,
        heurePrevu: '08:00',
        heureReel: '08:05'
      },
      statut: 'validee',
      traitePar: admin.id,
      traiteAt: new Date()
    }
  });

  await prisma.anomalie.create({
    data: {
      employeId: employe2.id,
      date: hier,
      type: 'heures_sup',
      gravite: 'info',
      description: 'Heures supplémentaires effectuées',
      details: {
        heuresSupplementaires: 0.5,
        heurePrevu: '22:00',
        heureReel: '22:30'
      },
      statut: 'en_attente',
      heuresExtra: 0.5,
      montantExtra: 15.0
    }
  });

  await prisma.anomalie.create({
    data: {
      employeId: employe3.id,
      date: new Date('2025-10-15'),
      type: 'absence_totale',
      gravite: 'critique',
      description: 'Absence non justifiée',
      details: {
        jourComplet: true
      },
      statut: 'en_attente'
    }
  });

  console.log('✅ Anomalies créées');

  // 7. Créer des logs de paiements supplémentaires
  console.log('💰 Création des logs de paiements...');
  
  await prisma.extraPaymentLog.create({
    data: {
      shiftId: shift2.id,
      segmentIndex: 1,
      employeId: employe2.id,
      changedByUserId: admin.id,
      oldValues: {
        montant: 0
      },
      newValues: {
        montant: 15.0,
        motif: 'Heures de soirée'
      }
    }
  });

  console.log('✅ Logs de paiements créés');

  console.log('\n🎉 Seed terminé avec succès !');
  console.log('\n📋 Données de connexion :');
  console.log('━'.repeat(60));
  console.log('👤 Admin:');
  console.log('   Email: admin@gestionrh.com');
  console.log('   Mot de passe: password123');
  console.log('━'.repeat(60));
  console.log('👤 Employé 1 - Jean Dupont:');
  console.log('   Email: jean.dupont@gestionrh.com');
  console.log('   Mot de passe: password123');
  console.log('━'.repeat(60));
  console.log('👤 Employé 2 - Marie Martin:');
  console.log('   Email: marie.martin@gestionrh.com');
  console.log('   Mot de passe: password123');
  console.log('━'.repeat(60));
  console.log('👤 Employé 3 - Pierre Durand:');
  console.log('   Email: pierre.durand@gestionrh.com');
  console.log('   Mot de passe: password123');
  console.log('━'.repeat(60));
  console.log('\n✨ Vous pouvez maintenant vous connecter avec ces comptes !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
