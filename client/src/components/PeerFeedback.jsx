import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ThumbsUp, Send, History, CheckCircle, XCircle, 
  Users, Zap, BookOpen, Smile, Lightbulb, RefreshCw,
  ChevronDown, X, Clock, Award, ChevronLeft, Search,
  Sparkles, Heart, Star, MessageSquare, Home, Gift,
  TrendingUp, ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import BottomNav from './BottomNav';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

const CATEGORIES = [
  { code: 'entraide', label: 'Entraide', points: 3, icon: Users, color: 'emerald', description: 'A aidé un collègue' },
  { code: 'rush', label: 'Efficace rush', points: 5, icon: Zap, color: 'amber', description: 'Excellent pendant le coup de feu' },
  { code: 'formation', label: 'Formation', points: 4, icon: BookOpen, color: 'blue', description: 'A formé ou guidé un collègue' },
  { code: 'attitude', label: 'Attitude', points: 3, icon: Heart, color: 'pink', description: 'Attitude positive et motivante' },
  { code: 'initiative', label: 'Initiative', points: 4, icon: Lightbulb, color: 'violet', description: 'A pris une initiative utile' },
  { code: 'polyvalence', label: 'Polyvalent', points: 4, icon: RefreshCw, color: 'cyan', description: 'A aidé sur un autre poste' },
];

// Couleurs Tailwind pour les catégories
const COLORS = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
};

