import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { Search, RefreshCw, Upload, Download, FileText, AlertCircle, Check, X, Clock, User, Mail, Phone, MapPin, CreditCard, FileEdit, Train, ChevronLeft, ChevronRight, Users, UserPlus, Shield, Circle, Pause, CheckCircle, AlertTriangle, FileSignature, Scale, Calendar, SearchIcon, RotateCcw, Ban, Heart, ClipboardList } from "lucide-react";
import { toast } from "react-toastify";
import { getCategorieEmploye, getCategoriesEmploye, CATEGORIES_EMPLOYES, CATEGORIES_ADMIN } from "../utils/categoriesConfig";
import ConfirmModal from "./ConfirmModal";
import NavigoEmployeTab from "./NavigoEmployeTab";
import { getCurrentDateString, toLocalDateString } from "../utils/parisTimeUtils";
import "./animations.css"; // Import des animations partagées

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || '${API_BASE}';

// Fonction de formatage automatique du téléphone
const formatTelephone = (value) => {
  // Supprimer tout sauf les chiffres
  const cleaned = value.replace(/\D/g, '');
  
  // Limiter à 10 chiffres maximum
  const truncated = cleaned.substring(0, 10);
  
  // Format automatique: 06 12 34 56 78
  if (truncated.length <= 2) {
    return truncated;
  } else if (truncated.length <= 4) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2)}`;
  } else if (truncated.length <= 6) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4)}`;
  } else if (truncated.length <= 8) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4, 6)} ${truncated.substring(6)}`;
  } else {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4, 6)} ${truncated.substring(6, 8)} ${truncated.substring(8)}`;
  }
};

