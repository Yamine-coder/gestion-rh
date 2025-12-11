# 🚪 Gestion des Départs - Système de Turnover

## 📋 Vue d'ensemble

Système complet pour gérer les départs d'employés (démissions, licenciements, fins de CDD, etc.) avec traçabilité complète pour les statistiques RH et le calcul du turnover.

## 🎯 Objectifs

- ✅ **Tracer tous les départs** avec date, motif et commentaire
- ✅ **Calculer le turnover réel** basé sur les dates de sortie effectives
- ✅ **Conserver l'historique** pour conformité légale (5-10 ans)
- ✅ **Distinguer actifs/partis** dans l'interface
- ✅ **Analytics RH** avec évolution des départs

## 🗄️ Structure Base de Données

### Champs ajoutés au modèle `User`

```prisma
model User {
  // ... champs existants ...
  
  // 📊 Gestion des départs (turnover)
  dateSortie       DateTime?  // Date effective du départ
  motifDepart      String?    // Type de départ (voir liste ci-dessous)
  commentaireDepart String?   // Note du manager
}
```

### Motifs de départ disponibles

| Valeur | Libellé | Description |
|--------|---------|-------------|
| `demission` | Démission | Départ volontaire de l'employé |
| `licenciement` | Licenciement | Rupture à l'initiative de l'employeur |
| `fin_cdd` | Fin de CDD | Arrivée à terme du contrat |
| `fin_periode_essai` | Fin période d'essai | Non validation de la période d'essai |
| `retraite` | Retraite | Départ en retraite |
| `mutation` | Mutation | Transfert vers un autre établissement |
| `abandon_poste` | Abandon de poste | Absence injustifiée prolongée |
| `deces` | Décès | Décès de l'employé |
| `autre` | Autre | Autre motif (préciser en commentaire) |

## 🔧 Backend (API)

### Route principale

```javascript
PUT /admin/employes/:id/depart
```

**Body requis :**
```json
{
  "dateSortie": "2024-11-15",
  "motifDepart": "demission",
  "commentaireDepart": "Nouvelle opportunité professionnelle"
}
```

**Validations :**
- ✅ Employé doit exister
- ✅ Doit être un `role: 'employee'` (pas un admin)
- ✅ Ne peut pas avoir déjà un départ enregistré
- ✅ `dateSortie` et `motifDepart` obligatoires
- ✅ Passe automatiquement `statut: 'parti'`

**Réponse :**
```json
{
  "id": 42,
  "email": "jean.dupont@example.com",
  "statut": "parti",
  "dateSortie": "2024-11-15T00:00:00.000Z",
  "motifDepart": "demission",
  "commentaireDepart": "Nouvelle opportunité professionnelle"
}
```

### Calcul du turnover corrigé

**Avant (❌ incorrect) :**
```javascript
// Utilisait createdAt pour approximer les départs
const sorties = await prisma.user.count({
  where: {
    statut: 'inactif',
    createdAt: { gte: debutMois, lte: finMois }
  }
});
```

**Après (✅ correct) :**
```javascript
// Utilise dateSortie réelle
const sorties = await prisma.user.count({
  where: {
    role: 'employee',
    dateSortie: { gte: debutMois, lte: finMois }
  }
});
```

**Formule du turnover :**
```
Turnover (%) = (Nombre de départs / Effectif moyen) × 100

Effectif moyen = (Effectif début + Effectif fin) / 2
```

## 🎨 Frontend (React)

### Composant ListeEmployes

#### 1. Tabs de filtrage

```jsx
<div className="flex gap-2 mb-4">
  <button onClick={() => setFiltreStatut('actifs')}>
    Actifs ({employes.filter(e => !e.dateSortie).length})
  </button>
  <button onClick={() => setFiltreStatut('partis')}>
    Partis ({employes.filter(e => e.dateSortie).length})
  </button>
</div>
```

#### 2. Bouton "Marquer le départ"

**Conditions d'affichage :**
- ✅ `role === 'employee'`
- ✅ `dateSortie === null` (pas déjà parti)

```jsx
{e.role === 'employee' && !e.dateSortie && (
  <button onClick={() => handleOpenDepart(e)}>
    Marquer le départ
  </button>
)}
```

#### 3. Modal de départ

**Champs du formulaire :**

| Champ | Type | Requis | Valeur par défaut |
|-------|------|--------|-------------------|
| Date de départ | Date | ✅ Oui | Aujourd'hui |
| Motif | Select | ✅ Oui | (vide) |
| Commentaire | Textarea | ❌ Non | (vide) |

**Validation côté client :**
```javascript
disabled={!departForm.dateSortie || !departForm.motifDepart}
```

**Effet visuel :**
- Couleur ambre (warning) pour attirer l'attention
- Confirmation avant enregistrement
- Message : "Cette action modifiera le statut en 'parti'"

## 📊 Statistiques RH

### KPI affectés

1. **Taux de turnover**
   - Basé sur les `dateSortie` réelles
   - Calculé sur 5 mois glissants
   - Formule : `(Départs / Effectif moyen) × 100`

2. **Évolution de l'effectif**
   - Entrées : Employés avec `dateEmbauche` dans le mois
   - Sorties : Employés avec `dateSortie` dans le mois
   - Effectif fin de mois : Tous les actifs

