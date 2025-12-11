# 🏷️ Implémentation Multi-Catégories Employés

## Vue d'ensemble

Les employés peuvent désormais être assignés à **plusieurs catégories** simultanément.  
Exemple : Un employé peut être à la fois `Pizzaiolo` et `Caisse/Service`.

---

## 📦 Changements Backend

### Schema Prisma (`server/prisma/schema.prisma`)
```prisma
model User {
  categorie   String?   // DEPRECATED - gardé pour rétrocompatibilité
  categories  String?   // Nouveau: JSON array ex: ["Pizzaiolo", "Caisse/Service"]
}
```

### Utilitaire Categories (`server/utils/categoriesHelper.js`)
```javascript
// Fonctions disponibles :
parseCategories(user)           // JSON string → Array
stringifyCategories(array)      // Array → JSON string
enrichUserWithCategories(user)  // Ajoute categoriesArray au user
userHasAnyCategory(user, cats)  // Vérifie si user a une des catégories
getPrimaryCategory(user)        // Retourne la première catégorie

// Catégories valides :
CATEGORIES_VALIDES = ['Pizzaiolo', 'Pastaiolo', 'Caisse/Service', 'Entretien', 'Securite', 'Direction', 'RH', 'Informatique']
```

### Routes modifiées

| Route | Méthode | Changement |
|-------|---------|------------|
| `/user/profile` | GET | Retourne `categoriesArray` |
| `/user/profil` | GET | Retourne `categoriesArray` |
| `/admin/employes` | GET | Retourne `categoriesArray` pour chaque employé |
| `/admin/employes/:id` | GET | Retourne `categoriesArray` |
| `/admin/employes` | POST | Accepte `categories: []` array |
| `/admin/employes/:id` | PUT | Accepte `categories: []` array |

### Migration (`server/scripts/migrate-categories.js`)
```bash
node server/scripts/migrate-categories.js
```
Convertit les anciennes catégories simples en arrays JSON.

---

## 🎨 Changements Frontend

### Config Categories (`client/src/utils/categoriesConfig.js`)

**Nouvelles fonctions :**
```javascript
// Obtenir toutes les catégories d'un employé (array)
getCategoriesEmploye(employe) → [{ label, color, Icon }, ...]

// Obtenir la config d'une catégorie par nom
getCategorieByName(name) → { label, color, Icon }

// Vérifier si un employé a une catégorie (pour filtrage)
employeHasCategory(employe, categorie) → boolean
```

**Fonction existante (toujours fonctionnelle) :**
```javascript
// Retourne la catégorie principale (première)
getCategorieEmploye(employe) → { label, color, Icon }
```

### Formulaire Création (`FormulaireCreationEmploye.jsx`)

- **State** : `categorie` → `selectedCategories` (array)
- **UI** : Grille de boutons avec multi-sélection
- **Validation** : Au moins une catégorie requise
- **API** : Envoie `categories: [...]` au lieu de `categorie: "..."`

### Formulaire Edition (`ListeEmployes.jsx`)

- **editForm.selectedCategories** : Array de catégories
- **UI** : Grille de boutons toggle
- **API** : Envoie `categories: [...]`

### Profil Employé (`ProfilEmploye.jsx`)

- Affiche les badges de catégories avec icônes
- Support du champ `categoriesArray`

---

## 📊 Format API

### Réponse employé enrichie
```json
{
  "id": 1,
  "nom": "Dupont",
  "prenom": "Jean",
  "categorie": "Pizzaiolo",           // Legacy (première catégorie)
  "categories": "[\"Pizzaiolo\",\"Caisse/Service\"]",  // JSON string
  "categoriesArray": ["Pizzaiolo", "Caisse/Service"]   // Array parsé
}
```

### Requête création/modification
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "categories": ["Pizzaiolo", "Caisse/Service"]
}
```

---

## 🔄 Rétrocompatibilité

| Champ | Usage |
|-------|-------|
| `categorie` | Gardé pour les anciennes intégrations, synchronisé avec la première catégorie |
| `categories` | Stockage JSON array |
| `categoriesArray` | Retourné par l'API pour facilité d'utilisation frontend |

---

## 🧪 Test

```bash
# 1. Migrer les données existantes
cd server
node scripts/migrate-categories.js

# 2. Démarrer le serveur
node index.js

# 3. Tester via API
curl -X POST http://localhost:5000/admin/employes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test","prenom":"Multi","email":"test@test.com","categories":["Pizzaiolo","Caisse/Service"]}'
```

---

## 📁 Fichiers modifiés

### Backend
- `server/prisma/schema.prisma`
- `server/utils/categoriesHelper.js` *(nouveau)*
- `server/scripts/migrate-categories.js` *(nouveau)*
- `server/routes/userRoutes.js`
- `server/controllers/adminController.js`
- `server/controllers/employeController.js`

### Frontend
- `client/src/utils/categoriesConfig.js`
- `client/src/components/FormulaireCreationEmploye.jsx`
- `client/src/components/ListeEmployes.jsx`
- `client/src/pages/ProfilEmploye.jsx`
