# 🚀 Guide de Déploiement Complet - Chez Antoine

## 📊 Stack de déploiement GRATUIT

| Service | Usage | Limite gratuite | Lien |
|---------|-------|-----------------|------|
| **Vercel** | Frontend React | Illimité | https://vercel.com |
| **Render** | Backend Node.js | 750h/mois (spin down après 15min) | https://render.com |
| **Neon** | PostgreSQL | 0.5GB storage | https://neon.tech |

---

## 🎯 CHECKLIST PRÉ-DÉPLOIEMENT

- [ ] Compte GitHub avec le code pushé
- [ ] Compte Gmail pour les emails (ou Brevo)
- [ ] Mot de passe d'application Gmail créé

---

## 📋 ÉTAPE 1 : Créer la base de données (Neon)

1. Aller sur https://neon.tech
2. **Sign Up** avec GitHub
3. **Create Project** :
   - Name: `chez-antoine`
   - Region: `AWS eu-central-1` (Francfort, plus proche de Paris)
4. **Copier** l'URL de connexion :
   ```
   postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## 📋 ÉTAPE 2 : Déployer le Backend (Render)

### 2.1 Créer le service
1. https://render.com → **Sign Up** avec GitHub
2. **New** → **Web Service**
3. Connecter votre repo GitHub
4. Configurer :

| Paramètre | Valeur |
|-----------|--------|
| **Name** | `chez-antoine-api` |
| **Region** | `Frankfurt (EU Central)` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npx prisma db push` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 2.2 Variables d'environnement (Render)

Cliquer sur **Environment** et ajouter :

```env
DATABASE_URL=postgresql://...votre-url-neon...
JWT_SECRET=GENEREZ_UNE_CLE_ALEATOIRE_DE_32_CARACTERES
FRONTEND_URL=https://chez-antoine.vercel.app
NODE_ENV=production
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

> 💡 **Générer JWT_SECRET** : https://generate-secret.vercel.app/32

### 2.3 Déployer
Cliquer **Create Web Service** → Attendre ~5 minutes

### 2.4 Initialiser la base de données
Une fois déployé, aller dans **Shell** et exécuter :
```bash
node scripts/init-production.js
```

Notez les identifiants admin affichés !

---

## 📋 ÉTAPE 3 : Déployer le Frontend (Vercel)

### 3.1 Créer le projet
1. https://vercel.com → **Sign Up** avec GitHub
2. **Add New** → **Project**
3. Importer votre repo

### 3.2 Configurer

| Paramètre | Valeur |
|-----------|--------|
| **Framework Preset** | `Create React App` |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `build` |

### 3.3 Variables d'environnement (Vercel)

```env
REACT_APP_API_URL=https://chez-antoine-api.onrender.com
```

### 3.4 Déployer
Cliquer **Deploy** → Attendre ~2 minutes

---

## 📋 ÉTAPE 4 : Configuration Email Gmail

### Créer un mot de passe d'application :

1. Aller sur https://myaccount.google.com/security
2. Activer **Validation en 2 étapes** (si pas déjà fait)
3. Aller dans **Mots de passe des applications**
4. Créer un mot de passe pour "Mail" sur "Autre (Chez Antoine)"
5. Copier le mot de passe généré (16 caractères)
6. L'utiliser comme `EMAIL_PASSWORD` dans Render

---

## 📋 ÉTAPE 5 : Configurer la Badgeuse (Tablette)

### Option A : Lien direct (simple)
```
https://chez-antoine.vercel.app/badgeuse
```

### Option B : Mode kiosque Android
1. Installer **Fully Kiosk Browser** (Play Store)
2. URL de démarrage : `https://chez-antoine.vercel.app/badgeuse`
3. Activer le mode kiosque (empêche de quitter)

### Option C : PWA (recommandé)
1. Ouvrir Chrome sur la tablette
2. Aller sur `https://chez-antoine.vercel.app/badgeuse`
3. Menu ⋮ → **Ajouter à l'écran d'accueil**
4. L'app s'ouvre en plein écran

---

## 📋 ÉTAPE 6 : Premiers pas

### 1. Connexion Admin
- URL: `https://chez-antoine.vercel.app`
- Email: `admin@chezantoine.fr` (ou celui défini)
- Mot de passe: `ChezAntoine2024!` (changez-le !)

### 2. Créer les employés

**Option A : Un par un**
- Admin → Employés → Ajouter
- Remplir le formulaire
- Cliquer "Envoyer email de bienvenue"

**Option B : Import CSV en masse**
- Admin → Employés → Import CSV
- Télécharger le template
- Remplir avec vos employés
- Importer

### 3. Imprimer les QR Codes
- Pour chaque employé → Actions → Imprimer carte
- Plastifier les cartes QR

### 4. Créer les plannings
- Admin → Planning
- Ajouter les shifts de la semaine

---

## 🔧 MAINTENANCE

### Mettre à jour l'application
```bash
git add .
git commit -m "Mise à jour"
git push
```
→ Vercel et Render se mettent à jour automatiquement

### Voir les logs (Render)
Dashboard → Logs

### Backup base de données
Neon → Project → Branches → Create Branch (snapshot)

---

## 🆘 DÉPANNAGE

### "Service unavailable" sur Render
Le serveur gratuit s'éteint après 15min d'inactivité. Premier chargement = ~30 secondes.

### Emails non reçus
1. Vérifier les spams
2. Vérifier `EMAIL_USER` et `EMAIL_PASSWORD` sur Render
3. Vérifier que la validation en 2 étapes Gmail est activée

### Erreur de connexion
1. Vérifier `REACT_APP_API_URL` sur Vercel
2. Vérifier que l'URL Render est correcte
3. Vérifier les CORS (domaine Vercel autorisé)

---

## 📱 URLS FINALES

| Service | URL |
|---------|-----|
| **App Manager** | https://chez-antoine.vercel.app |
| **App Employé** | https://chez-antoine.vercel.app/home |
| **Badgeuse** | https://chez-antoine.vercel.app/badgeuse |
| **API** | https://chez-antoine-api.onrender.com |


## ⚠️ Notes importantes

### Render (tier gratuit)
- Le serveur s'endort après 15 min d'inactivité
- Première requête après inactivité = ~30s de délai
- Solution : utiliser un service de ping (UptimeRobot gratuit)

### Neon (tier gratuit)
- 0.5 GB de stockage
- Connexions illimitées
- Auto-suspend après 5 min d'inactivité (redémarre instantanément)

### Vercel (tier gratuit)
- 100 GB bandwidth/mois
- Déploiements illimités
- SSL automatique

---

## 🔧 Commandes utiles

```bash
# Générer un JWT_SECRET sécurisé
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Tester la connexion DB depuis Render Shell
npx prisma db pull

# Voir les logs Render
# Dashboard → Logs
```
