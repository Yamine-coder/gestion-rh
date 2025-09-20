# Configuration Gmail pour l'envoi d'emails

## 🔧 Configuration requise

### 1. Activer l'authentification à 2 facteurs sur Gmail
- Allez sur votre compte Google : https://myaccount.google.com/
- Sécurité → Validation en 2 étapes → Activer

### 2. Créer un mot de passe d'application
- Dans Sécurité → Validation en 2 étapes
- En bas de la page : "Mots de passe des applications"
- Sélectionner "Courrier" et générer un mot de passe
- **Copier ce mot de passe** (format: xxxx xxxx xxxx xxxx)

### 3. Variables d'environnement (.env)
Ajoutez dans votre fichier `.env` :

```env
# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx    # Mot de passe d'application (pas votre mot de passe Gmail)
FRONTEND_URL=http://localhost:3000

# Alternative SMTP (si Gmail ne fonctionne pas)
# EMAIL_SERVICE=smtp
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=votre-email@gmail.com
# EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

## 🚀 Test de l'envoi d'emails

### Démarrer le serveur
```bash
cd server
npm run dev
```

### Test avec Postman/Thunder Client
```
POST http://localhost:5000/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

## 📧 Flux complet de récupération

1. **Demande de récupération** (`/auth/forgot-password`)
   - L'utilisateur saisit son email
   - Le système génère un token unique
   - Envoie un email avec le lien de récupération
   - Rate limiting : 3 tentatives par IP/15min

2. **Réinitialisation** (`/auth/reset-password`)
   - L'utilisateur clique sur le lien reçu
   - Redirigé vers `/reset-password?token=...`
   - Saisit son nouveau mot de passe
   - Token valide pendant 24h

3. **Sécurité**
   - Tokens uniques et temporaires
   - Validation complète du mot de passe
   - Messages d'erreur non révélateurs
   - Logs détaillés pour débogage

## 🎯 Points clés

✅ **Autonomous** : Aucune intervention admin requise
✅ **Gratuit** : Gmail offre 500 emails/jour gratuitement  
✅ **Professionnel** : Templates HTML avec design cohérent
✅ **Sécurisé** : Rate limiting + tokens temporaires
✅ **User-friendly** : Interface intuitive avec validation temps réel

## 🚨 En cas de problème

### Gmail refuse la connexion
- Vérifiez l'authentification 2FA activée
- Utilisez le mot de passe d'application (pas votre mot de passe normal)
- Vérifiez que "Accès aux applications moins sécurisées" est DÉSACTIVÉ

### Emails non reçus
- Vérifiez les spams/courriers indésirables
- Testez avec un autre email
- Consultez les logs serveur : `console.log` dans emailService.js

### Erreurs de token
- Vérifiez que FRONTEND_URL est correct dans .env
- Token expire après 24h
- Un token ne peut être utilisé qu'une seule fois
