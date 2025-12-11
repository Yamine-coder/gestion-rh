# 📊 Intégration des Données Réelles - Statistiques RH

## Vue d'ensemble

Les statistiques RH ont été connectées aux vraies données de la base de données PostgreSQL via l'API backend. Tous les KPIs affichent maintenant des calculs en temps réel basés sur les données réelles des employés, pointages, congés et plannings.

---

## 🎯 KPIs Implémentés avec Données Réelles

### 1. **Taux d'Absentéisme**
- **Formule** : `(heures d'absence / heures théoriques totales) × 100`
- **Calcul** :
  - Heures théoriques = Nombre d'employés × 35h/semaine × 4 semaines
  - Heures d'absence = Nombre de congés × 7h (approximation)
- **Alerte** : Critique si > 10%
- **Source** : Table `conges` + `users` (role: employee)

### 2. **Durée Moyenne de Travail par Jour**
- **Formule** : `Total heures travaillées / 20 jours ouvrés`
- **Calcul** : Basé sur les paires ENTRÉE/SORTIE des pointages
- **Alerte** : Warning si < 7h
- **Source** : Table `pointages` avec calcul des durées entre entrées et sorties

### 3. **Taux de Retards**
- **Formule** : `(Nombre de retards / Total pointages entrée) × 100`
- **Définition retard** : Pointage d'entrée après 9h00
- **Alerte** : Warning si > 5%
- **Tendance** : Calculée par comparaison avec période précédente
- **Source** : Table `pointages` (type: ENTRÉE) avec analyse des heures

### 4. **Top 3 Performers**
- **Score** : `(Taux présence + Taux ponctualité) / 2`
- **Taux présence** : `(Nombre de pointages / Jours ouvrés) × 100`
- **Taux ponctualité** : `(Pointages avant 9h / Total pointages) × 100`
- **Tri** : Par score décroissant
- **Source** : Tables `users` + `pointages` + `conges`

### 5. **Employés Problématiques**
- **Critères** :
  - **Critical** : ≥ 8 absences OU ≥ 12 retards
  - **Warning** : ≥ 5 absences OU ≥ 10 retards
- **Données affichées** : Nom, nombre d'absences, nombre de retards
- **Limite** : Top 5 employés
- **Source** : Tables `users` + `pointages` + `conges`

### 6. **Évolution Heures Supplémentaires**
- **Période** : 4 dernières semaines (S1 à S4)
- **Calcul** : Heures travaillées - (Nb employés × 35h)
- **Graphique** : AreaChart avec gradient
- **Statistiques** : Total période + Moyenne hebdomadaire
- **Source** : Table `pointages` avec agrégation hebdomadaire

### 7. **Évolution de l'Effectif**
- **Période** : 5 derniers mois
- **Données** :
  - **Entrées** : Nouveaux employés (dateEmbauche dans le mois)
  - **Sorties** : Employés inactifs (statut: inactif, updatedAt dans le mois)
  - **Effectif total** : Nombre d'employés au dernier jour du mois
- **Graphique** : LineChart à 3 lignes
- **Statistiques** : Total entrées, Total sorties, Taux de turnover
- **Source** : Table `users` avec analyse temporelle

---

## 🔄 Flux de Données

### Backend (`server/controllers/adminController.js`)

```javascript
GET /admin/stats?periode={semaine|mois|trimestre|annee}

Response:
{
  // Données de base (existantes)
  employes: number,
  demandesAttente: number,
  congesCeMois: number,
  totalHeures: string,
  tempsPresence: string,
  repartitionConges: Array,
  statutsDemandes: Array,
  evolutionPresence: Array,
  pointes: number,
  congesSemaine: number,
  prochainsConges: Array,
  surveillance: Object,
  
  // 📊 NOUVEAUX KPIs
  kpis: {
    tauxAbsenteisme: string,           // "8.5"
    dureeMoyenneJour: string,          // "7.5"
    tauxRetards: string,               // "3.2"
    topEmployes: [                     // Top 3
      {
        nom: string,
        score: number,
        presence: number,
        ponctualite: number
      }
    ],
    employesProblematiques: [          // Max 5
      {
        nom: string,
        absences: number,
        retards: number,
        type: "critical" | "warning"
      }
    ],
    evolutionHeuresSup: [              // 4 semaines
      { jour: string, heures: number }
    ],
    evolutionEffectif: [               // 5 mois
      {
        mois: string,
        entrees: number,
        sorties: number,
        effectif: number
      }
    ]
  },
  
  periode: string,
  timestamp: string
}
```

