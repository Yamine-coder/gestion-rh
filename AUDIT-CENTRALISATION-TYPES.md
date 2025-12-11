# 🔍 AUDIT - Centralisation Types de Congés/Absences et Catégories Employés

**Date :** 1er décembre 2025  
**Objectif :** Vérifier et centraliser la gestion des types de congés/absences et catégories employés dans toute l'application avant d'ajouter les justificatifs d'absence.

---

## 📊 ÉTAT ACTUEL

### 1. **Types de Congés/Absences**

#### ✅ **Sources identifiées :**

**Backend (Server):**
- **Base de données** (`schema.prisma`):
  ```prisma
  model Conge {
    type      String  // Pas d'enum, champ texte libre
    statut    String  @default("en attente")
  }
  ```

**Types utilisés dans le code :**
- `CP` (Congés Payés)
- `RTT` (Réduction du Temps de Travail)
- `maladie` / `Maladie` (incohérence de casse)
- Détection par `includes()` dans les calculs (fragile)

**Frontend (Client):**
- **MesConges.jsx** : Affiche `conge.type` tel quel (aucune validation)
- **DemandeCongeForm.jsx** : Formulaire de création (types probablement en dur)
- **CongesTable.jsx** : Table admin (à vérifier)
- **PlanningRH.jsx** : Badge avec switch case pour `CP`, `RTT`, `Maladie`

#### ❌ **Problèmes identifiés :**

1. **Aucune source unique de vérité** : Les types sont dispersés dans le code
2. **Incohérence de casse** : `maladie` vs `Maladie` vs `MALADIE`
3. **Détection fragile** : `motif.includes('congé')` au lieu de types stricts
4. **Pas de validation** : N'importe quel texte peut être saisi
5. **Pas d'enum** : Risque d'erreurs de frappe
6. **Pas extensible** : Difficile d'ajouter de nouveaux types

---

### 2. **Catégories Employés**

#### ✅ **Sources identifiées :**

**Backend (Server):**
- **Base de données** (`schema.prisma`):
  ```prisma
  model User {
    categorie String?  // Champ texte libre, optionnel
  }
  ```

**Frontend (Client):**
- ✅ **Fichier centralisé** : `client/src/utils/categoriesConfig.js`
- **Catégories définies** :
  - `Cuisine` 👨‍🍳
  - `Service` 🍽️
  - `Administration` 💼
  - `Technique` 🔧
  - `Entretien` 🧹
  - `Sécurité` 🛡️
  - `Opérations` 📦
  - `RH` 🤝
  - `Finance` 💰
  - `Général` 👤

- **FormulaireCreationEmploye.jsx** :
  ```javascript
  const CATEGORIES_EMPLOYES = ['Cuisine', 'Service', 'Management', 'Entretien'];
  const CATEGORIES_ADMIN = ['Direction', 'RH', 'Finance', 'Operations'];
  ```

#### ❌ **Problèmes identifiés :**

1. **Duplication** : Catégories définies à 2 endroits (formulaire ET config centralisée)
2. **Incohérence** : `Management` dans formulaire vs `Administration` dans config
3. **Pas de validation backend** : Aucune vérification côté serveur
4. **Casse non standardisée** : Détection par `.includes()` (fragile)

---

## 🎯 PLAN DE CENTRALISATION

### **Phase 1 : Types de Congés/Absences** ✅ PRIORITAIRE

**Objectif :** Créer une source unique de vérité pour les types de congés

**Actions :**
1. ✅ Créer `server/config/typesConges.js` avec :
   ```javascript
   const TYPES_CONGES = {
     CP: { label: 'Congés Payés', code: 'CP', icon: '🏖️', color: 'blue' },
     RTT: { label: 'RTT', code: 'RTT', icon: '⏰', color: 'purple' },
     MALADIE: { label: 'Maladie', code: 'maladie', icon: '🏥', color: 'red' },
     SANS_SOLDE: { label: 'Sans solde', code: 'sans_solde', icon: '💸', color: 'gray' },
     EVENEMENT_FAMILIAL: { label: 'Événement familial', code: 'evenement_familial', icon: '👨‍👩‍👧', color: 'green' }
   };
   ```

2. ✅ Créer `client/src/config/typesConges.js` (même structure)

3. ✅ Remplacer tous les `includes('maladie')` par des comparaisons strictes

4. ✅ Ajouter validation backend dans les routes de création

5. ✅ Mettre à jour les composants frontend :
   - `DemandeCongeForm.jsx` : Select avec types centralisés
   - `CongesTable.jsx` : Affichage avec config centralisée
   - `PlanningRH.jsx` : Badge avec config centralisée
   - `exportUtils.js` : Génération Excel/PDF avec config

---

### **Phase 2 : Catégories Employés** ⚠️ AMÉLIORATION

**Objectif :** Consolider et valider les catégories

