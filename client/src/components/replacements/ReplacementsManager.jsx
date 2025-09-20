import React, { useState, useEffect, useCallback } from 'react';
import { HiUsers, HiClock, HiExclamation, HiCheck, HiX } from 'react-icons/hi';

// Vue principale de gestion des remplacements
function ReplacementsManager() {
  const token = localStorage.getItem('token');
  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ service: 'all', status: 'active', urgency: 'all' });
  
  // Stats rapides
  const stats = {
    urgent: replacements.filter(r => r.urgency === 'urgent').length,
    candidates: replacements.filter(r => r.status === 'candidates').length,
    week: replacements.filter(r => isThisWeek(new Date(r.createdAt))).length
  };

  const fetchReplacements = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Mock data pour démo - remplacer par vraie API
      const mockData = generateMockReplacements();
      setReplacements(mockData);
    } catch (e) {
      console.error('Erreur chargement remplacements:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchReplacements(); }, [fetchReplacements]);

  const groupedReplacements = {
    open: replacements.filter(r => r.status === 'open'),
    candidates: replacements.filter(r => r.status === 'candidates'), 
    assigned: replacements.filter(r => r.status === 'assigned'),
    recent: replacements.filter(r => r.status === 'closed').slice(0, 5)
  };

  if (loading) return <div className='p-6'>Chargement...</div>;

  return (
    <div className='p-4 lg:p-6 space-y-6 bg-gray-50 min-h-screen'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <HiUsers className='w-5 h-5 text-[#cf292c]' />
          <h1 className='text-lg font-semibold text-gray-800'>Remplacements & Échanges</h1>
        </div>
        
        <div className='flex flex-wrap gap-2'>
          <button className='px-3 py-2 text-sm rounded bg-[#cf292c] text-white hover:bg-[#b8252a] font-medium'>
            ➕ Créer remplacement
          </button>
          <button className='px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50'>
            🔁 Proposer échange
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className='flex flex-wrap gap-4 text-sm'>
        <div className='flex items-center gap-2'>
          <span className='w-3 h-3 rounded-full bg-red-500'></span>
          <span>Urgent: <strong>{stats.urgent}</strong></span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='w-3 h-3 rounded-full bg-yellow-500'></span>
          <span>Candidatures: <strong>{stats.candidates}</strong></span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='w-3 h-3 rounded-full bg-blue-500'></span>
          <span>Cette semaine: <strong>{stats.week}</strong></span>
        </div>
      </div>

      {/* Filtres */}
      <div className='bg-white p-4 rounded-lg border flex flex-wrap gap-4'>
        <select value={filters.service} onChange={e => setFilters(f => ({...f, service: e.target.value}))}
                className='px-3 py-1 border rounded text-sm'>
          <option value="all">Tous les services</option>
          <option value="caisse">Caisse</option>
          <option value="cuisine">Cuisine</option>
          <option value="salle">Salle</option>
        </select>
        
        <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}
                className='px-3 py-1 border rounded text-sm'>
          <option value="active">Actifs</option>
          <option value="all">Tous</option>
          <option value="closed">Clos</option>
        </select>
        
        <select value={filters.urgency} onChange={e => setFilters(f => ({...f, urgency: e.target.value}))}
                className='px-3 py-1 border rounded text-sm'>
          <option value="all">Toute urgence</option>
          <option value="urgent">Urgent seulement</option>
          <option value="planned">Planifié</option>
        </select>
      </div>

      {/* Vue Kanban */}
      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
        {/* À pourvoir */}
        <KanbanColumn 
          title="À POURVOIR" 
          count={groupedReplacements.open.length}
          color="red"
          items={groupedReplacements.open}
        />
        
        {/* Candidatures */}
        <KanbanColumn 
          title="CANDIDATURES" 
          count={groupedReplacements.candidates.length}
          color="yellow"
          items={groupedReplacements.candidates}
        />
        
        {/* Assigné */}
        <KanbanColumn 
          title="ASSIGNÉ" 
          count={groupedReplacements.assigned.length}
          color="green"
          items={groupedReplacements.assigned}
        />
        
        {/* Récents */}
        <KanbanColumn 
          title="RÉCENTS" 
          count={groupedReplacements.recent.length}
          color="gray"
          items={groupedReplacements.recent}
        />
      </div>
    </div>
  );
}

