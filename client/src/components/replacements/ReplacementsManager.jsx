import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Check, 
  X, 
  RefreshCw, 
  Eye, 
  Users, 
  Calendar,
  User,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Timer,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Vue principale de gestion des remplacements
function ReplacementsManager({ embedded = false, onRefresh }) {
  const token = localStorage.getItem('token');
  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Stats rapides calculées à partir des vraies données
  const now = new Date();
  const stats = {
    enAttente: replacements.filter(r => r.statut === 'en_attente').length,
    avecCandidatures: replacements.filter(r => r.statut === 'en_attente' && r.candidatures?.length > 0).length,
    urgent: replacements.filter(r => {
      if (r.statut !== 'en_attente' || !r.shift?.date) return false;
      const shiftDate = new Date(r.shift.date);
      const diffH = (shiftDate - now) / 3600000;
      return diffH <= 24 && diffH > 0;
    }).length,
    valides: replacements.filter(r => r.statut === 'acceptee').length
  };

  const fetchReplacements = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Toujours charger TOUTES les demandes pour la vue Kanban
      const response = await axios.get(`${API_BASE}/api/remplacements/admin/toutes`, {
        headers: { Authorization: `Bearer ${token}` }
        // Ne pas filtrer côté serveur - on filtre côté client pour la vue Kanban
      });
      setReplacements(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Erreur chargement remplacements:', e);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des demandes' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchReplacements(); }, [fetchReplacements]);

  // Calculer l'urgence d'une demande
  const getUrgency = (demande) => {
    if (!demande.shift?.date) return 'planifié';
    const shiftDate = new Date(demande.shift.date);
    const diffH = (shiftDate - now) / 3600000;
    if (diffH < 0) return 'passé';
    if (diffH <= 6) return 'urgent';
    if (diffH <= 24) return 'bientôt';
    return 'planifié';
  };

  // Grouper les demandes pour la vue Kanban
  const groupedReplacements = {
    enAttente: replacements.filter(r => r.statut === 'en_attente' && (!r.candidatures || r.candidatures.length === 0)),
    avecCandidatures: replacements.filter(r => r.statut === 'en_attente' && r.candidatures?.length > 0),
    acceptees: replacements.filter(r => r.statut === 'acceptee'),
    refusees: replacements.filter(r => r.statut === 'refusee' || r.statut === 'annulee' || r.statut === 'expiree').slice(0, 5)
  };

  // Valider un remplacement (assigner un candidat)
  const handleValider = async (demandeId, candidatureId, commentaire = '') => {
    try {
      setActionLoading(true);
      await axios.post(`${API_BASE}/api/remplacements/admin/${demandeId}/valider`, 
        { candidatureId, commentaire },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'Remplacement validé avec succès ! Un shift a été créé pour le remplaçant.' });
      setShowModal(false);
      setSelectedDemande(null);
      fetchReplacements();
    } catch (e) {
      console.error('Erreur validation:', e);
      setMessage({ type: 'error', text: e.response?.data?.error || 'Erreur lors de la validation' });
    } finally {
      setActionLoading(false);
    }
  };

  // Refuser une demande
  const handleRefuser = async (demandeId, commentaire = '') => {
    try {
      setActionLoading(true);
      await axios.post(`${API_BASE}/api/remplacements/admin/${demandeId}/refuser`,
        { commentaire },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'Demande de remplacement refusée.' });
      setShowModal(false);
      setSelectedDemande(null);
      fetchReplacements();
    } catch (e) {
      console.error('Erreur refus:', e);
      setMessage({ type: 'error', text: e.response?.data?.error || 'Erreur lors du refus' });
    } finally {
      setActionLoading(false);
    }
  };

  // Ouvrir le détail d'une demande
  const openDemandeDetail = (demande) => {
    setSelectedDemande(demande);
    setShowModal(true);
  };

  if (loading) return (
    <div className='p-8 flex items-center justify-center'>
      <div className='flex flex-col items-center gap-3'>
        <div className='animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#cf292c]'></div>
        <span className='text-sm text-gray-500'>Chargement...</span>
      </div>
    </div>
  );

  return (
    <div className={`${embedded ? 'bg-gray-50/50' : 'bg-gray-50 min-h-screen p-4 lg:p-6'}`}>
      {/* Header - masqué si embedded */}
      {!embedded && (
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-[#cf292c]/10 flex items-center justify-center'>
              <Users className='w-5 h-5 text-[#cf292c]' />
            </div>
            <h1 className='text-xl font-semibold text-gray-800'>Gestion des Remplacements</h1>
          </div>
          
          <button 
            onClick={fetchReplacements}
            className='flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-white hover:border-gray-300 transition-all'
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      )}

      {/* Message feedback */}
      {message.text && (
        <div className={`mx-4 mt-4 p-3 rounded-xl text-sm flex items-center justify-between ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className='flex items-center gap-2'>
            {message.type === 'success' ? <CheckCircle2 className='w-4 h-4' /> : <XCircle className='w-4 h-4' />}
            {message.text}
          </div>
          <button onClick={() => setMessage({ type: '', text: '' })} className='p-1 hover:bg-white/50 rounded'>
            <X className='w-4 h-4' />
          </button>
        </div>
      )}

      {/* Stats rapides - Design épuré */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 p-4'>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-gray-900'>{stats.enAttente}</div>
              <div className='text-xs text-gray-500 mt-0.5'>En attente</div>
            </div>
            <div className='w-10 h-10 rounded-lg bg-[#cf292c]/10 flex items-center justify-center'>
              <Clock className='w-5 h-5 text-[#cf292c]' />
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-gray-900'>{stats.avecCandidatures}</div>
              <div className='text-xs text-gray-500 mt-0.5'>Avec candidats</div>
            </div>
            <div className='w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center'>
              <Users className='w-5 h-5 text-blue-500' />
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-[#cf292c]'>{stats.urgent}</div>
              <div className='text-xs text-gray-500 mt-0.5'>Urgent</div>
            </div>
            <div className='w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center'>
              <AlertTriangle className='w-5 h-5 text-[#cf292c]' />
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold text-emerald-600'>{stats.valides}</div>
              <div className='text-xs text-gray-500 mt-0.5'>Validés</div>
            </div>
            <div className='w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center'>
              <CheckCircle2 className='w-5 h-5 text-emerald-500' />
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'action rapide */}
      <div className='px-4 pb-4'>
        <div className='bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between'>
          <div className='text-sm text-gray-600'>
            <span className='font-medium'>{replacements.length}</span> demande{replacements.length > 1 ? 's' : ''} au total
          </div>
          <button 
            onClick={fetchReplacements}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-[#cf292c] hover:bg-red-50 rounded-lg transition-all'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Vue Kanban - Design épuré */}
      <div className='px-4 pb-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
          {/* En attente (sans candidatures) */}
          <KanbanColumn 
            title="En attente" 
            count={groupedReplacements.enAttente.length}
            color="amber"
            icon={<Clock className='w-4 h-4' />}
            items={groupedReplacements.enAttente}
            getUrgency={getUrgency}
            onOpenDetail={openDemandeDetail}
          />
          
          {/* Avec candidatures */}
          <KanbanColumn 
            title="Candidatures" 
            count={groupedReplacements.avecCandidatures.length}
            color="blue"
            icon={<Users className='w-4 h-4' />}
            items={groupedReplacements.avecCandidatures}
            getUrgency={getUrgency}
            onOpenDetail={openDemandeDetail}
          />
          
          {/* Acceptés */}
          <KanbanColumn 
            title="Validés" 
            count={groupedReplacements.acceptees.length}
            color="emerald"
            icon={<CheckCircle2 className='w-4 h-4' />}
            items={groupedReplacements.acceptees}
            getUrgency={getUrgency}
            onOpenDetail={openDemandeDetail}
          />
          
          {/* Refusés/Annulés */}
          <KanbanColumn 
            title="Clos" 
            count={groupedReplacements.refusees.length}
            color="gray"
            icon={<XCircle className='w-4 h-4' />}
            items={groupedReplacements.refusees}
            getUrgency={getUrgency}
            onOpenDetail={openDemandeDetail}
          />
        </div>
      </div>

      {/* Modal détail */}
      {showModal && selectedDemande && (
        <DemandeDetailModal
          demande={selectedDemande}
          onClose={() => { setShowModal(false); setSelectedDemande(null); }}
          onValider={handleValider}
          onRefuser={handleRefuser}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// Colonne Kanban - Design moderne
const KanbanColumn = ({ title, count, color, icon, items, getUrgency, onOpenDetail }) => {
  const colorConfig = {
    amber: { bg: 'bg-[#cf292c]/5', border: 'border-[#cf292c]/20', badge: 'bg-[#cf292c]/10 text-[#cf292c]', iconBg: 'bg-[#cf292c]/10 text-[#cf292c]' },
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700', iconBg: 'bg-blue-100 text-blue-600' },
    emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600' },
    gray: { bg: 'bg-gray-50/50', border: 'border-gray-100', badge: 'bg-gray-100 text-gray-600', iconBg: 'bg-gray-100 text-gray-500' }
  };
  const cfg = colorConfig[color] || colorConfig.gray;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Header de colonne */}
      <div className='px-4 py-3 bg-white/60 border-b border-gray-100'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className={`w-7 h-7 rounded-lg ${cfg.iconBg} flex items-center justify-center`}>
              {icon}
            </div>
            <h3 className='font-semibold text-sm text-gray-800'>{title}</h3>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
            {count}
          </span>
        </div>
      </div>
      
      {/* Liste des cartes */}
      <div className='p-3 space-y-2 max-h-[350px] overflow-y-auto'>
        {items.length === 0 ? (
          <div className='text-xs text-gray-400 text-center py-8'>
            <div className='w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center'>
              <Calendar className='w-5 h-5 text-gray-300' />
            </div>
            Aucune demande
          </div>
        ) : (
          items.map(item => (
            <ReplacementCard 
              key={item.id} 
              demande={item} 
              urgency={getUrgency(item)}
              onOpenDetail={onOpenDetail}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Carte remplacement - Design moderne et épuré
const ReplacementCard = ({ demande, urgency, onOpenDetail }) => {
  const { shift, employeAbsent, candidatures = [], statut, employeRemplacant } = demande;
  
  const urgencyConfig = {
    urgent: { color: 'bg-[#cf292c] text-white', label: 'Urgent' },
    bientôt: { color: 'bg-[#cf292c]/20 text-[#cf292c]', label: 'Bientôt' },
    passé: { color: 'bg-gray-100 text-gray-500', label: 'Passé' },
    planifié: { color: 'bg-gray-100 text-gray-600', label: 'Planifié' }
  };
  const urgencyCfg = urgencyConfig[urgency] || urgencyConfig.planifié;

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div 
      className='bg-white rounded-lg border border-gray-100 p-3 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group'
      onClick={() => onOpenDetail(demande)}
    >
      {/* Header avec date et urgence */}
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#cf292c]/5 group-hover:text-[#cf292c] transition-colors'>
            <Calendar className='w-4 h-4' />
          </div>
          <div>
            <div className='text-sm font-semibold text-gray-800'>{formatDate(shift?.date)}</div>
            <div className='text-[11px] text-gray-500'>{formatShiftTime(getSegmentsWithFallback(demande))}</div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${urgencyCfg.color}`}>
          {urgencyCfg.label}
        </span>
      </div>
      
      {/* Employé */}
      <div className='flex items-center gap-2 py-2 border-t border-gray-50'>
        <div className='w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center'>
          <User className='w-3.5 h-3.5 text-gray-500' />
        </div>
        <span className='text-xs text-gray-700 font-medium'>
          {employeAbsent?.prenom} {employeAbsent?.nom}
        </span>
      </div>
      
      {/* Infos supplémentaires */}
      <div className='flex items-center justify-between mt-2'>
        {employeRemplacant ? (
          <div className='flex items-center gap-1 text-xs text-emerald-600'>
            <CheckCircle2 className='w-3.5 h-3.5' />
            <span>{employeRemplacant.prenom} {employeRemplacant.nom}</span>
          </div>
        ) : candidatures.length > 0 && statut === 'en_attente' ? (
          <div className='flex items-center gap-1 text-xs text-blue-600 font-medium'>
            <Users className='w-3.5 h-3.5' />
            <span>{candidatures.length} candidat{candidatures.length > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <span className='text-xs text-gray-400'>En recherche...</span>
        )}
        
        <ChevronRight className='w-4 h-4 text-gray-300 group-hover:text-[#cf292c] transition-colors' />
      </div>
    </div>
  );
};

// Modal détail d'une demande - Design moderne
const DemandeDetailModal = ({ demande, onClose, onValider, onRefuser, loading }) => {
  const [selectedCandidature, setSelectedCandidature] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [showRefusConfirm, setShowRefusConfirm] = useState(false);
  
  const { shift, employeAbsent, candidatures = [], statut, type, motif, commentaireManager, valideur, dateValidation, employeRemplacant } = demande;

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-[#cf292c]/10 flex items-center justify-center'>
                <RefreshCw className='w-5 h-5 text-[#cf292c]' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Demande #{demande.id}</h2>
                <p className='text-xs text-gray-500'>
                  {type === 'besoin' ? 'Besoin de remplacement' : 'Proposition de remplacement'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors'
            >
              <X className='w-5 h-5 text-gray-400' />
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className='flex-1 overflow-y-auto p-6 space-y-4'>
          {/* Info shift */}
          <div className='bg-gray-50 rounded-xl p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <Calendar className='w-4 h-4 text-gray-500' />
              <h3 className='text-sm font-semibold text-gray-700'>Shift concerné</h3>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='bg-white rounded-lg p-3 border border-gray-100'>
                <div className='text-xs text-gray-500 mb-1'>Date</div>
                <div className='text-sm font-semibold text-gray-900'>{formatDate(shift?.date)}</div>
              </div>
              <div className='bg-white rounded-lg p-3 border border-gray-100'>
                <div className='text-xs text-gray-500 mb-1'>Horaires</div>
                <div className='text-sm font-semibold text-gray-900'>{formatShiftTime(getSegmentsWithFallback(demande))}</div>
              </div>
            </div>
          </div>

          {/* Employé demandeur */}
          <div className='bg-amber-50/50 rounded-xl p-4 border border-amber-100'>
            <div className='flex items-center gap-2 mb-3'>
              <User className='w-4 h-4 text-amber-600' />
              <h3 className='text-sm font-semibold text-amber-800'>Employé demandeur</h3>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center'>
                <span className='text-sm font-semibold text-amber-700'>
                  {employeAbsent?.prenom?.[0]}{employeAbsent?.nom?.[0]}
                </span>
              </div>
              <div>
                <div className='font-medium text-gray-900'>{employeAbsent?.prenom} {employeAbsent?.nom}</div>
                {employeAbsent?.categorie && (
                  <span className='text-xs text-gray-500'>{employeAbsent.categorie}</span>
                )}
              </div>
            </div>
            {motif && (
              <div className='mt-3 flex items-start gap-2 text-sm text-gray-600 bg-white/60 rounded-lg p-2'>
                <MessageSquare className='w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0' />
                <span>{motif}</span>
              </div>
            )}
          </div>

          {/* Statut actuel */}
          <div className={`rounded-xl p-4 ${
            statut === 'en_attente' ? 'bg-amber-50/50 border border-amber-100' :
            statut === 'acceptee' ? 'bg-emerald-50/50 border border-emerald-100' :
            'bg-gray-50 border border-gray-100'
          }`}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {statut === 'en_attente' && <Clock className='w-4 h-4 text-amber-600' />}
                {statut === 'acceptee' && <CheckCircle2 className='w-4 h-4 text-emerald-600' />}
                {(statut === 'refusee' || statut === 'annulee') && <XCircle className='w-4 h-4 text-gray-500' />}
                <h3 className='text-sm font-semibold text-gray-700'>Statut</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                statut === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                statut === 'acceptee' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-200 text-gray-600'
              }`}>
                {statut === 'en_attente' ? 'En attente' : statut === 'acceptee' ? 'Validé' : statut === 'refusee' ? 'Refusé' : statut}
              </span>
            </div>
            {valideur && (
              <p className='text-xs text-gray-500 mt-2'>
                Traité par {valideur.prenom} {valideur.nom} le {formatDate(dateValidation)}
              </p>
            )}
            {employeRemplacant && (
              <div className='mt-3 flex items-center gap-2 p-2 bg-emerald-100 rounded-lg'>
                <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                <span className='text-sm text-emerald-700'>
                  Remplacé par <strong>{employeRemplacant.prenom} {employeRemplacant.nom}</strong>
                </span>
              </div>
            )}
            {commentaireManager && (
              <div className='mt-3 text-sm text-gray-600 italic bg-white/60 rounded-lg p-2'>
                "{commentaireManager}"
              </div>
            )}
          </div>

          {/* Candidatures */}
          {statut === 'en_attente' && (
            <div className='bg-white rounded-xl border border-gray-100 overflow-hidden'>
              <div className='px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Users className='w-4 h-4 text-gray-500' />
                  <h3 className='text-sm font-semibold text-gray-700'>Candidatures</h3>
                </div>
                <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700'>
                  {candidatures.length}
                </span>
              </div>
              
              <div className='p-3'>
                {candidatures.length === 0 ? (
                  <div className='text-center py-6'>
                    <div className='w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center'>
                      <Users className='w-6 h-6 text-gray-300' />
                    </div>
                    <p className='text-sm text-gray-500'>Aucune candidature pour le moment</p>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {candidatures.map((c) => (
                      <div 
                        key={c.id}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedCandidature?.id === c.id 
                            ? 'border-[#cf292c] bg-red-50/50' 
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedCandidature(c)}
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              selectedCandidature?.id === c.id ? 'bg-[#cf292c] text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              <span className='text-xs font-semibold'>
                                {c.employe?.prenom?.[0]}{c.employe?.nom?.[0]}
                              </span>
                            </div>
                            <div>
                              <div className='font-medium text-sm text-gray-900'>{c.employe?.prenom} {c.employe?.nom}</div>
                              {c.employe?.categorie && (
                                <span className='text-xs text-gray-500'>{c.employe.categorie}</span>
                              )}
                            </div>
                          </div>
                          {selectedCandidature?.id === c.id && (
                            <div className='w-6 h-6 rounded-full bg-[#cf292c] flex items-center justify-center'>
                              <Check className='w-4 h-4 text-white' />
                            </div>
                          )}
                        </div>
                        {c.commentaire && (
                          <p className='text-xs text-gray-500 mt-2 italic pl-11'>"{c.commentaire}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions - Footer fixe */}
        {statut === 'en_attente' && (
          <div className='flex-shrink-0 px-6 py-4 border-t bg-gray-50'>
            <div className='mb-3'>
              <label className='block text-xs font-medium text-gray-600 mb-1.5'>Commentaire (optionnel)</label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className='w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all resize-none'
                rows={2}
                placeholder='Ajouter un commentaire...'
              />
            </div>

            <div className='flex gap-3'>
              {candidatures.length > 0 && (
                <button
                  onClick={() => {
                    if (!selectedCandidature) {
                      alert('Veuillez sélectionner un candidat à valider');
                      return;
                    }
                    onValider(demande.id, selectedCandidature.id, commentaire);
                  }}
                  disabled={loading || !selectedCandidature}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all ${
                    selectedCandidature 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent'></div>
                  ) : (
                    <>
                      <Check className='w-4 h-4' />
                      Valider ce candidat
                    </>
                  )}
                </button>
              )}
              
              {showRefusConfirm ? (
                <div className='flex gap-2'>
                  <button
                    onClick={() => onRefuser(demande.id, commentaire)}
                    disabled={loading}
                    className='py-2.5 px-4 rounded-xl font-medium bg-[#cf292c] text-white hover:bg-red-700 transition-all'
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setShowRefusConfirm(false)}
                    className='py-2.5 px-4 rounded-xl font-medium border border-gray-200 hover:bg-white transition-all'
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRefusConfirm(true)}
                  disabled={loading}
                  className='py-2.5 px-4 rounded-xl font-medium border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 transition-all flex items-center gap-2'
                >
                  <X className='w-4 h-4' />
                  Refuser
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Utilitaires
const formatShiftTime = (segments) => {
  if (!segments) return '--h-- → --h--';
  try {
    const segs = typeof segments === 'string' ? JSON.parse(segments) : segments;
    if (!Array.isArray(segs) || segs.length === 0) return '--h-- → --h--';
    const firstStart = segs[0]?.start || segs[0]?.debut;
    const lastEnd = segs[segs.length - 1]?.end || segs[segs.length - 1]?.fin;
    return `${firstStart || '--h--'} → ${lastEnd || '--h--'}`;
  } catch {
    return '--h-- → --h--';
  }
};

// Helper pour obtenir les segments avec fallback sur shiftRemplacant
const getSegmentsWithFallback = (demande) => {
  const shift = demande?.shift;
  const shiftRemplacant = demande?.shiftRemplacant;
  
  // Si le shift original a des segments valides, les utiliser
  if (shift?.segments) {
    const segs = typeof shift.segments === 'string' ? JSON.parse(shift.segments) : shift.segments;
    if (Array.isArray(segs) && segs.length > 0) {
      return shift.segments;
    }
  }
  
  // Sinon, fallback sur le shift du remplaçant (pour les demandes validées)
  if (shiftRemplacant?.segments) {
    return shiftRemplacant.segments;
  }
  
  return null;
};

export default ReplacementsManager;
