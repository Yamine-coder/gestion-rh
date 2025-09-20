# Gestion Remplacements/Échanges - Schéma d'implémentation

## 1. Architecture UI - Vue d'ensemble

### Dashboard Overview (existant) - Point d'entrée
```
📊 KPIs existants
┃
└── [Section Remplacements] 🔄
    ├── Badge urgent: "3 remplacements <2h"
    ├── Liste 5 dernières demandes
    └── Bouton "Gérer remplacements" → Navigation vers module dédié
```

### Module Remplacements (nouveau) - Vue principale
```
🔄 Remplacements & Échanges
├── [Barre filtre/actions]
│   ├── Créer remplacement ➕
│   ├── Proposer échange 🔁
│   └── Filtres: Service | Statut | Urgence
│
├── [Vue Kanban/Liste]
│   ├── À POURVOIR (7) 🔴
│   ├── CANDIDATURES (3) 🟡
│   ├── ASSIGNÉ (12) 🟢
│   └── CLOS (45) ⚪
│
└── [Timeline jour] ⏰
    └── Vue calendaire: shifts à problème + remplacements du jour
```

## 2. Structure de données

### ReplacementRequest
```javascript
{
  id: "repl_001",
  type: "replacement" | "swap", 
  status: "draft" | "open" | "candidates" | "assigned" | "closed",
  urgency: "urgent" | "soon" | "planned",
  
  // Shift concerné
  originalShift: {
    id: "shift_123",
    employeeId: "emp_456",
    employeeName: "Martin Dupont",
    start: "2025-08-22T09:00:00Z",
    end: "2025-08-22T17:00:00Z",
    service: "Caisse",
    role: "Caissier",
    competences: ["caisse", "hygiène"]
  },
  
  // Contraintes
  requirements: {
    services: ["Caisse", "Accueil"],
    competences: ["caisse"],
    certifications: ["hygiène_2025"]
  },
  
  // Candidatures
  candidates: [{
    employeeId: "emp_789",
    employeeName: "Sophie Martin", 
    proposedAt: "2025-08-22T08:30:00Z",
    score: 85, // Auto-calculé
    status: "pending" | "accepted" | "rejected"
  }],
  
  // Métadonnées
  createdBy: "admin_001",
  createdAt: "2025-08-22T08:00:00Z",
  reason: "Maladie soudaine",
  prime: 20, // %
  
  // Échange spécifique
  swapWith: { // Si type="swap"
    targetShiftId: "shift_789",
    targetEmployeeId: "emp_999"
  }
}
```

## 3. Composants React

### Structure arborescente
```
src/
├── components/
│   ├── DashboardOverview.jsx (✓ existant, enrichi)
│   └── replacements/
│       ├── ReplacementsManager.jsx        # Vue principale
│       ├── ReplacementCard.jsx            # Carte demande
│       ├── CandidatesList.jsx            # Liste candidats
│       ├── QuickAssignModal.jsx          # Popup assignation
│       ├── CreateReplacementModal.jsx    # Créer demande
│       ├── SwapProposalModal.jsx         # Proposer échange
│       └── ReplacementTimeline.jsx       # Vue calendaire
│
├── services/
│   └── replacementsAPI.js               # API calls
│
└── utils/
    ├── replacementScoring.js            # Logique scoring
    └── replacementValidation.js         # Validation règles
```

## 4. Interface utilisateur détaillée

### Vue principale ReplacementsManager.jsx
```jsx
┌─ Header ─────────────────────────────────────┐
│ 🔄 Remplacements & Échanges          [Aide?] │
│ ┌─ Actions ──┐ ┌─ Filtres ─────────────────┐ │
│ │ ➕ Créer   │ │ Service: [Tous▼]  Status:  │ │
│ │ 🔁 Échange │ │ [Actifs▼]  Urgence: [▼]   │ │
│ └───────────┘ └──────────────────────────┘ │
├─ Stats rapides ──────────────────────────────┤
│ 🔴 Urgent: 3  🟡 Candidatures: 5  📊 7j: 23 │
├─ Vue Kanban ────────────────────────────────┤
│ ┌─ À POURVOIR (7) ──┐ ┌─ CANDIDATURES (3) ─┐ │
│ │ 📋 Caisse 09h-17h │ │ 📋 Salle 14h-20h   │ │
│ │ 👤 → M.Dupont     │ │ 👥 3 candidats     │ │
│ │ ⚡ Dans 45min     │ │ 🎯 Assign. auto    │ │
│ │ [Voir] [Assigner] │ │ [Voir candidats]   │ │
│ │ ─────────────────  │ │ ─────────────────   │ │
│ │ 📋 Cuisine...     │ │ 📋 Service...      │ │
│ └─────────────────  ┘ └─────────────────   ┘ │
│ ┌─ ASSIGNÉ (12) ────┐ ┌─ RÉCENTS (5) ─────┐ │
│ │ ✅ Salle 06h-14h  │ │ ✅ Caisse terminé │ │
│ │ 👤 L.Martin       │ │ 🕐 Il y a 2h      │ │
│ │ ⏰ Débute 6h      │ │ [Détails]         │ │
│ └─────────────────  ┘ └─────────────────   ┘ │
└─────────────────────────────────────────────┘
```

### Détail ReplacementCard.jsx
```jsx
┌─ Demande de remplacement ─────────────────┐
│ 🆔 #REPL_001           Status: 🟡 OUVERT  │
│ ─────────────────────────────────────────  │
│ 📍 Service: Caisse     ⏰ 22/08 09h-17h   │
│ 👤 Remplace: M.Dupont  🎯 Raison: Maladie │
│ 💰 Prime: +20%         ⚡ Urgence: 45min  │
│ ─────────────────────────────────────────  │
│ 📋 Compétences requises: Caisse, Hygiène  │
│ 👥 Candidats éligibles: 5 personnes       │
│ ─────────────────────────────────────────  │
│ ⭐ Top candidat: Sophie M. (Score: 85/100) │
│ ✓ Disponible ✓ Compétente ⚠️ 42h semaine  │
│ ─────────────────────────────────────────  │
│ [📝 Modifier] [👥 Voir candidats] [✅ Auto-assigner] │
└─────────────────────────────────────────  ┘
```

## 5. Logique métier centrale

### Scoring automatique (replacementScoring.js)
```javascript
function calculateScore(employee, replacement) {
  let score = 0;
  
  // Compétences (40 points)
  score += competenceMatch(employee.skills, replacement.requirements) * 40;
  
  // Disponibilité (30 points) 
  score += availabilityScore(employee.schedule, replacement.shift) * 30;
  
  // Équilibre heures (20 points)
  score += weeklyHoursBalance(employee.weeklyHours, teamAverage) * 20;
  
  // Historique fiabilité (10 points)
  score += reliabilityScore(employee.replacementHistory) * 10;
  
  return Math.round(score);
}
```

### Validation règles (replacementValidation.js)
```javascript
function validateReplacement(employee, shift) {
  const issues = [];
  
  // Repos légal
  if (!hasRequiredRest(employee.lastShiftEnd, shift.start)) {
    issues.push({ type: 'legal', message: 'Repos insuffisant' });
  }
  
  // Heures max semaine
  if (employee.weeklyHours + shift.duration > MAX_WEEKLY_HOURS) {
    issues.push({ type: 'hours', message: 'Dépassement hebdomadaire' });
  }
  
  // Certifications
  const expiredCerts = findExpiredCertifications(employee, shift);
  if (expiredCerts.length) {
    issues.push({ type: 'certification', items: expiredCerts });
  }
  
  return { valid: issues.length === 0, issues };
}
```

## 6. API endpoints

### Structure RESTful
```javascript
// Gestion CRUD
GET    /api/replacements              // Liste avec filtres
POST   /api/replacements              // Créer demande
GET    /api/replacements/:id          // Détail
PUT    /api/replacements/:id          // Modifier
DELETE /api/replacements/:id          // Supprimer

// Actions spécifiques  
POST   /api/replacements/:id/candidates    // Candidater
PUT    /api/replacements/:id/assign        // Assigner
POST   /api/replacements/:id/auto-assign   // Auto-assignation
POST   /api/replacements/:id/close         // Fermer

// Échanges
POST   /api/replacements/swap-request      // Proposer échange
PUT    /api/replacements/swap/:id/accept   // Accepter échange

// Utilitaires
GET    /api/replacements/eligible/:id      // Employés éligibles
POST   /api/replacements/validate          // Validation règles
GET    /api/replacements/stats             // KPIs
```

## 7. Implémentation progressive

### Phase 1: Base fonctionnelle (Sprint 1-2)
- ✅ Enrichir DashboardOverview (déjà fait)
- 🔨 ReplacementsManager vue liste simple
- 🔨 API CRUD basique + validation
- 🔨 Création manuelle remplacements

### Phase 2: Automatisation (Sprint 3-4)  
- 🔨 Système de scoring employés
- 🔨 Auto-génération depuis absences
- 🔨 Notifications push candidats
- 🔨 Assignation automatique

### Phase 3: Échanges & optimisation (Sprint 5+)
- 🔨 Module échanges employé↔employé
- 🔨 Vue Kanban + timeline
- 🔨 Analytics & KPIs avancés
- 🔨 Mobile-friendly

## 8. Points techniques critiques

### Performance
- Pagination demandes (50/page)
- Cache scoring 15min
- WebSocket temps réel (statuts)
- Index DB sur (status, urgency, createdAt)

### Sécurité
- Rôles: Admin (tout), Manager (son service), Employé (candidater)
- Audit log toutes actions
- Validation côté serveur systématique

### UX
- États loading explicites
- Messages erreur contextuels
- Shortcuts clavier (ESC fermer, Enter valider)
- Responsive mobile (consultation)

Veux-tu que je commence l'implémentation par un composant spécifique ?
