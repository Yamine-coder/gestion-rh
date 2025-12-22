import populartimes
import json

# Place ID de Chez Antoine Vincennes
PLACE_ID = "ChIJnYLnmZly5kcRgpLV4MN4Rus"

# Clé API Google (nécessaire pour populartimes)
# Tu peux en créer une gratuite sur https://console.cloud.google.com/
# Activer "Places API"
API_KEY = "YOUR_GOOGLE_API_KEY"

print("🔍 Récupération des Popular Times pour Chez Antoine Vincennes...")
print(f"📍 Place ID: {PLACE_ID}")
print()

try:
    # Récupérer les données
    data = populartimes.get_id(API_KEY, PLACE_ID)
    
    if data and 'populartimes' in data:
        print("✅ Données récupérées avec succès !\n")
        
        jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        
        popular_times_data = {}
        
        for i, day_data in enumerate(data['populartimes']):
            jour = jours[i]
            heures = day_data['data']  # Liste de 24 valeurs (0-100%)
            popular_times_data[jour.lower()] = heures
            
            print(f"📅 {jour}:")
            # Afficher les heures avec affluence > 0
            for h, val in enumerate(heures):
                if val > 0:
                    bar = "█" * (val // 10) + "░" * (10 - val // 10)
                    print(f"   {h:02d}h: {bar} {val}%")
            print()
        
        # Exporter en JSON pour intégration
        print("\n📋 Données JSON pour intégration:")
        print("=" * 50)
        print(json.dumps(popular_times_data, indent=2, ensure_ascii=False))
        print("=" * 50)
        
        # Sauvegarder dans un fichier
        with open('popular-times-data.json', 'w', encoding='utf-8') as f:
            json.dump(popular_times_data, f, indent=2, ensure_ascii=False)
        print("\n💾 Données sauvegardées dans popular-times-data.json")
        
    else:
        print("⚠️ Pas de données Popular Times disponibles pour cet établissement")
        print("Cela peut arriver si:")
        print("  - L'établissement n'a pas assez de visites")
        print("  - Google n'a pas encore collecté de données")
        
except Exception as e:
    print(f"❌ Erreur: {e}")
    print("\n💡 Solutions:")
    print("1. Vérifie que tu as une clé API Google valide")
    print("2. Active 'Places API' dans Google Cloud Console")
    print("3. Le quota gratuit est de 1000 requêtes/jour")
