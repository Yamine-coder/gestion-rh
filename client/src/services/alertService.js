import Swal from 'sweetalert2';

/**
 * Service pour gérer les alertes et confirmations de l'application de façon cohérente
 */
const alertService = {
  /**
   * Affiche une alerte de succès
   * @param {string} title - Titre de l'alerte
   * @param {string} message - Message à afficher
   */
  success: (title = 'Succès', message) => {
    return Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#cf292c',
      timer: 3000,
      timerProgressBar: true,
    });
  },

  /**
   * Affiche une alerte d'erreur
   * @param {string} title - Titre de l'alerte
   * @param {string} message - Message d'erreur
   */
  error: (title = 'Erreur', message = 'Une erreur est survenue.') => {
    return Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonColor: '#cf292c',
    });
  },

  /**
   * Affiche une alerte d'information
   * @param {string} title - Titre de l'alerte
   * @param {string} message - Message à afficher
   */
  info: (title = 'Information', message) => {
    return Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonColor: '#cf292c',
    });
  },

  /**
   * Affiche une alerte de confirmation
   * @param {Object} options - Options de configuration
   * @returns {Promise} - Promise contenant le résultat de la confirmation
   */
  confirm: ({
    title = 'Confirmation',
    message = 'Êtes-vous sûr de vouloir effectuer cette action ?',
    icon = 'question',
    confirmText = 'Confirmer',
    cancelText = 'Annuler'
  } = {}) => {
    return Swal.fire({
      title,
      text: message,
      icon,
      showCancelButton: true,
      confirmButtonColor: '#cf292c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
  },

  /**
   * Affiche une alerte de confirmation de suppression
   * @param {string} itemName - Nom de l'élément à supprimer
   * @returns {Promise} - Promise contenant le résultat de la confirmation
   */
  confirmDelete: (itemName = 'cet élément') => {
    return Swal.fire({
      title: 'Confirmer la suppression',
      text: `Êtes-vous sûr de vouloir supprimer ${itemName} ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#cf292c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
    });
  },

  /**
   * Affiche une alerte avec HTML personnalisé
   * @param {Object} options - Options de configuration
   */
  custom: ({
    title,
    html,
    icon = 'info',
    showCancelButton = false,
    confirmButtonText = 'OK',
    cancelButtonText = 'Annuler'
  }) => {
    return Swal.fire({
      title,
      html,
      icon,
      showCancelButton,
      confirmButtonColor: '#cf292c',
      cancelButtonColor: '#6b7280',
      confirmButtonText,
      cancelButtonText,
    });
  },

  /**
   * Toast de notification
   * @param {string} message - Message à afficher
   * @param {string} icon - Type d'icône (success, error, warning, info, question)
   */
  toast: (message, icon = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    return Toast.fire({
      icon,
      title: message
    });
  }
};

export default alertService;
