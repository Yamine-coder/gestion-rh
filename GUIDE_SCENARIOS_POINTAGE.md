# 🎭 GUIDE COMPLET DES SCÉNARIOS DE POINTAGE

## 📋 Vue d'ensemble

Le système de pointage gère désormais **6 scénarios différents** avec une interface adaptative qui change selon la situation de l'employé. Chaque scénario a sa propre interface visuelle, ses couleurs et ses messages.

## 🚀 Démarrage rapide

1. **Serveur backend** : `node index.js` (port 5000)
2. **Frontend React** : `npm start` (port 3000)
3. **Compte de test** : `test@Mouss.com` / `test123`

## 🎬 Les 6 scénarios supportés

### 1. 😴 JOURNÉE DE REPOS
**Situation :** Aucun planning prévu, aucun pointage
- **Interface :** "Journée de repos" avec émoji 😴
- **Couleur :** Gris
- **Test :** `node test-scenario.js 1`
- **Résultat attendu :** Message "Profitez bien de votre repos !"

### 2. ⚡ TRAVAIL NON PLANIFIÉ (EXTRA)
**Situation :** Pas de planning mais l'employé fait du pointage
- **Interface :** "Travail non planifié" avec émoji ⚡
- **Couleur :** Orange
- **Badge :** "Anomalie" si détecté
- **Test :** 
  1. `node test-scenario.js 1` (pas de shift)
  2. `node create-test-pointage.js` (ajouter pointage)
- **Résultat attendu :** "Ce travail sera comptabilisé comme heures supplémentaires"

### 3. 📅 PRÉSENCE PLANIFIÉE NORMALE
**Situation :** Planning de 7h avec segments détaillés
- **Interface :** "Selon planning" avec émoji 📅
- **Couleur :** Bleu
- **Segments :** Affichés en bleu
- **Test :** `node test-scenario.js 3`
- **Résultat attendu :** 
  - Planning 09:00-12:00, 14:00-18:00
  - Objectif 7.0h
  - Barre de progression bleue

### 4. 🕘 PRÉSENCE AVEC HEURES SUPPLÉMENTAIRES
**Situation :** Planning avec segment extra
- **Interface :** "Selon planning" avec badges verts "Extra"
- **Couleur :** Bleu + Vert pour les extras
- **Segments :** Normal (bleu) + Extra (vert)
- **Test :** `node test-scenario.js 4`
- **Résultat attendu :**
  - 3 segments : midi, soir, extra
  - Badge vert "Extra" sur le dernier segment
  - Objectif 9.0h

### 5. 🚫 ABSENCE PLANIFIÉE
**Situation :** Congé maladie prévu
- **Interface :** "Absence planifiée" avec émoji 🚫
- **Couleur :** Rouge
- **Encadré :** Rouge avec motif d'absence
- **Test :** `node test-scenario.js 5`
- **Résultat attendu :**
  - "Absence planifiée - Motif: Congé maladie"
  - Interface grisée
  - **Anomalie si pointage :** Badge rouge "Anomalie" + "Pointage inattendu"

### 6. 📋 PRÉSENCE PLANIFIÉE SANS DÉTAIL
**Situation :** Planning prévu mais sans horaires précis
- **Interface :** "Planning sans détail" avec émoji 📋
- **Couleur :** Violet
- **Objectif :** 7h par défaut
- **Test :** `node test-scenario.js 6`
- **Résultat attendu :** Interface basique avec objectif 7h

## 🧪 Tests d'anomalies

### Test d'anomalie : Absence + Pointage
```bash
# 1. Configurer une absence
node test-scenario.js 5

# 2. Ajouter un pointage malgré l'absence
node create-test-pointage.js

# 3. Résultat : Badge "Anomalie" rouge visible
```

### Test de transition : Repos → Travail Extra
```bash
# 1. Aucun planning
node test-scenario.js 1

# 2. Faire un pointage
node create-test-pointage.js

# 3. L'interface passe de "Repos" à "Travail non planifié"
```

## 🎨 Éléments visuels par scénario

| Scénario | Icône | Couleur principale | Barre progression | Badges spéciaux |
|----------|-------|-------------------|------------------|-----------------|
| Repos | 😴 | Gris | Masquée | - |
| Extra non planifié | ⚡ | Orange | Orange | "Anomalie" si détecté |
| Présence normale | 📅 | Bleu | Bleu/Vert selon % | - |
| Présence avec extra | 📅 | Bleu | Bleu/Vert | "Extra" vert |
| Absence planifiée | 🚫 | Rouge | Rouge si pointage | "Anomalie" rouge |
| Planning vide | 📋 | Violet | Violet | - |

## 🔧 Commandes utiles

### Configuration des scénarios
```bash
# Voir tous les scénarios
node test-scenario.js

# Tester un scénario spécifique
node test-scenario.js [1-6]

# Créer des pointages de test
node create-test-pointage.js
node create-test-pointage.js depart
```

### Nettoyage
```bash
# Supprimer tous les pointages de test
node -e "const prisma = require('./prisma/client'); prisma.pointage.deleteMany({where:{userId:86}}).then(r=>console.log('✅ Pointages supprimés:',r.count)).finally(()=>prisma.$disconnect());"

# Supprimer le shift actuel
node clear-test-shift.js
```

### Validation complète
```bash
# Tester tous les endpoints
node test-scenarios-validation.js
```

## 📱 Interface utilisateur

### Sections principales
1. **Horloge en temps réel** avec étapes QR/Scan/OK
2. **Temps travaillé adaptatif** selon le scénario
3. **Timeline interactive** avec sessions et durées

### Détails techniques
- **Mise à jour en temps réel** toutes les secondes
- **Calculs automatiques** de variance planning vs réel
- **Badges contextuels** pour anomalies et extras
- **Responsive design** desktop/mobile
- **Mode sombre** supporté

## 🎯 Points de validation

### ✅ Fonctionnalités testées
- [x] Détection automatique du type de shift
- [x] Calcul des heures planifiées vs réelles
- [x] Gestion des heures supplémentaires
- [x] Détection d'anomalies (absence + pointage)
- [x] Interface adaptive selon contexte
- [x] Timeline avec sessions en cours
- [x] Badges visuels informatifs
- [x] Responsive design

### 🔮 Cas d'usage couverts
- [x] Restaurant avec services midi/soir
- [x] Heures supplémentaires planifiées et non planifiées
- [x] Gestion des congés et absences
- [x] Détection du travail non autorisé
- [x] Planning flexible avec segments variables
- [x] Journées de repos

## 🚀 Mise en production

Le système est prêt pour la production avec :
- **Gestion complète des scénarios** restaurant
- **Interface intuitive** et adaptative
- **Détection d'anomalies** automatique
- **Calculs précis** au quart d'heure
- **Design professionnel** responsive

**Prochaines étapes possibles :**
- Notifications push pour anomalies
- Export des rapports d'anomalies
- Intégration avec système de paie
- Dashboard manager temps réel
