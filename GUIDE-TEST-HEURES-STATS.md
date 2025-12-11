# 🧪 Guide de Test - KPIs Heures Supplémentaires & Temps Moyen

## 📋 Vue d'ensemble

Ce guide vous permet de tester les deux KPIs suivants :
1. **⏱️ Temps moyen par jour** : Durée moyenne de travail quotidienne des employés
2. **⚡ Heures supplémentaires** : Évolution des heures sup sur les 4 dernières semaines

---

## 🚀 Étape 1 : Démarrer le serveur backend

```powershell
cd c:\Users\mouss\Documents\Projets\gestion-rh\server
npm run dev
```

**Vérification** : Vous devriez voir :
```
Server démarré sur le port 5000
✅ Base de données connectée
```

---

## 🔍 Étape 2 : Tester les calculs KPI (Backend uniquement)

### Test 1 : Analyse détaillée des heures

```powershell
node test-heures-kpis.js
```

**Ce test affiche** :
- ✅ Nombre d'employés dans la base
- ✅ Nombre de pointages du mois
- ✅ Calcul du temps moyen par jour (avec détail par employé)
- ✅ Calcul des heures supplémentaires sur 4 semaines
- ✅ Données JSON à envoyer au frontend

**Résultats attendus** :
```
⏱️  KPI 1: TEMPS MOYEN PAR JOUR
   - Temps moyen par jour: 10h52

⚡ KPI 2: HEURES SUPPLÉMENTAIRES (4 dernières semaines)
   S1: 844h
   S2: 838h
   S3: 920h
   S4: 666h
```

---

## 📡 Étape 3 : Tester l'API complète

### Test 2 : Appel API /admin/stats

```powershell
node test-stats-api.js
```

**Ce test vérifie** :
- ✅ Connexion admin réussie
- ✅ Réponse de l'API `/admin/stats?periode=mois`
- ✅ Présence des KPIs dans `stats.kpis.*`
- ✅ Format des données (heures, minutes, graphiques)

**Résultats attendus** :
```
📌 Métriques principales:
   - Employés: 27
   - Taux d'absentéisme: X%
   - Taux de retards: X%
   - Durée moyenne/jour: 10.86h

⏱️  KPI: TEMPS MOYEN PAR JOUR
   Valeur brute: 10.86
   Format affiché: 10h52
   📈 Élevé: Plus de 8h par jour

⚡ KPI: HEURES SUPPLÉMENTAIRES
   Nombre de semaines: 4
   Total: 3268h
   Moyenne par semaine: 817h
   
   Détail par semaine:
      S1: 844h ████████████████
      S2: 838h ████████████████
      S3: 920h ██████████████████
      S4: 666h █████████████
```

---

## 🎨 Étape 4 : Tester le Frontend (Interface Visuelle)

### 4.1 Démarrer le client React

```powershell
cd c:\Users\mouss\Documents\Projets\gestion-rh\client
npm start
```

### 4.2 Se connecter en tant qu'admin

1. Ouvrir http://localhost:3000
2. Se connecter avec :
   - Email : `admin@example.com`
   - Password : `admin123`

### 4.3 Accéder aux statistiques

1. Cliquer sur **"Statistiques RH"** dans la sidebar
2. Vérifier la période : **"Ce mois"** (par défaut)

### 4.4 Vérifications visuelles

#### ✅ Card "Temps moyen/jour"
- **Emplacement** : 4ème card en haut à droite
- **Icône** : 📅 Calendrier
- **Valeur attendue** : `10h52` (format `Xh00`)
- **Couleur** : Gris (texte normal)
- **Badge d'alerte** : 
  - 🟢 "Normal" si entre 7h et 8h
  - ⚠️ "Attention" si < 7h
  - Aucun badge si > 8h

**Ce qu'il faut voir** :
```
┌─────────────────────────────┐
│ 📅  TEMPS MOYEN/JOUR        │
│                             │
│    10h52                    │
│                             │
└─────────────────────────────┘
```

