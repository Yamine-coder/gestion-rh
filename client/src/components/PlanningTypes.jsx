import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { CATEGORIES } from '../utils/categoriesConfig';
import {
  Plus, Save, Trash2, Copy, Play, ChevronDown, ChevronUp, ChevronLeft,
  GripVertical, X, Check, Calendar, Clock, Users, Edit3,
  AlertTriangle, CheckCircle, Loader2, LayoutGrid, Download, FileX, 
  Search, ChevronRight, Layers, ArrowDownToLine, Eraser, Eye, List,
  UserMinus, Repeat, Move, Maximize2, Minimize2, Columns3
} from 'lucide-react';

// ============================================================
// Constantes
// ============================================================
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };
const JOURS_LABELS_FULL = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

// Créneaux horaires : helper pour générer les entrées visibles dynamiquement
// Le format des clés grille est mixte : "10:00-11:00" (1h) ou "10:00-10:30" (30min)
// Les demi-heures n'apparaissent que quand les données le nécessitent

// Helper : convertir "HH:MM" ou "HH" en sortOrder (les heures <6 deviennent 24+)
const timeToSort = (timeStr) => {
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0]);
  const m = parts.length > 1 ? parseInt(parts[1]) : 0;
  if (h < 6) h += 24;
  return h + (m >= 30 ? 0.5 : 0);
};
const hourToSort = (hh) => {
  const n = parseInt(hh);
  return n < 6 ? n + 24 : n;
};

const CATEGORIES_FILTREES = CATEGORIES.filter(c => c.value !== 'tous');

// Couleurs par catégorie pour les badges employé
const COULEURS_EMPLOYES = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-lime-100 text-lime-700 border-lime-200',
  'bg-pink-100 text-pink-700 border-pink-200',
];