### Frontend (`client/src/components/StatsRH.jsx`)

**Hooks de données** :
- `tauxAbsenteisme` : `useMemo(() => stats.kpis.tauxAbsenteisme)`
- `dureeMoyenneTravail` : `useMemo(() => stats.kpis.dureeMoyenneJour)`
- `tauxRetards` : `useMemo(() => stats.kpis.tauxRetards)`
- `topEmployes` : `useMemo(() => stats.kpis.topEmployes)`
- `employesProblematiques` : `useMemo(() => stats.kpis.employesProblematiques)`
- `evolutionHeuresSup` : `useMemo(() => stats.kpis.evolutionHeuresSup)`
- `evolutionEffectif` : `useMemo(() => stats.kpis.evolutionEffectif)`

**Rendu** :
- Tous les hooks utilisent les données réelles via `stats.kpis.*`
- Gestion des cas null/undefined avec valeurs par défaut
- Recharts pour tous les graphiques
- Design sobre et professionnel

---

## 📝 Requêtes SQL Utilisées

### 1. Taux d'Absentéisme
```javascript
// Congés du mois
const congesCeMois = await prisma.conge.count({
  where: { dateDebut: { gte: premierDuMois } }
});

// Employés actifs
const employes = await prisma.user.count({
  where: { role: 'employee' }
});
```

### 2. Taux de Retards
```javascript
// Tous les pointages entrée
const pointagesRetard = await prisma.pointage.findMany({
  where: {
    horodatage: { gte: startDate, lte: today },
    type: 'ENTRÉE',
    user: { role: 'employee' }
  }
});

// Filtrer les retards (après 9h)
const nombreRetards = pointagesRetard.filter(p => {
  const heure = new Date(p.horodatage).getHours();
  return heure >= 9;
}).length;
```

### 3. Top Performers
```javascript
const employesAvecStats = await prisma.user.findMany({
  where: { role: 'employee', statut: 'actif' },
  include: {
    pointages: {
      where: { horodatage: { gte: startDate, lte: today } }
    },
    conges: {
      where: {
        dateDebut: { gte: startDate },
        dateFin: { lte: today },
        statut: 'approuvé'
      }
    }
  }
});

// Calcul du score pour chaque employé
// Score = (TauxPresence + TauxPonctualite) / 2
```

### 4. Évolution Effectif
```javascript
// Entrées du mois
const entrees = await prisma.user.count({
  where: {
    role: 'employee',
    dateEmbauche: { gte: debutMois, lte: finMois }
  }
});

// Sorties du mois
const sorties = await prisma.user.count({
  where: {
    role: 'employee',
    statut: 'inactif',
    updatedAt: { gte: debutMois, lte: finMois }
  }
});

// Effectif total
const effectifMois = await prisma.user.count({
  where: {
    role: 'employee',
    dateEmbauche: { lte: finMois }
  }
});
```

---

## 🎨 Interface Utilisateur

### Design sobre et professionnel
- **Palette de couleurs** :
  - Principal : `#cf292c` (rouge entreprise)
  - Succès : `#10B981` (vert)
  - Attention : `#F59E0B` (ambre)
  - Critique : `#EF4444` (rouge)
  - Neutre : Gris (`gray-50` à `gray-900`)

- **Composants** :
  - `StatCard` : Cartes KPI avec barre de statut supérieure
  - `ChartSection` : Sections graphiques avec icônes
  - Bordures : `border-gray-200`, arrondis `rounded-lg`
  - Espacements : `gap-4`, `p-5`

- **Typographie** :
  - Titres : `text-base font-semibold`
  - Valeurs : `text-2xl font-semibold`
  - Labels : `text-xs font-medium`

---

## 🔍 Gestion des Cas Limites

### Données manquantes
```javascript
// Vérification systématique
if (!stats || !stats.kpis) {
  return { valeur: 0, alerte: false };
}

// Tableaux vides par défaut
const topEmployes = stats.kpis.topEmployes || [];
```

### Division par zéro
```javascript
const taux = employes > 0 ? (calcul / employes) * 100 : 0;
```

### Format de dates
```javascript
// Timezone-aware
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
```

