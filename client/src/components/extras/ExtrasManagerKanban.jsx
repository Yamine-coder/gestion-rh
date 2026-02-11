import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Clock, 
  Check, 
  X, 
  RefreshCw, 
  ChevronDown,
  CheckCircle2,
  XCircle,
  Wallet,
  Building2,
  FileText,
  Search,
  CalendarClock,
  Timer,
  CircleDot,
  Ban,
  Lock,
  MoreHorizontal,
  AlertCircle,
  CheckSquare,
  Square,
  Calendar,
  ArrowUpDown,
  AlertTriangle,
  Users,
  User,
  Pencil,
  ArrowLeft,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../ui/Toast';
import { API_BASE } from '../../config/api';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL - VUE KANBAN GESTION DES EXTRAS
// ═══════════════════════════════════════════════════════════════════════════
function ExtrasManagerKanban({ embedded = false, onRefresh }) {
  const token = localStorage.getItem('token');
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterEmploye, setFilterEmploye] = useState('');
  const toast = useToast();
  
  // Nouveaux états UX
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterPeriode, setFilterPeriode] = useState('all'); // all, today, week, month
  const [sortBy, setSortBy] = useState('date'); // date, montant, employe
  const [showFilters, setShowFilters] = useState(false);
  const [filterPointage, setFilterPointage] = useState('all'); // all, pointe, non_pointe
  const [showInactifs, setShowInactifs] = useState(false); // Afficher les extras d'employés partis
  
  // Confirmation paiement sans pointage
  const [confirmNonPointe, setConfirmNonPointe] = useState(null); // { type: 'single'|'batch'|'quick', data: ... }

  // ─────────────────────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────────────────────
  const fetchPaiements = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/paiements-extras`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaiements(Array.isArray(res.data.paiements) ? res.data.paiements : []);
    } catch (e) {
      console.error('Erreur chargement extras:', e);
      setMessage({ type: 'error', text: 'Erreur lors du chargement' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPaiements(); }, [fetchPaiements]);

  // ─────────────────────────────────────────────────────────────
  // GROUPEMENT KANBAN
  // ─────────────────────────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Fonction de tri
  const sortItems = useCallback((items) => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'montant':
          return Number(b.montant || 0) - Number(a.montant || 0);
        case 'employe':
          const nomA = `${a.employe?.nom} ${a.employe?.prenom}`.toLowerCase();
          const nomB = `${b.employe?.nom} ${b.employe?.prenom}`.toLowerCase();
          return nomA.localeCompare(nomB);
        case 'date':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });
  }, [sortBy]);

  // Filtre par période
  const filterByPeriode = useCallback((items) => {
    if (filterPeriode === 'all') return items;
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return items.filter(p => {
      const pDate = new Date(p.date);
      switch (filterPeriode) {
        case 'today':
          return pDate >= startOfDay;
        case 'week':
          return pDate >= startOfWeek;
        case 'month':
          return pDate >= startOfMonth;
        default:
          return true;
      }
    });
  }, [filterPeriode]);

  const columns = useMemo(() => {
    let filtered = filterEmploye 
      ? paiements.filter(p => 
          p.employe?.nom?.toLowerCase().includes(filterEmploye.toLowerCase()) ||
          p.employe?.prenom?.toLowerCase().includes(filterEmploye.toLowerCase())
        )
      : paiements;

    // Filtrer les employés inactifs/partis (sauf si showInactifs)
    if (!showInactifs) {
      filtered = filtered.filter(p => {
        // Garder si pas d'info employé (sécurité)
        if (!p.employe) return true;
        // Exclure si dateSortie passée ou statut inactif
        if (p.employe.dateSortie && new Date(p.employe.dateSortie) < new Date()) return false;
        if (p.employe.statut === 'inactif' || p.employe.actif === false) return false;
        return true;
      });
    }

    // Appliquer filtre période
    filtered = filterByPeriode(filtered);
    
    // Appliquer filtre pointage
    if (filterPointage === 'pointe') {
      filtered = filtered.filter(p => p.pointageValide);
    } else if (filterPointage === 'non_pointe') {
      filtered = filtered.filter(p => !p.pointageValide);
    }

    const aPayer = filtered.filter(p => p.statut === 'a_payer');
    
    // ═══════════════════════════════════════════════════════════════
    // NOUVELLE LOGIQUE 4 COLONNES
    // ═══════════════════════════════════════════════════════════════
    
    // 1. PROGRAMMÉS = date > aujourd'hui (tous statuts a_payer)
    const programmes = sortItems(aPayer.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate > today;
    }));

    // 2. ATTENTE POINTAGE = date <= aujourd'hui ET pointageValide=false ET source=shift_extra
    //    (les autres sources n'ont pas besoin de pointage)
    //    + Détection des extras "bloqués" (ENTRÉE sans SORTIE depuis > 12h)
    const attentePointage = sortItems(aPayer.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate <= today && 
             !p.pointageValide && 
             p.source === 'shift_extra';
    }).map(p => {
      // Marquer les extras avec ENTRÉE mais sans SORTIE depuis longtemps
      const hasArrivee = p.arriveeReelle && !p.departReelle;
      if (hasArrivee) {
        // Calculer depuis combien de temps l'arrivée est pointée
        const segment = p.shift?.segments?.[p.segmentIndex];
        if (segment?.end) {
          const [h, m] = segment.end.split(':').map(Number);
          const heureFin = new Date(p.date);
          heureFin.setHours(h, m, 0, 0);
          // Si heure fin < 10h et début >= 18h, c'est un shift de nuit
          const [hDebut] = (segment.start || '00:00').split(':').map(Number);
          if (hDebut >= 18 && h < 10) heureFin.setDate(heureFin.getDate() + 1);
          
          const now = new Date();
          const diffH = (now - heureFin) / (1000 * 60 * 60);
          if (diffH > 2) {
            return { ...p, _blockedEntreeSansSortie: true, _blockedSinceHours: Math.floor(diffH) };
          }
        }
      }
      return p;
    }));

    // 3. À PAYER = date <= aujourd'hui ET (pointageValide=true OU source != shift_extra)
    //    Les shift_extra pointés + les autres sources (anomalie, ajustement, etc.)
    const aPayerPrets = sortItems(aPayer.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate <= today && 
             (p.pointageValide || p.source !== 'shift_extra');
    }));

    // 4. PAYÉS
    const payes = sortItems(filtered.filter(p => p.statut === 'paye'));
    
    // 5. ANNULÉS (gardé pour affichage optionnel)
    const annules = sortItems(filtered.filter(p => p.statut === 'annule'));

    return { programmes, attentePointage, aPayer: aPayerPrets, payes, annules };
  }, [paiements, filterEmploye, filterPointage, showInactifs, today, filterByPeriode, sortItems]);

  // ─────────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const tousAPayer = paiements.filter(p => p.statut === 'a_payer');
    
    // 1. Programmés (futurs)
    const programmes = tousAPayer.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate > todayDate;
    });
    
    // 2. Attente pointage (passés, shift_extra non pointés)
    const attentePointage = tousAPayer.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate <= todayDate && !p.pointageValide && p.source === 'shift_extra';
    });
    
    // 3. À payer (passés, pointés ou source != shift_extra)
    const aPayer = tousAPayer.filter(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate <= todayDate && (p.pointageValide || p.source !== 'shift_extra');
    });
    
    const payes = paiements.filter(p => p.statut === 'paye');
    
    // Comptage des extras bloqués (ENTRÉE sans SORTIE)
    const bloques = attentePointage.filter(p => p.arriveeReelle && !p.departReelle);
    
    return {
      // Programmés
      montantProgrammes: programmes.reduce((sum, p) => sum + Number(p.montant || 0), 0),
      heuresProgrammes: programmes.reduce((sum, p) => sum + Number(p.heures || 0), 0),
      countProgrammes: programmes.length,
      // Attente pointage
      montantAttentePointage: attentePointage.reduce((sum, p) => sum + Number(p.montant || 0), 0),
      heuresAttentePointage: attentePointage.reduce((sum, p) => sum + Number(p.heures || 0), 0),
      countAttentePointage: attentePointage.length,
      countBloques: bloques.length, // ENTRÉE sans SORTIE
      // À payer (prêts)
      montantAPayer: aPayer.reduce((sum, p) => sum + Number(p.montant || 0), 0),
      heuresAPayer: aPayer.reduce((sum, p) => sum + Number(p.heures || 0), 0),
      countAPayer: aPayer.length,
      // Payés
      montantPayes: payes.reduce((sum, p) => sum + Number(p.montant || 0), 0),
      heuresPayes: payes.reduce((sum, p) => sum + Number(p.heures || 0), 0),
      countPayes: payes.length
    };
  }, [paiements]);

  // ─────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────
  const handlePayer = async (paiementId, methode, reference, tauxHoraire = 10) => {
    try {
      setActionLoading(true);
      await axios.put(`${API_BASE}/api/paiements-extras/${paiementId}/payer`, 
        { methodePaiement: methode, reference, tauxHoraire },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'Paiement effectué !' });
      setShowPayerModal(false);
      setSelectedPaiement(null);
      fetchPaiements();
      if (onRefresh) onRefresh();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Erreur' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnnuler = async (paiementId, raison, forcerAnnulation = false) => {
    try {
      setActionLoading(true);
      const response = await axios.put(`${API_BASE}/api/paiements-extras/${paiementId}/annuler`,
        { raison, forcerAnnulation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msg = response.data?.segmentRetire 
        ? 'Extra annulé et segment retiré du planning' 
        : 'Extra annulé';
      setMessage({ type: 'success', text: msg });
      setShowDetailModal(false);
      setSelectedPaiement(null);
      fetchPaiements();
      if (onRefresh) onRefresh();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Erreur annulation' });
      throw e; // Re-throw pour que le modal sache qu'il y a eu une erreur
    } finally {
      setActionLoading(false);
    }
  };

  // Sélection multiple
  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = (items) => {
    setSelectedIds(new Set(items.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Stats de sélection
  const selectionStats = useMemo(() => {
    const selected = paiements.filter(p => selectedIds.has(p.id));
    return {
      count: selected.length,
      montant: selected.reduce((sum, p) => sum + Number(p.montant || 0), 0),
      heures: selected.reduce((sum, p) => sum + Number(p.heures || 0), 0)
    };
  }, [paiements, selectedIds]);

  // Payer sélection
  const handlePayerSelection = async (methode = 'especes', forceNonPointe = false) => {
    if (selectedIds.size === 0) return;
    const toProcess = paiements.filter(p => selectedIds.has(p.id) && p.statut === 'a_payer');
    const nonPointes = toProcess.filter(p => !p.pointageValide);
    
    // Si des extras ne sont pas pointés et pas de confirmation
    if (nonPointes.length > 0 && !forceNonPointe) {
      setConfirmNonPointe({ type: 'batch', data: { methode, toProcess, nonPointes } });
      return;
    }
    
    try {
      setActionLoading(true);
      for (const p of toProcess) {
        await axios.put(`${API_BASE}/api/paiements-extras/${p.id}/payer`,
          { methodePaiement: methode, tauxHoraire: 10 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setMessage({ type: 'success', text: `${toProcess.length} paiement(s) effectué(s)` });
      clearSelection();
      fetchPaiements();
      if (onRefresh) onRefresh();
    } catch (e) {
      setMessage({ type: 'error', text: 'Erreur lors du paiement' });
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className='h-full flex items-center justify-center'>
      <div className='flex flex-col items-center gap-3'>
        <div className='w-10 h-10 rounded-full border-3 border-red-100 border-t-[#cf292c] animate-spin'></div>
        <span className='text-sm text-gray-500'>Chargement...</span>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className={`h-full flex flex-col ${embedded ? 'bg-white' : 'bg-gray-50'}`}>
      
      {/* ═══ HEADER AMÉLIORÉ ═══ */}
      <div className='flex-shrink-0 bg-white border-b'>
        {/* Ligne principale */}
        <div className='flex items-center justify-between px-4 py-2'>
          {/* Stats compactes - 4 COLONNES */}
          <div className='flex items-center gap-2 flex-wrap'>
            {/* Programmés (futurs) */}
            {stats.countProgrammes > 0 && (
              <div className='flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100'>
                <CalendarClock className='w-3.5 h-3.5 text-blue-500' />
                <span className='text-sm font-semibold text-blue-700'>{stats.countProgrammes}</span>
                <span className='text-[10px] text-blue-500'>à venir</span>
              </div>
            )}
            {/* Attente pointage */}
            {stats.countAttentePointage > 0 && (
              <div className='flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded-lg border border-orange-100'>
                <Clock className='w-3.5 h-3.5 text-orange-500' />
                <span className='text-sm font-semibold text-orange-700'>{stats.countAttentePointage}</span>
                <span className='text-[10px] text-orange-500 flex items-center gap-0.5'><Clock className='w-2.5 h-2.5' /> pointage</span>
                {/* Badge bloqués (ENTRÉE sans SORTIE) */}
                {stats.countBloques > 0 && (
                  <span className='px-1.5 py-0.5 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center gap-0.5' title='Entrées pointées sans sortie'>
                    <Zap className='w-2.5 h-2.5' />
                    {stats.countBloques}
                  </span>
                )}
              </div>
            )}
            {/* À payer (prêts) */}
            <div className='flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-100'>
              <CheckCircle2 className='w-3.5 h-3.5 text-amber-600' />
              <span className='text-sm font-semibold text-amber-700'>{stats.countAPayer}</span>
              <span className='text-[10px] text-amber-500'>à payer</span>
              <span className='text-xs font-medium text-amber-600 ml-1'>({stats.montantAPayer.toFixed(0)}€)</span>
            </div>
            {/* Payés */}
            <div className='flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100'>
              <Wallet className='w-3.5 h-3.5 text-emerald-600' />
              <span className='text-sm font-semibold text-emerald-700'>{stats.countPayes}</span>
              <span className='text-[10px] text-emerald-500'>payés</span>
              <span className='text-xs font-medium text-emerald-600 ml-1'>({stats.montantPayes.toFixed(0)}€)</span>
            </div>
          </div>

          {/* Actions */}
          <div className='flex items-center gap-1.5'>
            {/* Recherche */}
            <div className='relative'>
              <Search className='w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                placeholder='Rechercher...'
                value={filterEmploye}
                onChange={e => setFilterEmploye(e.target.value)}
                className='pl-7 pr-2 py-1 text-sm border border-gray-200 rounded-lg w-32 focus:outline-none focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]'
              />
            </div>

            {/* Filtre période */}
            <select
              value={filterPeriode}
              onChange={e => setFilterPeriode(e.target.value)}
              className='px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#cf292c]/30'
            >
              <option value="all">Tout</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className='px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#cf292c]/30'
            >
              <option value="date">Par date</option>
              <option value="montant">Par montant</option>
              <option value="employe">Par employé</option>
            </select>

            {/* Filtre par pointage */}
            <select
              value={filterPointage}
              onChange={e => setFilterPointage(e.target.value)}
              className='px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#cf292c]/30'
            >
              <option value="all">Tous</option>
              <option value="pointe">Pointés</option>
              <option value="non_pointe">Non pointés</option>
            </select>

            {/* Toggle employés inactifs */}
            <button
              onClick={() => setShowInactifs(!showInactifs)}
              className={`px-2 py-1 text-xs border rounded-lg flex items-center gap-1 transition-colors ${
                showInactifs 
                  ? 'border-purple-300 bg-purple-50 text-purple-700' 
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
              title={showInactifs ? 'Masquer les extras d\'employés partis' : 'Afficher les extras d\'employés partis'}
            >
              {showInactifs ? <Eye className='w-3 h-3' /> : <EyeOff className='w-3 h-3' />}
              <span className='hidden sm:inline'>Inactifs</span>
            </button>

            {/* Refresh */}
            <button 
              onClick={fetchPaiements}
              disabled={loading}
              className='p-1.5 rounded-lg hover:bg-gray-100 text-gray-400'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Barre de sélection (visible si sélection) */}
        {selectedIds.size > 0 && (
          <div className='flex items-center justify-between px-4 py-1.5 bg-blue-50 border-t border-blue-100'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1.5 text-sm text-blue-700'>
                <CheckSquare className='w-4 h-4' />
                <span className='font-medium'>{selectionStats.count} sélectionné(s)</span>
              </div>
              <span className='text-blue-500'>•</span>
              <span className='text-sm text-blue-600'>{selectionStats.heures.toFixed(1)}h</span>
              <span className='text-blue-500'>•</span>
              <span className='text-sm font-semibold text-blue-700'>{selectionStats.montant.toFixed(0)}€</span>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={clearSelection}
                className='px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-100 rounded'
              >
                Désélectionner
              </button>
              <button
                onClick={() => handlePayerSelection('especes')}
                disabled={actionLoading}
                className='flex items-center gap-1 px-3 py-1 bg-[#cf292c] hover:bg-[#b02025] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50'
              >
                <Wallet className='w-3 h-3' />
                Payer en espèces
              </button>
              <button
                onClick={() => handlePayerSelection('virement')}
                disabled={actionLoading}
                className='flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50'
              >
                <Building2 className='w-3 h-3' />
                Virement
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message feedback */}
      {message.text && (
        <div className={`mx-3 mt-2 px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          <div className='flex items-center gap-2'>
            {message.type === 'success' ? <CheckCircle2 className='w-4 h-4' /> : <XCircle className='w-4 h-4' />}
            {message.text}
          </div>
          <button onClick={() => setMessage({ type: '', text: '' })} className='p-0.5 hover:opacity-70'>
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* ═══ KANBAN BOARD ═══ */}
      <div className='flex-1 overflow-x-auto p-3'>
        <div className='flex gap-3 h-full min-w-max'>
          
          {/* COLONNE: PROGRAMMÉS */}
          <KanbanColumn
            title="Programmés"
            icon={CalendarClock}
            color="blue"
            count={columns.programmes.length}
            total={columns.programmes.reduce((s, p) => s + Number(p.montant || 0), 0)}
            items={columns.programmes}
            onItemClick={(p) => { setSelectedPaiement(p); setShowDetailModal(true); }}
            onAnnuler={handleAnnuler}
            emptyText="Aucun à venir"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onSelectAll={() => selectAll(columns.programmes)}
          />

          {/* COLONNE: ATTENTE POINTAGE */}
          <KanbanColumn
            title="Attente pointage"
            icon={Clock}
            color="orange"
            count={columns.attentePointage.length}
            total={columns.attentePointage.reduce((s, p) => s + Number(p.montant || 0), 0)}
            items={columns.attentePointage}
            onItemClick={(p) => { 
              // Ouvrir la modal de paiement avec confirmation car non pointé
              setSelectedPaiement(p); 
              setConfirmNonPointe({ type: 'single', data: { paiement: p } });
            }}
            onAnnuler={handleAnnuler}
            emptyText="Tous pointés ✓"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onSelectAll={() => selectAll(columns.attentePointage)}
            isWaitingPointage
          />

          {/* COLONNE: À PAYER (Prêts) */}
          <KanbanColumn
            title="À payer"
            icon={CheckCircle2}
            color="amber"
            count={columns.aPayer.length}
            total={columns.aPayer.reduce((s, p) => s + Number(p.montant || 0), 0)}
            items={columns.aPayer}
            onItemClick={(p) => {
              setSelectedPaiement(p); 
              setShowPayerModal(true);
            }}
            onAnnuler={handleAnnuler}
            isPriority
            emptyText="Tout est payé ✓"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onSelectAll={() => selectAll(columns.aPayer)}
          />

          {/* COLONNE: PAYÉS */}
          <KanbanColumn
            title="Payés"
            icon={Wallet}
            color="emerald"
            count={columns.payes.length}
            total={columns.payes.reduce((s, p) => s + Number(p.montant || 0), 0)}
            items={columns.payes}
            onItemClick={(p) => { setSelectedPaiement(p); setShowDetailModal(true); }}
            isPaid
            emptyText="Aucun paiement"
          />

          {/* COLONNE: ANNULÉS */}
          <KanbanColumn
            title="Annulés"
            icon={Ban}
            color="gray"
            count={columns.annules.length}
            total={columns.annules.reduce((s, p) => s + Number(p.montant || 0), 0)}
            items={columns.annules}
            onItemClick={(p) => { setSelectedPaiement(p); setShowDetailModal(true); }}
            isCancelled
            emptyText="Aucun"
            collapsed
          />

        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showPayerModal && selectedPaiement && (
        <PayerModal
          paiement={selectedPaiement}
          onClose={() => { setShowPayerModal(false); setSelectedPaiement(null); }}
          onConfirm={handlePayer}
          loading={actionLoading}
        />
      )}

      {showDetailModal && selectedPaiement && (
        <DetailModal
          paiement={selectedPaiement}
          onClose={() => { setShowDetailModal(false); setSelectedPaiement(null); }}
          onAnnuler={handleAnnuler}
        />
      )}

      {/* Modal de confirmation paiement sans pointage */}
      {confirmNonPointe && (
        <ConfirmNonPointeModal
          data={confirmNonPointe}
          onClose={() => setConfirmNonPointe(null)}
          onConfirm={() => {
            const { type, data } = confirmNonPointe;
            setConfirmNonPointe(null);
            if (type === 'batch') {
              handlePayerSelection(data.methode, true);
            } else if (type === 'single' && data?.paiement) {
              // Payer quand même un extra non pointé avec heures prévues
              setSelectedPaiement(data.paiement);
              setShowPayerModal(true);
            }
          }}
          onConfirmWithAdjust={async (adjustedPaiement) => {
            // Payer avec heures ajustées manuellement
            setConfirmNonPointe(null);
            try {
              // Mettre à jour le paiement avec les nouvelles heures
              await axios.patch(`${API_BASE}/api/paiements-extras/${adjustedPaiement.id}`, {
                heures: adjustedPaiement.heures,
                montant: adjustedPaiement.montant,
                arriveeReelle: adjustedPaiement.arriveeReelle,
                departReelle: adjustedPaiement.departReelle,
                heuresReelles: adjustedPaiement.heures,
                ecartHeures: adjustedPaiement.heures - (confirmNonPointe.data?.paiement?.heures || adjustedPaiement.heures),
                commentaire: adjustedPaiement.commentaire
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              // Ouvrir la modal de paiement avec le paiement ajusté
              setSelectedPaiement(adjustedPaiement);
              setShowPayerModal(true);
              fetchPaiements(); // Refresh pour voir les nouvelles heures
            } catch (err) {
              console.error('Erreur ajustement heures:', err);
              toast.error('Erreur', 'Erreur lors de l\'ajustement des heures');
            }
          }}
          onAnnulerExtra={handleAnnuler}
        />
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL CONFIRMATION PAIEMENT SANS POINTAGE
// ═══════════════════════════════════════════════════════════════════════════
function ConfirmNonPointeModal({ data, onClose, onConfirm, onConfirmWithAdjust, onAnnulerExtra }) {
  const { type } = data;
  const [showDetails, setShowDetails] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustedHeures, setAdjustedHeures] = useState('');
  const [adjustedArrivee, setAdjustedArrivee] = useState('');
  const [adjustedDepart, setAdjustedDepart] = useState('');
  
  // Raccourci clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isSingle = type === 'single' || type === 'quick';
  const paiement = isSingle ? data.data?.paiement || data.data : null;
  const batchData = !isSingle ? data.data : null;
  
  // Extraire les infos du segment
  const segment = paiement?.shift?.segments?.[paiement?.segmentIndex];
  // Utiliser segmentInitial en fallback (contient le créneau prévu pour anomalie_extra)
  const horaires = segment 
    ? `${segment.start} - ${segment.end}` 
    : paiement?.segmentInitial 
      ? paiement.segmentInitial.replace('-', ' - ') 
      : '-';
  
  // Initialiser les valeurs d'ajustement
  useEffect(() => {
    if (paiement) {
      setAdjustedHeures(String(paiement.heures || 0));
      setAdjustedArrivee(segment?.start || '');
      setAdjustedDepart(segment?.end || '');
    }
  }, [paiement, segment]);
  
  // Calculer les heures depuis arrivée/départ ajustés
  useEffect(() => {
    if (showAdjust && adjustedArrivee && adjustedDepart) {
      const [hA, mA] = adjustedArrivee.split(':').map(Number);
      const [hD, mD] = adjustedDepart.split(':').map(Number);
      let totalMinutes = (hD * 60 + mD) - (hA * 60 + mA);
      // Gérer le cas où départ est le lendemain (shift de nuit)
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      const heures = (totalMinutes / 60).toFixed(1);
      setAdjustedHeures(heures);
    }
  }, [showAdjust, adjustedArrivee, adjustedDepart]);
  
  // Calculer le retard pour le paiement single
  const retardInfo = useMemo(() => {
    if (!paiement) return null;
    
    const heureFin = segment?.end;
    const pDate = new Date(paiement.date);
    pDate.setHours(0, 0, 0, 0);
    
    if (heureFin) {
      const [h, m] = heureFin.split(':').map(Number);
      const heureFinSegment = new Date(pDate);
      heureFinSegment.setHours(h, m, 0, 0);
      if (h < 6) heureFinSegment.setDate(heureFinSegment.getDate() + 1);
      
      const now = new Date();
      if (now > heureFinSegment) {
        const diffMs = now - heureFinSegment;
        const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
        const diffJours = Math.floor(diffHeures / 24);
        
        if (diffJours >= 1) return { level: 'critical', text: `Pointage manquant depuis ${diffJours} jour(s)` };
        if (diffHeures >= 2) return { level: 'warning', text: `Heure de fin dépassée de ${diffHeures}h` };
      }
    }
    return { level: 'waiting', text: 'En attente du pointage de départ' };
  }, [paiement, segment]);
  
  // Log détails en console quand on clique voir détails
  const handleShowDetails = () => {
    setShowDetails(true);
  };
  
  // Confirmer avec ajustement
  const handleConfirmAdjust = () => {
    if (onConfirmWithAdjust && paiement) {
      const tauxHoraire = paiement.montant / paiement.heures || 10;
      onConfirmWithAdjust({
        ...paiement,
        heures: parseFloat(adjustedHeures),
        montant: (parseFloat(adjustedHeures) * tauxHoraire).toFixed(2),
        arriveeReelle: adjustedArrivee,
        departReelle: adjustedDepart,
        commentaire: `Heures ajustées manuellement (prévu: ${paiement.heures}h → réel: ${adjustedHeures}h)`
      });
    }
  };
  
  // Couleur du header selon l'état
  const headerColor = showAdjust ? 'bg-blue-500' : 
                      showDetails ? 'bg-slate-500' : 
                      retardInfo?.level === 'critical' ? 'bg-red-500' : 'bg-orange-500';
  
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden'>
        {/* Header sobre */}
        <div className={`px-4 py-3 ${headerColor}`}>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
              {paiement?.employe?.prenom?.[0]}{paiement?.employe?.nom?.[0]}
            </div>
            <div className='flex-1'>
              <h2 className='font-semibold text-white'>
                {paiement?.employe?.prenom} {paiement?.employe?.nom}
              </h2>
              <p className='text-sm text-white/80'>
                {new Date(paiement?.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button 
              onClick={onClose}
              className='w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors'
            >
              <X className='w-5 h-5 text-white' />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className='p-4 space-y-4'>
          {isSingle && paiement ? (
            <>
              {/* Infos créneau - Style sobre */}
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-xs text-gray-400 uppercase tracking-wide'>Créneau</p>
                  <p className='text-lg font-semibold text-gray-800'>{horaires || 'Non défini'}</p>
                  {paiement.pointageValide && paiement.arriveeReelle && paiement.departReelle && (
                    <p className='text-sm text-emerald-600 flex items-center gap-1 mt-1'>
                      <CheckCircle2 className='w-4 h-4' />
                      Pointé : {paiement.arriveeReelle} - {paiement.departReelle}
                    </p>
                  )}
                </div>
                <div className='text-right'>
                  <p className='text-xs text-gray-400 uppercase tracking-wide'>Durée</p>
                  <p className='text-lg font-semibold text-gray-800'>{Number(paiement.heures).toFixed(1)}h</p>
                </div>
              </div>
              
              {/* Section détails (affichée si showDetails) */}
              {showDetails ? (
                <div className='space-y-3'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-gray-50 p-3 rounded-lg'>
                      <p className='text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1'>
                        <Clock className='w-3 h-3' /> Horaires prévus
                      </p>
                      <p className='font-medium text-gray-800'>{horaires}</p>
                    </div>
                    <div className='bg-gray-50 p-3 rounded-lg'>
                      <p className='text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1'>
                        <FileText className='w-3 h-3' /> Source
                      </p>
                      <p className='font-medium text-gray-800'>{paiement.source || 'shift_extra'}</p>
                    </div>
                    <div className='bg-gray-50 p-3 rounded-lg'>
                      <p className='text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1'>
                        <CheckCircle2 className='w-3 h-3' /> Arrivée
                      </p>
                      <p className={`font-medium ${paiement.arriveeReelle ? 'text-emerald-600' : 'text-red-500'}`}>
                        {paiement.arriveeReelle || 'Non pointé'}
                      </p>
                    </div>
                    <div className='bg-gray-50 p-3 rounded-lg'>
                      <p className='text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1'>
                        <XCircle className='w-3 h-3' /> Départ
                      </p>
                      <p className={`font-medium ${paiement.departReelle ? 'text-emerald-600' : 'text-red-500'}`}>
                        {paiement.departReelle || 'Non pointé'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : showAdjust ? (
                /* Formulaire d'ajustement des heures - sobre */
                <div className='space-y-4'>
                  {/* Horaires prévus (référence) */}
                  <div className='bg-gray-50 p-3 rounded-lg'>
                    <p className='text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1'>
                      <CalendarClock className='w-3 h-3' /> Horaires prévus
                    </p>
                    <p className='font-medium text-gray-800'>{horaires} ({paiement.heures}h)</p>
                  </div>
                  
                  {/* Champs arrivée / départ */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='text-xs text-gray-500 mb-1.5 flex items-center gap-1'>
                        <CheckCircle2 className='w-3 h-3 text-emerald-500' /> Arrivée réelle
                      </label>
                      <input
                        type='time'
                        value={adjustedArrivee}
                        onChange={(e) => setAdjustedArrivee(e.target.value)}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      />
                    </div>
                    <div>
                      <label className='text-xs text-gray-500 mb-1.5 flex items-center gap-1'>
                        <XCircle className='w-3 h-3 text-red-500' /> Départ réel
                      </label>
                      <input
                        type='time'
                        value={adjustedDepart}
                        onChange={(e) => setAdjustedDepart(e.target.value)}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      />
                    </div>
                  </div>
                  
                  {/* Résumé calculé */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-blue-50 p-3 rounded-lg border border-blue-100'>
                      <p className='text-xs text-blue-600 flex items-center gap-1'>
                        <Timer className='w-3 h-3' /> Heures à payer
                      </p>
                      <p className='text-xl font-bold text-blue-700'>{adjustedHeures}h</p>
                    </div>
                    <div className='bg-emerald-50 p-3 rounded-lg border border-emerald-100'>
                      <p className='text-xs text-emerald-600 flex items-center gap-1'>
                        <Wallet className='w-3 h-3' /> Montant
                      </p>
                      <p className='text-xl font-bold text-emerald-700'>
                        {(parseFloat(adjustedHeures || 0) * (paiement.montant / paiement.heures || 10)).toFixed(0)}€
                      </p>
                    </div>
                  </div>
                  
                  {/* Écart */}
                  {parseFloat(adjustedHeures) !== parseFloat(paiement.heures) && (
                    <p className={`text-sm flex items-center gap-1.5 ${
                      parseFloat(adjustedHeures) > parseFloat(paiement.heures) ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {parseFloat(adjustedHeures) > parseFloat(paiement.heures) 
                        ? <><CheckCircle2 className='w-4 h-4' />+{(parseFloat(adjustedHeures) - parseFloat(paiement.heures)).toFixed(1)}h de plus</>
                        : <><AlertTriangle className='w-4 h-4' />{(parseFloat(adjustedHeures) - parseFloat(paiement.heures)).toFixed(1)}h de moins</>
                      }
                    </p>
                  )}
                </div>
              ) : (
                /* Statut du pointage (affiché par défaut) - sobre */
                <div className={`rounded-lg p-3 ${
                  retardInfo?.level === 'critical' ? 'bg-red-50 border border-red-200' :
                  retardInfo?.level === 'warning' ? 'bg-orange-50 border border-orange-200' :
                  'bg-amber-50 border border-amber-200'
                }`}>
                  <div className='flex items-center gap-2'>
                    {retardInfo?.level === 'critical' ? (
                      <AlertTriangle className='w-5 h-5 text-red-500 flex-shrink-0' />
                    ) : (
                      <Clock className='w-5 h-5 text-orange-500 flex-shrink-0' />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${
                        retardInfo?.level === 'critical' ? 'text-red-700' : 'text-orange-700'
                      }`}>
                        {retardInfo?.text}
                      </p>
                      <p className='text-xs text-gray-500 mt-0.5'>
                        Départ non pointé pour ce créneau extra
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : batchData && (
            <>
              <div className='bg-amber-50 border border-amber-200 rounded-lg p-3'>
                <div className='flex items-center gap-2 mb-2'>
                  <Users className='w-4 h-4 text-amber-600' />
                  <span className='text-sm font-medium text-amber-800'>
                    {batchData.nonPointes.length} sur {batchData.toProcess.length} extras non pointés
                  </span>
                </div>
                <div className='max-h-24 overflow-y-auto space-y-1'>
                  {batchData.nonPointes.map(p => (
                    <div key={p.id} className='flex items-center gap-2 text-xs text-amber-700 bg-amber-100/50 px-2 py-1 rounded'>
                      <User className='w-3 h-3' />
                      {p.employe?.prenom} {p.employe?.nom} - {Number(p.heures || 0).toFixed(1)}h
                    </div>
                  ))}
                </div>
              </div>
              <div className='bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4 text-red-500 flex-shrink-0' />
                <p className='text-sm text-red-700'>
                  <strong>Attention :</strong> Paiement sans preuve de présence.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer - sobre */}
        <div className='px-4 py-3 bg-gray-50 border-t'>
          {isSingle && paiement ? (
            showAdjust ? (
              /* Mode ajustement */
              <div className='flex gap-2'>
                <button
                  onClick={() => setShowAdjust(false)}
                  className='flex-1 px-3 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5'
                >
                  <ArrowLeft className='w-4 h-4' />
                  Retour
                </button>
                <button
                  onClick={handleConfirmAdjust}
                  className='flex-1 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5'
                >
                  <Check className='w-4 h-4' />
                  Confirmer {adjustedHeures}h
                </button>
              </div>
            ) : (
              /* Mode normal / détails */
              <div className='space-y-2'>
                {/* Actions principales */}
                <div className='flex gap-2'>
                  {showDetails ? (
                    <button
                      onClick={() => setShowDetails(false)}
                      className='flex-1 px-3 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5'
                    >
                      <ArrowLeft className='w-4 h-4' />
                      Retour
                    </button>
                  ) : (
                    <button
                      onClick={handleShowDetails}
                      className='flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5'
                    >
                      <FileText className='w-4 h-4' />
                      Voir détails
                    </button>
                  )}
                  <button
                    onClick={onConfirm}
                    className='flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5'
                  >
                    <Wallet className='w-4 h-4' />
                    Payer {paiement.heures}h
                  </button>
                </div>
                {/* Actions secondaires - Ligne 2 */}
                <div className='flex gap-2'>
                  <button
                    onClick={() => setShowAdjust(true)}
                    className='flex-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1'
                  >
                    <Pencil className='w-3.5 h-3.5' />
                    Ajuster les heures
                  </button>
                </div>
                {/* Actions tertiaires - Ligne 3 */}
                <div className='flex gap-2 pt-1 border-t border-gray-200'>
                  <button
                    onClick={onClose}
                    className='flex-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors'
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (onAnnulerExtra) {
                        onAnnulerExtra(paiement.id, 'Annulé - Pas de pointage');
                      }
                      onClose();
                    }}
                    className='flex-1 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 transition-colors flex items-center justify-center gap-1'
                  >
                    <Ban className='w-3.5 h-3.5' />
                    Supprimer
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className='flex items-center justify-between'>
              <button
                onClick={onClose}
                className='px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors'
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                className='px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2'
              >
                <AlertTriangle className='w-4 h-4' />
                Payer quand même
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT FORMATAGE COMMENTAIRE (ancien barré, nouveau en gras)
// ═══════════════════════════════════════════════════════════════════════════
function FormattedComment({ text }) {
  if (!text) return null;
  
  // Parser le format ~~ancien~~ nouveau
  // Regex pour trouver ~~texte~~
  const parts = [];
  let remaining = text;
  let key = 0;
  
  // Pattern: ~~texte_barré~~
  const regex = /~~([^~]+)~~/g;
  let match;
  let lastIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    // Ajouter le texte avant le match
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    // Ajouter le texte barré en rouge
    parts.push(
      <span key={key++} className='line-through text-red-500 opacity-70 mx-0.5'>
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  
  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    // Chercher le nouveau segment (juste après le barré)
    const remainingText = text.slice(lastIndex);
    // Pattern: segment horaire HH:MM-HH:MM après le barré
    const segmentMatch = remainingText.match(/^(\s*)(\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
    if (segmentMatch && parts.length > 0) {
      // Le nouveau segment en vert/gras
      parts.push(
        <span key={key++}>{segmentMatch[1]}</span>
      );
      parts.push(
        <span key={key++} className='font-semibold text-emerald-600'>
          {segmentMatch[2]}
        </span>
      );
      parts.push(
        <span key={key++}>{remainingText.slice(segmentMatch[0].length)}</span>
      );
    } else {
      parts.push(
        <span key={key++}>{remainingText}</span>
      );
    }
  }
  
  // Si pas de format spécial, retourner le texte brut
  if (parts.length === 0) {
    return <span>{text}</span>;
  }
  
  return <>{parts}</>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLONNE KANBAN
// ═══════════════════════════════════════════════════════════════════════════
const colorConfig = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-400', badge: 'bg-gray-100 text-gray-500' }
};

function KanbanColumn({ 
  title, icon: Icon, color = 'gray',
  count, total, items, onItemClick, onAnnuler, 
  isPriority, isPaid, isCancelled, isWaitingPointage,
  emptyText,
  collapsed: initialCollapsed = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [showAll, setShowAll] = useState(false);
  
  const displayItems = showAll ? items : items.slice(0, 12);
  const hasMore = items.length > 12;
  const cfg = colorConfig[color];
  
  // Compter les sélectionnés dans cette colonne
  const selectedInColumn = items.filter(p => selectedIds.has(p.id)).length;

  return (
    <div className={`w-72 flex-shrink-0 flex flex-col rounded-xl ${cfg.bg} border ${cfg.border} overflow-hidden`}>
      {/* Header */}
      <div className='px-3 py-2 border-b border-white/50'>
        <div 
          className='flex items-center justify-between cursor-pointer hover:opacity-80'
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className='flex items-center gap-2'>
            <Icon className={`w-4 h-4 ${cfg.icon}`} />
            <span className='font-medium text-gray-700 text-sm'>{title}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
              {count}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-gray-600'>{total.toFixed(0)}€</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </div>
        </div>
        
        {/* Actions de colonne (sélection) */}
        {!collapsed && onSelectAll && items.length > 0 && (
          <div className='flex items-center justify-between mt-2 pt-2 border-t border-white/30'>
            <button
              onClick={(e) => { e.stopPropagation(); onSelectAll(); }}
              className='text-[10px] text-gray-500 hover:text-gray-700 flex items-center gap-1'
            >
              <CheckSquare className='w-3 h-3' />
              Tout sélectionner
            </button>
            {selectedInColumn > 0 && (
              <span className='text-[10px] text-blue-600 font-medium'>
                {selectedInColumn} sél.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className='flex-1 overflow-y-auto p-2 space-y-2'>
          {items.length === 0 ? (
            <div className='flex items-center justify-center py-6 text-gray-400 text-sm'>
              {emptyText}
            </div>
          ) : (
            <>
              {displayItems.map(item => (
                <KanbanCard
                  key={item.id}
                  paiement={item}
                  onClick={() => onItemClick(item)}
                  onAnnuler={onAnnuler}
                  isPriority={isPriority}
                  isPaid={isPaid}
                  isCancelled={isCancelled}
                  isWaitingPointage={isWaitingPointage}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
              {hasMore && !showAll && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
                  className='w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors'
                >
                  +{items.length - 12} autres
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CARTE KANBAN
// ═══════════════════════════════════════════════════════════════════════════
function KanbanCard({ paiement, onClick, onAnnuler, onPayerDirect, isPriority, isPaid, isCancelled, isWaitingPointage, isSelected, onToggleSelect }) {
  const { employe, date, heures, montant, pointageValide, arriveeReelle, departReelle, methodePaiement, payeLe, commentaire, source, ecartHeures } = paiement;
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmAnnuler, setShowConfirmAnnuler] = useState(false);
  
  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Récupérer les heures du segment
  const segment = paiement.shift?.segments?.[paiement.segmentIndex];
  const horaires = segment ? `${segment.start} - ${segment.end}` : null;
  const heureFin = segment?.end || null;
  
  // Vérifier si le shift a été modifié (commentaire contient ~~ancien~~)
  const hasModification = commentaire && commentaire.includes('~~');
  
  // Source du paiement
  const sourceLabels = {
    shift_extra: { label: 'Extra', color: 'text-blue-500' },
    anomalie_extra: { label: 'Anomalie', color: 'text-orange-500' },
    anomalie_heures_sup: { label: 'H.Sup', color: 'text-orange-500' },
    ajustement: { label: 'Ajust.', color: 'text-purple-500' },
    manuel: { label: 'Manuel', color: 'text-gray-500' },
    conversion_anomalie: { label: 'Conv.', color: 'text-pink-500' }
  };
  const sourceInfo = source ? sourceLabels[source] : null;
  
  // Écart heures (si pointé et différent)
  const ecart = ecartHeures ? Number(ecartHeures) : 0;

  // Badge méthode paiement
  const methodeBadge = {
    especes: { icon: Wallet, label: 'Esp.', color: 'text-green-600' },
    virement: { icon: Building2, label: 'Vir.', color: 'text-blue-600' },
    cheque: { icon: FileText, label: 'Chq.', color: 'text-purple-600' }
  };
  const methodeInfo = methodePaiement ? methodeBadge[methodePaiement] : null;

  // Calcul retard (jours depuis la date de l'extra)
  const joursRetard = useMemo(() => {
    if (!isPriority) return 0;
    const diffTime = new Date() - new Date(date);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [date, isPriority]);

  // ═══ CALCUL STATUT POINTAGE POUR ATTENTE ═══
  const pointageStatus = useMemo(() => {
    if (!isWaitingPointage) return null;
    
    // CAS SPÉCIAL: ENTRÉE pointée mais pas SORTIE (bloqué)
    if (paiement._blockedEntreeSansSortie) {
      return { 
        level: 'blocked', 
        label: `${paiement._blockedSinceHours}h`, 
        color: 'bg-purple-500', 
        textColor: 'text-purple-600',
        message: `Entrée pointée à ${arriveeReelle}, départ manquant depuis ${paiement._blockedSinceHours}h`
      };
    }
    
    // Si arrivée pointée mais pas départ (détection directe)
    if (arriveeReelle && !departReelle) {
      const segment = paiement.shift?.segments?.[paiement.segmentIndex];
      if (segment?.end) {
        const [h, m] = segment.end.split(':').map(Number);
        const heureFin = new Date(date);
        heureFin.setHours(h, m, 0, 0);
        const now = new Date();
        const diffH = Math.floor((now - heureFin) / (1000 * 60 * 60));
        if (diffH > 2) {
          return { 
            level: 'blocked', 
            label: `${diffH}h`, 
            color: 'bg-purple-500', 
            textColor: 'text-purple-600',
            message: `Entrée pointée à ${arriveeReelle}, départ manquant depuis ${diffH}h`
          };
        }
      }
    }
    
    const now = new Date();
    const pDate = new Date(date);
    pDate.setHours(0, 0, 0, 0);
    
    // Récupérer aussi l'heure de début pour détecter les shifts de nuit
    const heureDebut = segment?.start || null;
    
    // Calculer quand le segment devait se terminer
    let heureFinSegment = null;
    if (heureFin) {
      const [hFin, mFin] = heureFin.split(':').map(Number);
      heureFinSegment = new Date(pDate);
      heureFinSegment.setHours(hFin, mFin, 0, 0);
      
      // Détecter si c'est un shift de nuit (début > fin, ex: 22:00-02:00)
      if (heureDebut) {
        const [hDebut] = heureDebut.split(':').map(Number);
        // Si début >= 18h et fin < 10h, c'est un shift de nuit → fin = lendemain
        if (hDebut >= 18 && hFin < 10) {
          heureFinSegment.setDate(heureFinSegment.getDate() + 1);
        }
      }
    }
    
    // Calculer le retard en heures depuis la fin prévue
    if (heureFinSegment && now > heureFinSegment) {
      const diffMs = now - heureFinSegment;
      const diffHeures = diffMs / (1000 * 60 * 60);
      const diffJours = Math.floor(diffHeures / 24);
      
      if (diffJours >= 1) {
        // Plus de 24h - problème
        return { level: 'critical', label: `+${diffJours}j`, color: 'bg-red-500', textColor: 'text-red-600' };
      } else if (diffHeures >= 2) {
        // 2h+ de retard
        return { level: 'warning', label: 'Retard', color: 'bg-orange-500', textColor: 'text-orange-600' };
      }
    }
    
    // Heure pas encore passée ou < 2h de retard
    return { level: 'waiting', label: '', color: 'bg-orange-400', textColor: 'text-orange-500' };
  }, [isWaitingPointage, date, heureFin, paiement, arriveeReelle, departReelle]);

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg p-2.5 border cursor-pointer transition-all hover:shadow-sm relative ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-300' :
        isWaitingPointage && pointageStatus?.level === 'blocked' ? 'border-purple-300 hover:border-purple-400 bg-purple-50/30' :
        isWaitingPointage && pointageStatus?.level === 'critical' ? 'border-red-300 hover:border-red-400 bg-red-50/30' :
        isWaitingPointage && pointageStatus?.level === 'warning' ? 'border-orange-300 hover:border-orange-400' :
        isWaitingPointage ? 'border-orange-200 hover:border-orange-300' :
        isPriority ? 'border-amber-200 hover:border-amber-300' :
        isPaid ? 'border-emerald-200 hover:border-emerald-300' :
        isCancelled ? 'border-gray-200 opacity-60' :
        'border-blue-200 hover:border-blue-300'
      }`}
    >
      {/* Checkbox de sélection */}
      {onToggleSelect && !isPaid && !isCancelled && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(paiement.id); }}
          className='absolute -left-1 -top-1 w-5 h-5 rounded bg-white border border-gray-300 shadow-sm flex items-center justify-center hover:border-blue-400 transition-colors'
        >
          {isSelected ? (
            <CheckSquare className='w-4 h-4 text-blue-600' />
          ) : (
            <Square className='w-4 h-4 text-gray-300' />
          )}
        </button>
      )}

      {/* Badge retard paiement (colonne À payer) */}
      {isPriority && joursRetard > 3 && (
        <div className='absolute -right-1 -top-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center gap-0.5'>
          <AlertTriangle className='w-2.5 h-2.5' />
          {joursRetard}j
        </div>
      )}

      {/* Badge attente pointage avec niveau progressif */}
      {isWaitingPointage && pointageStatus && (
        <div 
          className={`absolute -right-1 -top-1 px-1.5 py-0.5 ${pointageStatus.color} text-white text-[9px] font-bold rounded-full flex items-center gap-0.5`} 
          title={pointageStatus.level === 'blocked' ? pointageStatus.message :
                 pointageStatus.level === 'critical' ? 'Pointage manquant depuis plusieurs jours !' : 
                 pointageStatus.level === 'warning' ? 'Heure de fin dépassée' : 
                 'En attente de pointage'}
        >
          {pointageStatus.level === 'blocked' ? (
            <><Zap className='w-2.5 h-2.5' />{pointageStatus.label}</>
          ) : pointageStatus.level === 'critical' ? (
            <><AlertTriangle className='w-2.5 h-2.5' />{pointageStatus.label}</>
          ) : pointageStatus.level === 'warning' ? (
            <AlertCircle className='w-2.5 h-2.5' />
          ) : (
            <><Clock className='w-2.5 h-2.5' />{pointageStatus.label}</>
          )}
        </div>
      )}

      {/* Ligne 1: Nom + Montant */}
      <div className='flex items-center justify-between mb-1'>
        <div className='flex items-center gap-2 min-w-0'>
          <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold ${
            isPaid ? 'bg-emerald-500' : 
            isWaitingPointage && pointageStatus?.level === 'blocked' ? 'bg-purple-500' :
            isWaitingPointage && pointageStatus?.level === 'critical' ? 'bg-red-500' :
            isWaitingPointage ? 'bg-orange-500' :
            isPriority ? 'bg-amber-500' : 
            isCancelled ? 'bg-gray-400' : 'bg-blue-500'
          }`}>
            {employe?.prenom?.[0]}{employe?.nom?.[0]}
          </div>
          <span className='text-sm font-medium text-gray-800 truncate'>
            {employe?.prenom} {employe?.nom}
          </span>
        </div>
        <span className={`text-sm font-bold flex-shrink-0 ${
          isPaid ? 'text-emerald-600' : 
          isWaitingPointage && pointageStatus?.level === 'blocked' ? 'text-purple-600' :
          isWaitingPointage ? 'text-orange-600' :
          isPriority ? 'text-amber-600' : 
          isCancelled ? 'text-gray-400' : 'text-blue-600'
        }`}>
          {Number(montant).toFixed(0)}€
        </span>
      </div>

      {/* Ligne 2: Date + Horaires + Heures + Badges */}
      <div className='flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 flex-wrap'>
        <span>{formatDate(date)}</span>
        {horaires && (
          <>
            <span className='text-gray-300'>•</span>
            <Clock className='w-3 h-3' />
            <span>{horaires}</span>
          </>
        )}
        <span className='text-gray-300'>•</span>
        <span>{Number(heures).toFixed(1)}h</span>
        {/* Écart heures si pointé */}
        {ecart !== 0 && (
          <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
            ecart > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`} title={`Écart: ${ecart > 0 ? '+' : ''}${ecart.toFixed(1)}h`}>
            {ecart > 0 ? '+' : ''}{ecart.toFixed(1)}h
          </span>
        )}
        {/* Indicateur modification */}
        {hasModification && (
          <span className='px-1 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px] font-medium flex items-center gap-0.5' title='Horaires modifiés'>
            <Pencil className='w-2.5 h-2.5' />
          </span>
        )}
        {/* Source si pas standard */}
        {sourceInfo && source !== 'shift_extra' && (
          <span className={`ml-auto px-1 py-0.5 bg-gray-100 rounded text-[9px] font-medium ${sourceInfo.color}`}>
            {sourceInfo.label}
          </span>
        )}
      </div>

      {/* Ligne 3: Statut contextuel */}
      <div className='flex items-center justify-between'>
        {/* Statut pointage / planifié / payé */}
        {isPriority ? (
          // À payer: montrer statut pointage
          pointageValide ? (
            <div className='flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded'>
              <CheckCircle2 className='w-3 h-3' />
              <span>Pointé</span>
              {arriveeReelle && departReelle && (
                <span className='text-emerald-500'>({arriveeReelle}-{departReelle})</span>
              )}
            </div>
          ) : (
            <div className='flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded'>
              <CircleDot className='w-3 h-3' />
              <span>Non pointé</span>
            </div>
          )
        ) : isPaid ? (
          // Payé: montrer méthode + date
          <div className='flex items-center gap-1.5'>
            {methodeInfo && (
              <div className={`flex items-center gap-1 text-[11px] ${methodeInfo.color} bg-gray-50 px-1.5 py-0.5 rounded`}>
                <methodeInfo.icon className='w-3 h-3' />
                <span>{methodeInfo.label}</span>
              </div>
            )}
            <div className='flex items-center gap-1 text-[11px] text-gray-400'>
              <Lock className='w-3 h-3' />
              {payeLe && formatDate(payeLe)}
            </div>
          </div>
        ) : isCancelled ? (
          <div className='flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded'>
            <Ban className='w-3 h-3' />
            <span>Annulé</span>
          </div>
        ) : (
          // Programmé
          <div className='flex items-center gap-1 text-[11px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded'>
            <CalendarClock className='w-3 h-3' />
            <span>Planifié</span>
          </div>
        )}

        {/* Actions rapides */}
        <div className='flex items-center gap-1'>
          {/* Menu contextuel */}
          {!isPaid && !isCancelled && onAnnuler && (
            <div className='relative'>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className='p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500'
              >
                <MoreHorizontal className='w-4 h-4' />
              </button>
              {showMenu && (
                <div className='absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setShowConfirmAnnuler(true);
                    }}
                    className='w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 whitespace-nowrap'
                  >
                    <Ban className='w-3 h-3' />
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation d'annulation inline */}
      {showConfirmAnnuler && (
        <div 
          className='absolute inset-0 bg-white/95 backdrop-blur-sm rounded-lg z-20 flex flex-col items-center justify-center p-3 border-2 border-red-200'
          onClick={(e) => e.stopPropagation()}
        >
          <Ban className='w-5 h-5 text-red-500 mb-1.5' />
          <p className='text-sm font-medium text-gray-800 mb-1'>Annuler cet extra ?</p>
          <p className='text-xs text-gray-500 mb-3 text-center'>
            {employe?.prenom} {employe?.nom} — {Number(heures).toFixed(1)}h
          </p>
          <div className='flex gap-2'>
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirmAnnuler(false); }}
              className='px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
            >
              Non
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnnuler(paiement.id, 'Annulé manuellement');
                setShowConfirmAnnuler(false);
              }}
              className='px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors'
            >
              Oui, annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL PAYER
