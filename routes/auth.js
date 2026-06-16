const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configuración de multer para subir imágenes de perfil en memoria (compatible con serverless)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se admiten imágenes (jpeg, png, gif, webp).'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Límite de 2MB
});

// Rutas de autenticación pública
router.post('/register', authController.register);
router.post('/login', authController.login);

// Manejador de errores de Multer para subida de imágenes
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'La imagen no debe superar los 2 MB.' });
    }
    return res.status(400).json({ error: 'Error al procesar la imagen: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// Rutas protegidas de perfil
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/profile-image', authenticateToken, upload.single('profile_image'), handleUploadError, authController.uploadProfileImage);

module.exports = router;
