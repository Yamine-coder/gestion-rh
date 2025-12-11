// src/components/ReplacementSuggestionModal.jsx
import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  Clock, 
  Star, 
  AlertCircle, 
  CheckCircle, 
  Users,
  Calendar,
  Briefcase
} from 'lucide-react';

const ReplacementSuggestionModal = ({ 
  show, 
  onClose, 
  absentEmployee, 
  date, 
  allEmployees = [], 
  shifts = [], 
  onAssignReplacement 
}) => {
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [replacementNote, setReplacementNote] = useState('');

  // Calculer les suggestions de remplaçants
  const replacementSuggestions = useMemo(() => {
    if (!absentEmployee || !date || !allEmployees.length) return [];

    const targetDate = date;
    const absentCategory = absentEmployee.categorie || '';
    
    const suggestions = allEmployees
      .filter(emp => emp.id !== absentEmployee.id)
      .map(emp => {
        let score = 0;
        let reasons = [];
        let availability = 'available';

        // Vérifier disponibilité
        const hasShift = shifts.find(s => 
          s.employeId === emp.id && 
          new Date(s.date).toDateString() === new Date(targetDate).toDateString()
        );
        
        if (hasShift && hasShift.type === 'travail') {
          availability = 'busy';
          score -= 30;
        } else if (hasShift && hasShift.type === 'absence') {
          availability = 'absent';
          score -= 50;
        }

        // Score basé sur la catégorie
        if (emp.categorie === absentCategory) {
          score += 40;
          reasons.push(`Même département (${absentCategory})`);
        } else if (emp.categorie && absentCategory && 
                  (emp.categorie.includes('polyvalent') || absentCategory.includes('polyvalent'))) {
          score += 30;
          reasons.push('Profil polyvalent');
        }

        // Bonus pour expérience (approximation basée sur l'ancienneté simulée)
        if (emp.email && emp.email.includes('senior')) {
          score += 20;
          reasons.push('Expérience senior');
        }

        // Bonus pour formations croisées (simulation)
        if (emp.categorie && emp.categorie.toLowerCase().includes('cuisine') && 
            absentCategory.toLowerCase().includes('service')) {
          score += 15;
          reasons.push('Formation croisée');
        }

        // Malus si déjà beaucoup d'heures cette semaine (simulation)
        const weekStart = new Date(targetDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekShifts = shifts.filter(s => {
          const shiftDate = new Date(s.date);
          return s.employeId === emp.id && shiftDate >= weekStart && shiftDate <= new Date(targetDate);
        });
        
        if (weekShifts.length >= 5) {
          score -= 15;
          reasons.push('Charge de travail élevée');
        }

        return {
          employee: emp,
          score: Math.max(0, score),
          reasons,
          availability,
          compatibility: score >= 30 ? 'high' : score >= 15 ? 'medium' : 'low'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6); // Top 6 suggestions

    return suggestions;
  }, [absentEmployee, date, allEmployees, shifts]);

  const getAvailabilityColor = (availability) => {
    switch(availability) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'busy': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCompatibilityIcon = (compatibility) => {
    switch(compatibility) {
      case 'high': return <Star className="w-4 h-4 text-green-500" />;
      case 'medium': return <CheckCircle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!show || !absentEmployee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-7 h-7" />
              <div>
                <h2 className="text-xl font-bold">Suggestions de Remplaçants</h2>
                <p className="text-blue-100 text-sm">
                  Absence de <strong>{absentEmployee.prenom} {absentEmployee.nom}</strong> 
                  le {new Date(date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Employee absent details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-semibold">
                {absentEmployee.prenom?.[0]}{absentEmployee.nom?.[0]}
              </div>
              <div>
                <h3 className="font-semibold text-red-900">
                  {absentEmployee.prenom} {absentEmployee.nom}
                </h3>
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <Briefcase className="w-4 h-4" />
                  {absentEmployee.categorie || 'Non spécifiée'}
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions grid */}
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Remplaçants recommandés
          </h3>

          {replacementSuggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Aucun remplaçant disponible trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {replacementSuggestions.map((suggestion, idx) => (
                <div
                  key={suggestion.employee.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedReplacement?.employee.id === suggestion.employee.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedReplacement(suggestion)}
                >
                  {/* Employee header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      {suggestion.employee.prenom?.[0]}{suggestion.employee.nom?.[0]}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {suggestion.employee.prenom} {suggestion.employee.nom}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {suggestion.employee.categorie || 'Non spécifié'}
                        </span>
                        {getCompatibilityIcon(suggestion.compatibility)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {suggestion.score}
                      </div>
                      <div className="text-xs text-gray-500">score</div>
                    </div>
                  </div>

                  {/* Availability badge */}
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border mb-3 ${getAvailabilityColor(suggestion.availability)}`}>
                    <div className={`w-2 h-2 rounded-full ${
                      suggestion.availability === 'available' ? 'bg-green-500' :
                      suggestion.availability === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    {suggestion.availability === 'available' ? 'Disponible' : 
                     suggestion.availability === 'busy' ? 'Déjà assigné' : 'Absent'}
                  </div>

                  {/* Reasons */}
                  <div className="space-y-1">
                    {suggestion.reasons.slice(0, 3).map((reason, reasonIdx) => (
                      <div key={reasonIdx} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected replacement actions */}
          {selectedReplacement && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Assigner le remplaçant
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note (optionnel)
                  </label>
                  <textarea
                    value={replacementNote}
                    onChange={(e) => setReplacementNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={2}
                    placeholder="Raison du remplacement, instructions spéciales..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      onAssignReplacement?.(selectedReplacement.employee, date, replacementNote);
                      onClose();
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition"
                  >
                    Assigner {selectedReplacement.employee.prenom}
                  </button>
                  <button
                    onClick={() => setSelectedReplacement(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            💡 Les suggestions sont basées sur les compétences, disponibilité et charge de travail
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-100 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplacementSuggestionModal;
