# 📧 Configuration Email Professionnel

## Configuration Gmail

### 1. Activer l'authentification à deux facteurs
- Allez dans votre compte Google
- Sécurité > Authentification à 2 facteurs
- Activez-la si ce n'est pas fait

### 2. Générer un mot de passe d'application
- Dans Sécurité > Authentification à 2 facteurs
- Cliquez sur "Mots de passe d'application"
- Sélectionnez "Autre (nom personnalisé)"
- Tapez "Gestion RH"
- Copiez le mot de passe généré (16 caractères)

### 3. Configurer le fichier .env
```bash
EMAIL_USER="votre-email@gmail.com"
EMAIL_PASS="le-mot-de-passe-application-16-caracteres"
FRONTEND_URL="http://localhost:3000"
```

## Configuration autres services

### Outlook/Hotmail
```javascript
service: 'outlook'
```

### Yahoo
```javascript
service: 'yahoo'
```

### Serveur SMTP personnalisé
```javascript
host: 'smtp.votre-serveur.com'
port: 587
secure: false
```

## Test de l'email

Pour tester l'envoi d'email, créez un nouvel employé. Vous devriez voir dans les logs du serveur :
- `✅ Email envoyé avec succès à email@example.com` si ça marche
- `❌ Erreur envoi email:` suivi du message d'erreur si ça ne marche pas

## Dépannage

### "Authentication failed"
- Vérifiez que l'authentification à 2 facteurs est activée
- Vérifiez le mot de passe d'application

### "Connection timeout"
- Vérifiez votre connexion internet
- Essayez un autre service email

### "Invalid recipients"
- Vérifiez que l'email de l'employé est valide
