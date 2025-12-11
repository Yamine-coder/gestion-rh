// Configuration centralisée des catégories d'employés avec icônes Lucide

import { 
  User, 
  Pizza, 
  Soup, 
  RefreshCw, 
  SprayCan, 
  ShieldCheck, 
  Star, 
  UsersRound, 
  Laptop,
  List
} from 'lucide-react';

// Catégories d'emploi (opérationnels)
export const CATEGORIES_EMPLOYES = ['Pizzaiolo', 'Pastaiolo', 'Caisse/Service', 'Entretien', 'Securite'];
// Service administratif
export const CATEGORIES_ADMIN = ['Direction', 'RH', 'Informatique'];

// Mapping des icônes Lucide pour chaque catégorie
export const CATEGORY_ICONS_LUCIDE = {
  tous: List,
  Pizzaiolo: Pizza,
  Pastaiolo: Soup,
  'Caisse/Service': RefreshCw,
  Entretien: SprayCan,
  Securite: ShieldCheck,
  Direction: Star,
  RH: UsersRound,
  Informatique: Laptop,
  default: User
};

// Icônes SVG minimalistes pour chaque catégorie (paths pour lucide-style icons) - conservé pour rétrocompatibilité
export const CATEGORY_ICONS = {
  tous: null,
  Pizzaiolo: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z', // Circle
  Pastaiolo: 'M3 6h18M3 12h18M3 18h18', // Menu/Lines
  'Caisse/Service': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', // Clipboard
  Entretien: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z', // Wrench
  Securite: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', // Shield
  Direction: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', // Star
  RH: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75', // Users
  Informatique: 'M20 16V7a2 2 0 00-2-2H6a2 2 0 00-2 2v9m16 0H4m16 0l1.28 2.55a1 1 0 01-.9 1.45H3.62a1 1 0 01-.9-1.45L4 16' // Laptop
};

export const getCategorieEmploye = (employe) => {
  // Utiliser SEULEMENT le champ 'categorie' de la base de données
  if (!employe || !employe.categorie) {
    return { 
      label: 'Général', 
      color: 'bg-gray-100 text-gray-800', 
      Icon: User
    };
  }

  const categorie = employe.categorie.toLowerCase();
  
  // Pizzaiolo
  if (categorie.includes('pizzaiolo') || categorie.includes('pizza')) {
    return { 
      label: 'Pizzaiolo', 
      color: 'bg-orange-100 text-orange-800', 
      Icon: Pizza
    };
  }
  
  // Pastaiolo
  if (categorie.includes('pastaiolo') || categorie.includes('pasta') || categorie.includes('pâtes')) {
    return { 
      label: 'Pastaiolo', 
      color: 'bg-yellow-100 text-yellow-800', 
      Icon: Soup
    };
  }
  
  // Caisse/Service
  if (categorie.includes('caisse') || categorie.includes('service') || categorie.includes('polyvalent')) {
    return { 
      label: 'Caisse/Service', 
      color: 'bg-purple-100 text-purple-800', 
      Icon: RefreshCw
    };
  }
  
  // Entretien
  if (categorie.includes('entretien') || categorie.includes('nettoyage')) {
    return { 
      label: 'Entretien', 
      color: 'bg-lime-100 text-lime-800', 
      Icon: SprayCan
    };
  }
  
  // Sécurité
  if (categorie.includes('sécurité') || categorie.includes('securite') || categorie.includes('security')) {
    return { 
      label: 'Sécurité', 
      color: 'bg-red-100 text-red-800', 
      Icon: ShieldCheck
    };
  }
  
  // Direction
  if (categorie.includes('direction') || categorie.includes('directeur')) {
    return { 
      label: 'Direction', 
      color: 'bg-indigo-100 text-indigo-800', 
      Icon: Star
    };
  }
  
  // RH
  if (categorie.includes('rh') || categorie.includes('ressources humaines')) {
    return { 
      label: 'RH', 
      color: 'bg-pink-100 text-pink-800', 
      Icon: UsersRound
    };
  }
  
  // Informatique
  if (categorie.includes('informatique') || categorie.includes('info') || categorie.includes('it')) {
    return { 
      label: 'Informatique', 
      color: 'bg-blue-100 text-blue-800', 
      Icon: Laptop
    };
  }
  
  // Catégorie par défaut - affiche le nom de la catégorie tel quel
  return { 
    label: employe.categorie, 
    color: 'bg-gray-100 text-gray-800', 
    Icon: User
  };
};

