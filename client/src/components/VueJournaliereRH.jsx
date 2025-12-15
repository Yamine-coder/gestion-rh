import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import NavigationRestoreNotification from "./NavigationRestoreNotification";
import { saveNavigation, restoreNavigation, getSessionDuration } from "../utils/navigationUtils";

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function VueJournaliereRH() {
  // Helper pour obtenir la date locale au format YYYY-MM-DD
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Restaurer la date sauvegardée
  const getInitialDate = () => {
    const restored = restoreNavigation('vueJournaliereRH');
    return restored.date;
  };

  const [date, setDate] = useState(getInitialDate());
  const [pointages, setPointages] = useState([]);
  
  // États pour la notification de restauration
  const [showRestoreNotification, setShowRestoreNotification] = useState(false);
  const [restoreNotificationData, setRestoreNotificationData] = useState(null);

  const token = localStorage.getItem("token");

  // Vérifier si la position a été restaurée (seulement au premier rendu)
  useEffect(() => {
    const checkNavigationRestore = () => {
      const restored = restoreNavigation('vueJournaliereRH');
      const today = getLocalDateString();
      
      // Si la date restaurée est différente d'aujourd'hui et qu'il y a une dernière visite
      if (restored.wasRestored && restored.date !== today && restored.lastVisit) {
        const sessionDuration = getSessionDuration(restored.lastVisit);
        
        // Afficher la notification si la session est récente (moins de 7 jours)
        if (sessionDuration && sessionDuration < 10080) { // 7 jours en minutes
          setRestoreNotificationData({
            date: restored.date,
            viewType: 'jour', // Vue journalière
            sessionDuration
          });
          setShowRestoreNotification(true);
        }
      }
    };

    checkNavigationRestore();
  }, []); // Exécuter seulement au montage

  // Sauvegarde automatique de la date
  useEffect(() => {
    saveNavigation('vueJournaliereRH', { date });
  }, [date]);

  const handleExportExcel = () => {
    const rows = [];

    pointages.forEach((user) => {
      if (user.blocs.length > 0) {
        user.blocs.forEach((bloc) => {
          rows.push({
            Email: user.email,
            Nom: user.nom || '',
            Prénom: user.prenom || '',
            Arrivée: bloc.arrivee || '—',
            Départ: bloc.depart || '—',
            "Durée du bloc": bloc.duree || '-',
          });
        });
        rows.push({
          Email: "",
          Nom: "",
          Prénom: "",
          Arrivée: "",
          Départ: "Total",
          "Durée du bloc": user.total,
        });
      } else {
        rows.push({
          Email: user.email,
          Nom: user.nom || '',
          Prénom: user.prenom || '',
          Arrivée: '—',
          Départ: '—',
          "Durée du bloc": '-',
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vue Journalière RH");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `vue_journaliere_${date}.xlsx`);
  };

  const fetchPointages = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/pointage/admin/pointages/jour/${date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPointages(res.data);
    } catch (err) {
      console.error("Erreur chargement pointages :", err);
    }
  }, [date, token]);

  useEffect(() => {
    fetchPointages();
  }, [fetchPointages]);

  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-md border border-gray-100">
      {/* Contrôles de navigation responsive */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sélectionner une date :</label>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Sélecteur de date */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]"
              />
            </div>

            {/* Boutons de navigation rapide */}
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const yesterday = new Date(date);
                  yesterday.setDate(yesterday.getDate() - 1);
                  setDate(getLocalDateString(yesterday));
                }}
                className="flex-1 sm:flex-none px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                title="Jour précédent"
              >
                <span className="hidden sm:inline">← Hier</span>
                <span className="sm:hidden">←</span>
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setDate(getLocalDateString(today));
                  // Nettoyer la notification si elle est affichée
                  if (showRestoreNotification) {
                    setShowRestoreNotification(false);
                  }
                }}
                className={`flex-1 sm:flex-none px-3 py-2 text-xs rounded transition ${
                  date === getLocalDateString()
                    ? 'bg-gray-100 text-gray-500 cursor-default'
                    : 'bg-[#cf292c] text-white hover:bg-[#cf292c]/90'
                }`}
                disabled={date === getLocalDateString()}
              >
                <span className="hidden sm:inline">Aujourd'hui</span>
                <span className="sm:hidden">Auj.</span>
              </button>
              <button
                onClick={() => {
                  const tomorrow = new Date(date);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDate(getLocalDateString(tomorrow));
                }}
                className="flex-1 sm:flex-none px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                title="Jour suivant"
              >
                <span className="hidden sm:inline">Demain →</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Bouton export responsive */}
        <button
          onClick={handleExportExcel}
          className="w-full lg:w-auto bg-[#cf292c] text-white px-4 py-2 rounded-lg hover:bg-[#cf292c]/90 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">Exporter en Excel</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Cartes statistiques responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Employés présents</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {pointages.filter(p => p.blocs.length > 0).length}
            <span className="text-xs sm:text-sm text-gray-500 font-normal ml-1">/{pointages.length}</span>
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total des heures</p>
          <p className="text-xl sm:text-2xl font-bold text-[#cf292c]">
            {pointages.reduce((total, user) => {
              const heures = user.total ? parseInt(user.total.split('h')[0], 10) : 0;
              const minutes = user.total ? parseInt(user.total.split('h')[1] || 0, 10) : 0;
              return total + heures + minutes/60;
            }, 0).toFixed(1)}h
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            <span className="hidden sm:inline">Arrivée la plus tôt</span>
            <span className="sm:hidden">Plus tôt</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {(() => {
              let earliestTime = null;
              pointages.forEach(user => {
                user.blocs.forEach(bloc => {
                  if (bloc.arrivee) {
                    const time = typeof bloc.arrivee === 'string' && bloc.arrivee.includes('T')
                      ? dayjs(bloc.arrivee)
                      : dayjs(`${date}T${bloc.arrivee}`);
                    
                    if (time.isValid() && (!earliestTime || time.isBefore(earliestTime))) {
                      earliestTime = time;
                    }
                  }
                });
              });
              return earliestTime ? earliestTime.format('HH:mm') : '--:--';
            })()}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            <span className="hidden sm:inline">Départ le plus tard</span>
            <span className="sm:hidden">Plus tard</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {(() => {
              let latestTime = null;
              pointages.forEach(user => {
                user.blocs.forEach(bloc => {
                  if (bloc.depart) {
                    const time = typeof bloc.depart === 'string' && bloc.depart.includes('T')
                      ? dayjs(bloc.depart)
                      : dayjs(`${date}T${bloc.depart}`);
                    
                    if (time.isValid() && (!latestTime || time.isAfter(latestTime))) {
                      latestTime = time;
                    }
                  }
                });
              });
              return latestTime ? latestTime.format('HH:mm') : '--:--';
            })()}
          </p>
        </div>
      </div>

      {/* Vue desktop : Tableau amélioré */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Employé
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Arrivée
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Départ
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Durée travaillée
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {pointages.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600">Aucun pointage enregistré pour cette date</p>
                    <p className="text-xs text-gray-400 mt-1">Les données apparaîtront ici une fois les pointages effectués</p>
                  </div>
                </td>
              </tr>
            )}

            {pointages.map((user, userIdx) => {
              // Extraire toutes les arrivées et départs pour les afficher sur une ligne
              const arrivees = user.blocs
                .filter(bloc => bloc.arrivee)
                .map(bloc => typeof bloc.arrivee === 'string' && bloc.arrivee.includes('T') 
                  ? dayjs(bloc.arrivee).format('HH:mm')
                  : bloc.arrivee);
              
              const departs = user.blocs
                .filter(bloc => bloc.depart)
                .map(bloc => typeof bloc.depart === 'string' && bloc.depart.includes('T')
                  ? dayjs(bloc.depart).format('HH:mm')
                  : bloc.depart);

              const durees = user.blocs
                .filter(bloc => bloc.duree)
                .map(bloc => bloc.duree);

              return (
                <tr key={userIdx} className="hover:bg-gray-50 transition-all duration-200 group">
                  <td className="px-6 py-4 border-r border-gray-100">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#cf292c] rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {(() => {
                            if (user.nom && user.prenom) {
                              return `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
                            } else if (user.nom || user.prenom) {
                              const name = user.nom || user.prenom;
                              return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
                            } else {
                              return user.email.charAt(0).toUpperCase() + (user.email.charAt(1) || '').toUpperCase();
                            }
                          })()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{user.email}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.nom && user.prenom ? (
                            `${user.prenom} ${user.nom}`
                          ) : user.nom || user.prenom ? (
                            user.nom || user.prenom
                          ) : (
                            "Nom non renseigné"
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center border-r border-gray-100">
                    {arrivees.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {arrivees.map((arrivee, idx) => (
                          <div key={idx} className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {arrivee}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center border-r border-gray-100">
                    {departs.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {departs.map((depart, idx) => (
                          <div key={idx} className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium border border-red-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {depart}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.total || durees.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        {/* Total principal (calculé par le backend) */}
                        {user.total && (
                          <div className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-sm font-medium">{user.total}</span>
                          </div>
                        )}
                        {/* Détail des segments individuels si multiples */}
                        {durees.length > 1 && (
                          <div className="text-[10px] text-gray-400">
                            {durees.length} segments: {durees.join(' + ')}
                          </div>
                        )}
                        {/* Si pas de total mais des durées individuelles */}
                        {!user.total && durees.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {durees.length === 1 ? durees[0] : `${durees.length} blocs: ${durees.join(' + ')}`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vue mobile : Cardes (masquée sur desktop) */}
      <div className="md:hidden">
        {pointages.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-600">Aucun pointage enregistré pour cette date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pointages.map((user, userIdx) => (
              <div key={userIdx} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Header avec nom employé */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <div className="flex-1 min-w-0 mr-2">
                    <h3 className="font-medium text-gray-800 truncate">{user.email}</h3>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {user.nom && user.prenom ? (
                        <span>{user.prenom} {user.nom}</span>
                      ) : user.nom || user.prenom ? (
                        <span>{user.nom || user.prenom}</span>
                      ) : (
                        <span className="italic opacity-75">Nom non renseigné</span>
                      )}
                    </div>
                  </div>
                  {user.total && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#ffd6d6] text-[#cf292c] whitespace-nowrap">
                      {user.total}
                    </span>
                  )}
                </div>

                {/* Blocs de pointage */}
                {user.blocs.length > 0 ? (
                  <div className="space-y-2">
                    {user.blocs.map((bloc, blocIdx) => (
                      <div key={blocIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-3">
                          {/* Arrivée */}
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Arrivée</p>
                            {bloc.arrivee ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                                {typeof bloc.arrivee === 'string' && bloc.arrivee.includes('T') 
                                  ? dayjs(bloc.arrivee).format("HH:mm")
                                  : bloc.arrivee}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>

                          {/* Séparateur */}
                          <div className="text-gray-300">→</div>

                          {/* Départ */}
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Départ</p>
                            {bloc.depart ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700">
                                {typeof bloc.depart === 'string' && bloc.depart.includes('T')
                                  ? dayjs(bloc.depart).format("HH:mm")
                                  : bloc.depart}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </div>

                        {/* Durée du bloc */}
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Durée</p>
                          {bloc.duree ? (
                            <span className="text-xs font-medium text-gray-700">
                              {bloc.duree}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">Aucun pointage pour cette journée</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 px-2 text-sm text-gray-500 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Données actualisées pour le {new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* Notification de restauration de navigation */}
      {showRestoreNotification && restoreNotificationData && (
        <NavigationRestoreNotification
          show={showRestoreNotification}
          onDismiss={() => setShowRestoreNotification(false)}
          restoredDate={restoreNotificationData.date}
          restoredViewType={restoreNotificationData.viewType}
          sessionDuration={restoreNotificationData.sessionDuration}
        />
      )}
    </div>
  );
}

export default VueJournaliereRH;
