// src/components/DecisionSupportPanel.jsx
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Search,
  Calendar,
  TrendingUp,
  Shield
} from 'lucide-react';

const DecisionSupportPanel = ({ 
  suggestions = [], 
  coverageMetrics = {}, 
  onAction, 
  show = false, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('alerts');

  if (!show) return null;

  const getSeverityColor = (type) => {
    switch(type) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'info': return 'border-blue-500 bg-blue-50 text-blue-800';
      default: return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const getSeverityIcon = (type) => {
    switch(type) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'info': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      default: return <Shield className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Assistant Décisionnel RH</h2>
                <p className="text-blue-100">Optimisez votre planning avec l'IA</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{suggestions.filter(s => s.type === 'critical').length}</div>
              <div className="text-sm text-blue-100">Alertes critiques</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{suggestions.filter(s => s.type === 'warning').length}</div>
              <div className="text-sm text-blue-100">Avertissements</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{coverageMetrics.pendingCount || 0}</div>
              <div className="text-sm text-blue-100">En attente</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'alerts', label: 'Alertes & Actions', icon: AlertTriangle },
              { key: 'coverage', label: 'Couverture', icon: Users },
              { key: 'recommendations', label: 'Recommandations', icon: TrendingUp }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold mb-2">Tout va bien !</h3>
                  <p>Aucune alerte critique détectée</p>
                </div>
              ) : (
                suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className={`border-l-4 rounded-lg p-4 ${getSeverityColor(suggestion.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(suggestion.type)}
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{suggestion.title}</h4>
                        <p className="text-sm mb-3">{suggestion.message}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onAction?.(suggestion)}
                            className="bg-white border border-gray-300 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-50 transition"
                          >
                            {suggestion.action}
                          </button>
                          {suggestion.date && (
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Voir planning
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'coverage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Couverture Optimale</h4>
                  <div className="text-2xl font-bold text-green-600">
                    {Object.values(coverageMetrics.categoryRisks || {}).filter(r => r.worstDay >= 80).length}
                  </div>
                  <p className="text-sm text-green-600">catégories bien couvertes</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Risque Élevé</h4>
                  <div className="text-2xl font-bold text-red-600">
                    {Object.values(coverageMetrics.categoryRisks || {}).filter(r => r.worstDay < 60).length}
                  </div>
                  <p className="text-sm text-red-600">catégories à surveiller</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Détail par catégorie</h4>
                <div className="space-y-3">
                  {Object.entries(coverageMetrics.categoryRisks || {}).map(([category, data]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              data.worstDay >= 80 ? 'bg-green-500' : 
                              data.worstDay >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${data.worstDay}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {Math.round(data.worstDay)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">🤖 Recommandations IA</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Prévoir des remplaçants polyvalents cuisine/service</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Encourager la formation croisée entre départements</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Mettre en place une équipe de renfort flexible</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold mb-2">Actions Préventives</h5>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Anticiper les congés d'été</li>
                    <li>• Recruter personnel saisonnier</li>
                    <li>• Former équipe polyvalente</li>
                  </ul>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold mb-2">Solutions Urgentes</h5>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Contacter intérimaires</li>
                    <li>• Réorganiser les équipes</li>
                    <li>• Heures supplémentaires</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Dernière mise à jour: {new Date().toLocaleTimeString('fr')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Imprimer rapport
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionSupportPanel;
