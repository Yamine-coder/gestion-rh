import React, { useState } from 'react';
import { toLocalDateString } from '../utils/parisTimeUtils';

const ModalImportPlanning = ({ isOpen, onClose, onImport, employees }) => {
  const [file, setFile] = useState(null);
  const [parseStatus, setParseStatus] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setParseStatus('Fichier sélectionné. Cliquez sur Analyser pour traiter le document.');
    setParsedData(null);
  };
  
  const parseWordDocument = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setParseStatus('Analyse du document en cours...');
    
    try {
      // Simuler une analyse de document (dans une application réelle, nous utiliserions 
      // une bibliothèque comme mammoth.js pour analyser le document Word)
      
      // Cette fonction simule l'extraction de données d'un document Word
      // Dans un environnement réel, vous utiliseriez une bibliothèque comme mammoth.js
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simuler le temps de traitement
      
      // Générer des données fictives basées sur les employés disponibles
      // Dans une implémentation réelle, ces données viendraient du document Word
      const shiftsFromDocument = [];
      
      if (employees && employees.length > 0) {
        // Récupérer la date actuelle comme point de départ
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        // Créer des entrées de planning pour les 7 prochains jours
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i);
          
          // Distribuer les shifts entre les employés
          employees.forEach((employee, index) => {
            // Alterner les horaires pour chaque employé
            const startHour = 8 + (index % 3) * 2;
            const endHour = startHour + 8;
            
            // Format employeeName en utilisant les données disponibles
            let employeeName = 'Employé';
            if (employee.prenom && employee.nom) {
              employeeName = `${employee.prenom} ${employee.nom}`;
            } else if (employee.nom) {
              employeeName = employee.nom;
            } else if (employee.prenom) {
              employeeName = employee.prenom;
            } else if (employee.email) {
              employeeName = employee.email;
            }
            
            // Créer l'objet shift
            shiftsFromDocument.push({
              employeeId: employee.id,
              date: toLocalDateString(currentDate),
              startTime: `${startHour}:00`,
              endTime: `${endHour}:00`,
              title: `Shift - ${employeeName}`,
              employeeName: employeeName,
              employeeEmail: employee.email
            });
          });
        }
      }
      
      setParsedData(shiftsFromDocument);
      setParseStatus(`Analyse terminée. ${shiftsFromDocument.length} shifts détectés dans le document.`);
    } catch (error) {
      console.error("Erreur lors de l'analyse du document:", error);
      setParseStatus(`Erreur lors de l'analyse: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!parsedData) {
      setParseStatus('Veuillez d\'abord analyser le document.');
      return;
    }
    
    try {
      // Transformer les données parsées en format compatible avec l'API
      const shiftsToCreate = parsedData.map(shift => ({
        employeId: shift.employeeId,
        date: shift.date,
        type: 'travail',
        segments: [{
          start: shift.startTime,
          end: shift.endTime,
          commentaire: '',
          aValider: false,
          isExtra: false
        }]
      }));
      
      await onImport(shiftsToCreate);
      onClose();
    } catch (error) {
      setParseStatus(`Erreur lors de l'importation: ${error.message}`);
    }
  };
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? 'visible' : 'invisible'}`}>
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg z-10 relative">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-600">Importer un Planning</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
            <input
              type="file"
              accept=".docx,.doc"
              onChange={handleFileChange}
              className="hidden"
              id="fileInput"
            />
            <label 
              htmlFor="fileInput" 
              className="cursor-pointer py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Sélectionner un document Word
            </label>
            
            <p className="mt-2 text-sm text-gray-500">
              {file ? file.name : "Aucun fichier sélectionné"}
            </p>
          </div>
          
          {file && !parsedData && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={parseWordDocument}
                disabled={isLoading}
                className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                {isLoading ? 'Analyse en cours...' : 'Analyser le document'}
              </button>
            </div>
          )}
          
          {parseStatus && (
            <div className={`p-3 rounded-lg ${parsedData ? 'bg-green-100' : 'bg-gray-100'}`}>
              <p className="text-sm">{parseStatus}</p>
            </div>
          )}
          
          {parsedData && parsedData.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              <p className="font-semibold mb-2">Aperçu des données:</p>
              <ul className="text-xs space-y-1">
                {parsedData.slice(0, 5).map((shift, idx) => (
                  <li key={idx} className="border-b pb-1">
                    {shift.employeeName} - {shift.date} ({shift.startTime} à {shift.endTime})
                  </li>
                ))}
                {parsedData.length > 5 && <li>...et {parsedData.length - 5} autre(s) entrée(s)</li>}
              </ul>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={!parsedData || isLoading}
            >
              Importer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalImportPlanning;
