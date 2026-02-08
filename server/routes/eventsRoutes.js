/**
 * 📅 Routes Événements
 * Matchs de foot + Événements locaux Vincennes
 * (Séparé de météo/affluence)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// ══════════════════════════════════════════════════════════════════
// ⚽ MATCHS DE FOOT (PSG, équipe de France)
// ══════════════════════════════════════════════════════════════════

router.get('/matches', async (req, res) => {
  try {
    // Récupérer les matchs depuis l'API Football-Data.org (gratuite)
    const API_KEY = process.env.FOOTBALL_API_KEY;
    
    if (!API_KEY) {
      // Retourner des données statiques si pas de clé API
      return res.json({
        matches: getStaticMatches(),
        source: 'static'
      });
    }

    // PSG (id: 524) et Équipe de France (id: 773)
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = nextMonth.toISOString().split('T')[0];

    const [psgRes, franceRes] = await Promise.all([
      axios.get(`https://api.football-data.org/v4/teams/524/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
        headers: { 'X-Auth-Token': API_KEY }
      }).catch(() => null),
      axios.get(`https://api.football-data.org/v4/teams/773/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
        headers: { 'X-Auth-Token': API_KEY }
      }).catch(() => null)
    ]);

    const matches = [];
    
    if (psgRes?.data?.matches) {
      psgRes.data.matches.forEach(m => {
        matches.push({
          id: m.id,
          competition: m.competition?.name || 'Ligue 1',
          homeTeam: m.homeTeam?.shortName || m.homeTeam?.name,
          awayTeam: m.awayTeam?.shortName || m.awayTeam?.name,
          date: m.utcDate,
          venue: m.venue,
          isPSG: true,
          impactEstime: m.competition?.name?.includes('Champions') ? 'fort' : 'moyen'
        });
      });
    }

    if (franceRes?.data?.matches) {
      franceRes.data.matches.forEach(m => {
        matches.push({
          id: m.id,
          competition: m.competition?.name || 'Équipe de France',
          homeTeam: m.homeTeam?.shortName || m.homeTeam?.name,
          awayTeam: m.awayTeam?.shortName || m.awayTeam?.name,
          date: m.utcDate,
          venue: m.venue,
          isFrance: true,
          impactEstime: 'fort'
        });
      });
    }

    // Trier par date
    matches.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ matches, source: 'api' });
  } catch (err) {
    console.error('Erreur matchs:', err.message);
    res.json({ matches: getStaticMatches(), source: 'static' });
  }
});

// Matchs statiques si pas d'API
function getStaticMatches() {
  const today = new Date();
  const matches = [];
  
  // Générer quelques matchs fictifs pour les prochaines semaines
  const teams = ['PSG', 'Lyon', 'Marseille', 'Monaco', 'Lille'];
  const competitions = ['Ligue 1', 'Coupe de France', 'Champions League'];
  
  for (let i = 0; i < 5; i++) {
    const matchDate = new Date(today);
    matchDate.setDate(matchDate.getDate() + (i * 4) + Math.floor(Math.random() * 3));
    
    // Samedi ou Dimanche de préférence
    if (matchDate.getDay() === 0) matchDate.setDate(matchDate.getDate() + 6);
    else if (matchDate.getDay() < 5) matchDate.setDate(matchDate.getDate() + (6 - matchDate.getDay()));
    
    matches.push({
      id: `static-${i}`,
      competition: competitions[i % 3],
      homeTeam: i % 2 === 0 ? 'PSG' : teams[i % 5],
      awayTeam: i % 2 === 0 ? teams[(i + 1) % 5] : 'PSG',
      date: matchDate.toISOString(),
      isPSG: true,
      impactEstime: competitions[i % 3] === 'Champions League' ? 'fort' : 'moyen'
    });
  }
  
  return matches;
}

// ══════════════════════════════════════════════════════════════════
// 🎉 ÉVÉNEMENTS VINCENNES (depuis Gist GitHub)
// ══════════════════════════════════════════════════════════════════

router.get('/evenements-vincennes', async (req, res) => {
  try {
    const GIST_ID = process.env.EVENTS_GIST_ID;
    
    if (GIST_ID) {
      // Récupérer depuis le Gist GitHub (mis à jour par le workflow)
      const gistUrl = `https://gist.githubusercontent.com/raw/${GIST_ID}/evenements-vincennes.json`;
      const response = await axios.get(gistUrl, { timeout: 5000 });
      
      if (response.data?.events) {
        return res.json({
          events: response.data.events,
          lastUpdate: response.data.lastUpdate,
          source: 'gist'
        });
      }
    }

    // Fallback: données locales
    const fs = require('fs');
    const path = require('path');
    const localPath = path.join(__dirname, '../../scripts/evenements-vincennes.json');
    
    if (fs.existsSync(localPath)) {
      const localData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      return res.json({
        events: localData.events || [],
        source: 'local'
      });
    }

    // Pas de données
    res.json({ events: [], source: 'none' });
  } catch (err) {
    console.error('Erreur événements Vincennes:', err.message);
    res.json({ events: [], source: 'error' });
  }
});

module.exports = router;
