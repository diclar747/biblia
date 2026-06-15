const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de listas requieren autenticación
router.get('/', authenticateToken, listController.getLists);
router.post('/', authenticateToken, listController.createList);
router.get('/:id', authenticateToken, listController.getListById);
router.put('/:id', authenticateToken, listController.updateList);
router.delete('/:id', authenticateToken, listController.deleteList);

// Gestión de versículos en una lista
router.post('/:id/verses', authenticateToken, listController.addVerseToList);
router.delete('/:id/verses/:verseId', authenticateToken, listController.removeVerseFromList);

module.exports = router;