// Liste de toutes les catégories disponibles pour les filtres
export const CATEGORIES = [
  { value: 'tous', label: 'Toutes', iconType: 'list', color: '' },
  // Catégories d'emploi
  { value: 'Pizzaiolo', label: 'Pizzaiolo', iconType: 'pizza', color: 'bg-orange-100 text-orange-600' },
  { value: 'Pastaiolo', label: 'Pastaiolo', iconType: 'pasta', color: 'bg-yellow-100 text-yellow-600' },
  { value: 'Caisse/Service', label: 'Caisse/Service', iconType: 'clipboard', color: 'bg-purple-100 text-purple-600' },
  { value: 'Entretien', label: 'Entretien', iconType: 'spray', color: 'bg-lime-100 text-lime-600' },
  { value: 'Securite', label: 'Sécurité', iconType: 'shield', color: 'bg-red-100 text-red-600' },
  // Service administratif
  { value: 'Direction', label: 'Direction', iconType: 'star', color: 'bg-indigo-100 text-indigo-600' },
  { value: 'RH', label: 'RH', iconType: 'users', color: 'bg-pink-100 text-pink-600' },
  { value: 'Informatique', label: 'Informatique', iconType: 'laptop', color: 'bg-blue-100 text-blue-600' },
];

// ✅ Nouvelle fonction pour obtenir les catégories multiples d'un employé
// Retourne un array de configurations de catégories
export const getCategoriesEmploye = (employe) => {
  // Priorité 1: utiliser categoriesArray si disponible (retour API enrichi)
  // Priorité 2: utiliser le champ categorie comme fallback
  let categoriesArray = [];
  
  if (employe?.categoriesArray && Array.isArray(employe.categoriesArray) && employe.categoriesArray.length > 0) {
    categoriesArray = employe.categoriesArray;
  } else if (employe?.categorie) {
    categoriesArray = [employe.categorie];
  }
  
  if (categoriesArray.length === 0) {
    return [{ 
      label: 'Général', 
      color: 'bg-gray-100 text-gray-800', 
      Icon: User
    }];
  }
  
  // Map chaque catégorie vers sa config
  return categoriesArray.map(cat => getCategorieByName(cat));
};

// Fonction utilitaire pour obtenir la config d'une catégorie par son nom
export const getCategorieByName = (categorieName) => {
  if (!categorieName) {
    return { label: 'Général', color: 'bg-gray-100 text-gray-800', Icon: User };
  }
  
  const categorie = categorieName.toLowerCase();
  
  if (categorie.includes('pizzaiolo') || categorie.includes('pizza')) {
    return { label: 'Pizzaiolo', color: 'bg-orange-100 text-orange-800', Icon: Pizza };
  }
  if (categorie.includes('pastaiolo') || categorie.includes('pasta') || categorie.includes('pâtes')) {
    return { label: 'Pastaiolo', color: 'bg-yellow-100 text-yellow-800', Icon: Soup };
  }
  if (categorie.includes('caisse') || categorie.includes('service') || categorie.includes('polyvalent')) {
    return { label: 'Caisse/Service', color: 'bg-purple-100 text-purple-800', Icon: RefreshCw };
  }
  if (categorie.includes('entretien') || categorie.includes('nettoyage')) {
    return { label: 'Entretien', color: 'bg-lime-100 text-lime-800', Icon: SprayCan };
  }
  if (categorie.includes('sécurité') || categorie.includes('securite') || categorie.includes('security')) {
    return { label: 'Sécurité', color: 'bg-red-100 text-red-800', Icon: ShieldCheck };
  }
  if (categorie.includes('direction') || categorie.includes('directeur')) {
    return { label: 'Direction', color: 'bg-indigo-100 text-indigo-800', Icon: Star };
  }
  if (categorie.includes('rh') || categorie.includes('ressources humaines')) {
    return { label: 'RH', color: 'bg-pink-100 text-pink-800', Icon: UsersRound };
  }
  if (categorie.includes('informatique') || categorie.includes('info') || categorie.includes('it')) {
    return { label: 'Informatique', color: 'bg-blue-100 text-blue-800', Icon: Laptop };
  }
  
  return { label: categorieName, color: 'bg-gray-100 text-gray-800', Icon: User };
};

// Vérifie si un employé a une catégorie spécifique (pour filtrage)
export const employeHasCategory = (employe, categorie) => {
  if (!categorie || categorie === 'tous') return true;
  
  const categories = employe?.categoriesArray || (employe?.categorie ? [employe.categorie] : []);
  return categories.some(cat => cat.toLowerCase() === categorie.toLowerCase());
};