export default function PeerFeedback() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [colleagues, setColleagues] = useState([]);
  const [selectedColleague, setSelectedColleague] = useState(null);
  const [category, setCategory] = useState('entraide');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedbacksEnvoyes, setFeedbacksEnvoyes] = useState([]);
  const [feedbacksRecus, setFeedbacksRecus] = useState([]);
  const [feedbacksRestants, setFeedbacksRestants] = useState(2);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showColleagueDropdown, setShowColleagueDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [colRes, envoyesRes, recusRes] = await Promise.all([
        fetch(`${API_URL}/scoring/peer-feedback/colleagues`, { headers }),
        fetch(`${API_URL}/scoring/peer-feedback/mes-envois`, { headers }),
        fetch(`${API_URL}/scoring/peer-feedback/mes-recus`, { headers })
      ]);

      if (!colRes.ok) throw new Error('Erreur chargement collègues');
      
      const [colData, envoyesData, recusData] = await Promise.all([
        colRes.json(),
        envoyesRes.json(),
        recusRes.json()
      ]);

      setColleagues(colData || []);
      setFeedbacksEnvoyes(envoyesData.data || []);
      setFeedbacksRestants(envoyesData.feedbacksRestants ?? 2);
      setFeedbacksRecus(recusData.data || []);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleSubmit = () => {
    if (!selectedColleague || message.trim().length < 10) {
      setError('Veuillez sélectionner un collègue et écrire un message (min. 10 caractères)');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/scoring/peer-feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          toEmployeeId: selectedColleague.id,
          message: message.trim(),
          category
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      setSuccess(`Feedback envoyé à ${selectedColleague.prenom} !`);
      setSelectedColleague(null);
      setMessage('');
      setCategory('entraide');
      loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Validé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Rejeté
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days}j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const selectedCat = CATEGORIES.find(c => c.code === category);
  const filteredColleagues = colleagues.filter(c => 
    `${c.prenom} ${c.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading skeleton
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-14 pb-24">
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Points cumulés via feedbacks reçus validés
  const pointsGagnes = feedbacksRecus.reduce((acc, fb) => acc + (fb.status === 'approved' ? fb.points_proposed : 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-header pb-24">
      {/* Header sobre style MesConges */}
      <div className="px-3 py-3">
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Feedback</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {feedbacksRestants > 0 ? `${feedbacksRestants} crédit${feedbacksRestants > 1 ? 's' : ''} restant${feedbacksRestants > 1 ? 's' : ''}` : 'Limite atteinte'}
              </p>
            </div>
          </div>
          
          {/* Badge points */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <ThumbsUp className="w-4 h-4 text-primary-500 dark:text-primary-400" />
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{pointsGagnes}</span>
          </div>
        </div>
      </div>

      {/* Tabs minimalistes */}
      <div className="sticky top-[calc(60px+env(safe-area-inset-top,0px))] z-30 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-lg px-4 pb-3">
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          {[
            { id: 0, label: 'Envoyer', icon: Send },
            { id: 1, label: 'Envoyés', icon: History, count: feedbacksEnvoyes.length },
            { id: 2, label: 'Reçus', icon: Award, count: feedbacksRecus.length }
          ].map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-primary-500 text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast messages */}
      {(error || success) && (
        <div className="px-4 pt-3">
          <div 
            className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium animate-[slideIn_0.2s_ease-out] ${
              success 
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{success || error}</span>
            <button 
              onClick={() => { setError(''); setSuccess(''); }} 
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Tab 0: Envoyer */}
        {tab === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {feedbacksRestants === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-semibold">Limite atteinte</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Revenez la semaine prochaine !
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Sélection collègue */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Choisir un collègue
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowColleagueDropdown(!showColleagueDropdown)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-left flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-700/50 transition-colors"
                    >
                      {selectedColleague ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm">
                            {selectedColleague.prenom?.[0]}
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {selectedColleague.prenom} {selectedColleague.nom}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">Sélectionner un collègue...</span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showColleagueDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showColleagueDropdown && (
                      <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-hidden animate-[scaleIn_0.15s_ease-out]">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Rechercher..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredColleagues.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">Aucun collègue trouvé</div>
                          ) : (
                            filteredColleagues.map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedColleague(c);
                                  setShowColleagueDropdown(false);
                                  setSearchTerm('');
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                              >
                                <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm">
                                  {c.prenom?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{c.prenom} {c.nom}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.categorie || 'Équipe'}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Catégorie - Grid compact */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Type de reconnaissance
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.code;
                      return (
                        <button
                          key={cat.code}
                          onClick={() => setCategory(cat.code)}
                          className={`p-2.5 sm:p-3 rounded-xl border-2 text-center transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-lg flex items-center justify-center ${COLORS[cat.color]}`}>
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <p className="mt-1.5 text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">
                            {cat.label}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            +{cat.points}pts
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description catégorie */}
                {selectedCat && (
                  <div className={`p-3 rounded-xl border ${COLORS[selectedCat.color]}`}>
                    <div className="flex items-center gap-2">
                      {React.createElement(selectedCat.icon, { className: 'w-4 h-4' })}
                      <span className="text-sm font-medium">{selectedCat.label}</span>
                    </div>
                    <p className="mt-1 text-xs opacity-80">{selectedCat.description}</p>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Décrivez la situation
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Sophie m'a aidé pendant le rush du samedi..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl resize-none text-sm bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${
                      message.length > 0 && message.length < 10 
                        ? 'border-red-300 dark:border-red-700' 
                        : 'border-slate-200 dark:border-slate-600'
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className={`text-[10px] sm:text-xs ${message.length >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {message.length >= 10 ? (
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Minimum atteint</span>
                      ) : (
                        `${message.length}/10 caractères min.`
                      )}
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={loading || !selectedColleague || message.length < 10}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-primary-700 hover:to-primary-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-600 dark:disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20 disabled:shadow-none active:scale-[0.98]"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Envoyer le feedback
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Envoyés */}
        {tab === 1 && (
          <div className="space-y-3">
            {feedbacksEnvoyes.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <History className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-semibold">Aucun feedback envoyé</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Commencez à reconnaître vos collègues !
                </p>
              </div>
            ) : (
              feedbacksEnvoyes.map(fb => {
                const cat = CATEGORIES.find(c => c.code === fb.category);
                const Icon = cat?.icon || ThumbsUp;
                return (
                  <div key={fb.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                          {fb.to_prenom?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {fb.to_prenom} {fb.to_nom}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${cat ? COLORS[cat.color] : ''}`}>
                              <Icon className="w-3 h-3" />
                              {cat?.label}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              +{fb.points_proposed}pts
                            </span>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(fb.status)}
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 leading-relaxed">
                      {fb.message}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                      {formatDate(fb.created_at)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Reçus */}
        {tab === 2 && (
          <div className="space-y-3">
            {feedbacksRecus.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                  <Award className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-semibold">Aucun feedback reçu</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Vos reconnaissances apparaîtront ici
                </p>
              </div>
            ) : (
              feedbacksRecus.map(fb => {
                const cat = CATEGORIES.find(c => c.code === fb.category);
                const Icon = cat?.icon || ThumbsUp;
                return (
                  <div 
                    key={fb.id} 
                    className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat ? COLORS[cat.color] : 'bg-emerald-100 text-emerald-600'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            De <span className="font-semibold text-slate-700 dark:text-slate-200">{fb.from_prenom}</span>
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                            +{fb.points_proposed}pts
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${cat ? COLORS[cat.color] : ''}`}>
                          <Icon className="w-3 h-3" />
                          {cat?.label}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-700/50 rounded-xl p-3 leading-relaxed italic">
                      "{fb.message}"
                    </p>
                    <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                      {formatDate(fb.created_at)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmation - Bottom sheet mobile */}
      {showConfirm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setShowConfirm(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl animate-[slideUp_0.25s_ease-out] sm:animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Confirmer l'envoi
                </h3>
              </div>
              <button 
                onClick={() => setShowConfirm(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Recipient + Category */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                  {selectedColleague?.prenom?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {selectedColleague?.prenom} {selectedColleague?.nom}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${selectedCat ? COLORS[selectedCat.color] : ''}`}>
                      {selectedCat && React.createElement(selectedCat.icon, { className: 'w-3 h-3' })}
                      {selectedCat?.label}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      +{selectedCat?.points}pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Message preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                  "{message}"
                </p>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Ce feedback sera soumis à validation par un manager avant d'être comptabilisé.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 sm:p-5 pt-0 sm:pt-0">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 sm:py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl transition-all text-sm font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-primary-500/20 active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <BottomNav />
    </div>
  );
}
