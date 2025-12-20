/**
 * Utilitaires pour la gestion des URLs d'images
 * Gère les URLs Cloudinary (complètes) et les URLs locales (relatives)
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Retourne l'URL complète d'une image (photo de profil, document, etc.)
 * - Si l'URL est déjà complète (Cloudinary ou autre CDN), la retourne telle quelle
 * - Si l'URL est relative (stockage local), ajoute l'API_URL devant
 * 
 * @param {string} imageUrl - L'URL de l'image (peut être relative ou absolue)
 * @returns {string|null} - L'URL complète de l'image ou null si pas d'URL
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // Si l'URL commence par http:// ou https://, c'est déjà une URL complète (Cloudinary, CDN, etc.)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Sinon, c'est une URL relative (stockage local), on ajoute l'API_URL
  return `${API_URL}${imageUrl}`;
};

/**
 * Vérifie si une URL est une URL Cloudinary
 * @param {string} url - L'URL à vérifier
 * @returns {boolean}
 */
export const isCloudinaryUrl = (url) => {
  return url && url.includes('res.cloudinary.com');
};

export default getImageUrl;