// ============================================================
// Composant Principal
// ============================================================
export default function PlanningTypes({ embedded = false, employesProp = null, onClose = null, onTemplateSelect = null }) {
  // État global
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // État formulaire création/édition
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formNom, setFormNom] = useState('');
  const [formCategorie, setFormCategorie] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);

  // État de la grille
  const [grille, setGrille] = useState({});
  const [initialGrille, setInitialGrille] = useState(null); // Snapshot pour calcul des différences
  const [isDragging, setIsDragging] = useState(false);
  const [dragEmployee, setDragEmployee] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [dragSourceCell, setDragSourceCell] = useState(null); // {jour, creneau} si drag depuis une cellule

  // Drop popover (choix ajouter/remplacer)
  const [dropPopover, setDropPopover] = useState(null); // {jour, creneau, employeId, x, y, fromCell}

  // État application à la semaine
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyDate, setApplyDate] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  // État import semaine réelle
  const [showImportModal, setShowImportModal] = useState(false);
  const [importDate, setImportDate] = useState('');
  const [importing, setImporting] = useState(false);

  // Notifications
  const [toast, setToast] = useState(null);
  // Confirmation inline (remplace window.confirm)
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const requestConfirm = (message, onConfirm) => setConfirmDialog({ message, onConfirm });

  // Vue : 'detail' (grille horaire) ou 'overview' (vue d'ensemble)
  const [viewMode, setViewMode] = useState('overview');

  // Sections collapsibles
  const [showEmployeesBar, setShowEmployeesBar] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [focusMode, setFocusMode] = useState(false); // Plein écran pour vue detail

  // Filtrage catégorie pour la liste
  const [filterCategorie, setFilterCategorie] = useState('');

  // Sélection multiple (peindre)
  const [isPainting, setIsPainting] = useState(false);
  const [paintEmployee, setPaintEmployee] = useState(null);
  const [paintMode, setPaintMode] = useState(null); // 'add' ou 'remove'

  // Context menu (clic droit ou actions sur ligne employé)
  const [contextMenu, setContextMenu] = useState(null); // {x, y, type, employeId, jour, range}

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ============================================================
  // Chargement initial
  // ============================================================
  const loadTemplates = useCallback(async () => {
    try {
      const params = {};
      if (filterCategorie) params.categorie = filterCategorie;
      const res = await axios.get(`${API_BASE}/api/planning-templates`, { headers, params });
      setTemplates(res.data);
    } catch (err) {
      console.error('Erreur chargement templates:', err);
      showToast('Erreur de chargement', 'error');
    }
  }, [filterCategorie]);

  const loadEmployes = useCallback(async () => {
    if (employesProp && employesProp.length > 0) {
      setEmployes(employesProp.filter(e => e.statut === 'actif'));
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/admin/employes`, { headers });
      setEmployes(res.data.filter(e => e.statut === 'actif'));
    } catch (err) {
      console.error('Erreur chargement employés:', err);
    }
  }, [employesProp]);

  useEffect(() => {
    Promise.all([loadTemplates(), loadEmployes()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [filterCategorie]);

  // ============================================================
  // CRUD Templates
  // ============================================================
  const handleCreate = async () => {
    if (!formNom.trim() || !formCategorie) return;
    try {
      setSaving(true);
      const res = await axios.post(`${API_BASE}/api/planning-templates`, {
        nom: formNom.trim(),
        categorie: formCategorie,
        description: formDescription.trim() || null
      }, { headers });
      await loadTemplates();
      setSelectedTemplate(res.data);
      const g = res.data.grille || initGrille();
      setGrille(g);
      setInitialGrille(JSON.parse(JSON.stringify(g)));
      setShowCreateForm(false);
      resetForm();
      showToast('Template créé !', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur création', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    try {
      setSaving(true);
      await axios.put(`${API_BASE}/api/planning-templates/${editingTemplate.id}`, {
        nom: formNom.trim(),
        categorie: formCategorie,
        description: formDescription.trim() || null
      }, { headers });
      await loadTemplates();
      setEditingTemplate(null);
      resetForm();
      showToast('Template modifié', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur modification', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    requestConfirm('Supprimer ce template ?', async () => {
      try {
        await axios.delete(`${API_BASE}/api/planning-templates/${id}`, { headers });
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null);
          setGrille({});
        }
        await loadTemplates();
        showToast('Template supprimé', 'success');
      } catch (err) {
        showToast('Erreur suppression', 'error');
      }
    });
  };

  const handleDuplicate = async (template) => {
    try {
      setSaving(true);
      await axios.post(`${API_BASE}/api/planning-templates`, {
        nom: `${template.nom} (copie)`,
        categorie: template.categorie,
        description: template.description,
        grille: template.grille
      }, { headers });
      await loadTemplates();
      showToast('Template dupliqué', 'success');
    } catch (err) {
      showToast('Erreur duplication', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGrille = async () => {
    if (!selectedTemplate) return;
    try {
      setSaving(true);
      const res = await axios.put(`${API_BASE}/api/planning-templates/${selectedTemplate.id}`, {
        grille
      }, { headers });
      setSelectedTemplate(res.data);
      setInitialGrille(JSON.parse(JSON.stringify(grille)));
      setHasChanges(false);
      showToast('Grille sauvegardée !', 'success');
    } catch (err) {
      showToast('Erreur sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Appliquer à une semaine
  // ============================================================
  const handleApply = async () => {
    if (!selectedTemplate || !applyDate) return;

    // Vérifier que c'est un lundi
    const d = new Date(applyDate + 'T00:00:00');
    if (d.getDay() !== 1) {
      showToast('Sélectionnez un lundi !', 'error');
      return;
    }

    try {
      setApplying(true);
      setApplyResult(null);
      const res = await axios.post(`${API_BASE}/api/planning-templates/${selectedTemplate.id}/appliquer`, {
        dateDebut: applyDate
      }, { headers });
      setApplyResult(res.data);
    } catch (err) {
      setApplyResult({ success: false, error: err.response?.data?.error || 'Erreur application' });
    } finally {
      setApplying(false);
    }
  };

  // ============================================================
  // Importer le planning réel d'une semaine
  // ============================================================
  const handleImport = async () => {
    if (!selectedTemplate || !importDate) return;

    const d = new Date(importDate + 'T00:00:00');
    if (d.getDay() !== 1) {
      showToast('Sélectionnez un lundi !', 'error');
      return;
    }

    try {
      setImporting(true);
      const res = await axios.get(`${API_BASE}/api/planning-templates/import-semaine`, {
        headers,
        params: { dateDebut: importDate, categorie: selectedTemplate.categorie }
      });

      const importedGrille = res.data.grille;
      const stats = res.data.stats;

      if (stats.totalShifts === 0) {
        showToast('Aucun shift trouvé pour cette semaine et catégorie', 'error');
        return;
      }

      setGrille(importedGrille);
      setInitialGrille(JSON.parse(JSON.stringify(importedGrille)));
      setHasChanges(true);
      setShowImportModal(false);
      setImportDate('');
      showToast(`Semaine importée ! ${stats.totalShifts} shifts, ${stats.totalEmployes} employés`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur import', 'error');
    } finally {
      setImporting(false);
    }
  };

  // ============================================================
  // Gestion de la grille
  // ============================================================
  const initGrille = () => {
    const g = {};
    JOURS.forEach(j => { g[j] = {}; });
    return g;
  };

  const selectTemplate = (template) => {
    const doSelect = () => {
      setSelectedTemplate(template);
      const g = template.grille || initGrille();
      setGrille(g);
      setInitialGrille(JSON.parse(JSON.stringify(g)));
      setHasChanges(false);
      if (onTemplateSelect) onTemplateSelect(template);
    };
    if (hasChanges) {
      requestConfirm('Modifications non sauvegardées. Continuer ?', doSelect);
    } else {
      doSelect();
    }
  };

  // Ajout/Retrait d'un employé dans une cellule
  const toggleEmployeInCell = (jour, creneau, employeId) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) next[jour] = {};
      if (!next[jour][creneau]) next[jour][creneau] = [];

      const idx = next[jour][creneau].indexOf(employeId);
      if (idx >= 0) {
        next[jour][creneau].splice(idx, 1);
      } else {
        next[jour][creneau].push(employeId);
      }
      return next;
    });
    setHasChanges(true);
  };

  // Résoudre la clé de stockage réelle dans la grille
  // Quand la vue montre des créneaux 30min mais les données sont en 1h
  const resolveStorageKey = (grilleData, jour, slotKey) => {
    if (!grilleData[jour]) return slotKey;
    // Clé exacte existe et a des données
    if (grilleData[jour][slotKey]?.length > 0) return slotKey;
    // Chercher la clé parente 1h
    const [start] = slotKey.split('-');
    const [sH, sM] = start.split(':');
    if (sM === '30') {
      const parentStart = `${sH}:00`;
      const parentSort = timeToSort(parentStart) + 1;
      const parentEndNorm = parentSort >= 24 ? parentSort - 24 : parentSort;
      const parentEndH = String(Math.floor(parentEndNorm)).padStart(2, '0');
      const parentEndM = parentEndNorm % 1 === 0.5 ? '30' : '00';
      const parentKey = `${parentStart}-${parentEndH}:${parentEndM}`;
      if (grilleData[jour][parentKey]?.length > 0) return parentKey;
    } else {
      const sort = timeToSort(start);
      const endSort = sort + 1;
      const eNorm = endSort >= 24 ? endSort - 24 : endSort;
      const eH = String(Math.floor(eNorm)).padStart(2, '0');
      const eM = eNorm % 1 === 0.5 ? '30' : '00';
      const parentKey = `${start}-${eH}:${eM}`;
      if (parentKey !== slotKey && grilleData[jour][parentKey]?.length > 0) return parentKey;
    }
    return slotKey;
  };

  const addEmployeToCell = (jour, creneau, employeId) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) next[jour] = {};
      const actualKey = resolveStorageKey(next, jour, creneau);
      if (!next[jour][actualKey]) next[jour][actualKey] = [];
      if (!next[jour][actualKey].includes(employeId)) {
        next[jour][actualKey].push(employeId);
      }
      return next;
    });
    setHasChanges(true);
  };

  const removeEmployeFromCell = (jour, creneau, employeId) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) return next;
      const actualKey = resolveStorageKey(next, jour, creneau);
      if (!next[jour][actualKey]) return next;
      next[jour][actualKey] = next[jour][actualKey].filter(id => id !== employeId);
      return next;
    });
    setHasChanges(true);
  };

  // Basculer un employé entre heure complète et demi-heure
  const toggleEmployeeHalf = (jour, hourKey, firstHalfKey, secondHalfKey, empId, currentCoverage) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) next[jour] = {};
      if (currentCoverage === 'full') {
        // Plein → 1ère demi-heure seulement (finit à :30)
        if (next[jour][hourKey]?.includes(empId)) {
          next[jour][hourKey] = next[jour][hourKey].filter(id => id !== empId);
          if (!next[jour][firstHalfKey]) next[jour][firstHalfKey] = [];
          if (!next[jour][firstHalfKey].includes(empId)) next[jour][firstHalfKey].push(empId);
        }
        if (next[jour][secondHalfKey]?.includes(empId)) {
          next[jour][secondHalfKey] = next[jour][secondHalfKey].filter(id => id !== empId);
        }
      } else {
        // Partiel → heure complète
        if (next[jour][firstHalfKey]?.includes(empId)) {
          next[jour][firstHalfKey] = next[jour][firstHalfKey].filter(id => id !== empId);
        }
        if (next[jour][secondHalfKey]?.includes(empId)) {
          next[jour][secondHalfKey] = next[jour][secondHalfKey].filter(id => id !== empId);
        }
        if (!next[jour][hourKey]) next[jour][hourKey] = [];
        if (!next[jour][hourKey].includes(empId)) next[jour][hourKey].push(empId);
      }
      // Nettoyage clés vides
      for (const k of [hourKey, firstHalfKey, secondHalfKey]) {
        if (next[jour][k]?.length === 0) delete next[jour][k];
      }
      return next;
    });
    setHasChanges(true);
  };

  // Couper/rétablir la demi-heure pour TOUS les employés d'un créneau
  const toggleAllHalf = (jour, hourKey, firstHalfKey, secondHalfKey) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) return next;
      const fullEmps = next[jour][hourKey] || [];
      const firstEmps = next[jour][firstHalfKey] || [];
      const secondEmps = next[jour][secondHalfKey] || [];
      const hasAnyFull = fullEmps.length > 0;
      if (hasAnyFull) {
        // Il y a des employés sur l'heure complète → les couper à :30
        if (!next[jour][firstHalfKey]) next[jour][firstHalfKey] = [];
        for (const empId of fullEmps) {
          if (!next[jour][firstHalfKey].includes(empId)) next[jour][firstHalfKey].push(empId);
        }
        delete next[jour][hourKey];
        // Garder la 2ème demi-heure telle quelle
      } else if (firstEmps.length > 0 || secondEmps.length > 0) {
        // Que des demi-heures → remettre tout en heure complète
        const all = [...new Set([...firstEmps, ...secondEmps])];
        next[jour][hourKey] = all;
        delete next[jour][firstHalfKey];
        delete next[jour][secondHalfKey];
      }
      for (const k of [hourKey, firstHalfKey, secondHalfKey]) {
        if (next[jour][k]?.length === 0) delete next[jour][k];
      }
      return next;
    });
    setHasChanges(true);
  };

  // ============================================================
  // Drag & Drop (depuis la barre employés OU depuis les cellules)
  // ============================================================
  // Drag depuis la barre d'employés
  const handleDragStart = (e, employeId) => {
    e.dataTransfer.setData('text/plain', String(employeId));
    e.dataTransfer.setData('application/employeId', String(employeId));
    e.dataTransfer.effectAllowed = 'copyMove';
    setIsDragging(true);
    setDragEmployee(employeId);
    setDragSourceCell(null);
  };

  // Drag depuis une cellule du tableau
  const handleChipDragStart = (e, employeId, jour, creneau) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', String(employeId));
    e.dataTransfer.setData('application/employeId', String(employeId));
    e.dataTransfer.setData('application/sourceJour', jour);
    e.dataTransfer.setData('application/sourceCreneau', creneau);
    e.dataTransfer.effectAllowed = 'copyMove';
    setIsDragging(true);
    setDragEmployee(employeId);
    setDragSourceCell({ jour, creneau });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragEmployee(null);
    setDragOverCell(null);
    setDragSourceCell(null);
  };

  const handleCellDragOver = (e, jour, creneau) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragSourceCell ? 'move' : 'copy';
    setDragOverCell(`${jour}-${creneau}`);
  };

  const handleCellDragLeave = () => {
    setDragOverCell(null);
  };

  const handleCellDrop = (e, jour, creneau) => {
    e.preventDefault();
    const employeId = parseInt(e.dataTransfer.getData('application/employeId') || e.dataTransfer.getData('text/plain'));
    const srcJour = e.dataTransfer.getData('application/sourceJour');
    const srcCreneau = e.dataTransfer.getData('application/sourceCreneau');
    const cellEmps = getCellEmployees(jour, creneau);
    const alreadyInCell = cellEmps.includes(employeId);

    if (employeId && !alreadyInCell) {
      // Si la cellule cible a déjà des employés → proposer ajouter/remplacer
      if (cellEmps.length > 0) {
        const rect = e.currentTarget.getBoundingClientRect();
        setDropPopover({
          jour, creneau, employeId,
          x: rect.left + rect.width / 2,
          y: rect.top,
          fromCell: srcJour ? { jour: srcJour, creneau: srcCreneau } : null
        });
      } else {
        // Cellule vide → ajouter directement
        addEmployeToCell(jour, creneau, employeId);
        // Si drag depuis une autre cellule → retirer de la source
        if (srcJour && srcCreneau) {
          removeEmployeFromCell(srcJour, srcCreneau, employeId);
        }
      }
    }
    setDragOverCell(null);
    setIsDragging(false);
    setDragEmployee(null);
    setDragSourceCell(null);
  };

  // Actions du popover de drop
  const handleDropAdd = () => {
    if (!dropPopover) return;
    const { jour, creneau, employeId, fromCell } = dropPopover;
    addEmployeToCell(jour, creneau, employeId);
    if (fromCell) removeEmployeFromCell(fromCell.jour, fromCell.creneau, employeId);
    setDropPopover(null);
  };

  const handleDropReplace = () => {
    if (!dropPopover) return;
    const { jour, creneau, employeId, fromCell } = dropPopover;
    // Remplacer : vider la cellule et ajouter cet employé
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) next[jour] = {};
      next[jour][creneau] = [employeId];
      return next;
    });
    setHasChanges(true);
    if (fromCell) removeEmployeFromCell(fromCell.jour, fromCell.creneau, employeId);
    setDropPopover(null);
  };

  const handleDropCancel = () => {
    setDropPopover(null);
  };

  // Fermer le popover si clic ailleurs
  useEffect(() => {
    if (!dropPopover) return;
    const handler = () => setDropPopover(null);
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [dropPopover]);

  // ============================================================
  // Peinture (clic + glisser pour remplir plusieurs cellules)
  // ============================================================
  const handleCellMouseDown = (jour, creneau, employeId) => {
    if (!employeId) return;
    const isPresent = grille[jour]?.[creneau]?.includes(employeId);
    setIsPainting(true);
    setPaintEmployee(employeId);
    setPaintMode(isPresent ? 'remove' : 'add');
    if (isPresent) {
      removeEmployeFromCell(jour, creneau, employeId);
    } else {
      addEmployeToCell(jour, creneau, employeId);
    }
  };

  const handleCellMouseEnter = (jour, creneau) => {
    if (!isPainting || !paintEmployee) return;
    if (paintMode === 'add') {
      addEmployeToCell(jour, creneau, paintEmployee);
    } else {
      removeEmployeFromCell(jour, creneau, paintEmployee);
    }
  };

  const handleMouseUp = () => {
    setIsPainting(false);
    setPaintEmployee(null);
    setPaintMode(null);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // ============================================================
  // Helpers
  // ============================================================
  const resetForm = () => {
    setFormNom('');
    setFormCategorie('');
    setFormDescription('');
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getEmployeById = (id) => employes.find(e => e.id === id);
  const getEmployeLabel = (id) => {
    const emp = getEmployeById(id);
    return emp ? `${emp.prenom} ${emp.nom?.[0] || ''}.` : `#${id}`;
  };

  const getEmployeColor = (id) => COULEURS_EMPLOYES[id % COULEURS_EMPLOYES.length];

  // Employés filtrés par catégorie du template sélectionné
  const employesFiltres = selectedTemplate
    ? employes.filter(e => {
        if (!selectedTemplate.categorie) return true;
        // Vérifier categorie ou categoriesArray
        if (e.categoriesArray && Array.isArray(e.categoriesArray)) {
          return e.categoriesArray.includes(selectedTemplate.categorie);
        }
        return e.categorie === selectedTemplate.categorie;
      })
    : [];

  // Heures visibles : TOUJOURS heure par heure (1 ligne = 1h)
  // Chaque entrée contient les sous-clés 30min pour gérer les demi-heures
  // La demi-heure :30 apparaît en sous-ligne compacte seulement si le contenu diffère de :00
  const visibleHeures = useMemo(() => {
    // Collecter toutes les clés occupées (au moins 1 employé)
    const occupiedKeys = new Set();

    JOURS.forEach(j => {
      if (!grille[j]) return;
      Object.keys(grille[j]).forEach(key => {
        if (grille[j][key]?.length > 0) {
          occupiedKeys.add(key);
        }
      });
    });

    if (occupiedKeys.size === 0) {
      // Grille vide → afficher plage par défaut 10h-00h
      const entries = [];
      for (let s = 10; s < 24; s++) {
        const sNorm = s >= 24 ? s - 24 : s;
        const eNorm = (s + 1) >= 24 ? (s + 1) - 24 : (s + 1);
        entries.push({
          label: `${String(sNorm).padStart(2, '0')}h`,
          key: `${String(sNorm).padStart(2, '0')}:00-${String(eNorm).padStart(2, '0')}:00`,
          sortOrder: s,
          isHalf: false,
          // Sous-clés pour le rendu
          keyFirstHalf: `${String(sNorm).padStart(2, '0')}:00-${String(sNorm).padStart(2, '0')}:30`,
          keySecondHalf: `${String(sNorm).padStart(2, '0')}:30-${String(eNorm).padStart(2, '0')}:00`,
        });
      }
      return entries;
    }

    // Décomposer toutes les clés en demi-heures couvertes
    const coveredHalves = new Set(); // sortOrder values (e.g. 10, 10.5, 11, ...)
    for (const key of occupiedKeys) {
      const [start, end] = key.split('-');
      const sSort = timeToSort(start);
      const eSort = timeToSort(end);
      for (let t = sSort; t < eSort; t += 0.5) {
        coveredHalves.add(t);
      }
    }

    // Regrouper par heure entière
    const hourSet = new Set();
    for (const h of coveredHalves) {
      hourSet.add(Math.floor(h));
    }
    const sortedHours = Array.from(hourSet).sort((a, b) => a - b);

    // Construire les entrées (toujours 1h)
    const entries = [];
    for (const s of sortedHours) {
      const sNorm = s >= 24 ? s - 24 : s;
      const eNorm = (s + 1) >= 24 ? (s + 1) - 24 : (s + 1);
      const sH = String(Math.floor(sNorm)).padStart(2, '0');
      const eH = String(Math.floor(eNorm)).padStart(2, '0');
      entries.push({
        label: `${sH}h`,
        key: `${sH}:00-${eH}:00`,
        sortOrder: s,
        isHalf: false,
        // Sous-clés 30min pour le rendu détaillé
        keyFirstHalf: `${sH}:00-${sH}:30`,
        keySecondHalf: `${sH}:30-${eH}:00`,
      });
    }

    return entries;
  }, [grille]);

  // Helper : résoudre les employés pour un créneau visuel
  // Gère les clés 1h, 30min et mixtes dans la grille
  const getCellEmployees = useCallback((jour, slotKey) => {
    if (!grille[jour]) return [];
    // D'abord essayer la clé exacte
    const exact = grille[jour][slotKey];
    if (exact && exact.length > 0) return exact;
    // Si le créneau est 1h (ex: 12:00-13:00), combiner les 2 demi-heures
    const [start, end] = slotKey.split('-');
    const [sH, sM] = start.split(':');
    const sSort = timeToSort(start);
    const eSort = timeToSort(end);
    if (eSort - sSort === 1 && sM === '00') {
      // Clé 1h → combiner les 2 clés 30min
      const halfNorm = sSort + 0.5;
      const halfH = String(Math.floor(halfNorm >= 24 ? halfNorm - 24 : halfNorm)).padStart(2, '0');
      const halfM = halfNorm % 1 === 0.5 ? '30' : '00';
      const eNorm = eSort >= 24 ? eSort - 24 : eSort;
      const eH2 = String(Math.floor(eNorm)).padStart(2, '0');
      const eM2 = eNorm % 1 === 0.5 ? '30' : '00';
      const key1 = `${sH}:00-${halfH}:${halfM}`;
      const key2 = `${halfH}:${halfM}-${eH2}:${eM2}`;
      const set = new Set([
        ...(grille[jour][key1] || []),
        ...(grille[jour][key2] || [])
      ]);
      if (set.size > 0) return Array.from(set);
    }
    // Si le créneau est 30min, chercher la clé 1h parente
    if (sM === '30') {
      // Ce créneau 30min (ex: 23:30-00:00) → chercher clé 1h commençant à 23:00
      const parentStart = `${sH}:00`;
      const parentSort = timeToSort(parentStart) + 1;
      const parentEndNorm = parentSort >= 24 ? parentSort - 24 : parentSort;
      const parentEndH = String(Math.floor(parentEndNorm)).padStart(2, '0');
      const parentEndM = parentEndNorm % 1 === 0.5 ? '30' : '00';
      const parentKey = `${parentStart}-${parentEndH}:${parentEndM}`;
      const parent = grille[jour][parentKey];
      if (parent && parent.length > 0) return parent;
    } else {
      // Ce créneau 30min (ex: 23:00-23:30) → chercher clé 1h 23:00-00:00
      const sort = timeToSort(start);
      const endSort = sort + 1;
      const eNorm = endSort >= 24 ? endSort - 24 : endSort;
      const eH = String(Math.floor(eNorm)).padStart(2, '0');
      const eM = eNorm % 1 === 0.5 ? '30' : '00';
      const parentKey = `${start}-${eH}:${eM}`;
      if (parentKey !== slotKey) {
        const parent = grille[jour][parentKey];
        if (parent && parent.length > 0) return parent;
      }
    }
    return [];
  }, [grille]);

  // Helper : couverture par employé pour un créneau horaire (full/first/second)
  const getHourCoverage = useCallback((jour, hourKey, firstHalfKey, secondHalfKey) => {
    if (!grille[jour]) return {};
    const fullEmps = grille[jour][hourKey] || [];
    const firstEmps = grille[jour][firstHalfKey] || [];
    const secondEmps = grille[jour][secondHalfKey] || [];
    const coverage = {};
    // Employés sur le créneau 1h complet
    for (const empId of fullEmps) coverage[empId] = 'full';
    // Employés 1ère demi-heure seulement
    for (const empId of firstEmps) {
      if (!coverage[empId]) coverage[empId] = 'first';
    }
    // Employés 2ème demi-heure
    for (const empId of secondEmps) {
      if (coverage[empId] === 'first') coverage[empId] = 'full';
      else if (!coverage[empId]) coverage[empId] = 'second';
    }
    return coverage;
  }, [grille]);

  // Comptage total d'heures pour un employé dans la grille (demi-heures = 0.5)
  const getEmployeHeures = (employeId) => {
    let count = 0;
    JOURS.forEach(j => {
      if (!grille[j]) return;
      Object.keys(grille[j]).forEach(key => {
        if (grille[j][key]?.includes(employeId)) {
          // Détecter si c'est un créneau de 30min ou 1h
          const [start, end] = key.split('-');
          const sSort = timeToSort(start);
          const eSort = timeToSort(end);
          count += (eSort - sSort);
        }
      });
    });
    // Arrondir à 0.5 près
    return Math.round(count * 2) / 2;
  };

  // Semaine prochaine (lundi)
  const getNextMonday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return next.toISOString().split('T')[0];
  };

  // Comptage heures initiales (snapshot de référence)
  const getInitialEmployeHeures = (employeId) => {
    if (!initialGrille) return 0;
    let count = 0;
    JOURS.forEach(j => {
      if (!initialGrille[j]) return;
      Object.keys(initialGrille[j]).forEach(key => {
        if (initialGrille[j][key]?.includes(employeId)) {
          const [start, end] = key.split('-');
          const sSort = timeToSort(start);
          const eSort = timeToSort(end);
          count += (eSort - sSort);
        }
      });
    });
    return Math.round(count * 2) / 2;
  };

  // Badge pour le diff heures
  const DiffBadge = ({ current, initial }) => {
    const diff = current - initial;
    if (diff === 0 || !initialGrille) return null;
    const isPlus = diff > 0;
    return (
      <span className={`ml-0.5 text-[9px] font-bold px-1 py-px rounded-full ${
        isPlus ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
      }`}>
        {isPlus ? '+' : ''}{diff}h
      </span>
    );
  };

  // Compteur total d'heures
  const totalGrilleHeures = employesFiltres.reduce((sum, e) => sum + getEmployeHeures(e.id), 0);
  const totalInitialHeures = employesFiltres.reduce((sum, e) => sum + getInitialEmployeHeures(e.id), 0);
  const assignedCount = employesFiltres.filter(e => getEmployeHeures(e.id) > 0).length;

  // Helper : calculer les plages horaires contiguës d'un employé pour un jour
  // Supporte les clés mixtes 1h et 30min
  const getEmployeRanges = useCallback((employeId, jour) => {
    if (!grille[jour]) return [];
    const slots = [];
    Object.keys(grille[jour]).forEach(key => {
      if (grille[jour][key]?.includes(employeId)) {
        const [start, end] = key.split('-');
        const sSort = timeToSort(start);
        const eSort = timeToSort(end);
        slots.push({ sort: sSort, endSort: eSort, startTime: start, endTime: end });
      }
    });
    if (slots.length === 0) return [];
    slots.sort((a, b) => a.sort - b.sort);
    // Fusionner les créneaux contigus : prev.endSort === next.sort
    const ranges = [];
    let rStart = slots[0];
    let rEnd = slots[0];
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].sort === rEnd.endSort) {
        rEnd = slots[i];
      } else {
        ranges.push({ start: rStart.startTime, end: rEnd.endTime, count: rEnd.endSort - rStart.sort });
        rStart = slots[i];
        rEnd = slots[i];
      }
    }
    ranges.push({ start: rStart.startTime, end: rEnd.endTime, count: rEnd.endSort - rStart.sort });
    return ranges;
  }, [grille]);

  // ============================================================
  // Actions sur les employés dans la grille
  // ============================================================
  // Retirer un employé de toute la grille
  const removeEmployeFromGrille = (employeId) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      JOURS.forEach(j => {
        if (!next[j]) return;
        Object.keys(next[j]).forEach(key => {
          if (next[j][key]) {
            next[j][key] = next[j][key].filter(id => id !== employeId);
          }
        });
      });
      return next;
    });
    setHasChanges(true);
    const emp = getEmployeById(employeId);
    showToast(`${emp?.prenom || ''} retiré(e) du template`, 'success');
  };

  // Vider un jour complet pour un employé
  const clearDayForEmployee = (employeId, jour) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) return next;
      Object.keys(next[jour]).forEach(key => {
        if (next[jour][key]) {
          next[jour][key] = next[jour][key].filter(id => id !== employeId);
        }
      });
      return next;
    });
    setHasChanges(true);
  };

  // Copier les shifts d'un jour vers un autre pour un employé
  const copyDayForEmployee = (employeId, fromJour, toJour) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[fromJour]) return next;
      if (!next[toJour]) next[toJour] = {};
      Object.keys(next[fromJour]).forEach(key => {
        if (next[fromJour][key]?.includes(employeId)) {
          if (!next[toJour][key]) next[toJour][key] = [];
          if (!next[toJour][key].includes(employeId)) {
            next[toJour][key].push(employeId);
          }
        }
      });
      return next;
    });
    setHasChanges(true);
  };

  // Déplacer les shifts d'un jour vers un autre pour un employé
  const moveDayForEmployee = (employeId, fromJour, toJour) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[fromJour]) return next;
      if (!next[toJour]) next[toJour] = {};
      Object.keys(next[fromJour]).forEach(key => {
        if (next[fromJour][key]?.includes(employeId)) {
          // Ajouter au jour cible
          if (!next[toJour][key]) next[toJour][key] = [];
          if (!next[toJour][key].includes(employeId)) {
            next[toJour][key].push(employeId);
          }
          // Retirer du jour source
          next[fromJour][key] = next[fromJour][key].filter(id => id !== employeId);
        }
      });
      return next;
    });
    setHasChanges(true);
  };

  // Context menu actions
  const handleContextMenu = (e, type, data) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, ...data });
  };

  // Fermer le context menu
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    document.addEventListener('contextmenu', handler);
    return () => { document.removeEventListener('click', handler); document.removeEventListener('contextmenu', handler); };
  }, [contextMenu]);

  // Ajouter une plage horaire (vue d'ensemble)
  // Smart : 1h keys pour heures pleines, 30min pour les demi-heures
  const addRangeToGrille = (employeId, jour, startTime, endTime) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) next[jour] = {};
      let s = timeToSort(startTime);
      const e = timeToSort(endTime);
      while (s < e) {
        const isHalfStart = s % 1 === 0.5;
        const canFullHour = !isHalfStart && (s + 1 <= e);
        const step = canFullHour ? 1 : 0.5;
        const sNorm = s >= 24 ? s - 24 : s;
        const eStep = s + step;
        const eNorm = eStep >= 24 ? eStep - 24 : eStep;
        const sH = String(Math.floor(sNorm)).padStart(2, '0');
        const sM = sNorm % 1 === 0.5 ? '30' : '00';
        const eH = String(Math.floor(eNorm)).padStart(2, '0');
        const eM = eNorm % 1 === 0.5 ? '30' : '00';
        const key = `${sH}:${sM}-${eH}:${eM}`;
        if (!next[jour][key]) next[jour][key] = [];
        if (!next[jour][key].includes(employeId)) {
          next[jour][key].push(employeId);
        }
        s += step;
      }
      return next;
    });
    setHasChanges(true);
  };

  // Supprimer une plage horaire (vue d'ensemble)
  // Cherche les clés 1h d'abord, puis 30min, pour gérer les grilles mixtes
  const removeRangeFromGrille = (employeId, jour, startTime, endTime) => {
    setGrille(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[jour]) return next;
      let s = timeToSort(startTime);
      const e = timeToSort(endTime);
      while (s < e) {
        const sNorm = s >= 24 ? s - 24 : s;
        const sH = String(Math.floor(sNorm)).padStart(2, '0');
        const sM = sNorm % 1 === 0.5 ? '30' : '00';
        // Essayer clé 1h
        if (sNorm % 1 === 0 && s + 1 <= e) {
          const e1 = s + 1;
          const e1Norm = e1 >= 24 ? e1 - 24 : e1;
          const e1H = String(Math.floor(e1Norm)).padStart(2, '0');
          const e1M = e1Norm % 1 === 0.5 ? '30' : '00';
          const key1h = `${sH}:${sM}-${e1H}:${e1M}`;
          if (next[jour][key1h]?.includes(employeId)) {
            next[jour][key1h] = next[jour][key1h].filter(id => id !== employeId);
            s += 1;
            continue;
          }
        }
        // Sinon clé 30min
        const e30 = s + 0.5;
        const e30Norm = e30 >= 24 ? e30 - 24 : e30;
        const e30H = String(Math.floor(e30Norm)).padStart(2, '0');
        const e30M = e30Norm % 1 === 0.5 ? '30' : '00';
        const key30 = `${sH}:${sM}-${e30H}:${e30M}`;
        if (next[jour][key30]) {
          next[jour][key30] = next[jour][key30].filter(id => id !== employeId);
        }
        s += 0.5;
      }
      return next;
    });
    setHasChanges(true);
  };

  // ============================================================
  // Rendu
  // ============================================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-[#cf292c] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Layers className="w-6 h-6 text-[#cf292c]" strokeWidth={1.5} />
          </div>
        </div>
        <p className="text-sm text-gray-500 font-medium">Chargement des templates...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" onMouseUp={handleMouseUp}>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TOOLBAR — PlanningRH-style compact bar (collapsible) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className={`flex-shrink-0 bg-white ${embedded ? 'border-b border-gray-100' : 'border-b border-gray-200'}`}>
        {/* Toggle header — hidden in embedded mode (parent header handles it) */}
        {!embedded && (
        <button
          onClick={() => setShowHeader(v => !v)}
          className="w-full flex items-center gap-1.5 px-4 py-1 hover:bg-gray-50 transition-colors"
        >
          {showHeader ? <ChevronUp className="w-3 h-3 text-gray-400" strokeWidth={2} /> : <ChevronDown className="w-3 h-3 text-gray-400" strokeWidth={2} />}
          <Layers className="w-3.5 h-3.5 text-[#cf292c]" strokeWidth={1.5} />
          <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Templates</span>
          {!showHeader && selectedTemplate && (
            <span className="text-[10px] text-gray-400 ml-1">— {selectedTemplate.nom} ({selectedTemplate.categorie})</span>
          )}
        </button>
        )}

        {(embedded || showHeader) && (
        <div className={`${embedded ? 'px-3 py-1.5' : 'px-4 pb-2'}`}>
        <div className="flex items-center gap-2 flex-wrap">

          {/* Filtre catégorie pills */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md overflow-x-auto">
            <button
              onClick={() => setFilterCategorie('')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all whitespace-nowrap ${
                !filterCategorie ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Toutes
            </button>
            {CATEGORIES_FILTREES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setFilterCategorie(filterCategorie === cat.value ? '' : cat.value)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all whitespace-nowrap ${
                  filterCategorie === cat.value ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Bouton Nouveau */}
          <button
            onClick={() => { setShowCreateForm(true); setEditingTemplate(null); resetForm(); setShowSidebar(true); }}
            className="h-6 px-2 text-[11px] font-semibold text-white bg-[#cf292c] hover:bg-[#b52429] rounded-md transition-all shadow-sm flex items-center gap-1"
          >
            <Plus className="w-3 h-3" strokeWidth={2} />
            Nouveau
          </button>

          {/* Actions template sélectionné */}
          {selectedTemplate && (
            <>
              <div className="w-px h-4 bg-gray-200" />

              <button
                onClick={handleSaveGrille}
                disabled={!hasChanges || saving}
                className={`h-6 px-2 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 border ${
                  hasChanges
                    ? 'text-white bg-[#cf292c] border-[#cf292c] hover:bg-[#b52429]'
                    : 'text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed'
                }`}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" strokeWidth={1.5} />}
                Sauver
              </button>

              <button
                onClick={() => { setShowImportModal(true); setImportDate(''); }}
                className="h-6 px-2 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 border text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              >
                <Download className="w-3 h-3" strokeWidth={1.5} />
                Importer
              </button>

              <button
                onClick={() => requestConfirm('Vider toute la grille ?', () => { setGrille(initGrille()); setHasChanges(true); showToast('Grille vidée', 'success'); })}
                className="h-6 px-2 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 border text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              >
                <Eraser className="w-3 h-3" strokeWidth={1.5} />
                Vider
              </button>

              <button
                onClick={() => { setShowApplyModal(true); setApplyDate(getNextMonday()); setApplyResult(null); }}
                className="h-6 px-2 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 text-white bg-emerald-600 border-emerald-600 hover:bg-emerald-700 border shadow-sm"
              >
                <Play className="w-3 h-3" strokeWidth={1.5} />
                Appliquer
              </button>
            </>
          )}

          {/* Toggle vue */}
          {selectedTemplate && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md">
                <button
                  onClick={() => { setViewMode('overview'); setFocusMode(false); setShowSidebar(true); if (!embedded) setShowHeader(true); }}
                  className={`h-5 px-1.5 text-[10px] font-medium rounded flex items-center gap-1 transition-all ${
                    viewMode === 'overview' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vue d'ensemble"
                >
                  <Eye className="w-3 h-3" strokeWidth={1.5} />
                  Ensemble
                </button>
                <button
                  onClick={() => { setViewMode('detail'); setShowSidebar(false); if (!embedded) { setShowHeader(false); setShowFooter(false); setShowEmployeesBar(false); } }}
                  className={`h-5 px-1.5 text-[10px] font-medium rounded flex items-center gap-1 transition-all ${
                    viewMode === 'detail' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vue détaillée (plein écran)"
                >
                  <List className="w-3 h-3" strokeWidth={1.5} />
                  Détail
                </button>
              </div>
            </>
          )}

          {/* Indicateur template actif — hidden in embedded mode (shown in parent header) */}
          {!embedded && selectedTemplate && (
            <div className="ml-auto flex items-center px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-medium text-gray-700 truncate max-w-[180px]">
                {selectedTemplate.nom}
              </span>
              <span className="ml-1.5 text-[10px] text-gray-400">
                {selectedTemplate.categorie} • {assignedCount}/{employesFiltres.length}
              </span>
            </div>
          )}
        </div>
        </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CORPS PRINCIPAL : Sidebar + Grille */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Sidebar gauche : Templates (collapsible) ── */}
        <div className={`${showSidebar ? 'w-52' : 'w-8'} flex-shrink-0 border-r border-gray-200 bg-white flex flex-col transition-all duration-200`}>
          {/* Header sidebar */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm">
            <button
              onClick={() => setShowSidebar(v => !v)}
              className="w-full flex items-center gap-1.5 px-2 py-2.5 hover:bg-gray-100/60 transition-colors"
              title={showSidebar ? 'Réduire le panneau' : 'Afficher les templates'}
            >
              {showSidebar ? <ChevronLeft className="w-3.5 h-3.5 text-gray-500" strokeWidth={2} /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" strokeWidth={2} />}
              {showSidebar && (
                <>
                  <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Templates</span>
                  <span className="ml-auto text-[10px] text-gray-500 font-medium">{templates.length}</span>
                </>
              )}
            </button>
          </div>

          {/* Liste scrollable (masquée si sidebar collapse) */}
          {showSidebar && (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {/* Formulaire création/édition inline */}
            {(showCreateForm || editingTemplate) && (
              <div className="p-3 border-b border-gray-200 bg-gray-50/50 space-y-2">
                <input
                  type="text"
                  value={formNom}
                  onChange={e => setFormNom(e.target.value)}
                  placeholder="Nom du template"
                  className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]"
                  autoFocus
                />
                <select
                  value={formCategorie}
                  onChange={e => setFormCategorie(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]"
                >
                  <option value="">Catégorie...</option>
                  {CATEGORIES_FILTREES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Description (optionnel)"
                  className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={editingTemplate ? handleUpdate : handleCreate}
                    disabled={!formNom.trim() || !formCategorie || saving}
                    className="flex-1 h-7 text-xs font-medium text-white bg-[#cf292c] hover:bg-[#b52429] rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {editingTemplate ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    onClick={() => { setShowCreateForm(false); setEditingTemplate(null); resetForm(); }}
                    className="h-7 px-2.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Liste des templates */}
            {templates.length === 0 ? (
              <div className="text-center py-10 px-4">
                <LayoutGrid className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-[11px] text-gray-400 font-medium">Aucun template</p>
              </div>
            ) : (
              templates.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`relative group border-b border-gray-200/80 cursor-pointer transition-all ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  } ${selectedTemplate?.id === t.id ? 'bg-red-50/40' : 'hover:bg-red-50/20'}`}
                  style={{ padding: '8px 12px' }}
                >
                  {/* Accent bar gauche (comme PlanningRH employee rows) */}
                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 transition-opacity ${
                    selectedTemplate?.id === t.id ? 'bg-[#cf292c] opacity-100' : 'bg-[#cf292c] opacity-0 group-hover:opacity-100'
                  }`} />

                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-800 truncate">{t.nom}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                          CATEGORIES_FILTREES.find(c => c.value === t.categorie)?.color || 'bg-gray-100 text-gray-600'
                        }`}>
                          {t.categorie}
                        </span>
                        {t.description && (
                          <span className="text-[10px] text-gray-400 truncate">{t.description}</span>
                        )}
                      </div>
                    </div>
                    {/* Actions hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(t);
                          setFormNom(t.nom);
                          setFormCategorie(t.categorie);
                          setFormDescription(t.description || '');
                          setShowCreateForm(false);
                        }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="Modifier"
                      >
                        <Edit3 className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(t); }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="Dupliquer"
                      >
                        <Copy className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Mini-aperçu grille (barre de remplissage par jour) */}
                  <div className="mt-2 flex gap-0.5">
                    {JOURS.map(j => {
                      let dayHours = 0;
                      Object.keys(t.grille?.[j] || {}).forEach(key => {
                        if ((t.grille[j][key]?.length || 0) > 0) {
                          const [ks, ke] = key.split('-');
                          dayHours += timeToSort(ke) - timeToSort(ks);
                        }
                      });
                      const pct = Math.min(1, dayHours / 15);
                      return (
                        <div key={j} className="flex-1 flex flex-col items-center">
                          <div className="text-[8px] text-gray-400 leading-none mb-0.5">{JOURS_LABELS[j]}</div>
                          <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
                            {pct > 0 && (
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                                style={{ width: `${pct * 100}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          )}

          {/* Sidebar collapsée : icônes templates verticales */}
          {!showSidebar && templates.length > 0 && (
            <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1 py-2" style={{ scrollbarWidth: 'none' }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold transition-all ${
                    selectedTemplate?.id === t.id
                      ? 'bg-[#cf292c] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={t.nom}
                >
                  {t.nom.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Zone principale : Grille ── */}
        {selectedTemplate ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* ══════════════════════════════════════════════════════ */}
            {/* VUE D'ENSEMBLE — Employés en lignes, jours en colonnes */}
            {/* ══════════════════════════════════════════════════════ */}
            {viewMode === 'overview' ? (
              <>
                <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
                  <table className="w-full border-collapse" style={{ minWidth: 900 }}>
                    <thead className="sticky top-0 z-20">
                      <tr>
                        <th className="sticky left-0 z-20 w-44 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-r border-gray-200 px-3 py-2.5 text-left">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            <Users className="w-3 h-3" strokeWidth={1.5} />
                            Employé
                          </div>
                        </th>
                        {JOURS.map(j => (
                          <th key={j} className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-1.5 py-2.5 text-center" style={{ minWidth: 120 }}>
                            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{JOURS_LABELS_FULL[j]}</span>
                          </th>
                        ))}
                        <th className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-l border-gray-200 px-2 py-2.5 text-center w-16">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employesFiltres.length === 0 ? (
                        <tr>
                          <td colSpan={JOURS.length + 2} className="text-center py-12 text-xs text-gray-400 italic">
                            Aucun employé dans "{selectedTemplate.categorie}"
                          </td>
                        </tr>
                      ) : (
                        employesFiltres.map((emp, empIdx) => {
                          const totalH = getEmployeHeures(emp.id);
                          const initialH = getInitialEmployeHeures(emp.id);
                          const colorClasses = getEmployeColor(emp.id);
                          return (
                            <tr key={emp.id} className={`${empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-red-50/20 transition-colors group`}>
                              {/* Nom employé */}
                              <td
                                className={`sticky left-0 z-10 border-r border-b border-gray-200/80 px-0 py-1.5 ${empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} group-hover:bg-red-50/20`}
                                onContextMenu={e => handleContextMenu(e, 'employee', { employeId: emp.id })}
                              >
                                <div className="flex items-center gap-2 px-3">
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#cf292c] opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorClasses}`}>
                                    {emp.prenom?.[0]}{emp.nom?.[0]}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-semibold text-gray-800 truncate">{emp.prenom} {emp.nom?.[0]}.</p>
                                  </div>
                                  {totalH > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); requestConfirm(`Retirer ${emp.prenom} de la grille ?`, () => removeEmployeFromGrille(emp.id)); }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all"
                                      title="Retirer du template"
                                    >
                                      <UserMinus className="w-3 h-3" strokeWidth={1.5} />
                                    </button>
                                  )}
                                </div>
                              </td>
                              {/* Jours — éditable avec drag & drop */}
                              {JOURS.map(j => {
                                const ranges = getEmployeRanges(emp.id, j);
                                return (
                                  <td
                                    key={j}
                                    className={`relative border-b border-gray-200/60 px-1 py-1 align-middle group/cell transition-all ${
                                      dragOverCell === `overview-${emp.id}-${j}` ? 'ring-2 ring-inset ring-[#cf292c] bg-red-50/50' : ''
                                    }`}
                                    style={{ minWidth: 120 }}
                                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCell(`overview-${emp.id}-${j}`); }}
                                    onDragLeave={() => setDragOverCell(null)}
                                    onDrop={e => {
                                      e.preventDefault();
                                      const srcEmpId = parseInt(e.dataTransfer.getData('application/rangeEmpId'));
                                      const srcJour = e.dataTransfer.getData('application/rangeJour');
                                      const srcStart = e.dataTransfer.getData('application/rangeStart');
                                      const srcEnd = e.dataTransfer.getData('application/rangeEnd');
                                      if (srcEmpId && srcJour && srcStart && srcEnd && (srcJour !== j || srcEmpId !== emp.id)) {
                                        // Déplacer : supprimer de source, ajouter à destination
                                        removeRangeFromGrille(srcEmpId, srcJour, srcStart, srcEnd);
                                        addRangeToGrille(emp.id, j, srcStart, srcEnd);
                                      }
                                      setDragOverCell(null);
                                    }}
                                    onContextMenu={ranges.length > 0 ? (e => handleContextMenu(e, 'day', { employeId: emp.id, jour: j })) : undefined}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      {ranges.map((r, ri) => (
                                        <div
                                          key={ri}
                                          draggable
                                          onDragStart={e => {
                                            e.dataTransfer.setData('application/rangeEmpId', String(emp.id));
                                            e.dataTransfer.setData('application/rangeJour', j);
                                            e.dataTransfer.setData('application/rangeStart', r.start);
                                            e.dataTransfer.setData('application/rangeEnd', r.end);
                                            e.dataTransfer.effectAllowed = 'move';
                                            setIsDragging(true);
                                            setDragEmployee(emp.id);
                                          }}
                                          onDragEnd={() => { setIsDragging(false); setDragEmployee(null); setDragOverCell(null); }}
                                          className={`relative rounded-md px-2 py-1 flex items-center justify-between ${colorClasses} border group/range cursor-grab active:cursor-grabbing ${
                                            isDragging && dragEmployee === emp.id ? 'opacity-60' : ''
                                          }`}
                                        >
                                          <span className="text-[11px] font-semibold">
                                            {r.start.replace(':00', 'h').replace(':30', 'h30')}–{r.end.replace(':00', 'h').replace(':30', 'h30')}
                                          </span>
                                          <span className="text-[9px] opacity-60 ml-1">({r.count}h)</span>
                                          <button
                                            onClick={() => removeRangeFromGrille(emp.id, j, r.start, r.end)}
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/range:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                                            title="Supprimer cette plage"
                                          >
                                            <X className="w-2.5 h-2.5" strokeWidth={3} />
                                          </button>
                                        </div>
                                      ))}
                                      {/* Bouton + pour ajouter une plage */}
                                      <RangeAddButton
                                        onAdd={(startH, endH) => addRangeToGrille(emp.id, j, startH, endH)}
                                        hasRanges={ranges.length > 0}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                              {/* Total */}
                              <td className="border-b border-l border-gray-200/80 px-2 py-1.5 text-center">
                                <div className="flex flex-col items-center">
                                  <span className={`text-[12px] font-bold ${totalH > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                                    {totalH}h
                                  </span>
                                  <DiffBadge current={totalH} initial={initialH} />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer résumé (collapsible) */}
                {assignedCount > 0 && (
                  <div className="flex-shrink-0 bg-white border-t border-gray-200">
                    <button
                      onClick={() => setShowFooter(v => !v)}
                      className="w-full flex items-center gap-1.5 px-4 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      {showFooter ? <ChevronDown className="w-3 h-3 text-gray-400" strokeWidth={2} /> : <ChevronUp className="w-3 h-3 text-gray-400" strokeWidth={2} />}
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Résumé</span>
                      <span className="text-[10px] text-gray-400">—</span>
                      <span className="text-[10px] font-bold text-gray-700">{totalGrilleHeures}h</span>
                      {initialGrille && totalGrilleHeures !== totalInitialHeures && (
                        <span className={`text-[9px] font-bold ${totalGrilleHeures > totalInitialHeures ? 'text-emerald-600' : 'text-red-500'}`}>
                          ({totalGrilleHeures > totalInitialHeures ? '+' : ''}{totalGrilleHeures - totalInitialHeures}h)
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">• {assignedCount} emp.</span>
                    </button>
                    {showFooter && (
                      <div className="flex items-center gap-3 flex-wrap px-4 pb-2">
                        <div className="text-[10px] text-gray-500">
                          <span className="font-bold text-gray-700">{assignedCount}</span> employé(s) assigné(s) •
                          Total : <span className="font-bold text-gray-700">{totalGrilleHeures}h</span>
                          {initialGrille && totalGrilleHeures !== totalInitialHeures && (
                            <span className={`ml-1 font-bold ${totalGrilleHeures > totalInitialHeures ? 'text-emerald-600' : 'text-red-500'}`}>
                              ({totalGrilleHeures > totalInitialHeures ? '+' : ''}{totalGrilleHeures - totalInitialHeures}h vs initial)
                            </span>
                          )} •
                          Moy : <span className="font-bold text-gray-700">{assignedCount > 0 ? Math.round(totalGrilleHeures / assignedCount) : 0}h</span>/emp.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* ══════════════════════════════════════════════════════ */
              /* VUE DETAIL — Grille horaire (existante) */
              /* ══════════════════════════════════════════════════════ */
              <>
                {/* Mini floating toolbar for detail view */}
                <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-2 py-1 flex items-center gap-1.5">
                  {/* Bouton retour vue ensemble */}
                  <button
                    onClick={() => { setViewMode('overview'); setFocusMode(false); setShowSidebar(true); setShowHeader(true); }}
                    className="h-6 px-2 text-[10px] font-medium rounded-md flex items-center gap-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all border border-gray-200"
                    title="Retour vue d'ensemble"
                  >
                    <Eye className="w-3 h-3" strokeWidth={1.5} />
                    Ensemble
                  </button>

                  <div className="w-px h-4 bg-gray-200" />

                  {/* Nom template */}
                  <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[150px]">{selectedTemplate.nom}</span>
                  <span className="text-[9px] text-gray-400">{selectedTemplate.categorie}</span>

                  <div className="w-px h-4 bg-gray-200" />

                  {/* Stats inline */}
                  <span className="text-[9px] font-bold text-gray-600">{totalGrilleHeures}h</span>
                  {initialGrille && totalGrilleHeures !== totalInitialHeures && (
                    <span className={`text-[8px] font-bold ${totalGrilleHeures > totalInitialHeures ? 'text-emerald-600' : 'text-red-500'}`}>
                      ({totalGrilleHeures > totalInitialHeures ? '+' : ''}{totalGrilleHeures - totalInitialHeures}h)
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400">{assignedCount} emp.</span>

                  <div className="w-px h-4 bg-gray-200" />

                  {/* Toggle employees bar */}
                  <button
                    onClick={() => setShowEmployeesBar(v => !v)}
                    className={`h-6 px-1.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all border ${
                      showEmployeesBar ? 'text-gray-700 bg-gray-100 border-gray-200' : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}
                    title="Afficher/masquer les employés"
                  >
                    <Users className="w-3 h-3" strokeWidth={1.5} />
                  </button>

                  {/* Toggle footer */}
                  <button
                    onClick={() => setShowFooter(v => !v)}
                    className={`h-6 px-1.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all border ${
                      showFooter ? 'text-gray-700 bg-gray-100 border-gray-200' : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}
                    title="Afficher/masquer le résumé"
                  >
                    <Columns3 className="w-3 h-3" strokeWidth={1.5} />
                  </button>

                  {/* Focus mode toggle */}
                  <button
                    onClick={() => {
                      const entering = !focusMode;
                      setFocusMode(entering);
                      if (entering) {
                        setShowSidebar(false);
                        setShowHeader(false);
                        setShowEmployeesBar(false);
                        setShowFooter(false);
                      } else {
                        setShowEmployeesBar(true);
                      }
                    }}
                    className={`h-6 px-1.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all border ${
                      focusMode ? 'text-white bg-[#cf292c] border-[#cf292c]' : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}
                    title={focusMode ? 'Quitter le mode focus' : 'Mode focus (plein écran)'}
                  >
                    {focusMode ? <Minimize2 className="w-3 h-3" strokeWidth={1.5} /> : <Maximize2 className="w-3 h-3" strokeWidth={1.5} />}
                  </button>

                  <div className="flex-1" />

                  {/* Actions rapides */}
                  <button
                    onClick={handleSaveGrille}
                    disabled={!hasChanges || saving}
                    className={`h-6 px-2 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all border ${
                      hasChanges
                        ? 'text-white bg-[#cf292c] border-[#cf292c] hover:bg-[#b52429]'
                        : 'text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" strokeWidth={1.5} />}
                    Sauver
                  </button>

                  <button
                    onClick={() => { setShowApplyModal(true); setApplyDate(getNextMonday()); setApplyResult(null); }}
                    className="h-6 px-2 text-[10px] font-medium rounded-md flex items-center gap-1 text-white bg-emerald-600 border-emerald-600 hover:bg-emerald-700 border transition-all"
                  >
                    <Play className="w-3 h-3" strokeWidth={1.5} />
                    Appliquer
                  </button>
                </div>

                {/* Employee bar — horizontal scroll single line */}
                {showEmployeesBar && (
                  <div className="flex-shrink-0 bg-gray-50/80 border-b border-gray-200 px-2 py-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                    <div className="flex items-center gap-1.5" style={{ minWidth: 'max-content' }}>
                      {employesFiltres.length === 0 ? (
                        <span className="text-[10px] text-gray-400 italic">Aucun employé dans "{selectedTemplate.categorie}"</span>
                      ) : (
                        employesFiltres.map(emp => {
                          const heures = getEmployeHeures(emp.id);
                          const initH = getInitialEmployeHeures(emp.id);
                          const diff = heures - initH;
                          return (
                            <div
                              key={emp.id}
                              draggable
                              onDragStart={e => handleDragStart(e, emp.id)}
                              onDragEnd={handleDragEnd}
                              className={`group/empchip inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-medium cursor-grab active:cursor-grabbing transition-all select-none border whitespace-nowrap ${getEmployeColor(emp.id)} ${
                                dragEmployee === emp.id ? 'ring-2 ring-[#cf292c]/40 scale-105' : ''
                              } ${heures > 0 ? 'shadow-sm' : 'opacity-70'}`}
                            >
                              <GripVertical className="w-2 h-2 opacity-30" strokeWidth={2} />
                              <span>{emp.prenom} {emp.nom?.[0]}.</span>
                              <span className={`text-[8px] font-bold px-0.5 rounded ${heures > 0 ? 'bg-black/10' : 'opacity-50'}`}>
                                {heures}h
                              </span>
                              {initialGrille && diff !== 0 && (
                                <span className={`text-[7px] font-bold px-0.5 rounded-full ${diff > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                  {diff > 0 ? '+' : ''}{diff}
                                </span>
                              )}
                              {heures > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); requestConfirm(`Retirer toutes les cases de ${emp.prenom} ?`, () => removeEmployeFromGrille(emp.id)); }}
                                  onMouseDown={e => e.stopPropagation()}
                                  className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover/empchip:opacity-100 hover:bg-red-500 hover:text-white transition-all flex-shrink-0"
                                  title="Supprimer toutes les cases de cet employé"
                                >
                                  <X className="w-2.5 h-2.5" strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

            {/* Grille horaire — COMPACT pour vision globale */}
            <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full border-collapse" style={{ minWidth: 800 }}>
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-20 w-12 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-r border-gray-200 px-1 py-1.5 text-left">
                      <div className="flex items-center gap-0.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        <Clock className="w-2.5 h-2.5" strokeWidth={1.5} />
                        H.
                      </div>
                    </th>
                    {JOURS.map(j => (
                      <th key={j} className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-0.5 py-1.5 text-center">
                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">{JOURS_LABELS_FULL[j]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleHeures.map((h, hIdx) => {
                    const firstHalfKey = h.keyFirstHalf;
                    const secondHalfKey = h.keySecondHalf;

                    return (
                      <tr key={h.key}>
                        <td className={`sticky left-0 z-10 w-12 px-1 py-0 border-r border-b border-gray-200/80 text-right ${
                          hIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        }`}>
                          <span className="font-mono font-semibold text-[10px] text-gray-400">{h.label}</span>
                        </td>
                        {JOURS.map(j => {
                          const cellKey = `${j}-${h.key}`;
                          const allEmployees = getCellEmployees(j, h.key);
                          const coverage = getHourCoverage(j, h.key, firstHalfKey, secondHalfKey);
                          const isOver = dragOverCell === cellKey;
                          // Déterminer si des demi-heures existent dans cette cellule
                          const hasPartial = allEmployees.some(id => coverage[id] === 'first' || coverage[id] === 'second');

                          return (
                            <td
                              key={cellKey}
                              onDragOver={e => handleCellDragOver(e, j, h.key)}
                              onDragLeave={handleCellDragLeave}
                              onDrop={e => handleCellDrop(e, j, h.key)}
                              onMouseEnter={() => handleCellMouseEnter(j, h.key)}
                              className={`relative border-b border-r border-gray-200/60 align-top transition-all duration-100 ${
                                isOver
                                  ? 'ring-2 ring-inset ring-[#cf292c] bg-red-50/50'
                                  : allEmployees.length > 0
                                    ? 'bg-blue-50/20'
                                    : hIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                              } hover:bg-slate-50/80`}
                              style={{ minWidth: 100, height: 26, padding: '1px 2px' }}
                            >
                              <div className="flex flex-wrap gap-px">
                                {allEmployees.map(empId => {
                                  const chipColor = getEmployeColor(empId);
                                  const beingDragged = isDragging && dragEmployee === empId && dragSourceCell?.jour === j && dragSourceCell?.creneau === h.key;
                                  const empCoverage = coverage[empId] || 'full';
                                  const isPartial = empCoverage !== 'full';
                                  const halfLabel = empCoverage === 'first' ? '→:30' : empCoverage === 'second' ? ':30→' : null;
                                  // La clé de stockage pour le drag reflète la couverture
                                  const dragKey = empCoverage === 'second' ? secondHalfKey : empCoverage === 'first' ? firstHalfKey : h.key;
                                  return (
                                    <span
                                      key={empId}
                                      draggable
                                      onDragStart={e => handleChipDragStart(e, empId, j, dragKey)}
                                      onDragEnd={handleDragEnd}
                                      className={`group/chip inline-flex items-center gap-0 pl-1 pr-0.5 py-0 rounded text-[9px] font-semibold cursor-grab active:cursor-grabbing hover:shadow-md transition-all shadow-sm border leading-tight ${chipColor} ${
                                        beingDragged ? 'opacity-40 scale-95' : ''
                                      } ${isPartial ? 'ring-1 ring-orange-300/60' : ''}`}
                                      title={halfLabel ? `Couvre seulement la demi-heure (${halfLabel}). Cliquer sur le badge pour basculer.` : 'Glisser pour déplacer'}
                                    >
                                      <GripVertical className="w-2 h-2 opacity-30 flex-shrink-0" strokeWidth={2} />
                                      {getEmployeLabel(empId)}
                                      {halfLabel && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleEmployeeHalf(j, h.key, firstHalfKey, secondHalfKey, empId, empCoverage); }}
                                          className="ml-0.5 px-0.5 py-0 rounded text-[7px] font-bold bg-orange-400/80 text-white hover:bg-orange-500 transition-colors flex-shrink-0 leading-none"
                                          title={empCoverage === 'first' ? 'Finit à :30 — cliquer pour remettre l\'heure complète' : 'Commence à :30 — cliquer pour remettre l\'heure complète'}
                                        >
                                          {halfLabel}
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeEmployeFromCell(j, dragKey, empId); }}
                                        className="ml-0.5 w-3 h-3 rounded-full flex items-center justify-center opacity-30 group-hover/chip:opacity-100 hover:bg-red-500 hover:text-white transition-all flex-shrink-0"
                                        title="Retirer"
                                      >
                                        <X className="w-2 h-2" strokeWidth={2.5} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                              {/* Boutons d'action */}
                              <div className="flex items-center gap-px">
                                <CellAddButton
                                  jour={j}
                                  creneau={h.key}
                                  employesFiltres={allEmployees.length > 0
                                    ? employesFiltres.filter(e => !allEmployees.includes(e.id))
                                    : employesFiltres
                                  }
                                  onAdd={(empId) => addEmployeToCell(j, h.key, empId)}
                                  getEmployeColor={getEmployeColor}
                                  compact={allEmployees.length > 0}
                                />
                                {/* Bouton couper/rétablir la demi-heure pour tous */}
                                {allEmployees.length > 0 && (
                                  <button
                                    onClick={() => toggleAllHalf(j, h.key, firstHalfKey, secondHalfKey)}
                                    className={`w-4 h-4 rounded flex items-center justify-center font-bold transition-all ${
                                      hasPartial
                                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                        : 'bg-gray-100/0 text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                                    }`}
                                    title={hasPartial ? 'Remettre l\'heure complète pour tous' : 'Couper à :30 pour tous'}
                                    style={{ fontSize: 7 }}
                                  >
                                    ½
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Résumé — footer ultra-compact, inline horizontal */}
            {showFooter && assignedCount > 0 && (
              <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-2 py-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                <div className="flex items-center gap-2" style={{ minWidth: 'max-content' }}>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Heures</span>
                  <span className="text-[9px] font-bold text-gray-700">{totalGrilleHeures}h</span>
                  {initialGrille && totalGrilleHeures !== totalInitialHeures && (
                    <span className={`text-[8px] font-bold ${totalGrilleHeures > totalInitialHeures ? 'text-emerald-600' : 'text-red-500'}`}>
                      ({totalGrilleHeures > totalInitialHeures ? '+' : ''}{totalGrilleHeures - totalInitialHeures}h)
                    </span>
                  )}
                  <div className="w-px h-3 bg-gray-200" />
                  {employesFiltres.filter(e => getEmployeHeures(e.id) > 0).map(emp => {
                    const hh = getEmployeHeures(emp.id);
                    const iH = getInitialEmployeHeures(emp.id);
                    const d = hh - iH;
                    return (
                      <div key={emp.id} className={`flex items-center gap-0.5 px-1.5 py-0 rounded border text-[9px] whitespace-nowrap ${getEmployeColor(emp.id)}`}>
                        <span className="font-medium">{emp.prenom} {emp.nom?.[0]}.</span>
                        <span className="font-bold">{hh}h</span>
                        {initialGrille && d !== 0 && (
                          <span className={`font-bold ${d > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {d > 0 ? '+' : ''}{d}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center bg-gray-50/30">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" strokeWidth={1} />
              <h3 className="text-sm font-semibold text-gray-400">Sélectionnez un template</h3>
              <p className="text-xs text-gray-400 mt-1">ou créez-en un nouveau pour commencer</p>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* Modal "Appliquer à une semaine" */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !applying && setShowApplyModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-xl px-5 py-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4" strokeWidth={1.5} />
                Appliquer le template
              </h3>
              <p className="text-emerald-100 text-[11px] mt-0.5">Générer les shifts pour une semaine</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Lundi de la semaine :</label>
                <input
                  type="date"
                  value={applyDate}
                  onChange={e => { setApplyDate(e.target.value); setApplyResult(null); }}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-xs focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c] focus:bg-white"
                />
                {applyDate && new Date(applyDate + 'T00:00:00').getDay() !== 1 && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
                    Cette date n'est pas un lundi
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-md p-2.5 border border-gray-100">
                <p className="text-[10px] text-gray-500">
                  <strong>{selectedTemplate?.nom}</strong> • {selectedTemplate?.categorie} • {assignedCount} emp. assigné(s)
                </p>
              </div>

              {applyResult && (
                <div className={`rounded-lg p-3 ${applyResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  {applyResult.success ? (
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                        {applyResult.message}
                      </div>
                      {applyResult.skipped > 0 && <p className="text-amber-600 mt-1">{applyResult.skipped} ignoré(s)</p>}
                      {applyResult.warnings?.length > 0 && (
                        <div className="mt-1 text-amber-600">{applyResult.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-700 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                      {applyResult.error || 'Erreur'}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  disabled={applying || !applyDate || new Date(applyDate + 'T00:00:00').getDay() !== 1}
                  className="flex-1 h-8 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
                >
                  {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  {applying ? 'Application...' : 'Appliquer'}
                </button>
                <button
                  onClick={() => setShowApplyModal(false)}
                  disabled={applying}
                  className="h-8 px-4 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Importer une semaine type" */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !importing && setShowImportModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-xl px-5 py-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4" strokeWidth={1.5} />
                Importer une semaine type
              </h3>
              <p className="text-blue-100 text-[11px] mt-0.5">Remplir la grille depuis le planning réel d'une semaine</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5">
                <p className="text-[10px] text-amber-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <span>L'import <strong>remplacera</strong> la grille actuelle avec les shifts réels (catégorie <strong>{selectedTemplate?.categorie}</strong>).</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Lundi de la semaine à importer :</label>
                <input
                  type="date"
                  value={importDate}
                  onChange={e => setImportDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-xs focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white"
                />
                {importDate && new Date(importDate + 'T00:00:00').getDay() !== 1 && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
                    Cette date n'est pas un lundi
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-md p-2.5 border border-gray-100">
                <p className="text-[10px] text-gray-500">
                  Les shifts des employés <strong>{selectedTemplate?.categorie}</strong> de cette semaine seront convertis en créneaux dans la grille. Les heures s'adapteront automatiquement.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={importing || !importDate || new Date(importDate + 'T00:00:00').getDay() !== 1}
                  className="flex-1 h-8 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  {importing ? 'Import...' : 'Importer'}
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                  className="h-8 px-4 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop Popover (Ajouter / Remplacer) */}
      {dropPopover && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 p-1.5 flex flex-col gap-1 min-w-[140px]"
          style={{
            top: Math.max(8, dropPopover.y - 90),
            left: Math.min(dropPopover.x - 70, window.innerWidth - 160),
            animation: 'fadeIn 0.15s ease-out'
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-0.5 pb-1">
            {getEmployeLabel(dropPopover.employeId)}
          </div>
          <button
            onClick={handleDropAdd}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Ajouter en plus
          </button>
          <button
            onClick={handleDropReplace}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={2} />
            Remplacer tout
          </button>
          <button
            onClick={handleDropCancel}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
            Annuler
          </button>
        </div>,
        document.body
      )}

      {/* Context Menu (clic droit sur employ\u00e9 ou jour) */}
      {contextMenu && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 p-1 flex flex-col gap-0.5 min-w-[170px]"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 190),
            animation: 'fadeIn 0.15s ease-out'
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setContextMenu(null)}
        >
          {contextMenu.type === 'employee' && (() => {
            const emp = getEmployeById(contextMenu.employeId);
            return (
              <>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2.5 pt-1 pb-1">
                  {emp?.prenom} {emp?.nom}
                </div>
                <button
                  onClick={() => requestConfirm(`Retirer ${emp?.prenom} de la grille ?`, () => removeEmployeFromGrille(contextMenu.employeId))}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Retirer du template
                </button>
              </>
            );
          })()}
          {contextMenu.type === 'day' && (() => {
            const emp = getEmployeById(contextMenu.employeId);
            const jourLabel = contextMenu.jour?.charAt(0).toUpperCase() + contextMenu.jour?.slice(1);
            return (
              <>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2.5 pt-1 pb-1">
                  {emp?.prenom} &middot; {jourLabel}
                </div>
                <button
                  onClick={() => clearDayForEmployee(contextMenu.employeId, contextMenu.jour)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Vider ce jour
                </button>
                {JOURS.filter(j => j !== contextMenu.jour).map(targetJour => (
                  <button
                    key={targetJour}
                    onClick={() => copyDayForEmployee(contextMenu.employeId, contextMenu.jour, targetJour)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Copier vers {targetJour.slice(0, 3)}
                  </button>
                ))}
                <button
                  onClick={() => requestConfirm(`Retirer ${emp?.prenom} de la grille ?`, () => removeEmployeFromGrille(contextMenu.employeId))}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors border-t border-gray-100 mt-0.5 pt-2"
                >
                  <UserMinus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Retirer du template
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Confirmation Dialog inline */}
      {confirmDialog && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" onClick={() => setConfirmDialog(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease-out' }} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 max-w-xs w-full mx-4"
            style={{ animation: 'slideUp 0.2s cubic-bezier(0.34, 1.2, 0.64, 1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Confirmation</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-[#cf292c] hover:bg-[#b52429] transition-colors shadow-sm"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' :
          toast.type === 'error' ? 'bg-red-600 text-white' :
          'bg-gray-800 text-white'
        }`} style={{ animation: 'slideUp 0.2s ease-out' }}>
          {toast.type === 'success' && <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />}
          {toast.type === 'error' && <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sous-composant : Bouton "+" dans une cellule pour ajouter un employé
// ============================================================
function CellAddButton({ jour, creneau, employesFiltres, onAdd, getEmployeColor, compact = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, direction: 'down' });
  const ref = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = (e) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownH = Math.min(employesFiltres.length * 28 + 8, 188);
      const goUp = spaceBelow < dropdownH && rect.top > dropdownH;
      setPos({
        top: goUp ? rect.top - dropdownH - 4 : rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 160),
        direction: goUp ? 'up' : 'down'
      });
    }
    setOpen(true);
  };

  if (employesFiltres.length === 0) return null;

  return (
    <div className={compact ? 'inline-block ml-0.5' : 'flex items-center justify-center h-full'}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`${compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]'} rounded border border-dashed border-gray-300 text-gray-400 hover:border-[#cf292c] hover:text-[#cf292c] hover:bg-red-50/50 transition-all flex items-center justify-center`}
      >
        +
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={ref}
          className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-0.5 min-w-[150px] max-h-[180px] overflow-y-auto"
          style={{ top: pos.top, left: pos.left, scrollbarWidth: 'thin' }}
        >
          {employesFiltres.map(emp => (
            <button
              key={emp.id}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(emp.id);
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1 text-[11px] hover:bg-red-50/50 flex items-center gap-1.5 transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${getEmployeColor(emp.id).split(' ')[0]}`} />
              <span className="font-medium text-gray-700">{emp.prenom} {emp.nom}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ============================================================
// Sous-composant : Bouton "+" pour ajouter une plage horaire (vue d'ensemble)
// ============================================================
const HOUR_OPTIONS = [];
for (let h = 6; h <= 26; h++) {
  const n = h >= 24 ? h - 24 : h;
  HOUR_OPTIONS.push({ value: `${String(n).padStart(2, '0')}:00`, label: `${String(n).padStart(2, '0')}h`, sort: h });
  if (h < 26) {
    HOUR_OPTIONS.push({ value: `${String(n).padStart(2, '0')}:30`, label: `${String(n).padStart(2, '0')}h30`, sort: h + 0.5 });
  }
}

function RangeAddButton({ onAdd, hasRanges = false }) {
  const [open, setOpen] = useState(false);
  const [startH, setStartH] = useState('10:00');
  const [endH, setEndH] = useState('18:00');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const startSort = timeToSort(startH);
  const endSort = timeToSort(endH);
  const isValid = endSort > startSort;
  const duration = isValid ? endSort - startSort : 0;
  const durationLabel = isValid ? (Number.isInteger(duration) ? `${duration}h` : `${duration}h`) : 'Invalide';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`${hasRanges ? 'w-full h-5 mt-0.5' : 'w-full h-7'} rounded border border-dashed border-gray-300 text-gray-400 hover:border-[#cf292c] hover:text-[#cf292c] hover:bg-red-50/50 transition-all flex items-center justify-center gap-1 text-[10px]`}
      >
        <Plus className="w-3 h-3" strokeWidth={2} />
        {!hasRanges && <span>Ajouter</span>}
      </button>
      {open && (
        <div className="absolute z-40 mt-1 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Nouvelle plage</p>
          <div className="flex items-center gap-2 mb-2.5">
            <select
              value={startH}
              onChange={e => setStartH(e.target.value)}
              className="flex-1 px-1.5 py-1 rounded border border-gray-200 text-xs bg-gray-50 focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]"
            >
              {HOUR_OPTIONS.map(h => (
                <option key={h.value + 's'} value={h.value}>{h.label}</option>
              ))}
            </select>
            <span className="text-[10px] text-gray-400 font-medium">→</span>
            <select
              value={endH}
              onChange={e => setEndH(e.target.value)}
              className="flex-1 px-1.5 py-1 rounded border border-gray-200 text-xs bg-gray-50 focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]"
            >
              {HOUR_OPTIONS.map(h => (
                <option key={h.value + 'e'} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          {!isValid && (
            <p className="text-[9px] text-red-500 mb-1.5">L'heure de fin doit être après le début</p>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={() => { if (isValid) { onAdd(startH, endH); setOpen(false); } }}
              disabled={!isValid}
              className="flex-1 h-6 text-[11px] font-medium text-white bg-[#cf292c] hover:bg-[#b52429] rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3" strokeWidth={2} />
              {durationLabel}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-6 px-2 text-[11px] text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition-all"
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
