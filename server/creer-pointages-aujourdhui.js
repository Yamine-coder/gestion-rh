const prisma = require('./prisma/client');

async function creerPointagesAujourdhui() {
    try {
        // Récupérer quelques employés
        const employes = await prisma.user.findMany({
            where: { role: 'employee' },
            take: 8 // 8 sur 12 employés pointent = 67% de taux de pointage
        });
        
        console.log(`👥 Création de pointages pour ${employes.length} employés sur ${employes.length} total...`);
        
        const today = new Date();
        const pointages = [];
        
        for (let i = 0; i < employes.length; i++) {
            const employe = employes[i];
            
            // Heure d'arrivée entre 8h et 9h30
            const heureArrivee = new Date(today);
            heureArrivee.setHours(8 + Math.floor(Math.random() * 1.5), Math.floor(Math.random() * 60));
            
            // Créer le pointage d'arrivée
            const pointageArrivee = await prisma.pointage.create({
                data: {
                    userId: employe.id,
                    type: 'arrivee',
                    horodatage: heureArrivee
                }
            });
            
            pointages.push(pointageArrivee);
            
            // Pour certains employés, ajouter aussi un départ
            if (Math.random() > 0.3) { // 70% ont aussi un départ
                const heureDepart = new Date(today);
                heureDepart.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
                
                const pointageDepart = await prisma.pointage.create({
                    data: {
                        userId: employe.id,
                        type: 'depart',
                        horodatage: heureDepart
                    }
                });
                
                pointages.push(pointageDepart);
            }
            
            console.log(`✅ Pointages créés pour ${employe.nom} ${employe.prenom}`);
        }
        
        console.log(`\n🎉 ${pointages.length} pointages créés pour aujourd'hui !`);
        
        // Vérifier le nouveau taux
        const totalEmployes = await prisma.user.count({ where: { role: 'employee' } });
        const employesPointes = new Set(pointages.map(p => p.userId));
        const tauxPointage = Math.round((employesPointes.size / totalEmployes) * 100);
        
        console.log(`📊 Nouveau taux de pointage: ${tauxPointage}% (${employesPointes.size}/${totalEmployes} employés)`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

creerPointagesAujourdhui();
