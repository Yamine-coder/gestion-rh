#!/bin/bash

# Test de création d'un shift de nuit via l'API

echo "🧪 Test création shift de nuit via API"
echo "========================================"
echo ""

# Données du shift de nuit (19:00 → 00:30)
SHIFT_DATA='{
  "employeId": 54,
  "date": "2025-11-30",
  "type": "présence",
  "segments": [
    {
      "start": "19:00",
      "end": "00:30",
      "commentaire": "Service dîner + fermeture",
      "isExtra": false,
      "aValider": false,
      "extraMontant": "",
      "paymentStatus": "à_payer",
      "paymentMethod": "",
      "paymentDate": "",
      "paymentNote": ""
    }
  ]
}'

echo "📤 Envoi de la requête..."
echo "URL: http://localhost:5000/shifts"
echo "Données: $SHIFT_DATA"
echo ""

# Envoi de la requête (vous devrez ajouter le token d'authentification)
curl -X POST http://localhost:5000/shifts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d "$SHIFT_DATA" \
  -v

echo ""
echo ""
echo "✅ Si vous voyez un code 200 ou 201, le shift de nuit a été créé !"
echo "❌ Si vous voyez un code 400 avec 'Heure début >= fin', il y a encore un problème"
