import React, { useState, useEffect, useRef } from 'react';
import { Trophy, TrendingUp, TrendingDown, Star, ChevronRight, X, Sparkles } from 'lucide-react';
import { getMonScore, getNiveau, CATEGORIES } from '../services/scoringService';

// =====================================================
// WIDGET SCORE EMPLOYÉ - Aperçu compact du score
// =====================================================

// Définition des niveaux pour comparaison
const NIVEAUX_CONFIG = [
  { min: -Infinity, max: 0, label: 'Novice', emoji: '🌱', color: 'from-gray-400 to-gray-500' },
  { min: 0, max: 50, label: 'Débutant', emoji: '⭐', color: 'from-green-400 to-emerald-500' },
  { min: 50, max: 150, label: 'Confirmé', emoji: '🌟', color: 'from-blue-400 to-indigo-500' },
  { min: 150, max: 300, label: 'Expert', emoji: '💫', color: 'from-purple-400 to-violet-500' },
  { min: 300, max: 500, label: 'Champion', emoji: '🏆', color: 'from-amber-400 to-orange-500' },
  { min: 500, max: Infinity, label: 'Légende', emoji: '👑', color: 'from-yellow-400 to-amber-500' }
];

const getNiveauIndex = (points) => {
  return NIVEAUX_CONFIG.findIndex(n => points >= n.min && points < n.max);
};

