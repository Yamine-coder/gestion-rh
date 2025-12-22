# 📊 Configuration Affluence Google (Popular Times)

## 🎯 Vue d'ensemble

Cette fonctionnalité permet de récupérer l'affluence en temps réel de Google Maps pour **Chez Antoine Vincennes** sans surcharger le serveur Render (limité à 512 Mo RAM).

### Architecture hybride

```
GitHub Actions (Puppeteer) → Gist (JSON) → Render (fetch) → Dashboard
     4x/jour                   Storage        Léger           Affichage
```

- **GitHub Actions** : 2000 minutes/mois gratuites, peut exécuter Puppeteer
- **Gist** : Stockage gratuit et accessible publiquement
- **Render** : Fait un simple fetch JSON (pas de Puppeteer)

---

## 🔧 Configuration

### 1. Créer un Gist GitHub

1. Aller sur https://gist.github.com
2. Créer un nouveau Gist **public** avec :
   - Nom : `affluence.json`
   - Contenu : `{}`
3. Noter l'ID du Gist (dans l'URL : `gist.github.com/USERNAME/GIST_ID`)

### 2. Créer un Personal Access Token

1. Aller sur https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Sélectionner le scope : `gist`
4. Copier le token généré

### 3. Configurer les Secrets GitHub

Dans votre repo GitHub → Settings → Secrets and variables → Actions

| Secret | Description | Exemple |
|--------|-------------|---------|
| `GIST_TOKEN` | Personal Access Token avec scope gist | `ghp_xxxx...` |
| `GIST_ID` | ID du Gist créé | `abc123def456` |
| `API_URL` | URL de votre API Render (optionnel) | `https://votre-app.onrender.com` |
| `CRON_SECRET` | Secret pour sécuriser les appels (optionnel) | `mon-secret-123` |

### 4. Configurer la variable d'environnement Render

Dans Render → Environment → Environment Variables :

| Variable | Valeur |
|----------|--------|
| `AFFLUENCE_GIST_ID` | L'ID de votre Gist (ex: `abc123def456`) |
| `CRON_SECRET` | Le même secret que dans GitHub Actions |

---

## 📅 Horaires de scraping

Le workflow GitHub Actions s'exécute aux moments clés :

| Heure Paris | Description |
|-------------|-------------|
| 11h30 | Avant rush midi |
| 12h30 | Rush déjeuner |
| 19h00 | Début service soir |
| 20h30 | Rush dîner |

---

## 🔍 Données récupérées

Le scraper extrait de Google Maps :

```json
{
  "timestamp": "2024-01-15T12:30:00Z",
  "placeId": "ChIJnYLnmZly5kcRgpLV4MN4Rus",
  "placeName": "Chez Antoine Vincennes",
  "liveStatus": "busier",
  "livePercentage": 75,
  "score": 75,
  "trend": "up",
  "message": "🔴 Plus chargé que d'habitude"
}
```

### Status possibles

| Status | Score | Icône | Description |
|--------|-------|-------|-------------|
| `busier` | 70-100% | 🔴 | Plus chargé que d'habitude |
| `normal` | 40-60% | 🟡 | Affluence normale |
| `less_busy` | 10-40% | 🟢 | Moins chargé que d'habitude |
| `unknown` | N/A | ⚪ | Données non disponibles |

---

## 🧪 Tester manuellement

### Lancer le workflow manuellement

1. Aller sur GitHub → Actions → "Scrape Affluence Google"
2. Cliquer sur "Run workflow"

### Vérifier le résultat

```bash
# URL raw du Gist
curl https://gist.githubusercontent.com/VOTRE_USERNAME/GIST_ID/raw/affluence.json
```

### Tester l'API locale

```bash
# Affluence
curl http://localhost:5000/api/external/affluence

# Status APIs
curl http://localhost:5000/api/external/status
```

---

## ⚠️ Limitations

### Google Popular Times

- Données **moyennes** historiques (pas vraiment "temps réel")
- Le "Live busyness" n'est pas toujours disponible
- Peut nécessiter des ajustements du scraper si Google change l'UI

### GitHub Actions

- 2000 minutes/mois gratuites
- 4 exécutions/jour × 2 min × 30 jours = ~240 min/mois ✅
- Délai jusqu'à 20 min sur la ponctualité du cron

---

## 📁 Fichiers

```
scripts/
├── scrape-affluence.js    # Scraper Puppeteer
├── update-gist.js         # Upload vers Gist
└── package.json           # Dépendances

.github/workflows/
└── scrape-affluence.yml   # Workflow GitHub Actions

server/
├── services/externalApisService.js  # getAffluenceData()
└── routes/externalApisRoutes.js     # /api/external/affluence
```

---

## 🚀 Évolutions futures

- [ ] Historique sur 7 jours
- [ ] Graphique d'affluence dans le dashboard
- [ ] Comparaison jour actuel vs moyenne
- [ ] Alertes push quand affluence haute
