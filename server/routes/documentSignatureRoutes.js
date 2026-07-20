const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const {
  createDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  relancerSignature,
  getMesDocuments,
  voirDocument,
  signerDocument,
  refuserDocument,
  getDocumentsCount,
  telechargerPdfSigne,
  getSignataires,
  createSignataire,
  deleteSignataire,
} = require('../controllers/documentSignatureController');

// --- Multer config pour upload PDF ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/documents-rh');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    cb(null, `doc-${timestamp}-${safeName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non autorisé (PDF, JPG, PNG, WEBP)'), false);
  }
});

// ===== ADMIN routes (admin/manager uniquement) =====
router.post('/', authMiddleware, adminMiddleware, upload.fields([{ name: 'fichier', maxCount: 1 }, { name: 'cachet', maxCount: 1 }, { name: 'signatureEmployeur', maxCount: 1 }]), createDocument);
router.get('/', authMiddleware, adminMiddleware, getDocuments);
router.get('/mes-documents', authMiddleware, getMesDocuments);
router.get('/mes-documents/count', authMiddleware, getDocumentsCount);

// ===== Annuaire des employeurs signataires (admin/manager) =====
router.get('/signataires', authMiddleware, adminMiddleware, getSignataires);
router.post('/signataires', authMiddleware, adminMiddleware, createSignataire);
router.delete('/signataires/:id', authMiddleware, adminMiddleware, deleteSignataire);

router.get('/:id', authMiddleware, adminMiddleware, getDocumentById);
router.delete('/:id', authMiddleware, adminMiddleware, deleteDocument);
router.post('/:id/relance/:signatureId', authMiddleware, adminMiddleware, relancerSignature);

// ===== EMPLOYÉ routes =====
router.post('/:id/voir', authMiddleware, voirDocument);
router.post('/:id/signer', authMiddleware, signerDocument);
router.post('/:id/refuser', authMiddleware, refuserDocument);

// ===== Téléchargement PDF signé (employé = le sien, admin = ?signatureId=) =====
router.get('/:id/pdf-signe', authMiddleware, telechargerPdfSigne);

module.exports = router;
