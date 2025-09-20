const prisma = require('./prisma/client');

async function verifierPointagesAujourdhui() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        console.log(`🗓️ Vérification pointages pour le ${today.toLocaleDateString('fr-FR')}`);
        
        // Compter tous les employés
        const totalEmployes = await prisma.user.count({ where: { role: 'employee' } });
        console.log(`👥 Total employés: ${totalEmployes}`);
        
        // Compter les pointages d'aujourd'hui
        const pointagesAujourdhui = await prisma.pointage.findMany({
            where: { 
                horodatage: { 
                    gte: today,
                    lt: tomorrow 
                } 
            },
            include: { user: { select: { nom: true, prenom: true } } }
        });
        
        console.log(`📍 Pointages aujourd'hui: ${pointagesAujourdhui.length}`);
        
        if (pointagesAujourdhui.length > 0) {
            console.log('\n📋 Détails des pointages:');
            pointagesAujourdhui.forEach(p => {
                console.log(`- ${p.user.nom} ${p.user.prenom}: ${p.type} à ${new Date(p.horodatage).toLocaleTimeString('fr-FR')}`);
            });
        }
        
        // Compter les employés uniques qui ont pointé
        const employesPointes = new Set(pointagesAujourdhui.map(p => p.userId));
        console.log(`👤 Employés uniques qui ont pointé: ${employesPointes.size}`);
        
        const tauxPointage = totalEmployes > 0 ? Math.round((employesPointes.size / totalEmployes) * 100) : 0;
        console.log(`📊 Taux de pointage: ${tauxPointage}%`);
        
        // Si pas de pointages aujourd'hui, créons-en quelques-uns pour tester
        if (pointagesAujourdhui.length === 0) {
            console.log('\n⚠️ Aucun pointage aujourd\'hui. Voulez-vous que je crée quelques pointages de test?');
            console.log('Cela permettrait de tester le taux de pointage.');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifierPointagesAujourdhui();
