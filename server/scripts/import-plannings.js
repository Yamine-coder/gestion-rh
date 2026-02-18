/**
 * Script d'import des plannings récurrents en masse
 * Usage: cd server && node scripts/import-plannings.js
 * 
 * Période : 01/01/2026 → 30/06/2026
 * Utilise la base Neon si DATABASE_URL est défini en env
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ============================================
// CONFIGURATION PÉRIODE
// ============================================
const START_DATE = '2026-01-01';
const END_DATE   = '2026-06-30';

// Jours : 0=Dimanche, 1=Lundi, 2=Mardi, 3=Mercredi, 4=Jeudi, 5=Vendredi, 6=Samedi
const LUNDI = 1, MARDI = 2, MERCREDI = 3, JEUDI = 4, VENDREDI = 5, SAMEDI = 6, DIMANCHE = 0;

// Helper : créer un segment standard
function seg(start, end, commentaire = '') {
  return {
    id: crypto.randomUUID(),
    start, end, commentaire,
    aValider: false, isExtra: false,
    extraMontant: '', paymentStatus: 'à_payer',
    paymentMethod: '', paymentDate: '', paymentNote: ''
  };
}

// ============================================
// PLANNINGS PAR EMPLOYÉ (email → planning par jour)
// ============================================
const PLANNINGS = [
  // ── CAISSE / SERVICE ──
  {
    email: 'gutierrezerika2510@gmail.com', // ERIKA
    jours: {
      [LUNDI]:    [seg('17:00', '23:30')],
      [MARDI]:    null, // OFF
      [MERCREDI]: null,
      [JEUDI]:    [seg('16:00', '23:30')],
      [VENDREDI]: null,
      [SAMEDI]:   [seg('12:00', '16:00'), seg('17:00', '23:30')],
      [DIMANCHE]: [seg('12:00', '16:00'), seg('17:00', '23:30')],
    }
  },
  {
    email: 'kiara_d31@outlook.com', // KIARA
    jours: {
      [LUNDI]:    [seg('18:00', '23:45')],
      [MARDI]:    null,
      [MERCREDI]: null,
      [JEUDI]:    [seg('19:00', '23:45')],
      [VENDREDI]: null,
      [SAMEDI]:   [seg('19:00', '23:45')],
      [DIMANCHE]: [seg('10:00', '18:00')],
    }
  },
  {
    email: 'lisethfranco723@gmail.com', // LIZETH
    jours: {
      [LUNDI]:    [seg('10:00', '18:00')],
      [MARDI]:    [seg('10:00', '16:00')],
      [MERCREDI]: [seg('10:00', '16:00')],
      [JEUDI]:    [seg('10:00', '16:00')],
      [VENDREDI]: [seg('10:00', '17:00')],
      [SAMEDI]:   [seg('10:00', '17:00')],
      [DIMANCHE]: null,
    }
  },
  {
    email: 'selimkefi8@gmail.com', // SELIM
    jours: {
      [LUNDI]:    null,
      [MARDI]:    null,
      [MERCREDI]: null,
      [JEUDI]:    null,
      [VENDREDI]: [seg('19:00', '23:30')],
      [SAMEDI]:   [seg('12:30', '17:00')],
      [DIMANCHE]: [seg('12:30', '17:00'), seg('18:00', '23:30')],
    }
  },
  {
    email: 'adamoo9452@gmail.com', // ADAMA
    jours: {
      [LUNDI]:    null,
      [MARDI]:    [seg('17:00', '00:00')],
      [MERCREDI]: [seg('17:00', '00:00')],
      [JEUDI]:    [seg('17:00', '00:00')],
      [VENDREDI]: [seg('17:00', '00:00')],
      [SAMEDI]:   [seg('17:00', '00:00')],
      [DIMANCHE]: [seg('17:00', '00:00')],
    }
  },
  {
    email: 'fandinoavendanoalejandra@gmail.com', // ALEJANDRA
    jours: {
      [LUNDI]:    null,
      [MARDI]:    [seg('16:00', '23:45')],
      [MERCREDI]: [seg('16:00', '23:45')],
      [JEUDI]:    null, // REPOS
      [VENDREDI]: [seg('16:00', '23:45')],
      [SAMEDI]:   [seg('18:00', '23:30')],
      [DIMANCHE]: null,
    }
  },
  {
    email: 'amdouni.hann@gmail.com', // HANNA
    jours: {
      [LUNDI]:    [seg('11:00', '16:00')],
      [MARDI]:    [seg('11:00', '16:00')],
      [MERCREDI]: [seg('11:00', '16:00')],
      [JEUDI]:    [seg('11:00', '16:00')],
      [VENDREDI]: [seg('11:00', '16:00')],
      [SAMEDI]:   null,
      [DIMANCHE]: null,
    }
  },
  {
    email: 'santiagomarquez.pov@gmail.com', // SANTIAGO
    jours: {
      [LUNDI]:    [seg('12:00', '14:30'), seg('19:00', '23:30')],
      [MARDI]:    [seg('12:00', '14:30'), seg('19:00', '23:30')],
      [MERCREDI]: [seg('12:00', '14:30'), seg('19:00', '23:30')],
      [JEUDI]:    [seg('12:00', '14:30')],
      [VENDREDI]: [seg('12:00', '14:30')],
      [SAMEDI]:   null,
      [DIMANCHE]: [seg('19:00', '23:30')],
    }
  },

  // ── ENTRETIEN ──
  {
    email: 'moussasam2022@gmail.com', // MOUSSA SAM
    jours: {
      [LUNDI]:    [seg('08:00', '15:00')],
      [MARDI]:    [seg('08:00', '15:00')],
      [MERCREDI]: null,
      [JEUDI]:    null,
      [VENDREDI]: [seg('08:00', '15:00')],
      [SAMEDI]:   [seg('17:00', '00:00')],
      [DIMANCHE]: [seg('17:00', '00:00')],
    }
  },
  {
    email: 'tm6581273@gmail.com', // MOUSSA TRAORE
    jours: {
      [LUNDI]:    null,
      [MARDI]:    null,
      [MERCREDI]: [seg('08:00', '15:00')],
      [JEUDI]:    [seg('08:00', '15:00')],
      [VENDREDI]: [seg('08:00', '15:00')],
      [SAMEDI]:   [seg('08:00', '15:00')],
      [DIMANCHE]: [seg('15:00', '00:00')],
    }
  },
  {
    email: 'michehajabangura@gmail.com', // FATIMA (Haja Fatmata BANGURA)
    jours: {
      [LUNDI]:    null,
      [MARDI]:    null,
      [MERCREDI]: [seg('08:00', '16:00')],
      [JEUDI]:    [seg('08:00', '16:00')],
      [VENDREDI]: [seg('08:00', '16:00')],
      [SAMEDI]:   [seg('08:00', '16:20')],
      [DIMANCHE]: [seg('08:00', '16:20')],
    }
  },
  {
    email: 'manite01@outlook.fr', // MANITE ETIENNE
    jours: {
      [LUNDI]:    [seg('07:00', '11:00')],
      [MARDI]:    [seg('07:00', '11:00')],
      [MERCREDI]: [seg('07:00', '11:00')],
      [JEUDI]:    [seg('07:00', '11:00')],
      [VENDREDI]: [seg('07:00', '11:00')],
      [SAMEDI]:   null,
      [DIMANCHE]: null,
    }
  },
  {
    email: 'diarrasambou67@gmail.com', // SAMBOU DIARRA
    jours: {
      [LUNDI]:    [seg('16:00', '00:00')],
      [MARDI]:    [seg('16:00', '00:00')],
      [MERCREDI]: [seg('16:00', '00:00')],
      [JEUDI]:    [seg('16:00', '00:00')],
      [VENDREDI]: [seg('16:00', '00:00')],
      [SAMEDI]:   [seg('16:00', '00:00')],
      [DIMANCHE]: null,
    }
  },

  // ── SÉCURITÉ ──
  {
    email: 'oliviereba10@gmail.com', // JAQUES OLIVIER EBA BOUA KOUADIO
    jours: {
      [LUNDI]:    null,
      [MARDI]:    [seg('19:00', '00:00')],
      [MERCREDI]: [seg('19:00', '00:00')],
      [JEUDI]:    [seg('19:00', '00:00')],
      [VENDREDI]: [seg('19:00', '00:00')],
      [SAMEDI]:   [seg('19:00', '00:00')],
      [DIMANCHE]: [seg('19:00', '00:00')],
    }
  },

  // ── PASTAIOLO ──
  {
    email: 'ademjadoui077@gmail.com', // ADAM
    jours: {
      [LUNDI]:    [seg('10:30', '17:00')],
      [MARDI]:    null,
      [MERCREDI]: [seg('10:30', '16:30')],
      [JEUDI]:    [seg('10:30', '16:30')],
      [VENDREDI]: [seg('10:30', '16:00')],
      [SAMEDI]:   [seg('10:30', '14:00')],
      [DIMANCHE]: [seg('10:30', '16:00'), seg('17:30', '23:30')],
    }
  },
  {
    email: 'rafiqulhaque119@gmail.com', // RAFIQUE
    jours: {
      [LUNDI]:    [seg('18:30', '23:30')],
      [MARDI]:    [seg('18:30', '23:30')],
      [MERCREDI]: [seg('18:30', '23:30')],
      [JEUDI]:    [seg('18:30', '23:30')],
      [VENDREDI]: [seg('18:30', '23:30')],
      [SAMEDI]:   null,
      [DIMANCHE]: null,
    }
  },
  {
    email: 'afjalhussen2002@gmail.com', // AFJAL
    jours: {
      [LUNDI]:    [seg('17:00', '00:00')],
      [MARDI]:    [seg('16:30', '00:00')],
      [MERCREDI]: [seg('16:30', '00:00')],
      [JEUDI]:    [seg('16:30', '00:00')],
      [VENDREDI]: [seg('16:30', '00:00')],
      [SAMEDI]:   [seg('16:30', '00:00')],
      [DIMANCHE]: null,
    }
  },
  {
    email: 'skouyate25@gmail.com', // SOULEYMAN
    jours: {
      [LUNDI]:    [seg('08:00', '16:00')],
      [MARDI]:    [seg('08:00', '16:00')],
      [MERCREDI]: null,
      [JEUDI]:    null,
      [VENDREDI]: [seg('16:00', '00:00')],
      [SAMEDI]:   [seg('16:00', '00:00')],
      [DIMANCHE]: [seg('16:00', '00:00')],
    }
  },

  // ── PIZZAIOLO ──
  {
    email: 'shakilah2325@gmail.com', // CHAKIL/SHAKIL
    jours: {
      [LUNDI]:    [seg('11:00', '14:00'), seg('18:00', '23:45')],
      [MARDI]:    [seg('11:00', '14:00'), seg('18:00', '23:45')],
      [MERCREDI]: null,
      [JEUDI]:    null,
      [VENDREDI]: [seg('11:00', '14:00'), seg('18:00', '23:30')],
      [SAMEDI]:   [seg('11:00', '14:00'), seg('18:00', '23:30')],
      [DIMANCHE]: [seg('11:00', '14:00'), seg('18:00', '23:30')],
    }
  },
  {
    email: 'islammerashedul@gmail.com', // RACHID
    jours: {
      [LUNDI]:    [seg('12:00', '15:00'), seg('18:30', '23:00')],
      [MARDI]:    [seg('12:00', '15:00'), seg('18:30', '22:00')],
      [MERCREDI]: [seg('12:00', '14:00'), seg('18:00', '23:30')],
      [JEUDI]:    null,
      [VENDREDI]: null,
      [SAMEDI]:   [seg('12:00', '15:00'), seg('18:00', '23:45')],
      [DIMANCHE]: [seg('16:00', '23:30')],
    }
  },
  {
    email: 'meeralammurshed@gmail.com', // MURSHED
    jours: {
      [LUNDI]:    [seg('17:00', '00:00')],
      [MARDI]:    [seg('17:00', '00:00')],
      [MERCREDI]: [seg('17:00', '00:00')],
      [JEUDI]:    [seg('12:00', '14:00'), seg('17:00', '00:00')],
      [VENDREDI]: [seg('17:00', '00:00')],
      [SAMEDI]:   [seg('17:00', '00:00')],
      [DIMANCHE]: null,
    }
  },
  {
    email: 'mitunahmed01732240@gmail.com', // MITUN
    jours: {
      [LUNDI]:    null,
      [MARDI]:    null,
      [MERCREDI]: [seg('15:00', '23:45')],
      [JEUDI]:    [seg('15:00', '23:45')],
      [VENDREDI]: [seg('15:00', '23:00')],
      [SAMEDI]:   [seg('10:00', '17:00')],
      [DIMANCHE]: [seg('10:00', '15:00'), seg('18:00', '23:00')],
    }
  },
  {
    email: 'suhelfrance1985@gmail.com', // SUHEL
    jours: {
      [LUNDI]:    [seg('11:00', '15:00'), seg('19:30', '00:30')],
      [MARDI]:    [seg('11:00', '15:00'), seg('19:30', '00:30')],
      [MERCREDI]: [seg('11:00', '15:00'), seg('19:30', '00:30')],
      [JEUDI]:    null,
      [VENDREDI]: [seg('18:30', '00:30')],
      [SAMEDI]:   [seg('19:30', '00:30')],
      [DIMANCHE]: [seg('19:30', '00:30')],
    }
  },
  {
    email: 'sanwarhussain040@gmail.com', // HUSSAIN SANWAR
    jours: {
      [LUNDI]:    [seg('10:00', '17:00'), seg('19:00', '22:00')],
      [MARDI]:    [seg('10:00', '17:00')],
      [MERCREDI]: [seg('11:00', '17:00')],
      [JEUDI]:    [seg('11:00', '17:00'), seg('18:00', '23:00')],
      [VENDREDI]: [seg('12:00', '16:00')],
      [SAMEDI]:   null,
      [DIMANCHE]: null,
    }
  },
  {
    email: 'djibriltraore294@gmail.com', // DJIBRIL
    jours: {
      [LUNDI]:    null,
      [MARDI]:    [seg('19:30', '23:00')],
      [MERCREDI]: [seg('10:00', '13:00'), seg('19:30', '23:00')],
      [JEUDI]:    [seg('10:00', '16:00'), seg('19:00', '00:30')],
      [VENDREDI]: [seg('10:00', '15:00'), seg('19:00', '23:00')],
      [SAMEDI]:   [seg('10:00', '16:00')],
      [DIMANCHE]: [seg('10:00', '16:00')],
    }
  },
  {
    email: 'olidrahman87@gmail.com', // OLI (OLIUR)
    jours: {
      [LUNDI]:    [seg('15:00', '23:30')],
      [MARDI]:    [seg('15:00', '23:30')],
      [MERCREDI]: null,
      [JEUDI]:    null,
      [VENDREDI]: [seg('15:00', '23:30')],
      [SAMEDI]:   [seg('15:00', '23:30')],
      [DIMANCHE]: [seg('15:00', '23:30')],
    }
  },
  {
    email: 'raselahmed44823@gmail.com', // RASEL AHMED
    jours: {
      [LUNDI]:    null,
      [MARDI]:    null,
      [MERCREDI]: [seg('12:00', '15:00'), seg('19:00', '22:00')],
      [JEUDI]:    [seg('12:00', '15:00'), seg('19:00', '23:45')],
      [VENDREDI]: [seg('12:00', '15:00'), seg('18:00', '23:45')],
      [SAMEDI]:   [seg('12:00', '15:00'), seg('18:00', '23:00')],
      [DIMANCHE]: [seg('12:00', '16:00'), seg('18:00', '23:00')],
    }
  },
  {
    email: 'ahmednazimsyl00@gmail.com', // NAZIM AHMED
    jours: {
      [LUNDI]:    [seg('08:00', '15:00')],
      [MARDI]:    null,
      [MERCREDI]: [seg('08:00', '15:00')],
      [JEUDI]:    [seg('08:00', '15:00')],
      [VENDREDI]: [seg('08:00', '15:00')],
      [SAMEDI]:   [seg('08:00', '15:00')],
      [DIMANCHE]: [seg('08:00', '15:00')],
    }
  },

  // ── ASSISTANT DIRECTION ──
  {
    email: 'malika.bhb@chezantoine.paris', // MALLIKA BEN HASSINE
    jours: {
      [LUNDI]:    [seg('10:00', '16:00')],
      [MARDI]:    [seg('10:00', '16:00')],
      [MERCREDI]: [seg('10:00', '16:00')],
      [JEUDI]:    null,
      [VENDREDI]: null,
      [SAMEDI]:   null,
      [DIMANCHE]: null,
    }
  },
];

// ============================================
// LOGIQUE D'IMPORT
// ============================================
async function main() {
  console.log(`\n📅 IMPORT DES PLANNINGS — ${START_DATE} → ${END_DATE}\n`);

  // Résoudre les emails → userId
  const emails = PLANNINGS.map(p => p.email.toLowerCase());
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, nom: true, prenom: true }
  });
  const emailToUser = {};
  users.forEach(u => { emailToUser[u.email.toLowerCase()] = u; });

  // Vérifier que tous les employés existent
  let missing = false;
  for (const p of PLANNINGS) {
    if (!emailToUser[p.email.toLowerCase()]) {
      console.log(`❌ Employé introuvable : ${p.email}`);
      missing = true;
    }
  }
  if (missing) {
    console.log('\n⚠️  Créez d\'abord les employés manquants puis relancez le script.');
    await prisma.$disconnect();
    return;
  }

  // Générer toutes les dates de la période
  const [sy, sm, sd] = START_DATE.split('-').map(Number);
  const [ey, em, ed] = END_DATE.split('-').map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const planning of PLANNINGS) {
    const user = emailToUser[planning.email.toLowerCase()];
    const employeId = user.id;
    let created = 0;
    let skipped = 0;

    // Récupérer les shifts existants pour cet employé sur la période
    const existing = await prisma.shift.findMany({
      where: {
        employeId,
        date: { gte: start, lte: end },
      },
      select: { date: true }
    });
    const existingDates = new Set(existing.map(s => s.date.toISOString().slice(0, 10)));

    // Préparer les shifts à créer
    const shiftsToCreate = [];

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      const segments = planning.jours[dow];
      
      if (!segments) continue; // OFF ce jour

      const dateStr = d.toISOString().slice(0, 10);
      
      if (existingDates.has(dateStr)) {
        skipped++;
        continue;
      }

      shiftsToCreate.push({
        employeId,
        date: new Date(d),
        type: 'travail',
        segments: segments.map(s => ({ ...s, id: crypto.randomUUID() })),
      });
    }

    // Insertion par batch de 50
    for (let i = 0; i < shiftsToCreate.length; i += 50) {
      const batch = shiftsToCreate.slice(i, i + 50);
      await prisma.shift.createMany({
        data: batch.map(s => ({
          employeId: s.employeId,
          date: s.date,
          type: s.type,
          segments: s.segments,
        }))
      });
    }

    created = shiftsToCreate.length;
    totalCreated += created;
    totalSkipped += skipped;

    console.log(`  ✅ ${user.prenom} ${user.nom}: ${created} shifts créés${skipped > 0 ? `, ${skipped} ignorés (déjà existants)` : ''}`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 TOTAL : ${totalCreated} shifts créés, ${totalSkipped} ignorés`);
  console.log(`${'─'.repeat(50)}\n`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e);
  process.exit(1);
});