**Actions :**
1. ✅ Utiliser UNIQUEMENT `client/src/utils/categoriesConfig.js`

2. ✅ Supprimer les constantes dupliquées dans `FormulaireCreationEmploye.jsx`

3. ✅ Créer `server/config/categoriesEmployes.js` pour validation backend

4. ✅ Standardiser la casse : toujours `Cuisine`, `Service`, etc. (PascalCase)

5. ✅ Ajouter middleware de validation dans les routes employés

---

### **Phase 3 : Justificatifs d'Absence** 🆕 NOUVEAU FEATURE

**Après centralisation des types**

**Objectif :** Permettre l'upload de justificatifs pour les absences (comme Navigo)

**Actions :**
1. ✅ Ajouter champs BDD :
   ```prisma
   model Conge {
     justificatif String?  // Chemin du fichier
     dateUploadJustificatif DateTime?
   }
   ```

2. ✅ Créer API upload :
   - `POST /api/conges/:id/justificatif` (upload)
   - `DELETE /api/conges/:id/justificatif` (suppression)
   - `GET /api/conges/:id/justificatif` (téléchargement)

3. ✅ Composant frontend `ModalJustificatifsConges.jsx`

4. ✅ Intégration dans export Excel/PDF/ZIP (comme Navigo)

5. ✅ Affichage dans tableau admin avec icône 📎

---

## 📋 CHECKLIST DE MIGRATION

### Types de Congés
- [ ] Créer fichier config serveur
- [ ] Créer fichier config client
- [ ] Remplacer tous les `includes()` par comparaisons strictes
- [ ] Ajouter validation backend
- [ ] Mettre à jour DemandeCongeForm
- [ ] Mettre à jour CongesTable
- [ ] Mettre à jour PlanningRH
- [ ] Mettre à jour exportUtils.js
- [ ] Tests de non-régression

### Catégories Employés
- [ ] Supprimer constantes dupliquées
- [ ] Créer config serveur
- [ ] Ajouter validation backend
- [ ] Standardiser la casse partout
- [ ] Tests de non-régression

### Justificatifs d'Absence
- [ ] Migration BDD (champ justificatif)
- [ ] Routes API upload/delete
- [ ] Composant modal frontend
- [ ] Intégration dans exports
- [ ] Tests complets

---

## 🚨 RISQUES IDENTIFIÉS

1. **Données existantes** : Congés avec types en minuscules (`maladie`, `rtt`)
   - **Solution** : Migration de normalisation + fallback dans code

2. **Breaking changes** : Comparaisons strictes vs `includes()`
   - **Solution** : Tests exhaustifs avant déploiement

3. **Performance** : Uploads de fichiers lourds
   - **Solution** : Limite 5MB + compression côté client

4. **Sécurité** : Upload de fichiers malveillants
   - **Solution** : Validation MIME type + scan antivirus si nécessaire

---

## 📊 IMPACT SUR L'EXISTANT

### Fichiers à modifier (estimé) :

**Backend :**
- `server/routes/congeRoutes.js` (validation types)
- `server/routes/statsRoutes.js` (calculs avec types stricts)
- `server/utils/exportUtils.js` (exports avec config)
- `server/controllers/congeController.js` (logique métier)

**Frontend :**
- `client/src/components/DemandeCongeForm.jsx`
- `client/src/components/CongesTable.jsx`
- `client/src/components/PlanningRH.jsx`
- `client/src/components/MesConges.jsx`

**Nouveaux fichiers :**
- `server/config/typesConges.js` 🆕
- `client/src/config/typesConges.js` 🆕
- `server/config/categoriesEmployes.js` 🆕
- `server/routes/justificatifsCongesRoutes.js` 🆕
- `client/src/components/ModalJustificatifsConges.jsx` 🆕

---

## 🎯 RECOMMANDATIONS

### Priorité 1 : TYPES DE CONGÉS (Avant justificatifs)
⚠️ **CRITIQUE** : Sans centralisation, risque d'incohérences avec les justificatifs

### Priorité 2 : CATÉGORIES EMPLOYÉS (Amélioration UX)
✅ **IMPORTANT** : Déjà partiellement centralisé, besoin de consolidation

### Priorité 3 : JUSTIFICATIFS D'ABSENCE (Nouvelle feature)
🆕 **FEATURE** : Peut commencer une fois Phase 1 terminée

---

## 🔄 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Créer configs centralisées** (types + catégories)
2. **Migration BDD** (si nécessaire)
3. **Mise à jour backend** (validation + routes)
4. **Mise à jour frontend** (composants)
5. **Tests de non-régression**
6. **Ajout justificatifs d'absence** (nouvelle feature)
7. **Intégration dans exports** (Excel/PDF/ZIP)

---

**Conclusion :** La centralisation est ESSENTIELLE avant d'ajouter les justificatifs d'absence. Sans elle, risque de multiplier les incohérences et de créer une dette technique importante.
