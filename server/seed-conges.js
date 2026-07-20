require('dotenv').config();
const prisma = require('./prisma/client');

async function main() {
  const demandes = [
    // Jean Dupont - CP en attente (urgent, dans 2 jours)
    {
      userId: 2,
      type: 'Congés payés',
      dateDebut: new Date('2026-06-19'),
      dateFin: new Date('2026-06-25'),
      statut: 'en attente',
      motifEmploye: 'Vacances familiales prévues de longue date',
      vu: false
    },
    // Marie Martin - RTT en attente (mois prochain)
    {
      userId: 3,
      type: 'RTT',
      dateDebut: new Date('2026-07-10'),
      dateFin: new Date('2026-07-11'),
      statut: 'en attente',
      motifEmploye: 'Rendez-vous administratif',
      vu: false
    },
    // Jean Dupont - Maladie approuvé (passé)
    {
      userId: 2,
      type: 'maladie',
      dateDebut: new Date('2026-06-02'),
      dateFin: new Date('2026-06-04'),
      statut: 'approuvé',
      motifEmploye: 'Grippe - certificat médical fourni',
      vu: true
    },
    // Marie Martin - CP approuvé (ce mois)
    {
      userId: 3,
      type: 'Congés payés',
      dateDebut: new Date('2026-06-23'),
      dateFin: new Date('2026-06-27'),
      statut: 'approuvé',
      motifEmploye: 'Mariage de ma sœur',
      vu: true
    },
    // Dev Local - Sans solde refusé
    {
      userId: 1,
      type: 'sans_solde',
      dateDebut: new Date('2026-07-01'),
      dateFin: new Date('2026-07-05'),
      statut: 'refusé',
      motifEmploye: 'Projet personnel',
      vu: true
    },
    // Jean Dupont - RTT en attente (express, dans 5 jours)
    {
      userId: 2,
      type: 'RTT',
      dateDebut: new Date('2026-06-22'),
      dateFin: new Date('2026-06-22'),
      statut: 'en attente',
      motifEmploye: 'Déménagement',
      vu: false
    },
    // Marie Martin - Congé sans solde en attente
    {
      userId: 3,
      type: 'sans_solde',
      dateDebut: new Date('2026-08-01'),
      dateFin: new Date('2026-08-10'),
      statut: 'en attente',
      motifEmploye: 'Voyage à l\'étranger prévu depuis longtemps',
      vu: false
    },
    // Dev Local - CP approuvé (mois prochain)
    {
      userId: 1,
      type: 'Congés payés',
      dateDebut: new Date('2026-07-14'),
      dateFin: new Date('2026-07-18'),
      statut: 'approuvé',
      motifEmploye: 'Fête nationale + pont',
      vu: true
    }
  ];

  for (const d of demandes) {
    await prisma.conge.create({ data: d });
  }

  console.log(`✅ ${demandes.length} demandes de congés créées`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