### Performances
- Utilisation de `useMemo` pour éviter recalculs
- Requêtes optimisées avec `include` et `where`
- Limitation à 3-5 éléments pour les tops/alertes

---

## 🚀 Déploiement

### Prérequis
1. Base de données PostgreSQL avec données réelles
2. Tables : `users`, `pointages`, `conges`, `shifts`, `plannings`
3. Champs requis :
   - `users` : id, role, statut, dateEmbauche, prenom, nom
   - `pointages` : userId, type, horodatage
   - `conges` : userId, type, dateDebut, dateFin, statut

### Configuration
- **Backend** : Port 5000 (défaut)
- **Frontend** : Port 3000 (défaut)
- **API URL** : `http://localhost:5000/admin/stats?periode={periode}`

### Test
```bash
# 1. Démarrer le serveur
cd server
node server.js

# 2. Démarrer le client
cd client
npm start

# 3. Accéder à /stats en tant qu'admin
```

---

## 📊 Exemple de Réponse API

```json
{
  "employes": 18,
  "demandesAttente": 2,
  "congesCeMois": 5,
  "totalHeures": "127h30",
  "tempsPresence": "127h30",
  "kpis": {
    "tauxAbsenteisme": "8.5",
    "dureeMoyenneJour": "7.5",
    "tauxRetards": "3.2",
    "topEmployes": [
      {
        "nom": "Sophie Martin",
        "score": 98,
        "presence": 100,
        "ponctualite": 96
      },
      {
        "nom": "Thomas Dubois",
        "score": 95,
        "presence": 98,
        "ponctualite": 92
      },
      {
        "nom": "Emma Bernard",
        "score": 93,
        "presence": 95,
        "ponctualite": 91
      }
    ],
    "employesProblematiques": [
      {
        "nom": "Jean Dupont",
        "absences": 8,
        "retards": 12,
        "type": "critical"
      }
    ],
    "evolutionHeuresSup": [
      { "jour": "S1", "heures": 45 },
      { "jour": "S2", "heures": 52 },
      { "jour": "S3", "heures": 38 },
      { "jour": "S4", "heures": 61 }
    ],
    "evolutionEffectif": [
      { "mois": "Jan", "entrees": 2, "sorties": 1, "effectif": 15 },
      { "mois": "Fév", "entrees": 3, "sorties": 0, "effectif": 18 },
      { "mois": "Mar", "entrees": 1, "sorties": 2, "effectif": 17 },
      { "mois": "Avr", "entrees": 0, "sorties": 1, "effectif": 16 },
      { "mois": "Mai", "entrees": 2, "sorties": 0, "effectif": 18 }
    ]
  },
  "periode": "mois",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

---

## ✅ Checklist de Validation

- [x] Backend : Calculs de tous les KPIs implémentés
- [x] Backend : Endpoint `/admin/stats` retourne `kpis` object
- [x] Frontend : Hooks `useMemo` utilisent `stats.kpis.*`
- [x] Frontend : Gestion des cas null/undefined
- [x] Frontend : Design sobre appliqué
- [x] Frontend : Tous les graphiques utilisent des données réelles
- [x] Tests : Pas d'erreurs ESLint
- [x] Tests : Pas d'erreurs de compilation
- [x] Documentation : Guide complet créé

---

## 🔮 Améliorations Futures

1. **Cache Redis** : Mise en cache des calculs intensifs (1-5 min TTL)
2. **Webhooks** : Notifications temps réel des alertes critiques
3. **Export Excel/PDF** : Génération de rapports téléchargeables
4. **Comparaison périodes** : Afficher variations mois N vs mois N-1
5. **Prédictions ML** : Anticipation des tendances d'absentéisme
6. **Drill-down** : Clic sur KPI → détails par employé
7. **Filtres avancés** : Par département, catégorie, équipe
8. **Objectifs personnalisés** : Définir seuils d'alerte custom

---

## 📞 Support

Pour toute question ou bug :
1. Vérifier les logs du serveur : `console.log` dans `adminController.js`
2. Vérifier la console du navigateur : DevTools → Console
3. Tester l'API directement : `GET http://localhost:5000/admin/stats?periode=mois`
4. Vérifier les données en base : Prisma Studio ou pgAdmin

---

**Date de mise à jour** : 30 octobre 2025
**Version** : 1.0.0
**Statut** : ✅ Production Ready
