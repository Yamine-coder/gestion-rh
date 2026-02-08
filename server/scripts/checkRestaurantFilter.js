const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRestaurantFilter() {
  const anomalie = await prisma.anomalie.findUnique({
    where: { id: 474 },
    include: { employe: true }
  });
  
  console.log('Anomalie #474:');
  console.log('  Statut:', anomalie.statut);
  console.log('  Type:', anomalie.type);
  console.log('  Date:', anomalie.date);
  console.log('  RestaurantId:', anomalie.restaurantId);
  console.log('  Employé:', anomalie.employe?.prenom, anomalie.employe?.nom);
  console.log('  Employé RestaurantId:', anomalie.employe?.restaurantId);
  console.log('  Description:', anomalie.description);
  console.log('  Details:', JSON.stringify(anomalie.details, null, 2));
  
  await prisma.$disconnect();
}

checkRestaurantFilter();
