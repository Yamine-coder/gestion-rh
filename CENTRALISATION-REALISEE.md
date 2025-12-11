# ✅ CENTRALISATION RÉALISÉE - Types de Congés et Catégories

**Date :** 1er décembre 2025  
**Status :** Phase 1 terminée - Configurations créées

---

## 📁 FICHIERS CRÉÉS

### Backend (Server)
1. ✅ `server/config/typesConges.js` (304 lignes)
   - 10 types de congés définis
   - Fonctions utilitaires (getTypeConge, isValidTypeConge, normalizeTypeConge, etc.)
   - Indicateur `requireJustificatif` pour chaque type

2. ✅ `server/config/categoriesEmployes.js` (147 lignes)
   - 11 catégories définies
   - Séparation CATEGORIES_RESTAURANT / CATEGORIES_ADMIN
   - Fonctions de validation et normalisation

### Frontend (Client)
3. ✅ `client/src/config/typesConges.js` (238 lignes)
   - Types synchronisés avec backend
   - Classes Tailwind pour styling
   - Fonctions `getTypeBadge()` pour affichage UI

4. ✅ `client/src/utils/categoriesConfig.js` (déjà existant - à mettre à jour)
   - Consolidation à faire avec nouvelle config

---

## 🎯 TYPES DE CONGÉS DISPONIBLES

| Code | Label | Icône | Justificatif requis |
|------|-------|-------|---------------------|
| `CP` | Congés Payés | 🏖️ | ❌ |
| `RTT` | RTT | ⏰ | ❌ |
| `maladie` | Arrêt Maladie | 🏥 | ✅ |
| `sans_solde` | Congé Sans Solde | 💸 | ❌ |
| `maternite` | Congé Maternité | 🤰 | ✅ |
| `paternite` | Congé Paternité | 👶 | ✅ |
| `deces` | Congé pour Décès | 🕊️ | ✅ |
| `mariage` | Congé Mariage | 💍 | ❌ |
| `formation` | Formation Professionnelle | 📚 | ❌ |
| `autre` | Autre Absence | 📋 | ❌ |

---

## 🏢 CATÉGORIES EMPLOYÉS DISPONIBLES

### Restaurant (Employees)
- **Cuisine** 👨‍🍳 (orange)
- **Service** 🍽️ (blue)
- **Management** 💼 (purple)
- **Entretien** 🧹 (yellow)

### Administration (Admins)
- **Direction** 🎯 (red)
- **RH** 🤝 (pink)
- **Finance** 💰 (teal)
- **Operations** 📦 (indigo)

### Autres
- **Technique** 🔧 (green)
- **Sécurité** 🛡️ (slate)
- **Général** 👤 (gray)

---

## 🔄 PROCHAINES ÉTAPES

### Phase 2 : Intégration Backend ⏳

#### 2.1 Validation dans les routes
- [ ] **congeRoutes.js** : Valider les types à la création
```javascript
const { isValidTypeConge } = require('../config/typesConges');

router.post('/', async (req, res) => {
  const { type } = req.body;
  if (!isValidTypeConge(type)) {
    return res.status(400).json({ error: 'Type de congé invalide' });
  }
  // ... suite du code
});
```

- [ ] **userRoutes.js / adminRoutes.js** : Valider les catégories
```javascript
const { isValidCategorie } = require('../config/categoriesEmployes');
```

#### 2.2 Mise à jour des calculs
- [ ] **statsRoutes.js** : Remplacer `includes('maladie')` par `getTypeConge(type).code === 'maladie'`
- [ ] **exportUtils.js** : Utiliser `getTypeConge()` pour les exports

#### 2.3 Migration des données existantes
- [ ] Script de normalisation des types dans la BDD
```javascript
// Exemple: 'Maladie' -> 'maladie', 'rtt' -> 'RTT'
const { normalizeTypeConge } = require('./config/typesConges');
```

---

### Phase 3 : Intégration Frontend ⏳

#### 3.1 Composants à mettre à jour
- [ ] **DemandeCongeForm.jsx** : Select avec `getTypesForSelect()`
- [ ] **MesConges.jsx** : Badge avec `getTypeBadge()`
- [ ] **CongesTable.jsx** : Affichage avec config centralisée
- [ ] **PlanningRH.jsx** : Remplacer switch/case par `getTypeBadge()`

#### 3.2 FormulaireCreationEmploye.jsx
- [ ] Supprimer `CATEGORIES_EMPLOYES` et `CATEGORIES_ADMIN`
- [ ] Importer depuis `config/categoriesEmployes` (via utils)

---

