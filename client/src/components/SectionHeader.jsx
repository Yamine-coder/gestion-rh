import React from 'react';
import { 
  BarChart, 
  Users, 
  FileText, 
  Inbox, 
  PieChart, 
  Calendar,
  Settings 
} from 'lucide-react';

const SectionHeader = ({ activeMenu }) => {
  const menuConfig = {
    dashboard: {
      title: "Tableau de bord",
      description: "Vue d'ensemble des activités RH",
      icon: <BarChart size={24} className="text-[#cf292c]" />
    },
    employes: {
      title: "Gestion des employés",
      description: "Administration des collaborateurs",
      icon: <Users size={24} className="text-[#cf292c]" />
    },
    planning: {
      title: "Planning RH",
      description: "Organisation des équipes",
      icon: <Calendar size={24} className="text-[#cf292c]" />
    },
    vuejour: {
      title: "Vue journalière",
      description: "Pointages du jour",
      icon: <FileText size={24} className="text-[#cf292c]" />
    },
    demandes: {
      title: "Demandes de congés",
      description: "Validation des absences",
      icon: <Inbox size={24} className="text-[#cf292c]" />
    },
    stats: {
      title: "Statistiques RH",
      description: "Analyses et rapports",
      icon: <PieChart size={24} className="text-[#cf292c]" />
    },
    settings: {
      title: "Paramètres",
      description: "Configuration système",
      icon: <Settings size={24} className="text-[#cf292c]" />
    }
  };

  const currentConfig = menuConfig[activeMenu];

  if (!currentConfig) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-4 mb-2">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
          {currentConfig.icon}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{currentConfig.title}</h1>
          <p className="text-gray-600 mt-1">{currentConfig.description}</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-[#cf292c]/20 to-transparent"></div>
    </div>
  );
};

export default SectionHeader;
