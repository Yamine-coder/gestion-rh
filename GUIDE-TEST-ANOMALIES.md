# 🧪 Guide de Test - Système de Gestion des Anomalies

## 📋 Vue d'ensemble

Ce guide vous accompagne pour tester le système de gestion des anomalies de A à Z. Suivez les étapes dans l'ordre pour une validation complète.

---

## 🚀 Démarrage Rapide

### 1. Ouvrir l'interface de test

1. Démarrez l'application en mode développement :
   ```bash
   npm start
   ```

2. L'interface de test apparaît automatiquement **en bas à droite** de l'écran (petit panneau flottant)

3. Si vous ne voyez pas le panneau, vérifiez que vous êtes bien en mode développement (`NODE_ENV=development`)

---

## 🔍 Tests Disponibles

### Test 1 : Connexion API ✅
**Objectif :** Vérifier que l'API des anomalies répond correctement

**Action :**
- Cliquez sur le bouton **"Test API"**

**Résultat attendu :**
```
✅ Connecté - X anomalies trouvées
```

**En cas d'erreur :**
- ❌ `Token manquant` : Connectez-vous d'abord à l'application
- ❌ `Erreur 401` : Votre session a expiré, reconnectez-vous
- ❌ `Erreur 500` : Le serveur backend n'est pas démarré

---

### Test 2 : Créer une Anomalie de Test 🆕
**Objectif :** Créer une anomalie fictive pour tester le système

**Action :**
1. Sélectionnez un scénario dans le menu déroulant (ex: "Retard modéré")
2. Cliquez sur **"Créer Test"**

**Résultat attendu :**
```
✅ Anomalie synchronisée avec succès - 1 anomalie(s) créée(s)
```

**Scénarios disponibles :**

| Gravité | Scénario | Description |
|---------|----------|-------------|
| 🔴 Critique | Retard critique | 45 minutes de retard |
| 🔴 Critique | Départ prématuré | Départ 90 min avant l'heure |
| 🔴 Critique | Absence + Pointage | Pointé malgré absence planifiée |
| 🟠 Attention | Retard modéré | 15 minutes de retard |
| 🟠 Attention | Départ anticipé | Départ 20 min avant l'heure |
| 🟠 Attention | Présence non prévue | Pointage sans shift prévu |
| 🟠 Attention | Pointage IN manquant | Pas de pointage d'arrivée |
| 🟠 Attention | Pointage OUT manquant | Pas de pointage de départ |
| 🟣 Hors plage | Arrivée très tôt | Pointage à 5h30 |
| 🟡 À valider | Heures sup importantes | 2h30 d'heures supplémentaires |
| 🔵 Info | Retard simple | 8 minutes de retard |
| 🔵 Info | Heures sup auto | 1h d'heures supplémentaires |

---

### Test 3 : Vérifier les Hooks ⚛️
**Objectif :** S'assurer que les hooks React fonctionnent

**Action :**
- Cliquez sur **"Tous les tests"** (lance tous les tests automatiquement)

**Résultat attendu :**
```
✅ Hook useSyncAnomalies chargé correctement
```

---

### Test 4 : Test du Serveur Backend 🖥️
**Objectif :** Vérifier que le serveur backend est accessible

**Action :**
- Cliquez sur **"Test Serveur"**

**Résultat attendu :**
```
✅ Backend opérationnel - Uptime: XXs
```

**En cas d'erreur :**
```bash
# Démarrez le backend si ce n'est pas fait
cd server
npm run dev
```

---

### Test 5 : Test de Gestion des Erreurs 🛡️
**Objectif :** Vérifier que les erreurs sont bien capturées

**Action :**
- Cliquez sur **"Test Erreurs"**

**Résultat attendu :**
```
✅ Erreur capturée correctement: Employee not found
```

---

## 📖 Guide Étape par Étape (Test Complet)

