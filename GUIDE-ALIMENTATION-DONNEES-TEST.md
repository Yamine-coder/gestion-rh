# 🚀 Guide d'Alimentation des Données de Test

## Objectif
Ajouter des données réalistes dans la base de données pour tester les statistiques RH avec les vrais KPIs.

## ✅ Corrections Appliquées

### 1. Backend (`adminController.js`)
- ✅ Correction du champ `updatedAt` → `createdAt` (ligne 545)
- ✅ Ajout de 7 nouveaux KPIs avec calculs réels

### 2. Script de Seed (`seed-stats-data.js`)  
- ✅ Suppression du champ `raison` (n'existe pas dans le modèle Conge)
- ✅ 3 occurrences corrigées (lignes 159, employé problématique Jean, employé problématique Marie)

## 📋 Pour Exécuter le Script

```powershell
# Dans le dossier server
cd c:\Users\mouss\Documents\Projets\gestion-rh\server

# Exécuter le script d'alimentation
node seed-stats-data.js
```

## 📊 Données qui seront créées

### 1. Employés (15 total)
- Sophie Martin, Thomas Dubois, Emma Bernard, Lucas Petit, Léa Robert
- Hugo Richard, Chloé Durand, Nathan Moreau, Camille Simon, Louis Laurent
- Marie Lefevre, Alexandre Michel, Julie Garcia, Maxime Martinez, Laura David

### 2. Pointages (~566 sur 30 jours)
- **Période** : 30 derniers jours
- **Jours** : Lundi à Vendredi uniquement
- **Heures arrivée** : 7h-10h (avec retards pour certains)
- **Heures départ** : 16h-19h
- **Taux présence** : 85% (simulation réaliste)

### 3. Congés (~75 sur 6 mois)
- **Types** : Congés payés, Maladie, RTT, Sans solde, Autres
- **Statuts** : approuvé, en attente, refusé
- **Distribution** : 2-8 congés par employé

### 4. Employés Problématiques (2)
- **Jean Dupont** : 10 absences + retards fréquents (CRITICAL)
- **Marie Lambert** : 6 absences + 7 retards (WARNING)

## 🎯 Résultat Attendu

Après exécution, vous aurez :
```
✅ 15 employés actifs
✅ ~566 pointages (30 derniers jours)
✅ ~75 congés (6 derniers mois)
✅ 2 employés problématiques pour tester les alertes
```

## 🧪 Tests à Effectuer

1. **Redémarrer le serveur**
   ```powershell
   cd c:\Users\mouss\Documents\Projets\gestion-rh\server
   node server.js
   ```

2. **Démarrer le client**
   ```powershell
   cd c:\Users\mouss\Documents\Projets\gestion-rh\client
   npm start
   ```

3. **Se connecter en admin** et aller sur `/stats`

4. **Vérifier les KPIs** :
   - ✅ Effectif total = 15 employés
   - ✅ Taux d'absentéisme calculé (devrait être ~5-15%)
   - ✅ Taux de retards (devrait afficher un %)
   - ✅ Temps moyen/jour (devrait être ~7-8h)
   - ✅ Top 3 Performers affichés avec noms réels
   - ✅ Alertes Performance : Jean Dupont (critical) + Marie Lambert (warning)
   - ✅ Graphique Heures Sup avec 4 semaines de données
   - ✅ Graphique Évolution Effectif avec 5 mois
   - ✅ Graphique Taux de Présence avec évolution

5. **Tester les périodes** :
   - Changer entre Semaine / Mois / Trimestre / Année
   - Vérifier que les données se mettent à jour

## 🐛 Résolution de Problèmes

### Si "0 employés"
```sql
-- Vérifier en SQL
SELECT COUNT(*) FROM "User" WHERE role = 'employee';
```

### Si "KPIs vides"
```javascript
// Vérifier la console du navigateur
// Devrait afficher l'objet stats.kpis
```

### Si erreur Prisma
```powershell
# Régénérer le client Prisma
cd server
npx prisma generate
```

### Si erreur backend
```bash
# Vérifier les logs du serveur
# Chercher "Erreur dans getDashboardStats"
```

## 📝 Commande Rapide

Pour tout faire d'un coup :

```powershell
# 1. Alimenter la BDD
cd c:\Users\mouss\Documents\Projets\gestion-rh\server
node seed-stats-data.js

# 2. Redémarrer le serveur (dans un terminal séparé)
node server.js

# 3. Tester l'API
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/admin/stats?periode=mois
```

## ✨ Prochaines Étapes

Après avoir vérifié que tout fonctionne :
1. ✅ Les vrais KPIs s'affichent
2. ✅ Les graphiques sont remplis
3. ✅ Les alertes fonctionnent
4. ✅ Le design sobre est appliqué

Vous pourrez ensuite :
- Ajuster les seuils d'alerte si besoin
- Personnaliser les formules de calcul
- Ajouter d'autres KPIs
- Exporter les données en PDF/Excel

---

**Date** : 30 octobre 2025  
**Status** : ✅ Prêt à l'exécution  
**Fichiers** : `seed-stats-data.js` + `adminController.js` (corrigés)