function ListeEmployes({ onRegisterRefresh, onCreateClick }) {
  console.log('🚀 ListeEmployes - VERSION AVEC LOGS DE DEBUG - 17:30');
  
  const location = useLocation();
  
  const [employes, setEmployes] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal Navigo dédiée
  const [navigoEmploye, setNavigoEmploye] = useState(null);
  
  // Modal d'édition
  const [editingEmploye, setEditingEmploye] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal de départ
  const [departEmploye, setDepartEmploye] = useState(null);
  const [departForm, setDepartForm] = useState({
    dateSortie: getCurrentDateString(),
    motifDepart: '',
    commentaireDepart: ''
  });
  
  // Modal info départ (lecture seule)
  const [viewDepartEmploye, setViewDepartEmploye] = useState(null);
  
  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: () => {}
  });
  
  // Filtre actifs/partis
  const [filtreStatut, setFiltreStatut] = useState('actifs'); // 'actifs' ou 'partis'
  
  // 🆕 Tri par colonnes
  const [sortBy, setSortBy] = useState('createdAt'); // 'nom', 'email', 'createdAt', 'role'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' ou 'desc'
  
  // 🆕 Sélection multiple pour actions groupées
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // 🆕 Import CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // 🆕 Filtres avancés
  const [showFilters, setShowFilters] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [filtreDateDebut, setFiltreDateDebut] = useState('');
  const [filtreDateFin, setFiltreDateFin] = useState('');
  
  // 🆕 Mode d'affichage (liste ou grille)
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'grid'
  
  // 🆕 Demandes de modification d'infos employés
  const [demandesModification, setDemandesModification] = useState([]);
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [traitementEnCours, setTraitementEnCours] = useState(null);
  const [commentaireRejet, setCommentaireRejet] = useState('');
  const [showRejetModal, setShowRejetModal] = useState(null);
  const [highlightDemandes, setHighlightDemandes] = useState(false);
  
  const itemsPerPage = 10;
  const token = localStorage.getItem("token");

  const fetchEmployes = async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get("${API_BASE}/admin/employes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployes(res.data);
    } catch (err) {
      console.error("Erreur récupération employés :", err);
      toast.error("Impossible de récupérer les employés");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 🆕 Récupérer les demandes de modification en attente
  const fetchDemandesModification = async () => {
    setLoadingDemandes(true);
    try {
      const res = await axios.get("${API_BASE}/api/modifications/demandes-en-attente", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDemandesModification(res.data);
    } catch (err) {
      console.error("Erreur récupération demandes:", err);
    } finally {
      setLoadingDemandes(false);
    }
  };

  // 🆕 Traiter une demande (approuver ou rejeter)
  const handleTraiterDemande = async (demandeId, statut, commentaire = '') => {
    setTraitementEnCours(demandeId);
    try {
      await axios.put(`${API_BASE}/api/modifications/traiter-demande/${demandeId}`, {
        statut,
        commentaire
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(
        statut === 'approuve' 
          ? '✓ Modification appliquée avec succès'
          : '✓ Demande rejetée',
        { autoClose: 2500 }
      );
      
      // Rafraîchir les données
      fetchDemandesModification();
      fetchEmployes(); // Les infos employé ont peut-être changé
      setShowRejetModal(null);
      setCommentaireRejet('');
    } catch (err) {
      console.error("Erreur traitement demande:", err);
      toast.error(err.response?.data?.error || "Impossible de traiter la demande");
    } finally {
      setTraitementEnCours(null);
    }
  };



  // 🆕 Fonction d'export CSV
  const handleExportCSV = () => {
    try {
      // Préparer les données
      const dataToExport = filteredEmployes.map(e => ({
        'Prénom': e.prenom || '',
        'Nom': e.nom || '',
        'Email': e.email,
        'Téléphone': e.telephone || '',
        'Rôle': e.role === 'admin' ? 'Administrateur' : 'Employé',
        'Catégorie': e.categorie || '',
        'Statut Compte': e.statut || 'actif',
        'Statut Départ': e.dateSortie ? 'Parti' : 'Actif',
        'Date Départ': e.dateSortie ? new Date(e.dateSortie).toLocaleDateString('fr-FR') : '',
        'Motif Départ': e.motifDepart || '',
        'Date Création': new Date(e.createdAt).toLocaleDateString('fr-FR')
      }));

      // Créer le CSV
      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(';'), // En-têtes
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Échapper les guillemets et entourer de guillemets si nécessaire
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(';')
        )
      ].join('\n');

      // Ajouter BOM pour Excel UTF-8
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Télécharger
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `employes_${getCurrentDateString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`✓ ${dataToExport.length} employé(s) exporté(s)`, { autoClose: 2500 });
    } catch (error) {
      console.error('Erreur export CSV:', error);
      toast.error("Impossible d'exporter les données");
    }
  };

  // 🆕 Fonction de tri
  const handleSort = (column) => {
    if (sortBy === column) {
      // Inverser l'ordre si même colonne
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, ordre ascendant par défaut
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // 🆕 Gestion de la sélection multiple
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(currentEmployes.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    console.log('🔲 handleSelectOne:', { id, checked });
    if (checked) {
      setSelectedIds(prev => {
        const newIds = [...prev, id];
        console.log('✅ Ajout - IDs sélectionnés:', newIds);
        return newIds;
      });
    } else {
      setSelectedIds(prev => {
        const newIds = prev.filter(selectedId => selectedId !== id);
        console.log('❌ Retrait - IDs sélectionnés:', newIds);
        return newIds;
      });
    }
  };

  // 🆕 Actions groupées
  const handleBulkDelete = () => {
    const employesToDelete = employes.filter(e => selectedIds.includes(e.id));
    const hasActiveEmployees = employesToDelete.some(e => !e.dateSortie);
    
    if (hasActiveEmployees) {
      toast.error("Impossible de supprimer des employés actifs. Marquez d'abord leur départ.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Suppression groupée",
      message: `Êtes-vous sûr de vouloir supprimer ${selectedIds.length} employé(s) ?\n\nCette action est irréversible.`,
      type: "warning",
      confirmText: "Supprimer tout",
      onConfirm: async () => {
        try {
          setIsSaving(true);
          // Supprimer un par un (ou créer endpoint bulk sur backend)
          await Promise.all(
            selectedIds.map(id =>
              axios.delete(`${API_BASE}/admin/employes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
            )
          );
          
          toast.success(`✓ ${selectedIds.length} employé(s) supprimé(s)`, { autoClose: 2500 });
          setSelectedIds([]);
          setIsSelectMode(false);
          await fetchEmployes();
        } catch (error) {
          console.error('Erreur suppression groupée:', error);
          toast.error("Impossible de supprimer tous les employés");
        } finally {
          setIsSaving(false);
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleBulkChangeStatus = async (newStatus) => {
    if (selectedIds.length === 0) {
      toast.error("Aucun employé sélectionné");
      return;
    }

    // 🔒 VALIDATION MÉTIER : Vérifier qu'aucun employé sélectionné n'est parti
    const employesSelectionnes = employes.filter(e => selectedIds.includes(e.id));
    const employesPartis = employesSelectionnes.filter(e => e.dateSortie);
    
    if (employesPartis.length > 0) {
      toast.error(`Impossible de ${newStatus === 'actif' ? 'activer' : 'désactiver'} des employés partis`);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `${newStatus === 'actif' ? 'Activer' : 'Désactiver'} plusieurs comptes`,
      message: `Voulez-vous ${newStatus === 'actif' ? 'activer' : 'désactiver'} ${selectedIds.length} compte(s) ?`,
      type: "warning",
      confirmText: "Confirmer",
      onConfirm: async () => {
        try {
          setIsSaving(true);
          console.log('🔄 Modification en masse:', { selectedIds, newStatus });
          
          const results = await Promise.allSettled(
            selectedIds.map(id =>
              axios.put(
                `${API_BASE}/admin/employes/${id}`,
                { statut: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
          
          const succeeded = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          
          console.log('✅ Résultats:', { succeeded, failed });
          
          if (succeeded > 0) {
            toast.success(`✓ ${succeeded} compte(s) modifié(s)${failed > 0 ? `, ${failed} échec(s)` : ''}`, { autoClose: 2500 });
          }
          
          if (failed === selectedIds.length) {
            toast.error("Impossible de modifier les comptes");
          }
          
          setSelectedIds([]);
          setIsSelectMode(false);
          await fetchEmployes();
        } catch (error) {
          console.error('❌ Erreur changement statut groupé:', error);
          toast.error("Impossible de modifier les comptes");
        } finally {
          setIsSaving(false);
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  // 🆕 Import CSV
  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error("Veuillez sélectionner un fichier CSV");
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Ignorer la première ligne (en-têtes)
        const dataLines = lines.slice(1);
        
        let successCount = 0;
        let errorCount = 0;

        for (const line of dataLines) {
          // Format attendu: prenom;nom;email;telephone;role;categorie
          const [prenom, nom, email, telephone, role, categorie] = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
          
          if (!email) continue; // Ignorer lignes sans email

          try {
            await axios.post(
              '${API_BASE}/admin/employes',
              {
                prenom: prenom || '',
                nom: nom || '',
                email,
                telephone: telephone || '',
                role: role === 'admin' ? 'admin' : 'employee',
                categorie: categorie || '',
                statut: 'actif'
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            successCount++;
          } catch (error) {
            console.error(`Erreur import ${email}:`, error);
            errorCount++;
          }
        }

        setShowImportModal(false);
        setImportFile(null);
        await fetchEmployes();
        
        if (errorCount === 0) {
          toast.success(`✓ ${successCount} employé(s) importé(s)`, { autoClose: 2500 });
        } else {
          toast.warning(`${successCount} réussi(s), ${errorCount} erreur(s)`);
        }
      } catch (error) {
        console.error('Erreur parsing CSV:', error);
        toast.error("Format CSV invalide");
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(importFile);
  };

  // 🆕 Télécharger template CSV
  const handleDownloadTemplate = () => {
    const template = 'Prénom;Nom;Email;Téléphone;Rôle;Catégorie\nJean;Dupont;jean.dupont@exemple.com;0612345678;employee;Cuisine\nMarie;Martin;marie.martin@exemple.com;0687654321;employee;Service';
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_import_employes.csv';
    link.click();
  };

  useEffect(() => {
    fetchEmployes();
    fetchDemandesModification(); // 🆕 Charger aussi les demandes de modification
    
    // Enregistrer la fonction de rafraîchissement pour qu'elle soit accessible par le parent
    if (onRegisterRefresh && typeof onRegisterRefresh === 'function') {
      onRegisterRefresh(fetchEmployes);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🆕 Réagir à la navigation depuis les notifications
  useEffect(() => {
    if (location.state?.highlightSection === 'demandes-modification') {
      // Basculer sur l'onglet demandes
      setFiltreStatut('demandes');
      fetchDemandesModification();
      setHighlightDemandes(true);
      
      // Scroll vers la section après un court délai
      setTimeout(() => {
        const section = document.getElementById('demandes-modification-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      
      // Retirer le highlight après 3 secondes
      setTimeout(() => setHighlightDemandes(false), 3000);
      
      // Nettoyer le state pour éviter les boucles de redirection
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state]);

  // Ouvrir le modal d'édition directement
  const handleOpenEdit = (employe) => {
    setEditingEmploye(employe);
    // ✅ Support des catégories multiples : utiliser categoriesArray si disponible, sinon fallback sur categorie
    const categoriesArray = employe.categoriesArray || (employe.categorie ? [employe.categorie] : []);
    setEditForm({
      nom: employe.nom || '',
      prenom: employe.prenom || '',
      email: employe.email || '',
      telephone: employe.telephone || '',
      role: employe.role || 'employee',
      selectedCategories: categoriesArray, // ✅ Array de catégories
      statut: employe.statut || 'actif'
    });
  };

  // Fermer le modal
  const handleCloseEdit = () => {
    setEditingEmploye(null);
    setEditForm({});
  };

  // Gérer les changements dans le formulaire
  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Sauvegarder les modifications avec confirmation
  const handleSaveEdit = () => {
    if (!editingEmploye) return;
    
    const nomComplet = `${editForm.prenom || ''} ${editForm.nom || ''}`.trim() || editForm.email;
    
    // Modal de confirmation avant d'enregistrer
    setConfirmModal({
      isOpen: true,
      title: "Confirmer les modifications",
      message: `Voulez-vous enregistrer les modifications pour ${nomComplet} ?`,
      type: "info",
      confirmText: "Enregistrer",
      onConfirm: async () => {
        setIsSaving(true);
        try {
          // ✅ Convertir selectedCategories en categories pour le backend
          const dataToSend = {
            ...editForm,
            categories: editForm.selectedCategories, // Le backend attend 'categories'
          };
          delete dataToSend.selectedCategories; // Ne pas envoyer le champ frontend
          
          const response = await axios.put(
            `${API_BASE}/admin/employes/${editingEmploye.id}`,
            dataToSend,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Mettre à jour l'employé dans la liste locale
          setEmployes(prev => prev.map(e => 
            e.id === editingEmploye.id ? response.data : e
          ));
          
          handleCloseEdit();
        } catch (err) {
          console.error("Erreur modification :", err);
          const errorMessage = err.response?.data?.error || "Impossible de modifier l'employé.";
          toast.error(errorMessage);
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  // Toggle rapide du statut (actif/inactif)
  const handleToggleStatut = (employe) => {
    // Si statut est null/undefined, on considère actif par défaut
    const statutActuel = employe.statut || 'actif';
    const nouveauStatut = statutActuel === 'actif' ? 'inactif' : 'actif';
    
    const nomComplet = `${employe.prenom || ''} ${employe.nom || ''}`.trim() || employe.email;
    const action = nouveauStatut === 'actif' ? 'activer' : 'désactiver';
    
    // Modal de confirmation avec le même style que la déconnexion
    setConfirmModal({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} le compte`,
      message: `Voulez-vous vraiment ${action} le compte de ${nomComplet} ?`,
      type: "warning",
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      onConfirm: async () => {
        try {
          const response = await axios.put(
            `${API_BASE}/admin/employes/${employe.id}`,
            { statut: nouveauStatut },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Mettre à jour dans la liste sans message de succès
          setEmployes(prev => prev.map(e => 
            e.id === employe.id ? response.data : e
          ));
        } catch (err) {
          console.error("❌ Erreur changement statut :", err);
          toast.error("Impossible de modifier le statut");
        }
      }
    });
  };

  // Ouvrir modal de départ
  const handleOpenDepart = (employe) => {
    setDepartEmploye(employe);
    setDepartForm({
      dateSortie: getCurrentDateString(),
      motifDepart: '',
      commentaireDepart: ''
    });
  };

  // Fermer modal de départ
  const handleCloseDepart = () => {
    setDepartEmploye(null);
    setDepartForm({
      dateSortie: getCurrentDateString(),
      motifDepart: '',
      commentaireDepart: ''
    });
  };

  // Enregistrer le départ
  const handleSaveDepart = () => {
    const nomComplet = `${departEmploye.prenom || ''} ${departEmploye.nom || ''}`.trim() || departEmploye.email;
    
    setConfirmModal({
      isOpen: true,
      title: "Confirmer le départ",
      message: `Êtes-vous sûr de vouloir enregistrer le départ de ${nomComplet} ?`,
      type: "warning",
      confirmText: "Confirmer",
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const response = await axios.put(
            `${API_BASE}/admin/employes/${departEmploye.id}/depart`,
            departForm,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          toast.success("✓ Départ enregistré avec succès", { autoClose: 2500 });
          
          // Mettre à jour la liste
          setEmployes(prev => prev.map(e => 
            e.id === departEmploye.id ? response.data : e
          ));
          
          handleCloseDepart();
        } catch (err) {
          console.error("Erreur enregistrement départ :", err);
          const errorMessage = err.response?.data?.error || "Impossible d'enregistrer le départ.";
          toast.error(errorMessage);
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  // 🔄 Annuler le départ d'un employé (réembauche ou erreur)
  const handleAnnulerDepart = (employe) => {
    const nomComplet = `${employe.prenom || ''} ${employe.nom || ''}`.trim() || employe.email;
    
    setConfirmModal({
      isOpen: true,
      title: "Annuler le départ",
      message: `Voulez-vous annuler le départ de ${nomComplet} ?\n\nCela réactivera son compte et supprimera les informations de départ (date, motif, commentaire).`,
      type: "warning",
      confirmText: "Annuler le départ",
      onConfirm: async () => {
        try {
          console.log('🔄 Annulation départ employé:', employe.id);
          setIsSaving(true);
          
          const token = localStorage.getItem("token");
          const response = await axios.put(
            `${API_BASE}/admin/employes/${employe.id}/annuler-depart`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log('✅ Réponse annulation:', response.data);
          
          toast.success("✓ Départ annulé, compte réactivé", { autoClose: 2500 });
          
          // Fermer le modal
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          
          // Recharger la liste complète pour être sûr
          await fetchEmployes();
          
        } catch (err) {
          console.error("❌ Erreur annulation départ :", err);
          console.error("❌ Response:", err.response?.data);
          const errorMessage = err.response?.data?.error || "Impossible d'annuler le départ.";
          toast.error(errorMessage);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  const handleDelete = (id) => {
    // Trouver l'employé pour afficher ses informations dans la confirmation
    const employe = employes.find(e => e.id === id);
    const nomComplet = employe ? `${employe.prenom || ''} ${employe.nom || ''}`.trim() || employe.email : "cet employé";
    
    // 🔒 SÉCURITÉ : Bloquer la suppression des employés actifs
    if (employe && !employe.dateSortie) {
      toast.error("Impossible de supprimer un employé actif. Enregistrez d'abord son départ.");
      return;
    }
    
    // Modal de confirmation sobre
    setConfirmModal({
      isOpen: true,
      title: "Supprimer l'employé",
      message: `Êtes-vous sûr de vouloir supprimer ${nomComplet} ?\n\nCette action supprimera définitivement toutes les données associées.`,
      type: "warning",
      confirmText: "Supprimer",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await axios.delete(`${API_BASE}/admin/employes/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchEmployes();
        } catch (err) {
          console.error("Erreur suppression :", err);
          const errorMessage = err.response?.data?.error || "Impossible de supprimer cet employé.";
          toast.error(errorMessage);
        }
      }
    });
  };

  const filteredEmployes = employes
    .filter((e) => {
      // 1️⃣ D'abord le filtre par recherche (texte)
      const searchTerm = search.toLowerCase();
      const matchSearch = !search || (
        e.email.toLowerCase().includes(searchTerm) ||
        (e.nom && e.nom.toLowerCase().includes(searchTerm)) ||
        (e.prenom && e.prenom.toLowerCase().includes(searchTerm)) ||
        (e.categorie && e.categorie.toLowerCase().includes(searchTerm)) ||
        e.role.toLowerCase().includes(searchTerm)
      );
      
      if (!matchSearch) return false;
      
      // 2️⃣ Ensuite le filtre par statut (actifs/partis) - ignorer si on est sur l'onglet demandes
      if (filtreStatut !== 'demandes') {
        const estParti = e.dateSortie !== null && e.dateSortie !== undefined;
        
        if (filtreStatut === 'actifs' && estParti) return false;
        if (filtreStatut === 'partis' && !estParti) return false;
      }
      
      // 🆕 3️⃣ Filtres avancés - Support catégories multiples
      if (filtreCategorie) {
        const employeCategories = e.categoriesArray || (e.categorie ? [e.categorie] : []);
        if (!employeCategories.includes(filtreCategorie)) return false;
      }
      if (filtreRole && e.role !== filtreRole) return false;
      
      if (filtreDateDebut) {
        const dateCreation = new Date(e.createdAt);
        const dateDebut = new Date(filtreDateDebut);
        if (dateCreation < dateDebut) return false;
      }
      
      if (filtreDateFin) {
        const dateCreation = new Date(e.createdAt);
        const dateFin = new Date(filtreDateFin);
        dateFin.setHours(23, 59, 59);
        if (dateCreation > dateFin) return false;
      }
      
      return true;
    })
    // 🆕 3️⃣ Tri
    .sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'nom':
          compareA = `${a.nom || ''} ${a.prenom || ''}`.toLowerCase();
          compareB = `${b.nom || ''} ${b.prenom || ''}`.toLowerCase();
          break;
        case 'email':
          compareA = a.email.toLowerCase();
          compareB = b.email.toLowerCase();
          break;
        case 'role':
          compareA = a.role;
          compareB = b.role;
          break;
        case 'createdAt':
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const indexOfLastItem = page * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployes = filteredEmployes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployes.length / itemsPerPage);

  // Composant de pagination compacte (pour la ligne recherche)
  const PaginationCompact = () => {
    if (filteredEmployes.length <= itemsPerPage) return null;
    
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Compteur */}
        <span className="text-xs text-gray-500 hidden md:inline whitespace-nowrap">
          {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEmployes.length)} sur {filteredEmployes.length}
        </span>
        
        {/* Première page */}
        <button
          onClick={() => setPage(1)}
          disabled={page === 1}
          className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Première page"
        >
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Précédent */}
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-gray-600"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Précédent</span>
        </button>
        
        {/* Numéros de page */}
        <div className="hidden lg:flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => {
              if (totalPages <= 5) return true;
              if (p === 1 || p === totalPages) return true;
              if (Math.abs(p - page) <= 1) return true;
              return false;
            })
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-gray-400 text-xs">...</span>
                )}
                <button
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                    p === page
                      ? 'bg-[#cf292c] text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
        </div>
        
        {/* Suivant */}
        <button
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={page === totalPages}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-gray-600"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        
        {/* Dernière page */}
        <button
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Dernière page"
        >
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  // Pagination complète pour le bas (même style)
  const PaginationBar = () => {
    if (filteredEmployes.length <= itemsPerPage) return null;
    
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
        {/* Info */}
        <div className="text-sm text-gray-600">
          Affichage <span className="font-medium">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEmployes.length)}</span> sur <span className="font-medium">{filteredEmployes.length}</span>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-sm font-medium text-gray-600"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
          
          {/* Numéros */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                if (totalPages <= 5) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      p === page
                        ? 'bg-[#cf292c] text-white'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
          </div>
          
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-sm font-medium text-gray-600"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden animate-fadeIn flex flex-col min-h-[calc(100vh-180px)]">
      {/* Corps avec padding uniforme */}
      <div className="p-5 flex flex-col flex-1">
        
        {/* ═══════════════════════════════════════════════════════════════════════════
           HEADER UNIFIÉ - Titre + Actions
        ═══════════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 mb-4">
          {/* Ligne 1: Titre, Stats et Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Employés</h3>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded-full">{filteredEmployes.length} résultat{filteredEmployes.length !== 1 ? 's' : ''}</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{employes.filter(e => e.role === 'employee').length} employés</span>
                <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full">{employes.filter(e => e.role === 'admin').length} admins</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Bouton Nouvel employé - Ouvre une modale */}
              {onCreateClick && (
                <button 
                  onClick={onCreateClick}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#cf292c] text-white hover:bg-[#b82427] shadow-sm transition-all"
                >
                  <UserPlus size={16} />
                  <span>Nouveau</span>
                </button>
              )}
              <button 
                onClick={fetchEmployes} 
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all text-sm" 
                disabled={isRefreshing}
                title="Actualiser la liste"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Ligne 2: Onglets + Outils (tout aligné) */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 p-2 bg-gray-50/80 rounded-xl border border-gray-100">
            {/* Onglets */}
            <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => setFiltreStatut('actifs')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filtreStatut === 'actifs'
                    ? 'bg-[#cf292c] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Actifs ({employes.filter(e => !e.dateSortie).length})
              </button>
              <button
                onClick={() => setFiltreStatut('partis')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filtreStatut === 'partis'
                    ? 'bg-[#cf292c] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Partis ({employes.filter(e => e.dateSortie).length})
              </button>
              <button
                onClick={() => setFiltreStatut('demandes')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  filtreStatut === 'demandes'
                    ? 'bg-[#cf292c] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileEdit size={14} />
                Demandes
                {demandesModification.length > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold flex items-center justify-center ${
                    filtreStatut === 'demandes' 
                      ? 'bg-white text-[#cf292c]' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {demandesModification.length}
                  </span>
                )}
              </button>
            </div>

            {/* Séparateur vertical */}
            <div className="hidden lg:block w-px h-8 bg-gray-200"></div>

            {/* Outils */}
            <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
              {/* Import */}
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all"
                title="Importer"
              >
                <Upload size={14} />
                <span className="hidden xl:inline">Importer</span>
              </button>

              {/* Export */}
              <button
                onClick={handleExportCSV}
                disabled={filteredEmployes.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all disabled:opacity-50"
                title="Exporter"
              >
                <Download size={14} />
                <span className="hidden xl:inline">Exporter</span>
              </button>

              {/* Filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  showFilters || filtreCategorie || filtreRole || filtreDateDebut || filtreDateFin
                    ? 'bg-[#cf292c] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
                title="Filtres"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden xl:inline">Filtres</span>
              </button>

              {/* Vue Liste/Grille */}
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                className="inline-flex items-center gap-1.5 p-2 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all"
                title={viewMode === 'list' ? 'Vue grille' : 'Vue liste'}
              >
                {viewMode === 'list' ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {/* Sélection */}
              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelectMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
                title="Sélectionner"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {isSelectMode && selectedIds.length > 0 && (
                  <span className="bg-white text-blue-600 px-1.5 rounded text-xs font-bold">
                    {selectedIds.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Ligne 3: Recherche + Pagination compacte */}
          <div className="flex items-center gap-3">
            {/* Recherche */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-white placeholder-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            {/* Pagination compacte - à droite */}
            {filtreStatut !== 'demandes' && <PaginationCompact />}
          </div>
        </div>

        {/* Panneau filtres avancés */}
        {showFilters && (
          <div className="mb-4 p-4 bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Filtres avancés</h4>
              <button
                onClick={() => {
                  setFiltreCategorie('');
                  setFiltreRole('');
                  setFiltreDateDebut('');
                  setFiltreDateFin('');
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
                <select
                  value={filtreCategorie}
                  onChange={(e) => setFiltreCategorie(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                >
                  <option value="">Toutes</option>
                  {[...CATEGORIES_EMPLOYES, ...CATEGORIES_ADMIN].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rôle</label>
                <select
                  value={filtreRole}
                  onChange={(e) => setFiltreRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                >
                  <option value="">Tous</option>
                  <option value="employee">Employé</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
                <input
                  type="date"
                  value={filtreDateDebut}
                  onChange={(e) => setFiltreDateDebut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filtreDateFin}
                  onChange={(e) => setFiltreDateFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* 🆕 Barre d'actions groupées */}
        {isSelectMode && selectedIds.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.length} sélectionné(s)
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handleBulkChangeStatus('actif')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 transition-all"
              >
                Activer
              </button>
              <button
                onClick={() => handleBulkChangeStatus('inactif')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-400 transition-all"
              >
                Désactiver
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}

        {/* Tableau avec design sobre et moderne */}
        {filtreStatut === 'demandes' ? (
          /* ═══════════════════════════════════════════════════════════════════════════
             🆕 SECTION DEMANDES DE MODIFICATION
          ═══════════════════════════════════════════════════════════════════════════ */
          <div 
            id="demandes-modification-section"
            className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-500 ${
              highlightDemandes 
                ? 'border-[#cf292c] ring-2 ring-[#cf292c]/30 animate-pulse' 
                : 'border-gray-200'
            }`}
          >
            {/* Header de la section */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#cf292c]/10 flex items-center justify-center">
                  <FileEdit className="w-5 h-5 text-[#cf292c]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Demandes de modification</h3>
                  <p className="text-sm text-gray-500">
                    {demandesModification.length} demande{demandesModification.length !== 1 ? 's' : ''} en attente de validation
                  </p>
                </div>
                <button 
                  onClick={fetchDemandesModification}
                  className="ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={loadingDemandes}
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingDemandes ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingDemandes ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-[#cf292c] animate-spin" />
              </div>
            ) : demandesModification.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-sm font-medium text-gray-900">Aucune demande en attente</h3>
                <p className="text-sm text-gray-500 mt-1">Toutes les demandes ont été traitées</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {demandesModification.map((demande) => {
                  // Trouver l'employé correspondant
                  const employe = employes.find(e => e.id === demande.employe_id);
                  
                  // Icône et label selon le champ
                  const getChampInfo = (champ) => {
                    switch(champ) {
                      case 'email': return { icon: Mail, label: 'Email', color: 'text-blue-600 bg-blue-50 border-blue-200' };
                      case 'telephone': return { icon: Phone, label: 'Téléphone', color: 'text-green-600 bg-green-50 border-green-200' };
                      case 'adresse': return { icon: MapPin, label: 'Adresse', color: 'text-purple-600 bg-purple-50 border-purple-200' };
                      case 'iban': return { icon: CreditCard, label: 'IBAN', color: 'text-amber-600 bg-amber-50 border-amber-200' };
                      default: return { icon: User, label: champ, color: 'text-gray-600 bg-gray-50 border-gray-200' };
                    }
                  };
                  
                  const champInfo = getChampInfo(demande.champ_modifie);
                  const ChampIcon = champInfo.icon;
                  
                  return (
                    <div key={demande.id} className="group relative bg-white hover:bg-gray-50/80 transition-all duration-200">
                      <div className="px-5 py-4 flex items-center gap-4">
                        {/* Avatar avec indicateur */}
                        <div className="relative">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shadow-sm">
                            {employe?.prenom?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white"></div>
                        </div>
                        
                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-semibold text-gray-900">
                              {employe ? `${employe.prenom} ${employe.nom}` : `Employé #${demande.employe_id}`}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${champInfo.color}`}>
                              <ChampIcon className="w-3 h-3" />
                              {champInfo.label}
                            </span>
                          </div>
                          
                          {/* Valeurs */}
                          <div className="flex items-center gap-2 text-sm">
                            <code className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs line-through font-mono">
                              {demande.ancienne_valeur || 'vide'}
                            </code>
                            <div className="w-5 h-5 rounded-full bg-[#cf292c]/10 flex items-center justify-center">
                              <svg className="w-3 h-3 text-[#cf292c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </div>
                            <code className="px-2 py-0.5 bg-[#cf292c]/5 text-gray-900 rounded text-xs font-mono font-medium border border-[#cf292c]/10">
                              {demande.nouvelle_valeur}
                            </code>
                          </div>
                          
                          {/* Meta */}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(demande.date_demande).toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {demande.motif && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="italic text-gray-500">{demande.motif}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTraiterDemande(demande.id, 'approuve')}
                            disabled={traitementEnCours === demande.id}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border border-green-200 hover:border-green-300 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
                            title="Approuver"
                          >
                            {traitementEnCours === demande.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => setShowRejetModal(demande)}
                            disabled={traitementEnCours === demande.id}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-[#cf292c]/5 hover:text-[#cf292c] border border-gray-200 hover:border-[#cf292c]/30 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
                            title="Rejeter"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Ligne de séparation subtile */}
                      <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* 🆕 Vue Grille */}
          {viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentEmployes.map((e) => (
                <div 
                  key={e.id}
                  className={`bg-white border-2 rounded-xl p-4 hover:shadow-lg transition-all ${
                    selectedIds.includes(e.id) ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'
                  }`}
                >
                  {/* Checkbox si mode sélection */}
                  {isSelectMode && (
                    <div className="mb-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(e.id)}
                        onChange={(ev) => handleSelectOne(e.id, ev.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Avatar et info */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 mb-3">
                      {e.prenom?.[0]?.toUpperCase() || e.email[0].toUpperCase()}
                    </div>
                    {e.nom && e.prenom ? (
                      <h3 className="font-semibold text-gray-900 truncate w-full">
                        {e.prenom} {e.nom}
                      </h3>
                    ) : (
                      <h3 className="font-semibold text-gray-400 italic">Sans nom</h3>
                    )}
                    <p className="text-xs text-gray-500 truncate w-full mt-1">{e.email}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {/* Badge Rôle */}
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                      e.role === 'admin' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {e.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {e.role === 'admin' ? 'Admin' : 'Employé'}
                    </span>
                    
                    {/* Badges Catégories multiples */}
                    {getCategoriesEmploye(e).map((cat, idx) => (
                      <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${cat.color}`}>
                        {cat.Icon && <cat.Icon className="w-3 h-3" />}
                        {cat.label}
                      </span>
                    ))}
                    
                    {/* Badge Statut (basé sur dateSortie ET statut du compte) */}
                    {e.dateSortie ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
                        <Circle className="w-3 h-3 fill-red-500 text-red-500" /> Parti
                      </span>
                    ) : e.statut === 'inactif' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700">
                        <Pause className="w-3 h-3" /> Compte désactivé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" /> Actif
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-center">
                    {!e.dateSortie ? (
                      <>
                        <button
                          onClick={() => handleOpenEdit(e)}
                          className="p-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                          title="Modifier"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      </>
                    ) : (
                      // 🔴 EMPLOYÉ PARTI - Vue grille
                      <>
                        <button
                          onClick={() => setViewDepartEmploye(e)}
                          className="p-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                          title="Voir départ"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                        </button>
                        
                        {/* 🔄 Annuler départ */}
                        <button
                          onClick={() => handleAnnulerDepart(e)}
                          className="p-2 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition-all"
                          title="Annuler le départ"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                          title="Supprimer"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vue Liste (tableau) */
            <>
          {/* Version desktop du tableau */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-white">
                <tr>
                  {/* 🆕 Colonne checkbox en mode sélection */}
                  {isSelectMode && (
                    <th className="px-4 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={currentEmployes.length > 0 && selectedIds.length === currentEmployes.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  
                  {/* 🆕 En-têtes cliquables pour tri */}
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('nom')}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    >
                      Utilisateur
                      {sortBy === 'nom' && (
                        <svg className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    >
                      Rôle & Catégorie
                      {sortBy === 'role' && (
                        <svg className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    >
                      Date de création
                      {sortBy === 'createdAt' && (
                        <svg className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  
                  <th className="px-6 py-4 text-right">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {currentEmployes.map((e) => (
                  <tr 
                    key={e.id} 
                    className={`hover:bg-gray-50/50 transition-all group ${selectedIds.includes(e.id) ? 'bg-blue-50/50' : ''}`}
                  >
                    {/* 🆕 Checkbox en mode sélection */}
                    {isSelectMode && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(e.id)}
                          onChange={(ev) => handleSelectOne(e.id, ev.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                          {e.prenom?.[0]?.toUpperCase() || e.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          {e.nom && e.prenom ? (
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {e.prenom} {e.nom}
                            </div>
                          ) : (
                            <div className="font-medium text-sm text-gray-400 italic">
                              Sans nom
                            </div>
                          )}
                          <div className="text-xs text-gray-500 truncate">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {/* Badge Rôle */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          e.role === 'admin' 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {e.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {e.role === 'admin' ? 'Admin' : 'Employé'}
                        </span>
                        
                        {/* Badges Catégories multiples */}
                        {getCategoriesEmploye(e).map((cat, idx) => (
                          <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${cat.color}`}>
                            {cat.Icon && <cat.Icon className="w-3 h-3" />}
                            {cat.label}
                          </span>
                        ))}
                        
                        {/* Badge Statut - Basé sur dateSortie ET statut */}
                        {e.dateSortie ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Parti
                          </span>
                        ) : !e.dateSortie && e.statut === 'inactif' ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!e.dateSortie) handleToggleStatut(e);
                            }}
                            disabled={e.dateSortie}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-all"
                            title="Cliquer pour activer le compte"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            Compte désactivé
                          </button>
                        ) : (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!e.dateSortie) handleToggleStatut(e);
                            }}
                            disabled={e.dateSortie}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all"
                            title="Cliquer pour désactiver le compte"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Actif
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {new Date(e.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 📋 LOGIQUE SELON STATUT */}
                        {!e.dateSortie ? (
                          // ✅ EMPLOYÉ ACTIF - Actions complètes
                          <>
                            <button
                              onClick={() => handleOpenEdit(e)}
                              className="p-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
                              title="Modifier les informations"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                            
                            {/* 🚇 Bouton Navigo */}
                            {e.role === 'employee' && (
                              <button
                                onClick={() => setNavigoEmploye(e)}
                                className="p-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all"
                                title="Gestion Navigo"
                              >
                                <Train className="h-4 w-4" />
                              </button>
                            )}
                            
                            {/* Bouton Marquer le départ - Seulement pour les employés */}
                            {e.role === 'employee' && (
                              <button
                                onClick={() => handleOpenDepart(e)}
                                className="p-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-all"
                                title="Enregistrer le départ"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                              </button>
                            )}
                            
                            {/* Suppression bloquée pour actifs et en préavis */}
                            <button
                              onClick={() => toast.error("Impossible de supprimer un employé actif")}
                              className="p-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                              title="Suppression bloquée"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                              </svg>
                            </button>
                          </>
                        ) : (
                          // 🔴 EMPLOYÉ PARTI - Actions limitées
                          <>
                            <button
                              onClick={() => setViewDepartEmploye(e)}
                              className="p-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all"
                              title="Voir les détails du départ"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                            </button>
                            
                            {/* 🔄 Annuler le départ (réembauche ou erreur) */}
                            <button
                              onClick={() => handleAnnulerDepart(e)}
                              className="p-2 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition-all"
                              title="Annuler le départ et réactiver le compte"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                              </svg>
                            </button>
                            
                            {/* Suppression possible pour employés partis */}
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="p-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all"
                              title="Supprimer définitivement"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Version mobile sobre */}
          <div className="md:hidden space-y-3">
            {currentEmployes.map((e) => (
              <div 
                key={e.id} 
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
              >
                {/* Header avec avatar et info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                    {e.prenom?.[0]?.toUpperCase() || e.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {e.nom && e.prenom ? (
                      <div className="font-medium text-sm text-gray-900 mb-1 truncate">
                        {e.prenom} {e.nom}
                      </div>
                    ) : (
                      <div className="font-medium text-sm text-gray-400 italic mb-1">
                        Sans nom
                      </div>
                    )}
                    <div className="text-xs text-gray-500 truncate">{e.email}</div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    e.role === 'admin' 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {e.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {e.role === 'admin' ? 'Admin' : 'Employé'}
                  </span>
                  {getCategoriesEmploye(e).map((cat, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${cat.color}`}>
                      {cat.Icon && <cat.Icon className="w-3 h-3" />}
                      {cat.label}
                    </span>
                  ))}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      console.log('🖱️ CLICK sur badge statut détecté (mobile) !', e);
                      handleToggleStatut(e);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      (e.statut || 'actif') === 'actif'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${(e.statut || 'actif') === 'actif' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {(e.statut || 'actif') === 'actif' ? 'Actif' : 'Inactif'}
                  </button>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                    {new Date(e.createdAt).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </span>
                </div>

                {/* Actions - Adaptées selon statut */}
                <div className="flex gap-2">
                  {!e.dateSortie ? (
                    // ✅ EMPLOYÉ ACTIF - Version mobile
                    <>
                      <button
                        onClick={() => handleOpenEdit(e)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
                        title="Modifier"
                      >
                        <svg className="h-4 w-4 mx-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      
                      {/* 🚇 Bouton Navigo - Version mobile */}
                      {e.role === 'employee' && (
                        <button
                          onClick={() => setNavigoEmploye(e)}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all"
                          title="Navigo"
                        >
                          <Train className="h-4 w-4 mx-auto" />
                        </button>
                      )}
                      
                      {e.role === 'employee' && (
                        <>
                          <button
                            onClick={() => handleOpenDepart(e)}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-all"
                            title="Marquer le départ"
                          >
                            <svg className="h-4 w-4 mx-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    // 🚪 EMPLOYÉ PARTI - Version mobile
                    <>
                      <button
                        onClick={() => setViewDepartEmploye(e)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all"
                        title="Voir le départ"
                      >
                        <svg className="h-4 w-4 mx-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all"
                        title="Supprimer"
                      >
                        <svg className="h-4 w-4 mx-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>

              </div>
            ))}
          </div>
          </>
          )}
        </div>
        )}

      {filtreStatut !== 'demandes' && (
      <>
      {filteredEmployes.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? "Aucun résultat pour cette recherche" : "Commencez par ajouter des utilisateurs"}
          </p>
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Effacer la recherche
            </button>
          )}
        </div>
      ) : null}
      </>
      )}
      </div>

      {/* Modal d'édition avec Portal */}
      {editingEmploye && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          style={{ zIndex: 9999 }}
          onClick={handleCloseEdit}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                    <svg className="h-5 w-5 text-[#cf292c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Fiche employé</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {editingEmploye.prenom} {editingEmploye.nom} - {editingEmploye.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseEdit}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                  title="Fermer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body - Informations */}
            <div className="p-6 space-y-6">
              {/* Informations personnelles */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Informations personnelles</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Prénom</label>
                    <input
                      type="text"
                      value={editForm.prenom}
                      onChange={(e) => handleEditFormChange('prenom', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white"
                      placeholder="Prénom"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Nom</label>
                    <input
                      type="text"
                      value={editForm.nom}
                      onChange={(e) => handleEditFormChange('nom', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white"
                      placeholder="Nom"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white"
                      placeholder="email@exemple.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Téléphone
                      <span className="text-xs text-gray-500 font-normal ml-1">
                        (format automatique)
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={editForm.telephone}
                      onChange={(e) => handleEditFormChange('telephone', formatTelephone(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white"
                      placeholder="06 12 34 56 78"
                      maxLength={14}
                    />
                    {editForm.telephone && editForm.telephone.replace(/\D/g, '').length < 10 && (
                      <p className="text-xs text-orange-600 flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Numéro incomplet ({editForm.telephone.replace(/\D/g, '').length}/10 chiffres)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rôle et catégorie */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Rôle et affectation</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Rôle</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => {
                        handleEditFormChange('role', e.target.value);
                        // Réinitialiser les catégories si changement de rôle
                        handleEditFormChange('selectedCategories', []);
                      }}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all text-sm bg-gray-50/50 hover:bg-white"
                    >
                      <option value="employee">Employé</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {editForm.role === 'admin' ? 'Service' : 'Catégorie(s)'}
                      {editForm.role === 'employee' && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          (cliquez pour sélectionner plusieurs)
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(editForm.role === 'admin' ? CATEGORIES_ADMIN : CATEGORIES_EMPLOYES).map(cat => {
                        const isSelected = (editForm.selectedCategories || []).includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              if (editForm.role === 'admin') {
                                // Admin: sélection unique
                                handleEditFormChange('selectedCategories', [cat]);
                              } else {
                                // Employé: toggle multi-sélection
                                const current = editForm.selectedCategories || [];
                                if (isSelected) {
                                  handleEditFormChange('selectedCategories', current.filter(c => c !== cat));
                                } else {
                                  handleEditFormChange('selectedCategories', [...current, cat]);
                                }
                              }
                            }}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all duration-200 relative ${isSelected 
                              ? 'border-[#cf292c] bg-[#cf292c]/5 text-[#cf292c]' 
                              : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700'}`}
                          >
                            {isSelected && (
                              <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#cf292c] text-white">
                                <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                    {/* Afficher les catégories sélectionnées */}
                    {(editForm.selectedCategories || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(editForm.selectedCategories || []).map(cat => (
                          <span 
                            key={cat}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#cf292c]/10 text-[#cf292c] rounded-full text-xs font-medium"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() => handleEditFormChange('selectedCategories', (editForm.selectedCategories || []).filter(c => c !== cat))}
                              className="hover:bg-[#cf292c]/20 rounded-full p-0.5 transition-colors"
                            >
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Statut */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Statut du compte</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Statut du compte</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {editForm.statut === 'actif' 
                          ? "L'employé peut se connecter et utiliser le système"
                          : "L'employé ne peut pas se connecter"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditFormChange('statut', editForm.statut === 'actif' ? 'inactif' : 'actif')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        editForm.statut === 'actif' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          editForm.statut === 'actif' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={handleCloseEdit}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                disabled={isSaving}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#cf292c] hover:bg-[#b52428] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de départ avec Portal */}
      {departEmploye && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          style={{ zIndex: 9999 }}
          onClick={handleCloseDepart}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Enregistrer un départ</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {departEmploye.prenom} {departEmploye.nom}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDepart}
                  className="p-2 rounded-xl hover:bg-amber-100 text-gray-400 hover:text-gray-600 transition-all"
                  title="Fermer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date de départ <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={departForm.dateSortie}
                  onChange={(e) => setDepartForm(prev => ({ ...prev, dateSortie: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                  max={getCurrentDateString()}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Motif <span className="text-red-500">*</span></label>
                <select
                  value={departForm.motifDepart}
                  onChange={(e) => setDepartForm(prev => ({ ...prev, motifDepart: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                >
                  <option value="">Sélectionnez un motif</option>
                  <option value="demission">Démission</option>
                  <option value="licenciement">Licenciement</option>
                  <option value="fin_cdd">Fin de CDD</option>
                  <option value="fin_periode_essai">Fin période d'essai</option>
                  <option value="retraite">Retraite</option>
                  <option value="mutation">Mutation</option>
                  <option value="abandon_poste">Abandon de poste</option>
                  <option value="deces">Décès</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Commentaire (optionnel)</label>
                <textarea
                  value={departForm.commentaireDepart}
                  onChange={(e) => setDepartForm(prev => ({ ...prev, commentaireDepart: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm resize-none"
                  rows={3}
                  placeholder="Notes sur le départ (optionnel)..."
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> Cette action modifiera le statut de l'employé en "parti" et conservera ses données pour les statistiques RH.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCloseDepart}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all border border-gray-200 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveDepart}
                disabled={isSaving || !departForm.dateSortie || !departForm.motifDepart}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Enregistrer le départ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de visualisation du départ (lecture seule) */}
      {viewDepartEmploye && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          style={{ zIndex: 9999 }}
          onClick={() => setViewDepartEmploye(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Header */}
            <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-100 border border-indigo-200">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Détails du départ</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {viewDepartEmploye.prenom} {viewDepartEmploye.nom}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewDepartEmploye(null)}
                  className="p-2 rounded-xl hover:bg-indigo-100 text-gray-400 hover:text-gray-600 transition-all"
                  title="Fermer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Statut */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-sm font-semibold text-red-700">Employé parti</span>
                </div>
              </div>

              {/* Date de départ */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date de départ</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                  {viewDepartEmploye.dateSortie 
                    ? new Date(viewDepartEmploye.dateSortie).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'Non renseignée'}
                </div>
              </div>

              {/* Motif */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Motif du départ</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                  {viewDepartEmploye.motifDepart ? (
                    <span className="inline-flex items-center gap-2">
                      {viewDepartEmploye.motifDepart === 'demission' && <><FileSignature className="w-4 h-4" /> Démission</>}
                      {viewDepartEmploye.motifDepart === 'licenciement' && <><Scale className="w-4 h-4" /> Licenciement</>}
                      {viewDepartEmploye.motifDepart === 'fin_cdd' && <><Calendar className="w-4 h-4" /> Fin de CDD</>}
                      {viewDepartEmploye.motifDepart === 'fin_periode_essai' && <><SearchIcon className="w-4 h-4" /> Fin période d'essai</>}
                      {viewDepartEmploye.motifDepart === 'retraite' && <><User className="w-4 h-4" /> Retraite</>}
                      {viewDepartEmploye.motifDepart === 'mutation' && <><RotateCcw className="w-4 h-4" /> Mutation</>}
                      {viewDepartEmploye.motifDepart === 'abandon_poste' && <><Ban className="w-4 h-4" /> Abandon de poste</>}
                      {viewDepartEmploye.motifDepart === 'deces' && <><Heart className="w-4 h-4" /> Décès</>}
                      {viewDepartEmploye.motifDepart === 'autre' && <><ClipboardList className="w-4 h-4" /> Autre</>}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Non renseigné</span>
                  )}
                </div>
              </div>

              {/* Commentaire */}
              {viewDepartEmploye.commentaireDepart && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Commentaire</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 whitespace-pre-wrap">
                    {viewDepartEmploye.commentaireDepart}
                  </div>
                </div>
              )}

              {/* Informations complémentaires */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  ℹ️ Les données de cet employé sont conservées pour les statistiques RH et le calcul du turnover.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setViewDepartEmploye(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal d'import CSV */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slideUp">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-5 bg-gradient-to-br from-purple-50 to-white rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-purple-500" />
                Importer des employés
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Importez plusieurs employés depuis un fichier CSV
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Zone de téléchargement */}
              <div className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center bg-purple-50/30 hover:bg-purple-50/50 transition-colors">
                <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-purple-600 hover:text-purple-700">
                    Cliquez pour choisir un fichier
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                {importFile && (
                  <p className="text-sm text-gray-600 mt-2 flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    {importFile.name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">Format CSV uniquement</p>
              </div>

              {/* Bouton télécharger modèle */}
              <button
                onClick={handleDownloadTemplate}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger un modèle CSV
              </button>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Instructions
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Le fichier doit être au format CSV</li>
                  <li>• Colonnes requises : nom, email, role, categorie</li>
                  <li>• Le mot de passe sera généré automatiquement</li>
                  <li>• Les comptes seront activés par défaut</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                disabled={isImporting}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleImportCSV}
                disabled={!importFile || isImporting}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🆕 Modal de rejet avec commentaire */}
      {showRejetModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          style={{ zIndex: 9999 }}
          onClick={() => setShowRejetModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#cf292c]/10 flex items-center justify-center">
                  <X className="w-5 h-5 text-[#cf292c]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Rejeter la demande</h3>
                  <p className="text-sm text-gray-500">Modification de {showRejetModal.champ_modifie}</p>
                </div>
                <button
                  onClick={() => setShowRejetModal(null)}
                  className="ml-auto p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Aperçu de la modification */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">Modification demandée</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded-md line-through text-gray-400">{showRejetModal.ancienne_valeur || '(vide)'}</span>
                  <svg className="w-4 h-4 text-[#cf292c] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="px-2 py-1 bg-[#cf292c]/5 border border-[#cf292c]/20 rounded-md font-medium text-gray-900">{showRejetModal.nouvelle_valeur}</span>
                </div>
              </div>

              {/* Champ commentaire */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif du rejet <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={commentaireRejet}
                  onChange={(e) => setCommentaireRejet(e.target.value)}
                  placeholder="Expliquez pourquoi cette demande est rejetée..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejetModal(null);
                    setCommentaireRejet('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleTraiterDemande(showRejetModal.id, 'rejete', commentaireRejet)}
                  disabled={traitementEnCours === showRejetModal.id}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#cf292c] text-white hover:bg-[#b82427] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {traitementEnCours === showRejetModal.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Navigo dédiée */}
      {navigoEmploye && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Train className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Gestion Navigo</h2>
                <p className="text-sm text-white/80">{navigoEmploye.prenom} {navigoEmploye.nom}</p>
              </div>
              <button
                onClick={() => setNavigoEmploye(null)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-6">
              <NavigoEmployeTab 
                employe={navigoEmploye}
                onUpdate={fetchEmployes}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}

export default ListeEmployes;
