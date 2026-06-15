const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticateToken } = require('../middleware/auth');

// Obtener etiquetas globales (público)
router.get('/', tagController.getTags);

// Obtener etiquetas de un versículo específico (público)
router.get('/verse/:verseId', tagController.getVerseTags);

// Gestionar etiquetas de un versículo (requiere autenticación)
router.post('/verse', authenticateToken, tagController.addTagToVerse);
router.delete('/verse/:verseId/:tagId', authenticateToken, tagController.removeTagFromVerse);

module.exports = router;