export default function ScoreWidget({ className = '', showDetails = false }) {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // États pour l'animation de transition de rang
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [oldNiveau, setOldNiveau] = useState(null);
  const [newNiveau, setNewNiveau] = useState(null);
  const [animationPhase, setAnimationPhase] = useState(0); // 0: none, 1: old fading, 2: transition, 3: new appearing
  const previousPointsRef = useRef(null);

  useEffect(() => {
    loadScore();
  }, []);

  // Détecter le changement de niveau
  useEffect(() => {
    if (score?.score) {
      const currentPoints = score.score.total_points || score.score.score_total || 0;
      const storedPoints = localStorage.getItem('lastScorePoints');
      
      if (storedPoints !== null) {
        const lastPoints = parseInt(storedPoints, 10);
        const oldIdx = getNiveauIndex(lastPoints);
        const newIdx = getNiveauIndex(currentPoints);
        
        // Si le niveau a changé (monté)
        if (newIdx > oldIdx && newIdx >= 0) {
          setOldNiveau(NIVEAUX_CONFIG[oldIdx]);
          setNewNiveau(NIVEAUX_CONFIG[newIdx]);
          triggerLevelUpAnimation();
        }
      }
      
      // Sauvegarder les points actuels
      localStorage.setItem('lastScorePoints', currentPoints.toString());
      previousPointsRef.current = currentPoints;
    }
  }, [score]);

  const triggerLevelUpAnimation = () => {
    setShowLevelUp(true);
    setAnimationPhase(1);
    
    // Phase 1: Ancien rang visible (0.5s)
    setTimeout(() => setAnimationPhase(2), 500);
    
    // Phase 2: Transition avec particules (1s)
    setTimeout(() => setAnimationPhase(3), 1500);
    
    // Phase 3: Nouveau rang apparaît (2s)
    setTimeout(() => {
      setAnimationPhase(4);
    }, 2500);
    
    // Fin de l'animation
    setTimeout(() => {
      setShowLevelUp(false);
      setAnimationPhase(0);
    }, 5000);
  };

  // Fonction pour tester l'animation (peut être appelée depuis la console ou un bouton dev)
  const testLevelUpAnimation = () => {
    const currentPoints = score?.score?.total_points || score?.score?.score_total || 0;
    const currentIdx = getNiveauIndex(currentPoints);
    const nextIdx = Math.min(currentIdx + 1, NIVEAUX_CONFIG.length - 1);
    
    setOldNiveau(NIVEAUX_CONFIG[Math.max(0, currentIdx)]);
    setNewNiveau(NIVEAUX_CONFIG[nextIdx]);
    triggerLevelUpAnimation();
  };

  // Exposer la fonction de test sur window pour debug
  useEffect(() => {
    window.testLevelUp = testLevelUpAnimation;
    return () => { delete window.testLevelUp; };
  }, [score]);

  const loadScore = async () => {
    try {
      const data = await getMonScore();
      setScore(data.data);
    } catch (err) {
      console.error('Erreur chargement score:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-4 animate-pulse ${className}`}>
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!score?.score) {
    return null; // Pas de score disponible
  }

  const niveau = getNiveau(score.score.total_points || score.score.score_total || 0);
  const totalPoints = score.score.total_points || score.score.score_total || 0;

  return (
    <>
      {/* Animation Level Up - Style Jeu Vidéo */}
      {showLevelUp && (
        <LevelUpAnimation 
          oldNiveau={oldNiveau}
          newNiveau={newNiveau}
          phase={animationPhase}
          onClose={() => {
            setShowLevelUp(false);
            setAnimationPhase(0);
          }}
        />
      )}

      {/* Widget compact */}
      <div 
        className={`bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100 p-4 cursor-pointer hover:shadow-md transition-shadow ${className}`}
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-4">
          {/* Icône niveau */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl">{niveau.emoji}</span>
          </div>

          {/* Info score */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">Mon Score</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${totalPoints < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {totalPoints}
              </span>
              <span className="text-sm text-amber-600">pts</span>
            </div>
            <p className="text-xs text-gray-500">{niveau.label}</p>
          </div>

          {/* Flèche */}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* Mini stats */}
        {showDetails && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-amber-100">
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-green-600">+{score.score.bonus_points || score.score.total_bonus || 0}</p>
              <p className="text-xs text-gray-500">Bonus</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-red-600">-{score.score.total_malus || 0}</p>
              <p className="text-xs text-gray-500">Malus</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-amber-600">#{score.score.rang || '-'}</p>
              <p className="text-xs text-gray-500">Rang</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal détail */}
      {showModal && (
        <ScoreDetailModal 
          score={score} 
          niveau={niveau}
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
}

// =====================================================
// ANIMATION LEVEL UP - Style Jeu Vidéo
// =====================================================

function LevelUpAnimation({ oldNiveau, newNiveau, phase, onClose }) {
  const [particles, setParticles] = useState([]);

  // Générer les particules pour l'effet d'explosion
  useEffect(() => {
    if (phase === 2) {
      const newParticles = [];
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 8 + 4,
          delay: Math.random() * 0.5,
          emoji: ['✨', '⭐', '💫', '🌟', '⚡'][Math.floor(Math.random() * 5)]
        });
      }
      setParticles(newParticles);
    }
  }, [phase]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={phase >= 4 ? onClose : undefined}
    >
      {/* Fond avec effet radial */}
      <div className="absolute inset-0 bg-gradient-radial from-amber-500/20 via-transparent to-transparent animate-pulse" />
      
      {/* Container principal */}
      <div className="relative w-80 h-96 flex flex-col items-center justify-center">
        
        {/* Particules d'explosion */}
        {phase >= 2 && particles.map(p => (
          <span
            key={p.id}
            className="absolute text-2xl animate-particle-explode"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.size * 3}px`,
              animationDelay: `${p.delay}s`
            }}
          >
            {p.emoji}
          </span>
        ))}

        {/* ANCIEN RANG - Phase 1 */}
        {phase >= 1 && phase < 3 && oldNiveau && (
          <div className={`absolute transition-all duration-700 ${
            phase === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50 blur-sm'
          }`}>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-2xl border-4 border-gray-500">
              <span className="text-6xl filter grayscale">{oldNiveau.emoji}</span>
            </div>
            <p className="text-center text-gray-400 mt-4 text-lg font-medium">{oldNiveau.label}</p>
          </div>
        )}

        {/* Effet de transition - Phase 2 */}
        {phase === 2 && (
          <div className="absolute">
            {/* Cercles d'énergie */}
            <div className="w-40 h-40 rounded-full border-4 border-amber-400 animate-ping opacity-75" />
            <div className="absolute inset-0 w-40 h-40 rounded-full border-4 border-yellow-300 animate-ping opacity-50" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-0 w-40 h-40 rounded-full border-4 border-orange-400 animate-ping opacity-25" style={{ animationDelay: '0.4s' }} />
            
            {/* Texte LEVEL UP */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 animate-bounce tracking-wider drop-shadow-lg"
                style={{ textShadow: '0 0 30px rgba(251, 191, 36, 0.8)' }}>
                LEVEL UP!
              </span>
            </div>
          </div>
        )}

        {/* NOUVEAU RANG - Phase 3+ */}
        {phase >= 3 && newNiveau && (
          <div className={`absolute flex flex-col items-center transition-all duration-1000 ${
            phase === 3 ? 'opacity-0 scale-150 blur-md' : 'opacity-100 scale-100 blur-0'
          }`}>
            {/* Glow effect */}
            <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 blur-xl opacity-50 animate-pulse" />
            
            {/* Badge principal */}
            <div className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${newNiveau.color} flex items-center justify-center shadow-2xl border-4 border-white/30 transform ${
              phase >= 4 ? 'animate-float' : ''
            }`}>
              <span className="text-7xl drop-shadow-lg">{newNiveau.emoji}</span>
              
              {/* Étoiles tournantes */}
              {phase >= 4 && (
                <>
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300 animate-spin" style={{ animationDuration: '3s' }} />
                  <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-amber-300 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
                </>
              )}
            </div>

            {/* Nouveau rang label */}
            <div className="mt-6 text-center">
              <p className="text-amber-400 text-sm font-medium tracking-widest uppercase mb-1">Nouveau Rang</p>
              <h2 className="text-3xl font-black text-white tracking-wide"
                style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.6)' }}>
                {newNiveau.label}
              </h2>
            </div>

            {/* Message de félicitations */}
            {phase >= 4 && (
              <div className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-400/30 backdrop-blur-sm animate-fade-in">
                <p className="text-amber-200 text-sm font-medium">
                  🎉 Félicitations ! Continuez comme ça !
                </p>
              </div>
            )}

            {/* Instruction pour fermer */}
            {phase >= 4 && (
              <p className="absolute -bottom-16 text-gray-400 text-xs animate-pulse">
                Touchez pour continuer
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bouton fermer */}
      {phase >= 4 && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}

// =====================================================
// MODAL DÉTAIL SCORE EMPLOYÉ
// =====================================================

function ScoreDetailModal({ score, niveau, onClose }) {
  const totalPoints = score?.score?.total_points || score?.score?.score_total || 0;

  // Calculer le progrès vers le niveau suivant
  const niveaux = [
    { min: 0, max: 50, label: 'Débutant' },
    { min: 50, max: 150, label: 'Confirmé' },
    { min: 150, max: 300, label: 'Expert' },
    { min: 300, max: 500, label: 'Champion' },
    { min: 500, max: Infinity, label: 'Légende' }
  ];
  
  const currentNiveauIdx = niveaux.findIndex(n => totalPoints >= n.min && totalPoints < n.max);
  const currentNiveau = niveaux[Math.max(0, currentNiveauIdx)];
  const nextNiveau = niveaux[Math.min(currentNiveauIdx + 1, niveaux.length - 1)];
  
  const progressPercent = currentNiveau.max === Infinity 
    ? 100 
    : Math.min(100, ((totalPoints - currentNiveau.min) / (currentNiveau.max - currentNiveau.min)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header avec dégradé */}
        <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/30 flex items-center justify-center mb-3">
              <span className="text-4xl">{niveau.emoji}</span>
            </div>
            <h2 className="text-xl font-bold">{niveau.label}</h2>
            <p className={`text-4xl font-bold mt-2 ${totalPoints < 0 ? 'text-red-200' : ''}`}>
              {totalPoints} pts
            </p>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Progression vers niveau suivant */}
          {nextNiveau && currentNiveau !== nextNiveau && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Prochain niveau: <strong>{nextNiveau.label}</strong></span>
                <span className="text-amber-600 font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {Math.max(0, nextNiveau.min - totalPoints)} pts restants
              </p>
            </div>
          )}

          {/* Stats détaillées */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">+{score?.score?.bonus_points || score?.score?.total_bonus || 0}</p>
              <p className="text-xs text-gray-500">Bonus</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">-{score?.score?.total_malus || 0}</p>
              <p className="text-xs text-gray-500">Malus</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">#{score?.score?.rang || '-'}</p>
              <p className="text-xs text-gray-500">Classement</p>
            </div>
          </div>

          {/* Derniers événements */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Historique récent
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {score?.historique?.slice(0, 5).map((point) => (
                <div key={point.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    point.points > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {point.points > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {point.reason || point.label || point.category || point.rule_code}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(point.created_at || point.date_evenement).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`font-bold ${point.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {point.points > 0 ? '+' : ''}{point.points}
                  </span>
                </div>
              ))}
              {(!score?.historique || score.historique.length === 0) && (
                <p className="text-center text-gray-400 py-4 text-sm">
                  Aucun point encore attribué
                </p>
              )}
            </div>
          </div>

          {/* Message motivant */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">
              {totalPoints < 50 && "🚀 Continuez vos efforts pour atteindre le niveau Confirmé !"}
              {totalPoints >= 50 && totalPoints < 150 && "⭐ Excellent travail ! Visez le niveau Expert !"}
              {totalPoints >= 150 && totalPoints < 300 && "🏆 Vous êtes sur la bonne voie vers le titre de Champion !"}
              {totalPoints >= 300 && totalPoints < 500 && "🔥 Performance exceptionnelle ! La Légende vous attend !"}
              {totalPoints >= 500 && "👑 Vous êtes une Légende ! Continuez à inspirer l'équipe !"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MINI BADGE SCORE (pour le header ou profil)
// =====================================================

export function ScoreBadge({ className = '' }) {
  const [score, setScore] = useState(null);

  useEffect(() => {
    const loadScore = async () => {
      try {
        const data = await getMonScore();
        setScore(data.data);
      } catch (err) {
        // Silencieux
      }
    };
    loadScore();
  }, []);

  if (!score?.score) return null;

  const niveau = getNiveau(score.score.total_points || score.score.score_total || 0);

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-full ${className}`}>
      <span className="text-sm">{niveau.emoji}</span>
      <span className="text-xs font-medium text-amber-700">
        {score.score.total_points || score.score.score_total || 0} pts
      </span>
    </div>
  );
}
