/**
 * Service Cloudinary - Gestion du stockage cloud des fichiers
 * 
 * ☁️ Cloudinary : CDN mondial, optimisation auto, 25GB gratuit
 * 
 * Usage:
 *   const { uploadImage, uploadDocument, deleteFile } = require('./services/cloudinaryService');
 *   const result = await uploadImage(buffer, 'photos-profil', 'user-123');
 */

const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary (utilise les variables d'environnement)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Force HTTPS
});

/**
 * Vérifie si Cloudinary est configuré
 * @returns {boolean}
 */
function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Upload une image vers Cloudinary avec optimisation automatique
 * 
 * @param {Buffer} buffer - Le buffer du fichier
 * @param {string} folder - Dossier de destination (ex: 'photos-profil', 'documents')
 * @param {string} publicId - ID public unique (ex: 'user-123-photo')
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<{url: string, publicId: string, format: string}>}
 */
async function uploadImage(buffer, folder = 'photos-profil', publicId = null, options = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary non configuré. Vérifiez les variables d\'environnement.');
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `gestion-rh/${folder}`,
      public_id: publicId,
      overwrite: true,
      // Optimisation automatique pour le web
      transformation: [
        { quality: 'auto:good' },      // Qualité auto optimale
        { fetch_format: 'auto' },       // Format auto (WebP si supporté)
        ...(options.transformation || [])
      ],
      // Métadonnées
      resource_type: 'image',
      ...options
    };

    // Pour les photos de profil, ajouter un crop carré centré sur le visage
    if (folder === 'photos-profil') {
      uploadOptions.transformation = [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ [CLOUDINARY] Erreur upload:', error.message);
          reject(error);
        } else {
          console.log(`☁️  [CLOUDINARY] Upload réussi: ${result.public_id}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload un document (PDF, image) vers Cloudinary
 * 
 * @param {Buffer} buffer - Le buffer du fichier
 * @param {string} folder - Dossier de destination
 * @param {string} publicId - ID public unique
 * @param {string} resourceType - 'image' ou 'raw' (pour PDF)
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadDocument(buffer, folder = 'documents', publicId = null, resourceType = 'auto') {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary non configuré. Vérifiez les variables d\'environnement.');
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `gestion-rh/${folder}`,
      public_id: publicId,
      overwrite: true,
      resource_type: resourceType,
      // Pas de transformation pour les documents
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ [CLOUDINARY] Erreur upload document:', error.message);
          reject(error);
        } else {
          console.log(`📄 [CLOUDINARY] Document uploadé: ${result.public_id}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format || 'pdf',
            bytes: result.bytes
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Supprime un fichier de Cloudinary
 * 
 * @param {string} publicId - L'ID public du fichier à supprimer
 * @param {string} resourceType - 'image' ou 'raw'
 * @returns {Promise<boolean>}
 */
async function deleteFile(publicId, resourceType = 'image') {
  if (!isCloudinaryConfigured()) {
    console.warn('⚠️  [CLOUDINARY] Non configuré, suppression ignorée');
    return false;
  }

  if (!publicId) {
    console.warn('⚠️  [CLOUDINARY] Pas de publicId fourni pour la suppression');
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    if (result.result === 'ok') {
      console.log(`🗑️  [CLOUDINARY] Fichier supprimé: ${publicId}`);
      return true;
    } else {
      console.warn(`⚠️  [CLOUDINARY] Suppression échouée: ${result.result}`);
      return false;
    }
  } catch (error) {
    console.error('❌ [CLOUDINARY] Erreur suppression:', error.message);
    return false;
  }
}

/**
 * Extrait le publicId d'une URL Cloudinary
 * 
 * @param {string} url - URL Cloudinary complète
 * @returns {string|null} - Le publicId ou null
 */
function extractPublicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    // Format: https://res.cloudinary.com/xxx/image/upload/v123/folder/file.ext
    const regex = /\/v\d+\/(.+)\.\w+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si une URL est une URL Cloudinary
 * 
 * @param {string} url 
 * @returns {boolean}
 */
function isCloudinaryUrl(url) {
  return url && url.includes('cloudinary.com');
}

/**
 * Génère une URL optimisée pour une image Cloudinary
 * 
 * @param {string} publicId - ID public de l'image
 * @param {Object} options - Options de transformation
 * @returns {string}
 */
function getOptimizedUrl(publicId, options = {}) {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  const { width, height, crop = 'fill', quality = 'auto' } = options;

  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width, height, crop },
      { quality },
      { fetch_format: 'auto' }
    ]
  });
}

module.exports = {
  uploadImage,
  uploadDocument,
  deleteFile,
  extractPublicIdFromUrl,
  isCloudinaryUrl,
  isCloudinaryConfigured,
  getOptimizedUrl,
  cloudinary // Export direct si besoin d'accès avancé
};