// Colonne Kanban
const KanbanColumn = ({ title, count, color, items }) => {
  const colorMap = {
    red: 'border-red-200 bg-red-50',
    yellow: 'border-yellow-200 bg-yellow-50', 
    green: 'border-green-200 bg-green-50',
    gray: 'border-gray-200 bg-gray-50'
  };

  return (
    <div className={`rounded-lg border-2 ${colorMap[color]} p-4`}>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='font-semibold text-sm text-gray-700'>{title}</h3>
        <span className='bg-white px-2 py-1 rounded text-xs font-medium'>{count}</span>
      </div>
      
      <div className='space-y-3'>
        {items.map(item => (
          <ReplacementCard key={item.id} replacement={item} compact />
        ))}
      </div>
    </div>
  );
};

// Carte remplacement compacte
const ReplacementCard = ({ replacement, compact = false }) => {
  const { originalShift, urgency, candidates = [], status } = replacement;
  const urgencyColor = urgency === 'urgent' ? 'bg-red-500' : urgency === 'soon' ? 'bg-orange-500' : 'bg-gray-400';
  const statusIcon = {
    open: <HiExclamation className='w-4 h-4 text-red-500' />,
    candidates: <HiClock className='w-4 h-4 text-yellow-500' />,
    assigned: <HiCheck className='w-4 h-4 text-green-500' />,
    closed: <HiX className='w-4 h-4 text-gray-400' />
  };

  return (
    <div className='bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow'>
      <div className='flex items-start justify-between mb-2'>
        <div className='flex items-center gap-2'>
          {statusIcon[status]}
          <span className='text-xs font-medium text-gray-600'>#{replacement.id.slice(-3)}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] text-white font-medium ${urgencyColor}`}>
          {urgency}
        </span>
      </div>
      
      <div className='space-y-1'>
        <div className='text-sm font-medium text-gray-800'>
          {originalShift?.service || 'Service'} • {formatTime(originalShift?.start)}–{formatTime(originalShift?.end)}
        </div>
        <div className='text-xs text-gray-600'>
          👤 → {originalShift?.employeeName || 'Employé'}
        </div>
        {candidates.length > 0 && (
          <div className='text-xs text-blue-600'>
            👥 {candidates.length} candidat{candidates.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      <div className='flex gap-1 mt-3'>
        <button className='flex-1 px-2 py-1 text-[10px] border rounded hover:bg-gray-50'>
          Voir
        </button>
        {status === 'candidates' && (
          <button className='px-2 py-1 text-[10px] bg-green-500 text-white rounded hover:bg-green-600'>
            Assigner
          </button>
        )}
      </div>
    </div>
  );
};

// Utilitaires
const formatTime = (dateStr) => {
  if (!dateStr) return '--h--';
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const isThisWeek = (date) => {
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  return date >= weekStart;
};

// Mock data pour démo
const generateMockReplacements = () => [
  {
    id: 'repl_001',
    type: 'replacement',
    status: 'open',
    urgency: 'urgent',
    originalShift: {
      id: 'shift_123',
      employeeName: 'Martin Dupont',
      start: '2025-08-22T09:00:00Z',
      end: '2025-08-22T17:00:00Z',
      service: 'Caisse'
    },
    createdAt: '2025-08-22T08:00:00Z',
    candidates: []
  },
  {
    id: 'repl_002', 
    type: 'replacement',
    status: 'candidates',
    urgency: 'soon',
    originalShift: {
      id: 'shift_124',
      employeeName: 'Sophie Martin',
      start: '2025-08-22T14:00:00Z', 
      end: '2025-08-22T20:00:00Z',
      service: 'Salle'
    },
    createdAt: '2025-08-22T07:30:00Z',
    candidates: [
      { employeeName: 'Julie Petit', score: 85 },
      { employeeName: 'Luc Martin', score: 78 },
      { employeeName: 'Anne Dubois', score: 92 }
    ]
  },
  {
    id: 'repl_003',
    type: 'replacement', 
    status: 'assigned',
    urgency: 'planned',
    originalShift: {
      id: 'shift_125',
      employeeName: 'Paul Lemaire',
      start: '2025-08-22T06:00:00Z',
      end: '2025-08-22T14:00:00Z', 
      service: 'Cuisine'
    },
    createdAt: '2025-08-21T16:00:00Z',
    assignedTo: 'Marie Rousseau'
  },
  {
    id: 'repl_004',
    type: 'replacement',
    status: 'closed',
    urgency: 'urgent',
    originalShift: {
      id: 'shift_126', 
      employeeName: 'Claire Moreau',
      start: '2025-08-21T10:00:00Z',
      end: '2025-08-21T18:00:00Z',
      service: 'Caisse'
    },
    createdAt: '2025-08-21T09:30:00Z',
    closedAt: '2025-08-21T11:45:00Z'
  }
];

export default ReplacementsManager;
