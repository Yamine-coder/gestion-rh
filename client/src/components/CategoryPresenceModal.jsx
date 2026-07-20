// src/components/CategoryPresenceModal.jsx
// Modale "Qui est présent à quelle heure" pour une catégorie donnée.
// Affiche, pour le jour sélectionné de la semaine, une timeline horaire
// des employés de la catégorie + l'effectif par tranche horaire.

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Users, Moon, Banknote, AlarmClock, Coffee, Download } from 'lucide-react';
import jsPDF from 'jspdf';

// Parser "HH:MM" -> minutes
const parseTime = (t) => {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Libellé court du jour : "lun. 15"
const dayLabel = (date) => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

// Couleur de la barre selon l'état du segment
const segmentColor = (seg, nightShift) => {
  if (seg?.isExtra) {
    return seg.paymentStatus === 'payé' || seg.paymentStatus === 'paye'
      ? 'bg-emerald-600' : 'bg-emerald-500';
  }
  if (seg?.aValider) return 'bg-amber-500';
  if (nightShift) return 'bg-indigo-500';
  return 'bg-blue-500';
};

const initials = (emp) => {
  const p = (emp?.prenom || '').trim();
  const n = (emp?.nom || '').trim();
  return `${p[0] || ''}${n[0] || ''}`.toUpperCase() || '?';
};

const fullName = (emp) => `${emp?.prenom || ''} ${emp?.nom || ''}`.trim() || 'Employé';

export default function CategoryPresenceModal({
  groupe,
  dates = [],
  shifts = [],
  conges = [],
  formatDate,
  onClose,
}) {
  const fmt = formatDate || ((d) => new Date(d).toISOString().slice(0, 10));

  // Jour sélectionné par défaut : aujourd'hui s'il est dans la semaine, sinon 1er jour
  const todayStr = fmt(new Date());
  const defaultDate = useMemo(() => {
    const found = dates.find((d) => fmt(d) === todayStr);
    return found || dates[0] || new Date();
  }, [dates]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedDate, setSelectedDate] = useState(defaultDate);

  const Icon = groupe?.infosCategorie?.Icon || Users;
  const employes = groupe?.employes || [];

  // Données du jour sélectionné
  const dayData = useMemo(() => {
    const dStr = fmt(selectedDate);

    const rows = employes.map((emp) => {
      const conge = conges.find(
        (c) =>
          c.userId === emp.id &&
          (c.statut === 'approuvé' || c.statut === 'approuve') &&
          c.dateDebut && c.dateFin &&
          dStr >= c.dateDebut.slice(0, 10) && dStr <= c.dateFin.slice(0, 10)
      );
      const shift = shifts.find(
        (s) => s.employeId === emp.id && s.date && s.date.slice(0, 10) === dStr
      );

      if (conge) return { emp, status: 'conge', conge, segments: [] };
      if (shift?.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length) {
        const segs = shift.segments.map((seg) => {
          let start = parseTime(seg.start);
          let end = parseTime(seg.end);
          const night = end <= start;
          if (night) end += 24 * 60;
          return { ...seg, _start: start, _end: end, _night: night };
        });
        return { emp, status: 'travail', shift, segments: segs };
      }
      if (shift?.type === 'absence') return { emp, status: 'absence', segments: [] };
      if (shift?.type === 'repos') return { emp, status: 'repos', segments: [] };
      return { emp, status: 'libre', segments: [] };
    });

    const present = rows.filter((r) => r.status === 'travail');

    // Plage horaire
    let minMin = 24 * 60, maxMin = 0;
    present.forEach((r) => {
      r.segments.forEach((s) => {
        if (s._start < minMin) minMin = s._start;
        if (s._end > maxMin) maxMin = s._end;
      });
    });
    if (!present.length) { minMin = 8 * 60; maxMin = 20 * 60; }

    const startHour = Math.max(0, Math.floor(minMin / 60));
    const endHour = Math.min(30, Math.ceil(maxMin / 60));
    const axisStart = startHour * 60;
    const axisEnd = Math.max(endHour * 60, axisStart + 60);
    const hours = [];
    for (let h = startHour; h < endHour; h++) hours.push(h);

    // Effectif par heure
    const coverage = {};
    hours.forEach((h) => {
      const hs = h * 60, he = (h + 1) * 60;
      let count = 0;
      present.forEach((r) => {
        if (r.segments.some((s) => s._start < he && s._end > hs)) count++;
      });
      coverage[h] = count;
    });
    const maxCov = Math.max(1, ...Object.values(coverage));

    const absents = rows.filter((r) => r.status !== 'travail');

    return { rows, present, absents, hours, axisStart, axisEnd, coverage, maxCov };
  }, [selectedDate, employes, shifts, conges]); // eslint-disable-line react-hooks/exhaustive-deps

  const { present, absents, hours, axisStart, axisEnd, coverage, maxCov } = dayData;
  const axisSpan = Math.max(1, axisEnd - axisStart);

  const NAMES_W = 'w-40';

  // Statut d'un employé pour une date donnée (réutilisé par l'export PDF hebdomadaire)
  const statusForDate = (emp, dStr) => {
    const conge = conges.find(
      (c) =>
        c.userId === emp.id &&
        (c.statut === 'approuvé' || c.statut === 'approuve') &&
        c.dateDebut && c.dateFin &&
        dStr >= c.dateDebut.slice(0, 10) && dStr <= c.dateFin.slice(0, 10)
    );
    if (conge) return { status: 'conge', label: 'Congé' };
    const shift = shifts.find(
      (s) => s.employeId === emp.id && s.date && s.date.slice(0, 10) === dStr
    );
    if (shift?.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length) {
      const label = shift.segments
        .filter((s) => s && s.start && s.end)
        .map((s) => `${s.start}-${s.end}`)
        .join(', ');
      return { status: 'travail', label: label || '—' };
    }
    if (shift?.type === 'absence') return { status: 'absence', label: 'Absent' };
    if (shift?.type === 'repos') return { status: 'repos', label: 'Repos' };
    return { status: 'libre', label: '—' };
  };

  // Segments horaires d'un employé pour une date donnée (réutilisé par l'export PDF)
  const segmentsForDate = (emp, dStr) => {
    const shift = shifts.find(
      (s) => s.employeId === emp.id && s.date && s.date.slice(0, 10) === dStr
    );
    if (shift?.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length) {
      return shift.segments
        .filter((seg) => seg && seg.start && seg.end)
        .map((seg) => {
          let start = parseTime(seg.start);
          let end = parseTime(seg.end);
          const night = end <= start;
          if (night) end += 24 * 60;
          return { ...seg, _start: start, _end: end, _night: night };
        });
    }
    return [];
  };

  // Couleur RGB (pour jsPDF) d'un segment selon son état — miroir de segmentColor()
  const segmentRgb = (seg, night) => {
    if (seg?.isExtra) {
      return seg.paymentStatus === 'payé' || seg.paymentStatus === 'paye'
        ? [5, 150, 105]   // emerald-600
        : [16, 185, 129]; // emerald-500
    }
    if (seg?.aValider) return [245, 158, 11]; // amber-500
    if (night) return [99, 102, 241];         // indigo-500
    return [59, 130, 246];                    // blue-500
  };

  // Assombrit une couleur RGB (pour la bordure des jauges, meilleure lisibilité)
  const darkenRgb = ([r, g, b], factor = 0.72) => [
    Math.round(r * factor),
    Math.round(g * factor),
    Math.round(b * factor),
  ];

  // Axe horaire commun (min/max) sur toute la semaine pour aligner les jauges de chaque jour
  const weekAxis = useMemo(() => {
    let minMin = 24 * 60, maxMin = 0;
    employes.forEach((emp) => {
      dates.forEach((d) => {
        segmentsForDate(emp, fmt(d)).forEach((s) => {
          if (s._start < minMin) minMin = s._start;
          if (s._end > maxMin) maxMin = s._end;
        });
      });
    });
    if (minMin > maxMin) { minMin = 8 * 60; maxMin = 20 * 60; }
    const startHour = Math.max(0, Math.floor(minMin / 60));
    const endHour = Math.min(30, Math.ceil(maxMin / 60));
    const axisStart = startHour * 60;
    const axisEnd = Math.max(endHour * 60, axisStart + 60);
    return { axisStart, axisEnd, startHour, endHour };
  }, [employes, dates, shifts]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Téléchargement PDF direct : planning hebdomadaire de la catégorie, par employé ---
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const marginX = 12;
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`Planning — ${groupe?.categorie || 'Catégorie'}`, marginX, y);

    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const periode = dates.length
      ? `Semaine du ${dayLabel(dates[0])} au ${dayLabel(dates[dates.length - 1])}`
      : '';
    doc.text(periode, marginX, y);

    y += 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - marginX * 2;
    const colEmpWidth = 48;
    const colDayWidth = (tableWidth - colEmpWidth) / Math.max(1, dates.length);
    const headerHeight = 9;
    const axisRowHeight = 5;
    const rowHeight = 16;
    const barHeight = 6;

    const { axisStart, axisEnd, startHour, endHour } = weekAxis;
    const axisSpan = Math.max(1, axisEnd - axisStart);
    const tickStep = Math.max(1, Math.round((endHour - startHour) / 4));

    // En-tête du tableau (nom des jours)
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, y, tableWidth, headerHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Employé', marginX + 3, y + headerHeight / 2 + 3);
    dates.forEach((d, i) => {
      const x = marginX + colEmpWidth + i * colDayWidth;
      doc.line(x, y, x, y + headerHeight);
      doc.text(dayLabel(d), x + colDayWidth / 2, y + headerHeight / 2 + 3, { align: 'center' });
    });
    y += headerHeight;

    // Ligne d'axe horaire (repères d'heures partagés par tous les jours)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, y, tableWidth, axisRowHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    for (let h = startHour; h <= endHour; h += tickStep) {
      const frac = (h * 60 - axisStart) / axisSpan;
      dates.forEach((d, i) => {
        const xCol = marginX + colEmpWidth + i * colDayWidth;
        const xTick = xCol + Math.min(Math.max(frac, 0.02), 0.98) * colDayWidth;
        doc.text(`${h % 24}h`, xTick, y + axisRowHeight - 1, { align: 'center' });
      });
    }
    y += axisRowHeight;

    // Lignes employés (tous, présents + non présents ce jour sélectionné n'a pas d'importance ici : vue semaine complète)
    employes.forEach((emp, rowIdx) => {
      if (y + rowHeight > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 16;
        // Redessiner l'axe horaire sur la nouvelle page
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.rect(marginX, y, tableWidth, axisRowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        for (let h = startHour; h <= endHour; h += tickStep) {
          const frac = (h * 60 - axisStart) / axisSpan;
          dates.forEach((d, i) => {
            const xCol = marginX + colEmpWidth + i * colDayWidth;
            const xTick = xCol + Math.min(Math.max(frac, 0.02), 0.98) * colDayWidth;
            doc.text(`${h % 24}h`, xTick, y + axisRowHeight - 1, { align: 'center' });
          });
        }
        y += axisRowHeight;
      }
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(rowIdx % 2 === 0 ? 255 : 249, rowIdx % 2 === 0 ? 255 : 250, rowIdx % 2 === 0 ? 255 : 251);
      doc.rect(marginX, y, tableWidth, rowHeight, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(fullName(emp), marginX + 3, y + 5.5);
      if (emp.poste) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(emp.poste, marginX + 3, y + 10);
      }

      dates.forEach((d, i) => {
        const dStr = fmt(d);
        const xCol = marginX + colEmpWidth + i * colDayWidth;
        doc.line(xCol, y, xCol, y + rowHeight);

        const { status, label } = statusForDate(emp, dStr);

        if (status === 'travail') {
          const segs = segmentsForDate(emp, dStr);
          const trackX = xCol + 1;
          const trackW = colDayWidth - 2;
          const barY = y + rowHeight - barHeight - 2;

          // Piste de fond (jauge vide)
          doc.setDrawColor(226, 232, 240);
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(trackX, barY, trackW, barHeight, 0.8, 0.8, 'FD');

          // Repères verticaux discrets (toutes les tickStep heures)
          doc.setDrawColor(214, 220, 229);
          for (let h = startHour; h <= endHour; h += tickStep) {
            const frac = (h * 60 - axisStart) / axisSpan;
            const xTick = trackX + frac * trackW;
            doc.line(xTick, barY, xTick, barY + barHeight);
          }

          // Barres de segments (jauges) — chaque segment affiche systématiquement son horaire,
          // à l'intérieur si assez large, sinon au-dessus (évite les jauges illisibles/trop fines)
          segs.forEach((s) => {
            const left = trackX + Math.max(0, (s._start - axisStart) / axisSpan) * trackW;
            const rawWidth = ((s._end - s._start) / axisSpan) * trackW;
            const width = Math.max(1.8, Math.min(trackX + trackW - left, rawWidth));
            const [r, g, b] = segmentRgb(s, s._night);
            const [dr, dg, db] = darkenRgb([r, g, b]);
            doc.setFillColor(r, g, b);
            doc.setDrawColor(dr, dg, db);
            doc.roundedRect(left, barY, width, barHeight, 0.8, 0.8, 'FD');

            const timeTxt = `${s.start}-${s.end}`;
            const centerX = Math.min(Math.max(left + width / 2, trackX + 8), trackX + trackW - 8);
            if (width > 15) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              doc.setTextColor(255, 255, 255);
              doc.text(timeTxt, left + width / 2, barY + barHeight - 1.6, { align: 'center' });
            } else {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              doc.setTextColor(dr, dg, db);
              doc.text(timeTxt, centerX, barY - 1.2, { align: 'center' });
            }
          });
        } else if (status === 'conge') {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(124, 58, 237);
          doc.text(label, xCol + colDayWidth / 2, y + rowHeight / 2 + 2.5, { align: 'center', maxWidth: colDayWidth - 2 });
        } else if (status === 'absence') {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(220, 38, 38);
          doc.text(label, xCol + colDayWidth / 2, y + rowHeight / 2 + 2.5, { align: 'center', maxWidth: colDayWidth - 2 });
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(label, xCol + colDayWidth / 2, y + rowHeight / 2 + 2.5, { align: 'center', maxWidth: colDayWidth - 2 });
        }
      });

      y += rowHeight;
    });

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, marginX, y);

    const safeName = (groupe?.categorie || 'planning').trim().replace(/\s+/g, '_');
    doc.save(`planning_${safeName}.pdf`);
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'conge':
        return { label: 'Congé', cls: 'bg-violet-100 text-violet-700', Ico: Palmtreeish };
      case 'absence':
        return { label: 'Absent', cls: 'bg-red-100 text-red-700', Ico: X };
      case 'repos':
        return { label: 'Repos', cls: 'bg-slate-100 text-slate-600', Ico: Coffee };
      default:
        return { label: 'Disponible', cls: 'bg-gray-100 text-gray-500', Ico: Clock };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${groupe?.infosCategorie?.color || 'bg-gray-100 text-gray-700'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-gray-900 truncate">
                {groupe?.categorie || 'Catégorie'}
              </h3>
              <p className="text-xs text-gray-500">
                {present.length} présent{present.length > 1 ? 's' : ''} · {employes.length} au total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleDownloadPdf}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Télécharger le planning de la semaine en PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Onglets jours */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {dates.map((d) => {
            const isSel = fmt(d) === fmt(selectedDate);
            const isToday = fmt(d) === todayStr;
            return (
              <button
                key={fmt(d)}
                onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  isSel
                    ? 'bg-[#cf292c] text-white shadow-sm'
                    : isToday
                    ? 'bg-red-50 text-[#cf292c] hover:bg-red-100'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {dayLabel(d)}
              </button>
            );
          })}
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {present.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Coffee className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Personne en poste ce jour</p>
              <p className="text-xs text-gray-400 mt-1">
                Aucun employé de cette catégorie n'est présent.
              </p>
            </div>
          ) : (
            <>
              {/* En-tête des heures */}
              <div className="flex items-end mb-1">
                <div className={`${NAMES_W} flex-shrink-0`} />
                <div className="flex-1 flex">
                  {hours.map((h) => (
                    <div key={h} className="flex-1 text-center text-[10px] font-medium text-gray-400">
                      {h % 24}h
                    </div>
                  ))}
                </div>
              </div>

              {/* Lignes employés présents */}
              <div className="space-y-1.5">
                {present.map((r) => (
                  <div key={r.emp.id} className="flex items-center">
                    <div className={`${NAMES_W} flex-shrink-0 flex items-center gap-2 pr-2`}>
                      <div className="w-6 h-6 rounded-full bg-[#cf292c] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                        {initials(r.emp)}
                      </div>
                      <span className="text-xs font-medium text-gray-800 truncate" title={fullName(r.emp)}>
                        {fullName(r.emp)}
                      </span>
                    </div>

                    {/* Piste horaire */}
                    <div className="flex-1 relative h-8 rounded-lg bg-gray-50">
                      {/* Lignes de grille */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {hours.map((h) => (
                          <div key={h} className="flex-1 border-l border-gray-100 first:border-l-0" />
                        ))}
                      </div>
                      {/* Barres de segments */}
                      {r.segments.map((s, i) => {
                        const left = ((s._start - axisStart) / axisSpan) * 100;
                        const width = ((s._end - s._start) / axisSpan) * 100;
                        const durMin = s._end - s._start;
                        const durTxt = `${Math.floor(durMin / 60)}h${(durMin % 60).toString().padStart(2, '0')}`;
                        return (
                          <div
                            key={i}
                            className={`absolute top-1 bottom-1 ${segmentColor(s, s._night)} rounded-md shadow-sm flex items-center justify-center px-1 overflow-hidden`}
                            style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` }}
                            title={`${s.start} - ${s.end} (${durTxt})`}
                          >
                            <span className="text-[9px] font-semibold text-white whitespace-nowrap flex items-center gap-1">
                              {s._night && <Moon className="w-2.5 h-2.5" />}
                              {s.isExtra && <Banknote className="w-2.5 h-2.5" />}
                              {s.aValider && <AlarmClock className="w-2.5 h-2.5" />}
                              {s.start}-{s.end}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ligne effectif par heure */}
              <div className="flex items-center mt-3 pt-3 border-t border-gray-100">
                <div className={`${NAMES_W} flex-shrink-0 flex items-center gap-1.5 pr-2`}>
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-semibold text-gray-500">Effectif / h</span>
                </div>
                <div className="flex-1 flex gap-px h-10 items-end">
                  {hours.map((h) => {
                    const c = coverage[h] || 0;
                    const pct = (c / maxCov) * 100;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[9px] font-bold text-gray-500 leading-none mb-0.5">{c}</span>
                        <div
                          className={`w-full rounded-t ${c === 0 ? 'bg-gray-200' : c >= maxCov ? 'bg-[#cf292c]' : 'bg-[#cf292c]/40'}`}
                          style={{ height: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Non présents */}
          {absents.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Non présents ({absents.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {absents.map((r) => {
                  const b = statusBadge(r.status);
                  return (
                    <span
                      key={r.emp.id}
                      className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[11px] font-medium ${b.cls}`}
                      title={`${fullName(r.emp)} — ${b.label}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white/60 text-[8px] font-bold flex items-center justify-center">
                        {initials(r.emp)}
                      </span>
                      <span className="truncate max-w-[110px]">{fullName(r.emp)}</span>
                      <span className="opacity-70">· {b.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Petit fallback d'icône congé (évite un import supplémentaire conditionnel)
function Palmtreeish(props) {
  return <Clock {...props} />;
}
