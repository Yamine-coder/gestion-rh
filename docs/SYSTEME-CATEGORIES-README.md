# Système de Catégories d'Employés - Documentation

## 🎯 Vue d'ensemble
Le système de catégories permet de mieux organiser et identifier les employés selon leur rôle dans l'entreprise. Chaque employé est automatiquement assigné à une catégorie avec un badge visuel distinctif.

## 📋 Catégories Disponibles

### 🍽️ **Service** 
- **Couleur**: Bleu clair (`bg-blue-100 text-blue-800`)
- **Rôles**: Serveurs, baristas, personnel d'accueil
- **Critères**: Poste contenant "service", "serveur", "barista", "accueil"

### 👨‍🍳 **Cuisine** 
- **Couleur**: Orange (`bg-orange-100 text-orange-800`)
- **Rôles**: Cuisiniers, chefs, commis de cuisine
- **Critères**: Poste contenant "cuisine", "chef", "cuisinier", "commis"

### 💼 **Administration** 
- **Couleur**: Violet (`bg-purple-100 text-purple-800`)
- **Rôles**: Managers, responsables, personnel administratif
- **Critères**: Poste contenant "admin", "manager", "responsable", "directeur"

### 🔧 **Technique** 
- **Couleur**: Vert (`bg-green-100 text-green-800`)
- **Rôles**: Techniciens, maintenance, support IT
- **Critères**: Poste contenant "technique", "technicien", "maintenance", "it"

### 🧹 **Entretien** 
- **Couleur**: Jaune (`bg-yellow-100 text-yellow-800`)
- **Rôles**: Personnel d'entretien, nettoyage
- **Critères**: Poste contenant "entretien", "nettoyage", "ménage"

### 🛡️ **Sécurité** 
- **Couleur**: Rouge (`bg-red-100 text-red-800`)
- **Rôles**: Agents de sécurité, surveillance
- **Critères**: Poste contenant "sécurité", "surveillance", "agent"

### 👤 **Général** (par défaut)
- **Couleur**: Gris (`bg-gray-100 text-gray-800`)
- **Rôles**: Tous les autres employés
- **Critères**: Aucun critère spécifique détecté

## 🎨 Interface Utilisateur

### Vue Desktop - Tableau
- **Colonne Employé**: Badge de catégorie affiché à côté du nom
- **Filtre de Catégorie**: Menu déroulant permettant de filtrer par catégorie
- **Recherche**: Compatible avec le système de catégories

### Vue Mobile - Cartes
- **En-tête Employé**: Badge de catégorie compact avec icône
- **Responsive**: Texte de catégorie masqué sur très petits écrans
- **Filtre Mobile**: Menu déroulant adaptatif

## 🔍 Système de Filtrage

### Options de Filtre
```
- Toutes les catégories (affiche tous les employés)
- Service (🍽️)
- Cuisine (👨‍🍳)  
- Administration (💼)
- Technique (🔧)
- Entretien (🧹)
- Sécurité (🛡️)
- Général (👤)
```

### Fonctionnement
1. **Détection Automatique**: La catégorie est déterminée selon le poste de l'employé
2. **Filtrage**: Possibilité de n'afficher que les employés d'une catégorie
3. **Recherche Combinée**: Recherche par nom + filtre de catégorie

## 🛠️ Implémentation Technique

### Fonction de Catégorisation
```javascript
const getCategorieEmploye = (employe) => {
  const poste = (employe.poste || '').toLowerCase();
  
  if (poste.includes('service') || poste.includes('serveur') || 
      poste.includes('barista') || poste.includes('accueil')) {
    return { label: 'Service', color: 'bg-blue-100 text-blue-800', icon: '🍽️' };
  }
  // ... autres catégories
}
```

### État du Filtre
```javascript
const [selectedCategory, setSelectedCategory] = useState('');
```

### Employés Filtrés
```javascript
const filteredEmployes = employes.filter(emp => {
  const matchesSearch = // logique de recherche
  const matchesCategory = !selectedCategory || 
    getCategorieEmploye(emp).label === selectedCategory;
  return matchesSearch && matchesCategory;
});
```

## 📱 Utilisation

### Pour les Managers
1. **Filtrage Rapide**: Sélectionnez une catégorie dans le menu déroulant
2. **Vue d'Ensemble**: Les badges permettent d'identifier rapidement les rôles
3. **Planning Organisé**: Meilleure visualisation de la répartition des équipes

### Pour l'Organisation
1. **Gestion par Équipe**: Planification par service (cuisine, service, etc.)
2. **Identification Visuelle**: Couleurs distinctives pour chaque catégorie
3. **Flexibilité**: Système évolutif pour ajouter de nouvelles catégories

## 🔄 Prochaines Étapes

### Pour demain (Deadline Boss)
1. **Nettoyage des Données**: `node nettoyer-et-preparer.js`
2. **Ajout d'Employés Réels**: Via l'interface "👨‍🍳 Ajouter un employé"
3. **Attribution des Postes**: Bien renseigner le champ "poste" pour la catégorisation automatique

### Améliorations Futures
- [ ] Catégories personnalisables via interface admin
- [ ] Statistiques par catégorie
- [ ] Gestion des permissions par catégorie
- [ ] Export des plannings par catégorie

## 💡 Conseils d'Utilisation

### Pour une Catégorisation Optimale
- **Soyez Précis**: Utilisez des termes clairs dans le champ "poste" 
- **Cohérence**: Utilisez les mêmes termes pour des rôles similaires
- **Exemples de Postes**:
  - "Chef de cuisine" → Catégorie Cuisine 👨‍🍳
  - "Serveur principal" → Catégorie Service 🍽️
  - "Manager général" → Catégorie Administration 💼

### Test du Système
1. Accédez au Planning RH
2. Vérifiez l'affichage des badges de catégorie
3. Testez le filtre par catégorie
4. Vérifiez la vue mobile (responsive)