// ═══════════════════════════════════════════════════════════════════════════
function PayerModal({ paiement, onClose, onConfirm, loading }) {
  const [methode, setMethode] = useState('especes');
  const [reference, setReference] = useState('');
  const [tauxHoraire, setTauxHoraire] = useState(10);

  const heures = Number(paiement.heures || 0);
  const montantCalcule = heures * tauxHoraire;
  const segment = paiement.shift?.segments?.[paiement.segmentIndex];

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const methodes = [
    { value: 'especes', label: 'Espèces', icon: Wallet, shortcut: '1' },
    { value: 'virement', label: 'Virement', icon: Building2, shortcut: '2' },
    { value: 'cheque', label: 'Chèque', icon: FileText, shortcut: '3' }
  ];

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !loading) {
        onConfirm(paiement.id, methode, reference, tauxHoraire);
      } else if (e.key === '1') {
        setMethode('especes');
      } else if (e.key === '2') {
        setMethode('virement');
      } else if (e.key === '3') {
        setMethode('cheque');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onConfirm, paiement.id, methode, reference, tauxHoraire, loading]);

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden'>
        {/* Header */}
        <div className='bg-gradient-to-r from-[#cf292c] to-[#e85a5d] px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold'>
                {paiement.employe?.prenom?.[0]}{paiement.employe?.nom?.[0]}
              </div>
              <div>
                <h2 className='text-sm font-semibold text-white'>
                  {paiement.employe?.prenom} {paiement.employe?.nom}
                </h2>
                <p className='text-xs text-white/70'>{formatDate(paiement.date)}</p>
              </div>
            </div>
            <button onClick={onClose} className='p-1 rounded-lg hover:bg-white/10 text-white/80' title='Échap pour fermer'>
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className='p-4 space-y-3'>
          {/* Résumé + Pointage */}
          <div className='bg-gray-50 rounded-lg p-3'>
            {/* Programmé */}
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-2 h-2 rounded-full bg-[#cf292c]/30 flex-shrink-0'></div>
              <span className='text-xs text-gray-500 w-20'>Programmé</span>
              <span className='text-sm font-medium text-gray-800'>
                {segment ? `${segment.start} - ${segment.end}` 
                  : paiement.segmentInitial ? paiement.segmentInitial.replace('-', ' - ')
                  : <span className='text-gray-400 italic'>Aucun shift prévu</span>}
              </span>
            </div>

            {/* Pointé */}
            <div className='flex items-center gap-2 mb-3'>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${paiement.pointageValide ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
              <span className='text-xs text-gray-500 w-20'>Pointé</span>
              {paiement.pointageValide ? (
                <span className='text-sm font-medium text-emerald-700'>
                  {paiement.arriveeReelle || paiement.anomalie?.details?.heureArriveeReelle || '—'}
                  {' - '}
                  {paiement.departReelle || paiement.anomalie?.details?.heureDepartReelle || '—'}
                </span>
              ) : (
                <span className='text-sm font-medium text-red-500'>Non pointé</span>
              )}
            </div>

            {/* Séparateur + Extra à payer */}
            <div className='border-t border-gray-200 pt-2 flex items-center justify-between'>
              <span className='text-xs font-medium text-[#cf292c] uppercase'>Extra à payer</span>
              <span className='text-lg font-bold text-[#cf292c]'>
                {(() => { const h = Math.floor(heures); const m = Math.round((heures - h) * 60); return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2,'0') : ''}` : `${m}min`; })()}
              </span>
            </div>

            {/* Alerte si non pointé */}
            {!paiement.pointageValide && (
              <div className='mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded border border-red-200'>
                <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' />
                <span className='font-medium'>Aucun pointage — paiement non recommandé</span>
              </div>
            )}
          </div>

          {/* Taux horaire */}
          <div>
            <label className='block text-xs font-medium text-gray-600 mb-1'>Taux horaire</label>
            <div className='flex items-center gap-2'>
              <input
                type='number'
                value={tauxHoraire}
                onChange={e => setTauxHoraire(Number(e.target.value) || 10)}
                min='1'
                step='0.5'
                className='flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]'
              />
              <span className='text-sm text-gray-500'>€/h</span>
            </div>
          </div>

          {/* Méthode de paiement */}
          <div>
            <label className='block text-xs font-medium text-gray-600 mb-1'>Mode de paiement <span className='text-gray-400 font-normal'>(1, 2, 3)</span></label>
            <div className='grid grid-cols-3 gap-2'>
              {methodes.map(m => {
                const Icon = m.icon;
                const isActive = methode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMethode(m.value)}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      isActive 
                        ? 'border-[#cf292c] bg-red-50 text-[#cf292c]' 
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    title={`Appuyez sur ${m.shortcut}`}
                  >
                    <span className='absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-100 text-[9px] font-bold text-gray-400 flex items-center justify-center'>
                      {m.shortcut}
                    </span>
                    <Icon className='w-4 h-4' />
                    <span className='text-xs font-medium'>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Référence */}
          {methode !== 'especes' && (
            <div>
              <label className='block text-xs font-medium text-gray-600 mb-1'>Référence</label>
              <input
                type='text'
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder={methode === 'virement' ? 'Réf. virement...' : 'N° chèque...'}
                className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]'
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-4 py-3 bg-gray-50 border-t flex items-center justify-between'>
          <button
            onClick={onClose}
            className='px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1'
            title='Échap'
          >
            Annuler <span className='text-[10px] text-gray-400'>(Échap)</span>
          </button>
          <button
            onClick={() => onConfirm(paiement.id, methode, reference, tauxHoraire)}
            disabled={loading}
            className='px-4 py-2 bg-[#cf292c] hover:bg-[#b02025] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2'
            title='Entrée'
          >
            {loading ? (
              <RefreshCw className='w-4 h-4 animate-spin' />
            ) : (
              <Check className='w-4 h-4' />
            )}
            Payer {montantCalcule.toFixed(0)}€ <span className='text-[10px] opacity-70'>(Entrée)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DETAIL
// ═══════════════════════════════════════════════════════════════════════════
function DetailModal({ paiement, onClose, onAnnuler }) {
  const [showConfirmAnnulation, setShowConfirmAnnulation] = useState(false);
  const [raisonAnnulation, setRaisonAnnulation] = useState('');
  const [isAnnulating, setIsAnnulating] = useState(false);
  
  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const segment = paiement.shift?.segments?.[paiement.segmentIndex];

  const methodeBadge = {
    especes: { icon: Wallet, label: 'Espèces', color: 'text-green-600' },
    virement: { icon: Building2, label: 'Virement', color: 'text-blue-600' },
    cheque: { icon: FileText, label: 'Chèque', color: 'text-purple-600' }
  };
  const methodeInfo = paiement.methodePaiement ? methodeBadge[paiement.methodePaiement] : null;

  // Raccourci clavier Échap pour fermer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden'>
        {/* Header */}
        <div className={`px-4 py-3 ${
          paiement.statut === 'paye' ? 'bg-emerald-500' :
          paiement.statut === 'annule' ? 'bg-gray-500' :
          'bg-blue-500'
        }`}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold'>
                {paiement.employe?.prenom?.[0]}{paiement.employe?.nom?.[0]}
              </div>
              <div>
                <h2 className='text-sm font-semibold text-white'>
                  {paiement.employe?.prenom} {paiement.employe?.nom}
                </h2>
                <p className='text-xs text-white/70 capitalize'>{formatDate(paiement.date)}</p>
              </div>
            </div>
            <button onClick={onClose} className='p-1 rounded-lg hover:bg-white/10 text-white/80' title='Échap pour fermer'>
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className='p-4 space-y-3'>
          {/* Ligne 1: Statut + Montant */}
          <div className='flex items-center justify-between'>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              paiement.statut === 'paye' ? 'bg-emerald-100 text-emerald-700' :
              paiement.statut === 'annule' ? 'bg-gray-100 text-gray-600' :
              'bg-amber-100 text-amber-700'
            }`}>
              {paiement.statut === 'paye' ? <CheckCircle2 className='w-3.5 h-3.5' /> :
               paiement.statut === 'annule' ? <Ban className='w-3.5 h-3.5' /> :
               <Clock className='w-3.5 h-3.5' />}
              {paiement.statut === 'paye' ? 'Payé' :
               paiement.statut === 'annule' ? 'Annulé' : 'À payer'}
            </div>
            <div className='text-right'>
              <div className='text-2xl font-bold text-emerald-600'>{Number(paiement.montant).toFixed(0)}€</div>
              <div className='text-[10px] text-gray-400'>{Number(paiement.heures).toFixed(1)}h × {Number(paiement.tauxHoraire || 10)}€</div>
            </div>
          </div>

          {/* Ligne 2: Shift prévu vs Extra */}
          <div className='grid grid-cols-2 gap-2'>
            <div className='bg-gray-50 rounded-lg p-2.5'>
              <div className='text-[10px] text-gray-400 uppercase mb-1'>Shift prévu</div>
              <div className='text-base font-semibold text-gray-800'>
                {segment ? `${segment.start} - ${segment.end}` : paiement.segmentInitial?.replace('-', ' - ') || '-'}
              </div>
            </div>
            <div className='bg-emerald-50 rounded-lg p-2.5 border border-emerald-200'>
              <div className='text-[10px] text-emerald-600 uppercase mb-1'>Extra (+{Number(paiement.heures).toFixed(1)}h)</div>
              <div className='text-base font-bold text-emerald-700'>
                {(() => {
                  const finPrevue = segment?.end || paiement.segmentInitial?.split('-')[1]?.trim();
                  const departReel = paiement.departReelle;
                  if (finPrevue && departReel) return `${finPrevue} → ${departReel}`;
                  return '-';
                })()}
              </div>
            </div>
          </div>
          
          {/* Ligne 3: Source + Pointage */}
          <div className='flex items-center justify-between'>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              paiement.source === 'shift_extra' ? 'bg-blue-100 text-blue-600' :
              paiement.source === 'anomalie_extra' ? 'bg-orange-100 text-orange-600' :
              paiement.source === 'anomalie_heures_sup' ? 'bg-orange-100 text-orange-600' :
              paiement.source === 'ajustement' ? 'bg-purple-100 text-purple-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {paiement.source === 'shift_extra' ? 'Shift Extra' :
               paiement.source === 'anomalie_extra' ? 'Anomalie' :
               paiement.source === 'anomalie_heures_sup' ? 'Heures Sup' :
               paiement.source === 'ajustement' ? 'Ajustement' : 'Manuel'}
            </span>
            {paiement.pointageValide && (
              <span className='text-xs text-emerald-600 flex items-center gap-1'>
                <CheckCircle2 className='w-3.5 h-3.5' />
                {paiement.arriveeReelle} → {paiement.departReelle}
              </span>
            )}
          </div>

          {/* Ligne 4: Paiement info (si payé) */}
          {paiement.statut === 'paye' && (
            <div className='bg-gray-50 rounded-lg p-2.5'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-gray-500'>Payé le</span>
                <span className='font-medium text-gray-700'>{formatDateTime(paiement.payeLe)}</span>
              </div>
              {paiement.payeur && (
                <div className='flex items-center justify-between text-sm mt-1'>
                  <span className='text-gray-500'>Par</span>
                  <span className='font-medium text-gray-700'>{paiement.payeur.prenom} {paiement.payeur.nom}</span>
                </div>
              )}
              {methodeInfo && (
                <div className='flex items-center gap-1.5 mt-1'>
                  <methodeInfo.icon className={`w-3.5 h-3.5 ${methodeInfo.color}`} />
                  <span className='text-sm text-emerald-700'>{methodeInfo.label}</span>
                </div>
              )}
            </div>
          )}

          {/* Commentaire avec formatage (ancien barré, nouveau en gras) */}
          {paiement.commentaire && (
            <div className='bg-gray-50 rounded-lg p-2.5'>
              <span className='text-[10px] text-gray-500 uppercase'>Note</span>
              <p className='text-sm text-gray-700 mt-0.5'>
                <FormattedComment text={paiement.commentaire} />
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-4 py-3 bg-gray-50 border-t space-y-2'>
          {/* Bouton Annuler le paiement - seulement si pas déjà annulé */}
          {paiement.statut !== 'annule' && !showConfirmAnnulation && (
            <button
              onClick={() => setShowConfirmAnnulation(true)}
              className='w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors border border-red-200 flex items-center justify-center gap-2'
            >
              <Ban className='w-4 h-4' />
              Annuler le paiement
            </button>
          )}
          
          {/* Confirmation d'annulation */}
          {showConfirmAnnulation && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-3 space-y-2'>
              <div className='flex items-center gap-2 text-red-700 font-medium text-sm'>
                <AlertTriangle className='w-4 h-4' />
                Confirmer l'annulation ?
              </div>
              {paiement.statut === 'paye' && (
                <div className='text-xs text-red-600 bg-red-100 p-2 rounded'>
                  ⚠️ Ce paiement a déjà été effectué. L'annulation ne récupérera pas l'argent.
                </div>
              )}
              <input
                type='text'
                placeholder='Raison (optionnel)'
                value={raisonAnnulation}
                onChange={(e) => setRaisonAnnulation(e.target.value)}
                className='w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-300 focus:border-red-300'
              />
              <div className='flex gap-2'>
                <button
                  onClick={() => { setShowConfirmAnnulation(false); setRaisonAnnulation(''); }}
                  className='flex-1 py-2 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg border border-gray-200'
                >
                  Non
                </button>
                <button
                  onClick={async () => {
                    setIsAnnulating(true);
                    try {
                      await onAnnuler(paiement.id, raisonAnnulation, paiement.statut === 'paye');
                      onClose();
                    } catch (err) {
                      console.error('Erreur annulation:', err);
                    } finally {
                      setIsAnnulating(false);
                    }
                  }}
                  disabled={isAnnulating}
                  className='flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-1'
                >
                  {isAnnulating ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <>Oui, annuler</>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Bouton Fermer */}
          {!showConfirmAnnulation && (
            <button
              onClick={onClose}
              className='w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors'
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExtrasManagerKanban;
