const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// Configuración de Multer para almacenar archivos temporalmente en memoria (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// Todas las rutas de administración requieren rol 'admin'
router.get('/users', requireAdmin, adminController.getUsers);
router.post('/versions', requireAdmin, adminController.addVersion);
router.post('/import', requireAdmin, upload.single('file'), adminController.importVerses);

module.exports = router;
