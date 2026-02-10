/**
 * Utilitaire de compression d'images côté client
 * Redimensionne et compresse les images AVANT l'upload
 * Une photo de 8MB → ~200KB sans perte visible de qualité
 */

/**
 * Compresse une image (File) en la redimensionnant et en ajustant la qualité
 * @param {File} file - Le fichier image à compresser
 * @param {object} options - Options de compression
 * @param {number} options.maxWidth - Largeur max (défaut: 1200px)
 * @param {number} options.maxHeight - Hauteur max (défaut: 1200px)
 * @param {number} options.quality - Qualité JPEG 0-1 (défaut: 0.8)
 * @param {number} options.maxSizeMB - Taille max en MB (défaut: 1)
 * @returns {Promise<File>} Le fichier compressé
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeMB = 1,
  } = options;

  // Si ce n'est pas une image, retourner tel quel
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Si déjà en-dessous de la limite, retourner tel quel
  if (file.size <= maxSizeMB * 1024 * 1024) {
    console.log(`📷 Image déjà optimale: ${(file.size / 1024).toFixed(0)}KB`);
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Redimensionner en gardant les proportions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        
        // Fond blanc pour les images transparentes (PNG → JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en JPEG compressé
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erreur de compression'));
              return;
            }

            const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const originalKB = (file.size / 1024).toFixed(0);
            const compressedKB = (compressedFile.size / 1024).toFixed(0);
            const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
            
            console.log(`📷 Compression: ${originalKB}KB → ${compressedKB}KB (-${reduction}%) [${width}x${height}]`);

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Impossible de charger l\'image'));
    };

    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
  });
};

/**
 * Compression optimisée pour les photos de profil (400x400)
 */
export const compressProfilePhoto = (file) => {
  return compressImage(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    maxSizeMB: 0.5,
  });
};

/**
 * Compression pour les documents/justificatifs (qualité plus haute)
 */
export const compressDocument = (file) => {
  // Ne pas compresser les PDF
  if (file.type === 'application/pdf') return Promise.resolve(file);
  
  return compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.85,
    maxSizeMB: 2,
  });
};
