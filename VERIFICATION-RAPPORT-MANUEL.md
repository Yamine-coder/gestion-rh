# VÉRIFICATION RAPPORT D'HEURES - NOVEMBRE 2025

## Instructions

1. Aller sur l'interface web: http://localhost:3000
2. Se connecter avec admin@gestionrh.com / Admin123!
3. Aller dans Rapports > Rapports d'Heures Globale
4. Sélectionner novembre 2025
5. Cliquer sur "Exporter Excel"

## Points à Vérifier dans le Fichier Excel

### 📊 Structure du Fichier
- [ ] Le fichier contient 1 seule feuille "Rapport Détaillé"
- [ ] Le header contient exactement 21 colonnes

### 📋 Colonnes Présentes
1. Nom Complet
2. Email
3. Rôle
4. H. Prévues
5. H. Travaillées
6. H. Supp.
7. H. Manquantes
8. Abs. Justifiées
9. Abs. Injustifiées
10. Retards (j)
11. J. Planifiés
12. J. Présents
13. Taux Présence
14. Taux Ponctualité
15. Moy. h/j
16. CP (jours)
17. Dates CP
18. RTT (jours)
19. Dates RTT
20. Maladie (jours)
21. Dates Maladie

### ✅ Vérifications de Cohérence

#### 1. Absences
Pour chaque employé:
- `Abs. Justifiées` = `CP` + `RTT` + `Maladie`
- Les dates CP, RTT, Maladie doivent correspondre au nombre indiqué

#### 2. Heures
Pour chaque employé:
- `H. Travaillées` ≤ `H. Prévues` + `H. Supp.`
- `H. Manquantes` = `H. Prévues` - `H. Travaillées` (si positif)
- `Moy. h/j` = `H. Travaillées` / `J. Présents`

#### 3. Présence
Pour chaque employé:
- `Taux Présence` = (`J. Présents` / `J. Planifiés`) × 100
- `Taux Ponctualité` = ((`J. Présents` - `Retards`) / `J. Présents`) × 100

#### 4. Totaux (dernière ligne)
- Somme correcte de toutes les colonnes numériques
- Moyennes correctes pour les taux

### 🎯 Tests Spécifiques

#### Test 1: Employé avec absences
Rechercher un employé qui a des CP/RTT/Maladie
- Vérifier que les types d'absences sont bien séparés
- Vérifier que les dates sont affichées correctement (format JJ/MM/AAAA)
- Vérifier que `Abs. Justifiées` = somme des types

#### Test 2: Employé avec heures sup
Rechercher un employé avec `H. Supp. > 0`
- La cellule doit être surlignée en vert si > 10h
- `H. Travaillées` = `H. Prévues` + `H. Supp.`

#### Test 3: Employé avec heures manquantes
Rechercher un employé avec `H. Manquantes > 0`
- La cellule doit être surlignée en orange
- `H. Travaillées` < `H. Prévues`

#### Test 4: Employé avec absences injustifiées
Rechercher un employé avec `Abs. Injustifiées > 0`
- La cellule doit être surlignée en rouge
- Pas de date associée dans CP/RTT/Maladie

#### Test 5: Employé avec retards
Rechercher un employé avec `Retards > 0`
- `Taux Ponctualité` < 100%
- Formule: ((`J. Présents` - `Retards`) / `J. Présents`) × 100

### 📊 Valeurs Attendues pour Novembre 2025

D'après la capture d'écran:
- **25 employés actifs**
- **23 en service**
- **Période**: novembre 2025

#### Valeurs Totales à Vérifier
(À remplir après export)

```
Heures:
- H. Prévues:       ______ h
- H. Travaillées:   ______ h
- H. Supp:          ______ h
- H. Manquantes:    ______ h

Présence:
- J. Planifiés:     ______
- J. Présents:      ______
- Taux Présence:    ______ %

Absences:
- Abs. Justifiées:  ______
- Abs. Injustifiées: ______
- CP:               ______
- RTT:              ______
- Maladie:          ______
- Total typé:       ______ (doit = Abs. Justifiées)

Ponctualité:
- Retards:          ______
- Taux Ponctualité: ______ %
```

### ⚠️ Alertes à Surveiller

1. **INCOHÉRENCE ABSENCES**: Total absences typées ≠ Absences justifiées
2. **INCOHÉRENCE HEURES**: H. Travaillées > H. Prévues mais H. Supp = 0
3. **INCOHÉRENCE JOURS**: Jours présents > Jours planifiés
4. **DATES INVALIDES**: Dates hors période novembre 2025
5. **CELLULES VIDES**: Données manquantes pour employés actifs

### 🔍 Processus de Vérification Détaillée

1. **Ouvrir le fichier Excel généré**
2. **Vérifier le header** (ligne 3)
3. **Sélectionner 3-5 employés au hasard**
4. **Pour chaque employé**:
   - Noter les valeurs
   - Vérifier les formules manuellement
   - Vérifier les dates d'absences
5. **Vérifier la ligne de totaux**
6. **Noter toute incohérence**

### 📝 Résultat de la Vérification

Date: _____________
Vérificateur: _____________

#### Incohérences Détectées
```
Employé: ____________
Problème: ____________
Valeur attendue: ____________
Valeur actuelle: ____________
```

#### Conclusion
- [ ] ✅ Toutes les données sont cohérentes
- [ ] ⚠️ Incohérences mineures détectées (liste ci-dessus)
- [ ] ❌ Incohérences majeures nécessitant correction

---

## Notes Techniques

### Calculs Automatiques dans exportUtils.js

```javascript
// Taux de ponctualité
const tauxPonctualite = joursPresents > 0 
  ? Math.round(((joursPresents - emp.retards) / joursPresents) * 1000) / 10 
  : 100;

// Moyenne heures par jour
const moyenneHeuresParJour = joursPresents > 0 
  ? Math.round((heuresTravaillees / joursPresents) * 10) / 10 
  : 0;

// Types d'absences
const joursCP = congesApprouves.filter(c => c.type === 'conge_paye').length;
const joursRTT = congesApprouves.filter(c => c.type === 'rtt').length;
const joursMaladie = congesApprouves.filter(c => c.type === 'maladie').length;
```

### Sources de Données
- Shifts planifiés (table `Shift`)
- Pointages réels (table `Pointage`)
- Congés approuvés (table `Conge` avec statut='approuve')
- Profil employé (table `User`)