3. **Ancienneté moyenne**
   - Exclut les employés partis (`statut !== 'parti'`)
   - Calculée sur `dateEmbauche` → aujourd'hui

### Exemple de données

```javascript
evolutionEffectif: [
  { mois: 'Juil', entrees: 3, sorties: 1, effectif: 28 },
  { mois: 'Août', entrees: 2, sorties: 2, effectif: 28 },
  { mois: 'Sep', entrees: 1, sorties: 0, effectif: 29 },
  { mois: 'Oct', entrees: 4, sorties: 3, effectif: 30 },
  { mois: 'Nov', entrees: 2, sorties: 1, effectif: 31 }
]

// Turnover = (1+2+0+3+1) / ((28+31)/2) × 100 = 23.7%
```

## 🔐 Conformité Légale

### Durée de conservation

**France :**
- Données salariales : **5 ans minimum**
- Contrats de travail : **5 ans après départ**
- Bulletins de paie : **5 ans**
- Documents liés aux accidents : **10 ans**

**⚠️ IMPORTANT :**
- ❌ **Ne jamais supprimer un employé parti** (utiliser `statut: 'parti'`)
- ✅ **Conserver toutes les données** de pointage, congés, shifts
- ✅ **Tracer la date exacte de départ** avec `dateSortie`
- ✅ **Documenter le motif** pour justifications futures

### Gestion des archives

**Option future :**
Après 5-10 ans, passer en `statut: 'archive'` pour :
- Masquer des listes principales
- Conserver pour audits légaux
- Anonymiser certaines données (RGPD)

## 🎯 Cas d'usage

### Scénario 1 : Démission classique

1. Manager clique sur "Marquer le départ"
2. Sélectionne :
   - Date : 30/11/2024
   - Motif : Démission
   - Commentaire : "Nouvelle opportunité en CDI"
3. Confirmation
4. Employé passe en `statut: 'parti'`
5. Visible dans onglet "Partis"
6. Comptabilisé dans turnover de novembre

### Scénario 2 : Fin de CDD

1. Date de fin contractuelle connue
2. Motif : "Fin de CDD"
3. Commentaire : "CDD 6 mois arrivé à terme"
4. Employé conservé en base pour historique paie

### Scénario 3 : Licenciement

1. Date d'effet du licenciement
2. Motif : "Licenciement"
3. Commentaire : "Faute grave" ou raison économique
4. ⚠️ Conservation obligatoire pour litiges potentiels

## 📈 Métriques Business

### Indicateurs à surveiller

**Turnover sain (restauration) :**
- ✅ < 10% : Excellent
- 👍 10-15% : Acceptable
- ⚠️ 15-25% : Attention
- 🚨 > 25% : Critique

**Motifs de départ :**
- Analyser les tendances (beaucoup de démissions = problème ?)
- Comparer par service/catégorie
- Identifier les périodes critiques (saisons)

**Ancienneté moyenne :**
- Cible : > 2 ans pour stabilité
- < 1 an : Turnover trop élevé
- > 5 ans : Équipe stable

## 🚀 Évolutions futures

### Phase 2 (optionnel)

1. **Entretien de départ**
   - Questionnaire de sortie
   - Feedback employé
   - Analytics des motifs réels

2. **Notifications automatiques**
   - Alerte RH X jours avant fin CDD
   - Rappel entretien de départ
   - Email de procédure de sortie

3. **Réembauche**
   - Statut "réembauché" si retour
   - Conservation historique complet
   - Flag "Boomerang employee"

4. **Analytics avancés**
   - Prédiction des départs (ML)
   - Coût du turnover (recrutement + formation)
   - Taux de rétention par manager

## 🧪 Tests

### Checklist fonctionnelle

- [ ] Modal de départ s'ouvre uniquement pour employés actifs
- [ ] Validation empêche sauvegarde sans date/motif
- [ ] Statut passe bien à "parti" après enregistrement
- [ ] Employé apparaît dans onglet "Partis"
- [ ] Turnover se calcule avec les vraies dates
- [ ] Impossible d'enregistrer 2 fois le départ
- [ ] Admins ne peuvent pas avoir de départ enregistré
- [ ] Dates futures refusées (max = aujourd'hui)

### Cas limites

```javascript
// Test 1: Départ dans le passé
dateSortie: "2024-01-15" // OK

// Test 2: Départ aujourd'hui
dateSortie: "2024-11-02" // OK

// Test 3: Départ futur (devrait être refusé)
dateSortie: "2024-12-15" // ❌ Erreur

// Test 4: Double départ
marquerDepart(42) // OK
marquerDepart(42) // ❌ Erreur "déjà enregistré"
```

## 📚 Ressources

- [Code du travail - Conservation documents](https://www.service-public.fr/particuliers/vosdroits/F31854)
- [CNIL - Durées de conservation RH](https://www.cnil.fr/fr/les-durees-de-conservation-des-donnees)
- [Turnover restauration - Benchmark](https://www.observatoiremetiersderestauration.fr/)

---

**Version :** 1.0  
**Date :** 02/11/2024  
**Auteur :** Système RH - Module Turnover
