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

// Rutas protegidas de perfil
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/profile-image', authenticateToken, upload.single('profile_image'), authController.uploadProfileImage);

module.exports = router;
