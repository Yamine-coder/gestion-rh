const mongoose = require('./server/node_modules/mongoose');
const Employe = require('./server/models/Employe');
const Shift = require('./server/models/Shift');

mongoose.connect('mongodb://localhost:27017/gestion-rh')
  .then(async () => {
    console.log('📡 Connecté à MongoDB');
    
    // Trouver Léa Garcia
    const lea = await Employe.findOne({ prenom: 'Léa', nom: 'Garcia' });
    
    if (!lea) {
      console.log('❌ Léa Garcia non trouvée');
      process.exit(1);
    }
    
    console.log('👤 Léa Garcia trouvée - ID:', lea._id);
    
    // Date du jour
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Date:', today);
    
    // Supprimer les shifts existants pour aujourd'hui
    await Shift.deleteMany({ employeId: lea._id, date: today });
    console.log('🗑️ Anciens shifts supprimés');
    
    // Créer un nouveau shift avec deux créneaux
    const shift = new Shift({
      employeId: lea._id,
      date: today,
      type: 'présence',
      segments: [
        { start: '09:00', end: '13:00' },
        { start: '14:00', end: '18:00' }
      ]
    });
    
    await shift.save();
    console.log('✅ Shift créé avec succès!');
    console.log('   Matin: 09:00 → 13:00 (4h)');
    console.log('   Après-midi: 14:00 → 18:00 (4h)');
    console.log('   Total: 8h');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });
