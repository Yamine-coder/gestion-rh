# CLAUDE.md - Gestion RH Restaurant

## 🎯 Description du Projet
Application de gestion RH pour restaurant avec deux interfaces :
- **Admin/Manager** : Planning, gestion employés, anomalies, congés, rapports
- **Employé (PWA)** : Pointage, QR code, congés, profil

---

## 🛠️ Stack Technique

### Frontend
- **Framework** : React 18 (Create React App)
- **Styling** : Tailwind CSS avec couleurs custom (`primary-*`)
- **Routing** : React Router v6
- **Icons** : @heroicons/react/24/outline (toujours `strokeWidth={1.5}`)
- **QR Code** : qrcode.react

### Backend
- **Runtime** : Node.js + Express
- **Database** : PostgreSQL (port 5432)
- **Auth** : JWT tokens

### PWA
- `client/public/manifest.json` - Configuration PWA
- Support iOS safe-area obligatoire

---

## 📁 Structure des Fichiers Clés

```
client/
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx        # Navigation mobile employé
│   │   ├── PlanningRH.jsx       # Planning admin (~8000 lignes)
│   │   ├── NotificationsModal.jsx
│   │   └── ...
│   ├── pages/
│   │   ├── HomeEmploye.jsx
│   │   ├── Pointage.jsx
│   │   ├── ProfilEmploye.jsx
│   │   └── ...
│   ├── config/
│   │   └── api.js               # API_URL centralisé
│   ├── context/
│   │   └── ThemeContext.jsx
│   └── hooks/
│       └── useNotifications.js
├── public/
│   ├── manifest.json
│   └── index.html               # Meta PWA/iOS
server/
├── index.js                     # Point d'entrée backend
└── ...
```

---

## 🎨 Conventions de Style

### Couleurs
- **Primaire** : `primary-500/600/700` (défini dans tailwind.config.js)
- **Sage Green alternatif** : `#4F8F6A` (pour design eco/wellness)
- **Texte** : `slate-900` (light) / `white` (dark)
- **Muted** : `slate-400/500`

### Responsive
- **Mobile-first** : Classes par défaut = mobile
- **Desktop** : Préfixe `lg:` (≥1024px)
- **Tablette** : Préfixe `md:` si nécessaire

### Safe Area iOS
```jsx
style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
```

### Touch Targets
- Minimum **44x44px** (iOS) ou **48x48px** (Material Design)
- Navigation : hauteur **56px** standard

### Animations
- Durées : `duration-200` (rapide), `duration-300` (normal)
- Easing : `ease-out` ou `cubic-bezier(0.34, 1.2, 0.64, 1)` (bounce subtil)

---

## ⚠️ Règles Importantes

### À FAIRE
- ✅ Toujours vérifier les imports avant de supprimer
- ✅ Tester avec `npm run build` après modification
- ✅ Utiliser `strokeWidth={1.5}` sur les icônes Heroicons
- ✅ Respecter le safe-area pour iOS PWA
- ✅ Garder la rétrocompatibilité dark mode

### À NE PAS FAIRE
- ❌ Ne jamais créer de fichiers .md de documentation sans demande explicite
- ❌ Ne pas supprimer `BoltIcon` ou autres imports utilisés dans le modal QR
- ❌ Ne pas modifier `PlanningRH.jsx` sans contexte complet (fichier critique)
- ❌ Ne pas hardcoder les URLs API (utiliser `API_URL` de config/api.js)

---

## 🔧 Commandes Utiles

```bash
# Frontend
cd client
npm start          # Dev server (port 3000)
npm run build      # Production build

# Backend
cd server
node index.js      # Lancer le serveur

# Database
# PostgreSQL sur port 5432
```

---

## 🐛 Problèmes Connus & Solutions

| Problème | Solution |
|----------|----------|
| `BoltIcon is not defined` | Ajouter l'import ou remplacer par emoji ⚡ |
| Anciennes versions sur différents ports | Arrêter tous les processus node, vider cache CRA |
| `segments.forEach is not a function` | Normaliser avec `Array.isArray(segments)` |
| Caractères accentués corrompus `�` | Vérifier encodage UTF-8 du fichier |

---

## 📱 PWA - App Employé

### Routes Employé
- `/home` - Accueil
- `/pointage` - Pointage
- `/mes-conges` - Mes congés
- `/employee/profil` - Profil
- `/badgeuse` - Scanner QR (admin)

### Composant BottomNav
Navigation mobile avec :
- 4 onglets + 1 FAB central (QR Code)
- Indicateur actif (dot ou sliding)
- Support badges et notification dots
- Safe-area iOS

---

## 🔐 Authentification

- JWT stocké dans `localStorage.getItem('token')`
- Rôles : `admin`, `manager`, `employee`
- Routes protégées via `<ProtectedRoute roleRequired="...">`

---

## 📝 Notes de Session

*Espace pour notes temporaires pendant le développement*

- Navigation mobile refaite en style premium (pill + animations)
- Planning RH restauré (version 8458 lignes avec remplacements/extras)