### Phase 4 : Justificatifs d'Absence 🆕

#### 4.1 Migration BDD
```prisma
model Conge {
  id        Int      @id @default(autoincrement())
  type      String
  statut    String   @default("en attente")
  dateDebut DateTime
  dateFin   DateTime
  userId    Int
  vu        Boolean  @default(false)
  
  // 🆕 NOUVEAUX CHAMPS
  justificatif String?   // Chemin du fichier
  dateUploadJustificatif DateTime?
  
  user      User     @relation(fields: [userId], references: [id])
}
```

#### 4.2 Routes API
- [ ] **POST** `/api/conges/:id/justificatif` - Upload
- [ ] **DELETE** `/api/conges/:id/justificatif` - Suppression
- [ ] **GET** `/api/conges/:id/justificatif` - Téléchargement

#### 4.3 Composants Frontend
- [ ] **ModalJustificatifsConges.jsx** (nouveau composant)
  - Liste des congés nécessitant justificatifs
  - Upload drag & drop
  - Stats (total, avec justificatif, manquants)

#### 4.4 Intégration dans exports
- [ ] Ajouter colonne "JUSTIFICATIF" dans Excel
- [ ] Inclure justificatifs dans ZIP (comme Navigo)
- [ ] LIRE_MOI.txt avec correspondance

---

## 📊 ARCHITECTURE FINALE

```
┌─────────────────────────────────────────────────┐
│            APPLICATION GestionRH                │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
  ┌─────▼──────┐             ┌──────▼─────┐
  │   BACKEND  │             │  FRONTEND  │
  └────────────┘             └────────────┘
        │                            │
  ┌─────▼────────────┐       ┌──────▼────────────┐
  │  CONFIG FILES    │       │  CONFIG FILES     │
  ├──────────────────┤       ├───────────────────┤
  │ typesConges.js   │◄─────►│ typesConges.js    │
  │ categoriesEmp.js │◄─────►│ categoriesConfig  │
  └──────────────────┘       └───────────────────┘
         │                            │
         ▼                            ▼
  ┌──────────────┐           ┌───────────────────┐
  │   ROUTES     │           │   COMPONENTS      │
  ├──────────────┤           ├───────────────────┤
  │ congeRoutes  │           │ DemandeCongeForm  │
  │ statsRoutes  │           │ MesConges         │
  │ userRoutes   │           │ CongesTable       │
  └──────────────┘           │ PlanningRH        │
                             │ ModalJustificatifs│
                             └───────────────────┘
```

---

## 🧪 PLAN DE TESTS

### Tests Backend
- [ ] Validation types de congés invalides (400)
- [ ] Validation catégories invalides (400)
- [ ] Normalisation des anciens types
- [ ] Calculs stats avec nouveaux types
- [ ] Export Excel avec types centralisés

### Tests Frontend
- [ ] Select affiche tous les types
- [ ] Badge affiche bon style pour chaque type
- [ ] Indicateur justificatif requis visible
- [ ] Upload justificatif fonctionne
- [ ] Téléchargement ZIP avec justificatifs

### Tests E2E
- [ ] Créer demande congé avec nouveau type
- [ ] Upload justificatif pour maladie
- [ ] Export ZIP contient justificatifs
- [ ] Migration données existantes OK

---

## 📝 NOTES IMPORTANTES

### ⚠️ Breaking Changes
1. **Comparaisons strictes** : `type === 'maladie'` au lieu de `type.includes('maladie')`
2. **Codes normalisés** : 'maladie' (minuscule) vs 'CP' (majuscule)
3. **Catégories** : 'Management' au lieu de 'Administration'

### 🔄 Migration
- Script de migration à exécuter AVANT déploiement
- Backup BDD recommandé
- Tests sur environnement de staging

### 🚀 Déploiement
1. Déployer backend avec nouvelles configs
2. Exécuter script de migration BDD
3. Déployer frontend
4. Vérifier que tout fonctionne
5. Ajouter feature justificatifs

---

## 🎯 AVANTAGES DE LA CENTRALISATION

✅ **Maintenabilité** : Un seul endroit pour ajouter/modifier un type  
✅ **Cohérence** : Mêmes codes partout (backend + frontend)  
✅ **Type-safety** : Validation stricte des types  
✅ **Extensibilité** : Facile d'ajouter de nouveaux types  
✅ **Documentation** : Tout est documenté dans les configs  
✅ **Migration** : Fonctions de normalisation pour anciens types  

---

**Prochaine action recommandée :** Commencer la Phase 2 (Intégration Backend) avec validation dans les routes.