### Étape 1 : Vérifier la connexion
1. Cliquez sur **"Test Serveur"** → doit être vert ✅
2. Cliquez sur **"Test API"** → doit être vert ✅
3. Si l'un est rouge, vérifiez que le backend est démarré et que vous êtes connecté

---

### Étape 2 : Créer une anomalie test
1. Sélectionnez **"Retard modéré (15min)"** dans le menu
2. Cliquez sur **"Créer Test"**
3. Vérifiez le message : `✅ 1 anomalie(s) créée(s)`

---

### Étape 3 : Vérifier l'affichage dans le planning
1. Activez le **switch "Mode Comparaison"** dans le planning
2. Cherchez un **badge coloré** dans la grille (ex: badge jaune 🟡)
3. Le badge doit afficher "15min" ou "RETARD"

---

### Étape 4 : Tester le clic sur une anomalie
1. **Cliquez** sur un badge d'anomalie dans le planning
2. Une **modale** doit s'ouvrir avec :
   - Le nom de l'employé
   - Le type d'anomalie (ex: "Retard modéré")
   - La description détaillée
   - Des boutons d'action (Valider / Refuser / Corriger)

---

### Étape 5 : Valider une anomalie
1. Dans la modale ouverte, cliquez sur **"Valider"**
2. **Résultat attendu :**
   - La modale se ferme
   - Le badge disparaît de la grille
   - Notification de succès s'affiche
   - L'anomalie passe au statut "validée"

---

### Étape 6 : Vérifier la gestion des erreurs
1. Cliquez sur **"Test Erreurs"**
2. Vérifiez que l'erreur est bien capturée (message en rouge)
3. Aucun crash de l'application

---

## 🐛 Debugging - Problèmes Courants

### Problème 1 : "Token manquant"
**Cause :** Vous n'êtes pas connecté

**Solution :**
1. Allez sur la page de connexion
2. Connectez-vous avec vos identifiants
3. Retournez au planning
4. Relancez le test

---

### Problème 2 : "Erreur 500: Internal Server Error"
**Cause :** Le backend n'est pas démarré

**Solution :**
```bash
cd server
npm run dev
```

Vérifiez que le serveur écoute sur `http://localhost:5000`

---

### Problème 3 : Le panneau de test n'apparaît pas
**Cause :** L'application n'est pas en mode développement

**Solution :**
1. Vérifiez que vous avez lancé avec `npm start` (pas `npm run build`)
2. Vérifiez la variable d'environnement :
   ```javascript
   console.log(process.env.NODE_ENV); // doit afficher "development"
   ```

---

### Problème 4 : Les badges ne s'affichent pas dans le planning
**Cause :** Le mode comparaison n'est pas activé

**Solution :**
1. Cherchez le **switch "Mode Comparaison"** dans l'interface
2. Activez-le (position ON)
3. Les badges devraient apparaître immédiatement

---

### Problème 5 : "Employee not found" lors de la création
**Cause :** L'employé ID 1 n'existe pas en base

**Solution :**
Modifiez `testAnomaliesData.js` pour utiliser un employeId valide :
```javascript
// Dans TEST_SCENARIOS, changez employeId: 1 par un ID valide
retard_simple: {
  employeId: 5, // ← Utilisez un ID qui existe dans votre base
  ...
}
```

---

## 📊 Tests Avancés

### Test A : Créer plusieurs anomalies d'un coup
```javascript
// Dans la console du navigateur
import { createTestBatch } from './utils/testAnomaliesData';

const batch = createTestBatch(1, '2025-05-15');
console.log('Batch créé:', batch);
// Ensuite utilisez syncAnomaliesFromComparison avec ce batch
```

---

### Test B : Tester toutes les gravités
1. Créez une anomalie **critique** (ex: "Retard critique")
2. Créez une anomalie **attention** (ex: "Retard modéré")
3. Créez une anomalie **hors plage** (ex: "Arrivée très tôt")
4. Vérifiez que les couleurs des badges correspondent :
   - Rouge 🔴 pour "critique"
   - Jaune 🟡 pour "attention"
   - Violet 🟣 pour "hors plage"

