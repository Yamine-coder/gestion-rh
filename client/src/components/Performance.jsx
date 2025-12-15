import React, { useState } from 'react';
import { BarChart3, Trophy, TrendingUp, HiChartBar } from 'lucide-react';
import { HiChartPie } from 'react-icons/hi';
import StatsRH from './StatsRH';
import ScoringManager from './ScoringManager';

/**
 * 📊 Performance - Page unifiée Stats + Scoring
 * Regroupe les statistiques RH et la gamification dans une seule page
 */

const TABS = [
  { 
    id: 'stats', 
    label: 'Statistiques', 
    icon: BarChart3,
  },
  { 
    id: 'classement', 
    label: 'Classement', 
    icon: Trophy,
  },
];

export default function Performance() {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-md border border-gray-100">
      {/* Header - Style cohérent avec les autres pages admin */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#cf292c] rounded-lg text-white flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-semibold text-gray-900">Performance</h1>
            <p className="text-xs text-gray-500 mt-0.5">Statistiques RH et classement des employés</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 rounded-lg p-1 inline-flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium 
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'stats' && <StatsRH embedded />}
        {activeTab === 'classement' && <ScoringManager embedded />}
      </div>
    </div>
  );
}
