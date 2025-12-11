import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Banknote, 
  Clock, 
  Check, 
  X, 
  RefreshCw, 
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  CreditCard,
  Wallet,
  Building2,
  FileText,
  Euro,
  TrendingUp,
  Users,
  Calendar,
  Award,
  Filter,
  Search,
  CalendarClock,
  AlertTriangle,
  Timer,
  CircleDot,
  Ban
} from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Vue principale de gestion des extras
function ExtrasManager({ embedded = false, onRefresh }) {
  const token = localStorage.getItem('token');
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showHistorique, setShowHistorique] = useState(false);

  // Stats calculées
  const statsCalc = useMemo(() => {
    const aPayer = paiements.filter(p => p.statut === 'a_payer');
    const payes = paiements.filter(p => p.statut === 'paye');
    
    // Calcul du top employé (celui qui a le plus d'extras payés)
    const employeStats = {};
    payes.forEach(p => {
      const empId = p.employeId;
      if (!employeStats[empId]) {
        employeStats[empId] = {
          employe: p.employe,
          totalMontant: 0,
          totalHeures: 0,
          count: 0
        };
      }
      employeStats[empId].totalMontant += Number(p.montant || 0);
      employeStats[empId].totalHeures += Number(p.heures || 0);
      employeStats[empId].count++;
    });
    
    const topEmploye = Object.values(employeStats).sort((a, b) => b.totalMontant - a.totalMontant)[0] || null;
    
    // Total heures à payer
    const heuresAPayer = aPayer.reduce((sum, p) => sum + Number(p.heures || 0), 0);
    const heuresPayees = payes.reduce((sum, p) => sum + Number(p.heures || 0), 0);
    
    // Période des paiements (du plus ancien au plus récent)
    const allDates = payes.map(p => new Date(p.date || p.createdAt)).filter(d => !isNaN(d));
    const periodeDebut = allDates.length > 0 ? new Date(Math.min(...allDates)) : null;
    const periodeFin = allDates.length > 0 ? new Date(Math.max(...allDates)) : null;
    
    // Calculer la durée en jours
    const joursTotal = periodeDebut && periodeFin 
      ? Math.ceil((periodeFin - periodeDebut) / (1000 * 60 * 60 * 24)) + 1 
      : 0;
    
    return {
      aPayer: aPayer.length,
      montantAPayer: aPayer.reduce((sum, p) => sum + Number(p.montant || 0), 0),
      heuresAPayer,
      payes: payes.length,
      montantPayes: payes.reduce((sum, p) => sum + Number(p.montant || 0), 0),
      heuresPayees,
      annules: paiements.filter(p => p.statut === 'annule').length,
      topEmploye,
      employeStats: Object.values(employeStats),
      periodeDebut,
      periodeFin,
      joursTotal
    };
  }, [paiements]);

  const fetchPaiements = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [paiementsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/paiements-extras`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/paiements-extras/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setPaiements(Array.isArray(paiementsRes.data.paiements) ? paiementsRes.data.paiements : []);
      setStats(statsRes.data.stats || null);
    } catch (e) {
      console.error('Erreur chargement extras:', e);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des extras' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPaiements(); }, [fetchPaiements]);

  // Grouper les paiements pour la vue Kanban
  // Séparer les extras programmés (futurs) et à payer (passés)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const groupedPaiements = useMemo(() => {
    const aPayer = paiements.filter(p => p.statut === 'a_payer');
    
    // Séparer par type : ajustements vs extras normaux
    const ajustements = aPayer.filter(p => p.source === 'ajustement');
    const normaux = aPayer.filter(p => p.source !== 'ajustement');
    
    // Séparer les futurs (programmés) des passés (à payer)
    const programmes = normaux.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate > today;
    });
    
    const aPayerPasses = normaux.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate <= today;
    });
    
    return {
      ajustements, // Ajustements suite à modifications
      programmes, // Extras futurs - pas encore travaillés
      aPayer: aPayerPasses, // Extras passés - à payer
      // Tous les payés triés par date de paiement (payeLe) décroissante
      payes: paiements
        .filter(p => p.statut === 'paye')
        .sort((a, b) => {
          const dateA = a.payeLe ? new Date(a.payeLe) : new Date(0);
          const dateB = b.payeLe ? new Date(b.payeLe) : new Date(0);
          return dateB - dateA;
        }),
      // Tous les annulés triés par date
      annules: paiements
        .filter(p => p.statut === 'annule')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    };
  }, [paiements]);

  // Marquer comme payé
  const handlePayer = async (paiementId, methode, reference, tauxHoraire = 10) => {
    try {
      setActionLoading(true);
      await axios.put(`${API_BASE}/api/paiements-extras/${paiementId}/payer`, 
        { methodePaiement: methode, reference, tauxHoraire },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: '✅ Paiement effectué avec succès !' });
      setShowPayerModal(false);
      setSelectedPaiement(null);
      fetchPaiements();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Erreur paiement:', e);
      setMessage({ type: 'error', text: e.response?.data?.error || 'Erreur lors du paiement' });
    } finally {
      setActionLoading(false);
    }
  };

  // Annuler
  const handleAnnuler = async (paiementId, raison) => {
    try {
      setActionLoading(true);
      const response = await axios.put(`${API_BASE}/api/paiements-extras/${paiementId}/annuler`,
        { raison },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Message adapté selon si le segment a été retiré du planning
      const segmentRetire = response.data?.segmentRetire;
      const messageText = segmentRetire 
        ? '✅ Paiement annulé et segment extra retiré du planning'
        : '✅ Paiement annulé';
      
      setMessage({ type: 'success', text: messageText });
      setShowModal(false);
      setSelectedPaiement(null);
      fetchPaiements();
      
      // Rafraîchir le planning si le segment a été retiré
      if (segmentRetire && onRefresh) {
        onRefresh();
      }
    } catch (e) {
      console.error('Erreur annulation:', e);
      setMessage({ type: 'error', text: e.response?.data?.error || 'Erreur lors de l\'annulation' });
    } finally {
      setActionLoading(false);
    }
  };

  // Ouvrir le détail
  const openDetail = (paiement) => {
    setSelectedPaiement(paiement);
    setShowModal(true);
  };

  // Ouvrir modal payer
  const openPayerModal = (paiement) => {
    setSelectedPaiement(paiement);
    setShowPayerModal(true);
  };

  // Payer rapidement en espèces (1 clic)
  const handlePayerRapide = async (paiement) => {
    try {
      setActionLoading(true);
      await axios.put(`${API_BASE}/api/paiements-extras/${paiement.id}/payer`, 
        { methodePaiement: 'especes' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: `✅ ${paiement.employe?.prenom} payé !` });
      fetchPaiements();
      if (onRefresh) onRefresh();
    } catch (e) {
      setMessage({ type: 'error', text: 'Erreur' });
    } finally {
      setActionLoading(false);
    }
  };

  // Payer tous en espèces
  const handlePayerTous = async () => {
    if (!window.confirm(`Payer ${statsCalc.aPayer} extra(s) pour ${statsCalc.montantAPayer.toFixed(0)}€ en espèces ?`)) return;
    try {
      setActionLoading(true);
      for (const p of groupedPaiements.aPayer) {
        await axios.put(`${API_BASE}/api/paiements-extras/${p.id}/payer`, 
          { methodePaiement: 'especes' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setMessage({ type: 'success', text: `✅ ${statsCalc.aPayer} paiements effectués !` });
      fetchPaiements();
      if (onRefresh) onRefresh();
    } catch (e) {
      setMessage({ type: 'error', text: 'Erreur lors des paiements' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className='h-full flex items-center justify-center py-12'>
      <div className='flex flex-col items-center gap-3'>
        <div className='w-10 h-10 rounded-full border-3 border-red-100 border-t-[#cf292c] animate-spin'></div>
        <span className='text-sm text-gray-500'>Chargement...</span>
      </div>
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${embedded ? 'bg-white' : 'bg-gray-50/50'}`}>
      
      {/* === HEADER ÉPURÉ (seulement si pas embedded) === */}
      {!embedded && (
        <div className='flex-shrink-0 bg-white border-b px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-[#cf292c] flex items-center justify-center'>
                <Euro className='w-4 h-4 text-white' />
              </div>
              <h1 className='text-base font-semibold text-gray-800'>Extras</h1>
            </div>
            <button 
              onClick={fetchPaiements}
              disabled={loading}
              className='p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* === STATS COMPACTES === */}
      <div className='flex-shrink-0 bg-white px-3 py-3 border-b'>
        {/* 4 stats en ligne */}
        <div className='grid grid-cols-4 gap-2'>
          {/* À payer - Principal */}
          <div className='bg-red-50 rounded-lg p-2 text-center border border-red-100'>
            <div className='text-xl font-bold text-[#cf292c]'>{statsCalc.montantAPayer.toFixed(0)}€</div>
            <div className='text-[9px] text-[#cf292c] uppercase font-medium'>À payer</div>
            <div className='text-[9px] text-gray-500'>{statsCalc.heuresAPayer.toFixed(1)}h • {statsCalc.aPayer} extra{statsCalc.aPayer > 1 ? 's' : ''}</div>
          </div>
          {/* Payé avec période */}
          <div className='bg-emerald-50 rounded-lg p-2 text-center'>
            <div className='text-xl font-bold text-emerald-600'>{statsCalc.montantPayes.toFixed(0)}€</div>
            <div className='text-[9px] text-emerald-600 uppercase font-medium'>Payé</div>
            <div className='text-[9px] text-gray-500'>
              {statsCalc.joursTotal > 0 ? `sur ${statsCalc.joursTotal}j` : statsCalc.heuresPayees.toFixed(1) + 'h'}
            </div>
          </div>
          {/* Nb paiements avec contexte */}
          <div className='bg-gray-50 rounded-lg p-2 text-center'>
            <div className='text-xl font-bold text-gray-700'>{statsCalc.payes}</div>
            <div className='text-[9px] text-gray-500 uppercase font-medium'>Paiements</div>
            <div className='text-[9px] text-gray-400'>{statsCalc.heuresPayees.toFixed(1)}h total</div>
          </div>
          {/* Top employé avec contexte */}
          {statsCalc.topEmploye ? (
            <div className='bg-amber-50 rounded-lg p-2 text-center border border-amber-100' title={`${statsCalc.topEmploye.count} extras • ${statsCalc.topEmploye.totalHeures.toFixed(1)}h`}>
              <div className='text-xl font-bold text-amber-600'>{statsCalc.topEmploye.totalMontant.toFixed(0)}€</div>
              <div className='text-[9px] text-amber-600 uppercase font-medium truncate'>🏆 {statsCalc.topEmploye.employe?.prenom?.[0]}. {statsCalc.topEmploye.employe?.nom}</div>
              <div className='text-[9px] text-amber-500'>{statsCalc.topEmploye.count} extra{statsCalc.topEmploye.count > 1 ? 's' : ''} • {statsCalc.topEmploye.totalHeures.toFixed(1)}h</div>
            </div>
          ) : (
            <div className='bg-gray-50 rounded-lg p-2 text-center'>
              <div className='text-xl font-bold text-gray-400'>-</div>
              <div className='text-[9px] text-gray-400 uppercase'>Top extra</div>
            </div>
          )}
        </div>
      </div>

      {/* === CONTENU PRINCIPAL === */}
      <div className='flex-1 overflow-y-auto'>
        
        {/* Message feedback */}
        {message.text && (
          <div className={`mx-4 mt-3 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            <div className='flex items-center gap-2'>
              {message.type === 'success' ? <CheckCircle2 className='w-4 h-4' /> : <XCircle className='w-4 h-4' />}
              {message.text}
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })} className='p-1 hover:opacity-70'>
              <X className='w-4 h-4' />
            </button>
          </div>
        )}

        {/* Section PROGRAMMÉS (futurs) */}
        {groupedPaiements.programmes.length > 0 && (
          <div className='p-4 pb-2'>
            <div className='flex items-center gap-2 mb-3'>
              <CalendarClock className='w-4 h-4 text-blue-500' />
              <span className='text-sm font-medium text-blue-700'>Programmés ({groupedPaiements.programmes.length})</span>
              <span className='text-xs text-blue-400'>Shifts pas encore effectués</span>
            </div>
            <div className='space-y-2'>
              {groupedPaiements.programmes.map(item => (
                <PaiementCard 
                  key={item.id} 
                  paiement={item} 
                  onOpenDetail={openDetail}
                  onAnnuler={handleAnnuler}
                  isProgramme={true}
                  loading={actionLoading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section AJUSTEMENTS (corrections sur paiements déjà effectués) */}
        {groupedPaiements.ajustements.length > 0 && (
          <div className='p-4 pb-2 bg-amber-50/30'>
            <div className='flex items-center gap-2 mb-3'>
              <AlertTriangle className='w-4 h-4 text-amber-600' />
              <span className='text-sm font-medium text-amber-700'>Ajustements ({groupedPaiements.ajustements.length})</span>
              <span className='text-xs text-amber-500'>Corrections suite à modifications</span>
            </div>
            <div className='space-y-2'>
              {groupedPaiements.ajustements.map(item => (
                <PaiementCard 
                  key={item.id} 
                  paiement={item} 
                  onOpenDetail={openDetail}
                  onPayer={openPayerModal}
                  isAjustement={true}
                  loading={actionLoading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Liste À PAYER (passés) */}
        <div className='p-4'>
          {groupedPaiements.aPayer.length === 0 && groupedPaiements.programmes.length === 0 && groupedPaiements.ajustements.length === 0 ? (
            <div className='bg-emerald-50/50 rounded-lg p-4 text-center border border-emerald-100'>
              <div className='flex items-center justify-center gap-2 text-emerald-600'>
                <CheckCircle2 className='w-5 h-5' />
                <span className='font-medium text-sm'>Tout est payé</span>
              </div>
              <p className='text-xs text-emerald-500 mt-1'>Aucun extra en attente de paiement</p>
            </div>
          ) : groupedPaiements.aPayer.length === 0 ? (
            <div className='bg-blue-50/50 rounded-lg p-4 text-center border border-blue-100'>
              <div className='flex items-center justify-center gap-2 text-blue-600'>
                <Clock className='w-5 h-5' />
                <span className='font-medium text-sm'>En attente</span>
              </div>
              <p className='text-xs text-blue-500 mt-1'>Les extras programmés seront payables après leur réalisation</p>
            </div>
          ) : (
            <>
              <div className='flex items-center gap-2 mb-3'>
                <Wallet className='w-4 h-4 text-[#cf292c]' />
                <span className='text-sm font-medium text-gray-700'>À payer ({groupedPaiements.aPayer.length})</span>
                <span className='text-xs text-gray-400'>Shifts effectués</span>
              </div>
              <div className='space-y-2'>
                {groupedPaiements.aPayer.map(item => (
                  <PaiementCard 
                    key={item.id} 
                    paiement={item} 
                    onOpenDetail={openDetail}
                    onPayer={openPayerModal}
                    isPriority
                    loading={actionLoading}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Accordéon Historique */}
        {groupedPaiements.payes.length > 0 && (
          <div className='border-t'>
            <button
              onClick={() => setShowHistorique(!showHistorique)}
              className='w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors'
            >
              <span className='text-sm text-gray-500 flex items-center gap-2'>
                <CheckCircle2 className='w-4 h-4 text-emerald-500' />
                Historique ({groupedPaiements.payes.length} payés)
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showHistorique ? 'rotate-180' : ''}`} />
            </button>
            
            {showHistorique && (
              <div className='px-4 pb-4 space-y-2'>
                {groupedPaiements.payes.map(item => (
                  <PaiementCard 
                    key={item.id} 
                    paiement={item} 
                    onOpenDetail={openDetail}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal détail */}
      {showModal && selectedPaiement && (
        <PaiementDetailModal
          paiement={selectedPaiement}
          onClose={() => { setShowModal(false); setSelectedPaiement(null); }}
          onPayer={() => { setShowModal(false); setShowPayerModal(true); }}
          onAnnuler={handleAnnuler}
          loading={actionLoading}
          allPaiements={paiements}
        />
      )}

      {/* Modal payer */}
      {showPayerModal && selectedPaiement && (
        <PayerModal
          paiement={selectedPaiement}
          onClose={() => { setShowPayerModal(false); setSelectedPaiement(null); }}
          onConfirm={handlePayer}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// Carte paiement - Design avec contexte complet
const PaiementCard = ({ paiement, onOpenDetail, onPayer, onAnnuler, isPriority, isProgramme, isAjustement, compact, loading }) => {
  const { employe, date, heures, montant, statut, source, tauxHoraire, commentaire, motifAjustement, heuresInitiales, montantInitial, derniereModif } = paiement;
  
  // Vérifier si c'est un ajustement avec montant négatif (trop-perçu)
  const isNegatif = Number(heures) < 0 || Number(montant) < 0;
  
  // Vérifier si c'est un shift futur
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pDate = new Date(date);
  pDate.setHours(0, 0, 0, 0);
  const isFuture = pDate > today;
  const isToday = pDate.getTime() === today.getTime();
  
  // Extraire les détails du shift/anomalie depuis les données
  const details = paiement.anomalie?.details || paiement.shift?.details || paiement.metadata || {};
  
  // Récupérer les infos du segment extra depuis le shift lié
  const shift = paiement.shift;
  const segmentIndex = paiement.segmentIndex;
  let segmentInfo = null;
  if (shift?.segments && segmentIndex !== null && segmentIndex !== undefined) {
    const segments = typeof shift.segments === 'string' ? JSON.parse(shift.segments) : shift.segments;
    segmentInfo = segments?.[segmentIndex];
  }
  
  // Horaires du segment extra
  const segmentHeures = segmentInfo ? `${segmentInfo.start} - ${segmentInfo.end}` : null;
  
  // Horaires prévus vs réels - support multiple formats
  const shiftPrevu = segmentHeures || details.heurePrevueDebut && details.heurePrevueFin 
    ? `${details.heurePrevueDebut} - ${details.heurePrevueFin}`
    : details.heurePrevu
    || (details.tempsPlanifie ? `${Math.floor(details.tempsPlanifie/60)}h${details.tempsPlanifie%60 > 0 ? (details.tempsPlanifie%60).toString().padStart(2,'0') : ''}` : null);
  
  // Utiliser les nouveaux champs heuresReelles et pointageValide du paiement
  const hasPointageFromDB = paiement.pointageValide === true;
  const heuresReellesFromDB = paiement.heuresReelles;
  
  // Formater les heures réelles en HhMM
  const formatHeuresReelles = (h) => {
    if (h === null || h === undefined) return null;
    const num = Number(h);
    const hh = Math.floor(num);
    const mm = Math.round((num - hh) * 60);
    return mm > 0 ? `${hh}h${mm.toString().padStart(2, '0')}` : `${hh}h`;
  };
  
  const shiftReel = hasPointageFromDB && heuresReellesFromDB != null
    ? formatHeuresReelles(heuresReellesFromDB)
    : details.heureReelleDebut && details.heureReelleFin
      ? `${details.heureReelleDebut} - ${details.heureReelleFin}`
      : details.heureReelle
      || (details.tempsTravaille ? `${Math.floor(details.tempsTravaille/60)}h${details.tempsTravaille%60 > 0 ? (details.tempsTravaille%60).toString().padStart(2,'0') : ''}` : null);
  
  // Vérifier si un pointage existe (utiliser le flag DB en priorité)
  const hasPointage = hasPointageFromDB || (shiftReel && shiftReel !== '-');

  // Source label avec icônes Lucide
  const getSourceBadge = (src) => {
    switch (src) {
      case 'shift_extra': return { label: 'Shift', color: 'bg-blue-100 text-blue-700', Icon: Calendar };
      case 'anomalie_heures_sup': return { label: 'H.Sup', color: 'bg-purple-100 text-purple-700', Icon: Timer };
      case 'manuel': return { label: 'Manuel', color: 'bg-gray-100 text-gray-600', Icon: FileText };
      case 'ajustement': return { label: 'Ajust.', color: 'bg-amber-100 text-amber-700', Icon: AlertTriangle };
      default: return { label: 'Extra', color: 'bg-gray-100 text-gray-600', Icon: Euro };
    }
  };

  const sourceBadge = getSourceBadge(source);

  // Mode compact pour historique
  if (compact) {
    return (
      <div 
        className='flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors'
        onClick={() => onOpenDetail(paiement)}
      >
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-medium'>
            {employe?.prenom?.[0]}{employe?.nom?.[0]}
          </div>
          <div>
            <span className='text-sm text-gray-600'>{employe?.prenom} {employe?.nom?.[0]}.</span>
            <span className='text-xs text-gray-400 ml-2'>{formatDate(date)}</span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-xs text-gray-400'>{formatHeures(heures)}</span>
          <span className='text-sm font-medium text-gray-700'>{Number(montant).toFixed(0)}€</span>
          <CheckCircle2 className='w-4 h-4 text-emerald-500' />
        </div>
      </div>
    );
  }

  // Couleur du container selon le statut
  const containerClass = isAjustement
    ? isNegatif 
      ? 'border-orange-300 bg-orange-50/30' 
      : 'border-amber-300 bg-amber-50/30'
    : isProgramme
      ? 'border-blue-200 bg-blue-50/30'
      : isPriority 
        ? 'border-[#cf292c]/30 shadow-sm' 
        : 'border-gray-200';

  return (
    <div className={`bg-white rounded-xl border transition-all ${containerClass}`}>
      {/* Badge de statut temporel / ajustement */}
      {(isProgramme || isToday || isAjustement) && (
        <div className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
          isAjustement
            ? isNegatif
              ? 'bg-orange-100 text-orange-700 rounded-t-xl'
              : 'bg-amber-100 text-amber-700 rounded-t-xl'
            : isProgramme 
              ? 'bg-blue-100 text-blue-700 rounded-t-xl' 
              : 'bg-amber-100 text-amber-700 rounded-t-xl'
        }`}>
          {isAjustement ? (
            <>
              <AlertTriangle className='w-3.5 h-3.5' />
              {isNegatif ? '⚠️ Trop-perçu à régulariser' : '📝 Ajustement suite modification'}
              {motifAjustement === 'modification_horaires' && ' (horaires)'}
            </>
          ) : isProgramme ? (
            <>
              <CalendarClock className='w-3.5 h-3.5' />
              📅 Programmé - Shift pas encore effectué
            </>
          ) : (
            <>
              <CircleDot className='w-3.5 h-3.5' />
              Aujourd'hui
            </>
          )}
        </div>
      )}
      
      {/* Header avec employé et montant */}
      <div className='flex items-center justify-between p-3 border-b border-gray-100'>
        <div className='flex items-center gap-2'>
          <div 
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs cursor-pointer ${
              isAjustement ? (isNegatif ? 'bg-orange-500' : 'bg-amber-500') : isProgramme ? 'bg-blue-500' : 'bg-[#cf292c]'
            }`}
            onClick={() => onOpenDetail(paiement)}
          >
            {employe?.prenom?.[0]}{employe?.nom?.[0]}
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <span className='font-semibold text-gray-800 text-sm'>{employe?.prenom} {employe?.nom}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${sourceBadge.color}`}>
                <sourceBadge.Icon className='w-3 h-3' />
                {sourceBadge.label}
              </span>
              {/* Badge modification si le paiement a été modifié */}
              {montantInitial && Number(montantInitial) !== Number(montant) && (
                <span className='text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1'>
                  ✏️ Modifié
                </span>
              )}
            </div>
            <div className='text-xs text-gray-400'>{formatDateLong(date)}</div>
          </div>
        </div>
        <div className='text-right'>
          {/* Affichage ancien montant barré si modifié */}
          {montantInitial && Number(montantInitial) !== Number(montant) && (
            <div className='text-sm text-gray-400 line-through'>
              {Number(montantInitial).toFixed(0)}€
            </div>
          )}
          <div className={`text-xl font-bold ${
            isAjustement ? (isNegatif ? 'text-orange-600' : 'text-amber-600') : isProgramme ? 'text-blue-600' : 'text-[#cf292c]'
          }`}>
            {Number(montant).toFixed(0)}€
          </div>
          <div className='text-[10px] text-gray-400'>{Number(tauxHoraire || 10).toFixed(0)}€/h</div>
        </div>
      </div>

      {/* Détails du contexte */}
      <div className='p-3 bg-gray-50/50 space-y-2'>
        {/* Segment extra horaires */}
        {source === 'shift_extra' && (
          <div className='grid grid-cols-2 gap-2 text-xs'>
            <div className='bg-white rounded-lg p-2 border border-gray-100'>
              <div className='text-[10px] text-gray-400 uppercase font-medium mb-1 flex items-center gap-1'>
                <Calendar className='w-3 h-3' /> Segment extra
              </div>
              <div className='font-medium text-gray-700'>
                {segmentHeures || shiftPrevu || '-'}
              </div>
            </div>
            <div className='bg-white rounded-lg p-2 border border-gray-100'>
              <div className='text-[10px] text-gray-400 uppercase font-medium mb-1 flex items-center gap-1'>
                {hasPointage ? <CheckCircle2 className='w-3 h-3 text-emerald-500' /> : <Clock className='w-3 h-3' />}
                {hasPointage ? 'Réalisé' : 'Pointage'}
              </div>
              <div className={`font-medium ${hasPointage ? 'text-emerald-600' : 'text-gray-400'}`}>
                {isProgramme ? (
                  <span className='text-blue-500 italic'>En attente...</span>
                ) : hasPointage ? (
                  <div className='flex flex-col'>
                    <span>{shiftReel}</span>
                    {/* Afficher l'écart si disponible */}
                    {paiement.ecartHeures != null && Number(paiement.ecartHeures) !== 0 && (
                      <span className={`text-[10px] ${Number(paiement.ecartHeures) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ({Number(paiement.ecartHeures) < 0 ? '-' : '+'}{formatHeuresReelles(Math.abs(Number(paiement.ecartHeures)))})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className='text-amber-500'>Non pointé</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Heures à payer */}
        <div className={`rounded-lg p-2 border ${
          isAjustement 
            ? isNegatif 
              ? 'bg-orange-50 border-orange-100' 
              : 'bg-amber-50 border-amber-100'
            : isProgramme 
              ? 'bg-blue-50 border-blue-100' 
              : 'bg-purple-50 border-purple-100'
        }`}>
          <div className='flex items-center justify-between'>
            <div>
              <div className={`text-[10px] uppercase font-medium flex items-center gap-1 ${
                isAjustement 
                  ? isNegatif ? 'text-orange-500' : 'text-amber-500'
                  : isProgramme ? 'text-blue-500' : 'text-purple-500'
              }`}>
                <Timer className='w-3 h-3' />
                {isAjustement 
                  ? isNegatif ? 'Heures trop-perçues' : 'Heures supplémentaires'
                  : isProgramme ? 'Heures prévues' : 'Heures extra'}
              </div>
              {/* Affichage ancien→nouveau si modifié */}
              {heuresInitiales && Number(heuresInitiales) !== Number(heures) ? (
                <div className='flex items-center gap-2'>
                  <span className='text-gray-400 line-through text-sm'>
                    +{formatHeures(heuresInitiales)}
                  </span>
                  <span className='text-gray-400'>→</span>
                  <span className={`font-bold text-lg ${
                    isAjustement 
                      ? isNegatif ? 'text-orange-700' : 'text-amber-700'
                      : isProgramme ? 'text-blue-700' : 'text-purple-700'
                  }`}>
                    {isNegatif ? '' : '+'}{formatHeures(heures)}
                  </span>
                </div>
              ) : (
                <div className={`font-bold text-lg ${
                  isAjustement 
                    ? isNegatif ? 'text-orange-700' : 'text-amber-700'
                    : isProgramme ? 'text-blue-700' : 'text-purple-700'
                }`}>
                  {isNegatif ? '' : '+'}{formatHeures(heures)}
                </div>
              )}
            </div>
            {!isProgramme && hasPointage && (
              <div className='flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded'>
                <CheckCircle2 className='w-3 h-3' />
                Pointage confirmé
              </div>
            )}
            {isProgramme && (
              <div className='flex items-center gap-1 text-xs text-blue-500'>
                <CalendarClock className='w-3 h-3' />
                {(() => {
                  const diff = Math.ceil((pDate - today) / (1000 * 60 * 60 * 24));
                  return diff === 1 ? 'Demain' : `Dans ${diff} jours`;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Commentaire si présent - avec formatage ancien segment barré */}
        {commentaire && (
          <div className='text-xs text-gray-500 italic bg-white rounded p-2 border border-gray-100'>
            💬 {(() => {
              // Parser "Segment extra ~~ancien~~ nouveau" pour afficher ancien barré
              const regex = /~~([^~]+)~~/g;
              if (commentaire.includes('~~')) {
                const parts = [];
                let lastIndex = 0;
                let match;
                const tempRegex = /~~([^~]+)~~/g;
                while ((match = tempRegex.exec(commentaire)) !== null) {
                  // Texte avant le match
                  if (match.index > lastIndex) {
                    parts.push(<span key={`t${lastIndex}`}>{commentaire.slice(lastIndex, match.index)}</span>);
                  }
                  // Le texte barré
                  parts.push(
                    <span key={`s${match.index}`} className='line-through text-red-400 not-italic'>{match[1]}</span>
                  );
                  parts.push(<span key={`a${match.index}`}> → </span>);
                  lastIndex = match.index + match[0].length;
                }
                // Texte restant après le dernier match
                if (lastIndex < commentaire.length) {
                  parts.push(<span key={`e${lastIndex}`}>{commentaire.slice(lastIndex)}</span>);
                }
                return parts;
              }
              return commentaire;
            })()}
          </div>
        )}
      </div>

      {/* Actions selon le statut */}
      {statut === 'a_payer' && (
        <div className='p-3 border-t border-gray-100 flex items-center justify-between'>
          {isProgramme ? (
            <>
              <button
                onClick={() => onOpenDetail(paiement)}
                className='text-xs text-gray-500 hover:text-gray-700'
              >
                Voir détails →
              </button>
              <button
                onClick={() => onAnnuler && onAnnuler(paiement.id, 'Shift annulé')}
                disabled={loading}
                className='px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5'
              >
                <Ban className='w-3.5 h-3.5' />
                Annuler prévu
              </button>
            </>
          ) : isAjustement ? (
            <>
              <button
                onClick={() => onOpenDetail(paiement)}
                className='text-xs text-gray-500 hover:text-gray-700'
              >
                Voir détails →
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onPayer && onPayer(paiement); }}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  isNegatif ? 'bg-orange-500 hover:bg-orange-600' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                <Wallet className='w-4 h-4' />
                {isNegatif ? `Régulariser ${Math.abs(Number(montant)).toFixed(0)}€` : `Payer ${Number(montant).toFixed(0)}€`}
              </button>
            </>
          ) : onPayer && (
            <>
              <button
                onClick={() => onOpenDetail(paiement)}
                className='text-xs text-gray-500 hover:text-gray-700'
              >
                Voir détails →
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onPayer(paiement); }}
                disabled={loading}
                className='px-4 py-2 text-sm font-medium text-white bg-[#cf292c] hover:bg-[#b02426] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2'
              >
                <Wallet className='w-4 h-4' />
                Payer {Number(montant).toFixed(0)}€
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Modal détail avec historique employé
const PaiementDetailModal = ({ paiement, onClose, onPayer, onAnnuler, loading, allPaiements = [] }) => {
  const [showAnnulerConfirm, setShowAnnulerConfirm] = useState(false);
  const [raisonAnnulation, setRaisonAnnulation] = useState('');
  
  const { employe, date, heures, montant, tauxHoraire, statut, source, commentaire, payeLe, methodePaiement, payeur } = paiement;
  
  // Extraire les détails de l'anomalie pour la tranche horaire
  const details = paiement.anomalie?.details || {};
  
  // Récupérer les infos du segment extra depuis le shift lié
  const shift = paiement.shift;
  const segmentIdx = paiement.segmentIndex;
  let segmentInfo = null;
  if (shift?.segments && segmentIdx !== null && segmentIdx !== undefined) {
    const segments = typeof shift.segments === 'string' ? JSON.parse(shift.segments) : shift.segments;
    segmentInfo = segments?.[segmentIdx];
  }
  
  // Horaires détaillés - utiliser le segment si source=shift_extra
  const arriveePrevu = segmentInfo?.start || details.heurePrevueDebut || details.heureArriveePrevu || (details.heurePrevu?.split(' - ')[0]) || null;
  const departPrevu = segmentInfo?.end || details.heurePrevueFin || details.heureDepartPrevu || (details.heurePrevu?.split(' - ')[1]) || null;
  
  // Pour les heures réelles, utiliser les données du paiement si pointageValide
  const hasPointageDB = paiement.pointageValide === true;
  const heuresReellesDB = paiement.heuresReelles;
  
  // Formater heures en HhMM
  const formatHeuresModal = (h) => {
    if (h === null || h === undefined) return null;
    const num = Number(h);
    const hh = Math.floor(num);
    const mm = Math.round((num - hh) * 60);
    return mm > 0 ? `${hh}h${mm.toString().padStart(2, '0')}` : `${hh}h`;
  };
  
  // Utiliser les heures de pointage stockées dans le paiement
  const arriveeReelleFromDB = paiement.arriveeReelle;
  const departReelleFromDB = paiement.departReelle;
  
  const arriveeReelle = arriveeReelleFromDB || details.heureReelleDebut || details.heureArriveeReelle || (details.heureReelle?.split(' - ')[0]) || null;
  const departReelle = departReelleFromDB || details.heureReelleFin || details.heureDepartReelle || (details.heureReelle?.split(' - ')[1]) || null;
  
  // Temps en heures - utiliser les nouvelles données du paiement
  const heuresPrevuesDB = paiement.heuresPrevues;
  const tempsPrevuH = heuresPrevuesDB != null 
    ? formatHeuresModal(heuresPrevuesDB)
    : (details.tempsPlanifie ? (details.tempsPlanifie / 60).toFixed(1) + 'h' : null);
  
  const tempsReelH = hasPointageDB && heuresReellesDB != null 
    ? formatHeuresModal(heuresReellesDB)
    : (details.tempsTravaille ? (details.tempsTravaille / 60).toFixed(1) + 'h' : null);
  
  // Écart depuis le paiement
  const ecartHeuresDB = paiement.ecartHeures;
  const minutesEcart = ecartHeuresDB != null 
    ? Math.round(Number(ecartHeuresDB) * 60)
    : (details.minutesEcart || details.ecartMinutes || details.soldeNet || null);
  
  // Tranche de l'extra (après l'heure de départ PRÉVUE)
  const heureDebutExtra = departPrevu || null;

  // Calculer l'historique et stats de cet employé
  const employeHistorique = useMemo(() => {
    const employePaiements = allPaiements.filter(p => p.employeId === paiement.employeId && p.statut === 'paye');
    const totalMontant = employePaiements.reduce((sum, p) => sum + Number(p.montant || 0), 0);
    const totalHeures = employePaiements.reduce((sum, p) => sum + Number(p.heures || 0), 0);
    return {
      paiements: employePaiements.slice(0, 5), // 5 derniers
      totalMontant,
      totalHeures,
      count: employePaiements.length
    };
  }, [allPaiements, paiement.employeId]);

  const getSourceLabel = (src) => {
    switch (src) {
      case 'shift_extra': return 'Shift Extra';
      case 'anomalie_heures_sup': return 'Heures supplémentaires';
      case 'manuel': return 'Saisie manuelle';
      default: return src;
    }
  };

  return (
    <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='flex-shrink-0 px-5 py-4 border-b'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-[#cf292c] flex items-center justify-center text-white font-semibold'>
                {employe?.prenom?.[0]}{employe?.nom?.[0]}
              </div>
              <div>
                <h2 className='font-semibold text-gray-900'>{employe?.prenom} {employe?.nom}</h2>
                <p className='text-xs text-gray-500'>{getSourceLabel(source)}</p>
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

        {/* Contenu */}
        <div className='flex-1 overflow-y-auto p-5 space-y-4'>
          {/* Montant principal */}
          <div className='text-center py-5 bg-gray-50 rounded-xl'>
            <div className='text-4xl font-bold text-[#cf292c]'>{Number(montant).toFixed(0)}€</div>
            <div className='text-sm text-gray-500 mt-2'>{formatHeures(heures)} × {Number(tauxHoraire).toFixed(2)}€/h</div>
            <div className='text-xs text-gray-400 mt-1'>{formatDate(date)}</div>
          </div>

          {/* Détail complet des horaires */}
          <div className='bg-blue-50 rounded-xl border border-blue-100 p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <Clock className='w-4 h-4 text-blue-600' />
              <span className='text-sm font-medium text-blue-700'>Horaires du jour</span>
            </div>
            
            {/* Tableau comparatif prévu vs réalisé */}
            <div className='bg-white rounded-lg overflow-hidden border border-blue-100'>
              <div className='grid grid-cols-3 text-[10px] text-gray-400 uppercase font-medium border-b border-blue-50'>
                <div className='p-2'></div>
                <div className='p-2 text-center'>📋 Prévu</div>
                <div className='p-2 text-center'>✅ Réalisé</div>
              </div>
              <div className='grid grid-cols-3 text-sm border-b border-blue-50'>
                <div className='p-2 text-gray-500 text-xs'>Arrivée</div>
                <div className='p-2 text-center font-medium text-gray-700'>{arriveePrevu || '-'}</div>
                <div className='p-2 text-center font-medium text-blue-600'>{arriveeReelle || '-'}</div>
              </div>
              <div className='grid grid-cols-3 text-sm border-b border-blue-50'>
                <div className='p-2 text-gray-500 text-xs'>Départ</div>
                <div className='p-2 text-center font-medium text-gray-700'>{departPrevu || '-'}</div>
                <div className='p-2 text-center font-medium text-blue-600'>{departReelle || '-'}</div>
              </div>
              <div className='grid grid-cols-3 text-sm bg-gray-50'>
                <div className='p-2 text-gray-500 text-xs'>Durée</div>
                <div className='p-2 text-center font-medium text-gray-700'>{tempsPrevuH || '-'}</div>
                <div className='p-2 text-center font-medium text-blue-600'>{tempsReelH || '-'}</div>
              </div>
            </div>
          </div>

          {/* Tranche horaire de l'extra */}
          {(minutesEcart || heures) && (
            <div className='bg-purple-50 rounded-xl border border-purple-100 p-4'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='text-sm font-medium text-purple-700'>⏱️ Heures supplémentaires</span>
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold text-purple-700'>{formatHeures(heures)}</div>
                  {heureDebutExtra && (
                    <div className='text-xs text-purple-500 mt-1'>Après {heureDebutExtra} (fin prévue)</div>
                  )}
                </div>
                {minutesEcart && (
                  <div className='text-right'>
                    <div className='text-lg font-bold text-purple-600'>+{Math.abs(minutesEcart)} min</div>
                    <div className='text-[10px] text-purple-400'>d'écart</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statut */}
          <div className='flex items-center justify-between p-3 bg-gray-50 rounded-xl'>
            <span className='text-sm text-gray-600'>Statut</span>
            {statut === 'a_payer' && (
              <span className='px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium'>À payer</span>
            )}
            {statut === 'paye' && (
              <span className='px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium'>Payé</span>
            )}
            {statut === 'annule' && (
              <span className='px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium'>Annulé</span>
            )}
          </div>

          {/* Info paiement si payé */}
          {statut === 'paye' && payeLe && (
            <div className='p-3 bg-emerald-50 rounded-xl border border-emerald-100'>
              <div className='text-xs text-emerald-600 font-medium mb-1'>Paiement effectué</div>
              <div className='text-sm text-gray-700'>
                Le {formatDate(payeLe)} • {methodePaiement === 'especes' ? '💵 Espèces' : methodePaiement === 'virement' ? '🏦 Virement' : methodePaiement}
              </div>
              {payeur && (
                <div className='text-xs text-emerald-500 mt-1'>
                  Par {payeur.prenom} {payeur.nom}
                </div>
              )}
            </div>
          )}

          {/* Commentaire */}
          {commentaire && (
            <div className='p-3 bg-gray-50 rounded-xl'>
              <div className='text-xs text-gray-500 mb-1'>Commentaire</div>
              <div className='text-sm text-gray-700'>{commentaire}</div>
            </div>
          )}

          {/* Historique employé */}
          {employeHistorique.count > 0 && (
            <div className='border border-gray-100 rounded-xl overflow-hidden'>
              <div className='px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <TrendingUp className='w-4 h-4 text-gray-500' />
                  <span className='text-xs font-medium text-gray-600'>Historique {employe?.prenom}</span>
                </div>
                <div className='text-xs text-gray-500'>
                  {employeHistorique.totalMontant.toFixed(0)}€ total
                </div>
              </div>
              <div className='p-2 space-y-1'>
                {employeHistorique.paiements.map(p => (
                  <div key={p.id} className='flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='w-3.5 h-3.5 text-emerald-500' />
                      <span className='text-xs text-gray-600'>{formatDate(p.date)}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-gray-500'>{formatHeures(p.heures)}</span>
                      <span className='text-xs font-medium text-gray-700'>{Number(p.montant).toFixed(0)}€</span>
                    </div>
                  </div>
                ))}
                {employeHistorique.count > 5 && (
                  <div className='text-center py-1'>
                    <span className='text-[10px] text-gray-400'>+{employeHistorique.count - 5} autres paiements</span>
                  </div>
                )}
              </div>
              <div className='px-3 py-2 bg-blue-50 border-t border-blue-100'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-blue-600 font-medium'>Total cumulé</span>
                  <div className='text-right'>
                    <span className='text-sm font-bold text-blue-700'>{employeHistorique.totalMontant.toFixed(0)}€</span>
                    <span className='text-xs text-blue-500 ml-2'>({employeHistorique.totalHeures.toFixed(1)}h)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Annulation */}
          {showAnnulerConfirm && (
            <div className='p-4 bg-red-50 rounded-xl border border-red-100'>
              <div className='text-sm font-medium text-red-700 mb-2'>Confirmer l'annulation</div>
              <textarea
                value={raisonAnnulation}
                onChange={(e) => setRaisonAnnulation(e.target.value)}
                placeholder="Raison de l'annulation (optionnel)"
                className='w-full p-2 border border-red-200 rounded-lg text-sm mb-3'
                rows={2}
              />
              <div className='flex gap-2'>
                <button
                  onClick={() => setShowAnnulerConfirm(false)}
                  className='flex-1 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50'
                >
                  Retour
                </button>
                <button
                  onClick={() => onAnnuler(paiement.id, raisonAnnulation)}
                  disabled={loading}
                  className='flex-1 px-3 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50'
                >
                  {loading ? 'Annulation...' : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {statut === 'a_payer' && !showAnnulerConfirm && (
          <div className='flex-shrink-0 p-4 border-t flex gap-3'>
            <button
              onClick={() => setShowAnnulerConfirm(true)}
              className='flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            >
              Annuler ce paiement
            </button>
            <button
              onClick={onPayer}
              className='flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#cf292c] rounded-lg hover:bg-[#b02426] transition-colors flex items-center justify-center gap-2'
            >
              <Wallet className='w-4 h-4' />
              Payer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Modal payer
const PayerModal = ({ paiement, onClose, onConfirm, loading }) => {
  const [methode, setMethode] = useState('especes');
  const [reference, setReference] = useState('');
  const [tauxHoraire, setTauxHoraire] = useState(paiement.tauxHoraire || 10);
  
  // Recalculer le montant si le taux change
  const montantCalcule = paiement.heures * tauxHoraire;

  const methodes = [
    { id: 'especes', label: 'Espèces', icon: <Wallet className='w-5 h-5' />, color: 'emerald' },
    { id: 'virement', label: 'Virement', icon: <Building2 className='w-5 h-5' />, color: 'blue' },
    { id: 'cheque', label: 'Chèque', icon: <FileText className='w-5 h-5' />, color: 'purple' }
  ];

  const tauxOptions = [8, 10, 11, 12, 13, 14, 15];

  return (
    <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden'>
        {/* Header */}
        <div className='px-5 py-4 border-b'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-[#cf292c] flex items-center justify-center text-white font-semibold'>
              {paiement.employe?.prenom?.[0]}{paiement.employe?.nom?.[0]}
            </div>
            <div>
              <h2 className='font-semibold text-gray-900'>Confirmer le paiement</h2>
              <p className='text-xs text-gray-500'>{paiement.employe?.prenom} {paiement.employe?.nom}</p>
            </div>
          </div>
        </div>

        {/* Montant & Taux */}
        <div className='px-5 py-4 border-b bg-gray-50'>
          <div className='text-center mb-3'>
            <div className='text-3xl font-bold text-[#cf292c]'>{montantCalcule.toFixed(0)}€</div>
            <div className='text-sm text-gray-500'>{formatHeures(paiement.heures)} d'extras</div>
          </div>
          
          {/* Sélection taux horaire */}
          <div>
            <label className='text-xs font-medium text-gray-500 mb-2 block text-center'>Taux horaire</label>
            <div className='flex justify-center gap-1.5 flex-wrap'>
              {tauxOptions.map(taux => (
                <button
                  key={taux}
                  onClick={() => setTauxHoraire(taux)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tauxHoraire === taux 
                      ? 'bg-[#cf292c] text-white' 
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {taux}€/h
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Méthode */}
        <div className='p-6 space-y-4'>
          <div>
            <label className='text-sm font-medium text-gray-700 mb-2 block'>Méthode de paiement</label>
            <div className='grid grid-cols-3 gap-2'>
              {methodes.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethode(m.id)}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                    methode === m.id 
                      ? 'border-[#cf292c] bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={methode === m.id ? 'text-[#cf292c]' : 'text-gray-400'}>
                    {m.icon}
                  </span>
                  <span className={`text-xs font-medium ${methode === m.id ? 'text-[#cf292c]' : 'text-gray-600'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {methode !== 'especes' && (
            <div>
              <label className='text-sm font-medium text-gray-700 mb-1 block'>Référence (optionnel)</label>
              <input
                type='text'
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder='N° de virement, chèque...'
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-colors'
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className='p-4 border-t flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(paiement.id, methode, reference, tauxHoraire)}
            disabled={loading}
            className='flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#cf292c] rounded-lg hover:bg-[#b02426] disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {loading ? (
              <RefreshCw className='w-4 h-4 animate-spin' />
            ) : (
              <>
                <Check className='w-4 h-4' />
                Confirmer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Utilitaires
const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatHeures = (heures) => {
  if (!heures) return '0h';
  const h = Math.floor(Number(heures));
  const m = Math.round((Number(heures) - h) * 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

export default ExtrasManager;