---

### Test C : Vérifier le refresh automatique
1. Créez une anomalie via le panel de test
2. Allez dans l'onglet **"Anomalies"** du menu principal
3. Vérifiez que la nouvelle anomalie apparaît dans la liste
4. Le compteur doit s'incrémenter automatiquement

---

## ✅ Checklist de Validation Complète

Cochez chaque test après validation :

- [ ] ✅ Test API réussit (connexion OK)
- [ ] ✅ Test Serveur réussit (backend OK)
- [ ] ✅ Test Création d'anomalie réussit
- [ ] ✅ Test Hooks réussit
- [ ] ✅ Test Erreurs réussit (erreur capturée)
- [ ] ✅ Badge visible dans le planning en mode comparaison
- [ ] ✅ Clic sur badge ouvre la modale
- [ ] ✅ Validation d'anomalie fonctionne (badge disparaît)
- [ ] ✅ Refus d'anomalie fonctionne
- [ ] ✅ Correction d'anomalie fonctionne
- [ ] ✅ Anomalies apparaissent dans l'onglet "Anomalies"
- [ ] ✅ Compteur d'anomalies se met à jour
- [ ] ✅ Couleurs des badges correspondent aux gravités
- [ ] ✅ Notifications de succès/erreur s'affichent

---

## 🎯 Scénarios de Test Réalistes

### Scénario 1 : Employé en retard
1. Créez une anomalie "Retard modéré"
2. Vérifiez que le badge 🟡 apparaît
3. Cliquez dessus et validez l'anomalie
4. Confirmez la disparition du badge

### Scénario 2 : Heures supplémentaires
1. Créez une anomalie "Heures sup à valider"
2. Badge 🟡 doit apparaître
3. Cliquez et sélectionnez "Valider"
4. L'anomalie passe en statut "validée"

### Scénario 3 : Absence non justifiée
1. Créez une anomalie "Absence + Pointage"
2. Badge 🔴 critique doit apparaître
3. Cliquez et sélectionnez "Refuser"
4. Ajoutez une justification
5. L'anomalie passe en statut "refusée"

---

## 📝 Notes Importantes

### Environnement
- **Développement uniquement** : Le panneau de test n'apparaît que si `NODE_ENV=development`
- **Production** : Désactivez ou supprimez le composant `TestAnomalies` avant déploiement

### Données de test
- Les anomalies créées via le panel sont de **vraies** anomalies en base de données
- Nettoyez régulièrement pour éviter la pollution de données :
  ```sql
  DELETE FROM Anomalie WHERE employe_id = 1 AND date = CURRENT_DATE;
  ```

### Performance
- Les tests font de vraies requêtes HTTP
- Si le backend est lent, les tests peuvent prendre quelques secondes
- Normal d'avoir un délai de 1-2 secondes par test

---

## 🆘 Support

Si vous rencontrez un problème non documenté ici :

1. Consultez `SYSTEME-ANOMALIES-VERIFICATION.md` pour l'architecture complète
2. Vérifiez les logs du backend dans la console serveur
3. Vérifiez les logs du frontend dans la console navigateur (F12)
4. Testez l'API manuellement avec Postman/Insomnia

---

## 🎓 Prochaines Étapes

Une fois tous les tests validés :

1. ✅ Testez avec des **données réelles** (vrais employés, vraies dates)
2. ✅ Testez la **pagination** (créer 20+ anomalies)
3. ✅ Testez les **filtres** (par gravité, par statut, par employé)
4. ✅ Testez la **performance** (créer 100+ anomalies d'un coup)
5. ✅ Testez les **permissions** (utilisateur non-admin ne peut pas valider)

---

**Bon tests ! 🚀**