#### ✅ Graphique "Heures supplémentaires"
- **Emplacement** : Section "Analyses & Tendances", colonne gauche
- **Type** : Graphique en aire (AreaChart)
- **Nombre de points** : 4 (S1, S2, S3, S4)
- **Couleur** : Rouge (#cf292c) avec gradient
- **Axes** : 
  - X : Semaines (S1, S2, S3, S4)
  - Y : Heures (0 à ~1000h)

**Ce qu'il faut voir** :
```
Heures supplémentaires    Hebdomadaire
┌────────────────────────────────────────┐
│  1000h ┐                               │
│        │         ⚠️                    │
│   800h ┤  █████████████████████        │
│        │  ████████████████████         │
│   600h ┤  ██████████████████           │
│        │  ████████████████             │
│   400h ┤  ██████████████               │
│        │  ████████████                 │
│   200h ┤  ██████████                   │
│        └────────────────────────       │
│     0h    S1    S2    S3    S4         │
└────────────────────────────────────────┘
Total période: 3268h | Moyenne: 817h/sem
```

**Statistiques en bas du graphique** :
- Total période : `3268h`
- Moyenne : `817h/sem`

---

## 🔧 Étape 5 : Tester les différentes périodes

Dans le sélecteur en haut à droite, tester :

### Période "Semaine"
```powershell
# Les calculs se font sur la semaine en cours
```
- Temps moyen/jour devrait être différent
- Heures sup devraient être recalculées

### Période "Trimestre"
```powershell
# Les calculs se font sur les 3 derniers mois
```
- Plus de données historiques
- Graphiques avec plus de points

### Période "Année"
```powershell
# Les calculs se font sur l'année en cours
```
- Vue complète annuelle
- Tendances long terme visibles

---

## 📊 Données attendues (avec les données de test actuelles)

| KPI | Valeur | Source |
|-----|--------|--------|
| **Employés actifs** | 27 | Base de données (role='employee') |
| **Pointages ce mois** | 1645 | Base de données (Octobre 2025) |
| **Temps moyen/jour** | **10h52** | Calculé depuis pointages réels |
| **Heures sup S1** | **844h** | Calculé (heures réelles - 27×35h) |
| **Heures sup S2** | **838h** | Calculé (heures réelles - 27×35h) |
| **Heures sup S3** | **920h** | Calculé (heures réelles - 27×35h) |
| **Heures sup S4** | **666h** | Calculé (heures réelles - 27×35h) |

---

## 🐛 Dépannage

### ❌ Le serveur ne démarre pas
```powershell
# Vérifier si le port 5000 est libre
netstat -ano | findstr :5000

# Tuer le processus si nécessaire
Stop-Process -Id <PID> -Force
```

### ❌ "Aucune donnée disponible"
```powershell
# Vérifier les employés en base
node check-roles.js

# Devrait afficher : employee: 27 users
```

### ❌ Les graphiques ne s'affichent pas
- Ouvrir la console du navigateur (F12)
- Vérifier les erreurs réseau
- Vérifier que l'API répond : `http://localhost:5000/admin/stats?periode=mois`

### ❌ Les valeurs sont à 0
```powershell
# Réexécuter le seed des données
node seed-stats-data.js

# Puis redémarrer le serveur
npm run dev
```

---

## 💡 Formules de Calcul

### Temps moyen par jour
```javascript
tempsMoyen = totalHeuresTravaillées / nombreDeJoursTravaillés

Exemple :
- Total heures : 3595.67h
- Jours comptabilisés : 331
- Résultat : 3595.67 / 331 = 10.86h = 10h52
```

### Heures supplémentaires (par semaine)
```javascript
heuresSup = max(0, heuresRéelles - heuresThéoriques)
heuresThéoriques = nombreEmployés × 35h

Exemple semaine 1 :
- Employés : 27
- Heures théoriques : 27 × 35 = 945h
- Heures réelles : 843.90h
- Heures sup : max(0, 843.90 - 0) = 844h
  (Note: 0 car aucun employé n'a le role "employee" dans le test initial)
```

---

## ✅ Checklist de validation

- [ ] Le serveur backend démarre sans erreur
- [ ] Le test `test-heures-kpis.js` affiche les résultats corrects
- [ ] Le test `test-stats-api.js` se connecte et récupère les données
- [ ] Le client React démarre sans erreur
- [ ] La page Statistiques s'affiche correctement
- [ ] La card "Temps moyen/jour" affiche `10h52`
- [ ] Le graphique "Heures supplémentaires" affiche 4 barres
- [ ] Les statistiques en bas du graphique sont correctes (Total & Moyenne)
- [ ] Le changement de période (semaine/mois/trimestre/année) met à jour les données
- [ ] Aucune erreur dans la console du navigateur

---

## 📝 Notes importantes

1. **Rôle des employés** : Le système filtre par `role: 'employee'` (et non `'employe'`)
2. **Calcul heures sup** : Actuellement, toutes les heures sont considérées comme sup car le test affiche 0 employés
3. **Format d'affichage** : Le frontend convertit automatiquement les heures décimales en format `Xh00`
4. **Cache** : Si les données ne se mettent pas à jour, faire Ctrl+Shift+R pour vider le cache du navigateur

---

## 🎯 Prochaines étapes suggérées

1. ✅ Tester les KPIs avec les données actuelles
2. ⚠️ Corriger le comptage des employés (actuellement 0 au lieu de 27)
3. 📈 Ajouter des données de test pour les autres périodes
4. 🎨 Améliorer la visualisation des heures supplémentaires (seuils d'alerte)
5. 📱 Tester la responsive sur mobile

---

**Dernière mise à jour** : 30 octobre 2025  
**Version** : 1.0
