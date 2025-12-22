#!/usr/bin/env python3
"""
📊 Scraper Popular Times - Version Python (plus robuste)
Utilise la bibliothèque populartimes qui fait le travail correctement
"""

import json
import os
from datetime import datetime

try:
    import populartimes
except ImportError:
    print("Installation de populartimes...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'populartimes'])
    import populartimes

# Configuration
PLACE_ID = os.environ.get('PLACE_ID', 'ChIJnYLnmZly5kcRgpLV4MN4Rus')
# Clé API Google Places (gratuit jusqu'à un certain quota)
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')

def get_affluence():
    """Récupère les données d'affluence via l'API populartimes"""
    
    print(f"🕵️ Récupération données affluence...")
    print(f"📍 Place ID: {PLACE_ID}")
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "placeId": PLACE_ID,
        "placeName": None,
        "liveStatus": None,
        "livePercentage": None,
        "popularTimes": None,
        "score": None,
        "message": "⚪ Données non disponibles"
    }
    
    try:
        if GOOGLE_API_KEY:
            # Méthode 1: Avec API Key (plus fiable)
            result = populartimes.get_id(GOOGLE_API_KEY, PLACE_ID)
        else:
            # Méthode 2: Sans API Key (scraping direct)
            print("⚠️ Pas de GOOGLE_API_KEY, utilisation du scraping direct...")
            # Fallback: utiliser les coordonnées
            results = populartimes.get(
                GOOGLE_API_KEY if GOOGLE_API_KEY else "dummy",
                ["restaurant"],
                (48.8463257, 2.4290377),  # Coordonnées Chez Antoine
                (48.8463257, 2.4290377),
                all_places=False
            )
            result = results[0] if results else None
        
        if result:
            print(f"✅ Données trouvées!")
            print(f"📍 Nom: {result.get('name', 'inconnu')}")
            
            data["placeName"] = result.get("name")
            data["address"] = result.get("address")
            
            # Popular times par jour
            if "populartimes" in result:
                data["popularTimes"] = result["populartimes"]
                print(f"📊 Popular times disponibles pour {len(result['populartimes'])} jours")
            
            # Current popularity (temps réel)
            if "current_popularity" in result:
                current = result["current_popularity"]
                data["livePercentage"] = current
                data["score"] = current
                
                if current >= 70:
                    data["liveStatus"] = "very_busy"
                    data["message"] = "🔴 Très fréquenté"
                elif current >= 40:
                    data["liveStatus"] = "fairly_busy"
                    data["message"] = "🟠 Assez fréquenté"
                else:
                    data["liveStatus"] = "not_busy"
                    data["message"] = "🟢 Peu fréquenté"
                
                print(f"🔴 Affluence actuelle: {current}%")
                print(f"📊 Status: {data['message']}")
            else:
                print("⚠️ Pas de données temps réel disponibles")
                
    except Exception as e:
        print(f"❌ Erreur: {e}")
        data["error"] = str(e)
    
    # Sauvegarder
    data["scrapedAt"] = datetime.now().isoformat()
    
    with open("affluence-data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Données sauvegardées: affluence-data.json")
    print(f"✅ Terminé")
    
    return data

if __name__ == "__main__":
    get_affluence()
