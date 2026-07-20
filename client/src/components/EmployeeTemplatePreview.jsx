// src/components/EmployeeTemplatePreview.jsx
// Mini-modale qui affiche le planning type hebdomadaire d'un employé

import React, { useState, useEffect, useRef } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { API_URL } from '../config/api';
import axios from 'axios';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function EmployeeTemplatePreview({ employeId, employeNom, refDate, onClose }) {
  const [creneaux, setCreneaux] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templateNom, setTemplateNom] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchPlanningType = async () => {
      try {
        const token = localStorage.getItem('token');

        // Période d'analyse centrée sur la semaine affichée (ou la semaine en cours)
        const base = refDate ? new Date(refDate) : new Date();
        const dow = (base.getDay() + 6) % 7; // 0 = lundi
        const monday = new Date(base);
        monday.setDate(base.getDate() - dow);
        monday.setHours(0, 0, 0, 0);
        // 2 semaines avant -> 4 semaines après pour capter le pattern récurrent
        const start = new Date(monday);
        start.setDate(monday.getDate() - 14);
        const end = new Date(monday);
        end.setDate(monday.getDate() + 28);

        const fmt = (d) => d.toISOString().slice(0, 10);

        const res = await axios.get(`${API_URL}/shifts`, {
          params: { employeId, start: fmt(start), end: fmt(end) },
          headers: { Authorization: `Bearer ${token}` }
        });

        // Regrouper les shifts de travail par jour de la semaine
        // signature = ensemble trié des créneaux "HH:MM - HH:MM"
        const parJour = {}; // index 0..6 -> { signature: { count, slots } }
        JOURS.forEach((_, i) => { parJour[i] = {}; });

        (res.data || []).forEach((shift) => {
          if (shift.type !== 'travail') return;
          const segs = Array.isArray(shift.segments) ? shift.segments : [];
          const slots = segs
            .filter((s) => s && s.start && s.end)
            .map((s) => `${s.start} - ${s.end}`)
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
          if (slots.length === 0) return;

          const d = new Date(shift.date);
          const idx = (d.getUTCDay() + 6) % 7; // 0 = lundi
          const signature = slots.join('|');
          if (!parJour[idx][signature]) {
            parJour[idx][signature] = { count: 0, slots };
          }
          parJour[idx][signature].count += 1;
        });

        // Pour chaque jour, retenir la signature la plus fréquente (le "type")
        const emploiDuTemps = {};
        JOURS.forEach((jour, i) => {
          const sigs = Object.values(parJour[i]);
          if (sigs.length === 0) {
            emploiDuTemps[jour] = [];
          } else {
            sigs.sort((a, b) => b.count - a.count);
            emploiDuTemps[jour] = sigs[0].slots;
          }
        });

        setCreneaux(emploiDuTemps);
        setTemplateNom('');
      } catch (err) {
        console.error('Erreur chargement planning type:', err);
        setCreneaux({});
      } finally {
        setLoading(false);
      }
    };

    fetchPlanningType();
  }, [employeId, refDate]);

  // Fermer au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const hasAnySlot = creneaux && JOURS.some(j => creneaux[j]?.length > 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-[340px] max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutGrid className="w-4 h-4 text-[#cf292c] flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">Planning type</h3>
              <p className="text-[10px] text-gray-500 truncate">{employeNom}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#cf292c] rounded-full animate-spin" />
            </div>
          ) : !hasAnySlot ? (
            <div className="text-center py-6">
              <LayoutGrid className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Aucun planning type détecté</p>
              <p className="text-[10px] text-gray-400 mt-1">Aucun shift récurrent autour de cette semaine</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {templateNom && (
                <div className="text-[10px] text-gray-400 mb-2 flex items-center gap-1">
                  <span>Template :</span>
                  <span className="font-medium text-gray-600">{templateNom}</span>
                </div>
              )}
              {JOURS.map((jour, idx) => {
                const slots = creneaux[jour] || [];
                const isWeekend = idx >= 5;
                return (
                  <div 
                    key={jour} 
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md ${
                      slots.length > 0 
                        ? 'bg-blue-50/60 border border-blue-100' 
                        : isWeekend 
                          ? 'bg-gray-50/50' 
                          : ''
                    }`}
                  >
                    <span className={`text-[11px] font-bold w-8 ${
                      slots.length > 0 ? 'text-gray-800' : 'text-gray-400'
                    }`}>
                      {JOURS_COURTS[idx]}
                    </span>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {slots.length > 0 ? (
                        slots.map((slot, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium"
                          >
                            {slot}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          {isWeekend ? 'Repos' : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
