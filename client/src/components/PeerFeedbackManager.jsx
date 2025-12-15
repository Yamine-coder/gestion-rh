import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, XCircle, TrendingUp, RefreshCw, X, Clock, 
  Award, Users, MessageSquare, ArrowRight, Send
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

const CATEGORIES = {
  entraide: { label: 'Entraide', color: 'text-emerald-600 bg-emerald-50' },
  rush: { label: 'Rush', color: 'text-amber-600 bg-amber-50' },
  formation: { label: 'Formation', color: 'text-blue-600 bg-blue-50' },
  attitude: { label: 'Attitude', color: 'text-pink-600 bg-pink-50' },
  initiative: { label: 'Initiative', color: 'text-violet-600 bg-violet-50' },
  polyvalence: { label: 'Polyvalence', color: 'text-cyan-600 bg-cyan-50' },
};

export default function PeerFeedbackManager() {
  const [tab, setTab] = useState(0);
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, this_week: 0 });
  const [topReceivers, setTopReceivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustedPoints, setAdjustedPoints] = useState(3);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pendingRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/scoring/peer-feedback/pending`, { headers }),
        fetch(`${API_URL}/scoring/peer-feedback/stats`, { headers })
      ]);

      const pendingData = await pendingRes.json();
      const statsData = await statsRes.json();

      setPendingFeedbacks(pendingData.data || []);
      setStats(statsData.data || {});
      setTopReceivers(statsData.data?.topReceivers || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss messages
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const openValidationDialog = (feedback) => {
    setSelectedFeedback(feedback);
    setAdjustedPoints(feedback.points_proposed);
    setRejectionReason('');
    setDialogOpen(true);
  };

  const handleValidation = async (approved) => {
    if (!selectedFeedback) return;
    setProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/scoring/peer-feedback/${selectedFeedback.id}/validate`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          approved,
          pointsAdjusted: adjustedPoints,
          rejectionReason: rejectionReason || 'Non approuvé par le manager'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      setMessage({ 
        type: 'success', 
        text: approved 
          ? `+${adjustedPoints} pts attribués à ${selectedFeedback.to_prenom}`
          : 'Feedback rejeté'
      });
      setDialogOpen(false);
      setSelectedFeedback(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la validation' });
    } finally {
      setProcessing(false);
    }
  };

  const quickApprove = async (fb) => {
    setProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/scoring/peer-feedback/${fb.id}/validate`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ approved: true, pointsAdjusted: fb.points_proposed })
      });

      if (!res.ok) throw new Error('Erreur');

      setMessage({ type: 'success', text: `+${fb.points_proposed} pts pour ${fb.to_prenom}` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la validation' });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `il y a ${minutes}min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days < 7) return `il y a ${days}j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-lg w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
        <div className="h-40 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header minimaliste */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Feedbacks entre collègues</h2>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Toast */}
      {message.text && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="p-0.5 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats en ligne */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500">En attente</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.pending || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Approuvés</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.approved || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">Rejetés</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.rejected || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Cette sem.</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.this_week || 0}</p>
        </div>
      </div>

      {/* Onglets minimalistes */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab(0)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 0 
              ? 'border-[#cf292c] text-[#cf292c]' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          À valider {stats.pending > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">{stats.pending}</span>}
        </button>
        <button
          onClick={() => setTab(1)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 1 
              ? 'border-[#cf292c] text-[#cf292c]' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Classement
        </button>
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tab À valider */}
        {tab === 0 && (
          <>
            {pendingFeedbacks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-10 h-10 mx-auto text-green-400 mb-3" />
                <p className="text-gray-600 font-medium">Tout est traité</p>
                <p className="text-sm text-gray-400 mt-1">Aucun feedback en attente</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingFeedbacks.map(fb => {
                  const cat = CATEGORIES[fb.category] || CATEGORIES.entraide;
                  
                  return (
                    <div key={fb.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Expéditeur → Destinataire */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-700">{fb.from_prenom}</span>
                            <ArrowRight className="w-3 h-3 text-gray-300" />
                            <span className="font-semibold text-gray-900">{fb.to_prenom}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${cat.color}`}>
                              {cat.label}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(fb.created_at)}</span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5">
                            "{fb.message}"
                          </p>
                        </div>

                        {/* Points proposés */}
                        <div className="text-center">
                          <span className="px-2 py-1 bg-green-50 text-green-700 text-sm font-semibold rounded-lg">
                            +{fb.points_proposed}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => openValidationDialog(fb)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => quickApprove(fb)}
                            disabled={processing}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFeedback(fb);
                              setRejectionReason('');
                              setDialogOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab Classement */}
        {tab === 1 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">Les plus reconnus</span>
            </div>
            
            {topReceivers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Pas encore de données</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topReceivers.map((emp, idx) => (
                  <div 
                    key={emp.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      idx === 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-400 text-white' :
                      idx === 1 ? 'bg-gray-400 text-white' :
                      idx === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                      {emp.prenom?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{emp.prenom} {emp.nom}</p>
                      <p className="text-xs text-gray-500">{emp.nb_feedbacks} feedback{emp.nb_feedbacks > 1 ? 's' : ''}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">
                      +{emp.total_points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de validation - Minimaliste */}
      {dialogOpen && selectedFeedback && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setDialogOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Valider le feedback</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info transfert */}
              <div className="flex items-center justify-center gap-3 py-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600">
                    {selectedFeedback.from_prenom?.[0]}
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{selectedFeedback.from_prenom}</p>
                </div>
                <Send className="w-4 h-4 text-[#cf292c]" />
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#cf292c]/10 flex items-center justify-center font-semibold text-[#cf292c]">
                    {selectedFeedback.to_prenom?.[0]}
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{selectedFeedback.to_prenom}</p>
                </div>
              </div>

              {/* Message */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">"{selectedFeedback.message}"</p>
              </div>

              {/* Points */}
              <div>
                <label className="flex items-center justify-between text-sm text-gray-700 mb-2">
                  <span>Points à attribuer</span>
                  <span className="px-2 py-0.5 bg-[#cf292c]/10 text-[#cf292c] font-semibold rounded">{adjustedPoints} pts</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={adjustedPoints}
                  onChange={(e) => setAdjustedPoints(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#cf292c]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span>
                  <span>Proposé: {selectedFeedback.points_proposed}</span>
                  <span>10</span>
                </div>
              </div>

              {/* Raison rejet */}
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Raison du rejet <span className="text-gray-400">(optionnel)</span></label>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Si rejeté, expliquez pourquoi..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-[#cf292c] resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setDialogOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => handleValidation(false)}
                disabled={processing}
                className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Rejeter
              </button>
              <button
                onClick={() => handleValidation(true)}
                disabled={processing}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                +{adjustedPoints} pts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
