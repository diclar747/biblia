const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de favoritos requieren que el usuario esté autenticado
router.get('/', authenticateToken, favoriteController.getFavorites);
router.post('/', authenticateToken, favoriteController.addFavorite);
router.delete('/:verseId', authenticateToken, favoriteController.removeFavorite);

module.exports = router;
